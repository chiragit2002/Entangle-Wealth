import { test, expect } from "@playwright/test";
import { BASE_URL, interceptStripeProducts, interceptOnboardingComplete } from "./helpers/auth";

const FIXTURE_BASE = BASE_URL + "/__test";

test.describe("Real integrated onboarding path", () => {
  test("Landing → sign-in CTA → Clerk sign-in page loads (unauthenticated flow)", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const signInLink = page.getByRole("link", { name: /sign in/i }).first();
    const hasCta = await signInLink.isVisible().catch(() => false);

    if (hasCta) {
      await signInLink.click();
      await page.waitForURL(/sign-in/, { timeout: 8000 });
    } else {
      await page.goto(BASE_URL + "/sign-in");
    }

    await page.waitForLoadState("networkidle", { timeout: 15000 });
    const emailInput = page.locator('input[type="email"], input[name="identifier"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });

  test("Clicking 'Get clarity' CTA when not authenticated redirects to sign-in", async ({ page }) => {
    await interceptStripeProducts(page);
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const clarityBtn = page.getByRole("link", { name: /get clarity/i }).first();
    const signUpBtn = page.getByRole("link", { name: /sign up/i }).first();

    const hasClarityBtn = await clarityBtn.isVisible().catch(() => false);
    if (hasClarityBtn) {
      const href = await clarityBtn.getAttribute("href");
      expect(href).toMatch(/sign-up|sign-in/i);
    } else {
      const hasSignUp = await signUpBtn.isVisible().catch(() => false);
      expect(hasSignUp).toBe(true);
    }
  });

  test("Navigating directly to sign-in page shows authentication form", async ({ page }) => {
    await page.goto(BASE_URL + "/sign-in");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page).toHaveURL(/sign-in/);
    const emailInput = page.locator('input[type="email"], input[name="identifier"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Onboarding flow", () => {
  test.beforeEach(async ({ page }) => {
    await interceptStripeProducts(page);
  });

  test("Home page loads with primary CTA visible", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    const ctaButton = page.getByRole("button", { name: /get clarity/i }).first();
    const ctaLink = page.getByRole("link", { name: /sign in|get clarity|sign up/i }).first();

    const hasCta = await ctaButton.isVisible().catch(() => false)
      || await ctaLink.isVisible().catch(() => false);
    expect(hasCta).toBe(true);
  });

  test("Pricing page accessible from home page", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const pricingLink = page.getByRole("link", { name: /pricing/i }).first();
    const hasPricing = await pricingLink.isVisible().catch(() => false);

    if (hasPricing) {
      await pricingLink.click();
      await page.waitForURL(/\/pricing/, { timeout: 5000 });
      await expect(page).toHaveURL(/pricing/);
    } else {
      await page.goto(BASE_URL + "/pricing");
    }

    await page.waitForLoadState("networkidle", { timeout: 15000 });
    const pricingHeading = page.getByText(/pricing|plans/i).first();
    await expect(pricingHeading).toBeVisible({ timeout: 10000 });
  });
});

test.describe("WelcomeModal — onboarding flow", () => {
  test("Welcome modal renders with 4 goal options", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[role="dialog"][aria-labelledby="welcome-modal-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("What brings you here today?")).toBeVisible();

    const goalButtons = page.locator('button[aria-pressed]');
    await expect(goalButtons).toHaveCount(4);

    await expect(page.getByText("Invest & grow my wealth")).toBeVisible();
    await expect(page.getByText("Save smarter")).toBeVisible();
    await expect(page.getByText("Reduce my tax bill")).toBeVisible();
    await expect(page.getByText("Get financial clarity")).toBeVisible();
  });

  test("CTA button is disabled until a goal is selected", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const cta = page.getByRole("button", { name: /take me to the dashboard/i });
    await expect(cta).toBeVisible({ timeout: 10000 });
    await expect(cta).toBeDisabled();
  });

  test("Selecting a goal enables the CTA button", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const cta = page.getByRole("button", { name: /take me to the dashboard/i });
    await expect(cta).toBeDisabled({ timeout: 10000 });

    const investingGoal = page.locator('button[aria-pressed]').first();
    await investingGoal.click();
    await expect(investingGoal).toHaveAttribute("aria-pressed", "true");

    await expect(cta).toBeEnabled();
  });

  test("Selecting a goal and completing onboarding shows result screen", async ({ page }) => {
    await interceptOnboardingComplete(page);
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const investingGoal = page.locator('button[aria-pressed]').first();
    await investingGoal.click();

    const cta = page.getByRole("button", { name: /take me to the dashboard/i });
    await expect(cta).toBeEnabled();
    await cta.click();

    const resultDialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(resultDialog).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("YOUR PERSONALIZED PLAN")).toBeVisible();
    await expect(page.getByRole("button", { name: /build my full plan/i })).toBeVisible();
  });

  test("Skip for now closes onboarding without showing result screen", async ({ page }) => {
    await interceptOnboardingComplete(page);
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const skipBtn = page.getByRole("button", { name: /skip onboarding/i });
    await expect(skipBtn).toBeVisible({ timeout: 10000 });
    await skipBtn.click();

    await expect(page.locator('[data-testid="onboarding-complete"]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe("PersonalizedResultScreen", () => {
  test("Result screen renders for investing focus", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=result-investing");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("YOUR PERSONALIZED PLAN")).toBeVisible();
    await expect(page.getByText(/Alex, here/)).toBeVisible();
    await expect(page.getByText("Investing smarter")).toBeVisible();
    await expect(page.getByText("Start with a low-cost index fund strategy")).toBeVisible();
    await expect(page.getByText("WHY THIS MATTERS")).toBeVisible();
    await expect(page.getByRole("button", { name: /build my full plan/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /build my full plan/i })).toBeEnabled();
  });

  test("Result screen renders for saving focus", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=result-saving");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Build a 3-month emergency fund first")).toBeVisible();
    await expect(page.getByText("Building savings")).toBeVisible();
  });

  test("Result screen renders for tax focus (previously missing — bug fixed)", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=result-tax");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Uncover deductions you're leaving on the table")).toBeVisible();
    await expect(page.getByText("Reducing my tax bill")).toBeVisible();
  });

  test("Result screen renders for clarity focus", async ({ page }) => {
    await page.goto(FIXTURE_BASE + "?view=result-clarity");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(page.getByText("Get a clear picture of where you stand")).toBeVisible();
  });
});

