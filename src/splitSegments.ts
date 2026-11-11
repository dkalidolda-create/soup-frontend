import type { Metric, TrainingPoint } from "./types";


export function splitSegments(
  points: TrainingPoint[],
  metric: Metric
): TrainingPoint[][] {
  const segments: TrainingPoint[][] = [];
  let current: TrainingPoint[] = [];

  for (const point of points) {
    
    if (!Number.isFinite(point[metric])) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    const previous = current[current.length - 1];

    
    if (previous && point.step - previous.step > 1) {
      segments.push(current);
      current = [];
    }

    current.push(point);
  }

  
  if (current.length > 0) segments.push(current);

  return segments;
}