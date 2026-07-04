import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Load env for the Playwright process itself (the admin client + the values the
// test-login route reads). Mirror Next's dev precedence: .env.development.local
// wins, then .env.local fills any gaps (dotenv won't override already-set vars,
// so load the higher-priority file first). Both are a no-op in CI, where these
// come from injected GitHub Actions secrets instead.
dotenv.config({ path: ".env.development.local", quiet: true });
dotenv.config({ path: ".env.local", quiet: true });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // One worker in CI: tests share a single hosted test user, so serialize them.
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    // Runs first: provisions the test user and writes the auth state.
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
      dependencies: ["setup"],
    },
  ],
  // Boot the app for tests; reuse a running dev server locally for speed.
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
