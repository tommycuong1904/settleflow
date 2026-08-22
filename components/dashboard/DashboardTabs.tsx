"use client";
import { useState, ReactNode } from "react";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { hasRole } from "@/lib/runtime/role-utils";

type TabItem = {
  key: string;
  label: string;
  count?: number; // optional badge
  content: ReactNode;
};

export default function DashboardTabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  const productContext = useResolvedProductContext();
  const actor = productContext.actor;
  // Owner sees all tabs; others see only subset (for now keep all)
  const visibleTabs = tabs.filter((tab) => {
  if (hasRole(actor, "owner")) return true;
  if (hasRole(actor, "reviewer")) return tab.key === "pending";
  if (hasRole(actor, "contributor")) return tab.key === "active";
  return false;
});


  return (
    <div className="space-y-4 w-full">
      {/* Tab headers */}
          <div className="relative flex border-b border-[var(--border-soft)]" style={{ position: 'relative' }}>
      {visibleTabs.map((tab, idx) => (
        <button
          key={tab.key}
          onClick={() => setActive(tab.key)}
          className={`flex-1 px-4 py-3.5 -mb-px text-sm font-medium transition-colors cursor-pointer ${
            active === tab.key
                ? "border-b-2 border-white text-white"
                : "text-slate-400 hover:text-white"
          }`}
          style={active === tab.key ? { background: "rgba(255,255,255,0.03)" } : undefined}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 rounded-full bg-white/15 px-2 py-0.5 text-xs text-white">
              {tab.count}
            </span>
          )}
        </button>
      ))}
      {/* Animated underline */}
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-white transition-transform duration-300 ease-out"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${visibleTabs.findIndex((t) => t.key === active) * 100}%)`,
            }}
          />
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
