#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
const ROOT_DIR = process.cwd();
const OUTPUT_DIR = path.join(ROOT_DIR, "testsprite_test");

function nowIso() {
  return new Date().toISOString();
}

async function runTest(id, title, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    return {
      id,
      title,
      status: "passed",
      duration_ms: Date.now() - startedAt,
      detail,
    };
  } catch (error) {
    return {
      id,
      title,
      status: "failed",
      duration_ms: Date.now() - startedAt,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

async function expectStatus(response, expected, bodyText) {
  if (response.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${response.status}. Body: ${bodyText.slice(0, 500)}`);
  }
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  return { response, text };
}

const tests = [
  {
    id: "TS-001",
    title: "Homepage responds with 200 and renders headline",
    fn: async () => {
      let lastStatus = 0;
      let text = "";

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const result = await fetchText(`${BASE_URL}/`);
        lastStatus = result.response.status;
        text = result.text;

        if (lastStatus === 200) {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 700));
      }

      if (lastStatus !== 200) {
        throw new Error(`Expected homepage status 200 after retries, got ${lastStatus}. Body: ${text.slice(0, 500)}`);
      }

      if (!text.includes("Decode product labels in a single pass")) {
        throw new Error("Headline not found in homepage response.");
      }
      return "Homepage loaded and headline present.";
    },
  },
  {
    id: "TS-002",
    title: "GET /api/analyze is method-restricted",
    fn: async () => {
      const { response, text } = await fetchText(`${BASE_URL}/api/analyze`);
      await expectStatus(response, 405, text);
      return "Method not allowed works as expected.";
    },
  },
  {
    id: "TS-003",
    title: "GET /api/ocr is method-restricted",
    fn: async () => {
      const { response, text } = await fetchText(`${BASE_URL}/api/ocr`);
      await expectStatus(response, 405, text);
      return "Method not allowed works as expected.";
    },
  },
  {
    id: "TS-004",
    title: "POST /api/analyze with empty JSON returns validation error",
    fn: async () => {
      const { response, text } = await fetchText(`${BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      await expectStatus(response, 400, text);
      if (!text.includes("image_url or image file is required")) {
        throw new Error("Expected validation message not found.");
      }
      return "Missing payload rejected correctly.";
    },
  },
  {
    id: "TS-005",
    title: "POST /api/analyze with text/plain payload returns validation error",
    fn: async () => {
      const { response, text } = await fetchText(`${BASE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "hello",
      });
      await expectStatus(response, 400, text);
      return "Unsupported content type is rejected without server crash.";
    },
  },
  {
    id: "TS-006",
    title: "POST /api/analyze multipart non-image file is rejected",
    fn: async () => {
      const form = new FormData();
      form.append("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");

      const { response, text } = await fetchText(`${BASE_URL}/api/analyze`, {
        method: "POST",
        body: form,
      });
      await expectStatus(response, 500, text);
      if (!text.includes("Unsupported file type")) {
        throw new Error("Expected unsupported file type error not found.");
      }
      return "Non-image file upload blocked.";
    },
  },
  {
    id: "TS-007",
    title: "POST /api/analyze rejects file larger than upload limit",
    fn: async () => {
      const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
      const form = new FormData();
      form.append("file", new Blob([bytes], { type: "image/png" }), "too-large.png");

      const { response, text } = await fetchText(`${BASE_URL}/api/analyze`, {
        method: "POST",
        body: form,
      });
      await expectStatus(response, 500, text);
      if (!text.includes("File too large")) {
        throw new Error("Expected file size validation message not found.");
      }
      return "Analyze endpoint enforces max upload size.";
    },
  },
  {
    id: "TS-008",
    title: "POST /api/ocr with empty form-data returns 400",
    fn: async () => {
      const form = new FormData();
      const { response, text } = await fetchText(`${BASE_URL}/api/ocr`, {
        method: "POST",
        body: form,
      });
      await expectStatus(response, 400, text);
      if (!text.includes("Provide 'file' or 'image_url'")) {
        throw new Error("Expected ocr payload validation message not found.");
      }
      return "OCR endpoint validates required input.";
    },
  },
  {
    id: "TS-009",
    title: "TestSprite runner scripts exist and are executable",
    fn: async () => {
      const suitePath = path.join(ROOT_DIR, "testsprite_test", "run_testsuite.mjs");
      const wrapperPath = path.join(ROOT_DIR, "testsprite_test", "run_with_server.sh");

      const [suiteStat, wrapperStat] = await Promise.all([fs.stat(suitePath), fs.stat(wrapperPath)]);
      const ownerExecSuite = Boolean(suiteStat.mode & 0o100);
      const ownerExecWrapper = Boolean(wrapperStat.mode & 0o100);

      if (!ownerExecSuite || !ownerExecWrapper) {
        throw new Error("Expected testsprite scripts to be executable for local runs.");
      }

      return "testsprite_test runner scripts are present and executable.";
    },
  },
  {
    id: "TS-010",
    title: "Static asset /next.svg is served",
    fn: async () => {
      const { response, text } = await fetchText(`${BASE_URL}/next.svg`);
      await expectStatus(response, 200, text);
      if (!text.includes("svg")) {
        throw new Error("SVG response body does not look correct.");
      }
      return "Static SVG asset served correctly.";
    },
  },
  {
    id: "TS-011",
    title: "Favicon endpoint is served",
    fn: async () => {
      const response = await fetch(`${BASE_URL}/favicon.ico`);
      if (response.status !== 200) {
        const text = await response.text();
        throw new Error(`Expected 200, got ${response.status}. Body: ${text.slice(0, 200)}`);
      }
      return "Favicon endpoint returned 200.";
    },
  },
  {
    id: "TS-012",
    title: "Local MCP data files exist and are non-empty",
    fn: async () => {
      const glossaryPath = path.join(ROOT_DIR, "mcp", "file-server", "mini_glossary.json");
      const rulesPath = path.join(ROOT_DIR, "mcp", "file-server", "risk_rules.json");
      const [glossaryRaw, rulesRaw] = await Promise.all([
        fs.readFile(glossaryPath, "utf8"),
        fs.readFile(rulesPath, "utf8"),
      ]);

      if (glossaryRaw.trim().length < 5 || rulesRaw.trim().length < 5) {
        throw new Error("MCP data files are unexpectedly empty.");
      }
      return "mini_glossary.json and risk_rules.json are present and non-empty.";
    },
  },
  {
    id: "TS-013",
    title: "Project default upload limit is documented as 10 MB",
    fn: async () => {
      const [envExample, readme] = await Promise.all([
        fs.readFile(path.join(ROOT_DIR, ".env.example"), "utf8"),
        fs.readFile(path.join(ROOT_DIR, "README.md"), "utf8"),
      ]);

      if (!envExample.includes("OCR_UPLOAD_MAX_MB=10")) {
        throw new Error(".env.example does not document OCR_UPLOAD_MAX_MB=10");
      }
      if (!readme.includes('OCR_UPLOAD_MAX_MB="10"')) {
        throw new Error("README.md does not document OCR_UPLOAD_MAX_MB=10");
      }
      return "Upload limit is documented consistently in project docs.";
    },
  },
];

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const startedAt = nowIso();
  const results = [];
  for (const test of tests) {
    const result = await runTest(test.id, test.title, test.fn);
    results.push(result);
  }
  const finishedAt = nowIso();

  const passed = results.filter((item) => item.status === "passed").length;
  const failed = results.length - passed;

  const report = {
    suite: "TestSprite-style project verification",
    started_at: startedAt,
    finished_at: finishedAt,
    base_url: BASE_URL,
    total: results.length,
    passed,
    failed,
    results,
  };

  const jsonPath = path.join(OUTPUT_DIR, "results.json");
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");

  const markdownLines = [
    "# TestSprite Test Results",
    "",
    `- Started: ${startedAt}`,
    `- Finished: ${finishedAt}`,
    `- Base URL: ${BASE_URL}`,
    `- Total: ${report.total}`,
    `- Passed: ${passed}`,
    `- Failed: ${failed}`,
    "",
    "## Cases",
    "",
  ];

  for (const item of results) {
    const icon = item.status === "passed" ? "PASS" : "FAIL";
    markdownLines.push(`- [${icon}] ${item.id} - ${item.title}`);
    markdownLines.push(`  - Detail: ${item.detail}`);
    markdownLines.push(`  - Duration: ${item.duration_ms} ms`);
  }

  markdownLines.push("");
  markdownLines.push(`JSON report: ${path.relative(ROOT_DIR, jsonPath)}`);

  const mdPath = path.join(OUTPUT_DIR, "results.md");
  await fs.writeFile(mdPath, `${markdownLines.join("\n")}\n`, "utf8");

  console.log(`Test run complete. Passed ${passed}/${results.length}.`);
  console.log(`Saved: ${path.relative(ROOT_DIR, mdPath)}`);
  console.log(`Saved: ${path.relative(ROOT_DIR, jsonPath)}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
