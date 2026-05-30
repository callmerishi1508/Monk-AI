/* ══════════════════════════════════════════════════════════
   MONK AI — Team Agents v2.2
   Per-team AI execution agents — smart mock fallback
   when OpenAI API is unavailable or quota exceeded.
   ══════════════════════════════════════════════════════════ */

import OpenAI from "openai";
import type {
  StartupDocument, TeamId, TeamOutput,
  ClarificationQuestion, IdeaType,
} from "./types";
import {
  mockClassifyIdea, mockAssembleTeam, mockClarifyingQuestions,
  mockStartupDocument, mockTeamOutput, mockWebsiteCode,
} from "./mock-engine";

export let openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
  baseURL: process.env.OPENAI_BASE_URL // Required to route to AnythingLLM
});

export function configureOpenAI(apiKey: string, baseUrl?: string) {
  process.env.OPENAI_API_KEY = apiKey;
  if (baseUrl) process.env.OPENAI_BASE_URL = baseUrl;
  
  openai = new OpenAI({
    apiKey: apiKey || "mock",
    baseURL: baseUrl || undefined
  });
  _apiAvailable = null; // Reset API status to try again
}

/* ── API availability tracking ──────────────────────────── */
// null = unknown (will try), false = quota hit (use mock), true = working
let _apiAvailable: boolean | null = null;

function isApiOn(): boolean {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.trim() === "") return false;
  if (_apiAvailable === false) return false;
  return true;
}

/* ── GPT helper ──────────────────────────────────────────── */

