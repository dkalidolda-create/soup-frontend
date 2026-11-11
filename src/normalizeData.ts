import type { TrainingPoint } from "./types";

export function normalizePoints(
  points: TrainingPoint[]
): TrainingPoint[] {
  // Store one measurement per step.
  const byStep = new Map<number, TrainingPoint>();

  for (const point of points) {
    // Our policy: the last occurrence of a step wins.
    byStep.set(point.step, point);
  }

  // Sort a new array without changing the source array's order.
  return [...byStep.values()].sort((a, b) => a.step - b.step);
}