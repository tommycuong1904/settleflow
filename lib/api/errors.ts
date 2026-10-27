import { NextResponse } from "next/server";

type ApiErrorOptions = {
  message?: string;
  status?: number;
};

export function apiError(code: string, options: ApiErrorOptions = {}) {
  return NextResponse.json(
    { error: options.message ?? code, code },
    { status: options.status ?? 500 },
  );
}

export function apiErrorFromCode(
  code: string,
  statuses: Record<string, number>,
  messages: Record<string, string> = {},
  fallback: ApiErrorOptions = {},
) {
  const isAuthorizationContextError = code === "AUTH_CONTEXT_REQUIRED" || code === "AUTH_ROLE_AMBIGUOUS";
  return apiError(code, {
    status: statuses[code] ?? (isAuthorizationContextError ? 403 : fallback.status ?? 500),
    message: messages[code] ?? fallback.message ?? code,
  });
}
