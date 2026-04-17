import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC010";
export const title = "Static asset next.svg is served";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/next.svg`);
  expectStatus(response, 200, text);
  expectIncludes(text, "svg", "Expected SVG content body for /next.svg.");
  return "Static SVG endpoint is healthy.";
}

