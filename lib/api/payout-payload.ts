import { Decimal } from "@prisma/client/runtime/library";

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasContiguousMilestoneSequences(milestones: Array<{ sequence: unknown }>) {
  return milestones.every((milestone, index) => milestone.sequence === index + 1);
}

export type PayoutMilestonePayload = {
  title: unknown;
  description: unknown;
  amountUsdc: unknown;
  sequence: unknown;
};

export function hasValidMilestoneShape(milestones: Array<PayoutMilestonePayload>) {
  return !milestones.some(
    (milestone) =>
      !isNonEmptyString(milestone.title) ||
      !isNonEmptyString(milestone.description) ||
      !isNonEmptyString(milestone.amountUsdc) ||
      !Number.isInteger(milestone.sequence),
  );
}

export function sumMilestoneAmounts(milestones: Array<{ amountUsdc: unknown }>) {
  return milestones.reduce(
    (sum, milestone) => sum.plus(new Decimal(String(milestone.amountUsdc))),
    new Decimal(0),
  );
}

const ALLOWED_PAYOUT_UPDATE_FIELDS = [
  "title",
  "description",
  "contributorId",
  "targetWalletAddress",
  "totalAmountUsdc",
  "milestones",
] as const;

export function hasOnlyAllowedPayoutUpdateFields(body: Record<string, unknown>) {
  return Object.keys(body).every((key) => ALLOWED_PAYOUT_UPDATE_FIELDS.includes(key as (typeof ALLOWED_PAYOUT_UPDATE_FIELDS)[number]));
}

export function derivePatchedTotalAmountUsdc(
  milestones: Array<{ amountUsdc: unknown }> | undefined,
) {
  if (!Array.isArray(milestones)) return undefined;
  return sumMilestoneAmounts(milestones).toString();
}
