import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as http from "node:http";
import * as https from "node:https";

export type OCRResult = {
  domain_guess: "food" | "drug" | "cosmetic" | "mixed";
  ingredients: string[];
  sections: { warnings?: string; claims?: string[] };
  confidence: number;
  language: string;
};

type OCRSpacePage = {
  ParsedText?: string;
  FileParseExitCode?: number | string;
  ErrorMessage?: string;
  ErrorDetails?: string;
};

type OCRSpaceResponse = {
  ParsedResults?: OCRSpacePage[];
  OCRExitCode?: number | string;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string | string[];
  ErrorDetails?: string;
};

type OptiicResponse = {
  text?: string;
  language?: string;
  result?: {
    text?: string;
    language?: string;
  };
  error?: string;
  message?: string;
};

const DEFAULT_OPTIIC_DOWNLOAD_MAX_MB = 5;
const MAX_FALLBACK_ADDRESSES_TO_TRY = 3;

const DEFAULT_RESULT: OCRResult = {
  domain_guess: "mixed",
  ingredients: [],
  sections: {},
  confidence: 0,
  language: "en",
};

const STOP_SECTION_PATTERN =
  "(?:warning|warnings|caution|directions?|usage|how to use|claims?|nutrition facts|net(?:\\s+weight)?|manufactured|manufacturer|distributed|expiry|exp\\.?|best before|storage|allergen|serving size|cara pakai|peringatan|klaim|purpose|uses?|other information|drug facts|inactive\\s+ingredients?)";

const STOP_SECTION_LINE_REGEX = new RegExp(`\\b${STOP_SECTION_PATTERN}\\b`, "i");
const STOP_SECTION_HEADER_REGEX = new RegExp(
  `(?:^|\\n)\\s*${STOP_SECTION_PATTERN}\\b(?:\\s*(?::|-))?(?:\\s|\\n|$)`,
  "i",
);
const STOP_SECTION_INLINE_HEADER_REGEX = new RegExp(`\\b${STOP_SECTION_PATTERN}\\b\\s*[:\\-]`, "i");
const STOP_SECTION_INLINE_BARE_REGEX =
  /\b(?:warnings?|caution|directions?|usage|nutrition facts|other information|drug facts|inactive\s+ingredients?|cara pakai|peringatan|klaim)\b(?=\s+(?:keep|do|for|avoid|if|adults?|children|apply|use|net|serving|calories|contains|store|jangan|hentikan|untuk|purpose|other|information|facts?))/i;

function findSectionStopIndex(section: string): number {
  const headerMatch = section.match(STOP_SECTION_HEADER_REGEX);
  const inlineMatch = section.match(STOP_SECTION_INLINE_HEADER_REGEX);
  const inlineBareMatch = section.match(STOP_SECTION_INLINE_BARE_REGEX);

  const headerIndex = headerMatch?.index ?? -1;
  const inlineIndex = inlineMatch?.index ?? -1;
  const inlineBareIndex = inlineBareMatch?.index ?? -1;

  const candidates = [headerIndex, inlineIndex, inlineBareIndex].filter((value) => value >= 0);
  if (candidates.length === 0) return -1;
  return Math.min(...candidates);
}

