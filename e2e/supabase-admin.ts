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

// Tear down a listing created during a test, plus everything hanging off it.
// listing_images and listing_views are removed by ON DELETE CASCADE when the
// listing row goes; listing_tags is NOT cascaded, so it is deleted explicitly.
// Storage objects are never FK-linked, so the bucket files are removed first.
export async function deleteListingCascade(listingId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: objects } = await admin.storage
    .from("listing-images")
    .list(listingId);
  if (objects && objects.length > 0) {
    await admin.storage
      .from("listing-images")
      .remove(objects.map((object) => `${listingId}/${object.name}`));
  }

  await admin.from("listing_tags").delete().eq("listing_id", listingId);
  await admin.from("listings").delete().eq("id", listingId);
}
