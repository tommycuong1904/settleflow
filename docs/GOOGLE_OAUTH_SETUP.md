# GOOGLE OAUTH SETUP

Playbook for fixing `Error 400: origin_mismatch` on Google Sign-In and for
registering new environments (local + production) against the existing
Google OAuth client.

## Quick reference

| Item | Value |
| --- | --- |
| Google Cloud project number | `470607933103` |
| OAuth 2.0 Client ID | `470607933103-1krtvifrij41a6emo835sp4k169kkhtt.apps.googleusercontent.com` |
| Client type | **Web application** (required by the GIS browser token flow used in `lib/auth/google.ts`) |
| Client secret | None needed — the app uses Google Identity Services browser flow (`initTokenClient`), no server-side token exchange |
| Env var (local) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `.env` |
| Env var (Vercel) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in Vercel project settings |

## Problem

Signing in with Google fails with:

```
Error 400: origin_mismatch
```

Google compares the **origin** (`scheme://host:port`) of the page that opens
the sign-in popup against the **"Authorized JavaScript origins"** registered on
the OAuth client. The port is part of the origin, so moving the dev server from
port `3000` to port `3001` (because LumenFlow occupies `3000`) immediately
breaks Google Sign-In until the new origin is registered.

This is a **Google Cloud Console configuration issue, not a code bug.**

## Origins to register

Add each of these to **Authorized JavaScript origins** (one at a time via
`+ ADD URI`):

```
http://localhost:3001
http://127.0.0.1:3001
https://settleflow-dev.vercel.app
```

Rules:

- Full origin only — `scheme://host:port`, **no trailing slash**, **no path**.
- `https://settleflow-dev.vercel.app` — NOT `https://settleflow-dev.vercel.app/`.
- HTTPS is required for every origin except `localhost` / `127.0.0.1` / `[::1]`.
  A public HTTP origin such as `http://156.67.24.44:3001` will **not** work
  (not HTTPS and not localhost); use a localhost tunnel / HTTPS reverse proxy
  instead if remote access over HTTP is needed.

## Steps

1. Open the Google Cloud Console and select the project `470607933103`.
2. Go to **APIs & Services → Credentials**.
3. Under **OAuth 2.0 Client IDs**, find the **Web application** client whose ID
   contains `470607933103-1krtvifrij41a6emo835sp4k169kkhtt` and click it.
4. In **Authorized JavaScript origins**, click **+ ADD URI** for each origin
   listed above.
5. **Authorized redirect URIs** — usually not required for the GIS token
   popup flow. If Google refuses to save without one, add
   `https://settleflow-dev.vercel.app` (and optionally `http://localhost:3001`).
6. Click **SAVE**. Propagation is usually immediate, occasionally up to a few
   minutes.
7. Reload the app and retry **Continue with Google**.

## OAuth consent screen (Testing vs In production)

If a login attempt shows "Google hasn't verified this app" / access blocked:

- Go to **APIs & Services → OAuth consent screen**.
- Status **Testing** → only accounts listed under **Test users** can sign in.
  Either add the accounts to **Test users** (during development) or click
  **Publish app** to move to **In production** (requires the configured
  scopes to be non-sensitive — `openid email profile` qualifies).

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| Still `origin_mismatch` | Missing `:3001` in the origin, trailing `/`, or the page is opened via an unregistered URL (e.g. `http://156.67.24.44:3001`). Re-check the exact origin string shown in the browser address bar. |
| `client_id` not found / invalid | Wrong project selected, or a different `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in the environment (local `.env` vs Vercel). |
| "Google hasn't verified this app" | OAuth consent screen still in **Testing** mode. See section above. |

## Notes

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is public by design (embedded in the client
  bundle) — it is not a secret and can safely be shared with the team.
- In `.env` the value is currently wrapped in double quotes
  (`"4706...googleusercontent.com"`). Next.js strips these quotes at load
  (verified), so it works — but the quotes can be removed for cleanliness.
- Do not move the dev server back to port `3000` expecting this to fix
  anything; register the actual origins you run on.
