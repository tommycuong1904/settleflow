"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, Users, Activity, Settings, X, Droplets, ExternalLink, Bell } from "lucide-react";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";
import type { ProductContext } from "@/lib/runtime/product-context";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
  soon?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payouts", href: "/payouts", icon: ArrowRightLeft },
  { label: "Contributors", href: "/contributors", icon: Users },
  { label: "Activity", href: "/activity", icon: Activity },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ initialActor, initialRoles }: { initialActor?: ProductContext["actor"]; initialRoles?: ProductContext["actor"][] }) {
  const pathname = usePathname();
  const productContext = useResolvedProductContext();
  const actor = initialActor ?? productContext.actor;
  const isOwner = initialRoles ? initialRoles.includes("owner") : hasRole(actor, "owner");
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setIsMobileOpen((prev) => !prev);
    const handleClose = () => setIsMobileOpen(false);

    window.addEventListener("toggle-mobile-sidebar", handleToggle);
    window.addEventListener("close-mobile-sidebar", handleClose);

    return () => {
      window.removeEventListener("toggle-mobile-sidebar", handleToggle);
      window.removeEventListener("close-mobile-sidebar", handleClose);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    const closeTimer = window.setTimeout(() => setIsMobileOpen(false), 0);
    return () => window.clearTimeout(closeTimer);
  }, [pathname]);

  // Determine visible navigation items based on role hierarchy
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (isOwner) return true;
    if (item.href === "/settings" || item.href === "/contributors") return false;
    return true;
  });
  const roleAwareNavItems = visibleNavItems;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="sf-sidebar-logo flex items-center justify-between">
        <Link href="/" className="sf-wordmark" aria-label="SettleFlow home">
          <span>Settle</span>Flow
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-strong)] transition-colors"
          aria-label="Close navigation"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sf-sidebar-nav" aria-label="App navigation">
        <p className="sf-sidebar-section-label">WORKSPACE</p>
        <ul role="list">
          {roleAwareNavItems.map(({ label, href, icon: Icon, soon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/app"
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={soon ? "#" : href}
                  aria-disabled={soon}
                  className={`sf-sidebar-item${isActive ? " sf-sidebar-item--active" : ""}${soon ? " sf-sidebar-item--soon" : ""}`}
                  tabIndex={soon ? -1 : undefined}
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                  {soon && <span className="sf-soon-badge">Soon</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Mobile secondary utilities */}
      <div className="md:hidden px-4 py-3 border-t border-[var(--border-soft)] space-y-3 mt-auto">
        <div>
          <p className="sf-sidebar-section-label text-[10px] mb-2">PREFERENCES & TOOLS</p>

        {/* Circle Faucet */}
        <a
          href="https://faucet.circle.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <Droplets size={15} />
            <span>Get Testnet USDC</span>
          </span>
          <ExternalLink size={12} className="opacity-60" />
        </a>

        </div>
      </div>

      {/* Network status */}
      <div className="sf-sidebar-footer">
        <p className="sf-sidebar-network-label">Arc Testnet</p>
        <span className="sf-sidebar-network-status">
          <span className="sf-net-dot" aria-hidden="true" />
          Connected
        </span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="sf-sidebar hidden md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setIsMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] h-full flex flex-col py-6 shadow-2xl animate-in slide-in-from-left duration-200 overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
