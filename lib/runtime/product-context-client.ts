"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";

function readNonEmpty(value: string | null) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function useResolvedProductContext() {
  const searchParams = useSearchParams();

  return useMemo(() => ({
    workspaceId: readNonEmpty(searchParams.get("workspaceId")) ?? DEFAULT_PRODUCT_CONTEXT.workspaceId,
    ownerUserId: readNonEmpty(searchParams.get("ownerUserId")) ?? DEFAULT_PRODUCT_CONTEXT.ownerUserId,
    reviewerUserId: readNonEmpty(searchParams.get("reviewerUserId")) ?? DEFAULT_PRODUCT_CONTEXT.reviewerUserId,
    contributorUserId: readNonEmpty(searchParams.get("contributorUserId")) ?? DEFAULT_PRODUCT_CONTEXT.contributorUserId,
  }), [searchParams]);
}
