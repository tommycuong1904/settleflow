import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { acceptInvitation, createInvitation } from "@/lib/services/invitations";
import { POST as createInvitationRoute } from "@/app/api/v1/invitations/route";
import { POST as acceptInvitationRoute } from "@/app/api/v1/invitations/[token]/accept/route";

function request(url: string, token: string, body?: unknown) {
  return new NextRequest(url, {
    method: "POST",
    headers: { cookie: `sf_session=${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
}

test("invitations enforce authorization, email binding, lifecycle, and one membership role", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const owner = await db.user.create({ data: { displayName: "Invite Owner", email: `invite-owner-${suffix}@example.com` } });
  const reviewer = await db.user.create({ data: { displayName: "Invite Reviewer", email: `invite-reviewer-${suffix}@example.com` } });
  const recipient = await db.user.create({ data: { displayName: "Invite Recipient", email: `invite-recipient-${suffix}@example.com` } });
  const other = await db.user.create({ data: { displayName: "Invite Other", email: `invite-other-${suffix}@example.com` } });
  const existing = await db.user.create({ data: { displayName: "Invite Existing", email: `invite-existing-${suffix}@example.com` } });
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

    const created = await createInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations?workspaceId=${workspace.id}`,
      await tokenFor(owner),
      { role: "reviewer", email: recipient.email!.toUpperCase(), expiresInDays: 7 },
    ));
    assert.equal(created.status, 200);
    const createdBody = await created.json() as { invitation: { token: string; role: string; email: string; status: string } };
    assert.equal(createdBody.invitation.role, "reviewer");
    assert.equal(createdBody.invitation.email, recipient.email);
    assert.equal(createdBody.invitation.status, "pending");

    const accepted = await acceptInvitationRoute(request(
      `https://settleflow.local/api/v1/invitations/${createdBody.invitation.token}/accept`, await tokenFor(recipient),
    ), routeParams(createdBody.invitation.token));
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.json()).role, "reviewer");
    assert.equal((await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: workspace.id, userId: recipient.id } } }))?.role, "reviewer");

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
    await db.workspaceMember.deleteMany({ where: { workspaceId: workspace.id } });
    await db.invitation.deleteMany({ where: { workspaceId: workspace.id } });
    await db.workspace.delete({ where: { id: workspace.id } });
    await db.user.deleteMany({ where: { id: { in: [owner.id, reviewer.id, recipient.id, other.id, existing.id] } } });
  }
});
