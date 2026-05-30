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
  mockStartupDocument, mockTeamOutput
} from "./mock-engine";
import { queryRAG } from "./rag-engine";
import { runLangGraphEngineering } from "./langgraph-engine";

export let openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "mock",
  baseURL: process.env.OPENAI_BASE_URL // Required to route to AnythingLLM
});

// HARDCODE YOUR GEMINI KEY HERE:
process.env.GEMINI_API_KEY = "AIzaSyCpaLXJNXk_SgDxg1VwSBWGRUt_I5kiU3w";

export function configureOpenAI(apiKey: string, baseUrl?: string, geminiKey?: string) {
  process.env.OPENAI_API_KEY = apiKey;
  if (baseUrl) process.env.OPENAI_BASE_URL = baseUrl;
  if (geminiKey) process.env.GEMINI_API_KEY = geminiKey;

  openai = new OpenAI({
    apiKey: apiKey || "mock",
    baseURL: baseUrl || undefined
  });
  _apiAvailable = null; // Reset API status to try again
  _geminiAvailable = null;
  _cachedGeminiModel = null;
}

/* ── API availability tracking ──────────────────────────── */
// null = unknown (will try), false = quota hit (use mock), true = working
let _apiAvailable: boolean | null = null;
let _geminiAvailable: boolean | null = null;
let _cachedGeminiModel: string | null = null;

function isApiOn(): boolean {
  const hasGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";
  const hasOpenAi = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== "" && process.env.OPENAI_API_KEY !== "mock";
  return Boolean(hasGemini || hasOpenAi);
}

/* ── GPT helper ──────────────────────────────────────────── */

async function gemini<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number
): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini API key missing");

  // Dynamically fetch available models from Google API to prevent "not found" errors
  if (!_cachedGeminiModel) {
    try {
      const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`);
      if (listRes.ok) {
        const data = await listRes.json();
        const valid = (data.models || []).filter((m: any) => m.supportedGenerationMethods?.includes("generateContent") && m.name.includes("gemini"));
        const preferred = valid.find((m: any) => m.name.includes("flash")) || valid.find((m: any) => m.name.includes("pro")) || valid[0];
        if (preferred) _cachedGeminiModel = preferred.name.replace("models/", "");
      }
    } catch (e) {
      console.warn("Failed to auto-fetch Gemini models, falling back to default.", e);
    }
  }
  const modelName = _cachedGeminiModel || "gemini-1.5-flash-latest";

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${key.trim()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [{
        role: "user",
        parts: [{ text: userPrompt }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
        responseMimeType: "application/json"
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("\n🚨 GEMINI RAW ERROR:", errorText);
    const err = new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    (err as any).status = response.status;
    throw err;
  }

  const data = await response.json();
  let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  text = text.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  _geminiAvailable = true;

  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new Error(`Gemini returned invalid JSON. Raw output: ${text.slice(0, 100)}...`);
  }
}

export async function gpt<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2000
): Promise<T> {
  const hasOpenAI = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "mock";
  const hasGemini = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "";

  if (hasOpenAI) {
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
      console.error("\n🚨 [MONK AI] OpenAI API Error:", error instanceof Error ? error.message : error);
      if (hasGemini) {
        console.log("🔄 [MONK AI] OpenAI failed. Falling back to Gemini...");
        return await gemini<T>(systemPrompt, userPrompt, maxTokens);
      }
      throw error;
    }
  } else if (hasGemini) {
    try {
      return await gemini<T>(systemPrompt, userPrompt, maxTokens);
    } catch (error) {
      console.error("\n🚨 [MONK AI] Gemini API Error:", error instanceof Error ? error.message : error);
      if (isQuotaError(error)) _geminiAvailable = false;
      throw error;
    }
  }

  throw new Error("No API available (OpenAI or Gemini)");
}

function isQuotaError(e: unknown): boolean {
  const err = e as { status?: number; code?: string; message?: string };
  if (err?.status === 429 || err?.status === 401 || err?.status === 403) return true;
  const msg = String(err?.message).toLowerCase();
  return err?.code === "insufficient_quota" || err?.code === "invalid_api_key" || Boolean(msg.match(/quota|billing|rate.?limit|unauthorized/i)) || (msg.includes("invalid") && msg.includes("key"));
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
  // We now delegate Engineering to the sophisticated cyclical LangGraph pipeline
  return await runLangGraphEngineering(doc, !isApiOn());
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

  // 1. Query Real-Time RAG Vector Store
  const ragContext = await queryRAG(`Financial metrics, CAC, LTV, and COGS for ${doc.sector} startups`, process.env.OPENAI_API_KEY, !isApiOn());

  try {
    const r = await gpt<{ projections: string }>(
      `You are an elite CFO with 30+ years of professional work experience. Write 12-month financial projections and business model in clean markdown with tables.
CRITICAL: Incorporate the following actual historical market data into your financial model:
${ragContext}
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

  // 1. Query Real-Time RAG Vector Store
  const ragContext = await queryRAG(`Compliance, regulatory laws, and infrastructure requirements for ${doc.sector} startups`, process.env.OPENAI_API_KEY, !isApiOn());

  try {
    const r = await gpt<{ legal: string }>(
      `You are an elite General Counsel with 30+ years of professional work experience. Write a legal compliance checklist in clean markdown.
CRITICAL: You MUST strictly adhere to the following retrieved compliance law guidelines:
${ragContext}
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
  const def = TEAM_DEFINITIONS[teamId] || { label: teamId, description: "Core startup operations" };
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
