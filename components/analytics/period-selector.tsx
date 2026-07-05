import Link from "next/link";

import { PERIODS, PERIOD_LABELS, type Period } from "@/lib/analytics-params";

// Server-rendered period presets (links, no client JS). `basePath` lets both the
// overview and the per-listing drill-down reuse it, each keeping its own route.
export default function PeriodSelector({
  period,
  basePath,
}: {
  period: Period;
  basePath: string;
}) {
  return (
    <nav className="flex gap-1 rounded-md border p-1" aria-label="Period">
      {PERIODS.map((p) => {
        const active = p === period;
        return (
          <Link
            key={p}
            href={`${basePath}?period=${p}`}
            aria-current={active ? "page" : undefined}
            className={`rounded px-3 py-1 text-sm transition ${
              active ? "bg-black text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </nav>
  );
}
