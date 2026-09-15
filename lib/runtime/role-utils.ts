// Role utility functions for SettleFlow
// Provides exact role checks.

import type { ProductActor } from "@/lib/runtime/product-context";

/**
 * Ordered list of roles from lowest privilege to highest.
 * This order defines the hierarchy used by `hasRole`.
 */


/**
 * Checks whether the current actor has at least the required role.
 *
 * @param actor - The current actor obtained from the product context.
 * @param required - The role required to perform an action or view UI.
 * @returns true if `actor` is the same as or higher in the hierarchy than `required`.
 */
export function hasRole(actor: ProductActor, required: ProductActor): boolean {
  return actor === required;
}

/**
 * Helper to compare two roles directly (e.g., for equality checks).
 */
export function isRole(actor: ProductActor, role: ProductActor): boolean {
  return actor === role;
}
