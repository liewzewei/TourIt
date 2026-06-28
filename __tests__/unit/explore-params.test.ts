import {
  firstValue,
  parsePage,
  parseTagIds,
  parseTime,
} from "@/lib/explore-params";

// A well-formed v4-ish UUID and an obviously-broken one for the filters.
const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const ANOTHER_UUID = "00000000-0000-0000-0000-000000000001";

describe("firstValue", () => {
  it("returns undefined unchanged", () => {
    expect(firstValue(undefined)).toBeUndefined();
  });

  it("returns a plain string unchanged", () => {
    expect(firstValue("hello")).toBe("hello");
  });

  it("takes the first element of an array", () => {
    expect(firstValue(["a", "b", "c"])).toBe("a");
  });

  it("returns undefined for an empty array", () => {
    expect(firstValue([])).toBeUndefined();
  });
});

describe("parsePage", () => {
  it("parses a normal page number", () => {
    expect(parsePage("3")).toBe(3);
  });

  it("floors non-integers", () => {
    expect(parsePage("2.9")).toBe(2);
  });

  it("clamps zero and negatives to 1", () => {
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-5")).toBe(1);
  });

  it("falls back to 1 for non-numeric input", () => {
    expect(parsePage("abc")).toBe(1);
  });

  it("falls back to 1 for undefined", () => {
    expect(parsePage(undefined)).toBe(1);
  });
});

describe("parseTagIds", () => {
  it("returns an empty array for undefined", () => {
    expect(parseTagIds(undefined)).toEqual([]);
  });

  it("returns an empty array for an empty string", () => {
    expect(parseTagIds("")).toEqual([]);
  });

  it("keeps a single valid UUID", () => {
    expect(parseTagIds(VALID_UUID)).toEqual([VALID_UUID]);
  });

  it("keeps multiple valid UUIDs", () => {
    expect(parseTagIds(`${VALID_UUID},${ANOTHER_UUID}`)).toEqual([
      VALID_UUID,
      ANOTHER_UUID,
    ]);
  });

  it("drops malformed entries but keeps valid ones", () => {
    expect(parseTagIds(`${VALID_UUID},not-a-uuid,123`)).toEqual([VALID_UUID]);
  });

  it("returns an empty array when nothing is valid", () => {
    expect(parseTagIds("foo,bar")).toEqual([]);
  });
});

describe("parseTime", () => {
  it("accepts HH:MM", () => {
    expect(parseTime("09:00")).toBe("09:00");
  });

  it("accepts HH:MM:SS", () => {
    expect(parseTime("23:59:59")).toBe("23:59:59");
  });

  it("rejects out-of-range hours", () => {
    expect(parseTime("25:00")).toBeNull();
  });

  it("rejects out-of-range minutes", () => {
    expect(parseTime("12:99")).toBeNull();
  });

  it("rejects unpadded values", () => {
    expect(parseTime("9:5")).toBeNull();
  });

  it("returns null for undefined", () => {
    expect(parseTime(undefined)).toBeNull();
  });
});
