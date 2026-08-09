"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import type { ProductActor } from "@/lib/runtime/product-context";

const actorOptions: Array<{ value: ProductActor; label: string; hint: string }> = [
  { value: "owner", label: "Owner", hint: "Create, activate, release" },
  { value: "reviewer", label: "Reviewer", hint: "Approve or reject work" },
  { value: "contributor", label: "Contributor", hint: "Submit milestones" },
];

export function ActorSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const productContext = useResolvedProductContext();

  const selected = useMemo(
    () => actorOptions.find((option) => option.value === productContext.actor) ?? actorOptions[0],
    [productContext.actor],
  );

  function handleValueChange(nextActor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("actor", nextActor);
    params.set("workspaceId", productContext.workspaceId);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex min-w-[220px] flex-col gap-1">
      <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
        Active role
      </span>
      <Select value={productContext.actor} onValueChange={handleValueChange}>
        <SelectTrigger className="h-10 min-w-[220px] bg-[rgba(8,15,31,0.68)] text-left text-sm">
          <SelectValue placeholder="Select actor" />
        </SelectTrigger>
        <SelectContent>
          {actorOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label} · {option.hint}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-[var(--text-muted)]">
        Current actor: <span className="text-white">{selected.label}</span>
      </span>
    </div>
  );
}
