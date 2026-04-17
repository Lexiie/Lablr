import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC008";
export const title = "OCR endpoint requires file or image_url";

export async function run({ baseUrl }) {
  const form = new FormData();

  const { response, text } = await fetchText(`${baseUrl}/api/ocr`, {
    method: "POST",
    body: form,
  });

  expectStatus(response, 400, text);
  expectIncludes(text, "Provide 'file' or 'image_url'", "Expected OCR payload validation message.");
  return "OCR endpoint validates missing input.";
}

