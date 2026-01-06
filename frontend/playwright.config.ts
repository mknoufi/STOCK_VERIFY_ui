import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for Stock Verification App
 *
 * Run all tests: npx playwright test
 * Run specific tests: npx playwright test e2e/auth.spec.ts
 * Run with UI: npx playwright test --ui
 * Debug mode: npx playwright test --debug
 *
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { open: "never" }],
    ["list"],
    ...(process.env.CI ? [["github"] as const] : []),
  ],
  /* Test timeout */
  timeout: 60000,
  /* Expect settings */
  expect: {
    timeout: 10000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8081",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Take screenshot on failure */
    screenshot: "only-on-failure",

    /* Record video on retry */
    video: "on-first-retry",

    /* Action timeout */
    actionTimeout: 10000,

    /* Navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    // Mobile web testing (primary)
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] },
    },
    // Desktop testing
    {
      name: "Desktop Chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    // Tablet testing
    {
      name: "iPad",
      use: { ...devices["iPad Pro 11"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes to start
    env: {
      BROWSER: "none", // Don't auto-open browser
    },
  },
});
