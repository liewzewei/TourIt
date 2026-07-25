import createClient from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import ListingCard, { type ListingCardTag } from "@/components/listing-card";

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings?.map((listing) => (
          <ListingCard
            key={listing.id}
            name={listing.listing_name}
            description={listing.listing_description}
            address={listing.listing_address}
            openTime={listing.open_time}
            closeTime={listing.close_time}
            tags={(listing.listing_tags ?? [])
              .map((relation: { tags: ListingCardTag | null }) => relation.tags)
              .filter((tag: ListingCardTag | null): tag is ListingCardTag => tag !== null)}
          />
        ))}

        {listings?.length === 0 && (
          <p className="text-muted-foreground col-span-full">You have no listings yet.</p>
        )}
      </div>
    </main>
  );
}