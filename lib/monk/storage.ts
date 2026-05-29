import fs from "fs";
import path from "path";
import type { MonkSession, SessionStage } from "./types";

const RUNS_DIR = path.join(process.cwd(), "runs");

const VALID_STAGES: SessionStage[] = [
  "IDEA_INTAKE", "TEAM_ASSEMBLY", "CLARIFICATION", "DOCUMENT_DRAFT",
  "DOCUMENT_REVIEW", "TEAM_DISPATCH", "PARALLEL_EXECUTION",
  "CROSS_FUNCTIONAL", "OUTPUT_COLLECTION", "COMPLETE", "FAILED",
];

function ensureRunsDir() {
  if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  return path.join(RUNS_DIR, `${sessionId}.json`);
}

export function saveSession(session: MonkSession): void {
  ensureRunsDir();
  if (!VALID_STAGES.includes(session.stage)) {
    throw new Error(`Invalid stage: ${session.stage}`);
  }
  fs.writeFileSync(sessionPath(session.sessionId), JSON.stringify(session, null, 2), "utf-8");
}

export function loadSession(sessionId: string): MonkSession | null {
  const p = sessionPath(sessionId);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as MonkSession;
  } catch {
    return null;
  }
}

export function listSessions(): MonkSession[] {
  ensureRunsDir();
  return fs
    .readdirSync(RUNS_DIR)
    .filter(f => f.endsWith(".json"))
    .map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(RUNS_DIR, f), "utf-8")) as MonkSession; }
      catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b!.createdAt).getTime() - new Date(a!.createdAt).getTime()) as MonkSession[];
}

export function deleteSession(sessionId: string): void {
  const p = sessionPath(sessionId);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