function normalizeConfidence(value: number): number {
  if (Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number.parseFloat(value.toFixed(3));
}

function normalizeLanguage(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return "en";
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(trimmed) ? trimmed : "en";
}

function sanitizeForMatching(text: string): string {
  return text.replace(/\r/g, "\n");
}

function extractSection(rawText: string, headings: string[]): string {
  const text = sanitizeForMatching(rawText);

  for (const heading of headings) {
    const withColon = new RegExp(`(?:^|\\n)\\s*(?:${heading})\\s*[:\\-]\\s*([\\s\\S]{0,1600})`, "i");
    const inlineMatch = text.match(withColon);
    if (inlineMatch?.[1]) {
      let section = inlineMatch[1].trim();
      const stopIndex = findSectionStopIndex(section);
      if (stopIndex >= 0) section = section.slice(0, stopIndex).trim();
      if (section.length > 0) return section;
    }

    // Common layout on labels: heading on one line, values on next line(s).
    const multiline = new RegExp(`(?:^|\\n)\\s*(?:${heading})\\s*(?:\\n+)\\s*([\\s\\S]{0,1600})`, "i");
    const multilineMatch = text.match(multiline);
    if (!multilineMatch?.[1]) continue;

    let section = multilineMatch[1].trim();
    const stopIndex = findSectionStopIndex(section);
    if (stopIndex >= 0) section = section.slice(0, stopIndex).trim();
    if (section.length > 0) return section;
  }

  return "";
}

function cleanIngredientToken(token: string): string {
  return token
    .replace(/^\s*(?:active\s+ingredients?|inactive\s+ingredients?|ingredients?|composition|komposisi)\s*[:\-]?\s*/i, "")
    .replace(/^[-*\u2022\d.)\s]+/, "")
    .replace(/[()\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[.,;:]+$/, "");
}

function looksLikeIngredientToken(token: string): boolean {
  if (token.length < 2 || token.length > 80) return false;
  if (/^e\d{3,4}[a-z]?$/i.test(token)) return true;
  if (!/[\p{L}]/u.test(token)) return false;
  if (/^(ingredients?|and|contains?|with|for|the)$/i.test(token)) return false;
  return true;
}

function splitIngredientCandidates(value: string): string[] {
  return value
    .split(/[\n,;•]/)
    .map((part) => cleanIngredientToken(part))
    .filter((part) => looksLikeIngredientToken(part));
}

function findIngredientLineFallback(rawText: string): string {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const looksLikeIngredientLine = (line: string): boolean => {
    if (line.length > 220) return false;
    if (STOP_SECTION_LINE_REGEX.test(line)) return false;
    if (/\b(for|with|that|which|into|from|when|while|because|article|wikipedia)\b/i.test(line)) {
      return false;
    }

    const cleanedLine = line.replace(/[.!?]+$/, "");
    const parts = cleanedLine
      .split(/[;,]/)
      .map((part) => cleanIngredientToken(part))
      .filter((part) => part.length > 0);

    if (parts.length < 3) return false;

    const likely = parts.filter((part) => {
      if (!looksLikeIngredientToken(part)) return false;
      const wordCount = part.split(/\s+/).filter(Boolean).length;
      return wordCount >= 1 && wordCount <= 4;
    }).length;

    return likely / parts.length >= 0.75;
  };

  for (const line of lines) {
    const commaCount = (line.match(/,/g) || []).length;
    if (commaCount < 2) continue;
    if (/nutrition|serving|calories|warning|directions|usage/i.test(line)) continue;
    if (!looksLikeIngredientLine(line)) continue;
    return line;
  }

  return "";
}

function normalizeIngredients(rawText: string): string[] {
  const sections = [
    extractSection(rawText, ["ingredients?", "composition", "komposisi"]),
    extractSection(rawText, ["active\\s+ingredients?(?:\\s*\\([^\n)]*\\))?"]),
    extractSection(rawText, ["inactive\\s+ingredients?(?:\\s*\\([^\n)]*\\))?"]),
  ].filter((value): value is string => value.trim().length > 0);

  const fallbackLine = sections.length > 0 ? "" : findIngredientLineFallback(rawText);
  const source = (sections.length > 0 ? sections.join("\n") : fallbackLine).trim();
  if (!source) return [];

  return Array.from(new Set(splitIngredientCandidates(source)));
}

function normalizeWarnings(rawText: string): string | undefined {
  const section = extractSection(rawText, ["warnings?", "caution", "peringatan"]);
  if (section) return section.slice(0, 700).trim();

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const hits = lines.filter((line) =>
    /\b(keep out of reach|do not|avoid|for external use|peringatan|jangan|hentikan penggunaan|if irritation occurs)\b/i.test(
      line,
    ),
  );

  if (hits.length === 0) return undefined;
  return hits.slice(0, 2).join(" ").slice(0, 700);
}

function normalizeClaims(rawText: string): string[] | undefined {
  const isLikelyIngredientLine = (line: string): boolean => {
    const lower = line.toLowerCase();
    if (/\b(active\s+ingredients?|inactive\s+ingredients?|ingredients?|composition|komposisi)\b/.test(lower)) {
      return true;
    }

    const commaCount = (line.match(/,/g) || []).length;
    if (commaCount >= 3) {
      const parts = line
        .split(/[;,]/)
        .map((part) => cleanIngredientToken(part))
        .filter((part) => part.length > 0);

      const ingredientLikeCount = parts.filter((part) => looksLikeIngredientToken(part)).length;
      if (parts.length >= 4 && ingredientLikeCount / parts.length >= 0.75) {
        return true;
      }
    }

    return false;
  };

  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const hits = lines.filter(
    (line) =>
      !isLikelyIngredientLine(line) &&
      /\b(free|no added|without|dermatologically tested|tested|non[- ]comedogenic|paraben|sulfate|fragrance|vegan|organic|hypoallergenic|halal|gluten free|sugar free|low sugar|natural)\b/i.test(
        line,
      ),
  );

  if (hits.length === 0) return undefined;
  return Array.from(new Set(hits.slice(0, 6)));
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + (pattern.test(text) ? 1 : 0), 0);
}

