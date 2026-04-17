import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC007";
export const title = "Analyze endpoint rejects payload above 10MB";

export async function run({ baseUrl }) {
  const bytes = new Uint8Array(10 * 1024 * 1024 + 1);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), "too-large.png");

  const { response, text } = await fetchText(`${baseUrl}/api/analyze`, {
    method: "POST",
    body: form,
  });

  expectStatus(response, 500, text);
  expectIncludes(text, "File too large", "Expected file size validation error.");
  return "Upload size limit is enforced at API level.";
}

