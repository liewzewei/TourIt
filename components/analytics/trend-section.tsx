import TrendChart from "@/components/analytics/trend-chart";
import type { OwnerTimeseriesPoint } from "@/lib/analytics";

// The "Views & saves over time" panel: heading, legend, the trend chart, and a
// muted note when the period had no activity. Shared by the overview and the
// per-listing drill-down.
export default function TrendSection({
  points,
}: {
  points: OwnerTimeseriesPoint[];
}) {
  const noActivity = points.every((p) => p.views === 0 && p.saves === 0);

  return (
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
      <TrendChart points={points} className="h-auto w-full" />
      {noActivity && (
        <p className="mt-3 text-sm text-gray-400">
          No visits or saves recorded in this period yet.
        </p>
      )}
    </section>
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
