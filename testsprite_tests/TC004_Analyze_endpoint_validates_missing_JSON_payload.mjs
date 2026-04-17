import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC004";
export const title = "Analyze endpoint validates missing JSON payload";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  expectStatus(response, 400, text);
  expectIncludes(text, "image_url or image file is required", "Expected missing image validation message.");

  return "Missing JSON fields are rejected with 400.";
}

