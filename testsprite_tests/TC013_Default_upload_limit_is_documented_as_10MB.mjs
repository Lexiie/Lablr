import fs from "node:fs/promises";
import path from "node:path";

export const id = "TC013";
export const title = "Default upload limit is documented as 10MB";

export async function run({ rootDir }) {
  const [envExample, readme] = await Promise.all([
    fs.readFile(path.join(rootDir, ".env.example"), "utf8"),
    fs.readFile(path.join(rootDir, "README.md"), "utf8"),
  ]);

  if (!envExample.includes("OCR_UPLOAD_MAX_MB=10")) {
    throw new Error(".env.example does not document OCR_UPLOAD_MAX_MB=10");
  }
  if (!readme.includes('OCR_UPLOAD_MAX_MB="10"')) {
    throw new Error("README.md does not document OCR_UPLOAD_MAX_MB=10");
  }

  return "10MB upload limit is documented consistently.";
}

