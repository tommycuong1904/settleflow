"use client";

import { useWallet } from "@/lib/context/wallet-context";


export default function AuthRequiredPage() {
  const { openAuthModal } = useWallet();


  return (
    <div className="sf-app-wrapper flex min-h-[60vh] items-center justify-center py-12">
      <section className="sf-shell w-full max-w-xl rounded-xl p-8 text-center">
        <p className="sf-eyebrow">Authentication required</p>
        <h1 className="mt-3 text-2xl font-semibold">Sign in to continue</h1>
        <p className="mt-3 text-sm text-slate-500">Sign in to access this page.</p>
        <button className="sf-button sf-button-primary mt-6" onClick={openAuthModal}>
          Sign in / Connect
        </button>
      </section>
    </div>
  );
}

export const dynamic = "force-dynamic";
