import type {
  ArcSendRequest,
  ArcSendResult,
  ReleaseExecutionMode,
} from "@/lib/arc/types";

export type ReleaseExecutor = (
  request: ArcSendRequest,
) => Promise<ArcSendResult>;

/** Keep wallet-specific signing behind one release boundary. */
export function createReleaseExecutor(
  mode: ReleaseExecutionMode,
): ReleaseExecutor {
  return async () => ({
    status: "failed",
    network: "Arc Testnet",
    errorMessage:
      mode === "browser_wallet"
        ? "Browser wallet execution is not wired yet."
        : "Circle Wallets execution is server-side and not wired yet.",
  });
}