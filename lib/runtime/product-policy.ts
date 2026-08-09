import type { ProductActor } from "@/lib/runtime/product-context";

export type ProductPolicyViolation = {
  code: string;
  message: string;
  status: 403;
};

function forbid(code: string, message: string): ProductPolicyViolation {
  return { code, message, status: 403 };
}

export function assertCanCreatePayout(actor: ProductActor) {
  return actor === "owner"
    ? null
    : forbid("FORBIDDEN_PAYOUT_CREATE_ACTOR", "Only owners can create payouts in this flow.");
}

export function assertCanActivatePayout(actor: ProductActor) {
  return actor === "owner"
    ? null
    : forbid("FORBIDDEN_PAYOUT_ACTIVATE_ACTOR", "Only owners can activate payouts in this flow.");
}

export function assertCanSubmitMilestone(actor: ProductActor) {
  return actor === "contributor"
    ? null
    : forbid("FORBIDDEN_MILESTONE_SUBMIT_ACTOR", "Only contributors can submit milestones in this flow.");
}

export function assertCanApproveMilestone(actor: ProductActor) {
  return actor === "reviewer"
    ? null
    : forbid("FORBIDDEN_MILESTONE_APPROVE_ACTOR", "Only reviewers can approve milestones in this flow.");
}

export function assertCanRejectMilestone(actor: ProductActor) {
  return actor === "reviewer"
    ? null
    : forbid("FORBIDDEN_MILESTONE_REJECT_ACTOR", "Only reviewers can reject milestones in this flow.");
}

export function assertCanReleaseMilestone(actor: ProductActor) {
  return actor === "owner"
    ? null
    : forbid("FORBIDDEN_MILESTONE_RELEASE_ACTOR", "Only owners can release milestone funds in this flow.");
}

export function assertCanRefreshProof(actor: ProductActor) {
  return actor === "owner"
    ? null
    : forbid("FORBIDDEN_PROOF_REFRESH_ACTOR", "Only owners can refresh release proof in this flow.");
}

export function assertCanRetryRelease(actor: ProductActor) {
  return actor === "owner"
    ? null
    : forbid("FORBIDDEN_RELEASE_RETRY_ACTOR", "Only owners can retry failed releases in this flow.");
}
