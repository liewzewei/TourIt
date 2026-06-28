import createClient from "@/lib/supabase/server";

import Link from "next/link";
import { redirect } from "next/navigation";

import type { RecommendedListing } from "@/types/index";
import Pagination from "./pagination";

const PAGE_SIZE = 15; // mirrors the recommend_listings default p_limit

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // Parse ?page= defensively: ignore arrays, non-numbers, and anything < 1.
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsed = Number(rawPage);
  const page = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;

  // Personalized, ranked feed. The RPC scores every listing against the tourist's
  // quiz tags and returns one page of results (newest-first if they have no tags).
  // See supabase/migrations/..._recommend_listings_fn.sql.
  const { data, error } = await supabase.rpc("recommend_listings", {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });

  if (error) {
    console.error("Error fetching recommendations:", error);
    return <div>Failed to load listings.</div>;
  }

  // The client is untyped, so `data` comes back as `any`; cast to our RPC row shape.
  const listings = (data ?? []) as RecommendedListing[];

  // An out-of-range page (e.g. hand-typed) returns no rows — and therefore no
  // total_count to read — so bounce back to the first page instead of a dead end.
  if (listings.length === 0 && page > 1) {
    redirect("/tourist/explore");
  }

  // Every row carries the same windowed total; no rows means no listings at all.
  const totalCount = Number(listings[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Build pagination hrefs that preserve any other query params (filters, later).
  const buildHref = (targetPage: number) => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "page" || value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
      else sp.set(key, value);
    }
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/tourist/explore?${qs}` : "/tourist/explore";
  };

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

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        buildHref={buildHref}
      />
    </main>
  );
}
