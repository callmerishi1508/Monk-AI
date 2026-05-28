import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { MonkRun, RunState } from "./types";

const runsRoot = path.join(process.cwd(), "runs");

const VALID_STATES: RunState[] = [
  "INTAKE", "PLANNING", "COMPLIANCE_REVIEW", "BLOCKED",
  "WAITING_APPROVAL", "ENGINEERING", "VERIFYING", "COMPLETED", "FAILED"
];

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
  const run = JSON.parse(raw) as MonkRun;

  // Validate state
  if (!VALID_STATES.includes(run.state)) {
    run.state = "FAILED";
    run.failureReason = "FAILED_TRANSITION";
    run.runStatusMessage = "Invalid state detected during load. Run marked as FAILED.";
  }

  // Ensure required fields exist
  if (!run.telemetry) run.telemetry = [];
  if (!run.transitions) run.transitions = [];
  if (!run.artifacts) run.artifacts = [];
  if (!run.proposedMutations) run.proposedMutations = [];
  if (!run.approval) run.approval = { required: true, approved: false };

  return run;
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
