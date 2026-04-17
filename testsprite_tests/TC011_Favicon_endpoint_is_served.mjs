import { fetchText, expectStatus } from "./lib/testkit.mjs";

export const id = "TC011";
export const title = "Favicon endpoint is served";

export async function run({ baseUrl }) {
  const { response, text } = await fetchText(`${baseUrl}/favicon.ico`);
  expectStatus(response, 200, text);
  return "Favicon endpoint returns 200.";
}

