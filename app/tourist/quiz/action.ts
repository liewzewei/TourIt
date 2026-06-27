"use server";

import createClient from "@/lib/supabase/server";

export async function markOnboardingComplete(userId: string) {
  const supabase = await createClient();
  
  await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", userId);
}