import { isValidTimeRange, isValidListingHours } from "@/lib/time-constraints";

describe("isValidTimeRange", () => {
  it("returns true when start is strictly before end", () => {
    expect(isValidTimeRange("09:00", "17:00")).toBe(true);
  });

  it("returns false when start equals end", () => {
    expect(isValidTimeRange("09:00", "09:00")).toBe(false);
  });

  it("returns false when start is after end", () => {
    expect(isValidTimeRange("18:00", "09:00")).toBe(false);
  });

  it("compares seconds-precision strings correctly", () => {
    expect(isValidTimeRange("09:00:00", "09:00:01")).toBe(true);
    expect(isValidTimeRange("09:00:01", "09:00:00")).toBe(false);
  });
});

describe("isValidListingHours", () => {
  it("is always valid when open 24 hours, regardless of times", () => {
    expect(isValidListingHours({ is24h: true, open: null, close: null })).toBe(true);
    expect(isValidListingHours({ is24h: true, open: "18:00", close: "09:00" })).toBe(true);
  });

  it("is valid when not 24h and both times form a valid range", () => {
    expect(isValidListingHours({ is24h: false, open: "09:00", close: "17:00" })).toBe(true);
  });

  it("is invalid when not 24h and the opening time is missing", () => {
    expect(isValidListingHours({ is24h: false, open: null, close: "17:00" })).toBe(false);
  });

  it("is invalid when not 24h and the closing time is missing", () => {
    expect(isValidListingHours({ is24h: false, open: "09:00", close: null })).toBe(false);
  });

  it("is invalid when not 24h and both times are missing", () => {
    expect(isValidListingHours({ is24h: false, open: null, close: null })).toBe(false);
  });

  it("is invalid when not 24h and closing is not after opening", () => {
    expect(isValidListingHours({ is24h: false, open: "17:00", close: "09:00" })).toBe(false);
    expect(isValidListingHours({ is24h: false, open: "09:00", close: "09:00" })).toBe(false);
  });
});
