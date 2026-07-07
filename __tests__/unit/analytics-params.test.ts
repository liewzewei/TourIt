import { parsePeriod, DEFAULT_PERIOD } from "@/lib/analytics-params";

describe("parsePeriod", () => {
  // Fixed instant: 2026-07-06 12:00 UTC -> 20:00 in Singapore, still July 6.
  const NOON_UTC = new Date("2026-07-06T12:00:00Z");

  it("computes a 7-day inclusive window ending today (SGT)", () => {
    expect(parsePeriod("7d", NOON_UTC)).toEqual({
      period: "7d",
      to: "2026-07-06",
      from: "2026-06-30", // 6 days before the 6th
    });
  });

  it("computes a 30-day window", () => {
    expect(parsePeriod("30d", NOON_UTC)).toEqual({
      period: "30d",
      to: "2026-07-06",
      from: "2026-06-07", // 29 days before
    });
  });

  it("computes a 90-day window that crosses months", () => {
    expect(parsePeriod("90d", NOON_UTC)).toEqual({
      period: "90d",
      to: "2026-07-06",
      from: "2026-04-08", // 89 days before
    });
  });

  it("falls back to the default period for unknown input", () => {
    expect(parsePeriod("all-time", NOON_UTC).period).toBe(DEFAULT_PERIOD);
    expect(parsePeriod(undefined, NOON_UTC).period).toBe(DEFAULT_PERIOD);
    expect(parsePeriod("", NOON_UTC).period).toBe(DEFAULT_PERIOD);
  });

  it("uses the Singapore calendar day, not UTC", () => {
    // 2026-07-05 20:00 UTC is already 2026-07-06 04:00 in Singapore.
    const lateUtc = new Date("2026-07-05T20:00:00Z");
    expect(parsePeriod("7d", lateUtc).to).toBe("2026-07-06");
  });
});
