"use client";

export type CircleSdkChallenge = {
  id: string;
  appId: string;
  userToken: string;
  encryptionKey: string;
};

/** Opens Circle's embedded confirmation UI. Tokens are short-lived and are
 * supplied by an authenticated server route; API credentials never enter here. */
export async function executeCircleChallenge(challenge: CircleSdkChallenge): Promise<void> {
  const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
  const sdk = new W3SSdk({
    appSettings: { appId: challenge.appId },
    authentication: { userToken: challenge.userToken, encryptionKey: challenge.encryptionKey },
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
