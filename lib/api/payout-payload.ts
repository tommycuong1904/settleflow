import { Decimal } from "@prisma/client/runtime/library";
import { isAddress } from "viem";

const USDC_AMOUNT_SYNTAX = /^\d+(?:\.\d{1,6})?$/;

export function isValidUsdcAmount(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!USDC_AMOUNT_SYNTAX.test(trimmed)) return false;
  try {
    const amount = new Decimal(trimmed);
    const integerDigits = trimmed.split(".", 1)[0].replace(/^0+/, "").length || 1;
    return amount.isFinite() && amount.gt(0) && amount.decimalPlaces() <= 6 && integerDigits <= 24;
  } catch {
    return false;
  }
}

export function isValidEvmAddress(value: unknown): value is string {
  return typeof value === "string" && isAddress(value.trim());
}


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
      !isValidUsdcAmount(milestone.amountUsdc) ||
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
