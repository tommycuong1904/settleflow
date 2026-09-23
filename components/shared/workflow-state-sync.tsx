"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { WORKFLOW_UPDATED_EVENT } from "@/lib/runtime/workflow-sync";

const WORKFLOW_CHANNEL = "settleflow:workflow";

export function WorkflowStateSync() {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();
    window.addEventListener(WORKFLOW_UPDATED_EVENT, refresh);

    const channel = "BroadcastChannel" in window
      ? new BroadcastChannel(WORKFLOW_CHANNEL)
      : null;
    channel?.addEventListener("message", refresh);

    return () => {
      window.removeEventListener(WORKFLOW_UPDATED_EVENT, refresh);
      channel?.removeEventListener("message", refresh);
      channel?.close();
    };
  }, [router]);

  return null;
}
