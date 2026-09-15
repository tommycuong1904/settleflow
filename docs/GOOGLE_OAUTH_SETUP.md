# GOOGLE OAUTH SETUP

Playbook for fixing `Error 400: origin_mismatch` on Google Sign-In and for
registering new environments (local + production) against the existing
Google OAuth client.

## Runtime login flow

SettleFlow uses the Google Identity Services popup as its primary Web2 login
experience. The popup returns an ID token to the app, which is verified by the
server before a session cookie is issued. The server-side Authorization Code
callback at `/api/v1/auth/google/callback` remains an explicit fallback when a
user chooses to sign in in a separate page.

Register both the JavaScript origin and callback URI for every environment:
the popup requires the former, while the fallback requires the latter.

Google sign-in may create or link a verified `User`, but it never grants a
workspace role by itself. A new user gains workspace access only by accepting
a valid invitation for the same verified account.

## Quick reference

| Item | Value |
| --- | --- |
| Google Cloud project number | `470607933103` |
| OAuth 2.0 Client ID | `470607933103-1krtvifrij41a6emo835sp4k169kkhtt.apps.googleusercontent.com` |
| Client type | **Web application** (required by the server-side Authorization Code flow) |
| Client secret | Required server-side as `GOOGLE_CLIENT_SECRET`; never expose or commit it |
| Env var (local) | `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_DEFAULT_WORKSPACE_SLUG`, `GOOGLE_FIRST_LOGIN_ROLE` in `.env` |
| Env var (Vercel) | All four Google variables in Vercel project settings |

## Problem

Signing in with Google fails with:

```
Error 400: origin_mismatch
```

Google compares the **origin** (`scheme://host:port`) of the page that opens
the sign-in popup against the **"Authorized JavaScript origins"** registered on
the OAuth client. The port is part of the origin, so moving the dev server from
the Google OAuth start request against the OAuth client. The port is part of the origin, so the app must be opened on an origin registered in Google Cloud Console.

This is a **Google Cloud Console configuration issue, not a code bug.**

## Origins to register

Add each of these to **Authorized JavaScript origins** (one at a time via
`+ ADD URI`):

```
http://localhost:3000
http://127.0.0.1:3000
https://settleflow-dev.vercel.app
```

Rules:

- Full origin only — `scheme://host:port`, **no trailing slash**, **no path**.
- `https://settleflow-dev.vercel.app` — NOT `https://settleflow-dev.vercel.app/`.
- HTTPS is required for every origin except `localhost` / `127.0.0.1` / `[::1]`.
  A public HTTP origin such as `http://156.67.24.44:3000` will **not** work
  (not HTTPS and not localhost); use a localhost tunnel / HTTPS reverse proxy
  instead if remote access over HTTP is needed.

## Steps

1. Open the Google Cloud Console and select the project `470607933103`.
2. Go to **APIs & Services → Credentials**.
3. Under **OAuth 2.0 Client IDs**, find the **Web application** client whose ID
   contains `470607933103-1krtvifrij41a6emo835sp4k169kkhtt` and click it.
4. In **Authorized JavaScript origins**, click **+ ADD URI** for each origin
   listed above.
5. In **Authorized redirect URIs**, add the exact callback URL for every
   environment, for example:
   `http://localhost:3000/api/v1/auth/google/callback` and
   `https://settleflow-dev.vercel.app/api/v1/auth/google/callback`.
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
| Still `origin_mismatch` | Missing `:3000` in the origin, trailing `/`, or the page is opened via an unregistered URL (e.g. `http://156.67.24.44:3000`). Re-check the exact origin string shown in the browser address bar. |
| `client_id` not found / invalid | Wrong project selected, or a different `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set in the environment (local `.env` vs Vercel). |
| "Google hasn't verified this app" | OAuth consent screen still in **Testing** mode. See section above. |

## Relationship to demo and staging docs

`DEMO_GUIDE.md` describes how Google login is used during the demo; this file owns OAuth configuration and troubleshooting. For staging-specific provisioning, use `STAGING_ENVIRONMENT_SPEC.md` and `STAGING_PROVISIONING_CHECKLIST.md`.

## Notes

- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is public by design (embedded in the client
  bundle) — it is not a secret and can safely be shared with the team.
- In `.env` the value is currently wrapped in double quotes
  (`"4706...googleusercontent.com"`). Next.js strips these quotes at load
  (verified), so it works — but the quotes can be removed for cleanliness.
- Local/staging first login auto-provisions into `settleflow-demo` as `owner` by
  default. Production should use invitation/allowlist provisioning instead.
- The MVP wallet is deterministic and derived from the verified Google `sub`,
  not from an unverified client profile or email. Migrate to random encrypted
  key storage before production custody.
- Do not move the dev server between ports without registering the exact origin
  and callback URI.
