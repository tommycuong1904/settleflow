// Product gate, deliberately independent of provider credentials. Circle Smart
// Wallet remains a future capability while the MVP supports Web3 EOA releases.
export const CIRCLE_SMART_WALLET_AVAILABLE = false;

export function circleSmartWalletComingSoonResponse() {
  return { error: "CIRCLE_SMART_WALLET_COMING_SOON" };
}
