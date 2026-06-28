import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Privileged Supabase client for E2E setup only. Uses the secret key
// (sb_secret_...), so it bypasses RLS — never import this into app code.
// Session persistence is off because this runs in a short-lived Node process.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY must be set for E2E setup",
    );
  }

  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