async function gpt<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<T> {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    _apiAvailable = true;
    return JSON.parse(res.choices[0].message.content || "{}") as T;
  } catch (error) {
    console.error("\n🚨 [MONK AI] API Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

function isQuotaError(e: unknown): boolean {
  const err = e as { status?: number; code?: string; message?: string };
  return err?.status === 429 || err?.status === 401 || err?.code === "insufficient_quota" || err?.code === "invalid_api_key" || Boolean(String(err?.message).match(/quota|billing|rate.limit|unauthorized|invalid/i));
}

/* ── Stage 1: Idea Classification ──────────────────────── */

export async function classifyIdea(idea: string): Promise<{
  ideaType: IdeaType;
  sector: string;
  summary: string;
  hasProblemStatement: boolean;
  problemStatement?: string;
  suggestedLabel: string;
}> {
  const getDemoFallback = () => {
    const fallback = mockClassifyIdea(idea);
    fallback.suggestedLabel = `⚡ Demo Mode: ${fallback.suggestedLabel}`;
    fallback.summary = `[SYSTEM ALERT: Live API Quota Exhausted. MONK AI has seamlessly shifted to its local deterministic offline engine.] ${fallback.summary}`;
    return fallback;
  };

  if (!isApiOn()) return getDemoFallback();
  try {
    return await gpt(
      `You are MONK AI's elite idea classification engine with over 30+ years of professional work experience analyzing startup feasibility. Analyze startup ideas regardless of sector.
Classify as PROBLEM_STATEMENT (user describes a problem to solve) or DIRECT_BUILD (user describes product to build).
Sectors: FinTech, HealthTech, EdTech, AgriTech, DeepTech, Cybersecurity, E-Commerce, SaaS, Web3, Social, Gaming, PropTech, LegalTech, ClimaTech, BioTech, FoodTech, Logistics, Media, B2B, B2C, Consumer, Enterprise.
Respond with valid JSON only.`,
      `Classify: "${idea}"
JSON:
{
  "ideaType": "PROBLEM_STATEMENT" | "DIRECT_BUILD",
  "sector": "e.g. FinTech",
  "summary": "one sentence summary",
  "hasProblemStatement": true/false,
  "problemStatement": "problem text or null",
  "suggestedLabel": "e.g. 'TradingAI · May 29'"
}`
    );
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return getDemoFallback();
  }
}

/* ── Stage 2: Team Assembly ─────────────────────────────── */

export async function assembleTeam(idea: string, ideaType: IdeaType, sector: string): Promise<{
  teams: { teamId: TeamId; label: string; description: string; priority: "CORE" | "EXTENDED" | "OPTIONAL"; reason: string }[];
  summary: string;
}> {
  if (!isApiOn()) {
    const r = mockAssembleTeam(sector);
    return { teams: r.teams as any, summary: r.summary };
  }
  try {
    const r = await gpt<{ teams: { teamId: TeamId; label: string; description: string; priority: "CORE" | "EXTENDED" | "OPTIONAL"; reason: string }[]; summary: string }>(
      `You are an elite Chief Operating Officer with 30+ years of professional work experience building world-class startup teams.
Select the exact 4 to 6 critical teams needed to build and launch this specific startup.
Available teams: PRODUCT, ENGINEERING, DESIGN, RESEARCH, MARKETING, LEGAL, FINANCE, SALES, COMPLIANCE, QA, OPERATIONS, SECURITY.
Always include PRODUCT and ENGINEERING.
Return JSON: { "teams": [...], "summary": "..." }`,
      `Idea: "${idea}" | Type: ${ideaType} | Sector: ${sector}`
    );
    return r;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    const r = mockAssembleTeam(sector);
    return { teams: r.teams as any, summary: r.summary };
  }
}

/* ── Stage 3: Clarifying Questions ─────────────────────── */

export async function generateClarifyingQuestions(
  idea: string, ideaType: IdeaType, sector: string
): Promise<{ questions: ClarificationQuestion[] }> {
  if (!isApiOn()) return { questions: mockClarifyingQuestions(idea, ideaType) };
  try {
    const r = await gpt<{ questions: ClarificationQuestion[] }>(
      `You are an elite Product Manager with 30+ years of professional work experience. The user submitted an idea: "${idea}".
Generate 3 to 5 absolutely critical clarification questions needed before writing the PRD and architecture docs.
Return JSON: { "questions": [ { "id": "q1", "question": "string", "context": "why it matters", "examples": ["ex1", "ex2"], "skippable": boolean } ] }`,
      `Idea: "${idea}" | Type: ${ideaType} | Sector: ${sector}`
    );
    return r;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return { questions: mockClarifyingQuestions(idea, ideaType) };
  }
}

/* ── Stage 4: Startup Document Builder ──────────────────── */

export async function buildStartupDocument(
  idea: string,
  ideaType: IdeaType,
  sector: string,
  answers: Array<{ question: string; answer: string | null; skipped: boolean }>,
  teams: TeamId[],
  modifications?: string
): Promise<{ document: StartupDocument }> {
  const getDemoFallback = () => {
    const doc = mockStartupDocument(idea, ideaType, sector);
    doc.executiveSummary = `[SYSTEM ALERT: Offline Engine Active] ${doc.executiveSummary}`;
    doc.suggestedLabel = `⚡ Demo: ${doc.suggestedLabel}`;
    return { document: doc };
  };

  if (!isApiOn()) return getDemoFallback();
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.skipped ? "[Skipped—AI decides]" : a.answer}`).join("\n\n");
  try {
    return await gpt(
      `You are an elite Founding CEO and Systems Architect with 30+ years of professional work experience successfully launching billion-dollar companies.
Write comprehensive, investor-ready startup documents.
${modifications ? `User modifications requested: ${modifications}` : ""}
Be highly creative, specific, and inventive. DO NOT use generic startup templates. Introduce novel business models, aggressive growth loops, and wildly differentiated features. Respond with valid JSON only.`,
      `Build startup document:
Idea: "${idea}" | Type: ${ideaType} | Sector: ${sector} | Teams: ${teams.join(", ")}

Answers:
${answersText}

JSON schema:
{
  "document": {
    "ideaType": "${ideaType}",
    "executiveSummary": "3-4 sentences",
    "problemStatement": "2-3 sentences or null",
    "solution": "2-3 sentences",
    "vision": "long-term vision",
    "mission": "mission statement",
    "uniqueValueProposition": "what makes this unique",
    "targetMarket": "TAM description with size estimate",
    "goals": [{ "title": "...", "description": "...", "metric": "KPI", "timeline": "e.g. 6 months" }],
    "features": [{ "name": "...", "description": "...", "priority": "MUST_HAVE"|"SHOULD_HAVE"|"NICE_TO_HAVE", "effort": "LOW"|"MEDIUM"|"HIGH", "userStory": "As a [user]..." }],
    "competitorAnalysis": [{ "name": "...", "strengths": ["..."], "weaknesses": ["..."], "differentiator": "..." }],
    "techStack": [{ "layer": "...", "technology": "...", "reason": "..." }],
    "roadmap": [{ "name": "...", "duration": "...", "deliverables": ["..."], "teams": ["..."] }],
    "budget": [{ "category": "...", "amount": "...", "notes": "..." }],
    "totalBudgetEstimate": "e.g. $50K for MVP",
    "goToMarket": "3-4 sentences",
    "marketSurvivalGuide": "5-6 sentences",
    "riskAssessment": [{ "title": "...", "impact": "HIGH"|"MEDIUM"|"LOW", "likelihood": "HIGH"|"MEDIUM"|"LOW", "mitigation": "..." }],
    "kpis": [{ "name": "...", "target": "...", "measurement": "..." }],
    "userPersonas": [{ "name": "...", "age": "25-35", "role": "...", "painPoints": ["..."], "goals": ["..."], "techSavviness": "HIGH"|"MEDIUM"|"LOW" }],
    "sector": "${sector}",
    "generatedAt": "${new Date().toISOString()}"
  }
}`,
      4000
    );
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return getDemoFallback();
  }
}

/* ── Team Worker Definitions ────────────────────────────── */

export const TEAM_DEFINITIONS: Record<TeamId, { label: string; description: string; icon: string }> = {
  PRODUCT: { label: "Product Management", description: "PRD, user stories, feature specs, roadmap ownership", icon: "📋" },
  ENGINEERING: { label: "Engineering", description: "Technical architecture, website code, APIs, infrastructure", icon: "⚙️" },
  DESIGN: { label: "Design & UX", description: "Design system, wireframes, UI specs, brand identity", icon: "🎨" },
  RESEARCH: { label: "R&D", description: "Technology assessment, innovation scan, feasibility study", icon: "🔬" },
  MARKETING: { label: "Marketing", description: "Go-to-market strategy, brand voice, content strategy", icon: "📣" },
  LEGAL: { label: "Legal & Policy", description: "Regulatory compliance, legal structure, privacy policy", icon: "⚖️" },
  FINANCE: { label: "Finance", description: "Financial projections, revenue model, cost structure", icon: "💰" },
  SALES: { label: "Sales & Growth", description: "Sales strategy, ICP definition, growth playbook", icon: "📈" },
  COMPLIANCE: { label: "Compliance", description: "Industry regulations, certifications, risk management", icon: "🛡️" },
  QA: { label: "QA & Verification", description: "Quality assurance, testing strategy, acceptance criteria", icon: "✅" },
  OPERATIONS: { label: "Operations", description: "Process design, team structure, operational playbook", icon: "🔄" },
  SECURITY: { label: "Security", description: "Security architecture, threat modeling, data protection", icon: "🔐" },
};

/* ── Per-Team Output Generators ──────────────────────────── */

export async function runProductTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("PRODUCT", doc);
  try {
    const r = await gpt<{ prd: string }>(
      `You are an elite Head of Product with 30+ years of professional work experience. Write an enterprise-grade PRD in clean markdown.
Respond with JSON: { "prd": "full markdown" }`,
      `PRD for:
Summary: ${doc.executiveSummary}
Vision: ${doc.vision}
Features: ${JSON.stringify(doc.features)}
Personas: ${JSON.stringify(doc.userPersonas)}`,
      3000
    );
    return r.prd;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("PRODUCT", doc);
  }
}

export async function runEngineeringTeam(doc: StartupDocument): Promise<{ trd: string; websiteCode: string }> {
  if (!isApiOn()) return { trd: mockTeamOutput("ENGINEERING", doc), websiteCode: mockWebsiteCode(doc) };
  try {
    const [trdR, webR] = await Promise.all([
      gpt<{ trd: string }>(
        `You are an elite CTO with 30+ years of professional work experience. Write a TRD in clean markdown with system architecture, API design, DB schema.
Respond with JSON: { "trd": "full markdown" }`,
        `TRD for: ${doc.executiveSummary}\nStack: ${JSON.stringify(doc.techStack)}`,
        2000
      ),
      gpt<{ code: string }>(
        `You are a legendary senior full-stack engineer and visionary UI designer with 30+ years of professional work experience. Write a complete working Next.js 14 TypeScript landing page using TailwindCSS.
DO NOT just use the standard, boring Hero -> Features -> Pricing layout. Invent a unique, highly creative layout that perfectly matches the vibe of a ${doc.sector} startup.
Use unique colors, sophisticated spacing, and novel sections (like interactive demos, live data feeds, or terminal windows).
Respond with JSON: { "code": "complete Next.js page code" }`,
        `Startup: ${doc.suggestedLabel || "Startup"}\nSummary: ${doc.executiveSummary}\nUVP: ${doc.uniqueValueProposition}\nFeatures: ${doc.features.map(f => `${f.name}: ${f.description}`).join("\n")}`,
        3000
      ),
    ]);
    return { trd: trdR.trd, websiteCode: webR.code };
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return { trd: mockTeamOutput("ENGINEERING", doc), websiteCode: mockWebsiteCode(doc) };
  }
}

export async function runDesignTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("DESIGN", doc);
  try {
    const r = await gpt<{ designSystem: string }>(
      `You are an elite Creative Director with 30+ years of professional work experience. Write a comprehensive design system in clean markdown (colors, typography, components, brand).
Respond with JSON: { "designSystem": "full markdown" }`,
      `Design for: ${doc.executiveSummary}\nSector: ${doc.sector}`,
      2000
    );
    return r.designSystem;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("DESIGN", doc);
  }
}

export async function runResearchTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("RESEARCH", doc);
  try {
    const r = await gpt<{ report: string }>(
      `You are an elite Chief Research Officer with 30+ years of professional work experience. Write an R&D and technology assessment report in clean markdown.
Respond with JSON: { "report": "full markdown" }`,
      `Sector: ${doc.sector}\nSolution: ${doc.solution}\nStack: ${JSON.stringify(doc.techStack)}`,
      2000
    );
    return r.report;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("RESEARCH", doc);
  }
}

export async function runMarketingTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("MARKETING", doc);
  try {
    const r = await gpt<{ strategy: string }>(
      `You are an elite CMO with 30+ years of professional work experience. Write a complete go-to-market and marketing strategy in clean markdown.
Respond with JSON: { "strategy": "full markdown" }`,
      `Summary: ${doc.executiveSummary}\nUVP: ${doc.uniqueValueProposition}\nTarget: ${doc.targetMarket}`,
      2000
    );
    return r.strategy;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("MARKETING", doc);
  }
}

export async function runFinanceTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("FINANCE", doc);
  try {
    const r = await gpt<{ projections: string }>(
      `You are an elite CFO with 30+ years of professional work experience. Write 12-month financial projections and business model in clean markdown with tables.
Respond with JSON: { "projections": "full markdown" }`,
      `Summary: ${doc.executiveSummary}\nBudget: ${JSON.stringify(doc.budget)}\nTotal: ${doc.totalBudgetEstimate}`,
      2000
    );
    return r.projections;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("FINANCE", doc);
  }
}

export async function runLegalTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("LEGAL", doc);
  try {
    const r = await gpt<{ legal: string }>(
      `You are an elite General Counsel with 30+ years of professional work experience. Write a legal compliance checklist in clean markdown.
Respond with JSON: { "legal": "full markdown" }`,
      `Summary: ${doc.executiveSummary}\nSector: ${doc.sector}\nRisks: ${JSON.stringify(doc.riskAssessment)}`,
      1500
    );
    return r.legal;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("LEGAL", doc);
  }
}

export async function runSalesTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("SALES", doc);
  try {
    const r = await gpt<{ sales: string }>(
      `You are an elite VP of Sales with 30+ years of professional work experience. Write a sales strategy and growth playbook in clean markdown.
Respond with JSON: { "sales": "full markdown" }`,
      `Summary: ${doc.executiveSummary}\nUVP: ${doc.uniqueValueProposition}\nPersonas: ${JSON.stringify(doc.userPersonas)}`,
      1500
    );
    return r.sales;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput("SALES", doc);
  }
}

export async function runGenericTeam(teamId: TeamId, doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput(teamId, doc);
  const def = TEAM_DEFINITIONS[teamId];
  try {
    const r = await gpt<{ output: string }>(
      `You are an elite head of ${def.label} with 30+ years of professional work experience. Role: ${def.description}. Write a comprehensive deliverable in clean markdown.
Respond with JSON: { "output": "full markdown" }`,
      `Context: ${doc.executiveSummary}\nSector: ${doc.sector}\nSolution: ${doc.solution}`,
      1500
    );
    return r.output;
  } catch (e) {
    if (isQuotaError(e)) _apiAvailable = false;
    return mockTeamOutput(teamId, doc);
  }
}

/* ── Session Label Generator ─────────────────────────────── */

export function buildSessionLabel(sector: string, ideaType: IdeaType): string {
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${sector} ${ideaType === "PROBLEM_STATEMENT" ? "Venture" : "Build"} · ${date}`;
}
