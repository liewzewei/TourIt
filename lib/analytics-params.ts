// Period presets for the analytics dashboard, parsed from the ?period= search
// param (validated before it reaches SQL, like lib/explore-params.ts). "A day"
// is Asia/Singapore to line up with the SGT buckets the RPCs use: `to` is today
// in SGT and `from` is (N-1) days earlier — an N-day inclusive window ending
// today. `now` is injectable so the derivation is deterministic in tests.

export const PERIODS = ["7d", "30d", "90d"] as const;
export type Period = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: Period = "30d";

const PERIOD_DAYS: Record<Period, number> = { "7d": 7, "30d": 30, "90d": 90 };

// Human-readable label per preset — used by the period selector and the
// "vs previous N days" delta copy.
export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7 days",
  "30d": "30 days",
  "90d": "90 days",
};

export type PeriodRange = { period: Period; from: string; to: string };

// today, in Asia/Singapore, as YYYY-MM-DD (en-CA formats ISO-style).
function todayInSingapore(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
  }).format(now);
}

// Shift a YYYY-MM-DD calendar date by whole days. Done in UTC so it never drifts
// across a timezone offset — the input is already a resolved SGT date, not an
// instant.
function shiftDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parsePeriod(
  value: string | undefined,
  now: Date = new Date(),
): PeriodRange {
  const period: Period = (PERIODS as readonly string[]).includes(value ?? "")
    ? (value as Period)
    : DEFAULT_PERIOD;
  const to = todayInSingapore(now);
  const from = shiftDays(to, -(PERIOD_DAYS[period] - 1));
  return { period, from, to };
}
