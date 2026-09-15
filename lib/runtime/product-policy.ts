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

export function assertCanCreateContributor({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_CONTRIBUTOR_CREATE_ACTOR", "Only owners can create contributors in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_CONTRIBUTOR_CREATE_CONTEXT", "Create contributor context does not match the active owner.")
  );
}

export type ContributorManagePolicyInput = PolicyInput & {
  createdByUserId?: string | null;
};

export function assertCanManageContributor({
  productContext,
  actorUserId,
  createdByUserId,
}: ContributorManagePolicyInput) {
  // Contributor management is workspace-owner-only. Creator ownership is not
  // an authorization role and must never grant management rights.
  return (
    assertActor(productContext, "owner", "FORBIDDEN_CONTRIBUTOR_MANAGE_ACTOR", "Only owners can manage contributors in this workspace.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_CONTRIBUTOR_MANAGE_CONTEXT", "Manage contributor context does not match the active owner.")
  );
}

export function assertCanActivatePayout({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_PAYOUT_ACTIVATE_ACTOR", "Only owners can activate payouts in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_PAYOUT_ACTIVATE_CONTEXT", "Activate payout context does not match the active owner.")
  );
}

export function assertCanEditPayoutDraft({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "owner", "FORBIDDEN_PAYOUT_EDIT_ACTOR", "Only owners can edit draft payouts in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_PAYOUT_EDIT_CONTEXT", "Edit payout context does not match the active owner.")
  );
}

export function assertCanSubmitMilestone({ productContext, actorUserId }: PolicyInput) {
  return (
    assertActor(productContext, "contributor", "FORBIDDEN_MILESTONE_SUBMIT_ACTOR", "Only contributors can submit milestones in this flow.") ??
    assertActorUserAlignment(productContext, actorUserId, "FORBIDDEN_MILESTONE_SUBMIT_CONTEXT", "Submit milestone context does not match the active contributor.")
  );
}

export function assertCanApproveMilestone({ productContext, actorUserId }: PolicyInput) {
  const actorViolation =
    productContext.actor === "owner" || productContext.actor === "reviewer"
      ? null
      : forbid("FORBIDDEN_MILESTONE_APPROVE_ACTOR", "Only owners or reviewers can approve milestones in this flow.");
  return actorViolation ?? assertActorUserAlignment(
    productContext,
    actorUserId,
    "FORBIDDEN_MILESTONE_APPROVE_CONTEXT",
    "Approve milestone context does not match the active reviewer.",
  );
}

export function assertCanRejectMilestone({ productContext, actorUserId }: PolicyInput) {
  const actorViolation =
    productContext.actor === "owner" || productContext.actor === "reviewer"
      ? null
      : forbid("FORBIDDEN_MILESTONE_REJECT_ACTOR", "Only owners or reviewers can reject milestones in this flow.");
  return actorViolation ?? assertActorUserAlignment(
    productContext,
    actorUserId,
    "FORBIDDEN_MILESTONE_REJECT_CONTEXT",
    "Reject milestone context does not match the active reviewer.",
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

export type PayoutViewPolicyInput = {
  productContext: ProductContext;
  linkedContributorUserId?: string | null;
};

export function assertCanViewPayout({
  productContext,
  linkedContributorUserId,
}: PayoutViewPolicyInput): ProductPolicyViolation | null {
  // Owner and Reviewer can view all payouts in the workspace
  if (productContext.actor === "owner" || productContext.actor === "reviewer") {
    return null;
  }

  // Contributor can only view payouts assigned to them
  if (productContext.actor === "contributor") {
    const activeUserId = productContext.activeUserId?.toLowerCase();

    // Ownership is established only by the persisted linked user identity.
    const matchesLinkedUser = Boolean(
      linkedContributorUserId && activeUserId && linkedContributorUserId === activeUserId,
    );

    if (matchesLinkedUser) {
      return null;
    }

    return forbid(
      "FORBIDDEN_PAYOUT_ACCESS",
      "You do not have permission to view this payout agreement. Only the assigned contributor, reviewer, or owner can access it."
    );
  }

  return forbid(
    "FORBIDDEN_PAYOUT_ACCESS",
    "You do not have permission to access this payout."
  );
}

