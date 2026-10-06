import assert from "node:assert/strict";
import test from "node:test";

import { NextRequest } from "next/server";
import { createSessionToken } from "@/lib/auth/session";
import { getSessionFromRequest, resolveProductContextFromRequestWithSession } from "@/lib/auth/session-server";
import { db } from "@/lib/db/client";
import { GET as listWorkspaces } from "@/app/api/v1/workspaces/route";
import { POST as setActiveWorkspace } from "@/app/api/v1/workspaces/active/route";
import { PATCH as updateWorkspaceLabel } from "@/app/api/v1/workspaces/[id]/membership-label/route";

function request(url: string, token: string, body?: unknown, workspaceId?: string) {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    headers: {
      cookie: `sf_session=${token}${workspaceId ? `; sf_workspace_id=${workspaceId}` : ""}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const routeParams = (id: string) => ({ params: Promise.resolve({ id }) });

test("workspace switcher lists only memberships and persists only an authorized active workspace", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const user = await db.user.create({ data: { displayName: "Workspace Switcher", email: `switcher-${suffix}@example.com` } });
  const outsider = await db.user.create({ data: { displayName: "Workspace Outsider", email: `outsider-${suffix}@example.com` } });
  const ownWorkspace = await db.workspace.create({ data: { name: "Personal Workspace", slug: `personal-${suffix}` } });
  const contributorWorkspace = await db.workspace.create({ data: { name: "Client Workspace", slug: `client-${suffix}` } });
  const forbiddenWorkspace = await db.workspace.create({ data: { name: "Private Workspace", slug: `private-${suffix}` } });
  const token = await createSessionToken({
    userId: user.id,
    email: user.email!,
    name: user.displayName,
    address: null,
    authType: "web2_google",
  });

  try {
    const anonymousList = await listWorkspaces(new NextRequest("https://settleflow.local/api/v1/workspaces"));
    assert.equal(anonymousList.status, 401);
    const anonymousSwitch = await setActiveWorkspace(new NextRequest("https://settleflow.local/api/v1/workspaces/active", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceId: ownWorkspace.id }),
    }));
    assert.equal(anonymousSwitch.status, 401);

    await db.workspaceMember.createMany({
      data: [
        { workspaceId: ownWorkspace.id, userId: user.id, role: "owner" },
        { workspaceId: contributorWorkspace.id, userId: user.id, role: "contributor", personalLabel: "Client work" },
        { workspaceId: forbiddenWorkspace.id, userId: outsider.id, role: "owner" },
      ],
    });

    const listed = await listWorkspaces(request("https://settleflow.local/api/v1/workspaces", token));
    assert.equal(listed.status, 200);
    assert.deepEqual((await listed.json()).data, [
      { id: ownWorkspace.id, name: ownWorkspace.name, role: "owner", personalLabel: null },
      { id: contributorWorkspace.id, name: contributorWorkspace.name, role: "contributor", personalLabel: "Client work" },
    ]);

    const renamed = await updateWorkspaceLabel(
      request(`https://settleflow.local/api/v1/workspaces/${contributorWorkspace.id}/membership-label`, token, {
        personalLabel: "Acme design work",
      }),
      routeParams(contributorWorkspace.id),
    );
    assert.equal(renamed.status, 200);
    assert.equal((await renamed.json()).data.personalLabel, "Acme design work");
    assert.equal(
      (await db.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: contributorWorkspace.id, userId: user.id } } }))?.personalLabel,
      "Acme design work",
    );

    await db.workspace.update({ where: { id: contributorWorkspace.id }, data: { name: "Renamed Client Workspace" } });
    const listedAfterWorkspaceRename = await listWorkspaces(request("https://settleflow.local/api/v1/workspaces", token));
    assert.equal(listedAfterWorkspaceRename.status, 200);
    assert.deepEqual((await listedAfterWorkspaceRename.json()).data[1], {
      id: contributorWorkspace.id,
      name: "Renamed Client Workspace",
      role: "contributor",
      personalLabel: "Acme design work",
    });

    const reset = await updateWorkspaceLabel(
      request(`https://settleflow.local/api/v1/workspaces/${contributorWorkspace.id}/membership-label`, token, { personalLabel: null }),
      routeParams(contributorWorkspace.id),
    );
    assert.equal(reset.status, 200);
    assert.equal((await reset.json()).data.personalLabel, null);

    const invalidLabel = await updateWorkspaceLabel(
      request(`https://settleflow.local/api/v1/workspaces/${contributorWorkspace.id}/membership-label`, token, { personalLabel: "x" }),
      routeParams(contributorWorkspace.id),
    );
    assert.equal(invalidLabel.status, 400);

    const foreignLabel = await updateWorkspaceLabel(
      request(`https://settleflow.local/api/v1/workspaces/${forbiddenWorkspace.id}/membership-label`, token, { personalLabel: "No access" }),
      routeParams(forbiddenWorkspace.id),
    );
    assert.equal(foreignLabel.status, 403);

    const switched = await setActiveWorkspace(request(
      "https://settleflow.local/api/v1/workspaces/active",
      token,
      { workspaceId: contributorWorkspace.id },
    ));
    assert.equal(switched.status, 200);
    assert.equal((await switched.json()).data.workspaceId, contributorWorkspace.id);
    assert.match(switched.headers.get("set-cookie") ?? "", new RegExp(`sf_workspace_id=${contributorWorkspace.id}`));

    const session = await getSessionFromRequest(request("https://settleflow.local", token));
    assert.ok(session);
    const context = await resolveProductContextFromRequestWithSession(
      request("https://settleflow.local/api/v1/payouts", token, undefined, contributorWorkspace.id),
    );
    assert.equal(context.workspaceId, contributorWorkspace.id);
    assert.equal(context.actor, "contributor");

    const denied = await setActiveWorkspace(request(
      "https://settleflow.local/api/v1/workspaces/active",
      token,
      { workspaceId: forbiddenWorkspace.id },
    ));
    assert.equal(denied.status, 403);
    assert.equal((await denied.json()).code, "WORKSPACE_ACCESS_DENIED");
    assert.equal(denied.headers.get("set-cookie"), null);
  } finally {
    await db.workspaceMember.deleteMany({ where: { workspaceId: { in: [ownWorkspace.id, contributorWorkspace.id, forbiddenWorkspace.id] } } });
    await db.workspace.deleteMany({ where: { id: { in: [ownWorkspace.id, contributorWorkspace.id, forbiddenWorkspace.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, outsider.id] } } });
  }
});
