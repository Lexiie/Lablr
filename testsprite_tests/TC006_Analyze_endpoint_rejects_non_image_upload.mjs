import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC006";
export const title = "Analyze endpoint rejects non-image upload";

export async function run({ baseUrl }) {
  const form = new FormData();
  form.append("file", new Blob(["hello"], { type: "text/plain" }), "note.txt");

  const { response, text } = await fetchText(`${baseUrl}/api/analyze`, {
    method: "POST",
    body: form,
  });

  expectStatus(response, 500, text);
  expectIncludes(text, "Unsupported file type", "Expected unsupported file type error.");
  return "Non-image upload is blocked as expected.";
}

