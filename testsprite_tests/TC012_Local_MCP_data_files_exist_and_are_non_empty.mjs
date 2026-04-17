import fs from "node:fs/promises";
import path from "node:path";

export const id = "TC012";
export const title = "Local MCP data files exist and are non-empty";

export async function run({ rootDir }) {
  const glossaryPath = path.join(rootDir, "mcp", "file-server", "mini_glossary.json");
  const rulesPath = path.join(rootDir, "mcp", "file-server", "risk_rules.json");
  const [glossaryRaw, rulesRaw] = await Promise.all([
    fs.readFile(glossaryPath, "utf8"),
    fs.readFile(rulesPath, "utf8"),
  ]);

  if (glossaryRaw.trim().length < 5 || rulesRaw.trim().length < 5) {
    throw new Error("Expected non-empty mini_glossary.json and risk_rules.json files.");
  }

  return "MCP glossary and risk rules files are present and populated.";
}

