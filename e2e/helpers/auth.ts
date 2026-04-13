import { Page } from "@playwright/test";

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:25343";

export interface MockUser {
  firstName: string | null;
  onboardingCompleted?: boolean;
  financialFocus?: string;
  desiredOutcome?: string;
  checklist?: Record<string, boolean>;
  daysSinceSignup?: number;
}

interface ClerkMock {
  useAuth: () => { isSignedIn: boolean; isLoaded: boolean; getToken: () => Promise<string>; userId: string; sessionId: string };
  useUser: () => { isSignedIn: boolean; isLoaded: boolean; user: { id: string; firstName: string | null; emailAddresses: { emailAddress: string }[] } };
  useClerk: () => { addListener: (cb: () => void) => () => void; client: null };
  getToken: () => Promise<string>;
  isSignedIn: boolean;
}

declare global {
  interface Window {
    __CLERK_MOCK__?: ClerkMock;
  }
}

export async function mockClerkAuth(page: Page, user: MockUser) {
  const mockToken = "mock-test-token-" + Date.now();

  await page.addInitScript((params: { user: MockUser; token: string }) => {
    const { user, token } = params;

    const patchClerk = () => {
      const mockGetToken = async () => token;
      const mockUseAuth = () => ({
        isSignedIn: true,
        isLoaded: true,
        getToken: mockGetToken,
        userId: "test-user-id",
        sessionId: "test-session-id",
      });
      const mockUseUser = () => ({
        isSignedIn: true,
        isLoaded: true,
        user: {
          id: "test-user-id",
          firstName: user.firstName,
          emailAddresses: [{ emailAddress: "test@example.com" }],
        },
      });
      const mockUseClerk = () => ({
        addListener: (_cb: () => void) => () => {},
        client: null,
      });

      window.__CLERK_MOCK__ = {
        useAuth: mockUseAuth,
        useUser: mockUseUser,
        useClerk: mockUseClerk,
        getToken: mockGetToken,
        isSignedIn: true,
      };
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", patchClerk);
    } else {
      patchClerk();
    }
  }, { user, token: mockToken });

  await interceptOnboardingApi(page, {
    onboardingCompleted: user.onboardingCompleted ?? false,
    firstName: user.firstName,
    financialFocus: user.financialFocus,
    desiredOutcome: user.desiredOutcome,
    checklist: user.checklist,
    daysSinceSignup: user.daysSinceSignup,
  });
}

export async function interceptOnboardingApi(page: Page, overrides: {
  onboardingCompleted?: boolean;
  firstName?: string | null;
  financialFocus?: string;
  desiredOutcome?: string;
  checklist?: Record<string, boolean>;
  daysSinceSignup?: number;
} = {}) {
  const defaults = {
    onboardingCompleted: false,
    firstName: "Alex",
    interests: [],
    checklist: {},
    daysSinceSignup: 0,
    financialFocus: "",
    desiredOutcome: "",
  };
  const response = { ...defaults, ...overrides };

  await page.route("**/api/onboarding", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
    } else {
      await route.continue();
    }
  });
}

export async function interceptStripeProducts(page: Page) {
  await page.route("**/api/stripe/products", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "prod_test_pro",
          name: "Pro",
          metadata: { tier: "pro" },
          price_id: "price_test_pro",
          unit_amount: 2900,
          currency: "usd",
          recurring: { interval: "month" },
        },
        {
          id: "prod_test_enterprise",
          name: "Business",
          metadata: { tier: "enterprise" },
          price_id: "price_test_enterprise",
          unit_amount: 7900,
          currency: "usd",
          recurring: { interval: "month" },
        },
      ]),
    });
  });
}

export async function interceptOnboardingComplete(page: Page) {
  await page.route("**/api/onboarding/complete-welcome", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

export async function interceptReferralCode(page: Page) {
  await page.route("**/api/viral/referral/code", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: "TESTREF123" }),
    });
  });
}

export async function interceptGamification(page: Page) {
  await page.route("**/api/gamification/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ streak: { currentStreak: 0, lastActivityDate: null } }),
    });
  });
}
