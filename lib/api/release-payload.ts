export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const PROOF_REFRESH_STATUSES = new Set(["confirmed", "failed"]);

export function isValidProofRefreshStatus(value: unknown): value is "confirmed" | "failed" {
  return typeof value === "string" && PROOF_REFRESH_STATUSES.has(value);
}

export function hasOwnerWorkspaceContext(input: {
  workspaceId: unknown;
  ownerUserId: unknown;
}) {
  return isNonEmptyString(input.workspaceId) && isNonEmptyString(input.ownerUserId);
}

export function hasReleaseAmountPayload(body: { amountUsdc?: unknown }, ownerUserId: unknown) {
  return isNonEmptyString(ownerUserId) && isNonEmptyString(body.amountUsdc);
}
