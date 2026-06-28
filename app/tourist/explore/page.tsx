import createClient from "@/lib/supabase/server";

import Link from "next/link";
import { redirect } from "next/navigation";

import type { RecommendedListing } from "@/types/index";
import Pagination from "./pagination";
import FilterBar, { type Tag } from "./filter-bar";

const PAGE_SIZE = 15; // mirrors the recommend_listings default p_limit
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

// searchParams values can be string | string[] | undefined; take the first.
function firstValue(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // --- Page number: ignore arrays, non-numbers, and anything < 1 ---
  const parsedPage = Number(firstValue(params.page));
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  // --- Filters: validate before they reach SQL casts (hand-typed URLs) ---
  const rawTags = firstValue(params.tags);
  const tagIds = rawTags ? rawTags.split(",").filter((t) => UUID_RE.test(t)) : [];

  const rawOpenFrom = firstValue(params.open_from);
  const openFrom = rawOpenFrom && TIME_RE.test(rawOpenFrom) ? rawOpenFrom : null;

  const rawOpenUntil = firstValue(params.open_until);
  const openUntil =
    rawOpenUntil && TIME_RE.test(rawOpenUntil) ? rawOpenUntil : null;

  // --- Fetch the ranked page and the tag vocabulary in parallel ---
  const [rpcRes, tagsRes] = await Promise.all([
    supabase.rpc("recommend_listings", {
      p_limit: PAGE_SIZE,
      p_offset: (page - 1) * PAGE_SIZE,
      p_tag_ids: tagIds.length > 0 ? tagIds : null,
      p_open_from: openFrom,
      p_open_until: openUntil,
    }),
    supabase.from("tags").select("id, tag_name, category").order("category"),
  ]);

  if (rpcRes.error) {
    console.error("Error fetching recommendations:", rpcRes.error);
    return <div>Failed to load listings.</div>;
  }
  if (tagsRes.error) {
    console.error("Error fetching tags:", tagsRes.error);
  }

  // The client is untyped, so data comes back as `any`; cast to our row shapes.
  const listings = (rpcRes.data ?? []) as RecommendedListing[];
  const availableTags = (tagsRes.data ?? []) as Tag[];

  const hasActiveFilters = tagIds.length > 0 || openFrom !== null || openUntil !== null;

  // Build hrefs that preserve the active filters (and drop page=1).
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

  // Out-of-range page (hand-typed or stale) returns no rows — and so no
  // total_count to read — so bounce back to page 1 of the *same* filter.
  if (listings.length === 0 && page > 1) {
    redirect(buildHref(1));
  }

  // Every row carries the same windowed (filtered) total; 0 rows => empty result.
  const totalCount = Number(listings[0]?.total_count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Remount the (client) FilterBar when the URL filters change so its local
  // draft state stays in sync on back/forward navigation.
  const filterKey = `${tagIds.join(",")}|${openFrom ?? ""}|${openUntil ?? ""}`;

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Explore Listings</h1>

      <FilterBar
        key={filterKey}
        availableTags={availableTags}
        initialTagIds={tagIds}
        initialOpenFrom={openFrom ?? ""}
        initialOpenUntil={openUntil ?? ""}
      />

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
          <p className="text-gray-500 col-span-full">
            {hasActiveFilters
              ? "No listings match your filters."
              : "No listings found."}
          </p>
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
