"use client";

import { useWallet } from "@/lib/context/wallet-context";
import { useSearchParams } from "next/navigation";

export default function AuthRequiredPage() {
  const { openAuthModalForReturnTo } = useWallet();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const returnTo = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const destinationLabel = next === "/dashboard"
    ? "your workspace"
    : next === "/payouts"
      ? "your payouts"
      : next.startsWith("/payouts/")
        ? "this payout"
        : next === "/contributors"
          ? "your contributors"
          : "this page";

  return (
    <div className="sf-app-wrapper flex min-h-[60vh] items-center justify-center py-12">
      <section className="sf-shell w-full max-w-xl rounded-xl p-8 text-center">
        <p className="sf-eyebrow">Authentication required</p>
        <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Sign in to open {destinationLabel}. You can use your Google account; payment setup is optional.</p>
        <button className="sf-button sf-button-primary mt-6" onClick={() => openAuthModalForReturnTo(returnTo)}>
          Sign in
        </button>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
