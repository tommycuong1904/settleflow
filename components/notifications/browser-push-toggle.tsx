"use client";

import { useEffect, useState } from "react";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
type PushState = "idle" | "enabled" | "pending" | "unavailable" | "denied" | "error";

function applicationServerKey(value: string) {
  const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function BrowserPushToggle() {
  const [state, setState] = useState<PushState>(publicKey ? "pending" : "unavailable");

  useEffect(() => {
    if (!publicKey || !("serviceWorker" in navigator) || !("Notification" in window)) return;
    let active = true;
    void navigator.serviceWorker.getRegistration("/push-service-worker.js")
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => { if (active) setState(subscription ? "enabled" : "idle"); })
      .catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);

  async function enable() {
    if (!publicKey || !("serviceWorker" in navigator) || !("Notification" in window)) return setState("unavailable");
    setState("pending");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState("denied");
      const registration = await navigator.serviceWorker.register("/push-service-worker.js");
      const subscription = await registration.pushManager.getSubscription()
        ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await fetch("/api/v1/push-subscriptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error("PUSH_SUBSCRIPTION_FAILED");
      setState("enabled");
    } catch {
      setState("error");
    }
  }

  async function disable() {
    setState("pending");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/push-service-worker.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/v1/push-subscriptions", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!response.ok) throw new Error("PUSH_UNSUBSCRIPTION_FAILED");
        await subscription.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (state === "unavailable") return <p className="text-xs text-[var(--text-muted)]">Browser Push is not configured for this environment.</p>;
  if (state === "pending") return <p className="text-xs text-[var(--text-muted)]">Checking Browser Push…</p>;
  if (state === "denied") return <p className="text-xs text-[var(--text-muted)]">Notifications are blocked by this browser. Enable them in browser settings to continue.</p>;
  if (state === "error") return <p className="text-xs text-red-600">Browser Push could not be updated. Please try again.</p>;
  if (state === "enabled") return <button type="button" className="sf-button sf-button-secondary" onClick={() => void disable()}>Disable Browser Push</button>;
  return <button type="button" className="sf-button sf-button-secondary" onClick={() => void enable()}>Enable Browser Push</button>;
}
