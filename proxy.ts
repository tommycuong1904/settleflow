import { NextResponse, type NextRequest } from "next/server";
import {
  PRODUCT_CONTEXT_COOKIE_NAMES,
  PRODUCT_CONTEXT_HEADER_NAMES,
  readNonEmpty,
} from "@/lib/runtime/product-context";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

const PRODUCT_CONTEXT_COOKIE_OPTIONS = { path: "/", sameSite: "lax" as const, maxAge: 60 * 60 * 24 * 365 };

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Routes that establish or tear down an authenticated session — they must be
 * reachable without an existing session so sign-in/logout keep working.
 */
const OPEN_AUTH_PREFIXES = [
  "/api/v1/auth/",
];

function shouldHandle(pathname: string) {
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/public")) {
    return false;
  }

  return (
    pathname === "/dashboard" ||
    pathname === "/activity" ||
    pathname === "/contributors" ||
    pathname === "/settings" ||
    pathname === "/payouts" ||
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

function isOpenAuthPath(pathname: string) {
  return OPEN_AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "AUTH_REQUIRED",
      message: "Sign in is required to perform this action. Please connect your wallet or sign in to continue.",
    },
    { status: 401 },
  );
}

export async function proxy(request: NextRequest) {
  if (!shouldHandle(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (request.method === "GET" && !request.nextUrl.pathname.startsWith("/api/") && request.nextUrl.pathname !== "/dashboard") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token || !(await verifySessionToken(token))) {
      return NextResponse.rewrite(new URL("/auth-required", request.url));
    }
  }

  // ---- Session gate for mutation routes ----
  if (
    MUTATION_METHODS.has(request.method) &&
    request.nextUrl.pathname.startsWith("/api/") &&
    !isOpenAuthPath(request.nextUrl.pathname)
  ) {
    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = sessionToken ? await verifySessionToken(sessionToken) : null;
    if (!session) {
      return unauthorizedResponse();
    }
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
    ownerUserId: undefined,
    reviewerUserId: undefined,
    contributorUserId: undefined,
    actor: undefined,
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
