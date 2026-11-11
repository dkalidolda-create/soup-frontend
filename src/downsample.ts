import type { Metric, TrainingPoint } from "./types";

// Input is one continuous segment containing finite measurements.
export function downsampleSegment(
  points: TrainingPoint[],
  metric: Metric,
  maxBuckets = 200
): TrainingPoint[] {
  if (!Number.isInteger(maxBuckets) || maxBuckets < 1) {
    throw new Error("maxBuckets must be a positive integer");
  }

  // Small segments can be displayed directly.
  if (points.length <= maxBuckets * 4) return points;

  const result: TrainingPoint[] = [];
  const bucketSize = Math.ceil(points.length / maxBuckets);

  for (let start = 0; start < points.length; start += bucketSize) {
    const end = Math.min(start + bucketSize, points.length);

    let minIndex = start;
    let maxIndex = start;

    for (let index = start; index < end; index++) {
      if (points[index][metric] < points[minIndex][metric]) {
        minIndex = index;
      }

      if (points[index][metric] > points[maxIndex][metric]) {
        maxIndex = index;
      }
    }

    // Keep the first, minimum, maximum, and last point.
    // Set removes repeated indices.
    const indices = [...new Set([
      start,
      minIndex,
      maxIndex,
      end - 1,
    ])].sort((a, b) => a - b);

    for (const index of indices) {
      result.push(points[index]);
    }
  }

  return result;
}