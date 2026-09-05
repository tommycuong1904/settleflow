"use client";
import { useMemo, useState, ReactNode } from "react";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";

type TabItem = {
  key: string;
  label: string;
  count?: number; // optional badge
  content: ReactNode;
};

export default function DashboardTabs({ tabs }: { tabs: TabItem[] }) {
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;
  const visibleTabs = useMemo(
    () =>
      tabs.filter((tab) => {
        if (hasRole(actor, "owner")) return true;
        if (hasRole(actor, "reviewer")) return tab.key === "pending";
        if (hasRole(actor, "contributor")) return tab.key === "active";
        return false;
      }),
    [tabs, actor]
  );
  const [selectedTab, setSelectedTab] = useState(visibleTabs[0]?.key ?? "");
  const active = visibleTabs.some((tab) => tab.key === selectedTab)
    ? selectedTab
    : visibleTabs[0]?.key ?? "";


  return (
    <div className="space-y-4 w-full">
      {/* Tab headers */}
      <div
        className={`relative flex ${
          visibleTabs.length === 1 ? "justify-center" : ""
        } ${
          visibleTabs.length > 1 ? "border-b" : ""
        } border-[var(--border-soft)]`}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key)}
            className={`flex-1 px-4 py-3.5 ${
              visibleTabs.length > 1 ? "-mb-px" : ""
            } text-sm font-medium transition-colors cursor-pointer ${
              active === tab.key
                ? visibleTabs.length > 1
                  ? "border-b-2 border-[var(--foreground)] text-[var(--foreground)]"
                  : "text-[var(--foreground)]"
                : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
            style={
              active === tab.key
                ? { background: "var(--surface-muted)" }
                : undefined
            }
          >
            {tab.label}{" "}
            {tab.count !== undefined && (
              <span className="ml-1 rounded-full bg-[var(--surface-strong)] px-2 py-0.5 text-xs text-[var(--foreground)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
        {visibleTabs.length > 1 && (
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-[var(--foreground)] transition-transform duration-300 ease-out"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${
                Math.max(0, visibleTabs.findIndex((tab) => tab.key === active)) *
                100
              }%)`,
            }}
          />
        )}
      </div>

      {/* Tab content */}
      <div className="pt-4 w-full">
        {visibleTabs.map(
          (tab) =>
            active === tab.key && (
              <div key={tab.key} className="tab-panel">
                {tab.content}
              </div>
            )
        )}
      </div>
    </div>
  );
}
