/* ══════════════════════════════════════════════════════════
   MONK AI — Session Engine v2.0
   10-stage autonomous startup execution pipeline
   ══════════════════════════════════════════════════════════ */

import { v4 as uuid } from "uuid";
import { saveSession, loadSession } from "./storage";
import {
  classifyIdea, assembleTeam, generateClarifyingQuestions,
  buildStartupDocument, runProductTeam, runEngineeringTeam,
  runDesignTeam, runResearchTeam, runMarketingTeam, runFinanceTeam,
  runLegalTeam, runSalesTeam, runGenericTeam, buildSessionLabel,
  TEAM_DEFINITIONS,
} from "./agents";
import type {
  MonkSession, SessionStage, TeamId, TeamWorker, TeamOutput,
  TeamActivity, SessionEvent, ClarificationAnswer,
  ReviewDocumentRequest, ApproveTeamsRequest,
} from "./types";

/* ── Helpers ──────────────────────────────────────────────── */

function now() { return new Date().toISOString(); }

function addEvent(session: MonkSession, event: string, detail: string, teamId?: TeamId): SessionEvent {
  const e: SessionEvent = { id: uuid(), timestamp: now(), stage: session.stage, event, detail, teamId };
  session.events.push(e);
  return e;
}

function addTeamActivity(session: MonkSession, teamId: TeamId, message: string, type: TeamActivity["type"], linkedTeam?: TeamId) {
  const team = session.proposedTeams.find(t => t.teamId === teamId) || session.approvedTeams?.find(t => t.teamId === teamId);
  if (!team) return;
  const activity: TeamActivity = { id: uuid(), timestamp: now(), teamId, message, type, linkedTeam };
  team.activities.push(activity);
}

function setStage(session: MonkSession, stage: SessionStage) {
  session.stage = stage;
  session.updatedAt = now();
  addEvent(session, "STAGE_TRANSITION", `Entered stage: ${stage}`);
}

function buildTeamWorker(teamId: TeamId, reason: string, label: string, description: string): TeamWorker {
  return {
    teamId, label, description,
    icon: TEAM_DEFINITIONS[teamId]?.icon || "🏢",
    status: "QUEUED",
    progress: 0,
    currentTask: "Awaiting dispatch",
    activities: [],
  };
}

/* ── STAGE 1: Create Session ────────────────────────────── */

export async function createSession(idea: string): Promise<MonkSession> {
  const sessionId = uuid();
  const session: MonkSession = {
    sessionVersion: 2,
    sessionId,
    sessionLabel: "New Session",
    idea,
    stage: "IDEA_INTAKE",
    createdAt: now(),
    updatedAt: now(),
    proposedTeams: [],
    clarificationQuestions: [],
    clarificationAnswers: [],
    clarificationComplete: false,
    documentApproved: false,
    documentRevisions: [],
    teamOutputs: [],
    crossFunctionalLinks: [],
    events: [],
    overallProgress: 0,
  };

  addEvent(session, "SESSION_CREATED", `New session: "${idea}"`);
  saveSession(session);

  // Kick off classification asynchronously (don't block response)
  classifySessionIdea(sessionId).catch(console.error);

  return session;
}

/* ── STAGE 1 continued: Classify Idea ──────────────────── */

async function classifySessionIdea(sessionId: string): Promise<void> {
  const session = loadSession(sessionId);
  if (!session) return;

  try {
    addEvent(session, "CLASSIFYING", "AI is classifying your idea...");
    saveSession(session);

    const classification = await classifyIdea(session.idea);
    session.ideaType = classification.ideaType;
    session.sector = classification.sector;
    session.sessionLabel = classification.suggestedLabel;

    addEvent(session, "CLASSIFIED", `Idea classified as ${classification.ideaType} in ${classification.sector}`);

    // Move to team assembly
    setStage(session, "TEAM_ASSEMBLY");
    saveSession(session);

    // Build team proposals
    await proposeTeams(sessionId);
  } catch (e: any) {
    const s = loadSession(sessionId);
    if (s) { s.stage = "FAILED"; s.failureReason = e.message; saveSession(s); }
  }
}

/* ── STAGE 2: Propose Teams ─────────────────────────────── */

