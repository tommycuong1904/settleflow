import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import {
  getActiveUserId,
  PRODUCT_CONTEXT_HEADER_NAMES,
  readNonEmpty,
  resolveActor,
  type ProductContextInput,
} from "@/lib/runtime/product-context";

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

export function resolveProductContextFromRequest(request: Request) {
  const { searchParams } = new URL(request.url);

  return resolveProductContext({
    workspaceId: request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId) ?? searchParams.get("workspaceId"),
    ownerUserId: request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId) ?? searchParams.get("ownerUserId"),
    reviewerUserId: request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId) ?? searchParams.get("reviewerUserId"),
    contributorUserId: request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId) ?? searchParams.get("contributorUserId"),
    actor: request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.actor) ?? searchParams.get("actor"),
  });
}

export function resolveWorkspaceIdFromRequest(request: Request) {
  return resolveProductContextFromRequest(request).workspaceId;
}
