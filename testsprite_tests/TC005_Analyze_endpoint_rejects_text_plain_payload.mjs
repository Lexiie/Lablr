import { fetchText, expectStatus } from "./lib/testkit.mjs";

export const id = "TC005";
export const title = "Analyze endpoint rejects text/plain payload";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "hello",
  });

  expectStatus(response, 400, text);
  return "text/plain payload is rejected without crashing the endpoint.";
}

