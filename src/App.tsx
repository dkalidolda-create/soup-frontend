import { useDeferredValue, useMemo, useState } from "react";
import { splitSegments } from "./splitSegments";
import { normalizePoints } from "./normalizeData";
import { generateRuns } from "./generateData";
import { downsampleSegment } from "./downsample";
import { MetricChart } from "./MetricChart";
import { summarizeMetric } from "./summarize";
import { getVisiblePoints } from "./getVisiblePoints";
import "./App.css";

const runs = generateRuns();

export default function App() {
  const [selectedId, setSelectedId] = useState("run-1");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState(50);
  const deferredZoom = useDeferredValue(zoom);
  const deferredPosition = useDeferredValue(position);

  const isUpdating =
  zoom !== deferredZoom || position !== deferredPosition;
  const selectedRun = runs.find(run => run.id === selectedId);

  const normalizedPoints = useMemo(
    () => selectedRun ? normalizePoints(selectedRun.points) : [],
    [selectedRun]
  );

  const visiblePoints = useMemo(
  () => getVisiblePoints(
    normalizedPoints,
    deferredZoom,
    deferredPosition
  ),
  [normalizedPoints, deferredZoom, deferredPosition]
);

  const lossSummary = useMemo(
    () => summarizeMetric(normalizedPoints, "loss"),
    [normalizedPoints]
  );

  const visibleRuns = runs
    .filter(run =>
      run.name.toLowerCase().includes(query.trim().toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "points") {
        return a.points.length - b.points.length;
      }

      return a.name.localeCompare(b.name, "en", { numeric: true });
    });

  const lossSegments = useMemo(
    () => splitSegments(visiblePoints, "loss"),
    [visiblePoints]
  );

  const displayedLossSegments = useMemo(
    () => lossSegments.map(segment =>
      downsampleSegment(segment, "loss")
    ),
    [lossSegments]
  );

  const displayedLossCount = displayedLossSegments.reduce(
    (total, segment) => total + segment.length,
    0
  );

  const learningRateSegments = useMemo(
    () => splitSegments(visiblePoints, "lr").map(segment =>
      downsampleSegment(segment, "lr")
    ),
    [visiblePoints]
  );

  const gradientSegments = useMemo(
    () => splitSegments(visiblePoints, "grad_norm").map(segment =>
      downsampleSegment(segment, "grad_norm")
    ),
    [visiblePoints]
  );

  return (
    <main>
      <h1>Training Run Monitor</h1>

      <label>
        Search runs:
        <input
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>

      <label>
        Sort by:
        <select
          value={sortBy}
          onChange={event => setSortBy(event.target.value)}
        >
          <option value="name">Name</option>
          <option value="points">
            Point count — smallest first
          </option>
        </select>
      </label>

      <p>
        Showing {visibleRuns.length} of {runs.length} runs
      </p>

      {visibleRuns.length === 0 && <p>No matching runs.</p>}

      <ul>
        {visibleRuns.map(run => (
          <li key={run.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedId(run.id);
                setZoom(1);
                setPosition(50);
              }}
              aria-pressed={selectedId === run.id}
            >
              {run.name}
            </button>
          </li>
        ))}
      </ul>

      {selectedRun && (
        <section>
          <h2>{selectedRun.name}</h2>

          <h3>Full-run summary</h3>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <dt>Latest loss</dt>
              <dd>
                {lossSummary.latest?.toPrecision(4) ?? "Unavailable"}
              </dd>
            </div>

            <div>
              <dt>Minimum loss</dt>
              <dd>
                {lossSummary.minimum?.toPrecision(4) ?? "Unavailable"}
              </dd>
            </div>

            <div>
              <dt>Peak loss</dt>
              <dd>
                {lossSummary.maximum?.toPrecision(4) ?? "Unavailable"}
              </dd>
            </div>

            <div>
              <dt>Invalid loss measurements</dt>
              <dd>{lossSummary.invalidCount}</dd>
            </div>
          </dl>

          <p>Points: {selectedRun.points.length}</p>
          <p>Unique steps: {normalizedPoints.length}</p>

          <label>
            Zoom:
            <select
              value={zoom}
              onChange={event => setZoom(Number(event.target.value))}
            >
              <option value={1}>Full range</option>
              <option value={2}>2×</option>
              <option value={10}>10×</option>
              <option value={100}>100×</option>
              <option value={1000}>1000×</option>
            </select>
          </label>

          <label>
            Window position: {position}%
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={position}
              disabled={zoom === 1}
              onChange={event =>
                setPosition(Number(event.target.value))
              }
            />
          </label>

          <p>Measurements in this window: {visiblePoints.length}</p>
          <p>Displayed loss points: {displayedLossCount}</p>
          <p>Continuous loss segments: {lossSegments.length}</p>

          <p role="status">
  {isUpdating
    ? "Updating charts…"
    : `Showing ${deferredZoom}× zoom at ${deferredPosition}%`}
</p>

          <MetricChart
            label="Loss"
            metric="loss"
            points={visiblePoints}
            segments={displayedLossSegments}
          />

          <MetricChart
            label="Learning rate"
            metric="lr"
            points={visiblePoints}
            segments={learningRateSegments}
          />

          <MetricChart
            label="Gradient norm"
            metric="grad_norm"
            points={visiblePoints}
            segments={gradientSegments}
          />
        </section>
      )}
    </main>
  );
}