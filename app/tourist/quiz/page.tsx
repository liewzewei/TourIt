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

  // 2. Fetch the tags from Supabase
  const { data: tags, error: tagsError } = await supabase
    .from("tags")
    .select("*")
    .limit(15);

  if (tagsError) {
    console.error("Error fetching tags:", tagsError);
  }

  return (
    <div className="max-w-xl mx-auto p-6 mt-10">
      <h1 className="text-3xl font-bold mb-8 text-center">What are you interested in?</h1>
      
      {/* 3. Pass the fetched data down to the interactive client component */}
      <QuizClient tags={tags || []} userId={user.id} />
    </div>
  );
}