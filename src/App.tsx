import { splitSegments } from "./splitSegments";
import { useMemo, useState } from "react";
import { normalizePoints } from "./normalizeData";
import { generateRuns } from "./generateData";
import "./App.css";
import { downsampleSegment } from "./downsample";
import { MetricChart } from "./MetricChart";

const runs = generateRuns();

export default function App() {
  const [selectedId, setSelectedId] = useState("run-1");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const selectedRun = runs.find(run => run.id === selectedId);

  const normalizedPoints = useMemo(
  () => selectedRun ? normalizePoints(selectedRun.points) : [],
  [selectedRun]
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
  () => splitSegments(normalizedPoints, "loss"),
  [normalizedPoints]
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

  return (
    // Your existing JSX stays here.
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
    <option value="points">Point count — smallest first</option>
  </select>
</label>

<p>Showing {visibleRuns.length} of {runs.length} runs</p>

{visibleRuns.length === 0 && <p>No matching runs.</p>}

      <ul>
        {visibleRuns.map(run => (
          <li key={run.id}>
            <button
              type="button"
              onClick={() => setSelectedId(run.id)}
              aria-pressed={selectedId === run.id}
            >
              {run.name}
            </button>
          </li>
        ))}
      </ul>

      {selectedRun && (
  <section aria-live="polite">
    <h2>{selectedRun.name}</h2>
    <p>Points: {selectedRun.points.length}</p>
    <p>Unique steps: {normalizedPoints.length}</p>

    <p>
      First steps:{" "}
      {normalizedPoints
        .slice(0, 3)
        .map(point => point.step)
        .join(", ")}
    </p>
    <p>Displayed loss points: {displayedLossCount}</p>
    <p>Continuous loss segments: {lossSegments.length}</p>
    <MetricChart
  label="Loss"
  metric="loss"
  points={normalizedPoints}
  segments={displayedLossSegments}
/>
  </section>
)}

    </main>
  );
}