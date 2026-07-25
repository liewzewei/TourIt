import { Suspense } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import createClient from "@/lib/supabase/server";
import { firstValue } from "@/lib/explore-params";
import { parsePeriod, PERIOD_LABELS, type Period } from "@/lib/analytics-params";
import {
  sumStats,
  saveRate,
  deltaPct,
  type ListingStatRow,
  type OwnerTimeseriesPoint,
  type OwnerAudience,
} from "@/lib/analytics";
import StatCard from "@/components/analytics/stat-card";
import ListingTable from "@/components/analytics/listing-table";
import PeriodSelector from "@/components/analytics/period-selector";
import TrendSection from "@/components/analytics/trend-section";
import AudiencePanel from "@/components/analytics/audience-panel";
import AiInsight, { AiInsightSkeleton } from "@/components/analytics/ai-insight";
import ExportLink from "@/components/analytics/export-link";

// Fully dynamic: reads the ?period= search param and the caller's session
// (via the Supabase server client) to scope the SECURITY DEFINER RPCs to the
// owner. The proxy middleware already guarantees a logged-in, onboarded
// business owner reaches this route, so no role guard is needed here.
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const { period, from, to } = parsePeriod(firstValue(params.period));

  const supabase = await createClient();
  const [statsRes, seriesRes, audienceRes] = await Promise.all([
    supabase.rpc("get_owner_listing_stats", { p_from: from, p_to: to }),
    supabase.rpc("get_owner_views_timeseries", {
      p_listing_id: null,
      p_from: from,
      p_to: to,
    }),
    supabase.rpc("get_owner_audience_tags", { p_listing_id: null }),
  ]);

  if (statsRes.error || seriesRes.error) {
    console.error("Analytics fetch failed:", statsRes.error ?? seriesRes.error);
    return (
      <main className="mx-auto max-w-6xl p-8">
        <Header period={period} />
        <p className="text-muted-foreground">
          Failed to load analytics. Please try again.
        </p>
      </main>
    );
  }

  // The Supabase client is untyped: cast to our row shapes and coerce the counts
  // to numbers so the pure math never sees a stringified value.
  const rows = ((statsRes.data ?? []) as ListingStatRow[]).map((r) => ({
    ...r,
    views: Number(r.views),
    saves: Number(r.saves),
    prev_views: Number(r.prev_views),
    prev_saves: Number(r.prev_saves),
  }));
  const series = ((seriesRes.data ?? []) as OwnerTimeseriesPoint[]).map((p) => ({
    day: p.day,
    views: Number(p.views),
    saves: Number(p.saves),
  }));

  // The audience panel is secondary: on an RPC error, fall back to the locked
  // state rather than failing the whole dashboard.
  if (audienceRes.error) console.error("Audience fetch failed:", audienceRes.error);
  const audience = (
    !audienceRes.error && audienceRes.data
      ? audienceRes.data
      : { saver_count: 0, threshold: 10, tags: null }
  ) as OwnerAudience;

  const totals = sumStats(rows);
  const rate = saveRate(totals.saves, totals.views);
  const prevRate = saveRate(totals.prev_saves, totals.prev_views);
  const comparisonLabel = `previous ${PERIOD_LABELS[period]}`;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <Header period={period} />

      {rows.length === 0 ? (
        <EmptyNoListings />
      ) : (
        <>
          <Suspense fallback={<AiInsightSkeleton />}>
            <AiInsight
              scope="portfolio"
              periodLabel={PERIOD_LABELS[period]}
              views={totals.views}
              saves={totals.saves}
              saveRate={rate}
              viewsDelta={deltaPct(totals.views, totals.prev_views)}
              savesDelta={deltaPct(totals.saves, totals.prev_saves)}
              saverCount={audience.saver_count}
              topTags={audience.tags}
            />
          </Suspense>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Unique visitors"
              value={totals.views.toLocaleString()}
              delta={deltaPct(totals.views, totals.prev_views)}
              comparisonLabel={comparisonLabel}
            />
            <StatCard
              label="Saves"
              value={totals.saves.toLocaleString()}
              delta={deltaPct(totals.saves, totals.prev_saves)}
              comparisonLabel={comparisonLabel}
            />
            <StatCard
              label="Save rate"
              value={formatPercent(rate)}
              delta={deltaPct(rate, prevRate)}
              comparisonLabel={comparisonLabel}
            />
          </div>

          <section className="mb-8">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Per listing</h2>
            <ListingTable rows={rows} totals={totals} />
          </section>

          <TrendSection points={series} />

          <div className="mt-8">
            <AudiencePanel data={audience} scopeLabel="your listings" />
          </div>
        </>
      )}
    </main>
  );
}

function Header({ period }: { period: Period }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-bold">Insights</h1>
      <div className="flex items-center gap-3">
        <PeriodSelector period={period} basePath="/business-owner/analytics" />
        <ExportLink href={`/business-owner/analytics/export?period=${period}`} />
      </div>
    </div>
  );
}

function EmptyNoListings() {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p className="mb-4 text-muted-foreground">
        You have no listings yet, so there&apos;s nothing to measure.
      </p>
      <Button asChild>
        <Link href="/business-owner/listings">Create your first listing</Link>
      </Button>
    </div>
  );
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
