/**
 * MONK AI — Startup Profile Classifier v2
 * Derives labels from a MonkSession's sector and stage.
 */

import type { MonkSession } from "./types";

export type StartupProfile = {
  label: string;
  category: string;
  stage: "idea" | "planning" | "execution" | "complete";
  complexity: "lean" | "standard" | "enterprise";
  tags: string[];
};

export function classifyStartup(session: MonkSession): StartupProfile {
  const sector = session.sector || "General";
  const stage = deriveStage(session);
  const complexity = deriveComplexity(session);

  return {
    label: `${sector} Startup`,
    category: sector,
    stage,
    complexity,
    tags: buildTags(session),
  };
}

function deriveStage(session: MonkSession): StartupProfile["stage"] {
  if (session.stage === "COMPLETE") return "complete";
  if (["PARALLEL_EXECUTION", "CROSS_FUNCTIONAL", "OUTPUT_COLLECTION", "TEAM_DISPATCH"].includes(session.stage)) return "execution";
  if (["DOCUMENT_DRAFT", "DOCUMENT_REVIEW", "CLARIFICATION"].includes(session.stage)) return "planning";
  return "idea";
}

function deriveComplexity(session: MonkSession): StartupProfile["complexity"] {
  const teamCount = (session.approvedTeams || session.proposedTeams).length;
  if (teamCount >= 7) return "enterprise";
  if (teamCount >= 4) return "standard";
  return "lean";
}

function buildTags(session: MonkSession): string[] {
  const tags: string[] = [];
  if (session.ideaType === "PROBLEM_STATEMENT") tags.push("Problem-First");
  if (session.ideaType === "DIRECT_BUILD") tags.push("Direct Build");
  if (session.sector) tags.push(session.sector);
  const teamCount = (session.approvedTeams || session.proposedTeams).length;
  if (teamCount > 0) tags.push(`${teamCount} Teams`);
  return tags.slice(0, 4);
}
