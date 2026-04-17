<h1 align="center">Lablr</h1>

<p align="center">
  <img src="assets/hero-screenshot.png" alt="Lablr Hero UI" width="960" />
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.2.4-black?logo=nextdotjs" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" />
  <img alt="OCR.space" src="https://img.shields.io/badge/OCR.space-API-0EA5E9" />
  <img alt="Gemini" src="https://img.shields.io/badge/Gemini-2.5%20Flash-7C3AED" />
  <img alt="TestSprite MCP" src="https://img.shields.io/badge/TestSprite-MCP-22C55E" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-16A34A" />
</p>

## Overview
Lablr turns dense product labels into plain-language ingredient and risk insights in seconds.

Built for everyday consumers, Lablr helps you move from **"What does this label even say?"** to **"I know what this ingredient does and how risky it might be."**

Upload a label photo (or provide an image URL), let OCR extract the raw text, and get structured explanations with risk hints, confidence signals, and source references.

Whether you are scanning skincare, food, or OTC packaging, Lablr is designed to make label intelligence fast, transparent, and practical.

## Features
- OCR with OCR.space (no Mastra pipeline, no Docker/Nosana dependencies).
- Ingredient, warning, and claim extraction with domain guessing.
- Language detection for localized explanation output.
- Optional external lookups (OpenFoodFacts/OpenBeautyFacts) to enrich explanations.
- Clean Next.js App Router UI with upload, progress steps, and results table.

## Architecture
- `agent/ocr.ts`: Calls OCR.space and normalizes OCR output into `OCRResult`.
- `agent/explain.ts`: Builds user-friendly ingredient explanations using local glossary + optional external lookups.
- `src/app/api/analyze/route.ts`: Main API endpoint for upload/URL analysis.
- `src/app/page.tsx`: UI flow and rendering.
- `mcp/file-server/*`: Local glossary and risk rules.

## Environment
Create `.env.local` (or `.env`) with:

```bash
OCR_SPACE_API_KEY="helloworld-or-your-key"
# OCR_SPACE_API_BASE="https://api.ocr.space/parse/image"
# OCR_SPACE_ENGINE="2"
# OCR_SPACE_LANGUAGE="auto"
# OCR_UPLOAD_MAX_MB="10"

# Optional OCR fallback (used if OCR.Space fails)
# OPTIIC_API_KEY="your-optiic-api-key"
# OPTIIC_API_BASE="https://api.optiic.dev/process"
# OPTIIC_DOWNLOAD_MAX_MB="5"

# For explanation stage (Gemini)
GEMINI_API_KEY="your-gemini-api-key"
# GEMINI_API_BASE="https://generativelanguage.googleapis.com/v1beta"
# GEMINI_MODEL="gemini-2.5-flash"
# GEMINI_FALLBACK_MODEL="gemini-2.0-flash"

```

## Flow
1. Upload image or send `image_url` to `POST /api/analyze`.
2. OCR route extracts text via OCR.space.
3. Parser normalizes OCR into domain, ingredients, warnings, claims, a>
4. Explanation route enriches and returns readable summaries.


## Scripts
- `pnpm dev` — run Next.js dev server.
- `pnpm build` — production build.
- `pnpm start` — run production server.
- `pnpm lint` — lint project.
- `pnpm testsprite:mcp:setup` — generate local `.mcp.json` using `TESTSPRITE_API_KEY`.
- `pnpm testsprite:mcp:verify` — verify TestSprite MCP package is reachable.

## AI-Powered Testing with TestSprite
Lablr uses TestSprite MCP for cloud-based, credit-tracked test generation and execution.

### Setup
- Set `TESTSPRITE_API_KEY` in your environment.
- Run `pnpm testsprite:mcp:setup` to generate/update `.mcp.json`.
- Run `pnpm testsprite:mcp:verify` to verify the MCP package is reachable.

### TestSprite Assets
- `testsprite_tests/standard_prd.json` stores the standardized PRD used for test generation.
- `testsprite_tests/testsprite_frontend_test_plan.json` stores the generated frontend/API test plan.
- `testsprite_tests/TC*.py` stores Python test files generated/restored from the plan.
- `testsprite_tests/tmp/mcp.log` stores local MCP runtime logs.

### Current Test Case Coverage
Latest cloud run context: `projectName=lablr`.

| ID | Test Case | Status | Notes |
| --- | --- | --- | --- |
| `TC001` | Landing page renders hero and upload section | `Pass` | Passed in latest TestSprite run. |
| `TC002` | Analyze endpoint rejects `GET` requests | `Pass` | Passed in latest TestSprite run. |
| `TC003` | OCR endpoint rejects `GET` requests | `Pass` | Passed in latest TestSprite run. |
| `TC004` | Header brand and navigation links are visible | `Pass` | Passed in latest TestSprite run. |
| `TC005` | Upload dropzone UI is visible | `Pass` | Passed in latest TestSprite run. |
| `TC006` | Image URL input is visible and supports typing | `Pass` | Passed in latest TestSprite run. |
| `TC007` | Run button starts disabled before input | `Pass` | Passed in latest TestSprite run. |
| `TC008` | Progress section shows the three pipeline steps | `Pass` | Passed in latest TestSprite run. |
| `TC009` | Results helper section is visible | `Pass` | Passed in latest TestSprite run. |
| `TC010` | Upload nav link scrolls to upload section | `Pass` | Passed in latest TestSprite run. |
| `TC011` | Progress nav link scrolls to progress section | `Pass` | Passed in latest TestSprite run. |
| `TC012` | Results nav link scrolls to results section | `Failed` | URL changed to `#results`, but no `id="results"` section was found on page. |
| `TC013` | Static assets are served correctly | `Pass` | Passed in latest TestSprite run. |

### Notes
- The setup script preserves existing MCP server entries in `.mcp.json`.

## License
MIT. See `LICENSE`.
