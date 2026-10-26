"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Wallet } from "lucide-react";

import { Button } from "@/components/shared/button";
import { saveCirclePaymentSession } from "@/lib/circle/user-controlled-client";

type CircleSdk = {
  getDeviceId(): Promise<string>;
  updateConfigs(config: unknown): void;
  setAuthentication(authentication: { userToken: string; encryptionKey: string }): void;
  performLogin(provider: unknown): void;
  execute(challengeId: string, callback: (error?: { message?: string } | null) => void): void;
};

type Login = { userToken: string; encryptionKey: string };

const COOKIE_DAYS = 1;
const circleRedirectUri = () => `${window.location.origin}/settings`;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_DAYS * 86400}; samesite=lax`;
}
function readCookie(name: string) {
  const value = document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!value) return undefined;
  try { return decodeURIComponent(value); } catch { return undefined; }
}

const pause = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function CirclePaymentAccount({ onReady, reconnect = false }: { onReady?: () => void; reconnect?: boolean }) {
  const sdkRef = useRef<CircleSdk | null>(null);
  const appId = process.env.NEXT_PUBLIC_CIRCLE_USER_CONTROLLED_APP_ID;
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const unavailable = !appId || !googleClientId;
  const [status, setStatus] = useState<"loading" | "idle" | "ready" | "working" | "error">(unavailable ? "error" : "loading");
  const [message, setMessage] = useState(unavailable ? "Payment account setup is unavailable." : "");

  async function finishProvisioning(login: Login, sdk: CircleSdk) {
    saveCirclePaymentSession(login);
    setStatus("working");
    setMessage("Creating your payment account…");
    const initialized = await fetch("/api/v1/circle/wallet", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userToken: login.userToken }),
    });
    const init = await initialized.json().catch(() => ({})) as { error?: string; wallet?: unknown; challenge?: { id: string } };
    if (!initialized.ok) throw new Error(init.error || "Unable to create the payment account.");
    if (init.wallet) {
      setStatus("ready"); setMessage(""); onReady?.(); return;
    }
    if (!init.challenge?.id) throw new Error("Circle did not return a wallet setup request.");
    sdk.setAuthentication(login);
    await new Promise<void>((resolve, reject) => sdk.execute(init.challenge!.id, (error) => error ? reject(new Error(error.message || "Wallet setup was not completed.")) : resolve()));
    let completionError = "Unable to finish wallet setup.";
    let completed = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      setMessage("Finalizing your payment account…");
      const response = await fetch("/api/v1/circle/wallet/complete", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userToken: login.userToken }),
      });
      const complete = await response.json().catch(() => ({})) as { error?: string };
      if (response.ok) { completed = true; break; }
      completionError = complete.error || completionError;
      if (response.status !== 409 || completionError !== "CIRCLE_WALLET_CHALLENGE_NOT_COMPLETE") break;
      await pause(1000);
    }
    if (!completed) throw new Error(completionError);
    setStatus("ready"); setMessage(""); onReady?.();
  }

  useEffect(() => {
    const configuredAppId = appId;
    const configuredGoogleClientId = googleClientId;
    if (!configuredAppId || !configuredGoogleClientId) return;
    let active = true;
    void (async () => {
      try {
        const { W3SSdk } = await import("@circle-fin/w3s-pw-web-sdk");
        const deviceToken = readCookie("sf_circle_device_token") ?? "";
        const deviceEncryptionKey = readCookie("sf_circle_device_key") ?? "";
        const sdk = new W3SSdk({ appSettings: { appId: configuredAppId }, loginConfigs: { deviceToken, deviceEncryptionKey, google: { clientId: configuredGoogleClientId, redirectUri: circleRedirectUri(), selectAccountPrompt: true } } }, (error, result) => {
          if (!active || !result || error) { if (active && error) { setStatus("error"); setMessage(error.message || "Google wallet setup was not completed."); } return; }
          void finishProvisioning({ userToken: result.userToken, encryptionKey: result.encryptionKey }, sdk as unknown as CircleSdk).catch((cause: unknown) => { if (active) { setStatus("error"); setMessage(cause instanceof Error ? cause.message : "Payment account setup failed."); } });
        });
        sdkRef.current = sdk as unknown as CircleSdk;
        const isSocialLoginReturn = window.location.hash.includes("id_token=");
        if (active) {
          setStatus(isSocialLoginReturn ? "working" : "idle");
          if (isSocialLoginReturn) setMessage("Finishing your secure connection…");
        }
      } catch { if (active) { setStatus("error"); setMessage("Payment account setup is unavailable."); } }
    })();
    return () => { active = false; };
  // Circle owns the redirect lifecycle; initialization must occur once per page load.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    const sdk = sdkRef.current;
    if (!sdk || !appId || !googleClientId) return;
    try {
      setStatus("working"); setMessage("Opening Google…");
      const deviceId = await sdk.getDeviceId();
      const response = await fetch("/api/v1/circle/wallet/social-token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId }) });
      const session = await response.json().catch(() => ({})) as { deviceToken?: string; deviceEncryptionKey?: string; error?: string };
      if (!response.ok || !session.deviceToken || !session.deviceEncryptionKey) throw new Error(session.error || "Unable to start payment account setup.");
      setCookie("sf_circle_device_token", session.deviceToken); setCookie("sf_circle_device_key", session.deviceEncryptionKey);
      sdk.updateConfigs({ appSettings: { appId }, loginConfigs: { deviceToken: session.deviceToken, deviceEncryptionKey: session.deviceEncryptionKey, google: { clientId: googleClientId, redirectUri: circleRedirectUri(), selectAccountPrompt: true } } });
      const { SocialLoginProvider } = await import("@circle-fin/w3s-pw-web-sdk/dist/src/types");
      sdk.performLogin(SocialLoginProvider.GOOGLE);
    } catch (cause) { setStatus("error"); setMessage(cause instanceof Error ? cause.message : "Payment account setup failed."); }
  };

  return <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-muted)]/30 p-4 sm:flex-row sm:items-center sm:justify-between">
    <div><p className="text-sm font-semibold text-[var(--foreground)]">{reconnect ? "Reconnect payment account" : "Set up payment account"}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{reconnect ? "Use Google to reconnect this browser before confirming a payment." : "Use Google to create your secure USDC payment account. No browser wallet or recovery phrase is needed."}</p>{message ? <p role="status" className="mt-2 text-xs text-[var(--text-muted)]">{message}</p> : null}</div>
    <Button type="button" size="sm" variant="primary" onClick={() => void connect()} disabled={status === "loading" || status === "working" || status === "ready"} className="w-full shrink-0 justify-center sm:w-auto"><Wallet size={14} className="mr-1.5" />{status === "working" ? <><LoaderCircle size={14} className="mr-1.5 animate-spin" />{reconnect ? "Reconnecting…" : "Setting up…"}</> : status === "ready" ? (reconnect ? "Reconnected" : "Payment account ready") : (reconnect ? "Reconnect with Google" : "Set up account")}</Button>
  </div>;
}
