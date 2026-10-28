export type FrontendAuthErrorKind =
  | "auth-required"
  | "auth-context-required"
  | "auth-role-ambiguous"
  | "server-error";

export function classifyFrontendAuthError(error: unknown): FrontendAuthErrorKind {
  const code = error instanceof Error ? error.message : "";

  if (code === "AUTH_REQUIRED") return "auth-required";
  if (code === "AUTH_CONTEXT_REQUIRED") return "auth-context-required";
  if (code === "AUTH_ROLE_AMBIGUOUS") return "auth-role-ambiguous";
  return "server-error";
}

/** Keeps domain authorization codes out of Web2-facing UI. */
export function getFrontendAuthErrorMessage(error: unknown, fallback: string): string {
  switch (classifyFrontendAuthError(error)) {
    case "auth-required":
      return "Your session has ended. Sign in and try again.";
    case "auth-context-required":
      return "Your workspace access is not available. Choose a workspace you can access and try again.";
    case "auth-role-ambiguous":
      return "Your workspace access needs attention. Ask the workspace owner to review your role.";
    default:
      return error instanceof Error && error.message ? error.message : fallback;
  }
}
