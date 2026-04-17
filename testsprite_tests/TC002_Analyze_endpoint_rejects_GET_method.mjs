import { fetchText, expectStatus } from "./lib/testkit.mjs";

export const id = "TC002";
export const title = "Analyze endpoint rejects GET method";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/api/analyze`);
  expectStatus(response, 405, text);
  return "GET /api/analyze returns 405 as expected.";
}

