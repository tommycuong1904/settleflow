import { db } from "@/lib/db/client";
import { verifySessionToken, type SessionPayload } from "@/lib/auth/session";
import {
  buildProductContextFromMembership,
  parseSessionCookie,
  parseSessionCookieFromStore,
  type CookieStoreLike,
  type SessionUserInfo,
} from "@/lib/auth/session-mapping";
import {
  resolveProductContextFromCookies,
  resolveProductContextFromRequest,
} from "@/lib/runtime/product-context-server";
import {
  readNonEmpty,
  PRODUCT_CONTEXT_COOKIE_NAMES,
  PRODUCT_CONTEXT_HEADER_NAMES,
  type ProductContext,
  type ProductContextInput,
} from "@/lib/runtime/product-context";

function readWorkspaceCookie(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const segment of header.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId && rest.length > 0) {
      return readNonEmpty(decodeURIComponent(rest.join("=")));
    }
  }
  return undefined;
}

/**
 * Server-side (Node.js runtime only) session resolution helpers.
 *
 * Unlike `proxy.ts` (Edge runtime), these helpers can talk to the database,
 * so they resolve a verified session to a real `User` + `WorkspaceMember`
 * and produce a workspace-scoped `ProductContext` from stored membership.
 *
 * Protected resolution is session-authoritative. Request context may select a
 * workspace only after that workspace is verified against the user's
 * memberships; actor and user IDs are always derived from that membership.
 */

/**
 * Verifies the session token carried by the request's `sf_session` cookie.
 */
export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = parseSessionCookie(request);
  return token ? await verifySessionToken(token) : null;
}

/**
 * Verifies the session token from a CookieStore-like object (e.g. `next/headers` cookies()).
 */
export async function getSessionFromCookieStore(
  cookieStore: CookieStoreLike,
): Promise<SessionPayload | null> {
  const token = parseSessionCookieFromStore(cookieStore);
  return token ? await verifySessionToken(token) : null;
}

/**
 * Looks up the real `User` + first `WorkspaceMember` for a verified session.
 * Returns null when the user has no stored membership (e.g. a freshly signed-up
 * Google account that has not been invited to any workspace).
 */
async function resolveSessionMemberships(
  session: SessionPayload,
): Promise<{ user: SessionUserInfo; memberships: Array<{ workspaceId: string; role: string }> } | null> {
  const email = readNonEmpty(session.email);
  const address = readNonEmpty(session.address);

  let userId: string | null = null;
  let displayName: string | null = null;

  if (email) {
    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (user) {
      userId = user.id;
      displayName = user.displayName;
    }
  }

  // Wallet sessions identify by address; the User record stores the same
  // address on `walletAddress`. Prefer an exact (lowercased) address match.
  if (!userId && address) {
    const user = await db.user.findFirst({
      where: { walletAddress: address.toLowerCase() },
    });
    if (user) {
      userId = user.id;
      displayName = user.displayName;
    }
  }

  if (!userId) return null;

  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true, role: true },
  });
  if (memberships.length === 0) return null;

  return {
    user: {
      id: userId,
      email: email ?? null,
      displayName,
      walletAddress: address ?? null,
    },
    memberships,
  };
}

/**
 * Resolves a verified session to a real workspace-scoped ProductContext.
 * Returns null when the session is invalid or the user has no stored membership.
 */
export async function resolveSessionContext(
  session: SessionPayload,
): Promise<{ productContext: ProductContext; user: SessionUserInfo } | null> {
  const resolved = await resolveSessionMemberships(session);
  if (!resolved) return null;

  if (resolved.memberships.length !== 1) return null;

  return {
    productContext: buildProductContextFromMembership(resolved.user, resolved.memberships[0]),
    user: resolved.user,
  };
}

async function resolveSessionContextForWorkspace(
  session: SessionPayload,
  requestedWorkspaceId?: string,
): Promise<{ productContext: ProductContext; user: SessionUserInfo } | null> {
  const resolved = await resolveSessionMemberships(session);
  if (!resolved) return null;

  const workspaceId = requestedWorkspaceId?.trim();
  const membership = workspaceId
    ? resolved.memberships.find((item) => item.workspaceId === workspaceId)
    : resolved.memberships.length === 1
      ? resolved.memberships[0]
      : null;
  if (!membership) return null;

  return {
    productContext: buildProductContextFromMembership(resolved.user, membership),
    user: resolved.user,
  };
}
/**
 * Resolves the product context for an API request, preferring the verified
 * session's real membership when no explicit request-scoped override is present.
 */
export async function resolveProductContextFromRequestWithSession(
  request: Request,
): Promise<ProductContext> {
  // A workspace selector is permitted only after membership validation.
  const { searchParams } = new URL(request.url);
  const session = await getSessionFromRequest(request);
  if (session) {
    const requestedWorkspaceId =
      readNonEmpty(searchParams.get("workspaceId")) ??
      readNonEmpty(request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId)) ??
      readWorkspaceCookie(request);
    const sessionContext = await resolveSessionContextForWorkspace(session, requestedWorkspaceId);
    if (sessionContext) {
      return sessionContext.productContext;
    }
    throw new Error("AUTH_CONTEXT_REQUIRED");
  }

  return resolveProductContextFromRequest(request);
}

/**
 * Server-component variant: resolves the product context from a cookie store
 * (e.g. `next/headers` cookies()) plus search-param-style overrides.
 */
export async function resolveProductContextFromCookiesWithSession(
  cookieStore: CookieStoreLike,
  overrides: ProductContextInput = {},
): Promise<ProductContext> {
  const session = await getSessionFromCookieStore(cookieStore);
  if (session) {
    const sessionContext = await resolveSessionContextForWorkspace(session, readNonEmpty(overrides.workspaceId));
    if (sessionContext) {
      return sessionContext.productContext;
    }
    throw new Error("AUTH_CONTEXT_REQUIRED");
  }

  return resolveProductContextFromCookies(cookieStore, overrides);
}

/**
 * Resolves just the workspace id for a request, preferring the session's real
 * membership when no explicit request-scoped override is present.
 */
export async function resolveWorkspaceIdFromRequestWithSession(
  request: Request,
): Promise<string> {
  const { searchParams } = new URL(request.url);
  const session = await getSessionFromRequest(request);
  if (session) {
    const requestedWorkspaceId =
      readNonEmpty(searchParams.get("workspaceId")) ??
      readNonEmpty(request.headers.get(PRODUCT_CONTEXT_HEADER_NAMES.workspaceId));
    const sessionContext = await resolveSessionContextForWorkspace(session, requestedWorkspaceId);
    if (sessionContext) {
      return sessionContext.productContext.workspaceId;
    }
    throw new Error("AUTH_CONTEXT_REQUIRED");
  }

  return resolveProductContextFromRequest(request).workspaceId;
}
