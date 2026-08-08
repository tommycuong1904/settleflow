import { DEFAULT_PRODUCT_CONTEXT } from "@/lib/runtime/default-product-context";

function readNonEmpty(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

export function resolveWorkspaceId(value: string | null | undefined) {
  return readNonEmpty(value) ?? DEFAULT_PRODUCT_CONTEXT.workspaceId;
}
