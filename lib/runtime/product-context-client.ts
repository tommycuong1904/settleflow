"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";

import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import {
  getActiveUserId,
  PRODUCT_CONTEXT_COOKIE_NAMES,
  readNonEmpty,
  resolveActor,
} from "@/lib/runtime/product-context";

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!entry) return undefined;
  return decodeURIComponent(entry.slice(prefix.length));
}

export function useResolvedProductContext() {
  const pathname = usePathname();

  return useMemo(() => {
    const searchParams = typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);

    const actor =
      resolveActor(searchParams.get("actor")) ??
      resolveActor(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.actor)) ??
      DEFAULT_PRODUCT_CONTEXT.actor;
    const ownerUserId =
      readNonEmpty(searchParams.get("ownerUserId")) ??
      readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.ownerUserId)) ??
      DEFAULT_PRODUCT_CONTEXT.ownerUserId;
    const reviewerUserId =
      readNonEmpty(searchParams.get("reviewerUserId")) ??
      readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.reviewerUserId)) ??
      DEFAULT_PRODUCT_CONTEXT.reviewerUserId;
    const contributorUserId =
      readNonEmpty(searchParams.get("contributorUserId")) ??
      readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.contributorUserId)) ??
      DEFAULT_PRODUCT_CONTEXT.contributorUserId;
    const workspaceId =
      readNonEmpty(searchParams.get("workspaceId")) ??
      readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId)) ??
      DEFAULT_PRODUCT_CONTEXT.workspaceId;

    return {
      workspaceId,
      ownerUserId,
      reviewerUserId,
      contributorUserId,
      actor,
      activeUserId: getActiveUserId({ actor, ownerUserId, reviewerUserId, contributorUserId }),
    };
  }, [pathname]);
}
