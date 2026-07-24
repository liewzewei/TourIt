import Link from "next/link";

import { saveRate, type ListingStatRow, type StatTotals } from "@/lib/analytics";

// Per-listing comparison for the current period, server-sorted by views (then
// saves, then name) so the best performers surface first. The totals row equals
// the KPI cards by construction (views/saves are additive). Each name links to
// the per-listing drill-down (added in PR7). No inline sparkline yet — that needs
// per-listing daily data (a separate RPC) to avoid an N+1 query.
export default function ListingTable({
  rows,
  totals,
}: {
  rows: ListingStatRow[];
  totals: StatTotals;
}) {
  const sorted = [...rows].sort(
    (a, b) =>
      b.views - a.views ||
      b.saves - a.saves ||
      a.listing_name.localeCompare(b.listing_name),
  );

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="px-4 py-3 text-left font-medium">
              Listing
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Unique visitors
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Saves
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Save rate
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.listing_id} className="border-b last:border-0 hover:bg-muted">
              <td className="px-4 py-3">
                <Link
                  href={`/business-owner/analytics/${r.listing_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {r.listing_name}
                </Link>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.views.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {r.saves.toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatPct(saveRate(r.saves, r.views))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 font-medium">
            <td className="px-4 py-3">All listings</td>
            <td className="px-4 py-3 text-right tabular-nums">
              {totals.views.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {totals.saves.toLocaleString()}
            </td>
            <td className="px-4 py-3 text-right tabular-nums">
              {formatPct(saveRate(totals.saves, totals.views))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(1)}%`;
}
