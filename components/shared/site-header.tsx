"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/shared/button";
import { usePathname } from "next/navigation";
import { connectBrowserWallet } from "@/lib/arc/browser-wallet";
import { useRouter } from "next/navigation";

import { ActorSwitcher } from "@/components/shared/actor-switcher";

import { ArrowRight, Check, ChevronRight, CircleCheck, CircleDot, FileCheck2, LockKeyhole, Menu, ShieldCheck, WalletCards, X } from 'lucide-react'

const NAV_LINK_CLASS = "transition-colors hover:text-cyan-200";

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname();
  const isHome = pathname === '/';
  const navLinks = isHome
    ? [['Product', '#product'], ['How it works', '#workflow'], ['Why Arc', '#why-arc'], ['Proof', '#proof']]
    : [
        ['Home', '/'],
        ['Dashboard', '/dashboard'],
        ['Payouts', '/payouts'],
        ['Settings', '/settings'],
      ];
  return (
    <header className={`sf-header ${!isHome ? 'sf-header-solid' : ''}`}>
      <div className="sf-container sf-nav">
        <a href="/" className="sf-wordmark" aria-label="SettleFlow home"><span>Settle</span>Flow</a>
        <nav className={open ? 'sf-nav-links is-open' : 'sf-nav-links'} aria-label="Main navigation">
          {navLinks.map(([label, href]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className={isHome ? undefined : (label === (isHome ? '' : pathname.replace('/', '')) ? 'sf-active-link' : undefined)}>{label}</a>
          ))}
          {/* Keep the create‑payout button on all pages */}
          <a href="/payouts/new" className="sf-button sf-button-small">Create a payout <ArrowRight size={15} /></a>
        </nav>
        <button className="sf-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </header>
  );
}
