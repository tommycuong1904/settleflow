export const DEFAULT_WORKSPACE_ID = "ws-demo";
export const DEFAULT_OWNER_USER_ID = "user-owner";
export const DEFAULT_REVIEWER_USER_ID = "user-reviewer";
export const DEFAULT_CONTRIBUTOR_USER_ID = "user-contrib";

/**
 * Transitional runtime defaults while auth/session and workspace selection
 * are still being implemented. Existing product surfaces should import these
 * from one place instead of scattering seeded IDs across the app.
 */
export const DEFAULT_PRODUCT_CONTEXT = {
  workspaceId: DEFAULT_WORKSPACE_ID,
  ownerUserId: DEFAULT_OWNER_USER_ID,
  reviewerUserId: DEFAULT_REVIEWER_USER_ID,
  contributorUserId: DEFAULT_CONTRIBUTOR_USER_ID,
} as const;
