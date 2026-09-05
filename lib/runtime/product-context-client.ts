"use client";

import { useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";
import {
  getActiveUserId,
  PRODUCT_CONTEXT_COOKIE_NAMES,
  readNonEmpty,
  resolveActor,
} from "@/lib/runtime/product-context";

export function setProductContextCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
}

export function useResolvedProductContext() {
  const searchParams = useSearchParams();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const cookieActor = mounted
    ? resolveActor(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.actor))
    : undefined;
  const cookieOwnerUserId = mounted
    ? readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.ownerUserId))
    : undefined;
  const cookieReviewerUserId = mounted
    ? readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.reviewerUserId))
    : undefined;
  const cookieContributorUserId = mounted
    ? readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.contributorUserId))
    : undefined;
  const cookieWorkspaceId = mounted
    ? readNonEmpty(readCookie(PRODUCT_CONTEXT_COOKIE_NAMES.workspaceId))
    : undefined;

  const actor =
    resolveActor(searchParams.get("actor")) ??
    cookieActor ??
    DEFAULT_PRODUCT_CONTEXT.actor;
  const ownerUserId =
    readNonEmpty(searchParams.get("ownerUserId")) ??
    cookieOwnerUserId ??
    DEFAULT_PRODUCT_CONTEXT.ownerUserId;
  const reviewerUserId =
    readNonEmpty(searchParams.get("reviewerUserId")) ??
    cookieReviewerUserId ??
    DEFAULT_PRODUCT_CONTEXT.reviewerUserId;
  const contributorUserId =
    readNonEmpty(searchParams.get("contributorUserId")) ??
    cookieContributorUserId ??
    DEFAULT_PRODUCT_CONTEXT.contributorUserId;
  const workspaceId =
    readNonEmpty(searchParams.get("workspaceId")) ??
    cookieWorkspaceId ??
    DEFAULT_PRODUCT_CONTEXT.workspaceId;

  return {
    workspaceId,
    ownerUserId,
    reviewerUserId,
    contributorUserId,
    actor,
    activeUserId: getActiveUserId({
      actor,
      ownerUserId,
      reviewerUserId,
      contributorUserId,
    }),
  };
}

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