function inferDomain(rawText: string, ingredients: string[]): OCRResult["domain_guess"] {
  const text = rawText.toLowerCase();
  const ingredientsText = ingredients.join(" ");

  const foodScore =
    countMatches(text, [
      /\bnutrition facts\b/,
      /\bserving\b/,
      /\bcalories\b/,
      /\bcarbohydrate\b/,
      /\bprotein\b/,
      /\bingredients\b/,
      /\ballergen\b/,
    ]) + countMatches(ingredientsText, [/sugar/, /salt/, /oil/, /milk/, /flour/]);

  const drugScore =
    countMatches(text, [
      /\bdrug facts\b/,
      /\bactive ingredient\b/,
      /\bdosage\b/,
      /\btablet\b/,
      /\bcapsule\b/,
      /\botc\b/,
      /\bmg\b/,
    ]) + countMatches(ingredientsText, [/acetaminophen/, /ibuprofen/, /paracetamol/, /caffeine/]);

  const cosmeticScore =
    countMatches(text, [
      /\bcosmetic\b/,
      /\bskin\b/,
      /\bserum\b/,
      /\bshampoo\b/,
      /\bmoisturizer\b/,
      /\bfragrance\b/,
      /\bsunscreen\b/,
      /\bspf\b/,
    ]) + countMatches(ingredientsText, [/parfum/, /glycerin/, /niacinamide/, /retinol/]);

  const ranking = [
    ["food", foodScore] as const,
    ["drug", drugScore] as const,
    ["cosmetic", cosmeticScore] as const,
  ].sort((a, b) => b[1] - a[1]);

  const top = ranking[0];
  const second = ranking[1];

  if (top[1] < 2) return "mixed";
  if (top[1] === second[1]) return "mixed";
  return top[0];
}

