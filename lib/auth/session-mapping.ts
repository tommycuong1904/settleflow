import { type ProductActor } from "@/lib/runtime/product-context";
import type { ProductContext } from "@/lib/runtime/product-context";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Maps a stored WorkspaceMemberRole to a ProductActor.
 * - "owner" → "owner"
 * - "ops" → "ops"
 * - "reviewer" → "reviewer"
 * - "contributor" → "contributor"
 */
export function mapMembershipRoleToActor(role: string): ProductActor {
  if (role === "owner") return "owner";
  if (role === "ops") return "ops";
  if (role === "reviewer") return "reviewer";
  if (role === "contributor") return "contributor";
  throw new Error("UNKNOWN_WORKSPACE_ROLE");
}

export type SessionUserInfo = {
  id: string;
  email: string | null;
  displayName: string | null;
  walletAddress: string | null;
};

export type SessionMembership = {
  workspaceId: string;
  role: string;
};

/**
 * Builds a full ProductContext from a real user and their workspace membership.
 *
 * All three role user IDs are set to the real user ID so that policy checks
 * (which compare `activeUserId` against `ownerUserId` / `reviewerUserId` /
 * `contributorUserId`) align correctly for the signed-in user's actual role.
 */
export function buildProductContextFromMembership(
  user: SessionUserInfo,
  membership: SessionMembership,
): ProductContext {
  const actor = mapMembershipRoleToActor(membership.role);
  return {
    workspaceId: membership.workspaceId,
    ownerUserId: user.id,
    reviewerUserId: user.id,
    contributorUserId: user.id,
    actor,
    activeUserId: user.id,
  };
}

/**
 * Parses the `sf_session` cookie value from a Request's Cookie header.
 * Returns null when the cookie is absent or empty.
 */
export function parseSessionCookie(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  return parseCookieValue(header, SESSION_COOKIE_NAME);
}

export type CookieStoreLike = {
  get(name: string): { value: string } | undefined;
};

/**
 * Reads the `sf_session` cookie from a CookieStore-like object (e.g. `next/headers` cookies()).
 */
export function parseSessionCookieFromStore(store: CookieStoreLike): string | null {
  const cookie = store.get(SESSION_COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * Generic helper: reads a named cookie value from a raw Cookie header string.
 */
export function parseCookieValue(cookieHeader: string, name: string): string | null {
  for (const segment of cookieHeader.split(";")) {
    const [key, ...rest] = segment.trim().split("=");
    if (key === name && rest.length > 0) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}