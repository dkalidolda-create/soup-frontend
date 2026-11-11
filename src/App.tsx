import { useEffect, useMemo, useRef, useState } from "react";
import { MetricChart } from "./MetricChart";
import type {
  RunInfo,
  RunView,
  WorkerResponse,
} from "./workerTypes";
import "./App.css";

const integer = new Intl.NumberFormat("en");

const decimal = new Intl.NumberFormat("en", {
  maximumSignificantDigits: 5,
});

function formatValue(value: number | null) {
  return value === null ? "Unavailable" : decimal.format(value);
}

export default function App() {
  const [runs, setRuns] = useState<RunInfo[]>([]);
  const [selectedId, setSelectedId] = useState(
  () =>
    new URLSearchParams(window.location.search).get("run") ||
    "run-1"
  );
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState(50);
  const [view, setView] = useState<RunView | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const latestRequest = useRef(0);

  useEffect(() => {
    const worker = new Worker(
      new URL("./chart.worker.ts", import.meta.url),
      { type: "module" }
    );

    workerRef.current = worker;

    worker.onmessage = (
      event: MessageEvent<WorkerResponse>
    ) => {
      const message = event.data;

      if (message.type === "ready") {
        setRuns(message.runs);
        return;
      }

      const requestId =
        message.type === "view"
          ? message.view.requestId
          : message.requestId;

      if (requestId !== latestRequest.current) return;

      setBusy(false);

      if (message.type === "error") {
        setError(message.message);
      } else {
        setView(message.view);
        setError(null);
      }
    };

    worker.onerror = () => {
      setBusy(false);
      setError(
        "The data worker could not start. Reload the page to try again."
      );
    };

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (runs.length === 0) return;

    const requestId = ++latestRequest.current;

    setBusy(true);
    setError(null);

    const timer = window.setTimeout(() => {
      workerRef.current?.postMessage({
        requestId,
        runId: selectedId,
        zoom,
        position,
      });
    }, 70);

    return () => window.clearTimeout(timer);
  }, [runs, selectedId, zoom, position, retry]);

  const visibleRuns = useMemo(
    () =>
      runs
        .filter(run =>
          `${run.name} ${run.id} ${run.note}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
        )
        .sort((a, b) =>
          sortBy === "points"
            ? a.count - b.count
            : a.name.localeCompare(b.name, "en", {
                numeric: true,
              })
        ),
    [runs, query, sortBy]
  );

  const selectedRun = runs.find(
    run => run.id === selectedId
  );

  const current =
    view?.runId === selectedId ? view : null;

  function selectRun(id: string) {
    if (id === selectedId) return;

    latestRequest.current++;
    setSelectedId(id);
    setZoom(1);
    setPosition(50);
    setBusy(true);
    setError(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main">
          <span className="brand-mark" aria-hidden="true" />
          <span>
            Soup
            <span className="brand-divider">/</span>
            <span className="brand-product">
              training monitor
            </span>
          </span>
        </a>

        <div className="header-meta">
          <span className="status-dot" />
          Local dataset
          <span className="demo-badge">DEMO</span>
        </div>
      </header>

      <div className="workspace">
        <aside
          className="sidebar"
          aria-label="Training runs"
        >
          <div className="sidebar-heading">
            <h2>Training runs</h2>
            <span className="count-badge">
              {runs.length || "—"}
            </span>
          </div>

          <p className="sidebar-description">
            Select a run to inspect its metrics.
          </p>

          <label className="search-field">
            <span className="sr-only">
              Search training runs
            </span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              type="search"
              placeholder="Search runs…"
              value={query}
              onChange={event =>
                setQuery(event.target.value)
              }
            />
          </label>

          <label className="sort-field">
            <span>Sort by</span>
            <select
              value={sortBy}
              onChange={event =>
                setSortBy(event.target.value)
              }
            >
              <option value="name">Run name</option>
              <option value="points">Point count</option>
            </select>
          </label>

          <p className="list-count">
            {runs.length
              ? `${visibleRuns.length} of ${runs.length} runs`
              : "Preparing dataset…"}
          </p>

          <ul className="run-list">
            {visibleRuns.map(run => (
              <li key={run.id}>
                <button
                  type="button"
                  className={`run-button ${
                    selectedId === run.id
                      ? "is-selected"
                      : ""
                  }`}
                  aria-pressed={selectedId === run.id}
                  onClick={() => selectRun(run.id)}
                >
                  <span
                    className={`run-indicator ${
                      run.note === "Standard series"
                        ? ""
                        : "has-note"
                    }`}
                  />
                  <span className="run-copy">
                    <strong>{run.name}</strong>
                    <small>{run.note}</small>
                  </span>
                  <span className="run-size">
                    {run.count >= 1_000_000
                      ? "1M"
                      : integer.format(run.count)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {runs.length > 0 &&
            visibleRuns.length === 0 && (
              <div className="empty-list">
                <strong>No matching runs</strong>
                <p>
                  Try a different name or clear your search.
                </p>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </div>
            )}

          <div className="sidebar-footer">
            <span className="status-dot" />
            Deterministic synthetic data
          </div>
        </aside>

        <main id="main" className="main-panel">
          <div className="breadcrumb">
            Workspace
            <span>/</span>
            Training runs
            <span>/</span>
            <strong>
              {selectedRun?.id ?? "Loading"}
            </strong>
          </div>

          <div className="page-heading">
            <div>
              <div className="eyebrow">RUN OVERVIEW</div>
              <h1>
                {selectedRun?.name ??
                  "Preparing your workspace"}
              </h1>
              <p>
                Training metrics, data quality, and the
                details that matter.
              </p>
            </div>
            <span className="outline-badge">
              {selectedRun?.note ?? "Initializing"}
            </span>
          </div>

          {error && (
            <div className="error-banner" role="alert">
              <strong>Unable to update the charts.</strong>
              <span>{error}</span>
              <button
                type="button"
                onClick={() =>
                  runs.length
                    ? setRetry(previous => previous + 1)
                    : window.location.reload()
                }
              >
                Try again
              </button>
            </div>
          )}

          {current && (
            <>
              <div className="section-label">
                <h2>Full-run summary</h2>
                <span>
                  Calculated before display sampling
                </span>
              </div>

              <dl className="summary-grid">
                <div className="summary-card">
                  <dt>Latest loss</dt>
                  <dd>
                    {formatValue(current.summary.latest)}
                  </dd>
                  <span>Final recorded measurement</span>
                </div>

                <div className="summary-card">
                  <dt>Minimum loss</dt>
                  <dd>
                    {formatValue(current.summary.minimum)}
                  </dd>
                  <span>Finite measurements only</span>
                </div>

                <div className="summary-card">
                  <dt>Peak loss</dt>
                  <dd>
                    {formatValue(current.summary.maximum)}
                  </dd>
                  <span>Full-run maximum</span>
                </div>

                <div
                  className={`summary-card ${
                    current.summary.invalidCount
                      ? "has-warning"
                      : ""
                  }`}
                >
                  <dt>Invalid loss values</dt>
                  <dd>
                    {integer.format(
                      current.summary.invalidCount
                    )}
                  </dd>
                  <span>
                    {current.originalCount -
                      current.uniqueCount}{" "}
                    duplicate steps resolved
                  </span>
                </div>
              </dl>
            </>
          )}

          <section
            className="metrics-section"
            aria-labelledby="metrics-title"
            aria-busy={busy}
          >
            <div className="metrics-heading">
              <div>
                <h2 id="metrics-title">
                  Metric explorer
                </h2>
                <p>
                  Linear scales. Gaps remain visible.
                  No smoothing.
                </p>
              </div>

              <div
                className={`update-status ${
                  busy ? "is-busy" : ""
                }`}
                role="status"
              >
                <span
                  className={
                    busy ? "spinner" : "status-dot"
                  }
                />
                {busy
                  ? "Updating charts…"
                  : error
                    ? "Update failed"
                    : "Up to date"}
              </div>
            </div>

            <div className="chart-toolbar">
              <label className="zoom-field">
                <span>Zoom</span>
                <select
                  value={zoom}
                  disabled={!selectedRun}
                  onChange={event => {
                    latestRequest.current++;
                    setBusy(true);
                    setZoom(Number(event.target.value));
                  }}
                >
                  <option value={1}>Full range</option>
                  <option value={2}>2×</option>
                  <option value={10}>10×</option>
                  <option value={100}>100×</option>
                  <option value={1000}>1000×</option>
                </select>
              </label>

              <label
                className={`position-field ${
                  zoom === 1 ? "is-disabled" : ""
                }`}
              >
                <span>
                  Window position
                  <strong>
                    {position.toFixed(1)}%
                  </strong>
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.1}
                  value={position}
                  disabled={zoom === 1 || !selectedRun}
                  onChange={event => {
                    const next = Number(
                      event.target.value
                    );

                    if (next !== position) {
                      latestRequest.current++;
                      setBusy(true);
                      setPosition(next);
                    }
                  }}
                />
              </label>

              <div className="window-count">
                <span>Visible measurements</span>
                <strong>
                  {current
                    ? integer.format(
                        current.visibleCount
                      )
                    : "—"}
                </strong>
              </div>
            </div>

            {!current && !error && (
              <div className="loading-state">
                <span className="spinner" />
                <h3>
                  {runs.length
                    ? "Preparing the selected run"
                    : "Generating the training dataset"}
                </h3>
                <p>
                  Large-series processing runs in a
                  background worker.
                </p>
              </div>
            )}

            {current && (
              <>
                <p className="actual-window">
                  Displayed window:{" "}
                  {current.zoom === 1
                    ? "full range"
                    : `${current.zoom}× zoom`}
                  {" · "}position{" "}
                  {current.position.toFixed(1)}%
                  {busy &&
                    " · previous view while updating"}
                </p>

                <div className="charts-stack">
                  {current.metrics.map(metric => (
                    <MetricChart
                      key={metric.metric}
                      view={metric}
                    />
                  ))}
                </div>
              </>
            )}
          </section>

          <footer className="page-footer">
            <span>
              Min/max sampling preserves bucket extrema.
              Values are rounded for display.
            </span>
            <span>
              {current
                ? `${integer.format(
                    current.uniqueCount
                  )} unique steps · computed ${new Date(
                    current.computedAt
                  )
                    .toISOString()
                    .slice(11, 19)} UTC`
                : "All timestamps in UTC"}
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}