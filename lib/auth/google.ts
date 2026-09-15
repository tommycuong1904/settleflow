/**
 * Google Identity Services (GIS) / OAuth 2.0 Client helper
 */

export interface GoogleUserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string;
  emailVerified?: boolean;
}

export interface GoogleIdTokenProfile extends GoogleUserProfile {
  idToken: string;
}

export class GoogleUserInfoError extends Error {
  readonly status: number;
  readonly googleError: string | null;
  readonly googleErrorDescription: string | null;

  constructor(status: number, googleError: string | null, googleErrorDescription: string | null) {
    super("Google UserInfo rejected the credential.");
    this.name = "GoogleUserInfoError";
    this.status = status;
    this.googleError = googleError;
    this.googleErrorDescription = googleErrorDescription;
  }
}

export class GoogleUserInfoNetworkError extends Error {
  constructor() {
    super("Google UserInfo request failed before a response was received.");
    this.name = "GoogleUserInfoNetworkError";
  }
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (tokenResponse: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

/**
 * Loads the Google Identity Services SDK script dynamically
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.google?.accounts) return resolve();

    const existingScript = document.getElementById("google-gsi-client");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Google script.")));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services SDK."));
    document.head.appendChild(script);
  });
}

/**
 * Decodes a Google JWT ID Token (credential payload)
 */
export function decodeGoogleJwt(jwtToken: string): GoogleUserProfile | null {
  try {
    const parts = jwtToken.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!parsed.email) return null;

    return {
      sub: parsed.sub || parsed.email,
      email: parsed.email,
      name: parsed.name || parsed.email.split("@")[0],
      picture: parsed.picture,
      emailVerified: parsed.email_verified,
    };
  } catch (err) {
    console.error("Error decoding Google JWT:", err);
    return null;
  }
}

/**
 * Fetches user profile from Google UserInfo endpoint with an OAuth access token
 */

export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserProfile> {
  let response: Response;
  try {
    response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new GoogleUserInfoNetworkError();
  }

  if (!response.ok) {
    let googleError: string | null = null;
    let googleErrorDescription: string | null = null;
    try {
      const payload = (await response.json()) as { error?: unknown; error_description?: unknown };
      googleError = typeof payload.error === "string" ? payload.error : null;
      googleErrorDescription = typeof payload.error_description === "string" ? payload.error_description : null;
    } catch {
      // Keep unexpected upstream bodies private.
    }
    throw new GoogleUserInfoError(response.status, googleError, googleErrorDescription);
  }

  const data = (await response.json()) as {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };

  return {
    sub: data.sub || data.email,
    email: data.email,
    name: data.name || data.email.split("@")[0],
    picture: data.picture,
    emailVerified: data.email_verified,
  };
}

/**
 * Triggers Google OAuth 2.0 Popup authentication using GIS Token Client
 */
export async function promptGoogleOAuth(clientId: string): Promise<GoogleIdTokenProfile> {
  await loadGoogleGsiScript();

  if (!window.google?.accounts?.id) {
    throw new Error("Google Identity Services is not available.");
  }

  return new Promise((resolve, reject) => {
    try {
      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          const profile = decodeGoogleJwt(response.credential);
          if (!profile) return reject(new Error("Invalid Google ID token."));
          resolve({ ...profile, idToken: response.credential });
        },
      });
      window.google!.accounts.id.prompt();
    } catch (err) {
      reject(err);
    }
  });
}
