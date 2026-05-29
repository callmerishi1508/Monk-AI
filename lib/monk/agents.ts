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

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "mock" });

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
}

function isQuotaError(e: unknown): boolean {
  const err = e as { status?: number; code?: string; message?: string };
  return err?.status === 429 || err?.code === "insufficient_quota" || Boolean(String(err?.message).match(/quota|billing|rate.limit/i));
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
  if (!isApiOn()) return mockClassifyIdea(idea);
  try {
    return await gpt(
      `You are MONK AI's idea classification engine. Analyze startup ideas regardless of sector.
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
    return mockClassifyIdea(idea);
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
  const allTeams: TeamId[] = ["PRODUCT", "ENGINEERING", "DESIGN", "RESEARCH", "MARKETING", "LEGAL", "FINANCE", "SALES", "COMPLIANCE", "QA", "OPERATIONS", "SECURITY"];
  try {
    return await gpt(
      `You are MONK AI's team assembly engine. Select optimal departments for a startup.
Available: ${allTeams.join(", ")}. Always include PRODUCT and ENGINEERING.
Priority: CORE (always), EXTENDED (after core), OPTIONAL (if time allows).
Respond with valid JSON only.`,
      `Idea: "${idea}" | Type: ${ideaType} | Sector: ${sector}
JSON:
{
  "teams": [{ "teamId": "...", "label": "...", "description": "...", "priority": "CORE"|"EXTENDED"|"OPTIONAL", "reason": "..." }],
  "summary": "..."
}`,
      1500
    );
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
    return await gpt(
      `You are MONK AI's discovery engine. Generate 5-7 targeted, conversational clarifying questions about the startup.
Surface: target users, differentiators, business model, geography, timeline, funding status.
DIRECT_BUILD → focus on uniqueness and features. PROBLEM_STATEMENT → focus on problem depth.
All questions skippable. Respond with valid JSON only.`,
      `Idea: "${idea}" | Type: ${ideaType} | Sector: ${sector}
JSON:
{
  "questions": [{ "id": "q1", "question": "...", "context": "...", "examples": ["...", "..."], "skippable": true }]
}`
    );
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
  if (!isApiOn()) return { document: mockStartupDocument(idea, ideaType, sector) };
  const answersText = answers.map(a => `Q: ${a.question}\nA: ${a.skipped ? "[Skipped—AI decides]" : a.answer}`).join("\n\n");
  try {
    return await gpt(
      `You are MONK AI's startup document architect. Write comprehensive, investor-ready startup documents.
${modifications ? `User modifications requested: ${modifications}` : ""}
Be specific. Include real market data. Be optimistic but realistic. Respond with valid JSON only.`,
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
    return { document: mockStartupDocument(idea, ideaType, sector) };
  }
}

/* ── Team Worker Definitions ────────────────────────────── */

export const TEAM_DEFINITIONS: Record<TeamId, { label: string; description: string; icon: string }> = {
  PRODUCT:     { label: "Product Management", description: "PRD, user stories, feature specs, roadmap ownership",         icon: "📋" },
  ENGINEERING: { label: "Engineering",         description: "Technical architecture, website code, APIs, infrastructure",  icon: "⚙️" },
  DESIGN:      { label: "Design & UX",         description: "Design system, wireframes, UI specs, brand identity",        icon: "🎨" },
  RESEARCH:    { label: "R&D",                 description: "Technology assessment, innovation scan, feasibility study",   icon: "🔬" },
  MARKETING:   { label: "Marketing",           description: "Go-to-market strategy, brand voice, content strategy",       icon: "📣" },
  LEGAL:       { label: "Legal & Policy",      description: "Regulatory compliance, legal structure, privacy policy",     icon: "⚖️" },
  FINANCE:     { label: "Finance",             description: "Financial projections, revenue model, cost structure",       icon: "💰" },
  SALES:       { label: "Sales & Growth",      description: "Sales strategy, ICP definition, growth playbook",            icon: "📈" },
  COMPLIANCE:  { label: "Compliance",          description: "Industry regulations, certifications, risk management",      icon: "🛡️" },
  QA:          { label: "QA & Verification",  description: "Quality assurance, testing strategy, acceptance criteria",   icon: "✅" },
  OPERATIONS:  { label: "Operations",          description: "Process design, team structure, operational playbook",       icon: "🔄" },
  SECURITY:    { label: "Security",            description: "Security architecture, threat modeling, data protection",    icon: "🔐" },
};

/* ── Per-Team Output Generators ──────────────────────────── */

export async function runProductTeam(doc: StartupDocument): Promise<string> {
  if (!isApiOn()) return mockTeamOutput("PRODUCT", doc);
  try {
    const r = await gpt<{ prd: string }>(
      `You are the Head of Product. Write an enterprise-grade PRD in clean markdown.
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
        `You are the CTO. Write a TRD in clean markdown with system architecture, API design, DB schema.
Respond with JSON: { "trd": "full markdown" }`,
        `TRD for: ${doc.executiveSummary}\nStack: ${JSON.stringify(doc.techStack)}`,
        2000
      ),
      gpt<{ code: string }>(
        `You are a senior full-stack engineer. Write a complete working Next.js 14 TypeScript landing page.
Sections: Hero, Features, Pricing, CTA, Footer. Use real content from the startup.
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
      `You are the Creative Director. Write a comprehensive design system in clean markdown (colors, typography, components, brand).
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
      `You are the Chief Research Officer. Write an R&D and technology assessment report in clean markdown.
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
      `You are the CMO. Write a complete go-to-market and marketing strategy in clean markdown.
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
      `You are the CFO. Write 12-month financial projections and business model in clean markdown with tables.
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
      `You are General Counsel. Write a legal compliance checklist in clean markdown.
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
      `You are VP of Sales. Write a sales strategy and growth playbook in clean markdown.
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
      `You are head of ${def.label}. Role: ${def.description}. Write a comprehensive deliverable in clean markdown.
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
