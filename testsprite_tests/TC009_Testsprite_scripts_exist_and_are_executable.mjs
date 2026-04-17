import fs from "node:fs/promises";
import path from "node:path";

export const id = "TC009";
export const title = "TestSprite runner scripts exist and are executable";

export async function run({ rootDir }) {
  const suitePath = path.join(rootDir, "testsprite_tests", "run_testsuite.mjs");
  const wrapperPath = path.join(rootDir, "testsprite_tests", "run_with_server.sh");

  const [suiteStat, wrapperStat] = await Promise.all([fs.stat(suitePath), fs.stat(wrapperPath)]);
  const suiteExec = Boolean(suiteStat.mode & 0o100);
  const wrapperExec = Boolean(wrapperStat.mode & 0o100);

  if (!suiteExec || !wrapperExec) {
    throw new Error("Expected run_testsuite.mjs and run_with_server.sh to be executable.");
  }

  return "Runner scripts are present and executable.";
}

