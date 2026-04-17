#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

function getApiKey() {
  const fromEnv = (process.env.TESTSPRITE_API_KEY || "").trim();
  if (fromEnv) return fromEnv;
  return "";
}

async function loadExistingConfig(configPath) {
  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(".mcp.json must contain a JSON object at the top level.");
    }
    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function main() {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.error("Missing TESTSPRITE_API_KEY. Export it first, then run this setup again.");
    process.exit(1);
  }

  const outputPath = path.join(process.cwd(), ".mcp.json");
  const existing = await loadExistingConfig(outputPath);

  const mcpServers =
    existing.mcpServers && typeof existing.mcpServers === "object" && !Array.isArray(existing.mcpServers)
      ? { ...existing.mcpServers }
      : {};

  mcpServers.TestSprite = {
    command: "npx",
    args: ["-y", "@testsprite/testsprite-mcp@latest"],
    env: {
      API_KEY: apiKey,
    },
  };

  const config = {
    ...existing,
    mcpServers,
  };

  await fs.writeFile(outputPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputPath} with TestSprite MCP config.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
