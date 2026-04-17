import fs from "node:fs/promises";
import path from "node:path";
import type { OCRResult } from "./ocr";
import { fetch_json } from "@/tools/fetch_json";

export type ExplanationItem = {
  name: string;
  function: string;
  risk_level: "Green" | "Yellow" | "Red" | "Unknown";
  why: string;
  certainty: number;
  sources: string[];
};

export type ExplanationResult = {
  language: string;
  summary: string;
  items: ExplanationItem[];
  disclaimer: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: {
    message?: string;
  };
};

type GlossaryEntry = {
  name: string;
  synonyms?: string[];
  description?: string;
  common_uses?: string[];
};

type RiskRule = {
  pattern: string;
  risk_level: ExplanationItem["risk_level"];
  reason: string;
  applies_to?: string[];
};

type ExternalRecord = {
  ingredient: string;
  source: string;
  data: Record<string, unknown>;
};

const SYSTEM_PROMPT = [
  "You are an ingredient explanation assistant for consumer labels.",
  "Use the target language provided in the instructions (default to English) for all free-text fields.",
  "Use glossary and risk rules as hints.",
  "When in doubt, set risk_level=Unknown and explain uncertainty.",
  "No medical or regulatory advice.",
  "Return ExplanationResult in strict JSON and include the language field with the language code you used.",
].join(" ");

const MCP_DIR = path.join(process.cwd(), "mcp", "file-server");

const DEFAULT_RESULT: ExplanationResult = {
  language: "en",
  summary: "Ingredient explanations unavailable while the language service is offline.",
  items: [],
  disclaimer: "This is not medical advice.",
};

const RISK_PRIORITY: Record<ExplanationItem["risk_level"], number> = {
  Unknown: 0,
  Green: 1,
  Yellow: 2,
  Red: 3,
};

function normalizeLanguage(value: unknown, fallback = "en"): string {
  if (typeof value !== "string") {
    return fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const lower = trimmed.toLowerCase();
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(lower) ? lower : fallback;
}

function buildRuleBasedResult(
  data: OCRResult,
  glossaryMatches: Record<string, GlossaryEntry>,
  riskMatches: Record<string, RiskRule[]>,
  language: string,
  note?: string,
): ExplanationResult {
  const items: ExplanationItem[] = data.ingredients.map((ingredient) => {
    const glossary = glossaryMatches[ingredient];
    const matchedRules = riskMatches[ingredient] || [];

    const ruleRisk = matchedRules.reduce<ExplanationItem["risk_level"]>(
      (current, rule) =>
        RISK_PRIORITY[rule.risk_level] > RISK_PRIORITY[current] ? rule.risk_level : current,
      "Unknown",
    );

    const functionText =
      glossary?.common_uses?.[0] || glossary?.description || "Function not yet confirmed from local knowledge base.";
    const whyText =
      matchedRules[0]?.reason ||
      glossary?.description ||
      "No direct risk rule matched. Treat this as informational only.";

    const sources: string[] = [];
    if (glossary) sources.push("kb:mini_glossary");
    if (matchedRules.length > 0) sources.push("kb:risk_rules");

    const certainty = matchedRules.length > 0 ? 0.78 : glossary ? 0.62 : 0.35;

    return {
      name: ingredient,
      function: functionText,
      risk_level: ruleRisk,
      why: whyText,
      certainty,
      sources,
    };
  });

  const redCount = items.filter((item) => item.risk_level === "Red").length;
  const yellowCount = items.filter((item) => item.risk_level === "Yellow").length;
  const summaryBase =
    redCount > 0
      ? `Rule-based analysis found ${redCount} high-risk ingredient(s) and ${yellowCount} caution ingredient(s).`
      : `Rule-based analysis completed with ${yellowCount} caution ingredient(s) and no high-risk matches.`;

  return {
    language,
    summary: note ? `${summaryBase} ${note}` : summaryBase,
    items,
    disclaimer:
      "AI explanation service is unavailable right now. Showing deterministic rule-based output only. This is not medical advice.",
  };
}

function buildFallbackResult(language?: string): ExplanationResult {
  return { ...DEFAULT_RESULT, language: normalizeLanguage(language, DEFAULT_RESULT.language) };
}

async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const filePath = path.join(MCP_DIR, fileName);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`explainIngredients: unable to read ${fileName}`, error);
    return fallback;
  }
}

