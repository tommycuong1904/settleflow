import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import {
  getActiveUserId,
  PRODUCT_CONTEXT_COOKIE_NAMES,
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

  const cookieHeader = request.headers.get("cookie");
  const cookies = new Map<string, string>();

  if (cookieHeader) {
    for (const segment of cookieHeader.split(";")) {
      const [name, ...rest] = segment.trim().split("=");
      if (!name || rest.length === 0) continue;
      cookies.set(name, decodeURIComponent(rest.join("=")));
    }
  }

  return resolveProductContext({
    workspaceId:
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId) ??
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId) ??
      searchParams.get("workspaceId"),
    ownerUserId:
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId) ??
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.ownerUserId) ??
      searchParams.get("ownerUserId"),
    reviewerUserId:
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId) ??
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.reviewerUserId) ??
      searchParams.get("reviewerUserId"),
    contributorUserId:
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId) ??
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.contributorUserId) ??
      searchParams.get("contributorUserId"),
    actor:
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.actor) ??
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.actor) ??
      searchParams.get("actor"),
  });
}

export function resolveWorkspaceIdFromRequest(request: Request) {
  return resolveProductContextFromRequest(request).workspaceId;
}
