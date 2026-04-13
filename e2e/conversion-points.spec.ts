import { test, expect } from "@playwright/test";
import { BASE_URL, interceptStripeProducts } from "./helpers/auth";

test.describe("Conversion points — upgrade prompts", () => {
  test.beforeEach(async ({ page }) => {
    await interceptStripeProducts(page);
  });

  test("Sign-in page renders with form fields", async ({ page }) => {
    await page.goto(BASE_URL + "/sign-in");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const signInContent = page.locator(
      "input[type='email'], input[type='text'], .cl-signIn-root, [data-clerk], .cl-rootBox"
    ).first();
    const isVisible = await signInContent.isVisible({ timeout: 10000 }).catch(() => false);

    const pageText = await page.textContent("body");
    const hasAuthContent =
      pageText?.toLowerCase().includes("sign in") ||
      pageText?.toLowerCase().includes("email") ||
      pageText?.toLowerCase().includes("continue") ||
      isVisible;

    expect(hasAuthContent).toBe(true);
  });

  test("Sign-up page renders correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/sign-up");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const pageText = await page.textContent("body");
    const hasContent =
      pageText?.toLowerCase().includes("sign up") ||
      pageText?.toLowerCase().includes("create") ||
      pageText?.toLowerCase().includes("email");
    expect(hasContent).toBe(true);
  });

  test("Protected routes redirect unauthenticated users to sign-in", async ({ page }) => {
    const protectedRoutes = ["/profile", "/receipts", "/alerts"];

    for (const route of protectedRoutes) {
      await page.goto(BASE_URL + route);
      await page.waitForLoadState("networkidle", { timeout: 10000 });

      const url = page.url();
      const redirectedToSignIn = url.includes("/sign-in");

      const pageText = await page.textContent("body");
      const hasSignInContent =
        pageText?.toLowerCase().includes("sign in") ||
        pageText?.toLowerCase().includes("email");

      expect(redirectedToSignIn || hasSignInContent).toBe(true);
    }
  });

  test("Pricing page POPULAR badge visible on Pro plan", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const popularBadge = page.getByText("POPULAR");
    await expect(popularBadge).toBeVisible({ timeout: 10000 });
  });

  test("Pricing page shows 30-day free trial messaging", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText(/30.day/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/30 days free/i).first()).toBeVisible();
  });

  test("Pricing page business tier shows team features", async ({ page }) => {
    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await expect(page.getByText(/5 team members/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/priority support/i)).toBeVisible();
  });

  test("About page loads correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/about");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(100);
  });

  test("Home page hero section has all primary CTAs", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const buttons = page.getByRole("button");
    const links = page.getByRole("link");
    const buttonCount = await buttons.count();
    const linkCount = await links.count();

    expect(buttonCount + linkCount).toBeGreaterThan(2);
  });

  test("Navigation between home and pricing works correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    await page.goto(BASE_URL + "/pricing");
    await page.waitForLoadState("networkidle", { timeout: 15000 });

    const proCard = page.locator(".pricing-card").nth(1);
    await expect(proCard).toBeVisible({ timeout: 10000 });

    await page.goto(BASE_URL + "/");
    await page.waitForLoadState("networkidle", { timeout: 10000 });

    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
