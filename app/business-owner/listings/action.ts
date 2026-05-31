"use server";

import createClient from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
  const open_time = formData.get("open_time") as string;
  const close_time = formData.get("close_time") as string;

  if (!listing_name) {
    return { error: "Listing name is required." };
  }

  // 3. Insert into Supabase and SELECT the ID back!
  const { data: newListing, error } = await supabase
    .from("listings")
    .insert({
      profile_id: user.id, 
      listing_name,
      listing_description,
      listing_address,
      open_time: open_time || null,
      close_time: close_time || null,
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