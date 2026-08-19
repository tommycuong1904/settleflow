"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, Users, Activity } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Payouts", href: "/payouts", icon: ArrowRightLeft },
  { label: "Contributors", href: "/contributors", icon: Users, soon: true },
  { label: "Activity", href: "/activity", icon: Activity, soon: true },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sf-sidebar">
      {/* Logo */}
      <div className="sf-sidebar-logo">
        <Link href="/" className="sf-wordmark" aria-label="SettleFlow home">
          <span>Settle</span>Flow
        </Link>
      </div>

      {/* Navigation */}
      <nav className="sf-sidebar-nav" aria-label="App navigation">
        <p className="sf-sidebar-section-label">WORKSPACE</p>
        <ul role="list">
          {NAV_ITEMS.map(({ label, href, icon: Icon, soon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
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

      {/* Network status */}
      <div className="sf-sidebar-footer">
        <p className="sf-sidebar-network-label">Arc Testnet</p>
        <span className="sf-sidebar-network-status">
          <span className="sf-net-dot" aria-hidden="true" />
          Connected
        </span>
      </div>
    </aside>
  );
}