function matchGlossaryEntries(ingredients: string[], glossary: GlossaryEntry[]): Record<string, GlossaryEntry> {
  const matches: Record<string, GlossaryEntry> = {};

  for (const ingredient of ingredients) {
    const needle = ingredient.toLowerCase();
    const entry = glossary.find((item) => {
      if (item.name.toLowerCase() === needle) {
        return true;
      }
      return (item.synonyms || []).some((syn) => syn.toLowerCase() === needle);
    });

    if (entry) {
      matches[ingredient] = entry;
    }
  }

  return matches;
}

function applyRiskRules(ingredients: string[], rules: RiskRule[]): Record<string, RiskRule[]> {
  const result: Record<string, RiskRule[]> = {};

  for (const ingredient of ingredients) {
    const lower = ingredient.toLowerCase();
    const hits = rules.filter((rule) => {
      if (rule.applies_to && rule.applies_to.some((name) => name.toLowerCase() === lower)) {
        return true;
      }
      return lower.includes(rule.pattern.toLowerCase());
    });

    if (hits.length > 0) {
      result[ingredient] = hits;
    }
  }

  return result;
}

function shouldFetchExternally(): boolean {
  return (process.env.WEB_FETCH_ENABLED || "").toLowerCase() === "true";
}

async function fetchExternalRecords(ingredients: string[], domain: OCRResult["domain_guess"]): Promise<ExternalRecord[]> {
  if (!shouldFetchExternally() || ingredients.length === 0) {
    return [];
  }

  const records: ExternalRecord[] = [];
  const limit = Math.min(ingredients.length, Number(process.env.OFF_FETCH_LIMIT || 3));

  for (let index = 0; index < limit; index += 1) {
    const ingredient = ingredients[index];
    const encoded = encodeURIComponent(ingredient);
    const baseDomain = domain === "cosmetic" ? "world.openbeautyfacts.org" : "world.openfoodfacts.org";
    const url = `https://${baseDomain}/cgi/search.pl?search_terms=${encoded}&search_simple=1&json=1&page_size=1`;

    try {
      const data = await fetch_json(url, { "User-Agent": "Lablr-Agent" });
      records.push({ ingredient, source: baseDomain, data });
    } catch (error) {
      console.warn(`explainIngredients: external fetch failed for ${ingredient}`, error);
    }
  }

  return records;
}

function normalizeRiskLevel(value: unknown): ExplanationItem["risk_level"] {
  if (value === "Green" || value === "Yellow" || value === "Red" || value === "Unknown") {
    return value;
  }
  return "Unknown";
}

function normalizeCertainty(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return Number.parseFloat(value.toFixed(3));
}

function normalizeItems(raw: unknown): ExplanationItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return undefined;
      }
      const item = entry as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name : "Unknown";
      const fn = typeof item.function === "string" ? item.function : "";
      const why = typeof item.why === "string" ? item.why : "";
      const sources = Array.isArray(item.sources)
        ? item.sources.filter((source): source is string => typeof source === "string" && source.trim().length > 0)
        : [];

      return {
        name,
        function: fn,
        risk_level: normalizeRiskLevel(item.risk_level),
        why,
        certainty: normalizeCertainty(item.certainty),
        sources,
      };
    })
    .filter((item): item is ExplanationItem => Boolean(item));
}

function extractGeminiText(payload: GeminiGenerateContentResponse): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) {
    return "";
  }

  for (const part of parts) {
    if (typeof part?.text === "string" && part.text.trim().length > 0) {
      return part.text;
    }
  }

  return "";
}

function buildGeminiResponseSchema(targetLanguage: string): Record<string, unknown> {
  return {
    type: "OBJECT",
    properties: {
      summary: { type: "STRING" },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            function: { type: "STRING" },
            risk_level: {
              type: "STRING",
              enum: ["Green", "Yellow", "Red", "Unknown"],
            },
            why: { type: "STRING" },
            certainty: { type: "NUMBER" },
            sources: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
          },
          required: ["name", "function", "risk_level", "why", "certainty", "sources"],
        },
      },
      disclaimer: { type: "STRING" },
      language: {
        type: "STRING",
        description: `Language code used for generated text (expected ${targetLanguage}).`,
      },
    },
    required: ["summary", "items", "disclaimer", "language"],
  };
}

