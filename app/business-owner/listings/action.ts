"use server";

import createClient from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidListingHours } from "@/lib/time-constraints";
import { MAX_IMAGES_PER_LISTING } from "@/lib/listing-images";

// Local to this module: "use server" files may only export async actions, so
// this can't live alongside the exported helpers.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// `listingId` is returned so the client can upload images to the new listing's
// folder once it exists (see saveListingImages).
export type ActionState =
  | { error?: string; success?: boolean; listingId?: string }
  | null;

export async function createListing(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();

  // 1. Get the current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in to create a listing." };
  }

  // 2. Extract data from FormData
  const listing_name = formData.get("listing_name") as string;
  const listing_description = formData.get("listing_description") as string;
  const is_24_hours = formData.get("is_24_hours") === "true";
  // Normalize empty/absent time inputs to null (disabled inputs aren't submitted).
  const open_time = (formData.get("open_time") as string) || null;
  const close_time = (formData.get("close_time") as string) || null;

  // --- Extract mapping & address fields ---
  const postal_code = (formData.get("postal_code") as string) || null;
  const unit_number = (formData.get("unit_number") as string) || null;
  const directions_tip = (formData.get("directions_tip") as string) || null;
  const raw_address = (formData.get("listing_address") as string) || "";
  
  const latStr = formData.get("latitude") as string;
  const lngStr = formData.get("longitude") as string;
  const latitude = latStr ? parseFloat(latStr) : null;
  const longitude = lngStr ? parseFloat(lngStr) : null;

  // Combine into a clean global display address without hardcoding country names!
  // e.g., "1600 Pennsylvania Avenue NW, #01, Washington, DC 20500"
  const addressParts = [raw_address, unit_number, postal_code].filter(Boolean);
  const listing_address = addressParts.join(", ");

  if (!listing_name) {
    return { error: "Listing name is required." };
  }

  // Validate operating hours (mirrored by the valid_listing_hours DB constraint).
  if (!is_24_hours && (!open_time || !close_time)) {
    return { error: "Please provide both opening and closing times, or mark the listing as open 24 hours." };
  }
  if (!isValidListingHours({ is24h: is_24_hours, open: open_time, close: close_time })) {
    return { error: "Closing time must be after opening time." };
  }

  // 3. Insert into Supabase and SELECT the ID back!
  const { data: newListing, error } = await supabase
    .from("listings")
    .insert({
      profile_id: user.id,
      listing_name,
      listing_description,
      listing_address,
      is_24_hours,
      open_time: is_24_hours ? null : open_time,
      close_time: is_24_hours ? null : close_time,
      postal_code,
      unit_number,
      directions_tip,
      latitude,
      longitude,
    })
    .select("id") // Ensure we get the ID back
    .single();

  if (error || !newListing) {
    console.error("Error creating listing:", error);
    return { error: "Failed to create listing. Please try again." };
  }

  // 4. Handle the Many-to-Many Tags!
  const selectedTagIds = formData.getAll("selected_tags") as string[];

  if (selectedTagIds.length > 0) {
    // Format them for the junction table
    const tagInserts = selectedTagIds.map((tagId) => ({
      listing_id: newListing.id,
      tag_id: tagId,
    }));
    
    // Insert into listing_tags
    const { error: tagError } = await supabase
      .from("listing_tags")
      .insert(tagInserts);
      
    if (tagError) {
      console.error("Error inserting tags:", tagError);
      // The listing itself exists, so still hand back its id -- the client can
      // upload images even though the tags failed.
      return { error: "Listing created, but failed to save tags.", listingId: newListing.id };
    }
  }

  // 5. Revalidate the page to show the new listing
  revalidatePath("/business-owner/listings");

  return { success: true, listingId: newListing.id };
}

// Records images the browser has already uploaded to Storage. Called after
// createListing succeeds, so the listing exists and its RLS ownership check can
// pass. `paths` are object paths within the listing-images bucket, in the order
// the owner arranged them -- index 0 becomes the cover image.
export async function saveListingImages(
  listingId: string,
  paths: string[],
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: "You must be logged in to save images." };
  }

  // These arguments come from the browser, so sanity-check them before touching
  // the DB. RLS remains the real boundary: a forged listingId belonging to
  // someone else is rejected by the insert policy regardless of these checks.
  if (!UUID_RE.test(listingId)) {
    return { error: "Invalid listing." };
  }
  if (paths.length === 0 || paths.length > MAX_IMAGES_PER_LISTING) {
    return { error: `Expected between 1 and ${MAX_IMAGES_PER_LISTING} images.` };
  }
  // Every object must sit in this listing's own folder, which is also what the
  // storage policy enforces on upload.
  if (paths.some((path) => !path.startsWith(`${listingId}/`) || path.includes(".."))) {
    return { error: "Invalid image path." };
  }

  const { error } = await supabase.from("listing_images").insert(
    paths.map((image_path, index) => ({
      listing_id: listingId,
      image_path,
      display_order: index,
    })),
  );

  if (error) {
    console.error("Error saving listing images:", error);
    return { error: "Failed to save images. Please try again." };
  }

  revalidatePath("/business-owner/listings");
  revalidatePath("/tourist/explore");

  return { success: true };
}