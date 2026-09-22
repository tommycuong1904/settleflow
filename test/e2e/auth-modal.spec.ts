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

test("protected-page sign-in boundary opens the same Web3-first modal", async ({ page }) => {
  await page.goto("/auth-required");

  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await page.locator("section").filter({ hasText: "Sign in to continue" }).getByRole("button", { name: "Sign in / Connect" }).click();

  await expect(page.getByRole("heading", { name: "Sign in to SettleFlow" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Web2 sign-in is coming soon" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /connect web3 wallet/i })).toBeVisible();
});

test("unauthenticated payout route renders the sign-in boundary", async ({ page }) => {
  await page.goto("/payouts");

  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await expect(page.getByText("Authentication required")).toBeVisible();
});

test("unauthenticated payout mutation is rejected before it can create data", async ({ request }) => {
  const response = await request.post("/api/v1/payouts", { data: {} });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({ error: "AUTH_REQUIRED" });
});
