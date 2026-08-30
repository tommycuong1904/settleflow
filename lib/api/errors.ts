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
  return apiError(code, {
    status: statuses[code] ?? (code === "AUTH_CONTEXT_REQUIRED" ? 403 : fallback.status ?? 500),
    message: messages[code] ?? fallback.message ?? code,
  });
}
