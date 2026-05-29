/* ══════════════════════════════════════════════════════════
   MONK AI — Core Type System v2.0
   Universal Startup Execution Engine
   ══════════════════════════════════════════════════════════ */

/* ── Session Stage Pipeline ─────────────────────────────── */

export type SessionStage =
  | "IDEA_INTAKE"          // 1. Classify idea
  | "TEAM_ASSEMBLY"        // 2. Select departments
  | "CLARIFICATION"        // 3. Q&A with user
  | "DOCUMENT_DRAFT"       // 4. Building startup doc
  | "DOCUMENT_REVIEW"      // 5. Human reviews doc
  | "TEAM_DISPATCH"        // 6. Send to all teams
  | "PARALLEL_EXECUTION"   // 7. All teams working
  | "CROSS_FUNCTIONAL"     // 8. Teams communicating
  | "OUTPUT_COLLECTION"    // 9. Assembling outputs
  | "COMPLETE"             // 10. All done
  | "FAILED";

export type IdeaType = "PROBLEM_STATEMENT" | "DIRECT_BUILD";

export type TeamId =
  | "PRODUCT"
  | "ENGINEERING"
  | "DESIGN"
  | "RESEARCH"
  | "MARKETING"
  | "LEGAL"
  | "FINANCE"
  | "SALES"
  | "COMPLIANCE"
  | "QA"
  | "OPERATIONS"
  | "SECURITY";

export type TeamStatus = "QUEUED" | "ACTIVE" | "REVIEWING" | "BLOCKED" | "DONE";

export type OutputType =
  | "STARTUP_DOCUMENT"
  | "PRD"
  | "TRD"
  | "WEBSITE_CODE"
  | "DESIGN_SYSTEM"
  | "COMPETITOR_ANALYSIS"
  | "MARKET_GUIDE"
  | "FINANCIAL_PROJECTIONS"
  | "LEGAL_CHECKLIST"
  | "RD_REPORT"
  | "GTM_STRATEGY"
  | "USER_PERSONAS";

/* ── Document Schema ────────────────────────────────────── */

export type Goal = {
  title: string;
  description: string;
  metric: string;
  timeline: string;
};

export type Feature = {
  name: string;
  description: string;
  priority: "MUST_HAVE" | "SHOULD_HAVE" | "NICE_TO_HAVE";
  effort: "LOW" | "MEDIUM" | "HIGH";
  userStory: string;
};

export type Competitor = {
  name: string;
  strengths: string[];
  weaknesses: string[];
  differentiator: string;
};

export type Milestone = {
  name: string;
  duration: string;
  deliverables: string[];
  teams: TeamId[];
};

export type BudgetLine = {
  category: string;
  amount: string;
  notes: string;
};

export type Risk = {
  title: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  likelihood: "LOW" | "MEDIUM" | "HIGH";
  mitigation: string;
};

export type KPI = {
  name: string;
  target: string;
  measurement: string;
};

export type UserPersona = {
  name: string;
  age: string;
  role: string;
  painPoints: string[];
  goals: string[];
  techSavviness: "LOW" | "MEDIUM" | "HIGH";
};

export type StartupDocument = {
  ideaType: IdeaType;
  executiveSummary: string;
  problemStatement?: string;
  solution: string;
  vision: string;
  mission: string;
  uniqueValueProposition: string;
  targetMarket: string;
  goals: Goal[];
  features: Feature[];
  competitorAnalysis: Competitor[];
  techStack: { layer: string; technology: string; reason: string }[];
  roadmap: Milestone[];
  budget: BudgetLine[];
  totalBudgetEstimate: string;
  goToMarket: string;
  marketSurvivalGuide: string;
  riskAssessment: Risk[];
  kpis: KPI[];
  userPersonas: UserPersona[];
  sector: string;
  suggestedLabel?: string;
  generatedAt: string;
};

/* ── Team Schema ────────────────────────────────────────── */

export type TeamActivity = {
  id: string;
  timestamp: string;
  teamId: TeamId;
  message: string;
  type: "INFO" | "UPDATE" | "CROSS_FUNCTIONAL" | "OUTPUT_READY" | "BLOCKED";
  linkedTeam?: TeamId;
};

export type TeamOutput = {
  teamId: TeamId;
  outputType: OutputType;
  title: string;
  content: string;          // markdown / code content
  completedAt: string;
  wordCount?: number;
};

export type TeamWorker = {
  teamId: TeamId;
  label: string;
  description: string;
  icon: string;
  status: TeamStatus;
  progress: number;         // 0–100
  currentTask: string;
  activities: TeamActivity[];
  output?: TeamOutput;
  assignedAt?: string;
  completedAt?: string;
};

/* ── Clarification Schema ───────────────────────────────── */

export type ClarificationQuestion = {
  id: string;
  question: string;
  context: string;          // why we need this
  examples?: string[];
  skippable: boolean;
};

export type ClarificationAnswer = {
  questionId: string;
  answer: string | null;    // null = skipped
  skipped: boolean;
};

/* ── Telemetry / Logging ────────────────────────────────── */

export type SessionEvent = {
  id: string;
  timestamp: string;
  stage: SessionStage;
  event: string;
  detail: string;
  teamId?: TeamId;
};

/* ── Root Session Object ────────────────────────────────── */

export type MonkSession = {
  sessionVersion: number;
  sessionId: string;
  sessionLabel: string;
  idea: string;
  ideaType?: IdeaType;
  sector?: string;
  stage: SessionStage;
  createdAt: string;
  updatedAt: string;

  // Team assembly
  proposedTeams: TeamWorker[];
  approvedTeams?: TeamWorker[];
  userModifiedTeams?: boolean;

  // Clarification phase
  clarificationQuestions: ClarificationQuestion[];
  clarificationAnswers: ClarificationAnswer[];
  clarificationComplete: boolean;

  // Document
  startupDocument?: StartupDocument;
  documentApproved: boolean;
  documentRevisions: string[];      // history of user change requests

  // Team execution
  teamOutputs: TeamOutput[];
  crossFunctionalLinks: {           // which team sent data to which
    fromTeam: TeamId;
    toTeam: TeamId;
    dataType: string;
    timestamp: string;
  }[];

  // Telemetry
  events: SessionEvent[];

  // Overall progress
  overallProgress: number;          // 0–100

  // Error
  failureReason?: string;
};

/* ── API Request/Response Schemas ───────────────────────── */

export type CreateSessionRequest = {
  idea: string;
};

export type AnswerQuestionRequest = {
  questionId: string;
  answer: string | null;
  skipped: boolean;
};

export type ReviewDocumentRequest = {
  action: "APPROVE" | "MODIFY" | "REFRAME";
  modifications?: string;           // text describing desired changes
};

export type ApproveTeamsRequest = {
  teams: TeamId[];                  // final approved team list
};

/* ── Legacy Types (kept for compatibility) ─────────────── */
export type RunState = SessionStage;
export type MonkRun = MonkSession;