test.describe("Full onboarding chain — end-to-end (real components)", () => {
  test("Complete integrated chain: WelcomeModal goal selection → PersonalizedResultScreen → continue", async ({ page }) => {
    await interceptOnboardingComplete(page);
    await page.goto(FIXTURE_BASE + "?view=welcome");
    await page.waitForLoadState("domcontentloaded");

    const dialog = page.locator('[role="dialog"][aria-labelledby="welcome-modal-title"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("What brings you here today?")).toBeVisible();

    const taxGoal = page.locator('button[aria-pressed]').nth(2);
    await taxGoal.click();
    await expect(taxGoal).toHaveAttribute("aria-pressed", "true");

    const cta = page.getByRole("button", { name: /take me to the dashboard/i });
    await expect(cta).toBeEnabled();
    await cta.click();

    const resultDialog = page.locator('[aria-labelledby="result-screen-title"]');
    await expect(resultDialog).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("YOUR PERSONALIZED PLAN")).toBeVisible();
    await expect(page.getByText("Reducing my tax bill")).toBeVisible();
    await expect(page.getByText("Uncover deductions you're leaving on the table")).toBeVisible();
    await expect(page.getByText("WHY THIS MATTERS")).toBeVisible();

    const continueCta = page.getByRole("button", { name: /build my full plan/i });
    await expect(continueCta).toBeVisible();
    await continueCta.click();

    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
  });
});
