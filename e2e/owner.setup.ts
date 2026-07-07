import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";

// Authenticate as the seeded business owner (supabase/seed.sql), whose listings
// exist in both local dev and the CI stack. Saves a separate auth state so the
// owner-analytics spec runs as an owner, while the golden path runs as a tourist.
// Signs in through the dev-only /auth/test-login route (its optional body picks
// the account), which makes @supabase/ssr write the session cookies that
// Playwright captures into storageState.
export const OWNER_STORAGE_STATE = path.join(__dirname, ".auth", "owner.json");

setup("authenticate owner", async ({ request }) => {
  const res = await request.post("/auth/test-login", {
    data: { email: "owner@tourit.local", password: "password123" },
  });
  expect(res.ok(), `owner login failed: ${res.status()} ${await res.text()}`).toBe(
    true,
  );

  mkdirSync(path.dirname(OWNER_STORAGE_STATE), { recursive: true });
  await request.storageState({ path: OWNER_STORAGE_STATE });
});
