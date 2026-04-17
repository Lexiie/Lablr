import fs from "node:fs/promises";
import path from "node:path";

export const ROOT_DIR = process.cwd();
export const TESTSPRITE_DIR = path.join(ROOT_DIR, "testsprite_tests");
export const BASE_URL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

export async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  return { response, text };
}

export function expectStatus(response, expectedStatus, bodyText = "") {
  if (response.status !== expectedStatus) {
    const preview = String(bodyText).slice(0, 500);
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}. Body: ${preview}`);
  }
}

export function expectIncludes(text, expected, errorMessage) {
  if (!String(text).includes(expected)) {
    throw new Error(errorMessage);
  }
}

export async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureOutputDir() {
  await fs.mkdir(TESTSPRITE_DIR, { recursive: true });
  await fs.mkdir(path.join(TESTSPRITE_DIR, "tmp"), { recursive: true });
}

export function nowIso() {
  return new Date().toISOString();
}

