import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import createClient from "@/lib/supabase/server";
import { firstValue } from "@/lib/explore-params";
import { parsePeriod, PERIOD_LABELS, type Period } from "@/lib/analytics-params";
import {
  saveRate,
  deltaPct,
  type ListingStatRow,
  type OwnerTimeseriesPoint,
  type OwnerAudience,
} from "@/lib/analytics";
import StatCard from "@/components/analytics/stat-card";
import PeriodSelector from "@/components/analytics/period-selector";
import TrendSection from "@/components/analytics/trend-section";
import AudiencePanel from "@/components/analytics/audience-panel";
import AiInsight, { AiInsightSkeleton } from "@/components/analytics/ai-insight";

// Per-listing drill-down. Reuses get_owner_listing_stats (which only returns the
// caller's own listings) and picks this listing's row — a missing row means the
// id isn't owned (or doesn't exist), so we 404. That's belt-and-suspenders on top
// of the RPCs' own self-scoping, so a hand-typed id never leaks anything.
export default async function ListingAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ listingId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { listingId } = await params;
  const sp = await searchParams;
  const { period, from, to } = parsePeriod(firstValue(sp.period));

  const supabase = await createClient();
  const [statsRes, seriesRes, audienceRes] = await Promise.all([
    supabase.rpc("get_owner_listing_stats", { p_from: from, p_to: to }),
    supabase.rpc("get_owner_views_timeseries", {
      p_listing_id: listingId,
      p_from: from,
      p_to: to,
    }),
    supabase.rpc("get_owner_audience_tags", { p_listing_id: listingId }),
  ]);

  if (statsRes.error || seriesRes.error) {
    console.error(
      "Listing analytics fetch failed:",
      statsRes.error ?? seriesRes.error,
    );
    return (
      <main className="mx-auto max-w-6xl p-8">
        <BackLink period={period} />
        <p className="mt-4 text-gray-500">
          Failed to load analytics. Please try again.
        </p>
      </main>
    );
  }

  const found = ((statsRes.data ?? []) as ListingStatRow[]).find(
    (r) => r.listing_id === listingId,
  );
  if (!found) notFound();

  const row = {
    ...found,
    views: Number(found.views),
    saves: Number(found.saves),
    prev_views: Number(found.prev_views),
    prev_saves: Number(found.prev_saves),
  };
  const series = ((seriesRes.data ?? []) as OwnerTimeseriesPoint[]).map((p) => ({
    day: p.day,
    views: Number(p.views),
    saves: Number(p.saves),
  }));

  // Secondary: fall back to the locked state on an audience RPC error.
  if (audienceRes.error) console.error("Listing audience fetch failed:", audienceRes.error);
  const audience = (
    !audienceRes.error && audienceRes.data
      ? audienceRes.data
      : { saver_count: 0, threshold: 10, tags: null }
  ) as OwnerAudience;

  const rate = saveRate(row.saves, row.views);
  const prevRate = saveRate(row.prev_saves, row.prev_views);
  const comparisonLabel = `previous ${PERIOD_LABELS[period]}`;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6">
        <BackLink period={period} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{row.listing_name}</h1>
          <PeriodSelector
            period={period}
            basePath={`/business-owner/analytics/${listingId}`}
          />
        </div>
      </div>

      <Suspense fallback={<AiInsightSkeleton />}>
        <AiInsight
          scope="listing"
          listingName={row.listing_name}
          periodLabel={PERIOD_LABELS[period]}
          views={row.views}
          saves={row.saves}
          saveRate={rate}
          viewsDelta={deltaPct(row.views, row.prev_views)}
          savesDelta={deltaPct(row.saves, row.prev_saves)}
          saverCount={audience.saver_count}
          topTags={audience.tags}
        />
      </Suspense>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Unique visitors"
          value={row.views.toLocaleString()}
          delta={deltaPct(row.views, row.prev_views)}
          comparisonLabel={comparisonLabel}
        />
        <StatCard
          label="Saves"
          value={row.saves.toLocaleString()}
          delta={deltaPct(row.saves, row.prev_saves)}
          comparisonLabel={comparisonLabel}
        />
        <StatCard
          label="Save rate"
          value={`${(rate * 100).toFixed(1)}%`}
          delta={deltaPct(rate, prevRate)}
          comparisonLabel={comparisonLabel}
        />
      </div>

      <TrendSection points={series} />

      <div className="mt-8">
        <AudiencePanel data={audience} scopeLabel="this listing" />
      </div>
    </main>
  );
}

function BackLink({ period }: { period: Period }) {
  return (
    <Link
      href={`/business-owner/analytics?period=${period}`}
      className="text-sm text-gray-500 transition hover:text-gray-900"
    >
      ← All listings
    </Link>
  );
}
