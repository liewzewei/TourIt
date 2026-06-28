import { hasTimeOverlap } from "@/lib/itinerary-overlap";

describe("hasTimeOverlap", () => {
  it("returns false when there are no existing activities", () => {
    expect(hasTimeOverlap([], "10:00", "11:00")).toBe(false);
  });

  it("returns false when the new slot is entirely before an existing one", () => {
    const existing = [{ start_time: "12:00", end_time: "13:00" }];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(false);
  });

  it("returns false when the new slot is entirely after an existing one", () => {
    const existing = [{ start_time: "08:00", end_time: "09:00" }];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(false);
  });

  it("treats adjacent slots as non-overlapping (end == start)", () => {
    const existing = [{ start_time: "11:00", end_time: "12:00" }];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(false);
  });

  it("detects a partial overlap at the tail", () => {
    const existing = [{ start_time: "11:00", end_time: "12:00" }];
    expect(hasTimeOverlap(existing, "10:00", "11:30")).toBe(true);
  });

  it("detects a partial overlap at the head", () => {
    const existing = [{ start_time: "10:00", end_time: "11:00" }];
    expect(hasTimeOverlap(existing, "10:30", "12:00")).toBe(true);
  });

  it("detects when the new slot fully contains an existing one", () => {
    const existing = [{ start_time: "10:30", end_time: "10:45" }];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(true);
  });

  it("detects when the new slot is fully inside an existing one", () => {
    const existing = [{ start_time: "09:00", end_time: "12:00" }];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(true);
  });

  it("skips activities with null times without crashing", () => {
    const existing = [
      { start_time: null, end_time: null },
      { start_time: "10:00", end_time: null },
    ];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(false);
  });

  it("finds an overlap among a mix of valid and null-time activities", () => {
    const existing = [
      { start_time: null, end_time: "11:00" },
      { start_time: "10:30", end_time: "11:30" },
    ];
    expect(hasTimeOverlap(existing, "10:00", "11:00")).toBe(true);
  });
});
