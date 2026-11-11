import type { Metric, TrainingPoint } from "./types";
import type { summarizeMetric } from "./summarize";

export type RunInfo = {
  id: string;
  name: string;
  count: number;
  note: string;
};

export type MetricView = {
  metric: Metric;
  segments: TrainingPoint[][];
  domain: {
    firstStep: number;
    lastStep: number;
    min: number;
    max: number;
  } | null;
  invalidCount: number;
  segmentCount: number;
  displayedCount: number;
};

export type RunView = {
  requestId: number;
  runId: string;
  originalCount: number;
  uniqueCount: number;
  visibleCount: number;
  summary: ReturnType<typeof summarizeMetric>;
  metrics: MetricView[];
  zoom: number;
  position: number;
  processingMs: number;
  computedAt: string;
};

export type WorkerRequest = {
  requestId: number;
  runId: string;
  zoom: number;
  position: number;
};

export type WorkerResponse =
  | { type: "ready"; runs: RunInfo[] }
  | { type: "view"; view: RunView }
  | {
      type: "error";
      requestId: number;
      message: string;
    };