import {
  saveRate,
  deltaPct,
  sumStats,
  serializeCsv,
  type ListingStatRow,
  type CsvColumn,
} from "@/lib/analytics";

describe("saveRate", () => {
  it("computes saves / views as a fraction", () => {
    expect(saveRate(38, 214)).toBe(38 / 214);
  });

  it("is 1 when every view converted to a save", () => {
    expect(saveRate(10, 10)).toBe(1);
  });

  it("returns 0 when there are no views (never divides by zero)", () => {
    expect(saveRate(0, 0)).toBe(0);
    expect(saveRate(5, 0)).toBe(0);
  });

  it("can exceed 1 when saves outpace logged views (not clamped)", () => {
    expect(saveRate(3, 2)).toBe(1.5);
  });
});

describe("deltaPct", () => {
  it("is a positive fraction for growth", () => {
    expect(deltaPct(50, 40)).toBe(0.25);
  });

  it("is a negative fraction for decline", () => {
    expect(deltaPct(30, 40)).toBe(-0.25);
  });

  it("is -1 when the current period dropped to zero", () => {
    expect(deltaPct(0, 40)).toBe(-1);
  });

  it("returns null when there is no baseline (0 -> positive)", () => {
    expect(deltaPct(12, 0)).toBeNull();
  });

  it("treats zero-to-zero as no change", () => {
    expect(deltaPct(0, 0)).toBe(0);
  });
});

describe("sumStats", () => {
  const rows: ListingStatRow[] = [
    { listing_id: "a", listing_name: "A", views: 214, saves: 38, prev_views: 180, prev_saves: 30 },
    { listing_id: "b", listing_name: "B", views: 95, saves: 6, prev_views: 120, prev_saves: 9 },
  ];

  it("sums each metric across rows", () => {
    expect(sumStats(rows)).toEqual({
      views: 309,
      saves: 44,
      prev_views: 300,
      prev_saves: 39,
    });
  });

  it("returns zeros for an empty portfolio", () => {
    expect(sumStats([])).toEqual({
      views: 0,
      saves: 0,
      prev_views: 0,
      prev_saves: 0,
    });
  });

  it("passes a single row through unchanged", () => {
    expect(sumStats([rows[0]])).toEqual({
      views: 214,
      saves: 38,
      prev_views: 180,
      prev_saves: 30,
    });
  });

  it("totals feed saveRate/deltaPct consistently (header == sum of rows)", () => {
    const t = sumStats(rows);
    expect(saveRate(t.saves, t.views)).toBe(44 / 309);
    expect(deltaPct(t.views, t.prev_views)).toBe((309 - 300) / 300);
  });
});

describe("serializeCsv", () => {
  type Row = { listing_name: string; views: number; saves: number };
  const columns: CsvColumn<Row>[] = [
    { key: "listing_name", header: "Listing" },
    { key: "views", header: "Views" },
    { key: "saves", header: "Saves" },
  ];

  it("writes a header then one line per row, CRLF-joined", () => {
    const csv = serializeCsv(
      [{ listing_name: "Newton Food Centre", views: 214, saves: 38 }],
      columns,
    );
    expect(csv).toBe("Listing,Views,Saves\r\nNewton Food Centre,214,38");
  });

  it("emits only the header for no rows", () => {
    expect(serializeCsv([], columns)).toBe("Listing,Views,Saves");
  });

  it("quotes fields containing a comma", () => {
    const csv = serializeCsv(
      [{ listing_name: "Cafe, Bar & Co", views: 1, saves: 0 }],
      columns,
    );
    expect(csv).toBe('Listing,Views,Saves\r\n"Cafe, Bar & Co",1,0');
  });

  it("escapes embedded double-quotes by doubling them", () => {
    const csv = serializeCsv(
      [{ listing_name: 'The "Best" Spot', views: 2, saves: 1 }],
      columns,
    );
    expect(csv).toBe('Listing,Views,Saves\r\n"The ""Best"" Spot",2,1');
  });

  it("quotes fields containing a newline", () => {
    const csv = serializeCsv(
      [{ listing_name: "Line1\nLine2", views: 0, saves: 0 }],
      columns,
    );
    expect(csv).toBe('Listing,Views,Saves\r\n"Line1\nLine2",0,0');
  });

  it("renders null/undefined as an empty field", () => {
    type Sparse = { a: string | null; b: number | undefined };
    const cols: CsvColumn<Sparse>[] = [
      { key: "a", header: "A" },
      { key: "b", header: "B" },
    ];
    expect(serializeCsv([{ a: null, b: undefined }], cols)).toBe("A,B\r\n,");
  });
});
