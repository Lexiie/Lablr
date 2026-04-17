import { fetchText, expectStatus } from "./lib/testkit.mjs";

export const id = "TC003";
export const title = "OCR endpoint rejects GET method";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/api/ocr`);
  expectStatus(response, 405, text);
  return "GET /api/ocr returns 405 as expected.";
}

