/**
 * Helper to dynamically resolve the public base URL of the application
 * across local development, Docker, Vercel, Railway, or production proxies.
 */
export function getAppBaseUrl(request?: Request): string {
  // 1. Explicit environment variable override (Production / Staging / Configured app URL)
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "");
  }

  if (request) {
    // 2. HTTP Headers (handles reverse proxies, Cloudflare, Docker, Vercel, etc.)
    const headers = request.headers;
    const forwardedHost = headers.get("x-forwarded-host") || headers.get("host");
    const forwardedProto =
      headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");

    if (forwardedHost) {
      const cleanHost = forwardedHost.split(",")[0].trim().replace("0.0.0.0", "localhost");
      return `${forwardedProto}://${cleanHost}`;
    }

    // 3. Request URL fallback (replace 0.0.0.0 with localhost for dev server)
    try {
      const url = new URL(request.url);
      const cleanHost = url.host.replace("0.0.0.0", "localhost");
      return `${url.protocol}//${cleanHost}`;
    } catch {
      // Fallback below
    }
  }

  // 4. Default local development fallback
  return "http://localhost:3000";
}
