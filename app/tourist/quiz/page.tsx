import createClient from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import QuizClient from "./quiz-client";

export default async function QuizPage() {
  const supabase = await createClient();

  // 1. Get the current user to insert their profile_id later
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  // 2. Fetch the user's profile to check if they are retaking
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  const isRetake = profile?.onboarding_completed === true;

  // 3. If retaking, fetch existing tags
  let initialSelectedTagIds: string[] = [];
  if (isRetake) {
    const { data: existingTags } = await supabase
      .from("tourist_tags")
      .select("tag_id")
      .eq("profile_id", user.id);
      
    if (existingTags) {
      initialSelectedTagIds = existingTags.map(t => t.tag_id);
    }
  }

  // 4. Fetch the tags from Supabase
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("*")
    .limit(15);

  if (tagsError) {
    console.error("Error fetching tags:", tagsError);
  }

  return (
    <div className="max-w-xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        {isRetake ? "Update your interests" : "What are you interested in?"}
      </h1>
      
      {/* 5. Pass the fetched data down to the interactive client component */}
      <QuizClient 
        tags={tags || []} 
        initialSelectedTagIds={initialSelectedTagIds} 
        isRetake={isRetake} 
      />
    </div>
  );
}