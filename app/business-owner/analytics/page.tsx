import Link from "next/link";

import createClient from "@/lib/supabase/server";
import { firstValue } from "@/lib/explore-params";
import { parsePeriod, PERIODS, type Period } from "@/lib/analytics-params";
import {
  sumStats,
  saveRate,
  deltaPct,
  type ListingStatRow,
  type OwnerTimeseriesPoint,
} from "@/lib/analytics";
import StatCard from "@/components/analytics/stat-card";
import ListingTable from "@/components/analytics/listing-table";
import TrendChart from "@/components/analytics/trend-chart";

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
  const [statsRes, seriesRes] = await Promise.all([
    supabase.rpc("get_owner_listing_stats", { p_from: from, p_to: to }),
    supabase.rpc("get_owner_views_timeseries", {
      p_listing_id: null,
      p_from: from,
      p_to: to,
    }),
  ]);

  if (statsRes.error || seriesRes.error) {
    console.error("Analytics fetch failed:", statsRes.error ?? seriesRes.error);
    return (
      <main className="mx-auto max-w-6xl p-8">
        <Header period={period} />
        <p className="text-gray-500">
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

  const totals = sumStats(rows);
  const rate = saveRate(totals.saves, totals.views);
  const prevRate = saveRate(totals.prev_saves, totals.prev_views);
  const noActivity = totals.views === 0 && totals.saves === 0;
  const comparisonLabel = `previous ${PERIOD_LABELS[period]}`;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <Header period={period} />

      {rows.length === 0 ? (
        <EmptyNoListings />
      ) : (
        <>
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
            <h2 className="mb-3 text-sm font-medium text-gray-500">
              Per listing
            </h2>
            <ListingTable rows={rows} totals={totals} />
          </section>

          <section className="rounded-lg border bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-sm font-medium text-gray-500">
                Views &amp; saves over time
              </h2>
              <div className="flex gap-4 text-xs text-gray-500">
                <LegendDot className="bg-blue-500" label="Views" />
                <LegendDot className="bg-emerald-500" label="Saves" />
              </div>
            </div>
            <TrendChart points={series} className="h-auto w-full" />
            {noActivity && (
              <p className="mt-3 text-sm text-gray-400">
                No visits or saves recorded in this period yet.
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Header({ period }: { period: Period }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <h1 className="text-3xl font-bold">Insights</h1>
      <PeriodSelector period={period} />
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

// Server-rendered links (no client JS), mirroring the explore Pagination.
function PeriodSelector({ period }: { period: Period }) {
  return (
    <nav className="flex gap-1 rounded-md border p-1" aria-label="Period">
      {PERIODS.map((p) => {
        const active = p === period;
        return (
          <Link
            key={p}
            href={`/business-owner/analytics?period=${p}`}
            aria-current={active ? "page" : undefined}
            className={`rounded px-3 py-1 text-sm transition ${
              active
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </nav>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function EmptyNoListings() {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <p className="mb-4 text-gray-600">
        You have no listings yet, so there&apos;s nothing to measure.
      </p>
      <Link
        href="/business-owner/listings"
        className="inline-block rounded bg-black px-4 py-2 text-white transition hover:bg-neutral-800"
      >
        Create your first listing
      </Link>
    </div>
  );
}

function formatPercent(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
