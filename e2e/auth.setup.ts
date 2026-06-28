import { test as setup, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createAdminClient } from "./supabase-admin";

export const STORAGE_STATE = path.join(__dirname, ".auth", "user.json");

const EMAIL = process.env.E2E_TEST_EMAIL!;
const PASSWORD = process.env.E2E_TEST_PASSWORD!;

// Create the test user if missing, else fetch its id. createUser fails when the
// email already exists, so we fall back to the public.users mirror (populated by
// the on_auth_user_created trigger) to get the id — no paginated listUsers scan.
//
// full_name is required: a legacy trigger inserts into public.users with a
// NOT NULL name from raw_user_meta_data->>'full_name'. Omitting it makes the
// whole auth.users insert fail with "Database error creating new user".
async function ensureTestUser(): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Playwright Test" },
  });
  if (data?.user) return data.user.id;

  const { data: row } = await admin
    .from("users")
    .select("id")
    .eq("email", EMAIL)
    .maybeSingle();
  if (row?.id) return row.id as string;

  throw new Error(`Could not create or find test user: ${error?.message}`);
}

setup("authenticate", async ({ request }) => {
  const admin = createAdminClient();
  const userId = await ensureTestUser();

  // Reset to a fresh, unonboarded tourist so the golden path starts at the quiz
  // and the run is idempotent across reruns.
  const { error: profileError } = await admin
    .from("profiles")
    .update({ role: "tourist", onboarding_completed: false })
    .eq("id", userId);
  expect(profileError, profileError?.message).toBeNull();

  const { error: tagsError } = await admin
    .from("tourist_tags")
    .delete()
    .eq("profile_id", userId);
  expect(tagsError, tagsError?.message).toBeNull();

  // Sign in through the dev-only route; @supabase/ssr sets the session cookies
  // on the response, which the request context then serializes to storageState.
  const res = await request.post("/auth/test-login");
  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBe(
    true,
  );

  mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  await request.storageState({ path: STORAGE_STATE });
});
