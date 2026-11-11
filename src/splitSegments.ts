import type { Metric, TrainingPoint } from "./types";

// Input must already be sorted and deduplicated.
export function splitSegments(
  points: TrainingPoint[],
  metric: Metric
): TrainingPoint[][] {
  const segments: TrainingPoint[][] = [];
  let current: TrainingPoint[] = [];

  for (const point of points) {
    // An invalid measurement breaks the line.
    if (!Number.isFinite(point[metric])) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    const previous = current[current.length - 1];

    // Our generated data expects one measurement per integer step.
    if (previous && point.step - previous.step > 1) {
      segments.push(current);
      current = [];
    }

    current.push(point);
  }

  // Save the final section of the line.
  if (current.length > 0) segments.push(current);

  return segments;
}