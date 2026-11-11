import { useMemo } from "react";
import type { Metric, TrainingPoint } from "./types";

type Props = {
  label: string;
  metric: Metric;
  points: TrainingPoint[];
  segments: TrainingPoint[][];
};

export function MetricChart({
  label,
  metric,
  points,
  segments,
}: Props) {
  // Calculate the axis range from all normalized measurements.
  const bounds = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;

    for (const point of points) {
      const value = point[metric];

      if (Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }

    if (!Number.isFinite(min)) return null;

    // Give a constant series some vertical space.
    const padding = min === max ? Math.abs(min) * 0.05 || 1 : 0;

    return {
      firstStep: points[0].step,
      lastStep: points[points.length - 1].step,
      min: min - padding,
      max: max + padding,
    };
  }, [points, metric]);

  if (!bounds) {
    return <p>No finite {label} measurements to display.</p>;
  }

  const width = 800;
  const height = 300;
  const left = 80;
  const right = 20;
  const top = 25;
  const bottom = 50;

  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  function x(step: number) {
    if (bounds!.firstStep === bounds!.lastStep) {
      return left + plotWidth / 2;
    }

    return left +
      ((step - bounds!.firstStep) /
        (bounds!.lastStep - bounds!.firstStep)) * plotWidth;
  }

  function y(value: number) {
    return top +
      (1 - (value - bounds!.min) /
        (bounds!.max - bounds!.min)) * plotHeight;
  }

  function format(value: number) {
    return new Intl.NumberFormat("en", {
      maximumSignificantDigits: 4,
    }).format(value);
  }

  return (
    <figure style={{ margin: "24px 0" }}>
      <figcaption>{label} by training step</figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${label} by training step`}
        style={{
          width: "100%",
          display: "block",
          background: "white",
          color: "#172b4d",
          fontSize: 12,
        }}
      >
        <line
          x1={left}
          y1={top}
          x2={left}
          y2={height - bottom}
          stroke="currentColor"
        />

        <line
          x1={left}
          y1={height - bottom}
          x2={width - right}
          y2={height - bottom}
          stroke="currentColor"
        />

        <text x={left - 8} y={top + 4} textAnchor="end">
          {format(bounds.max)}
        </text>

        <text x={left - 8} y={height - bottom} textAnchor="end">
          {format(bounds.min)}
        </text>

        <text x={left} y={height - 25}>
          {format(bounds.firstStep)}
        </text>

        <text x={width - right} y={height - 25} textAnchor="end">
          {format(bounds.lastStep)}
        </text>

        <text x={width / 2} y={height - 5} textAnchor="middle">
          Training step
        </text>

        {segments.map(segment =>
          segment.length === 1 ? (
            <circle
              key={segment[0].step}
              cx={x(segment[0].step)}
              cy={y(segment[0][metric])}
              r={3}
              fill="#075985"
            />
          ) : (
            <polyline
              key={segment[0].step}
              points={segment
                .map(point => `${x(point.step)},${y(point[metric])}`)
                .join(" ")}
              fill="none"
              stroke="#075985"
              strokeWidth={2}
            />
          )
        )}
      </svg>
    </figure>
  );
}