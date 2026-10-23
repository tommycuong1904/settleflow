export const FORM_REQUEST_TIMEOUT_MS = 15_000;

export function createRequestTimeout(timeoutMs = FORM_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    clear: () => globalThis.clearTimeout(timeoutId),
  };
}
