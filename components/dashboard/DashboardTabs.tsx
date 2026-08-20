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
  const visibleTabs = tabs.filter(() => true); // placeholder, can customize per role


  return (
    <div className="space-y-4 w-full">
      {/* Tab headers */}
          <div className="relative flex border-b border-gray-700" style={{ position: 'relative' }}>
      {visibleTabs.map((tab, idx) => (
        <button
          key={tab.key}
          onClick={() => setActive(tab.key)}
          className={`flex-1 px-4 py-3.5 -mb-px text-sm font-medium transition-colors cursor-pointer ${
            active === tab.key
                ? "border-b-2 border-cyan-500 text-white"
                : "text-gray-400 hover:text-white"
          }`}
          style={active === tab.key ? { background: "rgba(15,23,42,0.54)" } : undefined}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1 rounded-full bg-cyan-600 px-2 py-0.5 text-xs text-white">
              {tab.count}
            </span>
          )}
        </button>
      ))}
      {/* Animated underline */}
          <span
            className="absolute bottom-0 left-0 h-0.5 bg-cyan-500 transition-transform duration-300 ease-out"
            style={{
              width: `${100 / visibleTabs.length}%`,
              transform: `translateX(${visibleTabs.findIndex((t) => t.key === active) * 100}%)`,
            }}
          />
    </div>



      {/* Tab content */}
      <div className="pt-4 w-full">
        {tabs.map(
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
