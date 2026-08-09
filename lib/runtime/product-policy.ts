import type { ProductContext } from "@/lib/runtime/product-context";

export type ProductPolicyViolation = {
  code: string;
  message: string;
  status: 403;
};

type PolicyInput = {
  productContext: ProductContext;
  actorUserId?: string | null;
};

function forbid(code: string, message: string): ProductPolicyViolation {
  return { code, message, status: 403 };
}

function assertActor(productContext: ProductContext, expected: ProductContext["actor"], code: string, message: string) {
  return productContext.actor === expected ? null : forbid(code, message);
}

function assertActorUserAlignment(
  productContext: ProductContext,
  actorUserId: string | null | undefined,
  code: string,
  message: string,
) {
  if (!actorUserId || actorUserId.trim().length === 0) {
    return null;
  }

  return actorUserId === productContext.activeUserId ? null : forbid(code, message);
}

export function assertCanCreatePayout({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_PAYOUT_CREATE_ACTOR", "Only owners can create payouts in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_PAYOUT_CREATE_CONTEXT", "Create payout context does not match the active owner.")
  );
}

export function assertCanActivatePayout({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_PAYOUT_ACTIVATE_ACTOR", "Only owners can activate payouts in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_PAYOUT_ACTIVATE_CONTEXT", "Activate payout context does not match the active owner.")
  );
}

export function assertCanSubmitMilestone({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "contributor", "FORBIDDEN_MILESTONE_SUBMIT_ACTOR", "Only contributors can submit milestones in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_MILESTONE_SUBMIT_CONTEXT", "Submit milestone context does not match the active contributor.")
  );
}

export function assertCanApproveMilestone({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "reviewer", "FORBIDDEN_MILESTONE_APPROVE_ACTOR", "Only reviewers can approve milestones in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_MILESTONE_APPROVE_CONTEXT", "Approve milestone context does not match the active reviewer.")
  );
}

export function assertCanRejectMilestone({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "reviewer", "FORBIDDEN_MILESTONE_REJECT_ACTOR", "Only reviewers can reject milestones in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_MILESTONE_REJECT_CONTEXT", "Reject milestone context does not match the active reviewer.")
  );
}

export function assertCanReleaseMilestone({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_MILESTONE_RELEASE_ACTOR", "Only owners can release milestone funds in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_MILESTONE_RELEASE_CONTEXT", "Release milestone context does not match the active owner.")
  );
}

export function assertCanRefreshProof({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_PROOF_REFRESH_ACTOR", "Only owners can refresh release proof in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_PROOF_REFRESH_CONTEXT", "Proof refresh context does not match the active owner.")
  );
}

export function assertCanRetryRelease({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_RELEASE_RETRY_ACTOR", "Only owners can retry failed releases in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_RELEASE_RETRY_CONTEXT", "Release retry context does not match the active owner.")
  );
}
