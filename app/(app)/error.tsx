"use client";

import { useEffect } from "react";
import { useWallet } from "@/lib/context/wallet-context";
import { classifyFrontendAuthError } from "@/lib/runtime/auth-error-classification";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { openAuthModal } = useWallet();
  const errorKind = classifyFrontendAuthError(error);
  const isAuthRequired = errorKind === "auth-required";
  const isContextRequired = errorKind === "auth-context-required";
  const isRoleAmbiguous = errorKind === "auth-role-ambiguous";
  const isAuthContextError = isContextRequired || isRoleAmbiguous;

  useEffect(() => {
    if (errorKind === "server-error") console.error(error);
  }, [error, errorKind]);

  if (isAuthRequired) {
    return (
      <div className="sf-app-wrapper flex min-h-[60vh] items-center justify-center py-12">
        <section className="sf-shell w-full max-w-xl rounded-xl p-8 text-center">
          <p className="sf-eyebrow">Authentication required</p>
          <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
          <p className="mt-3 text-sm text-slate-500">Connect a wallet or use the available sign-in flow to access this page.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button className="sf-button sf-button-primary" onClick={openAuthModal}>Sign in / Connect</button>
            <button className="sf-button sf-button-ghost" onClick={() => reset()}>Retry</button>
          </div>
        </section>
      </div>
    );
  }

  if (isAuthContextError) {
    return (
      <div className="sf-app-wrapper flex min-h-[60vh] items-center justify-center py-12">
        <section className="sf-shell w-full max-w-xl rounded-xl p-8 text-center">
          <p className="sf-eyebrow">Workspace access required</p>
          <h1 className="mt-3 text-2xl font-semibold">
            {isRoleAmbiguous ? "Workspace role needs attention" : "Workspace access is not available"}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {isRoleAmbiguous
              ? "Your account has conflicting workspace roles. Contact an administrator to resolve access."
              : "Your sign-in is valid, but no authorized workspace context is available for this page."}
          </p>
          <button className="sf-button sf-button-ghost mt-6" onClick={() => reset()}>Retry</button>
        </section>
      </div>
    );
  }

  return (
    <div className="sf-app-wrapper py-12">
      <section className="sf-shell rounded-xl p-8">
        <h1 className="text-2xl font-semibold">This page couldn’t load</h1>
        <p className="mt-3 text-sm text-slate-500">A server error occurred. Reload to try again.</p>
        <button className="sf-button sf-button-primary mt-6" onClick={() => reset()}>Reload</button>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
