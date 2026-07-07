import type { NextRequest } from "next/server";

import createClient from "@/lib/supabase/server";
import { parsePeriod } from "@/lib/analytics-params";
import {
  serializeCsv,
  sumStats,
  saveRate,
  type ListingStatRow,
  type OwnerTimeseriesPoint,
  type CsvColumn,
} from "@/lib/analytics";

// CSV export for the analytics dashboard. A Route Handler (uncached by default),
// reachable at /business-owner/analytics/export. Re-runs the same self-scoped
// SECURITY DEFINER RPCs — so the same owner-only guarantees apply — and streams
// the numbers as an attachment. ?listing=<id> exports that listing's daily
// series; without it, the portfolio comparison table.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { period, from, to } = parsePeriod(searchParams.get("period") ?? undefined);
  const listingId = searchParams.get("listing");

  const supabase = await createClient();

  if (listingId) {
    // Per-listing daily time-series. Ownership is verified via the stats RPC
    // (which only ever returns the caller's own listings).
    const [statsRes, seriesRes] = await Promise.all([
      supabase.rpc("get_owner_listing_stats", { p_from: from, p_to: to }),
      supabase.rpc("get_owner_views_timeseries", {
        p_listing_id: listingId,
        p_from: from,
        p_to: to,
      }),
    ]);
    if (statsRes.error || seriesRes.error) return csvError();

    const listing = ((statsRes.data ?? []) as ListingStatRow[]).find(
      (r) => r.listing_id === listingId,
    );
    if (!listing) return new Response("Not found", { status: 404 });

    const rows = ((seriesRes.data ?? []) as OwnerTimeseriesPoint[]).map((p) => ({
      date: p.day,
      views: Number(p.views),
      saves: Number(p.saves),
    }));
    const columns: CsvColumn<(typeof rows)[number]>[] = [
      { key: "date", header: "Date" },
      { key: "views", header: "Unique visitors" },
      { key: "saves", header: "Saves" },
    ];
    return csvResponse(
      serializeCsv(rows, columns),
      `tourit-insights-${slug(listing.listing_name)}-${period}`,
    );
  }

  // Portfolio: the per-listing comparison table + a totals row (matches the
  // on-screen table, including its sort).
  const { data, error } = await supabase.rpc("get_owner_listing_stats", {
    p_from: from,
    p_to: to,
  });
  if (error) return csvError();

  const stats = ((data ?? []) as ListingStatRow[]).map((r) => ({
    ...r,
    views: Number(r.views),
    saves: Number(r.saves),
    prev_views: Number(r.prev_views),
    prev_saves: Number(r.prev_saves),
  }));
  const totals = sumStats(stats);

  const rows = [
    ...stats
      .sort(
        (a, b) =>
          b.views - a.views ||
          b.saves - a.saves ||
          a.listing_name.localeCompare(b.listing_name),
      )
      .map((r) => ({
        listing: r.listing_name,
        views: r.views,
        saves: r.saves,
        save_rate: formatPct(saveRate(r.saves, r.views)),
      })),
    {
      listing: "All listings",
      views: totals.views,
      saves: totals.saves,
      save_rate: formatPct(saveRate(totals.saves, totals.views)),
    },
  ];
  const columns: CsvColumn<(typeof rows)[number]>[] = [
    { key: "listing", header: "Listing" },
    { key: "views", header: "Unique visitors" },
    { key: "saves", header: "Saves" },
    { key: "save_rate", header: "Save rate" },
  ];
  return csvResponse(
    serializeCsv(rows, columns),
    `tourit-insights-all-listings-${period}`,
  );
}

function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}

function csvError(): Response {
  return new Response("Failed to build report", { status: 500 });
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}

function slug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "listing"
  );
}
