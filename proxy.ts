import { NextResponse, type NextRequest } from "next/server";
import {
  PRODUCT_CONTEXT_COOKIE_NAMES,
  PRODUCT_CONTEXT_HEADER_NAMES,
  readNonEmpty,
} from "@/lib/runtime/product-context";

const PRODUCT_CONTEXT_COOKIE_OPTIONS = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };

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
  const cookies = request.cookies;

  const contextValues = {
    workspaceId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId),
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId)?.value,
      searchParams.get("workspaceId"),
    ),
    ownerUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.ownerUserId),
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.ownerUserId)?.value,
      searchParams.get("ownerUserId"),
    ),
    reviewerUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.reviewerUserId),
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.reviewerUserId)?.value,
      searchParams.get("reviewerUserId"),
    ),
    contributorUserId: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.contributorUserId),
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.contributorUserId)?.value,
      searchParams.get("contributorUserId"),
    ),
    actor: firstDefined(
      request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.actor),
      cookies.get(PRODUCT_CONTEXT_COOKIE_NAMES.actor)?.value,
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

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  if (contextValues.workspaceId) {
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId, contextValues.workspaceId, PRODUCT_CONTEXT_COOKIE_OPTIONS);
  }
  if (contextValues.ownerUserId) {
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.ownerUserId, contextValues.ownerUserId, PRODUCT_CONTEXT_COOKIE_OPTIONS);
  }
  if (contextValues.reviewerUserId) {
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.reviewerUserId, contextValues.reviewerUserId, PRODUCT_CONTEXT_COOKIE_OPTIONS);
  }
  if (contextValues.contributorUserId) {
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.contributorUserId, contextValues.contributorUserId, PRODUCT_CONTEXT_COOKIE_OPTIONS);
  }
  if (contextValues.actor) {
    response.cookies.set(PRODUCT_CONTEXT_COOKIE_NAMES.actor, contextValues.actor, PRODUCT_CONTEXT_COOKIE_OPTIONS);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
