import type { OwnerTimeseriesPoint } from "@/lib/analytics";
import { chartGeometry, type ChartLayout } from "@/lib/chart";

// Server-rendered, zero-dependency SVG line chart: a filled views area + line and
// an overlaid saves line. Two sizes — "full" for the dashboard, "spark" for a
// table row. Scaling math lives in lib/chart.ts; this only draws it.
//
// Series colours come from the categorical chart slots, assigned in fixed order
// (views = chart-1, saves = chart-2) and never cycled: the slot identifies the
// series, so it must not shift when one is added or removed. The ramp is
// validated for colour-vision separation and contrast against both surfaces, so
// pick the next free slot rather than inventing a colour. Chrome — axis labels,
// baseline — wears text/border tokens, never a series colour.
const LAYOUTS: Record<"full" | "spark", ChartLayout> = {
  full: { width: 720, height: 240, padTop: 16, padRight: 16, padBottom: 28, padLeft: 40 },
  spark: { width: 120, height: 36, padTop: 4, padRight: 4, padBottom: 4, padLeft: 4 },
};

type TrendChartProps = {
  points: OwnerTimeseriesPoint[];
  variant?: "full" | "spark";
  className?: string;
};

export default function TrendChart({
  points,
  variant = "full",
  className,
}: TrendChartProps) {
  const layout = LAYOUTS[variant];
  const isSpark = variant === "spark";
  const geo = chartGeometry(points, layout);

  const totalViews = points.reduce((sum, p) => sum + p.views, 0);
  const totalSaves = points.reduce((sum, p) => sum + p.saves, 0);
  const label =
    points.length === 0
      ? "Views and saves: no data for this period"
      : `Views and saves from ${points[0].day} to ${points[points.length - 1].day}: ${totalViews} views, ${totalSaves} saves`;

  return (
    <svg
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={className}
      role="img"
      aria-label={label}
    >
      <title>{label}</title>

      {points.length === 0 && !isSpark && (
        <text
          x={layout.width / 2}
          y={layout.height / 2}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize={13}
        >
          No data for this period
        </text>
      )}

      {points.length > 0 && (
        <>
          {!isSpark && (
            <>
              {/* zero baseline + y-axis peak/zero labels */}
              <line
                x1={layout.padLeft}
                y1={geo.baselineY}
                x2={layout.width - layout.padRight}
                y2={geo.baselineY}
                className="stroke-border"
                strokeWidth={1}
              />
              <text x={layout.padLeft - 6} y={layout.padTop + 4} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                {geo.maxValue}
              </text>
              <text x={layout.padLeft - 6} y={geo.baselineY} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                0
              </text>
              {/* first / last date (MM-DD) */}
              <text x={geo.xs[0]} y={layout.height - 8} textAnchor="start" className="fill-muted-foreground" fontSize={11}>
                {points[0].day.slice(5)}
              </text>
              <text x={geo.xs[geo.xs.length - 1]} y={layout.height - 8} textAnchor="end" className="fill-muted-foreground" fontSize={11}>
                {points[points.length - 1].day.slice(5)}
              </text>
            </>
          )}

          <path d={geo.areaPath} className="fill-chart-1/15" />
          <polyline
            points={geo.viewsPoints}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={isSpark ? 1.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={geo.savesPoints}
            fill="none"
            className="stroke-chart-2"
            strokeWidth={isSpark ? 1.5 : 2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
