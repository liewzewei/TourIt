"use server";

import createClient from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { isValidListingHours } from "@/lib/time-constraints";

export type ActionState = { error?: string; success?: boolean } | null;

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
  const listing_address = formData.get("listing_address") as string;
  const is_24_hours = formData.get("is_24_hours") === "true";
  // Normalize empty/absent time inputs to null (disabled inputs aren't submitted).
  const open_time = (formData.get("open_time") as string) || null;
  const close_time = (formData.get("close_time") as string) || null;

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
      return { error: "Listing created, but failed to save tags." };
    }
  }

  // 5. Revalidate the page to show the new listing
  revalidatePath("/business-owner/listings");
  
  return { success: true };
}