async function proposeTeams(sessionId: string): Promise<void> {
  const session = loadSession(sessionId);
  if (!session || !session.ideaType) return;

  try {
    addEvent(session, "ASSEMBLING_TEAM", "MONK AI is selecting the optimal team...");
    saveSession(session);

    const { teams, summary } = await assembleTeam(session.idea, session.ideaType, session.sector || "General");

    session.proposedTeams = teams.map(t => {
      // Sanitize AI hallucinations (e.g. missing teamId or lowercase)
      const rawId = t.teamId || (t as any).id || (t as any).name || "UNKNOWN";
      const teamId = String(rawId).toUpperCase().replace(/\s+/g, "_") as TeamId;
      return buildTeamWorker(teamId, t.reason || "", t.label || teamId, t.description || "");
    });

    addEvent(session, "TEAM_PROPOSED", `${teams.length} departments proposed: ${teams.map(t => t.label).join(", ")}`);
    session.updatedAt = now();
    saveSession(session);
    // Wait for user to approve teams — stays in TEAM_ASSEMBLY
  } catch (e: any) {
    const s = loadSession(sessionId);
    if (s) { s.stage = "FAILED"; s.failureReason = e.message; saveSession(s); }
  }
}

/* ── STAGE 2 → 3: User Approves Teams ──────────────────── */

export async function approveTeams(sessionId: string, req: ApproveTeamsRequest): Promise<MonkSession> {
  const session = loadSession(sessionId);
  if (!session) throw new Error("Session not found");

  // Filter approved teams from proposed
  const approvedWorkers = session.proposedTeams.filter(t => req.teams.includes(t.teamId));
  session.approvedTeams = approvedWorkers;
  session.userModifiedTeams = req.teams.length !== session.proposedTeams.length;

  addEvent(session, "TEAMS_APPROVED", `User approved ${approvedWorkers.length} teams`);
  setStage(session, "CLARIFICATION");
  saveSession(session);

  // Generate clarifying questions in background
  generateQuestions(sessionId).catch(console.error);
  return session;
}

/* ── STAGE 3: Generate Clarifying Questions ─────────────── */

async function generateQuestions(sessionId: string): Promise<void> {
  const session = loadSession(sessionId);
  if (!session || !session.ideaType) return;

  try {
    addEvent(session, "GENERATING_QUESTIONS", "Preparing discovery questions...");
    saveSession(session);

    const { questions } = await generateClarifyingQuestions(session.idea, session.ideaType, session.sector || "General");
    session.clarificationQuestions = questions;
    session.updatedAt = now();
    addEvent(session, "QUESTIONS_READY", `${questions.length} questions generated`);
    saveSession(session);
    // Wait for user to answer — stays in CLARIFICATION
  } catch (e: any) {
    const s = loadSession(sessionId);
    if (s) { s.stage = "FAILED"; s.failureReason = e.message; saveSession(s); }
  }
}

/* ── STAGE 3 → 4: User Answers a Question ──────────────── */

export async function answerQuestion(sessionId: string, answer: ClarificationAnswer): Promise<MonkSession> {
  const session = loadSession(sessionId);
  if (!session) throw new Error("Session not found");

  // Remove previous answer for this question if exists
  session.clarificationAnswers = session.clarificationAnswers.filter(a => a.questionId !== answer.questionId);
  session.clarificationAnswers.push(answer);
  session.updatedAt = now();

  const allAnswered = session.clarificationQuestions.every(q =>
    session.clarificationAnswers.some(a => a.questionId === q.id)
  );

  if (allAnswered) {
    session.clarificationComplete = true;
    addEvent(session, "CLARIFICATION_COMPLETE", "All questions answered. Building startup document...");
    setStage(session, "DOCUMENT_DRAFT");
    saveSession(session);

    // Start document building in background
    buildDocument(sessionId).catch(console.error);
  } else {
    saveSession(session);
  }

  return session;
}

/* ── STAGE 3 → 4: Skip all remaining questions ──────────── */

export async function skipAllQuestions(sessionId: string): Promise<MonkSession> {
  const session = loadSession(sessionId);
  if (!session) throw new Error("Session not found");

  // Fill in null answers for all unanswered questions
  const answeredIds = new Set(session.clarificationAnswers.map(a => a.questionId));
  session.clarificationQuestions.forEach(q => {
    if (!answeredIds.has(q.id)) {
      session.clarificationAnswers.push({ questionId: q.id, answer: null, skipped: true });
    }
  });

  session.clarificationComplete = true;
  addEvent(session, "CLARIFICATION_SKIPPED", "User skipped remaining questions. AI will decide.");
  setStage(session, "DOCUMENT_DRAFT");
  saveSession(session);

  buildDocument(sessionId).catch(console.error);
  return session;
}

