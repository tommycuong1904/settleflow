"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ArrowRightLeft, Users, Activity, Settings } from "lucide-react";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";

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
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;

  // Determine visible navigation items based on role hierarchy
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Owner sees everything
    if (hasRole(actor, "owner")) return true;
    // Reviewer and Contributor cannot see Settings or Contributors list
    if (item.href === "/settings" || item.href === "/contributors") return false;
    return true;
  });

  return (
    <aside className="sf-sidebar !h-full">
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
          {visibleNavItems.map(({ label, href, icon: Icon, soon }) => {
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
