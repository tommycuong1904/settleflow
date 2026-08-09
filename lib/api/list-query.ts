export const payoutStatuses = ["draft", "active", "partially_released", "completed"] as const;
export const contributorStatuses = ["active", "archived"] as const;

export type PayoutStatus = (typeof payoutStatuses)[number];
export type ContributorStatus = (typeof contributorStatuses)[number];

export function parseEnumQueryValue<T extends readonly string[]>(
  value: string | null,
  allowed: T,
): T[number] | undefined {
  if (!value) return undefined;
  return allowed.includes(value as T[number]) ? (value as T[number]) : undefined;
}

export function isValidEnumQueryValue<T extends readonly string[]>(
  value: string | null,
  allowed: T,
) {
  return value === null || allowed.includes(value as T[number]);
}
