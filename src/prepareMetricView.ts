import type { Metric, TrainingPoint } from "./types";
import type { MetricView } from "./workerTypes";
import { splitSegments } from "./splitSegments";
import { downsampleSegment } from "./downsample";

export function prepareMetricView(
  points: TrainingPoint[],
  metric: Metric
): MetricView {
  const source = splitSegments(points, metric);

  const segments = source.map(segment =>
    downsampleSegment(segment, metric)
  );

  let min = Infinity;
  let max = -Infinity;
  let validCount = 0;

  for (const segment of source) {
    validCount += segment.length;
  }

  for (const segment of segments) {
    for (const point of segment) {
      min = Math.min(min, point[metric]);
      max = Math.max(max, point[metric]);
    }
  }

  const padding =
    min === max ? Math.abs(min) * 0.05 || 1 : 0;

  return {
    metric,
    segments,
    domain: Number.isFinite(min)
      ? {
          firstStep: points[0].step,
          lastStep: points[points.length - 1].step,
          min: min - padding,
          max: max + padding,
        }
      : null,
    invalidCount: points.length - validCount,
    segmentCount: segments.length,
    displayedCount: segments.reduce(
      (total, segment) => total + segment.length,
      0
    ),
  };
}