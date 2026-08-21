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
  const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve Google user profile.");
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
export async function promptGoogleOAuth(clientId: string): Promise<GoogleUserProfile> {
  await loadGoogleGsiScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services is not available.");
  }

  return new Promise((resolve, reject) => {
    try {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          if (tokenResponse.error) {
            return reject(new Error(tokenResponse.error));
          }
          if (!tokenResponse.access_token) {
            return reject(new Error("No access token received from Google."));
          }
          try {
            const profile = await fetchGoogleUserInfo(tokenResponse.access_token);
            resolve(profile);
          } catch (err) {
            reject(err);
          }
        },
      });

      client.requestAccessToken();
    } catch (err) {
      reject(err);
    }
  });
}