export async function explainIngredients(data: OCRResult): Promise<ExplanationResult> {
  const [glossary, rules] = await Promise.all([
    readJsonFile<GlossaryEntry[]>("mini_glossary.json", []),
    readJsonFile<RiskRule[]>("risk_rules.json", []),
  ]);

  const glossaryMatches = matchGlossaryEntries(data.ingredients, glossary);
  const riskMatches = applyRiskRules(data.ingredients, rules);
  const targetLanguage = normalizeLanguage(data.language, DEFAULT_RESULT.language);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("explainIngredients: GEMINI_API_KEY not set; returning rule-based result");
    return buildRuleBasedResult(data, glossaryMatches, riskMatches, targetLanguage);
  }

  const externalRecords = await fetchExternalRecords(data.ingredients, data.domain_guess);

  const apiBase = (process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta").replace(
    /\/$/,
    "",
  );
  const context = {
    language: targetLanguage,
    product: {
      domain_guess: data.domain_guess,
      sections: data.sections,
      confidence: data.confidence,
    },
    ingredients: data.ingredients,
    glossary_matches: glossaryMatches,
    risk_matches: riskMatches,
    external_records: externalRecords,
  };

  const modelsToTry = Array.from(
    new Set(
      [
        (process.env.GEMINI_MODEL || "").trim(),
        (process.env.GEMINI_FALLBACK_MODEL || "").trim(),
        "gemini-2.5-flash",
        "gemini-2.0-flash",
      ].filter((value): value is string => value.length > 0),
    ),
  );

  const contextMessage = [
    SYSTEM_PROMPT,
    `Target language code: ${targetLanguage}. Write all free-text fields in this language while keeping risk_level enums in English.`,
    "Use the provided context to explain each ingredient for a layperson. Cite sources from OFF/OBF or kb: entries.",
    `Context JSON:\n${JSON.stringify(context, null, 2)}`,
  ].join("\n\n");

  const startedAt = Date.now();
  let payload: GeminiGenerateContentResponse | null = null;
  let lastStatus: number | null = null;
  let lastErrorText = "";
  let selectedModel = "";

  for (const candidate of modelsToTry) {
    const attempt = await fetch(`${apiBase}/models/${candidate}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: contextMessage,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          response_mime_type: "application/json",
          response_schema: buildGeminiResponseSchema(targetLanguage),
        },
      }),
    });

    if (attempt.ok) {
      payload = (await attempt.json()) as GeminiGenerateContentResponse;
      selectedModel = candidate;
      break;
    }

    lastStatus = attempt.status;
    lastErrorText = await attempt.text().catch(() => "");
    console.warn(`explainIngredients: model ${candidate} failed with ${attempt.status}: ${lastErrorText}`);
  }

  if (!payload) {
    const status = lastStatus ?? 500;
    console.warn(`explainIngredients: Gemini unavailable (${status}), returning rule-based output`);
    return buildRuleBasedResult(
      data,
      glossaryMatches,
      riskMatches,
      targetLanguage,
      "LLM quota or service unavailable; switched to deterministic fallback.",
    );
  }

  if (payload.error?.message) {
    console.warn("explainIngredients: Gemini payload error, returning rule-based output", payload.error.message);
    return buildRuleBasedResult(
      data,
      glossaryMatches,
      riskMatches,
      targetLanguage,
      "LLM response invalid; switched to deterministic fallback.",
    );
  }

  const elapsed = Date.now() - startedAt;
  if (process.env.NODE_ENV !== "production") {
    const usage = payload.usageMetadata || {};
    console.debug(
      `explainIngredients: model=${selectedModel || "n/a"} usage prompt=${usage.promptTokenCount ?? "n/a"} completion=${usage.candidatesTokenCount ?? "n/a"} total=${usage.totalTokenCount ?? "n/a"} elapsed=${elapsed}ms`,
    );
  }

  const content = extractGeminiText(payload);

  if (!content) {
    return buildFallbackResult(targetLanguage);
  }

  let rawResult: Record<string, unknown>;
  try {
    rawResult = JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    console.warn("explainIngredients: failed to parse JSON response", error);
    return buildFallbackResult(targetLanguage);
  }

  const summary = typeof rawResult.summary === "string" ? rawResult.summary : DEFAULT_RESULT.summary;
  const disclaimer =
    typeof rawResult.disclaimer === "string" ? rawResult.disclaimer : DEFAULT_RESULT.disclaimer;
  const items = normalizeItems(rawResult.items);

  const language = normalizeLanguage((rawResult as Record<string, unknown>).language, targetLanguage);

  return {
    language,
    summary,
    items,
    disclaimer,
  };
}
