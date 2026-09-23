export const WORKFLOW_UPDATED_EVENT = "settleflow:workflow-updated";
const WORKFLOW_CHANNEL = "settleflow:workflow";

export function notifyWorkflowUpdated() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event(WORKFLOW_UPDATED_EVENT));
  if (!("BroadcastChannel" in window)) return;

  const channel = new BroadcastChannel(WORKFLOW_CHANNEL);
  channel.postMessage({ type: WORKFLOW_UPDATED_EVENT });
  channel.close();
}
