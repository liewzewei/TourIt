import createClient from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import ListingCard, { type ListingCardTag } from "@/components/listing-card";
import { LOGIN_PATH } from "@/constants/common";

export default async function BusinessOwnerHomePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(LOGIN_PATH);
  }

  // Fetch listings for the current business owner with their tags and images.
  // Images are ordered so the first row is the cover (lowest display_order),
  // mirroring the explore feed's preview_image_path.
  const { data: listings, error } = await supabase
    .from("listings")
    .select(`
      *,
      listing_tags (
        tags (
          id,
          tag_name
        )
      ),
      listing_images (
        image_path,
        display_order
      )
    `)
    .eq('profile_id', user.id)
    .order("display_order", { referencedTable: "listing_images" });

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
            imagePath={listing.listing_images?.[0]?.image_path ?? null}
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