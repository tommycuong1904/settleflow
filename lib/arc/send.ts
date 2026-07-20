import { ARC_CONFIG } from "@/lib/arc/config";
import type { ArcSendRequest, ArcSendResult } from "@/lib/arc/types";

export async function sendUsdcOnArc(
  request: ArcSendRequest,
): Promise<ArcSendResult> {
  void request;

  return {
    status: "pending",
    txHash: "0xappkitsendplaceholder",
    explorerUrl: `${ARC_CONFIG.explorerUrl}/tx/0xappkitsendplaceholder`,
  };
}
