import { fetchText, expectStatus, expectIncludes } from "./lib/testkit.mjs";

export const id = "TC001";
export const title = "Homepage loads and displays main headline";

export async function run({ baseUrl }) {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { response, text } = await fetchText(`${baseUrl}/`);
    lastStatus = response.status;
    lastBody = text;
    if (lastStatus === 200) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }

  expectStatus({ status: lastStatus }, 200, lastBody);
  expectIncludes(lastBody, "Decode product labels in a single pass", "Homepage headline not found.");

  return "Homepage rendered and primary headline detected.";
}

