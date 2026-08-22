/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/immutability */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { PRODUCT_CONTEXT_COOKIE_NAMES, type ProductActor } from "@/lib/runtime/product-context";
import { Crown, CheckCircle2, Search, Code2, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/lib/context/toast-context";

type RoleOption = {
  actor: ProductActor;
  label: string;
  badge: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: string;
  colorClass: string;
  bgClass: string;
};

const ROLES: RoleOption[] = [
  {
    actor: "owner",
    label: "Owner / Payout Lead",
    badge: "Owner",
    icon: Crown,
    description: "Full control. Create payouts, activate draft agreements, execute Arc USDC releases.",
    colorClass: "text-[var(--foreground)] border-[var(--border-strong)]",
    bgClass: "bg-[var(--surface)]",
  },
  {
    actor: "reviewer",
    label: "Reviewer / QA Lead",
    badge: "Reviewer",
    icon: Search,
    description: "Inspect deliverable submissions, approve or request revisions on milestones.",
    colorClass: "text-[var(--foreground)] border-[var(--border-strong)]",
    bgClass: "bg-[var(--surface)]",
  },
  {
    actor: "contributor",
    label: "Contributor / Builder",
    badge: "Contributor",
    icon: Code2,
    description: "Submit milestone deliverables for review, track upcoming USDC payouts.",
    colorClass: "text-[var(--foreground)] border-[var(--border-strong)]",
    bgClass: "bg-[var(--surface)]",
  },
];

export function RoleSwitcher() {
  const router = useRouter();
  const productContext = useResolvedProductContext();
  const currentActor = productContext.actor;
  const { toast } = useToast();

  const [activeActor, setActiveActor] = useState(currentActor);

  // Keep activeActor in sync if the product context changes elsewhere (e.g., page refresh)
  useEffect(() => {
    setActiveActor(currentActor);
  }, [currentActor]);
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeRole = ROLES.find((r) => r.actor === activeActor) || ROLES[0];
  const ActiveIcon = activeRole.icon;

  const handleSelectRole = (nextActor: ProductActor) => {
    // Set cookie for 1 year
    document.cookie = `${PRODUCT_CONTEXT_COOKIE_NAMES.actor}=${nextActor}; path=/; max-age=31536000; SameSite=Lax`;
    setIsOpen(false);
    setActiveActor(nextActor);
    // Update URL query to reflect actor change
    router.push(`?actor=${nextActor}`);
    const nextRole = ROLES.find((r) => r.actor === nextActor);
    toast({
      variant: "info",
      title: "Role Switched",
      description: `Viewing application as ${nextRole?.badge}`,
      durationMs: 2500,
    });
    router.refresh();
  };

  if (!mounted) {
    return null;
  }
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium transition-all shadow-sm bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]`}
        title="Switch active role context"
        aria-label="Switch active role"
      >
        <ActiveIcon size={13} className="text-[var(--text-muted)]" />
        <span>Role: <strong className="font-semibold">{activeRole.badge}</strong></span>
        <ChevronDown size={12} className="text-[var(--text-muted)] ml-0.5" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-2xl text-xs space-y-2 animate-in fade-in zoom-in-95 backdrop-blur-xl">
            <div className="border-b border-[var(--border-soft)] pb-2 px-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Active Simulation Role
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">
                Toggle roles to test different permissions and actions across the workflow.
              </p>
            </div>

            <div className="space-y-1.5">
              {ROLES.map((role) => {
                const isSelected = role.actor === activeActor;
                const Icon = role.icon;

                return (
                  <button
                    key={role.actor}
                    onClick={() => handleSelectRole(role.actor)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? "bg-[var(--background)] border border-[var(--border-strong)]"
                        : "hover:bg-[var(--background)] border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg border ${role.bgClass} ${role.colorClass} shrink-0`}
                      >
                        <Icon size={12} />
                      </div>
                      <div>
                        <p className="font-semibold text-[var(--foreground)] text-xs">
                          {role.label}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] leading-snug mt-0.5">
                          {role.description}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} className="text-[var(--foreground)] shrink-0 mt-1" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