function detectLanguage(rawText: string): string {
  if (!rawText.trim()) return "en";

  if (/[\u4e00-\u9fff]/.test(rawText)) return "zh";
  if (/[\u0600-\u06ff]/.test(rawText)) return "ar";
  if (/[\u0400-\u04ff]/.test(rawText)) return "ru";
  if (/[\u0900-\u097f]/.test(rawText)) return "hi";

  const lower = rawText.toLowerCase();

  const languageProfiles: Array<{ code: string; patterns: RegExp[] }> = [
    {
      code: "id",
      patterns: [
        /\bkomposisi\b/i,
        /\bperingatan\b/i,
        /\bcara pakai\b/i,
        /\bdengan\b/i,
        /\buntuk\b/i,
      ],
    },
    {
      code: "es",
      patterns: [
        /\bingredientes?\b/i,
        /\badvertencias?\b/i,
        /\bmodo de uso\b/i,
        /\bcontiene\b/i,
        /\bpara\b/i,
      ],
    },
    {
      code: "fr",
      patterns: [
        /\bingr[eé]dients?\b/i,
        /\bavertissements?\b/i,
        /\bmode d['’]emploi\b/i,
        /\butilisation\b/i,
        /\bavec\b/i,
      ],
    },
    {
      code: "pt",
      patterns: [
        /\bingredientes?\b/i,
        /\badvert[êe]ncias?\b/i,
        /\bmodo de uso\b/i,
        /\bcont[eé]m\b/i,
        /\bsem\b/i,
      ],
    },
    {
      code: "de",
      patterns: [
        /\bzutaten\b/i,
        /\bhinweis\b/i,
        /\banwendung\b/i,
        /\bohne\b/i,
        /\bmit\b/i,
      ],
    },
    {
      code: "it",
      patterns: [
        /\bingredienti\b/i,
        /\bavvertenze\b/i,
        /\bmodo d['’]uso\b/i,
        /\butilizzo\b/i,
        /\bsenza\b/i,
      ],
    },
  ];

  const scores = languageProfiles
    .map((profile) => ({
      code: profile.code,
      score: profile.patterns.reduce((sum, pattern) => sum + (pattern.test(lower) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];
  if (top && top.score >= 2 && top.score > (second?.score || 0)) {
    return top.code;
  }

  // Diacritic hints for Latin-script languages.
  if (/[ñ¿¡]/.test(lower)) return "es";
  if (/[ãõâêô]/.test(lower)) return "pt";
  if (/[äöüß]/.test(lower)) return "de";
  if (/[àèìòù]/.test(lower)) return "it";
  if (/[çœ]/.test(lower)) return "fr";

  return "en";
}

function estimateConfidence(rawText: string, payload: OCRSpaceResponse, ingredientCount: number): number {
  let score = 0.25;
  const exitCode = Number(payload.OCRExitCode ?? 0);

  if (exitCode === 1) {
    score += 0.25;
  } else if (exitCode === 2) {
    score += 0.15;
  } else if (exitCode > 2) {
    score -= 0.1;
  }

  const textLength = rawText.length;
  if (textLength > 40) score += 0.1;
  if (textLength > 250) score += 0.1;
  if (textLength > 900) score += 0.1;
  if (ingredientCount > 0) score += 0.1;
  if (ingredientCount === 0) {
    score -= 0.2;
    score = Math.min(score, 0.35);
  }

  return normalizeConfidence(score);
}

function buildResultFromText(rawText: string, payload: OCRSpaceResponse): OCRResult {
  if (!rawText.trim()) {
    return { ...DEFAULT_RESULT };
  }

  const ingredients = normalizeIngredients(rawText);
  const warnings = normalizeWarnings(rawText);
  const claims = normalizeClaims(rawText);

  const sections: OCRResult["sections"] = {};
  if (warnings) sections.warnings = warnings;
  if (claims && claims.length > 0) sections.claims = claims;

  return {
    domain_guess: inferDomain(rawText, ingredients),
    ingredients,
    sections,
    confidence: estimateConfidence(rawText, payload, ingredients.length),
    language: normalizeLanguage(detectLanguage(rawText)),
  };
}

function normalizeErrorMessage(message: unknown): string {
  if (typeof message === "string") return message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" | ");
  }
  return "Unknown OCR error";
}

function buildOCRRequestBody(imageInput: string): URLSearchParams {
  const body = new URLSearchParams();
  const language = process.env.OCR_SPACE_LANGUAGE || "auto";
  const engine = process.env.OCR_SPACE_ENGINE || "2";
  const scale = process.env.OCR_SPACE_SCALE || "true";

  if (imageInput.startsWith("data:")) {
    body.append("base64Image", imageInput);
  } else {
    body.append("url", imageInput);
  }

  body.append("language", language);
  body.append("isOverlayRequired", "false");
  body.append("detectOrientation", "true");
  body.append("scale", scale);
  body.append("OCREngine", engine);

  return body;
}

function parseDataUrl(input: string): { mime: string; data: Buffer } {
  const match = input.match(/^data:([^;,]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid data URL");
  }

  return {
    mime: match[1],
    data: Buffer.from(match[2], "base64"),
  };
}

function getOptiicDownloadMaxBytes(): number {
  const configured = Number(process.env.OPTIIC_DOWNLOAD_MAX_MB || DEFAULT_OPTIIC_DOWNLOAD_MAX_MB);
  const mb = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_OPTIIC_DOWNLOAD_MAX_MB;
  return Math.floor(mb * 1024 * 1024);
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;

  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 0) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;

  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("::ffff:")) return true; // IPv4-mapped IPv6 can bypass simple filters.
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true; // link-local fe80::/10
  }

  return false;
}

function isPrivateIpAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isPrivateIPv4(ip);
  if (family === 6) return isPrivateIPv6(ip);
  return true;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;

  return false;
}

async function assertPublicUrlTarget(input: URL): Promise<void> {
  if (!["http:", "https:"].includes(input.protocol)) {
    throw new Error("Only http/https URLs are allowed for OCR fallback download");
  }

  if (input.username || input.password) {
    throw new Error("Credentialed URLs are not allowed for OCR fallback download");
  }

  const host = input.hostname;
  if (isBlockedHostname(host)) {
    throw new Error(`Blocked private hostname: ${host}`);
  }

  if (isIP(host) && isPrivateIpAddress(host)) {
    throw new Error(`Blocked private IP target: ${host}`);
  }

  if (!isIP(host)) {
    const resolved = await lookup(host, { all: true, verbatim: true });
    if (!resolved || resolved.length === 0) {
      throw new Error(`Unable to resolve host: ${host}`);
    }

    for (const entry of resolved) {
      if (isPrivateIpAddress(entry.address)) {
        throw new Error(`Blocked private network target for ${host}`);
      }
    }
  }
}

type PinnedTarget = { address: string; family: 4 | 6 };

type PinnedResponse = {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
};

function headerValue(headers: http.IncomingHttpHeaders, key: string): string {
  const raw = headers[key.toLowerCase()];
  if (Array.isArray(raw)) return raw[0] || "";
  return raw || "";
}

async function resolvePinnedTargets(input: URL): Promise<PinnedTarget[]> {
  await assertPublicUrlTarget(input);

  const host = input.hostname;
  const literalFamily = isIP(host);
  if (literalFamily === 4 || literalFamily === 6) {
    return [{ address: host, family: literalFamily as 4 | 6 }];
  }

  const resolved = await lookup(host, { all: true, verbatim: true });
  if (!resolved || resolved.length === 0) {
    throw new Error(`Unable to resolve host: ${host}`);
  }

  const deduped: PinnedTarget[] = [];
  const seen = new Set<string>();
  for (const entry of resolved) {
    if (isPrivateIpAddress(entry.address)) {
      continue;
    }

    const key = `${entry.family}:${entry.address}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({ address: entry.address, family: entry.family as 4 | 6 });

    if (deduped.length >= MAX_FALLBACK_ADDRESSES_TO_TRY) {
      break;
    }
  }

  if (deduped.length === 0) {
    throw new Error(`No public DNS targets available for host: ${host}`);
  }

  return deduped;
}

async function requestPinnedUrl(input: URL, pinned: PinnedTarget, maxBytes: number): Promise<PinnedResponse> {
  const transport = input.protocol === "https:" ? https : http;

  return await new Promise<PinnedResponse>((resolve, reject) => {
    const req = transport.request(
      {
        protocol: input.protocol,
        hostname: input.hostname,
        port: input.port || undefined,
        method: "GET",
        path: `${input.pathname}${input.search}`,
        headers: {
          "User-Agent": "Lablr-OCR-Fallback/1.0",
          Accept: "image/*,*/*;q=0.8",
          "Accept-Encoding": "identity",
        },
        lookup: (_hostname, _options, callback) => callback(null, pinned.address, pinned.family),
      },
      (res) => {
        const statusCode = res.statusCode || 0;

        if (statusCode >= 300 && statusCode < 400) {
          res.resume();
          resolve({ statusCode, headers: res.headers, body: Buffer.alloc(0) });
          return;
        }

        const contentLength = Number(headerValue(res.headers, "content-length") || 0);
        if (Number.isFinite(contentLength) && contentLength > 0 && contentLength > maxBytes) {
          res.resume();
          reject(new Error(`Fallback image exceeds size limit (${contentLength} bytes > ${maxBytes} bytes)`));
          return;
        }

        const chunks: Buffer[] = [];
        let total = 0;

        res.on("data", (chunk: Buffer) => {
          total += chunk.length;
          if (total > maxBytes) {
            req.destroy(new Error(`Fallback image exceeds size limit (${total} bytes > ${maxBytes} bytes)`));
            return;
          }
          chunks.push(chunk);
        });

        res.on("end", () => {
          resolve({ statusCode, headers: res.headers, body: Buffer.concat(chunks, total) });
        });

        res.on("error", (error) => reject(error));
      },
    );

    req.setTimeout(15000, () => {
      req.destroy(new Error("Timed out downloading fallback image"));
    });

    req.on("error", (error) => reject(error));
    req.end();
  });
}

async function fetchPublicUrlWithChecks(url: string, maxBytes: number): Promise<PinnedResponse> {
  let current = new URL(url);
  let redirects = 0;

  while (true) {
    const pinnedTargets = await resolvePinnedTargets(current);
    let response: PinnedResponse | null = null;
    let lastNetworkError: unknown;

    for (const pinned of pinnedTargets) {
      try {
        if (isPrivateIpAddress(pinned.address)) {
          throw new Error(`Blocked private network target for ${current.hostname}`);
        }

        response = await requestPinnedUrl(current, pinned, maxBytes);
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }

    if (!response) {
      throw (lastNetworkError as Error) || new Error(`Failed to connect to ${current.hostname}`);
    }

    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = headerValue(response.headers, "location");
      if (!location) {
        throw new Error(`Redirect without location from ${current.toString()}`);
      }

      redirects += 1;
      if (redirects > 3) {
        throw new Error("Too many redirects while downloading fallback image");
      }

      current = new URL(location, current);
      continue;
    }

    return response;
  }
}

async function loadImageAsBinary(imageInput: string): Promise<{ mime: string; data: Buffer }> {
  const maxBytes = getOptiicDownloadMaxBytes();

  if (imageInput.startsWith("data:")) {
    const parsed = parseDataUrl(imageInput);
    if (parsed.data.byteLength > maxBytes) {
      throw new Error(`Fallback image exceeds size limit (${parsed.data.byteLength} bytes > ${maxBytes} bytes)`);
    }
    return parsed;
  }

  const response = await fetchPublicUrlWithChecks(imageInput, maxBytes);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    const errText = response.body.toString("utf8").slice(0, 500);
    throw new Error(`Failed to download image URL (${response.statusCode}): ${errText}`);
  }

  const contentType = (headerValue(response.headers, "content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error(`Fallback URL did not return an image content-type: ${contentType || "unknown"}`);
  }

  return {
    mime: contentType,
    data: response.body,
  };
}

function extractOptiicText(payload: OptiicResponse): { text: string; language?: string } {
  const text = (payload.text || payload.result?.text || "").trim();
  const language = payload.language || payload.result?.language;

  if (!text) {
    const detail = payload.error || payload.message || "empty response";
    throw new Error(`Optiic returned no text: ${detail}`);
  }

  return { text, language };
}

async function analyzeLabelWithOptiic(imageInput: string): Promise<OCRResult> {
  const apiKey = (process.env.OPTIIC_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("OPTIIC_API_KEY is not set");
  }

  const endpoint = (process.env.OPTIIC_API_BASE || "https://api.optiic.dev/process").replace(/\/$/, "");

  const parsed = await loadImageAsBinary(imageInput);
  const form = new FormData();
  form.append("apiKey", apiKey);
  const arrayBuffer = parsed.data.buffer.slice(
    parsed.data.byteOffset,
    parsed.data.byteOffset + parsed.data.byteLength,
  ) as ArrayBuffer;
  const fileBytes = new Uint8Array(arrayBuffer);
  const file = new File([fileBytes], `upload-${Date.now()}.png`, { type: parsed.mime || "image/png" });
  form.append("image", file);

  const response = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Optiic API error ${response.status}: ${errText}`);
  }

  const rawBody = await response.text();
  let payload: OptiicResponse;
  try {
    payload = JSON.parse(rawBody) as OptiicResponse;
  } catch {
    payload = { text: rawBody };
  }

  const { text, language } = extractOptiicText(payload);

  const syntheticPayload: OCRSpaceResponse = {
    OCRExitCode: 1,
    ParsedResults: [
      {
        ParsedText: text,
        FileParseExitCode: 1,
      },
    ],
  };

  const result = buildResultFromText(text, syntheticPayload);
  if (language) {
    result.language = normalizeLanguage(language);
  }

  return result;
}