/* ── STAGE 4: Build Document ─────────────────────────────── */

async function buildDocument(sessionId: string, modifications?: string): Promise<void> {
  const session = loadSession(sessionId);
  if (!session || !session.ideaType) return;

  try {
    addEvent(session, "BUILDING_DOCUMENT", "MONK AI is generating your startup document...");
    saveSession(session);

    const answersWithContext = session.clarificationAnswers.map(a => {
      const q = session.clarificationQuestions.find(q => q.id === a.questionId);
      return { question: q?.question || "", answer: a.answer, skipped: a.skipped };
    });

    const { document } = await buildStartupDocument(
      session.idea,
      session.ideaType,
      session.sector || "General",
      answersWithContext,
      (session.approvedTeams || session.proposedTeams).map(t => t.teamId),
      modifications
    );

    session.startupDocument = document;
    addEvent(session, "DOCUMENT_READY", "Startup document generated. Awaiting human review.");
    setStage(session, "DOCUMENT_REVIEW");
    session.overallProgress = 30;
    saveSession(session);
  } catch (e: any) {
    const s = loadSession(sessionId);
    if (s) { s.stage = "FAILED"; s.failureReason = e.message; saveSession(s); }
  }
}

/* ── STAGE 5: User Reviews Document ─────────────────────── */

export async function reviewDocument(sessionId: string, req: ReviewDocumentRequest): Promise<MonkSession> {
  const session = loadSession(sessionId);
  if (!session) throw new Error("Session not found");

  if (req.action === "APPROVE") {
    session.documentApproved = true;
    addEvent(session, "DOCUMENT_APPROVED", "Founder approved the startup document. Dispatching to teams...");
    setStage(session, "TEAM_DISPATCH");
    session.overallProgress = 40;
    saveSession(session);

    // Dispatch teams in background
    dispatchTeams(sessionId).catch(console.error);

  } else if (req.action === "MODIFY" && req.modifications) {
    session.documentRevisions.push(req.modifications);
    addEvent(session, "DOCUMENT_REVISION", `Founder requested modifications: ${req.modifications.slice(0, 80)}...`);
    setStage(session, "DOCUMENT_DRAFT");
    saveSession(session);

    // Rebuild with modifications
    buildDocument(sessionId, req.modifications).catch(console.error);

  } else if (req.action === "REFRAME") {
    session.documentRevisions.push("REFRAME_EVERYTHING");
    addEvent(session, "DOCUMENT_REFRAME", "Founder chose to reframe. Rebuilding from scratch...");
    setStage(session, "DOCUMENT_DRAFT");
    session.startupDocument = undefined;
    saveSession(session);

    // Rebuild completely
    buildDocument(sessionId, "Please reframe the entire approach with fresh perspectives.").catch(console.error);
  }

  return session;
}

/* ── STAGE 6-9: Team Dispatch & Parallel Execution ─────── */

async function dispatchTeams(sessionId: string): Promise<void> {
  const session = loadSession(sessionId);
  if (!session || !session.startupDocument || !session.approvedTeams) return;

  try {
    // STAGE 6: TEAM_DISPATCH
    setStage(session, "TEAM_DISPATCH");
    addEvent(session, "DISPATCHING", "Sending startup document to all departments...");
    saveSession(session);

    // Brief delay to show dispatch animation
    await sleep(1500);

    // STAGE 7: PARALLEL_EXECUTION — set all teams to ACTIVE
    setStage(session, "PARALLEL_EXECUTION");
    session.approvedTeams.forEach(t => {
      t.status = "ACTIVE";
      t.currentTask = "Analyzing startup document...";
      t.assignedAt = now();
      t.progress = 5;
    });
    session.overallProgress = 45;
    saveSession(session);

    // Run teams in parallel batches
    const doc = session.startupDocument;
    const teamIds = session.approvedTeams.map(t => t.teamId);

    // Execute all teams concurrently
    const teamPromises = teamIds.map(teamId => executeTeam(sessionId, teamId, doc));
    await Promise.allSettled(teamPromises);

    // STAGE 8: CROSS_FUNCTIONAL — post team cross-linking
    const s = loadSession(sessionId);
    if (!s) return;

    setStage(s, "CROSS_FUNCTIONAL");
    addEvent(s, "CROSS_FUNCTIONAL", "Teams are communicating and sharing outputs...");
    generateCrossFunctionalLinks(s);
    s.overallProgress = 88;
    saveSession(s);

    await sleep(2000);

    // STAGE 9: OUTPUT_COLLECTION
    const s2 = loadSession(sessionId);
    if (!s2) return;

    setStage(s2, "OUTPUT_COLLECTION");
    addEvent(s2, "COLLECTING", "Assembling all team deliverables...");
    s2.overallProgress = 95;
    saveSession(s2);

    await sleep(1500);

    // STAGE 10: COMPLETE
    const s3 = loadSession(sessionId);
    if (!s3) return;

    setStage(s3, "COMPLETE");
    s3.overallProgress = 100;
    addEvent(s3, "COMPLETE", `All ${s3.approvedTeams?.length || 0} teams finished. ${s3.teamOutputs.length} deliverables ready for download.`);
    saveSession(s3);

  } catch (e: any) {
    console.error("dispatchTeams error:", e);
    const s = loadSession(sessionId);
    if (s) { s.stage = "FAILED"; s.failureReason = e.message; saveSession(s); }
  }
}

