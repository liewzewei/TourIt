"use server";

import createClient from "@/lib/supabase/server";

export async function markOnboardingComplete(selectedTagIds: string[]) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  if (selectedTagIds.length > 0) {
    const insertData = selectedTagIds.map(tagId => ({
      profile_id: user.id,
      tag_id: tagId
    }));
    
    const { error: insertError } = await supabase
      .from("tourist_tags")
      .insert(insertData);
      
    if (insertError) throw new Error(insertError.message);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}