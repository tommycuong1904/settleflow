"use client";

import { useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResolvedProductContext } from "@/lib/runtime/product-context-client";
import { PRODUCT_CONTEXT_COOKIE_NAMES, type ProductActor } from "@/lib/runtime/product-context";

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
  const [isPending, startTransition] = useTransition();

  const selectedActor = useMemo(
    () => {
      const actorFromQuery = searchParams.get("actor");
      if (actorFromQuery === "owner" || actorFromQuery === "reviewer" || actorFromQuery === "contributor") {
        return actorFromQuery;
      }
      return productContext.actor;
    },
    [productContext.actor, searchParams],
  );

  function handleValueChange(nextActor: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("actor", nextActor);
    params.delete("workspaceId");
    params.delete("ownerUserId");
    params.delete("reviewerUserId");
    params.delete("contributorUserId");
    document.cookie = `${PRODUCT_CONTEXT_COOKIE_NAMES.actor}=${encodeURIComponent(nextActor)}; path=/; max-age=31536000; samesite=lax`;
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
    startTransition(() => {
      router.replace(nextUrl, { scroll: false });
      router.refresh();
    });
  }

  return (
    <div className="flex min-w-0 items-center gap-2 rounded-full border border-[rgba(148,163,184,0.18)] bg-[rgba(8,15,31,0.58)] px-2 py-1.5">
      <span className="shrink-0 rounded-full border border-[rgba(34,211,238,0.24)] bg-[rgba(34,211,238,0.12)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--accent-cyan)]">
        Role
      </span>
      <Select value={selectedActor} onValueChange={handleValueChange}>
        <SelectTrigger
          className="h-8 min-w-[132px] border-0 bg-transparent px-2 text-left text-sm text-white shadow-none focus:ring-0"
          aria-busy={isPending}
        >
          <SelectValue placeholder="Select actor" />
        </SelectTrigger>
        <SelectContent>
          {actorOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
