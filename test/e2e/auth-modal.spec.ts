import { expect, test } from "@playwright/test";

test("visitor can open the Web3-first sign-in modal", async ({ page }) => {
  await page.goto("/landing");

  await expect(page.getByRole("heading", { name: /milestone-based usdc payouts/i })).toBeVisible();
  await page.getByRole("button", { name: "Sign in / Connect wallet" }).first().click();

  await expect(page.getByRole("heading", { name: "Sign in to SettleFlow" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Web2 sign-in is coming soon" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /connect web3 wallet/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^MetaMask/ })).toBeVisible();
});
