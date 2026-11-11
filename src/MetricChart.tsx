import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MetricView } from "./workerTypes";

const labels = {
  loss: "Loss",
  lr: "Learning rate",
  grad_norm: "Gradient norm",
};

const colors = {
  loss: "#e07b4f",
  lr: "#69c9a6",
  grad_norm: "#b59ce9",
};

const number = new Intl.NumberFormat("en", {
  maximumSignificantDigits: 5,
});

const precise = new Intl.NumberFormat("en", {
  maximumSignificantDigits: 9,
});

const integer = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});

export const MetricChart = memo(
  function MetricChart({ view }: { view: MetricView }) {
    const host = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(720);

    const [active, setActive] = useState<{
      view: MetricView;
      index: number;
      keyboard: boolean;
    } | null>(null);

    useEffect(() => {
      if (!host.current) return;

      const observer = new ResizeObserver(entries => {
        setWidth(
          Math.max(
            200,
            Math.floor(entries[0].contentRect.width)
          )
        );
      });

      observer.observe(host.current);

      return () => observer.disconnect();
    }, []);

    const label = labels[view.metric];
    const color = colors[view.metric];
    const height = 240;
    const left = 78;
    const right = 20;
    const top = 16;
    const bottom = 37;
    const domain = view.domain;

    const geometry = useMemo(() => {
      if (!view.domain) {
        return { paths: [], points: [] };
      }

      const d = view.domain;

      const x = (step: number) =>
        d.firstStep === d.lastStep
          ? (left + width - right) / 2
          : left +
            ((step - d.firstStep) /
              (d.lastStep - d.firstStep)) *
              (width - left - right);

      const y = (value: number) =>
        top +
        (1 - (value - d.min) / (d.max - d.min)) *
          (height - top - bottom);

      return {
        paths: view.segments.map(segment => ({
          key: segment[0].step,
          points: segment
            .map(
              point =>
                `${x(point.step)},${y(
                  point[view.metric]
                )}`
            )
            .join(" "),
          single: segment.length === 1,
          x: x(segment[0].step),
          y: y(segment[0][view.metric]),
        })),
        points: view.segments.flat().map(point => ({
          point,
          x: x(point.step),
          y: y(point[view.metric]),
        })),
      };
    }, [view, width]);

    const hovered =
      active?.view === view
        ? geometry.points[active.index]
        : undefined;

    const tickCount = width < 460 ? 2 : 4;

    const xTicks = domain
      ? [
          ...new Set(
            Array.from(
              { length: tickCount + 1 },
              (_, index) =>
                Math.round(
                  domain.firstStep +
                    ((domain.lastStep -
                      domain.firstStep) *
                      index) /
                      tickCount
                )
            )
          ),
        ]
      : [];

    function x(step: number) {
      if (
        !domain ||
        domain.firstStep === domain.lastStep
      ) {
        return (left + width - right) / 2;
      }

      return (
        left +
        ((step - domain.firstStep) /
          (domain.lastStep - domain.firstStep)) *
          (width - left - right)
      );
    }

    return (
      <figure className="metric-card">
        <figcaption className="metric-caption">
          <div>
            <span
              className="metric-line-key"
              style={{ background: color }}
            />
            <h3>{label}</h3>
            <span className="metric-code">
              {view.metric}
            </span>
          </div>

          <span>
            {integer.format(view.displayedCount)}{" "}
            plotted points
          </span>
        </figcaption>

        <div
          ref={host}
          className="plot"
          tabIndex={domain ? 0 : -1}
          role="group"
          aria-label={`${label} chart. Use left and right arrows to inspect displayed measurements.`}
          onFocus={() => {
            if (geometry.points.length) {
              setActive({
                view,
                index: 0,
                keyboard: true,
              });
            }
          }}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
          onPointerMove={event => {
            if (!domain || !geometry.points.length) {
              return;
            }

            const rect =
              event.currentTarget.getBoundingClientRect();

            const px =
              ((event.clientX - rect.left) /
                rect.width) *
              width;

            if (px < left || px > width - right) {
              setActive(null);
              return;
            }

            const step =
              domain.firstStep +
              ((px - left) /
                (width - left - right)) *
                (domain.lastStep - domain.firstStep);

            let lo = 0;
            let hi = geometry.points.length;

            while (lo < hi) {
              const middle = Math.floor((lo + hi) / 2);

              if (
                geometry.points[middle].point.step <
                step
              ) {
                lo = middle + 1;
              } else {
                hi = middle;
              }
            }

            let index = Math.min(
              lo,
              geometry.points.length - 1
            );

            if (
              index > 0 &&
              Math.abs(
                geometry.points[index - 1].point.step -
                  step
              ) <
                Math.abs(
                  geometry.points[index].point.step -
                    step
                )
            ) {
              index--;
            }

            setActive(previous =>
              previous?.view === view &&
              previous.index === index &&
              !previous.keyboard
                ? previous
                : {
                    view,
                    index,
                    keyboard: false,
                  }
            );
          }}
          onKeyDown={event => {
            if (
              !geometry.points.length ||
              ![
                "ArrowLeft",
                "ArrowRight",
                "Home",
                "End",
                "Escape",
              ].includes(event.key)
            ) {
              return;
            }

            event.preventDefault();

            if (event.key === "Escape") {
              setActive(null);
              return;
            }

            const index =
              active?.view === view
                ? active.index
                : 0;

            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? geometry.points.length - 1
                  : Math.max(
                      0,
                      Math.min(
                        geometry.points.length - 1,
                        index +
                          (event.key === "ArrowRight"
                            ? 1
                            : -1)
                      )
                    );

            setActive({
              view,
              index: next,
              keyboard: true,
            });
          }}
        >
          {!domain ? (
            <div className="empty-chart">
              <strong>
                No finite measurements in this window
              </strong>
              <p>
                Move the window or select a wider range.
              </p>
            </div>
          ) : (
            <>
              <svg
                width="100%"
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={`${label}: axis range ${precise.format(
                  domain.min
                )} to ${precise.format(
                  domain.max
                )}. ${
                  view.invalidCount
                } invalid values in the window.`}
              >
                {[0, 1, 2, 3, 4].map(index => {
                  const py =
                    top +
                    (index / 4) *
                      (height - top - bottom);

                  const value =
                    domain.max -
                    (index / 4) *
                      (domain.max - domain.min);

                  return (
                    <g key={index}>
                      <line
                        x1={left}
                        y1={py}
                        x2={width - right}
                        y2={py}
                        stroke="#292929"
                        strokeDasharray={
                          index === 4
                            ? undefined
                            : "3 4"
                        }
                      />
                      <text
                        x={left - 12}
                        y={py + 4}
                        textAnchor="end"
                      >
                        {number.format(value)}
                      </text>
                    </g>
                  );
                })}

                {xTicks.map(step => (
                  <text
                    key={step}
                    x={x(step)}
                    y={height - 14}
                    textAnchor={
                      step === domain.firstStep &&
                      domain.firstStep !==
                        domain.lastStep
                        ? "start"
                        : step === domain.lastStep &&
                            domain.firstStep !==
                              domain.lastStep
                          ? "end"
                          : "middle"
                    }
                  >
                    {integer.format(step)}
                  </text>
                ))}

                {geometry.paths.map(path =>
                  path.single ? (
                    <circle
                      key={path.key}
                      cx={path.x}
                      cy={path.y}
                      r={3}
                      fill={color}
                    />
                  ) : (
                    <polyline
                      key={path.key}
                      points={path.points}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.8}
                      strokeLinejoin="round"
                    />
                  )
                )}

                {hovered && (
                  <g>
                    <line
                      x1={hovered.x}
                      y1={top}
                      x2={hovered.x}
                      y2={height - bottom}
                      stroke="#7d7d7d"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={hovered.x}
                      cy={hovered.y}
                      r={4}
                      fill={color}
                      stroke="#111111"
                      strokeWidth={2}
                    />
                  </g>
                )}
              </svg>

              {hovered && (
                <div
                  className="chart-tooltip"
                  aria-live={
                    active?.keyboard
                      ? "polite"
                      : "off"
                  }
                  style={{
                    left: `${Math.min(
                      75,
                      Math.max(
                        12,
                        (hovered.x / width) * 100
                      )
                    )}%`,
                  }}
                >
                  <small>Displayed measurement</small>
                  <strong>
                    Step{" "}
                    {integer.format(
                      hovered.point.step
                    )}
                  </strong>
                  <span>
                    {label}
                    <b>
                      {precise.format(
                        hovered.point[view.metric]
                      )}
                    </b>
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="metric-footer">
          <span>
            {view.invalidCount ? (
              <span className="quality-warning">
                {integer.format(view.invalidCount)}{" "}
                invalid · line breaks preserved
              </span>
            ) : (
              "Finite values"
            )}
            {" · "}
            {view.segmentCount} segment
            {view.segmentCount === 1 ? "" : "s"}
          </span>

          <span>Training step · linear scale</span>
        </div>
      </figure>
    );
  }
);