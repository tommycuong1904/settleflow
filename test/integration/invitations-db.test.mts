import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { NextRequest } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { acceptInvitation, createInvitation } from "@/lib/services/invitations";
import { listPayouts } from "@/lib/repositories/payouts";
import { POST as createInvitationRoute } from "@/app/api/v1/invitations/route";
import { POST as acceptInvitationRoute } from "@/app/api/v1/invitations/[token]/accept/route";
import { POST as createContributorInvitationRoute } from "@/app/api/v1/contributors/[id]/invite/route";

function request(url: string, token: string, body?: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { cookie: `sf_session=${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("invitations enforce authorization, email binding, lifecycle, and one membership role", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const walletAddress = `0x${randomBytes(20).toString("hex")}`;
  const owner = await db.user.create({ data: { displayName: "Invite Owner", email: `invite-owner-${suffix}@example.com` } });
  const reviewer = await db.user.create({ data: { displayName: "Invite Reviewer", email: `invite-reviewer-${suffix}@example.com` } });
  const recipient = await db.user.create({ data: { displayName: "Invite Recipient", email: `invite-recipient-${suffix}@example.com` } });
  const other = await db.user.create({ data: { displayName: "Invite Other", email: `invite-other-${suffix}@example.com` } });
  const existing = await db.user.create({ data: { displayName: "Invite Existing", email: `invite-existing-${suffix}@example.com` } });
  const walletRecipient = await db.user.create({
    data: {
      displayName: "Wallet Recipient",
      walletAddress,
    },
  });
  const workspace = await db.workspace.create({ data: { name: "Invitation Test", slug: `invitation-${suffix}` } });

  const tokenFor = (user: typeof owner) => createSessionToken({
    userId: user.id, email: user.email!, name: user.displayName, address: null, authType: "web2_google",
  });
  const routeParams = (token: string) => ({ params: Promise.resolve({ token }) });

  try {
    await db.workspaceMember.createMany({ data: [
      { workspaceId: workspace.id, userId: owner.id, role: "owner" },
      { workspaceId: workspace.id, userId: reviewer.id, role: "reviewer" },
      { workspaceId: workspace.id, userId: existing.id, role: "ops" },
    ] });

    const unauthorized = await createInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations?workspaceId=${workspace.id}`,
      await tokenFor(reviewer),
      { role: "contributor" },
    ));
    assert.equal(unauthorized.status, 403);
    assert.equal((await unauthorized.json()).code, "FORBIDDEN_INVITATION_CREATE");

    for (const role of ["ops", "reviewer", "contributor"]) {
      const unavailableRole = await createInvitationRoute(request(
        `https://settleflow.local/api/v1/invitations?workspaceId=${workspace.id}`,
        await tokenFor(owner),
        { role },
      ));
      assert.equal(unavailableRole.status, 400);
      assert.equal(
        (await unavailableRole.json()).error,
        "Contributor invitations must be created from the Contributor page to ensure proper record linking.",
      );
    }

    const ownerInvitation = await createInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations?workspaceId=${workspace.id}`,
      await tokenFor(owner),
      { role: "owner", expiresInDays: 7 },
    ));
    assert.equal(ownerInvitation.status, 200);
    assert.equal((await ownerInvitation.json() as { invitation: { role: string } }).invitation.role, "owner");

    const invitedContributor = await db.contributor.create({
      data: {
        workspaceId: workspace.id,
        name: "Invited Contributor",
        email: recipient.email,
        walletAddress: `0x${randomBytes(20).toString("hex")}`,
      },
    });
    const contributorInvitation = await createContributorInvitationRoute(
      request(
        `https://settleflow.local/api/v1/contributors/${invitedContributor.id}/invite?workspaceId=${workspace.id}`,
        await tokenFor(owner),
      ),
      { params: Promise.resolve({ id: invitedContributor.id }) },
    );
    assert.equal(contributorInvitation.status, 200);
    const contributorInvitationBody = await contributorInvitation.json() as {
      data: { token: string; inviteUrl: string };
    };
    assert.equal(
      contributorInvitationBody.data.inviteUrl,
      `https://settleflow.local/accept-invite?token=${contributorInvitationBody.data.token}`,
    );

    const created = await createInvitation({
      workspaceId: workspace.id,
      createdByUserId: owner.id,
      role: "contributor",
      email: recipient.email!.toUpperCase(),
      expiresInDays: 7,
    });
    const createdBody = { invitation: created };
    assert.equal(createdBody.invitation.role, "contributor");
    assert.equal(createdBody.invitation.email, recipient.email);
    assert.equal(createdBody.invitation.status, "pending");

    const accepted = await acceptInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations/${createdBody.invitation.token}/accept`, await tokenFor(recipient),
    ), routeParams(createdBody.invitation.token));
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get("set-cookie") ?? "", /sf_workspace_id=/);
    assert.equal((await accepted.json()).role, "contributor");
    assert.equal((await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: recipient.id } } }))?.role, "contributor");

    const walletContributor = await db.contributor.create({
      data: {
        workspaceId: workspace.id,
        name: "Wallet Contributor",
        walletAddress: `0x${walletAddress.slice(2).toUpperCase()}`,
      },
    });
    const walletInvite = await createInvitation({
      workspaceId: workspace.id,
      createdByUserId: owner.id,
      role: "contributor",
    });
    assert.equal((await acceptInvitation(walletInvite.token, walletRecipient.id)).success, true);
    assert.equal(
      (await db.contributor.findUnique({ where: { id: walletContributor.id } }))?.linkedUserId,
      walletRecipient.id,
    );
    const walletPayout = await db.payout.create({
      data: {
        workspaceId: workspace.id,
        contributorId: walletContributor.id,
        createdByUserId: owner.id,
        title: "Wallet contributor payout",
        totalAmountUsdc: "12.00",
      },
    });
    assert.deepEqual(
      (await listPayouts({ workspaceId: workspace.id, linkedUserId: walletRecipient.id })).map((payout) => payout.id),
      [walletPayout.id],
    );

    const used = await acceptInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations/${createdBody.invitation.token}/accept`, await tokenFor(recipient),
    ), routeParams(createdBody.invitation.token));
    assert.equal(used.status, 400);
    assert.equal((await used.json()).error, "Invitation is invalid or expired.");

    const emailBound = await createInvitation({ workspaceId: workspace.id, createdByUserId: owner.id, role: "contributor", email: recipient.email });
    const mismatch = await acceptInvitation(emailBound.token, other.id);
    assert.equal(mismatch.success, false);
    assert.equal((await db.invitation.findUnique({ where: { id: emailBound.id } }))?.status, "pending");
    assert.equal(await db.workspaceMember.count({ where: { workspaceId: workspace.id, userId: other.id } }), 0);

    const expired = await db.invitation.create({
      data: { workspaceId: workspace.id, createdByUserId: owner.id, role: "contributor", token: `expired-${suffix}`, expiresAt: new Date(Date.now() - 1_000) },
    });
    const expiredResult = await acceptInvitation(expired.token, other.id);
    assert.equal(expiredResult.success, false);
    assert.equal(expiredResult.error, "Invitation is invalid or expired.");

    const revoked = await db.invitation.create({
      data: { workspaceId: workspace.id, createdByUserId: owner.id, role: "contributor", token: `revoked-${suffix}`, status: "revoked", expiresAt: new Date(Date.now() + 60_000) },
    });
    assert.equal((await acceptInvitation(revoked.token, other.id)).success, false);

    for (const role of ["ops", "reviewer"] as const) {
      const legacyInvite = await db.invitation.create({
        data: { workspaceId: workspace.id, createdByUserId: owner.id, role, token: `${role}-${suffix}`, expiresAt: new Date(Date.now() + 60_000) },
      });
      assert.deepEqual(await acceptInvitation(legacyInvite.token, other.id), {
        success: false,
        error: "This invitation role is no longer accepted.",
      });
    }

    const concurrent = await createInvitation({ workspaceId: workspace.id, createdByUserId: owner.id, role: "contributor" });
    const concurrentResults = await Promise.all([
      acceptInvitation(concurrent.token, other.id),
      acceptInvitation(concurrent.token, other.id),
    ]);
    assert.equal(concurrentResults.filter((result) => result.success).length, 1);
    assert.equal(await db.workspaceMember.count({ where: { workspaceId: workspace.id, userId: other.id } }), 1);

    const existingInvite = await createInvitation({ workspaceId: workspace.id, createdByUserId: owner.id, role: "contributor", email: existing.email });
    const existingResult = await acceptInvitation(existingInvite.token, existing.id);
    assert.deepEqual(existingResult, {
      success: true,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: "ops",
    });
    assert.equal((await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: existing.id } } }))?.role, "ops");
  } finally {
    await db.payout.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.invitation.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id, recipient.id, other.id, existing.id, walletRecipient.id] } } });
  }
});
