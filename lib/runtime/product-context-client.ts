"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import { getActiveUserId, readNonEmpty, resolveActor } from "@/lib/runtime/product-context";

export function useResolvedProductContext() {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const actor = resolveActor(searchParams.get("actor")) ?? DEFAULT_PRODUCT_CONTEXT.actor;
    const ownerUserId = readNonEmpty(searchParams.get("ownerUserId")) ?? DEFAULT_PRODUCT_CONTEXT.ownerUserId;
    const reviewerUserId = readNonEmpty(searchParams.get("reviewerUserId")) ?? DEFAULT_PRODUCT_CONTEXT.reviewerUserId;
    const contributorUserId = readNonEmpty(searchParams.get("contributorUserId")) ?? DEFAULT_PRODUCT_CONTEXT.contributorUserId;
    const workspaceId = readNonEmpty(searchParams.get("workspaceId")) ?? DEFAULT_PRODUCT_CONTEXT.workspaceId;

    return {
      workspaceId,
      ownerUserId,
      reviewerUserId,
      contributorUserId,
      actor,
      activeUserId: getActiveUserId({ actor, ownerUserId, reviewerUserId, contributorUserId }),
    };
  }, [searchParams]);
}
