#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { BASE_URL, ROOT_DIR, TESTSPRITE_DIR, ensureOutputDir, nowIso } from "./lib/testkit.mjs";

const TEST_FILE_PATTERN = /^TC\d+_.+\.mjs$/;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compareTestsById(a, b) {
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

async function loadCases() {
  const files = (await fs.readdir(TESTSPRITE_DIR))
    .filter((file) => TEST_FILE_PATTERN.test(file))
    .sort();

  if (files.length === 0) {
    throw new Error("No TestSprite cases found. Expected files like TC001_*.mjs in testsprite_tests/");
  }

  const cases = [];
  for (const file of files) {
    const modulePath = path.join(TESTSPRITE_DIR, file);
    const imported = await import(pathToFileURL(modulePath).href);
    if (typeof imported.run !== "function") {
      throw new Error(`Case file ${file} is missing an exported run() function.`);
    }

    const id = imported.id || file.split("_")[0];
    const title = imported.title || file;
    cases.push({ id, title, run: imported.run, file });
  }

  return cases.sort(compareTestsById);
}

async function runCase(testCase) {
  const startedAtMs = Date.now();
  const context = {
    baseUrl: BASE_URL,
    rootDir: ROOT_DIR,
    testsDir: TESTSPRITE_DIR,
  };

  try {
    const detail = await testCase.run(context);
    return {
      id: testCase.id,
      title: testCase.title,
      file: testCase.file,
      status: "passed",
      detail,
      duration_ms: Date.now() - startedAtMs,
    };
  } catch (error) {
    return {
      id: testCase.id,
      title: testCase.title,
      file: testCase.file,
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
      duration_ms: Date.now() - startedAtMs,
    };
  }
}

function renderMarkdown(report) {
  const lines = [
    "# TestSprite MCP Test Report",
    "",
    `- Started: ${report.started_at}`,
    `- Finished: ${report.finished_at}`,
    `- Base URL: ${report.base_url}`,
    `- Total Cases: ${report.summary.total}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    "",
    "## Case Results",
    "",
  ];

  for (const result of report.results) {
    const status = result.status === "passed" ? "PASS" : "FAIL";
    lines.push(`- [${status}] ${result.id} - ${result.title}`);
    lines.push(`  - File: ${result.file}`);
    lines.push(`  - Detail: ${result.detail}`);
    lines.push(`  - Duration: ${result.duration_ms} ms`);
  }

  return `${lines.join("\n")}\n`;
}

function renderHtml(report) {
  const rows = report.results
    .map((result) => {
      const statusClass = result.status === "passed" ? "ok" : "bad";
      const status = result.status.toUpperCase();

      return `<tr>
  <td>${escapeHtml(result.id)}</td>
  <td>${escapeHtml(result.title)}</td>
  <td><span class="status ${statusClass}">${escapeHtml(status)}</span></td>
  <td>${escapeHtml(result.file)}</td>
  <td>${escapeHtml(String(result.duration_ms))} ms</td>
  <td>${escapeHtml(result.detail)}</td>
</tr>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>TestSprite MCP Test Report</title>
  <style>
    :root { color-scheme: dark; }
    body {
      margin: 0;
      padding: 24px;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      background: #0a0a0a;
      color: #f2f2f2;
    }
    h1 { margin: 0 0 8px; }
    .meta { color: #a3a3a3; margin-bottom: 20px; }
    .chip {
      display: inline-block;
      margin-right: 10px;
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 12px;
      border: 1px solid #262626;
      background: #111;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      background: #111;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid #242424;
      vertical-align: top;
      font-size: 13px;
    }
    th { color: #a3a3a3; font-weight: 600; }
    .status {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .status.ok { background: #14532d; color: #86efac; }
    .status.bad { background: #7f1d1d; color: #fca5a5; }
  </style>
</head>
<body>
  <h1>TestSprite MCP Test Report</h1>
  <div class="meta">
    <span class="chip">Base URL: ${escapeHtml(report.base_url)}</span>
    <span class="chip">Total: ${escapeHtml(String(report.summary.total))}</span>
    <span class="chip">Passed: ${escapeHtml(String(report.summary.passed))}</span>
    <span class="chip">Failed: ${escapeHtml(String(report.summary.failed))}</span>
  </div>
  <p class="meta">Started ${escapeHtml(report.started_at)} • Finished ${escapeHtml(report.finished_at)}</p>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Status</th>
        <th>File</th>
        <th>Duration</th>
        <th>Detail</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
</body>
</html>
`;
}

async function main() {
  await ensureOutputDir();

  const startedAt = nowIso();
  const testCases = await loadCases();
  const results = [];

  for (const testCase of testCases) {
    const result = await runCase(testCase);
    results.push(result);
    const indicator = result.status === "passed" ? "PASS" : "FAIL";
    console.log(`[${indicator}] ${result.id} ${result.title}`);
  }

  const summary = {
    total: results.length,
    passed: results.filter((item) => item.status === "passed").length,
    failed: results.filter((item) => item.status === "failed").length,
  };

  const finishedAt = nowIso();
  const report = {
    suite: "TestSprite frontend validation",
    started_at: startedAt,
    finished_at: finishedAt,
    base_url: BASE_URL,
    summary,
    results,
  };

  const md = renderMarkdown(report);
  const html = renderHtml(report);

  await Promise.all([
    fs.writeFile(path.join(TESTSPRITE_DIR, "testsprite-mcp-test-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    fs.writeFile(path.join(TESTSPRITE_DIR, "testsprite-mcp-test-report.md"), md, "utf8"),
    fs.writeFile(path.join(TESTSPRITE_DIR, "testsprite-mcp-test-report.html"), html, "utf8"),
    fs.writeFile(path.join(TESTSPRITE_DIR, "results.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  ]);

  console.log(`\nCompleted ${summary.total} cases: ${summary.passed} passed, ${summary.failed} failed.`);
  console.log("Artifacts:");
  console.log("- testsprite_tests/testsprite-mcp-test-report.md");
  console.log("- testsprite_tests/testsprite-mcp-test-report.html");
  console.log("- testsprite_tests/testsprite-mcp-test-report.json");

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});

