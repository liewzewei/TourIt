"use server";

import createClient from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function updateUserRole(role: 'business_owner' | 'tourist') {
  // 1. Initialize the secure server-side database client
  const supabase = await createClient();

  // 2. Get the currently logged-in user securely from the server session
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in to do this");
  }

  // 3. Update the profiles table
  const { error } = await supabase
    .from("profiles")
    .update({ role: role })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to update role:", error);
    throw new Error("Failed to update role");
  }

  // 4. Redirect them to the home page once successful!
  redirect("/");
}