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
  type ProductContext,
  type ProductContextInput,
} from "@/lib/runtime/product-context";

/**
 * Server-side (Node.js runtime only) session resolution helpers.
 *
 * Unlike `proxy.ts` (Edge runtime), these helpers can talk to the database,
 * so they resolve a verified session to a real `User` + `WorkspaceMember`
 * and produce a workspace-scoped `ProductContext` from stored membership.
 *
 * Resolution priority (mirrors the transitional behavior while preserving the
 * seeded dev tooling):
 *   1. explicit request-scoped overrides (headers / query params / passed overrides)
 *   2. verified session → real DB membership
 *   3. persisted product-context cookies / seeded defaults
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
async function resolveSessionMembership(
  session: SessionPayload,
): Promise<{ user: SessionUserInfo; membership: { workspaceId: string; role: string } } | null> {
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

  const membership = await db.workspaceMember.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) return null;

  return {
    user: {
      id: userId,
      email: email ?? null,
      displayName,
      walletAddress: address ?? null,
    },
    membership: {
      workspaceId: membership.workspaceId,
      role: membership.role,
    },
  };
}

/**
 * Resolves a verified session to a real workspace-scoped ProductContext.
 * Returns null when the session is invalid or the user has no stored membership.
 */
export async function resolveSessionContext(
  session: SessionPayload,
): Promise<{ productContext: ProductContext; user: SessionUserInfo } | null> {
  const resolved = await resolveSessionMembership(session);
  if (!resolved) return null;

  return {
    productContext: buildProductContextFromMembership(resolved.user, resolved.membership),
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
  // 1. Explicit request-scoped overrides (query params) win.
  const { searchParams } = new URL(request.url);
  const explicit: ProductContextInput = {
    workspaceId: searchParams.get("workspaceId"),
    actor: searchParams.get("actor"),
    ownerUserId: searchParams.get("ownerUserId"),
    reviewerUserId: searchParams.get("reviewerUserId"),
    contributorUserId: searchParams.get("contributorUserId"),
  };
  const hasExplicitOverride = Object.values(explicit).some((value) => readNonEmpty(value));

  const base = resolveProductContextFromRequest(request);

  if (hasExplicitOverride) {
    return base;
  }

  // 2. Otherwise, resolve from the real session when one is present.
  const session = await getSessionFromRequest(request);
  if (session) {
    const sessionContext = await resolveSessionContext(session);
    if (sessionContext) {
      return sessionContext.productContext;
    }
  }

  // 3. Fall back to persisted cookies / seeded defaults (dev actor switcher, guests).
  return base;
}

/**
 * Server-component variant: resolves the product context from a cookie store
 * (e.g. `next/headers` cookies()) plus search-param-style overrides.
 */
export async function resolveProductContextFromCookiesWithSession(
  cookieStore: CookieStoreLike,
  overrides: ProductContextInput = {},
): Promise<ProductContext> {
  const hasExplicitOverride = Object.values(overrides).some((value) => readNonEmpty(value));
  const base = resolveProductContextFromCookies(cookieStore, overrides);

  if (hasExplicitOverride) {
    return base;
  }

  const session = await getSessionFromCookieStore(cookieStore);
  if (session) {
    const sessionContext = await resolveSessionContext(session);
    if (sessionContext) {
      return sessionContext.productContext;
    }
  }

  return base;
}

/**
 * Resolves just the workspace id for a request, preferring the session's real
 * membership when no explicit request-scoped override is present.
 */
export async function resolveWorkspaceIdFromRequestWithSession(
  request: Request,
): Promise<string> {
  const { searchParams } = new URL(request.url);
  const explicitWorkspaceId = readNonEmpty(searchParams.get("workspaceId"));

  if (explicitWorkspaceId) {
    return explicitWorkspaceId;
  }

  const session = await getSessionFromRequest(request);
  if (session) {
    const sessionContext = await resolveSessionContext(session);
    if (sessionContext) {
      return sessionContext.productContext.workspaceId;
    }
  }

  return resolveProductContextFromRequest(request).workspaceId;
}
