import type { Metric, TrainingPoint } from "./types";

export function summarizeMetric(
  points: TrainingPoint[],
  metric: Metric
) {
  let minimum = Infinity;
  let maximum = -Infinity;
  let validCount = 0;

  for (const point of points) {
    const value = point[metric];

    if (Number.isFinite(value)) {
      minimum = Math.min(minimum, value);
      maximum = Math.max(maximum, value);
      validCount++;
    }
  }

  const lastPoint = points[points.length - 1];

  
  const latest =
    lastPoint && Number.isFinite(lastPoint[metric])
      ? lastPoint[metric]
      : null;

  return {
    minimum: validCount > 0 ? minimum : null,
    maximum: validCount > 0 ? maximum : null,
    latest,
    validCount,
    invalidCount: points.length - validCount,
  };
}