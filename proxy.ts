import { NextResponse, type NextRequest } from "next/server";

import { PRODUCT_CONTEXT_HEADER_NAMES, readNonEmpty } from "@/lib/runtime/product-context";

function shouldHandle(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public")) {
    return false;
  }

  return (
    pathname === "/dashboard" ||
    pathname === "/payouts/new" ||
    pathname.startsWith("/payouts/") ||
    pathname.startsWith("/api/")
  );
}

function firstDefined(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const resolved = readNonEmpty(value);
    if (resolved) return resolved;
  }
  return undefined;
}

export function proxy(request: NextRequest) {
  if (!shouldHandle(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  const searchParams = request.nextUrl.searchParams;

  const contextValues = {
    workspaceId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId),
      searchParams.get("workspaceId"),
    ),
    ownerUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId),
      searchParams.get("ownerUserId"),
    ),
    reviewerUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId),
      searchParams.get("reviewerUserId"),
    ),
    contributorUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId),
      searchParams.get("contributorUserId"),
    ),
    actor: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.actor),
      searchParams.get("actor"),
    ),
  };

  if (contextValues.workspaceId) {
    requestHeaders.set(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId, contextValues.workspaceId);
  }
  if (contextValues.ownerUserId) {
    requestHeaders.set(PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId, contextValues.ownerUserId);
  }
  if (contextValues.reviewerUserId) {
    requestHeaders.set(PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId, contextValues.reviewerUserId);
  }
  if (contextValues.contributorUserId) {
    requestHeaders.set(PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId, contextValues.contributorUserId);
  }
  if (contextValues.actor) {
    requestHeaders.set(PRODUCT_CONTEXT_HEADER_NAMES.actor, contextValues.actor);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
