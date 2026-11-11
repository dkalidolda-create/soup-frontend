# Soup Training Run Monitor

Frontend take-home built with React, TypeScript and Vite.

Live demo: https://soup-frontend.vercel.app
Repository: https://github.com/dkalidolda-create/soup-frontend

## Run locally

```bash
npm ci
npm run dev
```

## Validation

```bash
npm test
npm run build
```

The saved test output is in `test-results.txt`.

## Features

- 20 generated training runs with search and sorting.
- Loss, learning rate and gradient norm charts.
- Full-run loss summaries calculated before display sampling.
- Zoom, window positioning and inspection of displayed measurements.
- Background processing with a Web Worker.
- Loading, error, retry and empty-search states.
- Responsive layout and keyboard controls for chart inspection.

## Data handling

Points are sorted by training step. For duplicate steps, the last
measurement in input order wins.

Non-finite metric values are excluded from numeric summaries and
break the corresponding chart line. They are never converted to zero.

Missing integer steps also break the line. This assumes measurements
are expected at every integer step.

Charts use linear scales without smoothing. Constant series receive
padding so they remain visible.

Each continuous segment is sampled separately, retaining its bucket
endpoints and minimum/maximum values. This preserves the single spike
in the million-point fixture.

Tooltips inspect displayed sampled measurements, rather than every
original measurement. Summaries describe the entire normalized run,
even when a smaller window is displayed.

## Performance

Expensive processing runs in a Web Worker. The main thread receives
sampled chart data. Requests are debounced, and request IDs prevent
older responses from replacing newer selections.

A local production-preview load recording for the million-point run,
with Chrome CPU throttling at 4×, showed:

- First Contentful Paint: 139.5 ms.
- Longest observed main-thread task: 36.0 ms.
- Main-thread tasks longer than 50 ms: 0.
- Worker processing for the view request: approximately 171 ms.

FCP measures the first visible content, not completed charts.
Worker processing time is not end-to-end interaction latency.
These results are from one local recording, not the deployed site.

A comparable before/after benchmark, measured zoom and hover latency,
and total tab memory measurement remain incomplete.

## Verification limits

Automated tests cover data-processing and chart-preparation behavior;
they do not establish complete browser rendering or accessibility
correctness.

The deployed application was manually checked with an ordinary run
and the million-point run. Full mobile-device, screen-reader and
cross-browser testing remain outstanding.

The dataset is generated locally. Request IDs protect worker updates,
but real network races, server freshness and API failures have not
been tested. Displayed computation timestamps use UTC.

Logarithmic scales are not implemented.

## Verdict

SHIP as an internship demo.
DON'T SHIP as a production monitoring tool yet.

Before production, I would complete reproducible performance and
memory measurements, browser interaction tests and an accessibility
audit, then validate behavior with real training data.

## Reflection and AI assistance

The biggest surprise was that reducing SVG points alone did not remove
interaction delays: preparing large datasets could still block the
main thread. Moving this work into a Worker improved the architecture.

My main remaining concerns are memory consumption, measured interaction
latency and broader accessibility validation.

AI tools used: ChatGPT/Codex for learning, code generation,
debugging, styling, tests and performance-trace analysis.