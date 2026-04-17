# TestSprite Assets

This folder contains the TestSprite MCP assets used by this project.

## Core Inputs
- `standard_prd.json` — standardized product requirements used as the testing baseline.
- `testsprite_frontend_test_plan.json` — frontend/API test plan generated for cloud execution.

## Generated Test Files
- `TC*.py` — Python test files generated/restored from the TestSprite plan.

## Current Test Case List
Latest cloud run context: `projectName=lablr`.

| ID | Test Case | Status | Notes |
| --- | --- | --- | --- |
| `TC001` | Landing page renders hero and upload section | `Pass` | Passed in latest TestSprite run. |
| `TC002` | Analyze endpoint rejects `GET` method | `Pass` | Passed in latest TestSprite run. |
| `TC003` | OCR endpoint rejects `GET` method | `Pass` | Passed in latest TestSprite run. |
| `TC004` | Header brand and navigation links are visible | `Pass` | Passed in latest TestSprite run. |
| `TC005` | Upload dropzone UI is visible | `Pass` | Passed in latest TestSprite run. |
| `TC006` | Image URL input is visible and supports typing | `Pass` | Passed in latest TestSprite run. |
| `TC007` | Run button starts disabled before input | `Pass` | Passed in latest TestSprite run. |
| `TC008` | Progress section shows three pipeline steps | `Pass` | Passed in latest TestSprite run. |
| `TC009` | Results section helper content is visible | `Pass` | Passed in latest TestSprite run. |
| `TC010` | Upload navigation link jumps to upload section | `Pass` | Passed in latest TestSprite run. |
| `TC011` | Progress navigation link jumps to progress section | `Pass` | Passed in latest TestSprite run. |
| `TC012` | Results navigation link jumps to results section | `Failed` | URL changed to `#results`, but no `id="results"` section was found on page. |
| `TC013` | Static assets are served | `Pass` | Passed in latest TestSprite run. |

## Runtime Files
- `tmp/config.json` — local MCP execution config.
- `tmp/mcp.log` — local MCP runtime logs.

## Setup
1. Set your API key in environment variables.
   - `TESTSPRITE_API_KEY=...`
2. Generate or refresh local MCP config.
   - `pnpm testsprite:mcp:setup`
3. Verify the TestSprite MCP package is available.
   - `pnpm testsprite:mcp:verify`

## Notes
- Legacy local JavaScript suite (`TC*.mjs`, `run_testsuite.mjs`) is intentionally removed.
- Test execution now relies on the cloud plan JSON files in this folder.
