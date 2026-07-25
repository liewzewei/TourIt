import { generateTimeOptions, formatTime12 } from "@/lib/time-options";

describe("generateTimeOptions", () => {
  it("defaults to 15-minute steps covering a full day", () => {
    const opts = generateTimeOptions();
    expect(opts.length).toBe(96); // 24h * 4 per hour
    expect(opts[0]).toBe("00:00");
    expect(opts[1]).toBe("00:15");
    expect(opts[opts.length - 1]).toBe("23:45");
  });

  it("zero-pads hours and minutes", () => {
    const opts = generateTimeOptions(60);
    expect(opts.length).toBe(24);
    expect(opts[0]).toBe("00:00");
    expect(opts).toContain("09:00");
  });

  it("honours a custom step", () => {
    expect(generateTimeOptions(30).length).toBe(48);
    expect(generateTimeOptions(30)).toContain("00:30");
  });

  it("throws on a non-positive or non-integer step", () => {
    expect(() => generateTimeOptions(0)).toThrow();
    expect(() => generateTimeOptions(-5)).toThrow();
    expect(() => generateTimeOptions(1.5)).toThrow();
  });
});

describe("formatTime12", () => {
  it("formats morning times, with the midnight hour as 12 AM", () => {
    expect(formatTime12("09:00")).toBe("9:00 AM");
    expect(formatTime12("00:00")).toBe("12:00 AM");
    expect(formatTime12("00:15")).toBe("12:15 AM");
  });

  it("formats noon and afternoon times", () => {
    expect(formatTime12("12:00")).toBe("12:00 PM");
    expect(formatTime12("13:30")).toBe("1:30 PM");
    expect(formatTime12("23:45")).toBe("11:45 PM");
  });

  it("returns the input unchanged when it isn't a valid HH:MM", () => {
    expect(formatTime12("")).toBe("");
    expect(formatTime12("9:00")).toBe("9:00"); // not zero-padded
    expect(formatTime12("25:00")).toBe("25:00");
    expect(formatTime12("09:60")).toBe("09:60");
    expect(formatTime12("abc")).toBe("abc");
  });
});
