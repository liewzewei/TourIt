import { chartGeometry, type ChartLayout } from "@/lib/chart";

// A padding-free 100x100 box makes the scaled coordinates easy to reason about:
// x spreads 0..100 across indices, y = 100 - (value / maxValue) * 100.
const BOX: ChartLayout = {
  width: 100,
  height: 100,
  padTop: 0,
  padRight: 0,
  padBottom: 0,
  padLeft: 0,
};

describe("chartGeometry", () => {
  it("scales points across the plot with an inverted y axis", () => {
    const geo = chartGeometry(
      [
        { views: 0, saves: 0 },
        { views: 10, saves: 5 },
        { views: 5, saves: 0 },
      ],
      BOX,
    );
    expect(geo.maxValue).toBe(10);
    expect(geo.baselineY).toBe(100);
    expect(geo.xs).toEqual([0, 50, 100]);
    // views: 0->100 (bottom), 10->0 (top), 5->50
    expect(geo.viewsPoints).toBe("0,100 50,0 100,50");
    // saves: 0->100, 5->50, 0->100
    expect(geo.savesPoints).toBe("0,100 50,50 100,100");
    expect(geo.areaPath).toBe("M 0,100 L 0,100 L 50,0 L 100,50 L 100,100 Z");
  });

  it("treats an empty series as flat with maxValue 1 and no geometry", () => {
    const geo = chartGeometry([], BOX);
    expect(geo.maxValue).toBe(1);
    expect(geo.xs).toEqual([]);
    expect(geo.viewsPoints).toBe("");
    expect(geo.savesPoints).toBe("");
    expect(geo.areaPath).toBe("");
  });

  it("keeps an all-zero series on the baseline (no divide by zero)", () => {
    const geo = chartGeometry(
      [
        { views: 0, saves: 0 },
        { views: 0, saves: 0 },
      ],
      BOX,
    );
    expect(geo.maxValue).toBe(1);
    expect(geo.viewsPoints).toBe("0,100 100,100");
    expect(geo.savesPoints).toBe("0,100 100,100");
  });

  it("centres a single point", () => {
    const geo = chartGeometry([{ views: 4, saves: 1 }], BOX);
    expect(geo.xs).toEqual([50]);
    expect(geo.viewsPoints).toBe("50,0"); // 4 is the max -> top
  });

  it("respects layout padding", () => {
    const geo = chartGeometry([{ views: 4, saves: 0 }], {
      width: 120,
      height: 60,
      padTop: 10,
      padRight: 20,
      padBottom: 10,
      padLeft: 20,
    });
    // plotW 80 -> single point centred at 20 + 40 = 60; baseline at 10 + 40 = 50;
    // value 4 == maxValue -> top of plot at padTop 10.
    expect(geo.baselineY).toBe(50);
    expect(geo.xs).toEqual([60]);
    expect(geo.viewsPoints).toBe("60,10");
  });
});