async function executeTeam(sessionId: string, teamId: TeamId, doc: import("./types").StartupDocument): Promise<void> {
  try {
    let content = "";
    let outputType: import("./types").OutputType = "PRD";
    let title = "";

    // Update progress: working
    updateTeamProgress(sessionId, teamId, 20, "Analyzing requirements...");
    await sleep(500 + Math.random() * 1000);

    // Generate team-specific output
    switch (teamId) {
      case "PRODUCT":
        updateTeamProgress(sessionId, teamId, 40, "Writing PRD and user stories...");
        content = await runProductTeam(doc);
        outputType = "PRD"; title = "Product Requirements Document";
        break;
      case "ENGINEERING":
        updateTeamProgress(sessionId, teamId, 40, "Building technical architecture and website code...");
        const engOut = await runEngineeringTeam(doc);
        // Store TRD
        pushTeamOutput(sessionId, teamId, "TRD", "Technical Requirements Document", engOut.trd);
        // Store website
        content = engOut.websiteCode;
        outputType = "WEBSITE_CODE"; title = "Working Website (Next.js)";
        break;
      case "DESIGN":
        updateTeamProgress(sessionId, teamId, 40, "Creating design system and brand guidelines...");
        content = await runDesignTeam(doc);
        outputType = "DESIGN_SYSTEM"; title = "Design System & Brand Guide";
        break;
      case "RESEARCH":
        updateTeamProgress(sessionId, teamId, 40, "Conducting technology and market research...");
        content = await runResearchTeam(doc);
        outputType = "RD_REPORT"; title = "R&D Technology Assessment";
        break;
      case "MARKETING":
        updateTeamProgress(sessionId, teamId, 40, "Building go-to-market strategy...");
        content = await runMarketingTeam(doc);
        outputType = "GTM_STRATEGY"; title = "Go-to-Market Strategy";
        break;
      case "FINANCE":
        updateTeamProgress(sessionId, teamId, 40, "Modeling financial projections...");
        content = await runFinanceTeam(doc);
        outputType = "FINANCIAL_PROJECTIONS"; title = "12-Month Financial Projections";
        break;
      case "LEGAL":
        updateTeamProgress(sessionId, teamId, 40, "Drafting legal compliance checklist...");
        content = await runLegalTeam(doc);
        outputType = "LEGAL_CHECKLIST"; title = "Legal & Compliance Checklist";
        break;
      case "SALES":
        updateTeamProgress(sessionId, teamId, 40, "Writing sales playbook and ICP...");
        content = await runSalesTeam(doc);
        outputType = "GTM_STRATEGY"; title = "Sales Strategy & Growth Playbook";
        break;
      default:
        updateTeamProgress(sessionId, teamId, 40, `${TEAM_DEFINITIONS[teamId]?.label || teamId} team working...`);
        content = await runGenericTeam(teamId, doc);
        outputType = "PRD"; title = `${TEAM_DEFINITIONS[teamId]?.label || teamId} Deliverable`;
        break;
    }

    updateTeamProgress(sessionId, teamId, 80, "Finalizing deliverable...");
    pushTeamOutput(sessionId, teamId, outputType, title, content);
    updateTeamProgress(sessionId, teamId, 100, "Deliverable complete ✓", "DONE");

  } catch (e: any) {
    updateTeamProgress(sessionId, teamId, 0, `Error: ${e.message}`, "BLOCKED");
  }
}

