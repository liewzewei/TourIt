import {
  isValidTimeRange,
  isValidListingHours,
  isWithinOperatingHours,
} from "@/lib/time-constraints";

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

describe("isWithinOperatingHours", () => {
  const hours = { is24h: false, open: "09:00", close: "17:00" };

  it("is always within hours when the listing is open 24 hours", () => {
    expect(
      isWithinOperatingHours({ is24h: true, open: null, close: null, enter: "03:00", exit: "05:00" }),
    ).toBe(true);
  });

  it("accepts a visit fully inside the opening hours", () => {
    expect(isWithinOperatingHours({ ...hours, enter: "10:00", exit: "16:00" })).toBe(true);
  });

  it("accepts a visit touching both boundaries (inclusive)", () => {
    expect(isWithinOperatingHours({ ...hours, enter: "09:00", exit: "17:00" })).toBe(true);
  });

  it("rejects a visit that starts before opening", () => {
    expect(isWithinOperatingHours({ ...hours, enter: "08:59", exit: "12:00" })).toBe(false);
  });

  it("rejects a visit that ends after closing", () => {
    expect(isWithinOperatingHours({ ...hours, enter: "12:00", exit: "17:01" })).toBe(false);
  });

  it("passes when the listing has no recorded hours to constrain against", () => {
    expect(
      isWithinOperatingHours({ is24h: false, open: null, close: null, enter: "23:00", exit: "23:30" }),
    ).toBe(true);
  });
});
