import { describe, expect, it } from "vitest";
import type { TrainingPoint } from "./types";
import { generatePoints } from "./generateData";
import { normalizePoints } from "./normalizeData";
import { splitSegments } from "./splitSegments";
import { downsampleSegment } from "./downsample";
import { summarizeMetric } from "./summarize";

// Helper for creating small, readable test datasets.
function point(step: number, loss: number): TrainingPoint {
  return { step, loss, lr: 0.001, grad_norm: 1.2 };
}

describe("Normalization", () => {
  it("sorts steps, keeps the last duplicate, and preserves input", () => {
    const input = [
      point(2, 0.2),
      point(1, 0.8),
      point(2, 0.4),
    ];
    const before = structuredClone(input);

    const result = normalizePoints(input);

    expect(result).toEqual([
      point(1, 0.8),
      point(2, 0.4),
    ]);
    expect(input).toEqual(before);
  });
});

describe("Chart gaps", () => {
  it.each([NaN, Infinity, -Infinity])(
    "breaks the line at %s while preserving a valid zero",
    invalidValue => {
      const input = [
        point(1, 0.8),
        point(2, invalidValue),
        point(3, 0),
      ];

      const segments = splitSegments(input, "loss");

      expect(segments).toEqual([
        [point(1, 0.8)],
        [point(3, 0)],
      ]);
    }
  );

  it("breaks the line at missing integer steps", () => {
    const input = [
      point(1, 0.8),
      point(2, 0.7),
      point(5, 0.4),
      point(6, 0.3),
    ];

    const segments = splitSegments(input, "loss");

    expect(segments.map(segment =>
      segment.map(p => p.step)
    )).toEqual([[1, 2], [5, 6]]);
  });

  it("handles empty data", () => {
    expect(splitSegments([], "loss")).toEqual([]);
  });
});

describe("Downsampling", () => {
  it("preserves a single spike in one million points", () => {
    const points = generatePoints(1_000_000);
    points[500_000].loss = 10;

    for (const budget of [1, 10, 200]) {
      const sampled = downsampleSegment(points, "loss", budget);

      expect(sampled.some(p =>
        p.step === 500_001 && p.loss === 10
      )).toBe(true);

      expect(sampled.length).toBeLessThanOrEqual(budget * 4);
      expect(sampled[0].step).toBe(1);
      expect(sampled.at(-1)?.step).toBe(1_000_000);

      // Selected points must remain in increasing step order.
      expect(sampled.every((p, index) =>
        index === 0 || p.step > sampled[index - 1].step
      )).toBe(true);
    }
  });

  it.each([0, -1, 1.5])(
    "rejects invalid bucket budgets: %s",
    budget => {
      expect(() =>
        downsampleSegment([point(1, 0.8)], "loss", budget)
      ).toThrow();
    }
  );
});

describe("Summary values", () => {
  it("preserves zero and does not replace an invalid latest value", () => {
    const summary = summarizeMetric([
      point(1, 0),
      point(2, 0.8),
      point(3, NaN),
    ], "loss");

    expect(summary).toEqual({
      minimum: 0,
      maximum: 0.8,
      latest: null,
      validCount: 2,
      invalidCount: 1,
    });
  });

  it("reports unavailable values for empty data", () => {
    expect(summarizeMetric([], "loss")).toEqual({
      minimum: null,
      maximum: null,
      latest: null,
      validCount: 0,
      invalidCount: 0,
    });
  });
});