import { expect, test } from "@playwright/test";

test("visitor can open the Web2-first sign-in modal", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /pay for approved work/i })).toBeVisible();
  await page.getByRole("button", { name: "Sign in" }).first().click();

  await expect(page.getByRole("heading", { name: "Sign in to SettleFlow" })).toBeVisible();
  await expect(page.getByText("Continue with Google")).toBeVisible();
  await page.getByText("Use a browser wallet instead").click();
  await expect(page.getByText(/No browser wallet was found/i)).toBeVisible();
});

test("protected-page sign-in boundary opens the same Web2-first modal", async ({ page }) => {
  await page.goto("/auth-required");

  await expect(page.getByRole("heading", { name: "Sign in to continue" })).toBeVisible();
  await page.locator("section").filter({ hasText: "Sign in to continue" }).getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "Sign in to SettleFlow" })).toBeVisible();
  await expect(page.getByText("Continue with Google")).toBeVisible();
  await page.getByText("Use a browser wallet instead").click();
  await expect(page.getByText(/No browser wallet was found/i)).toBeVisible();
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
