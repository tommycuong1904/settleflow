"use client";
import { useState } from "react";
const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
function bytes(value: string) { const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(raw, c => c.charCodeAt(0)); }
export function BrowserPushToggle() {
  const [state, setState] = useState<"idle" | "enabled" | "unavailable">(key ? "idle" : "unavailable");
  async function enable() {
    if (!key || !("serviceWorker" in navigator) || !("Notification" in window)) return setState("unavailable");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    const registration = await navigator.serviceWorker.register("/push-service-worker.js");
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(key) });
    await fetch("/api/v1/push-subscriptions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(subscription) });
    setState("enabled");
  }
  if (state === "unavailable") return <p className="text-xs text-[var(--text-muted)]">Browser Push is not configured for this environment.</p>;
  return <button type="button" className="sf-button sf-button-secondary" onClick={() => void enable()} disabled={state === "enabled"}>{state === "enabled" ? "Browser Push enabled" : "Enable Browser Push"}</button>;
}
