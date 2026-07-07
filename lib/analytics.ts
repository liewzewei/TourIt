// Pure analytics math for the business-owner dashboard. Kept free of React and
// data-fetching so it can be unit-tested in isolation (mirrors lib/itinerary-
// overlap.ts and lib/time-constraints.ts). The aggregation RPCs return raw
// counts; everything derived — rates, period-over-period deltas, portfolio
// totals, and CSV — is computed here.

// One per-listing row from get_owner_listing_stats: current-period and
// previous-period counts. Field names match the RPC's snake_case columns so an
// untyped Supabase rpc() result casts straight onto it.
export type ListingStatRow = {
  listing_id: string;
  listing_name: string;
  views: number;
  saves: number;
  prev_views: number;
  prev_saves: number;
};

export type StatTotals = {
  views: number;
  saves: number;
  prev_views: number;
  prev_saves: number;
};

// One zero-filled day from get_owner_views_timeseries. `day` is an ISO date
// string (YYYY-MM-DD, Asia/Singapore) as returned by PostgREST for a date column.
export type OwnerTimeseriesPoint = {
  day: string;
  views: number;
  saves: number;
};

// One tag in the anonymized audience profile: how many distinct savers picked it.
export type AudienceTag = { tag_name: string; category: string; savers: number };

// get_owner_audience_tags payload. `tags` is null until `saver_count` reaches
// `threshold` (k-anonymity) — the distribution is withheld below it.
export type OwnerAudience = {
  saver_count: number;
  threshold: number;
  tags: AudienceTag[] | null;
};

// Save-rate = saves / views for the same scope + period, as a fraction in the
// [0, 1] range (callers multiply by 100 to display). It is an aggregate ratio,
// NOT a per-person match, so a save without a same-day logged view can push it
// above 1 in rare cases — that is real signal, not an error, so we don't clamp
// it. No views -> 0 (never divide by zero).
export function saveRate(saves: number, views: number): number {
  if (views <= 0) return 0;
  return saves / views;
}

// Period-over-period change as a signed fraction (0.25 = +25%, -1 = dropped to
// zero). Returns null when there is no baseline to compare against — the
// previous period was zero but the current one is not — so the UI can render
// "new" instead of a misleading "+∞%". Zero-to-zero is treated as no change (0).
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return (current - previous) / previous;
}

// Fold per-listing stat rows into portfolio totals. The KPI header on the
// overview is built from this, so by construction it always equals the sum of
// the comparison-table rows. Empty input (owner with no listings/data) -> zeros.
export function sumStats(rows: ReadonlyArray<ListingStatRow>): StatTotals {
  return rows.reduce<StatTotals>(
    (acc, r) => ({
      views: acc.views + r.views,
      saves: acc.saves + r.saves,
      prev_views: acc.prev_views + r.prev_views,
      prev_saves: acc.prev_saves + r.prev_saves,
    }),
    { views: 0, saves: 0, prev_views: 0, prev_saves: 0 },
  );
}

// --- CSV export (RFC 4180) --------------------------------------------------
// Generic so both the portfolio table and the per-listing time-series can reuse
// it: the caller shapes plain row objects (pre-formatting any derived values)
// and describes the columns; this only orders, stringifies, and quotes them.

export type CsvColumn<T> = { key: keyof T & string; header: string };

// Quote a field only when it contains a comma, double-quote, CR or LF, doubling
// any embedded double-quotes (RFC 4180). null/undefined -> empty field.
function csvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function serializeCsv<T>(
  rows: ReadonlyArray<T>,
  columns: ReadonlyArray<CsvColumn<T>>,
): string {
  const header = columns.map((c) => csvField(c.header)).join(",");
  const body = rows.map((row) =>
    columns.map((c) => csvField(row[c.key])).join(","),
  );
  // RFC 4180 uses CRLF between records; no trailing newline.
  return [header, ...body].join("\r\n");
}
