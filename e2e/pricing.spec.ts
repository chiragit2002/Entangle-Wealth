import { test, expect } from "@playwright/test";
import { BASE_URL, interceptStripeProducts, interceptReferralCode } from "./helpers/auth";

const FIXTURE_BASE = BASE_URL + "/__test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await interceptStripeProducts(page);
    await interceptReferralCode(page);
  });

  test("Pricing page loads with all three plan tier cards", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByRole("heading", { name: /pricing/i }).first()).toBeVisible({ timeout: 10000 });

    await expect(page.locator(".pricing-card").nth(0).getByText("Starter")).toBeVisible();
    await expect(page.locator(".pricing-card").nth(1).getByText("Pro")).toBeVisible();
    await expect(page.locator(".pricing-card").nth(2).getByText("Business")).toBeVisible();
  });

  test("Pricing page shows correct prices for all tiers", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText("$0")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("$29")).toBeVisible();
    await expect(page.getByText("$79")).toBeVisible();
  });

  test("Free plan shows correct features", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText("3 signals per day")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Community access")).toBeVisible();
  });

  test("Pro plan shows correct features", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText("Unlimited signals + full indicators")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("TaxGPT unlimited")).toBeVisible();
  });

  test("Pro plan CTA button is visible and labeled correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const proCta = page.getByRole("button", { name: /start free 30.day trial/i }).first();
    await expect(proCta).toBeVisible({ timeout: 10000 });
    await expect(proCta).toBeEnabled();
  });

  test("Trial badge is visible on pricing page", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText(/free trial|no credit card/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("Referral program section is visible", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText(/referral program/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /get your referral link/i })).toBeVisible();
  });

  test("Clicking Pro plan CTA when not signed in redirects to sign-in (bug fix: was showing fleeting toast)", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const proCta = page.getByRole("button", { name: /start free 30.day trial/i }).first();
    await expect(proCta).toBeVisible({ timeout: 10000 });

    const [navigation] = await Promise.all([
      page.waitForNavigation({ timeout: 5000 }).catch(() => null),
      proCta.click(),
    ]);

    const finalUrl = page.url();
    expect(finalUrl).toContain("/sign-in");
  });
});

test.describe("UpgradePrompt component (real component via fixture)", () => {
  test("Upgrade prompt renders with signals limit headline and Pro unlocks section", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(FIXTURE_BASE + "?view=upgrade");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[role="dialog"][aria-label="Upgrade to Pro"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Daily signal limit reached")).toBeVisible();
    await expect(page.getByText(/free users get 3 signals/i)).toBeVisible();
    await expect(page.getByText("Pro unlocks")).toBeVisible();
    await expect(page.getByText("Unlimited real-time signals", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /start 30-day free trial/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /start 30-day free trial/i })).toBeEnabled();
    await expect(page.getByText(/30-day free trial · no credit card/i)).toBeVisible();
  });

  test("Upgrade prompt can be dismissed via Maybe later", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(FIXTURE_BASE + "?view=upgrade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    const maybeLater = page.getByRole("button", { name: /maybe later/i });
    await maybeLater.click();

    await expect(page.getByTestId("upgrade-dismissed")).toBeVisible({ timeout: 3000 });
  });

  test("Upgrade prompt can be dismissed via close button", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(FIXTURE_BASE + "?view=upgrade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    const closeBtn = page.getByRole("button", { name: /close/i });
    await closeBtn.click();

    await expect(page.getByTestId("upgrade-dismissed")).toBeVisible({ timeout: 3000 });
  });

  test("Upgrade prompt unauthenticated CTA navigates to sign-in", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(FIXTURE_BASE + "?view=upgrade");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 10000 });

    const cta = page.getByRole("button", { name: /start 30-day free trial/i });
    await cta.click();

    await expect(page).toHaveURL(/sign-in/, { timeout: 5000 });
  });
});

test.describe("FinishSetupNudge component (real UI via fixture)", () => {
  test("Setup nudge renders with incomplete items and dismiss button", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=setup-nudge");
    await page.waitForLoadState("domcontentloaded");

    const nudge = page.getByTestId("finish-setup-nudge");
    await expect(nudge).toBeVisible({ timeout: 10000 });

    await expect(page.getByText(/setup steps unfinished/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /run a tax scan/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /set a price alert/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /join a community group/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /dismiss setup nudge/i })).toBeVisible();
  });

  test("Setup nudge can be dismissed", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=setup-nudge");
    await page.waitForLoadState("domcontentloaded");

    await expect(page.getByTestId("finish-setup-nudge")).toBeVisible({ timeout: 10000 });

    const dismissBtn = page.getByRole("button", { name: /dismiss setup nudge/i });
    await dismissBtn.click();

    await expect(page.getByTestId("nudge-dismissed")).toBeVisible({ timeout: 3000 });
  });
});
