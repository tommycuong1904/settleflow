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