export async function analyzeLabel(image_url: string): Promise<OCRResult> {
  if (!image_url || typeof image_url !== "string") {
    throw new Error("analyzeLabel: image_url is required");
  }

  const endpoint = (process.env.OCR_SPACE_API_BASE || "https://api.ocr.space/parse/image").replace(/\/$/, "");
  const apiKey = process.env.OCR_SPACE_API_KEY || "helloworld";
  const hasOptiicFallback = (process.env.OPTIIC_API_KEY || "").trim().length > 0;
  let primaryError = "";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: buildOCRRequestBody(image_url).toString(),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`OCR.Space API error ${response.status}: ${errText}`);
    }

    const payload = (await response.json()) as OCRSpaceResponse;

    if (payload.IsErroredOnProcessing) {
      const message = normalizeErrorMessage(payload.ErrorMessage);
      throw new Error(`OCR.Space processing failed: ${message} ${payload.ErrorDetails || ""}`.trim());
    }

    const successfulPages = (payload.ParsedResults || []).filter((page) => Number(page.FileParseExitCode) === 1);
    const rawText = successfulPages
      .map((page) => page.ParsedText || "")
      .join("\n")
      .trim();

    if (rawText) {
      return buildResultFromText(rawText, payload);
    }

    if (!hasOptiicFallback) {
      console.warn("analyzeLabel: OCR.Space returned empty text and Optiic fallback is not configured");
      return { ...DEFAULT_RESULT };
    }

    throw new Error("OCR.Space returned empty text");
  } catch (error) {
    primaryError = (error as Error).message;

    if (!hasOptiicFallback) {
      throw new Error(`analyzeLabel: OCR.Space failed: ${primaryError}`);
    }

    console.warn(`analyzeLabel: primary OCR failed (${primaryError}), trying Optiic fallback`);
  }

  try {
    return await analyzeLabelWithOptiic(image_url);
  } catch (fallbackError) {
    const fallbackMessage = (fallbackError as Error).message;
    throw new Error(`analyzeLabel failed. OCR.Space: ${primaryError}. Optiic: ${fallbackMessage}`);
  }
}
