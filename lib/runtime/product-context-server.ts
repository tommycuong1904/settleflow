import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import { getActiveUserId, readNonEmpty, resolveActor, type ProductContextInput } from "@/lib/runtime/product-context";

export function resolveWorkspaceId(value: string | null | undefined) {
  return readNonEmpty(value) ?? DEFAULT_PRODUCT_CONTEXT.workspaceId;
}

export function resolveProductContext(input: ProductContextInput) {
  const actor = resolveActor(input.actor) ?? DEFAULT_PRODUCT_CONTEXT.actor;
  const ownerUserId = readNonEmpty(input.ownerUserId) ?? DEFAULT_PRODUCT_CONTEXT.ownerUserId;
  const reviewerUserId = readNonEmpty(input.reviewerUserId) ?? DEFAULT_PRODUCT_CONTEXT.reviewerUserId;
  const contributorUserId = readNonEmpty(input.contributorUserId) ?? DEFAULT_PRODUCT_CONTEXT.contributorUserId;
  const workspaceId = readNonEmpty(input.workspaceId) ?? DEFAULT_PRODUCT_CONTEXT.workspaceId;

  return {
    workspaceId,
    ownerUserId,
    reviewerUserId,
    contributorUserId,
    actor,
    activeUserId: getActiveUserId({ actor, ownerUserId, reviewerUserId, contributorUserId }),
  };
}
