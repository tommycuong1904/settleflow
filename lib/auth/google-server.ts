import { OAuth2Client } from "google-auth-library";
import type { GoogleUserProfile } from "./google";

export async function verifyGoogleIdToken(idToken: string, clientId: string): Promise<GoogleUserProfile> {
  const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) throw new Error("Google ID token is missing required claims.");
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
    emailVerified: payload.email_verified,
  };
}
