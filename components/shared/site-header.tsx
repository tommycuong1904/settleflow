"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/shared/button";
import { ArrowRight, Menu, X } from "lucide-react";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const navLinks = isHome
    ? [
        ["Product", "#product"],
        ["How it works", "#workflow"],
        ["Why Arc", "#why-arc"],
        ["Proof", "#proof"],
      ]
    : [
        ["Home", "/"],
        ["Dashboard", "/dashboard"],
        ["Payouts", "/payouts"],
        ["Settings", "/settings"],
      ];

  return (
    <header className={`sf-header ${!isHome ? "sf-header-solid" : ""}`}>
      <div className="sf-container sf-nav">
        <Link href="/" className="sf-wordmark" aria-label="SettleFlow home">
          <span>Settle</span>Flow
        </Link>
        <nav
          className={open ? "sf-nav-links is-open" : "sf-nav-links"}
          aria-label="Main navigation"
        >
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={
                isHome
                  ? undefined
                  : label === (isHome ? "" : pathname.replace("/", ""))
                  ? "sf-active-link"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
          {/* Launch App button on landing page */}
          {isHome ? (
            <Button href="/dashboard" size="sm" variant="primary">
              Launch App <ArrowRight size={14} />
            </Button>
          ) : (
            <Button href="/payouts/new" size="sm" variant="primary">
              Create a payout <ArrowRight size={14} />
            </Button>
          )}
        </nav>
        <button
          className="sf-menu"
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  );
}

