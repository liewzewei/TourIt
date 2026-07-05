// Pure geometry for the hand-rolled analytics trend chart. Separated from the
// SVG markup so the scaling math is unit-testable without a DOM; the component
// in components/analytics/trend-chart.tsx is a thin presentational wrapper.

// Only the plotted values are needed here (OwnerTimeseriesPoint, which also
// carries `day`, is structurally compatible), keeping this module dependency-free.
export type ChartPoint = { views: number; saves: number };

export type ChartLayout = {
  width: number;
  height: number;
  padTop: number;
  padRight: number;
  padBottom: number;
  padLeft: number;
};

export type ChartGeometry = {
  maxValue: number; // y-axis top, always >= 1
  baselineY: number; // y pixel of the zero line
  xs: number[]; // x pixel position per point index (for axis ticks)
  viewsPoints: string; // "x,y x,y ..." for a views <polyline>
  savesPoints: string; // ditto for saves
  areaPath: string; // filled area under the views line ("M..L..Z"); "" when empty
};

const round = (n: number) => Math.round(n * 100) / 100;

export function chartGeometry(
  points: ReadonlyArray<ChartPoint>,
  layout: ChartLayout,
): ChartGeometry {
  const { width, height, padTop, padRight, padBottom, padLeft } = layout;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const baselineY = round(padTop + plotH);
  const n = points.length;

  // Never divide by zero: an empty or all-zero series has maxValue 1, so every
  // point lands on the baseline (a flat line along the bottom).
  const maxValue = Math.max(1, ...points.map((p) => Math.max(p.views, p.saves)));

  // A single point is centred; otherwise points spread evenly across the plot.
  const xAt = (i: number) =>
    n <= 1 ? padLeft + plotW / 2 : padLeft + (i / (n - 1)) * plotW;
  const yAt = (v: number) => baselineY - (v / maxValue) * plotH;

  const xs = points.map((_, i) => round(xAt(i)));
  const coords = (key: "views" | "saves") =>
    points.map((p, i) => `${xs[i]},${round(yAt(p[key]))}`).join(" ");

  const viewsPoints = coords("views");
  const savesPoints = coords("saves");

  const areaPath =
    n === 0
      ? ""
      : `M ${xs[0]},${baselineY} ` +
        points.map((p, i) => `L ${xs[i]},${round(yAt(p.views))}`).join(" ") +
        ` L ${xs[n - 1]},${baselineY} Z`;

  return { maxValue, baselineY, xs, viewsPoints, savesPoints, areaPath };
}
