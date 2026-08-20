// Role utility functions for SettleFlow
// Provides hierarchical role checks (owner > reviewer > contributor)

import type { ProductActor } from "@/lib/runtime/product-context";

/**
 * Ordered list of roles from lowest privilege to highest.
 * This order defines the hierarchy used by `hasRole`.
 */
const ROLE_HIERARCHY: ProductActor[] = ["contributor", "reviewer", "owner"];

/**
 * Checks whether the current actor has at least the required role.
 *
 * @param actor - The current actor obtained from the product context.
 * @param required - The role required to perform an action or view UI.
 * @returns true if `actor` is the same as or higher in the hierarchy than `required`.
 */
export function hasRole(actor: ProductActor, required: ProductActor): boolean {
  const actorIdx = ROLE_HIERARCHY.indexOf(actor);
  const requiredIdx = ROLE_HIERARCHY.indexOf(required);
  if (actorIdx === -1 || requiredIdx === -1) return false;
  return actorIdx >= requiredIdx;
}

/**
 * Helper to compare two roles directly (e.g., for equality checks).
 */
export function isRole(actor: ProductActor, role: ProductActor): boolean {
  return actor === role;
}
