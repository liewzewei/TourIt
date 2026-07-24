import createClient from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BusinessOwnerHomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  // Fetch listings for the current business owner AND their associated tags
  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      *,
      listing_tags (
        tags (
          id,
          tag_name
        )
      )
    `)
    .eq('profile_id', user.id);

  if (error) {
    console.error("Error fetching listings:", error);
    return <div>Failed to load listings.</div>;
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">My Listings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings?.map((listing) => (
          <div 
            key={listing.id}
            className="border rounded-lg p-6 shadow-sm flex flex-col h-full bg-card"
          > 
            <h2 className="text-xl font-semibold mb-2">
              {listing.listing_name}
            </h2>
            
            <p className="text-muted-foreground mb-4 line-clamp-3 flex-grow">
              {listing.listing_description || "No description provided."}
            </p>
            
            {/* Render the Tags */}
            {listing.listing_tags && listing.listing_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.listing_tags.map((relation: { tags: { id: string; tag_name: string } | null }) => {
                  const tag = relation.tags;
                  if (!tag) return null;
                  
                  return (
                    <span 
                      key={tag.id} 
                      className="bg-accent text-accent-foreground text-xs px-2 py-1 rounded-full font-medium"
                    >
                      {tag.tag_name}
                    </span>
                  );
                })}
              </div>
            )}

            <div className="text-sm text-muted-foreground pt-4 border-t mt-auto">
              <p>📍 {listing.listing_address || "Location unavailable"}</p>
              {(listing.open_time || listing.close_time) && (
                <p>
                  🕒 {listing.open_time} - {listing.close_time}
                </p>
              )}
            </div>
          </div>
        ))}

        {listings?.length === 0 && (
          <p className="text-muted-foreground col-span-full">You have no listings yet.</p>
        )}
      </div>
    </main>
  );
}