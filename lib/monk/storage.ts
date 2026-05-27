import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { MonkRun } from "./types";

const runsRoot = path.join(process.cwd(), "runs");

export function getRunDir(runId: string) {
  return path.join(runsRoot, runId);
}

export function getRunAppDir(runId: string) {
  return path.join(getRunDir(runId), "app");
}

export async function saveRun(run: MonkRun) {
  const runDir = getRunDir(run.runId);
  await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, "state.json"), JSON.stringify(run, null, 2), "utf8");
}

export async function loadRun(runId: string): Promise<MonkRun> {
  const raw = await readFile(path.join(getRunDir(runId), "state.json"), "utf8");
  return JSON.parse(raw) as MonkRun;
}

export async function listRuns(): Promise<MonkRun[]> {
  await mkdir(runsRoot, { recursive: true });
  const entries = await readdir(runsRoot, { withFileTypes: true });
  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        try {
          return await loadRun(entry.name);
        } catch {
          return null;
        }
      })
  );

  return runs
    .filter((run): run is MonkRun => Boolean(run))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
