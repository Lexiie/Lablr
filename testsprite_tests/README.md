# TestSprite Suite Guide

This folder contains a TestSprite-style automated suite for **Lablr**.

## What Is Here
- `TC001_...mjs` to `TC013_...mjs`: Standalone executable test cases.
- `run_testsuite.mjs`: Loads all `TC*.mjs` files, runs them in order, and generates reports.
- `run_with_server.sh`: Starts local dev server, waits for readiness, then runs the suite.
- `testsprite_frontend_test_plan.json`: Test plan manifest used as the suite index.
- `standard_prd.json`: Compact PRD context used to align coverage and acceptance criteria.
- `tmp/`: Temporary artifact directory placeholder.

## How To Run
1. Start tests with auto dev server:
   - `pnpm test:testsprite:dev`
2. Run tests against an already running server:
   - `pnpm test:testsprite`

Optional custom target URL:
- `TEST_BASE_URL=http://127.0.0.1:3001 pnpm test:testsprite`

## Generated Reports
After each run, artifacts are written to this folder:
- `testsprite-mcp-test-report.md`
- `testsprite-mcp-test-report.html`
- `testsprite-mcp-test-report.json`
- `results.json` (compatibility alias)
- `dev-server.log` (when using `run_with_server.sh`)

## Adding New Cases
1. Add a new file named `TC0XX_Descriptive_name.mjs`.
2. Export `id`, `title`, and `run(context)`.
3. Keep failures explicit with clear error messages.
4. Update `testsprite_frontend_test_plan.json` to include the new case.

Example skeleton:

```js
export const id = "TC014";
export const title = "Example case title";

export async function run({ baseUrl }) {
  const response = await fetch(`${baseUrl}/`);
  if (response.status !== 200) {
    throw new Error(`Expected 200, got ${response.status}`);
  }
  return "Example passed.";
}
```

