import { describe, expect, it } from "vitest";
import { generatePoints } from "./generateData";
import { normalizePoints } from "./normalizeData";
import { getVisiblePoints } from "./getVisiblePoints";
import { prepareMetricView } from "./prepareMetricView";

describe("Dashboard preparation", () => {
  it("preserves the spike across centered zoom levels", () => {
    const points = generatePoints(1_000_000);
    points[500_000].loss = 10;

    for (const zoom of [1, 2, 10, 100, 1000]) {
      const visible = getVisiblePoints(points, zoom, 50);
      const view = prepareMetricView(visible, "loss");

      expect(
        view.segments.flat().some(
          point =>
            point.step === 500_001 &&
            point.loss === 10
        )
      ).toBe(true);

      expect(view.domain?.max).toBe(10);
      expect(view.domain?.firstStep).toBe(visible[0].step);
      expect(view.domain?.lastStep).toBe(
        visible[visible.length - 1].step
      );
      expect(view.displayedCount).toBeLessThanOrEqual(800);
    }

    const beginning = prepareMetricView(
      getVisiblePoints(points, 1000, 0),
      "loss"
    );

    expect(beginning.domain?.max).toBeLessThan(10);
  });

  it("preserves invalid-value and missing-step gaps", () => {
    const points = generatePoints(10);
    points[2].loss = NaN;
    points.splice(5, 2);

    const view = prepareMetricView(points, "loss");

    expect(view.invalidCount).toBe(1);
    expect(
      view.segments.map(segment =>
        segment.map(point => point.step)
      )
    ).toEqual([[1, 2], [4, 5], [8, 9, 10]]);
  });

  it("handles empty and entirely invalid windows", () => {
    expect(prepareMetricView([], "loss").domain).toBeNull();

    const points = generatePoints(2).map(point => ({
      ...point,
      loss: NaN,
    }));

    expect(prepareMetricView(points, "loss")).toMatchObject({
      domain: null,
      displayedCount: 0,
      invalidCount: 2,
    });
  });

  it("gives constant series a usable axis range", () => {
    const view = prepareMetricView(
      generatePoints(10),
      "lr"
    );

    expect(view.domain!.min).toBeLessThan(0.001);
    expect(view.domain!.max).toBeGreaterThan(0.001);
    expect(
      view.segments.flat().every(point => point.lr === 0.001)
    ).toBe(true);
  });

  it("normalizes without changing the source array", () => {
    const points = generatePoints(10).reverse();
    const before = structuredClone(points);

    expect(
      normalizePoints(points).map(point => point.step)
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    expect(points).toEqual(before);
  });
});