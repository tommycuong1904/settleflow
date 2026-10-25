// Explicit Testnet safety gate. A valid configuration alone never enables the
// provider: an operator must opt in with CIRCLE_USER_CONTROLLED_ENABLED=true.
// This module intentionally exposes no credential values to callers.
export const CIRCLE_SMART_WALLET_AVAILABLE =
  process.env.CIRCLE_USER_CONTROLLED_ENABLED === "true" &&
  Boolean(process.env.CIRCLE_USER_CONTROLLED_API_KEY) &&
  Boolean(process.env.NEXT_PUBLIC_CIRCLE_USER_CONTROLLED_APP_ID);

export function circleSmartWalletComingSoonResponse() {
  return { error: "CIRCLE_SMART_WALLET_COMING_SOON" };
}
