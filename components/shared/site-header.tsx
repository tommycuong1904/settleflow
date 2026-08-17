"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { connectBrowserWallet } from "@/lib/arc/browser-wallet";
import { useRouter } from "next/navigation";

import { ActorSwitcher } from "@/components/shared/actor-switcher";

const NAV_LINK_CLASS = "transition-colors hover:text-cyan-200";

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 96);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-50 transition-all duration-300 ease-out",
        isScrolled
          ? "border-b border-[rgba(148,163,184,0.16)] bg-[rgba(2,6,23,0.82)] shadow-[0_18px_42px_rgba(2,6,23,0.34)] backdrop-blur-xl"
          : "border-b border-[var(--border-soft)] bg-slate-950/90 backdrop-blur",
      ].join(" ")}
    >
      <div
        className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-3 transition-all duration-300 ease-out lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-center justify-between gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight text-white transition-transform duration-300 ease-out">
            <span className="text-white">Settle</span>
            <span className="text-cyan-300">Flow</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[var(--text-primary)] md:flex">
            <Link href="/dashboard" className={NAV_LINK_CLASS}>
              Dashboard
            </Link>
            <Link href="/payouts/new" className={NAV_LINK_CLASS}>
              New Payout
            </Link>
          </nav>
           <Button
             onClick={async () => {
               try {
                 await connectBrowserWallet();
               } catch (e) {
                 console.error('Wallet connection failed', e);
               }
               router.push('/app');
             }}
             variant="primary"
           >
             Launch App
           </Button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:justify-end">
          <nav className="flex items-center gap-6 text-sm text-[var(--text-primary)] md:hidden">
            <Link href="/dashboard" className={NAV_LINK_CLASS}>
              Dashboard
            </Link>
            <Link href="/payouts/new" className={NAV_LINK_CLASS}>
              New Payout
            </Link>
          </nav>
          <div
            className={[
              "transition-all duration-300 ease-out",
              isScrolled ? "translate-y-0 scale-[0.985]" : "translate-y-0 scale-100",
            ].join(" ")}
          >
            <Suspense
              fallback={<div className="h-14 min-w-[220px] rounded-2xl border border-[var(--border-soft)] bg-[rgba(8,15,31,0.68)]" />}
            >
              <ActorSwitcher />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
