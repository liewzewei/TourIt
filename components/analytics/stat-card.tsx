// A single KPI card: label, big value, and a period-over-period delta badge.
// `value` arrives pre-formatted; `delta` is the signed fraction from
// lib/analytics.deltaPct (null = no baseline). `comparisonLabel` names the window
// being compared against (e.g. "previous 30 days"), shown as muted context on a
// second line so the badge is self-explanatory without a tooltip. Higher is
// better for every metric here, so up is always green.

type StatCardProps = {
  label: string;
  value: string;
  delta: number | null;
  comparisonLabel: string;
};

export default function StatCard({
  label,
  value,
  delta,
  comparisonLabel,
}: StatCardProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
      <div className="mt-2">
        <DeltaBadge delta={delta} comparisonLabel={comparisonLabel} />
      </div>
    </div>
  );
}

function DeltaBadge({
  delta,
  comparisonLabel,
}: {
  delta: number | null;
  comparisonLabel: string;
}) {
  let indicator: string;
  let context: string;
  let color: string;

  if (delta === null) {
    indicator = "New";
    context = `no data in ${comparisonLabel}`;
    color = "text-emerald-600";
  } else if (delta === 0) {
    indicator = "No change";
    context = `vs ${comparisonLabel}`;
    color = "text-gray-400";
  } else {
    const up = delta > 0;
    const pct = Math.abs(delta * 100);
    // A tiny relative change would round to "0%"; keep one decimal below 10%.
    const pctText = pct >= 10 ? pct.toFixed(0) : pct.toFixed(1);
    indicator = `${up ? "▲" : "▼"} ${pctText}%`;
    context = `vs ${comparisonLabel}`;
    color = up ? "text-emerald-600" : "text-red-600";
  }

  return (
    <div className="leading-snug">
      <span className={`text-xs font-medium ${color}`}>{indicator}</span>
      <span className="block text-xs text-gray-400">{context}</span>
    </div>
  );
}
