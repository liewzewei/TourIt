import createClient from "@/lib/supabase/server";

import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ImageIcon } from "lucide-react";

import type { RecommendedListing } from "@/types/index";
import Pagination from "./pagination";
import FilterBar, { type Tag } from "./filter-bar";
import { getListingImageUrl } from "@/lib/listing-images";
import {
  firstValue,
  parsePage,
  parseTagIds,
  parseTime,
} from "@/lib/explore-params";

const PAGE_SIZE = 15; // mirrors the recommend_listings default p_limit

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // --- Page number, tag, and time filters: validated in @/lib/explore-params
  // before they reach the RPC's SQL casts (URLs can be hand-typed). ---
  const page = parsePage(firstValue(params.page));
  const tagIds = parseTagIds(firstValue(params.tags));
  const openFrom = parseTime(firstValue(params.open_from));
  const openUntil = parseTime(firstValue(params.open_until));

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
            className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer"
          >
            {/* Fixed aspect box reserves space before load (no layout shift).
                A missing image falls back to a neutral icon rather than a
                committed placeholder asset. */}
            <div className="relative aspect-video bg-gray-100">
              {listing.preview_image_path ? (
                <Image
                  src={getListingImageUrl(listing.preview_image_path)}
                  alt={listing.listing_name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <ImageIcon className="h-10 w-10" aria-hidden />
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
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
