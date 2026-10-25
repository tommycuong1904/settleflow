"use client";

export type CircleSdkChallenge = {
  id: string;
  appId: string;
};

export type CirclePaymentSession = { userToken: string; encryptionKey: string };
const SESSION_KEY = "sf_circle_payment_session";

export function saveCirclePaymentSession(session: CirclePaymentSession) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getCirclePaymentSession(): CirclePaymentSession | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? "null") as CirclePaymentSession | null;
    return value?.userToken && value.encryptionKey ? value : null;
  } catch { return null; }
}

/** Opens Circle's embedded confirmation UI. Tokens are short-lived and are
 * supplied by an authenticated server route; API credentials never enter here. */
export async function executeCircleChallenge(challenge: CircleSdkChallenge, session: CirclePaymentSession): Promise<void> {
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  const sdk = new W3SSdk({
    appSettings: { appId: challenge.appId },
    authentication: session,
  });
  await new Promise<void>((resolve, reject) => {
    sdk.execute(challenge.id, (error, result) => {
      if (error) {
        reject(new Error(error.message || "Circle wallet confirmation failed."));
        return;
      }
      // The Web SDK may return an intermediate challenge status. The server
      // reads Circle's authoritative challenge state immediately afterwards.
      if (result) resolve();
      else reject(new Error("Circle wallet confirmation did not return a result."));
    });
  });
}
