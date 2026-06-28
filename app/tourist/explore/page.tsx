import createClient from "@/lib/supabase/server";

import Link from 'next/link';

import type { RecommendedListing } from "@/types/index";

export default async function ExplorePage() {
  const supabase = await createClient();

  // Personalized, ranked feed. The RPC scores every listing against the
  // tourist's quiz tags and returns the top slice (newest-first if they have
  // no tags yet). See supabase/migrations/..._recommend_listings_fn.sql.
  const { data, error } = await supabase.rpc("recommend_listings", {
    p_limit: 15,
    p_offset: 0,
  });

  if (error) {
    console.error("Error fetching recommendations:", error);
    return <div>Failed to load listings.</div>;
  }

  // The client is untyped, so `data` comes back as `any`; cast to our RPC row shape.
  const listings = (data ?? []) as RecommendedListing[];

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Explore Listings</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {listings.map((listing) => (
          <Link
            href={`/tourist/explore/listings/${listing.id}`}
            key={listing.id}
            className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer"
          >
            <h2 className="text-xl font-semibold mb-2">
              {listing.listing_name}
            </h2>

            <p className="text-gray-600 mb-4 line-clamp-3 flex-grow">
              {listing.listing_description || "No description provided."}
            </p>

            {/* Tags come back pre-flattened as [{ id, tag_name }] from the RPC */}
            {listing.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium"
                  >
                    {tag.tag_name}
                  </span>
                ))}
              </div>
            )}

            <div className="text-sm text-gray-500 pt-4 border-t mt-auto">
              <p>📍 {listing.listing_address || "Location unavailable"}</p>
              {(listing.open_time || listing.close_time) && (
                <p>
                  🕒 {listing.open_time} - {listing.close_time}
                </p>
              )}
            </div>
          </Link>
        ))}

        {listings.length === 0 && (
          <p className="text-gray-500 col-span-full">No listings found.</p>
        )}
      </div>
    </main>
  );
}
