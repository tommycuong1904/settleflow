import test from "node:test";
import assert from "node:assert/strict";
import { createSessionToken } from "@/lib/auth/session";
import { db } from "@/lib/db/client";
import { GET as getSettings } from "@/app/api/v1/settings/route";

const token = () => createSessionToken({ userId: "session", email: "settings@example.com", name: "Settings", address: null, authType: "web2_google" });
const request = async () => new Request("https://settleflow.local/api/v1/settings", { headers: { cookie: `sf_session=${await token()}` } });

test("settings GET maps missing membership context to 403", async () => {
  const original = db.user.findFirst;
  db.user.findFirst = (async () => null) as typeof db.user.findFirst;
  try {
    const response = await getSettings(await request());
    assert.equal(response.status, 403);
    assert.equal((await response.json()).code, "AUTH_CONTEXT_REQUIRED");
  } finally { db.user.findFirst = original; }
});

test("settings GET preserves unexpected failures as 500", async () => {
  const original = db.user.findFirst;
  db.user.findFirst = (async () => { throw new Error("database unavailable"); }) as unknown as typeof db.user.findFirst;
  try {
    const response = await getSettings(await request());
    assert.equal(response.status, 500);
    assert.equal((await response.json()).code, "SETTINGS_LOAD_FAILED");
  } finally { db.user.findFirst = original; }
});

test("settings GET preserves authorized success", async () => {
  const originalUser = db.user.findFirst;
  const originalMemberships = db.workspaceMember.findMany;
  const originalWorkspace = db.workspace.findUnique;
  db.user.findFirst = (async () => ({ id: "settings-user", displayName: "Settings User" })) as typeof db.user.findFirst;
  db.workspaceMember.findMany = (async () => [{ workspaceId: "settings-workspace", role: "owner" }]) as typeof db.workspaceMember.findMany;
  db.workspace.findUnique = (async () => ({ webhookUrl: null, notifyOnSubmit: true, notifyOnApprove: true, notifyOnRelease: true })) as unknown as typeof db.workspace.findUnique;
  try {
    const response = await getSettings(await request());
    assert.equal(response.status, 200);
    assert.equal((await response.json()).data.notifyOnRelease, true);
  } finally {
    db.user.findFirst = originalUser;
    db.workspaceMember.findMany = originalMemberships;
    db.workspace.findUnique = originalWorkspace;
  }
});
