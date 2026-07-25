import createClient from "@/lib/supabase/server";

import { redirect } from "next/navigation";

import type { RecommendedListing } from "@/types/index";
import ListingCard from "@/components/listing-card";
import Pagination from "./pagination";
import FilterBar, { type Tag } from "./filter-bar";
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

  // The current feed URL's query, carried into each card so the listing page
  // can offer a "back to the feed" link that lands on the same filtered page.
  const currentQuery = (() => {
    const sp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => sp.append(key, v));
      else sp.set(key, value);
    }
    return sp.toString();
  })();

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {listings.map((listing) => (
          <ListingCard
            key={listing.id}
            href={`/tourist/explore/listings/${listing.id}${currentQuery ? `?${currentQuery}` : ""}`}
            name={listing.listing_name}
            description={listing.listing_description}
            address={listing.listing_address}
            openTime={listing.open_time}
            closeTime={listing.close_time}
            tags={listing.tags}
            imagePath={listing.preview_image_path}
          />
        ))}

        {listings.length === 0 && (
          <p className="text-muted-foreground col-span-full">
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
