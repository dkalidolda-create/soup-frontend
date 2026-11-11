import { generateRuns } from "./generateData";
import { normalizePoints } from "./normalizeData";
import { summarizeMetric } from "./summarize";
import { getVisiblePoints } from "./getVisiblePoints";
import { prepareMetricView } from "./prepareMetricView";
import type { TrainingPoint } from "./types";
import type {
  WorkerRequest,
  WorkerResponse,
} from "./workerTypes";

const scope = self as unknown as {
  postMessage(message: WorkerResponse): void;
  onmessage:
    | ((event: MessageEvent<WorkerRequest>) => void)
    | null;
};

const runs = generateRuns();

const byId = new Map(
  runs.map(run => [run.id, run])
);

const normalizedCache = new Map<
  string,
  TrainingPoint[]
>();

const summaryCache = new Map<
  string,
  ReturnType<typeof summarizeMetric>
>();

const notes = [
  "NaN measurement",
  "Infinite measurement",
  "Duplicate step",
  "Unsorted steps",
  "Missing steps",
  "1M points · single spike",
];

scope.postMessage({
  type: "ready",
  runs: runs.map((run, index) => ({
    id: run.id,
    name:
      index === 5
        ? "Million-point stress test"
        : run.name,
    count: run.points.length,
    note: notes[index] ?? "Standard series",
  })),
});

scope.onmessage = event => {
  const {
    requestId,
    runId,
    zoom,
    position,
  } = event.data;

  const started = performance.now();

  try {
    const run = byId.get(runId);

    if (!run) {
      throw new Error(
        "This training run could not be found."
      );
    }

    let normalized = normalizedCache.get(runId);

    if (!normalized) {
      normalized = normalizePoints(run.points);
      normalizedCache.set(runId, normalized);
    }

    let summary = summaryCache.get(runId);

    if (!summary) {
      summary = summarizeMetric(normalized, "loss");
      summaryCache.set(runId, summary);
    }

    const visible = getVisiblePoints(
      normalized,
      zoom,
      position
    );

    const metrics = (
      ["loss", "lr", "grad_norm"] as const
    ).map(metric =>
      prepareMetricView(visible, metric)
    );

    scope.postMessage({
      type: "view",
      view: {
        requestId,
        runId,
        originalCount: run.points.length,
        uniqueCount: normalized.length,
        visibleCount: visible.length,
        summary,
        metrics,
        zoom,
        position,
        processingMs: performance.now() - started,
        computedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    scope.postMessage({
      type: "error",
      requestId,
      message:
        error instanceof Error
          ? error.message
          : "Chart preparation failed.",
    });
  }
};