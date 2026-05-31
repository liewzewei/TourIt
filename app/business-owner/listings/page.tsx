import createClient from "@/lib/supabase/server";
import ListingForm from "./listing-form";

export default async function ListingsPage() {
  const supabase = await createClient();
  
  // 1. Fetch all tags securely on the server
  const { data: tags, error } = await supabase.from("tags").select("*").order("category");
  
  if (error) {
    console.error("Error fetching tags:", error);
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create a New Listing</h1>
      
      {/* 2. Render the client-side form, passing the tags! */}
      <ListingForm availableTags={tags || []} />
    </div>
  );
}