function updateTeamProgress(sessionId: string, teamId: TeamId, progress: number, task: string, status?: import("./types").TeamStatus) {
  const s = loadSession(sessionId);
  if (!s) return;
  const team = s.approvedTeams?.find(t => t.teamId === teamId) || s.proposedTeams.find(t => t.teamId === teamId);
  if (!team) return;
  team.progress = progress;
  team.currentTask = task;
  if (status) { team.status = status; if (status === "DONE") team.completedAt = now(); }
  addTeamActivity(s, teamId, task, status === "DONE" ? "OUTPUT_READY" : "UPDATE");
  const allTeams = s.approvedTeams || s.proposedTeams;
  s.overallProgress = Math.min(88, 45 + (allTeams.reduce((sum, t) => sum + t.progress, 0) / allTeams.length) * 0.43);
  saveSession(s);
}

function pushTeamOutput(sessionId: string, teamId: TeamId, outputType: import("./types").OutputType, title: string, content: string) {
  const s = loadSession(sessionId);
  if (!s) return;
  const output: TeamOutput = {
    teamId, outputType, title, content,
    completedAt: now(),
    wordCount: content.split(/\s+/).length,
  };
  s.teamOutputs.push(output);
  // Also update team's own output ref
  const team = s.approvedTeams?.find(t => t.teamId === teamId) || s.proposedTeams.find(t => t.teamId === teamId);
  if (team) team.output = output;
  saveSession(s);
}

function generateCrossFunctionalLinks(session: MonkSession) {
  const teams = (session.approvedTeams || session.proposedTeams).map(t => t.teamId);
  const links: MonkSession["crossFunctionalLinks"] = [];

  // Product → Engineering (PRD feeds tech build)
  if (teams.includes("PRODUCT") && teams.includes("ENGINEERING")) {
    links.push({ fromTeam: "PRODUCT", toTeam: "ENGINEERING", dataType: "PRD → Tech Specs", timestamp: now() });
    addTeamActivity(session, "ENGINEERING", "Received PRD from Product team", "CROSS_FUNCTIONAL", "PRODUCT");
  }
  // Design → Engineering (design feeds implementation)
  if (teams.includes("DESIGN") && teams.includes("ENGINEERING")) {
    links.push({ fromTeam: "DESIGN", toTeam: "ENGINEERING", dataType: "Design System → UI Implementation", timestamp: now() });
    addTeamActivity(session, "ENGINEERING", "Received design system from Design team", "CROSS_FUNCTIONAL", "DESIGN");
  }
  // Research → Product (research feeds product decisions)
  if (teams.includes("RESEARCH") && teams.includes("PRODUCT")) {
    links.push({ fromTeam: "RESEARCH", toTeam: "PRODUCT", dataType: "R&D Report → Feature Decisions", timestamp: now() });
    addTeamActivity(session, "PRODUCT", "Received R&D insights from Research team", "CROSS_FUNCTIONAL", "RESEARCH");
  }
  // Finance → Marketing (budget feeds channel strategy)
  if (teams.includes("FINANCE") && teams.includes("MARKETING")) {
    links.push({ fromTeam: "FINANCE", toTeam: "MARKETING", dataType: "Budget → Marketing Spend", timestamp: now() });
    addTeamActivity(session, "MARKETING", "Received budget from Finance team", "CROSS_FUNCTIONAL", "FINANCE");
  }
  // Legal → Compliance (legal feeds compliance)
  if (teams.includes("LEGAL") && teams.includes("COMPLIANCE")) {
    links.push({ fromTeam: "LEGAL", toTeam: "COMPLIANCE", dataType: "Legal Checklist → Compliance Framework", timestamp: now() });
  }
  // Marketing → Sales (GTM feeds sales)
  if (teams.includes("MARKETING") && teams.includes("SALES")) {
    links.push({ fromTeam: "MARKETING", toTeam: "SALES", dataType: "GTM Strategy → Sales Playbook", timestamp: now() });
    addTeamActivity(session, "SALES", "Received GTM strategy from Marketing team", "CROSS_FUNCTIONAL", "MARKETING");
  }

  session.crossFunctionalLinks = links;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
