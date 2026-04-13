import { defineConfig, devices } from "@playwright/test";
import { execSync } from "child_process";

function resolveChromiumPath(): string | undefined {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  try {
    const path = execSync("which chromium 2>/dev/null || echo ''", { encoding: "utf-8" }).trim();
    if (path) return path;
  } catch {}
  try {
    const nixPath = execSync(
      "ls /nix/store/*/bin/chromium 2>/dev/null | head -1",
      { encoding: "utf-8" }
    ).trim();
    if (nixPath) return nixPath;
  } catch {}
  return undefined;
}

const chromiumPath = resolveChromiumPath();

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:25343",
    screenshot: "only-on-failure",
    video: "off",
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: undefined,
        launchOptions: {
          ...(chromiumPath ? { executablePath: chromiumPath } : {}),
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--headless=new",
          ],
        },
      },
    },
  ],
  outputDir: "e2e/test-results",
});
