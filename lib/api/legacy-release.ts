import type { ReleaseExecutionMode } from "@/lib/arc/types";

export type ReleaseRequestBody = {
  payoutId?: unknown;
  milestoneId?: unknown;
  recipientAddress?: unknown;
  amount?: unknown;
  executionMode?: ReleaseExecutionMode;
};

export function hasRequiredLegacyReleaseFields(body: ReleaseRequestBody): body is {
  payoutId: string;
  milestoneId: string;
  recipientAddress: string;
  amount: string;
  executionMode?: ReleaseExecutionMode;
} {
  return typeof body.payoutId === "string"
    && body.payoutId.trim().length > 0
    && typeof body.milestoneId === "string"
    && body.milestoneId.trim().length > 0
    && typeof body.recipientAddress === "string"
    && body.recipientAddress.trim().length > 0
    && typeof body.amount === "string"
    && body.amount.trim().length > 0;
}

export function getLegacyReleaseErrorStatus(code: string) {
  return code === "WORKSPACE_SCOPE_MISMATCH" ? 409 : 400;
}
