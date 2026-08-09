export type ProductActor = "owner" | "reviewer" | "contributor";

export const PRODUCT_CONTEXT_HEADER_NAMES = {
  workspaceId: "x-settleflow-workspace-id",
  ownerUserId: "x-settleflow-owner-user-id",
  reviewerUserId: "x-settleflow-reviewer-user-id",
  contributorUserId: "x-settleflow-contributor-user-id",
  actor: "x-settleflow-actor",
} as const;

export type ProductContext = {
  workspaceId: string;
  ownerUserId: string;
  reviewerUserId: string;
  contributorUserId: string;
  actor: ProductActor;
  activeUserId: string;
};

export type ProductContextInput = {
  workspaceId?: string | null;
  ownerUserId?: string | null;
  reviewerUserId?: string | null;
  contributorUserId?: string | null;
  actor?: string | null;
};

export function readNonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolveActor(value: string | null | undefined): ProductActor | undefined {
  const normalized = readNonEmpty(value);
  if (normalized === "owner" || normalized === "reviewer" || normalized === "contributor") {
    return normalized;
  }
  return undefined;
}

export function getActiveUserId(context: {
  actor: ProductActor;
  ownerUserId: string;
  reviewerUserId: string;
  contributorUserId: string;
}) {
  switch (context.actor) {
    case "reviewer":
      return context.reviewerUserId;
    case "contributor":
      return context.contributorUserId;
    case "owner":
    default:
      return context.ownerUserId;
  }
}
