"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/shared/button";
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
          <p className="mt-3 text-sm text-[var(--text-muted)]">Sign in with your account to access this page. Wallet setup is only needed when you choose Wallet payment.</p>
          <div className="mt-6 flex justify-center"><Button onClick={openAuthModal}>Sign in</Button></div>
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
          <p className="mt-3 text-sm text-[var(--text-muted)]">
            {isRoleAmbiguous
              ? "Your account has conflicting workspace roles. Contact an administrator to resolve access."
              : "Your sign-in is valid, but no authorized workspace context is available for this page."}
          </p>
          <div className="mt-6 flex justify-center"><Button variant="secondary" onClick={() => reset()} icon={<RefreshCw size={14} />}>Try again</Button></div>
        </section>
      </div>
    );
  }

  return (
    <div className="sf-app-wrapper flex min-h-[60vh] items-center justify-center py-12">
      <section className="sf-shell w-full max-w-xl rounded-xl p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-50 text-amber-700">
          <AlertTriangle size={22} />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Temporary problem</p>
        <h1 className="mt-2 text-2xl font-semibold">This page couldn’t load</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Check your connection and try again. If the problem continues, return to the dashboard and try later.</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={() => reset()} icon={<RefreshCw size={14} />}>Try again</Button>
          <Button href="/dashboard" variant="secondary">Go to dashboard</Button>
        </div>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
