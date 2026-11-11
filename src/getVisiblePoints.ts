import type { TrainingPoint } from "./types";

function findBoundary(
  points: TrainingPoint[],
  target: number,
  afterEqual: boolean
): number {
  let left = 0;
  let right = points.length;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    const step = points[middle].step;

    if (step < target || (afterEqual && step === target)) {
      left = middle + 1;
    } else {
      right = middle;
    }
  }

  return left;
}

export function getVisiblePoints(
  points: TrainingPoint[],
  zoom: number,
  position: number
): TrainingPoint[] {
  if (!Number.isFinite(zoom) || zoom < 1) {
    throw new Error("Invalid zoom");
  }

  if (
    !Number.isFinite(position) ||
    position < 0 ||
    position > 100
  ) {
    throw new Error("Invalid position");
  }

  if (points.length === 0 || zoom === 1) return points;

  const firstStep = points[0].step;
  const lastStep = points[points.length - 1].step;
  const fullSpan = lastStep - firstStep;

  const windowSpan = Math.min(
    fullSpan,
    Math.max(1, fullSpan / zoom)
  );

  const start =
    firstStep + (fullSpan - windowSpan) * (position / 100);

  const end = start + windowSpan;

  const startIndex = findBoundary(points, start, false);
  const endIndex = findBoundary(points, end, true);

  return points.slice(startIndex, endIndex);
}