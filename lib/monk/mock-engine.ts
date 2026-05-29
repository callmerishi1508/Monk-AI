/* ══════════════════════════════════════════════════════════
   MONK AI — Mock Data Engine
   Generates realistic startup data for demo/fallback mode
   when OpenAI API quota is exhausted or key is missing.
   ══════════════════════════════════════════════════════════ */

import type { StartupDocument, ClarificationQuestion, IdeaType } from "./types";

/* ── Sector-aware idea classifier mock ──────────────────── */

export function mockClassifyIdea(idea: string): {
  ideaType: IdeaType;
  sector: string;
  summary: string;
  hasProblemStatement: boolean;
  problemStatement?: string;
  suggestedLabel: string;
} {
  const lower = idea.toLowerCase();
  const isProblem = lower.includes("want to") || lower.includes("solve") || lower.includes("problem") || lower.includes("fix") || lower.includes("help");

  let sector = "SaaS";
  if (lower.includes("trad") || lower.includes("finance") || lower.includes("invest")) sector = "FinTech & Trading";
  else if (lower.includes("health") || lower.includes("medical") || lower.includes("doctor")) sector = "Health & Wellness";
  else if (lower.includes("dating") || lower.includes("match")) sector = "Dating & Relationships";
  else if (lower.includes("social") || lower.includes("connect")) sector = "Social Platform";
  else if (lower.includes("agri") || lower.includes("farm") || lower.includes("food")) sector = "AgriTech & Food";
  else if (lower.includes("cyber") || lower.includes("security") || lower.includes("hack")) sector = "CyberSecurity";
  else if (lower.includes("learn") || lower.includes("educ") || lower.includes("cours")) sector = "EdTech";
  else if (lower.includes("shop") || lower.includes("ecomm") || lower.includes("retail")) sector = "E-Commerce";
  else if (lower.includes("real estate") || lower.includes("property") || lower.includes("rent")) sector = "PropTech";
  else if (lower.includes("legal") || lower.includes("law") || lower.includes("contract")) sector = "LegalTech";
  else if (lower.includes("crypto") || lower.includes("blockchain") || lower.includes("web3")) sector = "Web3";
  else if (lower.includes("game") || lower.includes("gaming") || lower.includes("play")) sector = "Gaming";
  else if (lower.includes("logistics") || lower.includes("deliver") || lower.includes("supply")) sector = "Logistics";
  else if (lower.includes("climate") || lower.includes("green") || lower.includes("sustain")) sector = "ClimaTech";
  else if (lower.includes("bio") || lower.includes("gene") || lower.includes("pharma")) sector = "BioTech";
  else if (lower.includes("robot") || lower.includes("ai") || lower.includes("machine")) sector = "AI & Robotics";

  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const ideaType: IdeaType = isProblem ? "PROBLEM_STATEMENT" : "DIRECT_BUILD";
  
  // Extract a sensible label from the idea if it's short, otherwise use sector
  let shortIdea = idea.replace(/^(i want to build a|i want to start a|build a|create a|make a)\s+/i, "").trim();
  shortIdea = shortIdea.split(" ").slice(0, 3).join(" ");
  shortIdea = shortIdea.charAt(0).toUpperCase() + shortIdea.slice(1);
  const labelPrefix = shortIdea.length > 3 && shortIdea.length < 20 ? shortIdea : sector;

  return {
    ideaType,
    sector,
    summary: `A ${sector} venture focused on: ${idea.slice(0, 100)}`,
    hasProblemStatement: isProblem,
    problemStatement: isProblem ? `Users struggle to ${idea.toLowerCase().replace(/^(i want to|i need to|we want to)\s+/i, "")} efficiently.` : undefined,
    suggestedLabel: `${labelPrefix} ${ideaType === "PROBLEM_STATEMENT" ? "Venture" : "Build"} · ${date}`,
  };
}

/* ── Team assembly mock ──────────────────────────────────── */

export function mockAssembleTeam(sector: string): {
  teams: { teamId: string; label: string; description: string; priority: string; reason: string }[];
  summary: string;
} {
  const core = [
    { teamId: "PRODUCT", label: "Product Management", description: `Define product vision, PRD, and feature roadmap for the ${sector} platform`, priority: "CORE", reason: "Foundation of every startup" },
    { teamId: "ENGINEERING", label: "Engineering", description: `Build the technical architecture and working ${sector} application`, priority: "CORE", reason: "Product must be built" },
    { teamId: "DESIGN", label: "Design & UX", description: `Create the visual identity, user flows, and design system for ${sector}`, priority: "CORE", reason: "UX drives adoption" },
  ];
  
  const extended: { teamId: string; label: string; description: string; priority: string; reason: string }[] = [
    { teamId: "MARKETING", label: "Marketing", description: `Develop go-to-market strategy and brand voice for ${sector} audience`, priority: "EXTENDED", reason: "Growth requires strategy" },
  ];

  if (sector.includes("Health") || sector.includes("FinTech") || sector.includes("Legal") || sector.includes("Trading")) {
    extended.push({ teamId: "COMPLIANCE", label: "Compliance & Risk", description: `Ensure regulatory compliance and audit trails for ${sector}`, priority: "CORE", reason: "Regulatory requirements are strict" });
  } else if (sector.includes("Security") || sector.includes("Web3") || sector.includes("Crypto")) {
    extended.push({ teamId: "SECURITY", label: "Security & Auditing", description: `Architect zero-trust security model and threat prevention for ${sector}`, priority: "CORE", reason: "Mission critical protection" });
  } else if (sector.includes("Dating") || sector.includes("Social") || sector.includes("Gaming")) {
    extended.push({ teamId: "OPERATIONS", label: "Trust & Safety Ops", description: `Build moderation tools, community guidelines, and user safety protocols`, priority: "CORE", reason: "Community safety is paramount" });
  } else {
    extended.push({ teamId: "FINANCE", label: "Finance", description: "Model financial projections, revenue streams, and funding requirements", priority: "EXTENDED", reason: "Sustainability requires planning" });
  }

  extended.push(
    { teamId: "LEGAL", label: "Legal & Policy", description: "Draft compliance checklist, legal structure, and regulatory requirements", priority: "EXTENDED", reason: "Legal protection from day 1" },
    { teamId: "RESEARCH", label: "R&D", description: `Research emerging technologies and innovation opportunities in ${sector}`, priority: "EXTENDED", reason: "Innovation edge" },
    { teamId: "SALES", label: "Sales & Growth", description: "Define ICP, sales process, and growth loops for market penetration", priority: "EXTENDED", reason: "Revenue generation" }
  );

  return {
    teams: [...core, ...extended],
    summary: `Assembled ${core.length + extended.length} departments optimized for a ${sector} startup — ${core.length} core teams and ${extended.length} specialized teams.`,
  };
}

/* ── Clarifying questions mock ───────────────────────────── */

export function mockClarifyingQuestions(idea: string, ideaType: IdeaType): ClarificationQuestion[] {
  const isProblem = ideaType === "PROBLEM_STATEMENT";
  const shortIdea = idea.length > 40 ? idea.slice(0, 40) + "..." : idea;
  
  return [
    {
      id: "q1",
      question: `Who is the primary target audience for this ${isProblem ? "solution" : "product"}?`,
      context: "Understanding your audience shapes every product decision — from features to pricing.",
      examples: ["Gen Z users", "Busy professionals", "Small business owners", "Niche hobbyists"],
      skippable: true,
    },
    {
      id: "q2",
      question: `What makes your approach to "${shortIdea}" unique?`,
      context: "Your differentiator is the core of your value proposition and competitive moat.",
      examples: ["AI-powered personalization", "Hyper-local matching", "Gamified experience", "Focus on privacy/security"],
      skippable: true,
    },
    {
      id: "q3",
      question: "How do you plan to monetize this platform?",
      context: "This determines pricing strategy, go-to-market, and investor story.",
      examples: ["Premium subscription", "Freemium with in-app purchases", "Ad-supported", "Transaction fees"],
      skippable: true,
    },
    {
      id: "q4",
      question: "What is your main strategy for acquiring the first 1,000 users?",
      context: "Go-to-market strategy is critical for early traction and network effects.",
      examples: ["TikTok/Instagram marketing", "SEO and content", "Influencer partnerships", "Viral referral loops"],
      skippable: true,
    },
    {
      id: "q5",
      question: "What is your expected launch timeline and scope?",
      context: "Timeline determines the scope of MVP and which teams need to prioritize which features.",
      examples: ["3 months (rapid MVP)", "6 months (full MVP)", "12 months (polished release)"],
      skippable: true,
    },
  ];
}

/* ── Startup document mock ───────────────────────────────── */

export function mockStartupDocument(idea: string, ideaType: IdeaType, sector: string): StartupDocument {
  const isProblem = ideaType === "PROBLEM_STATEMENT";
  const name = sector + " Platform";

  let sectorFeatures = [
    { name: "AI-Powered Dashboard", description: "Real-time intelligence hub with automated insights, alerts, and recommendations", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want to see all my key metrics in one place so I can make data-driven decisions instantly." },
    { name: "Automated Workflow Engine", description: "No-code automation builder that handles repetitive tasks across the platform", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want to automate my most repetitive workflows so I can focus on high-value activities." },
    { name: "Collaboration Hub", description: "Real-time team workspace with comments, assignments, and progress tracking", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As a team member, I want to collaborate seamlessly so we move faster together." },
    { name: "Smart Reporting", description: "One-click reports with AI-generated summaries and exportable data", priority: "SHOULD_HAVE", effort: "MEDIUM", userStory: "As a manager, I want beautiful reports automatically generated so I can share progress with stakeholders." },
    { name: "API & Integrations", description: "Connect with 50+ popular tools including Slack, Notion, and Google Workspace", priority: "SHOULD_HAVE", effort: "MEDIUM", userStory: "As a power user, I want to integrate with my existing tools so my workflow isn't disrupted." },
    { name: "Mobile App", description: "Native iOS and Android apps with full feature parity", priority: "NICE_TO_HAVE", effort: "HIGH", userStory: "As a mobile user, I want to manage everything from my phone so I stay productive anywhere." },
  ];

  let sectorCompetitors = [
    { name: "Legacy Market Leader", strengths: ["Brand recognition", "Large user base", "Established integrations"], weaknesses: ["Outdated UX", "Expensive pricing", "Slow innovation"], differentiator: "We ship 10x faster and at 80% lower cost with a modern UX" },
    { name: "VC-Backed Startup A", strengths: ["Modern design", "Good funding"], weaknesses: ["Limited features", "Early stage instability", "No AI"], differentiator: "Our AI layer provides capabilities they'll take 2+ years to build" },
    { name: "Enterprise Giant", strengths: ["Enterprise sales", "Compliance features"], weaknesses: ["6-12 month implementation", "$100K+ contracts", "Complex UX"], differentiator: "Self-serve onboarding in minutes, not months" },
  ];

  let sectorPersonas = [
    { name: "Alex — The Hustling Founder", age: "25-35", role: "First-time startup founder", painPoints: ["No time to learn complex tools", "Limited budget", "Needs to move fast"], goals: ["Ship MVP in 3 months", "Find first 10 customers", "Prove the concept before fundraising"], techSavviness: "MEDIUM" },
    { name: "Sam — The Growth PM", age: "28-40", role: "Product Manager at a growing startup", painPoints: ["Too many disconnected tools", "Manual reporting takes hours", "Team alignment is painful"], goals: ["Ship features faster", "Better visibility into metrics", "Reduce tool sprawl"], techSavviness: "HIGH" },
    { name: "Jordan — The SMB Owner", age: "35-55", role: "Owner of a 10-50 person business", painPoints: ["Not technical, needs simplicity", "Can't afford enterprise solutions", "Wants results, not complexity"], goals: ["Automate repetitive work", "Understand business metrics", "Compete with larger players"], techSavviness: "LOW" },
  ];

  if (sector.includes("Dating") || sector.includes("Social")) {
    sectorFeatures = [
      { name: "AI Matchmaking Engine", description: "Hyper-personalized matching algorithm based on deep behavioral data and preferences", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want highly relevant matches so I don't waste time on incompatible people." },
      { name: "Identity Verification", description: "Automated liveness checks and ID scanning to prevent catfishing", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As a user, I want to know the people I talk to are real." },
      { name: "Secure Messaging & Video", description: "In-app encrypted communication to foster connections safely", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As a user, I want to chat safely before giving out my personal contact info." },
      { name: "Trust & Safety Hub", description: "Automated moderation for inappropriate content, spam, and harassment", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want to feel safe and respected while using the platform." },
      { name: "Icebreaker Generator", description: "AI-suggested conversation starters based on shared interests", priority: "SHOULD_HAVE", effort: "LOW", userStory: "As a user, I want help starting conversations to overcome awkwardness." },
      { name: "IRL Event Planner", description: "Curated, safe public spots for first dates integrated directly into the app", priority: "NICE_TO_HAVE", effort: "MEDIUM", userStory: "As a user, I want easy, safe suggestions for where to meet." }
    ];
    sectorCompetitors = [
      { name: "Tinder / Bumble", strengths: ["Massive network effects", "Global brand recognition"], weaknesses: ["Superficial swiping culture", "High user fatigue and churn"], differentiator: "Our AI focuses on deep compatibility and verified, intentional connections." },
      { name: "Hinge", strengths: ["Intent-driven profiles", "Better engagement"], weaknesses: ["Expensive premium tiers", "Limited search filters"], differentiator: "We offer vastly superior matchmaking intelligence at a fraction of the cost." }
    ];
    sectorPersonas = [
      { name: "Jordan — The Intentional Dater", age: "25-35", role: "Young Professional", painPoints: ["Burnout from endless swiping", "Fake profiles and ghosting", "Superficial connections"], goals: ["Find a meaningful, long-term relationship", "Save time filtering out incompatible matches"], techSavviness: "HIGH" },
      { name: "Alex — The Social Explorer", age: "18-25", role: "Student / Graduate", painPoints: ["Hard to meet genuine people in a new city", "Anxiety around first dates"], goals: ["Make genuine connections safely", "Have fun meeting new people"], techSavviness: "HIGH" }
    ];
  } else if (sector.includes("FinTech") || sector.includes("Trading") || sector.includes("Crypto") || sector.includes("Web3")) {
    sectorFeatures = [
      { name: "Real-time Trading Engine", description: "Low-latency execution engine for trades and transactions", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want my trades executed instantly at the exact price I see." },
      { name: "Automated KYC/AML", description: "Frictionless identity verification and compliance checks", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want to open an account quickly without jumping through manual hoops." },
      { name: "Portfolio Analytics", description: "Deep AI-driven insights into portfolio performance and risk", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As a user, I want to understand my financial health at a glance." },
      { name: "Bank-Grade Security", description: "End-to-end encryption, 2FA, and cold storage protocols", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want absolute certainty my funds and data are safe." },
      { name: "Tax Reporting Automation", description: "One-click generation of tax documents and liability estimates", priority: "SHOULD_HAVE", effort: "MEDIUM", userStory: "As a user, I want tax season to be completely pain-free." }
    ];
  } else if (sector.includes("Health") || sector.includes("Bio")) {
    sectorFeatures = [
      { name: "HIPAA-Compliant Records", description: "Secure, encrypted storage of Electronic Health Records (EHR)", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a user, I want my medical data stored with maximum privacy and compliance." },
      { name: "Telehealth Portal", description: "High-definition video consultations with integrated notes", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As a patient, I want to see a doctor remotely without leaving my home." },
      { name: "AI Symptom Triage", description: "Intelligent chatbot to assess urgency and route to the right care", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a patient, I want immediate guidance on whether I need urgent care." },
      { name: "Prescription Management", description: "Automated refills and pharmacy routing", priority: "SHOULD_HAVE", effort: "MEDIUM", userStory: "As a user, I want my medications refilled automatically before I run out." }
    ];
    sectorPersonas = [
      { name: "Dr. Sarah — The Clinic Owner", age: "40-55", role: "Primary Care Physician", painPoints: ["Too much admin work", "Compliance headaches"], goals: ["Spend more time with patients", "Reduce no-shows"], techSavviness: "MEDIUM" },
      { name: "Mark — The Patient", age: "30-65", role: "Patient", painPoints: ["Hard to book appointments", "Lost records"], goals: ["Access care quickly", "Manage prescriptions easily"], techSavviness: "LOW" }
    ];
    sectorCompetitors = [
      { name: "Legacy EHR Systems", strengths: ["Deep hospital integrations", "Familiarity"], weaknesses: ["Terrible UX", "Extremely slow", "Expensive"], differentiator: "Consumer-grade UX with enterprise-grade compliance." }
    ];
  } else if (sector.includes("Cyber") || sector.includes("Security")) {
    sectorFeatures = [
      { name: "Zero-Trust Architecture", description: "Continuous verification and micro-segmentation of all network traffic", priority: "MUST_HAVE", effort: "HIGH", userStory: "As an admin, I want to ensure no unauthorized access happens even if the perimeter is breached." },
      { name: "Automated Threat Hunting", description: "AI-driven anomaly detection to identify zero-day vulnerabilities", priority: "MUST_HAVE", effort: "HIGH", userStory: "As a security analyst, I want the system to flag suspicious behavior automatically." },
      { name: "Incident Response Playbooks", description: "One-click execution of containment and mitigation workflows", priority: "MUST_HAVE", effort: "MEDIUM", userStory: "As an admin, I want to lock down compromised systems instantly." },
      { name: "Vulnerability Scanner", description: "Continuous scanning of dependencies and infrastructure", priority: "SHOULD_HAVE", effort: "MEDIUM", userStory: "As a developer, I want to know if I introduce a vulnerable package." }
    ];
    sectorPersonas = [
      { name: "Elena — The CISO", age: "40-55", role: "Chief Information Security Officer", painPoints: ["Alert fatigue", "Talent shortage", "Compliance audits"], goals: ["Zero breaches", "Automate compliance reporting"], techSavviness: "HIGH" },
      { name: "David — The SecOps Analyst", age: "25-35", role: "Security Operations", painPoints: ["Too many false positives", "Manual log parsing"], goals: ["Respond to real threats faster", "Automate remediation"], techSavviness: "HIGH" }
    ];
    sectorCompetitors = [
      { name: "Enterprise Security Suites", strengths: ["Comprehensive coverage", "Brand trust"], weaknesses: ["Too complex to deploy", "Generates too much noise"], differentiator: "AI-curated alerts with automated remediation playbooks." }
    ];
  }

  return {
    ideaType,
    executiveSummary: `${name} is a next-generation ${sector} solution designed to transform how founders, businesses, and consumers approach ${idea.toLowerCase().replace("i want to ", "").replace("build a", "").trim()}. By leveraging modern AI and automation, we eliminate the friction, cost, and complexity that currently plague this space — delivering a 10x better experience at a fraction of the cost.`,
    problemStatement: isProblem
      ? `The current ${sector} landscape is fragmented, expensive, and inaccessible to most stakeholders. Existing solutions require excessive manual effort, technical expertise, and capital — creating a massive barrier for the majority of potential users. The market is ripe for disruption.`
      : undefined,
    solution: `An AI-powered ${sector} platform that automates the most critical workflows, provides real-time intelligence, and delivers enterprise-grade capabilities at startup-friendly pricing. Our platform combines cutting-edge technology with intuitive design to make ${sector} accessible to everyone.`,
    vision: `To become the world's most trusted ${sector} platform — powering the next generation of experiences in this space.`,
    mission: `Empower every user in the ${sector} space with the tools, intelligence, and automation they need to succeed — regardless of their technical background or budget.`,
    uniqueValueProposition: `The only ${sector} platform that combines AI automation, real-time intelligence, and seamless user experience into a single, beautiful product — delivering results 10x faster at 80% lower cost than alternatives.`,
    targetMarket: `The global ${sector} market is estimated at $50B+ and growing at 25% YoY. Our initial target segment represents a $5B addressable market. With expansion in Year 2, TAM grows to $20B+.`,
    goals: [
      { title: "Launch MVP", description: "Ship a working product with core features to first 100 users", metric: "100 active users", timeline: "Month 3" },
      { title: "Product-Market Fit", description: "Achieve strong retention and NPS from early adopters", metric: "40%+ week-2 retention, NPS > 50", timeline: "Month 6" },
      { title: "Revenue Milestone", description: "Hit first meaningful recurring revenue", metric: "$10K MRR", timeline: "Month 8" },
      { title: "Series Seed", description: "Raise seed funding to accelerate growth", metric: "$500K raised", timeline: "Month 12" },
      { title: "Market Leadership", description: "Become recognized leader in our segment", metric: "1,000 active customers", timeline: "Month 18" },
    ],
    features: sectorFeatures as any,

    competitorAnalysis: sectorCompetitors as any,
    techStack: [
      { layer: "Frontend", technology: "Next.js 15 + TypeScript + TailwindCSS", reason: "Best-in-class developer experience, SEO, and performance" },
      { layer: "Backend", technology: "Node.js + tRPC + Prisma", reason: "Type-safe end-to-end, rapid development, excellent DX" },
      { layer: "Database", technology: "PostgreSQL + Redis", reason: "ACID compliance for transactions, Redis for real-time caching" },
      { layer: "AI/ML", technology: "OpenAI GPT-4o + LangChain", reason: "State-of-art reasoning with structured output support" },
      { layer: "Infrastructure", technology: "Vercel + AWS + Cloudflare", reason: "Zero-config deployments with global CDN and edge computing" },
      { layer: "Auth & Payments", technology: "Clerk + Stripe", reason: "Best-in-class auth with fraud protection + PCI-compliant payments" },
    ],
    roadmap: [
      { name: "Phase 1: Foundation", duration: "Months 1-3", deliverables: ["Core product MVP", "Authentication & onboarding", "Primary workflow engine", "Basic analytics dashboard", "Launch to 100 beta users"], teams: ["PRODUCT", "ENGINEERING", "DESIGN"] },
      { name: "Phase 2: Growth", duration: "Months 4-6", deliverables: ["Advanced AI features", "Integrations marketplace", "Team collaboration features", "Mobile apps (beta)", "Marketing website & content"], teams: ["ENGINEERING", "MARKETING", "DESIGN"] },
      { name: "Phase 3: Scale", duration: "Months 7-12", deliverables: ["Enterprise tier launch", "White-label options", "Advanced analytics", "API for developers", "Seed fundraising"], teams: ["PRODUCT", "SALES", "FINANCE", "LEGAL"] },
    ],
    budget: [
      { category: "Engineering (3 devs × 6 months)", amount: "$90,000", notes: "2 full-stack + 1 AI engineer at competitive startup rates" },
      { category: "Design & UX", amount: "$20,000", notes: "Product designer + brand identity + user research" },
      { category: "Cloud Infrastructure", amount: "$6,000", notes: "AWS + Vercel + databases for 6 months including staging environments" },
      { category: "AI API Costs (OpenAI)", amount: "$5,000", notes: "GPT-4o usage for core AI features at scale" },
      { category: "Marketing & Launch", amount: "$15,000", notes: "Content, ads, PR, conference attendance" },
      { category: "Legal & Compliance", amount: "$8,000", notes: "Company incorporation, IP protection, privacy policy, terms" },
      { category: "Tools & Software", amount: "$3,000", notes: "SaaS subscriptions, design tools, project management" },
      { category: "Contingency (15%)", amount: "$22,050", notes: "Buffer for unexpected costs and opportunities" },
    ],
    totalBudgetEstimate: "$169,050 for full MVP + 12-month runway",
    goToMarket: `Launch with a Product Hunt campaign targeting early adopters in the ${sector} space. Build an SEO content engine around high-intent keywords. Partner with 3-5 influential creators/consultants in our target segment for credibility. Use a freemium model to drive viral adoption — free tier creates stickiness while paid tier captures value from power users.`,
    marketSurvivalGuide: `Win by being the fastest to ship and the most obsessive about user feedback. Own one narrow segment completely before expanding. Price aggressively in Year 1 to build market share — revenue growth follows retention. Build your moat through data network effects: the more users, the smarter your AI. Never compete on features alone; compete on the complete experience and community. Raise enough capital to give yourself 18+ months of runway before you need to raise again.`,
    riskAssessment: [
      { title: "OpenAI API Dependency", impact: "HIGH", likelihood: "LOW", mitigation: "Multi-model strategy with Anthropic/Gemini fallbacks; local model fine-tuning for core features" },
      { title: "Well-funded Competitor Entry", impact: "HIGH", likelihood: "MEDIUM", mitigation: "Move fast, build community, and create switching costs through data and integrations before they can catch up" },
      { title: "Regulatory Changes", impact: "MEDIUM", likelihood: "LOW", mitigation: "Legal counsel from Day 1; build compliance as a feature, not an afterthought; stay ahead of regulation" },
      { title: "Slow User Acquisition", impact: "HIGH", likelihood: "MEDIUM", mitigation: "Multiple acquisition channels; strong SEO from Day 1; partnerships; aggressive product-led growth" },
      { title: "Technical Debt", impact: "MEDIUM", likelihood: "HIGH", mitigation: "20% of every sprint allocated to refactoring; strong code review culture; automated testing from Day 1" },
    ],
    kpis: [
      { name: "Monthly Recurring Revenue (MRR)", target: "$10K by Month 8", measurement: "Stripe dashboard + financial model" },
      { name: "Weekly Active Users (WAU)", target: "500 by Month 6", measurement: "Analytics platform (PostHog)" },
      { name: "Week-2 User Retention", target: "40%+", measurement: "Cohort analysis in PostHog" },
      { name: "Net Promoter Score (NPS)", target: "50+", measurement: "Monthly NPS survey via Typeform" },
      { name: "Customer Acquisition Cost (CAC)", target: "< $50", measurement: "Total marketing spend ÷ new customers" },
      { name: "Lifetime Value (LTV)", target: "> $500", measurement: "ARPU × average retention months" },
      { name: "LTV:CAC Ratio", target: "> 3:1", measurement: "LTV divided by CAC" },
    ],
    userPersonas: sectorPersonas as any,
    sector,
    suggestedLabel: `${sector} Platform`,
    generatedAt: new Date().toISOString(),
  };
}

/* ── Team output mocks ───────────────────────────────────── */

export function mockTeamOutput(teamId: string, doc: StartupDocument): string {
  const templates: Record<string, string> = {
    PRODUCT: `# Product Requirements Document (PRD)
## ${doc.sector} Platform — v1.0

**Status:** Draft | **Owner:** Head of Product | **Last Updated:** ${new Date().toLocaleDateString()}

---

## Executive Summary
${doc.executiveSummary}

## Problem Statement
${doc.problemStatement || doc.solution}

## Goals & Success Metrics
${doc.goals.map((g, i) => `${i + 1}. **${g.title}** — ${g.description}\n   - Metric: ${g.metric}\n   - Timeline: ${g.timeline}`).join("\n\n")}

## User Personas
${doc.userPersonas.map(p => `### ${p.name} (${p.age}, ${p.role})\n**Pain Points:** ${p.painPoints.join(", ")}\n**Goals:** ${p.goals.join(", ")}\n**Tech Savviness:** ${p.techSavviness}`).join("\n\n")}

## Feature Requirements

${doc.features.map((f, i) => `### F${i + 1}: ${f.name}
**Priority:** ${f.priority} | **Effort:** ${f.effort}
**Description:** ${f.description}
**User Story:** ${f.userStory}

**Acceptance Criteria:**
- [ ] Feature is accessible from the main dashboard
- [ ] Works correctly on mobile and desktop
- [ ] Performance: loads in < 2 seconds
- [ ] Error states are handled gracefully
- [ ] Analytics events tracked correctly`).join("\n\n")}

## Out of Scope (v1)
- Advanced reporting beyond basic dashboards
- White-label/custom branding
- Multi-language support
- Legacy system migrations

## Dependencies
- Engineering: API architecture must be finalized by Week 2
- Design: High-fidelity mockups required 2 weeks before each feature sprint
- Legal: Privacy policy and ToS needed before public launch
`,

    ENGINEERING: `# Technical Requirements Document (TRD)
## ${doc.sector} Platform — Engineering Specification

**Author:** CTO | **Version:** 1.0 | **Date:** ${new Date().toLocaleDateString()}

---

## System Architecture Overview

\`\`\`
┌─────────────────────────────────────────────────────┐
│                   CLIENT LAYER                       │
│  Next.js 15 App Router + TypeScript + TailwindCSS   │
└─────────────────────┬───────────────────────────────┘
                      │ HTTPS + WebSockets
┌─────────────────────▼───────────────────────────────┐
│                    API LAYER                          │
│        Node.js + tRPC + Zod Validation              │
└───────────┬──────────────────────┬──────────────────┘
            │                      │
┌───────────▼──────┐    ┌──────────▼─────────────────┐
│   AI ENGINE       │    │    BUSINESS LOGIC           │
│   OpenAI GPT-4o  │    │    Prisma ORM + Redis       │
│   LangChain      │    │    Queue: Bull/BullMQ        │
└──────────────────┘    └──────────┬─────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────┐
│                  DATA LAYER                          │
│    PostgreSQL (primary) + Redis (cache/sessions)    │
└─────────────────────────────────────────────────────┘
\`\`\`

## Tech Stack
${doc.techStack.map(t => `- **${t.layer}:** ${t.technology}\n  *Rationale:* ${t.reason}`).join("\n")}

## Database Schema (Core Tables)
\`\`\`sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  plan ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  owner_id UUID REFERENCES users(id),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activities / Events
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
\`\`\`

## API Endpoints
\`\`\`
POST   /api/auth/register          → Create account
POST   /api/auth/login             → Authenticate
GET    /api/workspace              → Get workspace details
POST   /api/workspace/invite       → Invite team members
GET    /api/dashboard/metrics      → Fetch KPI metrics
POST   /api/workflow/create        → Create automation
GET    /api/workflow/:id/run       → Execute workflow
GET    /api/reports                → List all reports
POST   /api/ai/analyze             → AI analysis endpoint
\`\`\`

## Security Requirements
- All endpoints require JWT authentication
- Rate limiting: 100 req/min per user, 1000 req/min per workspace
- Data encryption at rest (AES-256) and in transit (TLS 1.3)
- OWASP Top 10 compliance mandatory before launch
- SOC2 Type II certification roadmap for enterprise tier

## Performance Targets
- API response time: p50 < 100ms, p99 < 500ms
- Page load (LCP): < 2.5 seconds on 4G connection
- Uptime SLA: 99.9% (< 8.7 hours downtime/year)
- Database query time: < 50ms for all common queries
`,

    DESIGN: `# Design System & Brand Guide
## ${doc.sector} Platform

**Version:** 1.0 | **Created:** ${new Date().toLocaleDateString()}

---

## Brand Identity

### Brand Voice
- **Confident** — We know our domain deeply
- **Accessible** — Complex things explained simply  
- **Forward-thinking** — Always one step ahead
- **Warm** — Professional but human

### Logo Direction
Primary mark: Geometric icon + wordmark
- Icon should convey: intelligence, connection, momentum
- Works on dark and light backgrounds
- Minimum size: 24px height for digital use

---

## Color System

\`\`\`
PRIMARY PALETTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Brand Green     #10B981   Emerald 500
Brand Teal      #14B8A6   Teal 500
Brand Dark      #050508   Base background

NEUTRAL PALETTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Text Primary    #FFFFFF
Text Secondary  #A1A1AA   Zinc 400
Text Muted      #71717A   Zinc 500
Text Dim        #3F3F46   Zinc 700
Border Base     rgba(255,255,255,0.07)
Surface         rgba(255,255,255,0.02)

SEMANTIC COLORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Success         #10B981   Emerald
Warning         #F59E0B   Amber
Error           #EF4444   Red
Info            #6366F1   Indigo
\`\`\`

## Typography

\`\`\`
FONT FAMILIES
Display:    Inter (700, 800)
Body:       Inter (400, 500, 600)
Mono:       JetBrains Mono (400, 500)

TYPE SCALE
9xs:   9px  / line-height: 1.4   (Labels, tags)
xs:    11px / line-height: 1.5   (Captions, metadata)
sm:    13px / line-height: 1.5   (Body small)
base:  15px / line-height: 1.6   (Body default)
lg:    18px / line-height: 1.5   (Subheadings)
xl:    24px / line-height: 1.3   (Headings)
2xl:   32px / line-height: 1.2   (Page titles)
3xl:   48px / line-height: 1.1   (Hero text)
4xl:   64px / line-height: 1.0   (Display)
\`\`\`

## Component Library

### Buttons
- **Primary:** White bg + black text, hover: scale(1.01) + shadow
- **Secondary:** Glass bg + border + white text
- **Destructive:** Red border + red text
- **Ghost:** Transparent + hover background

### Cards
- Background: rgba(255,255,255,0.02)
- Border: 1px solid rgba(255,255,255,0.07)
- Border-radius: 16px–24px
- Hover: border brightens + subtle glow

### Forms
- Input background: rgba(255,255,255,0.03)
- Focus ring: 1px solid rgba(16,185,129,0.3)
- Error state: red border + error message below

## Spacing System (4px base)
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128px

## Animation Principles
- Duration: 150ms (instant) → 300ms (standard) → 500ms (complex)
- Easing: ease-out for entrances, ease-in for exits
- Micro-interactions: always respond to user input within 100ms
`,

    RESEARCH: `# R&D Technology Assessment Report
## ${doc.sector} Sector — Feasibility & Innovation Analysis

**Date:** ${new Date().toLocaleDateString()} | **Prepared by:** R&D Team

---

## Executive Summary
The ${doc.sector} sector is experiencing rapid technological transformation driven by AI, automation, and changing user expectations. This report assesses the technological landscape, identifies innovation opportunities, and provides a feasibility analysis for the proposed platform.

## Technology Landscape

### Current State of ${doc.sector}
The market is dominated by legacy systems built before AI, mobile, and real-time data became mainstream. This creates a significant window of opportunity for a modern, AI-first platform to displace incumbents.

### Emerging Technologies to Leverage
1. **Large Language Models (GPT-4o, Claude)** — For automated insights, content generation, and decision support
2. **Vector Databases (Pinecone, Weaviate)** — For semantic search and personalization at scale
3. **Real-time Data Streaming (Kafka, WebSockets)** — For live dashboards and collaborative features
4. **Edge Computing (Vercel Edge, Cloudflare Workers)** — For global low-latency experiences
5. **Generative UI** — For dynamic, context-aware interface adaptation

### Feasibility Analysis
| Capability | Feasibility | Timeline | Risk |
|-----------|-------------|----------|------|
| Core platform | Very High | 3 months | Low |
| AI integration | High | 2 months | Medium |
| Real-time features | High | 2 months | Low |
| Mobile apps | High | 4 months | Low |
| Enterprise features | Medium | 8 months | Medium |
| Custom AI models | Medium | 12 months | High |

## Innovation Opportunities
1. **AI-Native Workflows** — Most competitors bolt AI on. We build AI-first from Day 1
2. **Predictive Intelligence** — Anticipate user needs before they're expressed
3. **Natural Language Interface** — Control the entire platform through conversation
4. **Automated Compliance** — Real-time regulatory checking built into every workflow
5. **Cross-Platform Intelligence** — Data from integrations creates unique insights competitors can't replicate

## Recommended Technology Decisions
- **Choose Next.js over Remix:** Superior ecosystem, better SEO, more talent pool
- **Choose PostgreSQL over MongoDB:** ACID compliance critical for business data
- **Choose OpenAI over open-source LLMs:** Superior performance justifies API cost at our scale
- **Build on Vercel:** Zero-config deploys accelerate shipping velocity by 3x

## Competitive Technology Moat
Our long-term moat comes from proprietary training data generated by users interacting with the platform. By Month 12, we'll have enough data to fine-tune domain-specific models that competitors cannot replicate without our user base.
`,

    MARKETING: `# Go-to-Market Strategy & Marketing Playbook
## ${doc.sector} Platform — Launch Edition

**Prepared by:** CMO | **Date:** ${new Date().toLocaleDateString()}

---

## Positioning Statement
For ${doc.userPersonas[0]?.role || "startup founders"} who struggle with ${doc.userPersonas[0]?.painPoints[0] || "fragmented tools"}, ${doc.sector} Platform is the only AI-powered solution that ${doc.uniqueValueProposition}. Unlike ${doc.competitorAnalysis[0]?.name || "legacy alternatives"}, our platform delivers results in minutes, not months.

## Target Audience (ICP)

### Primary ICP
${doc.userPersonas.map(p => `**${p.name}** (${p.age}, ${p.role})\n- Core pain: ${p.painPoints[0]}\n- Core goal: ${p.goals[0]}`).join("\n\n")}

## Acquisition Channels

### Tier 1: Organic (0-3 months)
- **Content Marketing:** 2 SEO articles/week targeting high-intent keywords
- **LinkedIn Thought Leadership:** Daily posts from founder account
- **Product Hunt Launch:** Target Top 5 Product of the Day
- **Reddit/Communities:** Genuine value in ${doc.sector}-adjacent subreddits

### Tier 2: Partnerships (3-6 months)
- **Creator Partnerships:** 3-5 influential YouTubers/newsletter writers in the space
- **Integration Partners:** Co-market with complementary tools
- **Accelerator Programs:** Offer startup discounts to YC/Techstars batches

### Tier 3: Paid (6+ months)
- **Google Ads:** Bottom-funnel keyword targeting ($5K/month budget)
- **LinkedIn Ads:** For enterprise tier targeting (by job title + company size)
- **Retargeting:** Website visitors who didn't convert within 7 days

## Content Strategy
| Format | Frequency | Purpose |
|--------|-----------|---------|
| Long-form blog posts | 2/week | SEO + authority |
| LinkedIn posts | Daily | Community + brand |
| YouTube tutorials | 1/week | Education + conversion |
| Email newsletter | Weekly | Retention + upsell |
| Case studies | 2/month | Social proof |
| Webinars | Monthly | Lead generation |

## Launch Plan

**Week -4 to -2:** Build waitlist (target: 500 signups)
**Week -1:** Onboard 20 beta users, gather testimonials
**Launch Day:** Product Hunt + email blast + social media
**Week +1:** Follow up with non-converts, iterate based on feedback
**Month +1:** First case study published, content engine in full swing

## Pricing Strategy
- **Free:** Core features, up to 3 users (viral acquisition engine)
- **Pro ($29/month):** Full features, unlimited users, priority support
- **Enterprise (Custom):** White-label, SLA, dedicated CSM
`,

    FINANCE: `# Financial Projections & Business Model
## ${doc.sector} Platform — 12-Month Financial Model

**Prepared by:** CFO | **Date:** ${new Date().toLocaleDateString()}

---

## Revenue Model
**Primary:** SaaS Subscription (recurring revenue)
**Secondary:** Enterprise contracts + Professional services

## Pricing Tiers
| Tier | Price | Target | Features |
|------|-------|--------|---------|
| Free | $0/mo | Individuals | Core features, 3 users |
| Pro | $29/mo | Teams | Full features, unlimited users |
| Enterprise | Custom | Companies | White-label, SLA, CSM |

## 12-Month Revenue Projections

| Month | Free Users | Pro Users | Enterprise | MRR | ARR Run Rate |
|-------|-----------|-----------|-----------|-----|-------------|
| 1 | 50 | 5 | 0 | $145 | $1,740 |
| 2 | 120 | 15 | 0 | $435 | $5,220 |
| 3 | 250 | 35 | 0 | $1,015 | $12,180 |
| 4 | 500 | 80 | 1 | $2,820 | $33,840 |
| 5 | 800 | 150 | 2 | $5,850 | $70,200 |
| 6 | 1,200 | 250 | 3 | $10,250 | $123,000 |
| 7 | 1,800 | 400 | 5 | $18,100 | $217,200 |
| 8 | 2,500 | 600 | 8 | $28,200 | $338,400 |
| 9 | 3,500 | 900 | 12 | $45,700 | $548,400 |
| 10 | 5,000 | 1,300 | 18 | $68,700 | $824,400 |
| 11 | 7,000 | 1,800 | 25 | $97,200 | $1,166,400 |
| 12 | 10,000 | 2,500 | 35 | $137,500 | $1,650,000 |

## Cost Structure
${doc.budget.map(b => `- **${b.category}:** ${b.amount} — ${b.notes}`).join("\n")}

**Total 12-Month Burn:** ${doc.totalBudgetEstimate}

## Unit Economics (at Month 12)
- **ARPU (Pro):** $29/month
- **CAC:** ~$45 (blended, organic-heavy)
- **LTV:** ~$580 (20-month avg retention)
- **LTV:CAC:** 12.9:1 ✅
- **Gross Margin:** 78% (SaaS standard)
- **Payback Period:** ~1.6 months ✅

## Funding Requirements
**Seed Round Target:** $750,000
**Use of Funds:**
- 60% Engineering & Product (hire 2 senior engineers)
- 20% Sales & Marketing (growth acceleration)
- 15% Operations & Legal
- 5% Contingency

**Runway:** 18 months post-seed
**Next Raise:** Series A at $5M ARR run rate (~Month 18-24)
`,

    LEGAL: `# Legal & Compliance Checklist
## ${doc.sector} Platform — Legal Requirements

**Prepared by:** General Counsel | **Date:** ${new Date().toLocaleDateString()}

---

## Company Formation
- [ ] **Delaware C-Corp incorporation** (recommended for VC-backed startups)
- [ ] **EIN (Employer Identification Number)** from IRS
- [ ] **Registered Agent** in Delaware
- [ ] **Bank account** opened (Mercury or Brex recommended)
- [ ] **Cap table** created in Carta or Pulley
- [ ] **83(b) election** filed within 30 days of founder stock grants
- [ ] **Vesting schedule** documented (standard: 4-year, 1-year cliff)

## Intellectual Property
- [ ] **IP Assignment Agreement** signed by all founders and employees
- [ ] **Trademark search** and registration for brand name + logo
- [ ] **Patent assessment** — identify any patentable innovations
- [ ] **Trade secret policy** — document what constitutes trade secrets
- [ ] **Open-source audit** — ensure all OSS licenses are compatible

## Privacy & Data Protection
- [ ] **Privacy Policy** drafted and published (GDPR + CCPA compliant)
- [ ] **Terms of Service** drafted and published
- [ ] **Data Processing Agreement (DPA)** template for enterprise customers
- [ ] **Cookie consent** mechanism implemented on website
- [ ] **Data retention policy** documented and implemented
- [ ] **Security policy** (SOC2 roadmap if targeting enterprise)

## Employment & Contractors
- [ ] **Employee offer letters** and employment agreements
- [ ] **Contractor agreements** with IP assignment clauses
- [ ] **Non-disclosure agreements (NDAs)** for all who access sensitive info
- [ ] **Non-compete/non-solicit** clauses (where legally enforceable)

## ${doc.sector}-Specific Regulations
- [ ] Assess applicable industry regulations in target markets
- [ ] Financial services licensing (if applicable)
- [ ] Healthcare data compliance HIPAA (if applicable)
- [ ] International trade laws (if applicable)
- [ ] Consumer protection laws in target geographies

## Fundraising Legal
- [ ] **SAFE or Convertible Note** templates prepared for seed round
- [ ] **Investor due diligence** package prepared
- [ ] **409A valuation** obtained before issuing employee stock options
- [ ] **Option pool** established in cap table

## Recommended Legal Counsel
- Startup-focused law firm with SaaS/tech experience
- Budget: $8,000-15,000 for first year (formation + contracts)
- Consider Clerky.com for cost-effective standard documents
`,

    SALES: `# Sales Strategy & Growth Playbook
## ${doc.sector} Platform

**Prepared by:** VP Sales | **Date:** ${new Date().toLocaleDateString()}

---

## Ideal Customer Profile (ICP)

### Primary ICP: Tech-Forward SMB
- **Company Size:** 5-50 employees
- **Revenue:** $500K-$10M ARR
- **Industry:** ${doc.sector} adjacent businesses
- **Geography:** US, UK, Canada (English-first)
- **Decision Maker:** Founder, CEO, or Head of Operations
- **Pain:** ${doc.userPersonas[0]?.painPoints.join(", ") || "Tool overload and manual processes"}
- **Trigger Events:** Raised funding, team growth, process breakdown, competitor losing trust

## Sales Process

### Inbound Motion (Primary)
1. **Awareness:** SEO + Content + Social → website visit
2. **Interest:** Product Hunt / newsletter → sign up for free tier
3. **Trial:** Onboarding sequence → core "aha moment" within 5 minutes
4. **Conversion:** Usage-triggered upgrade email at limit hit
5. **Expansion:** Usage data triggers upsell to higher tier

### Outbound Motion (Month 4+)
1. **Targeting:** LinkedIn Sales Navigator to build ICP list
2. **Personalization:** Research account before outreach (10 min max)
3. **Outreach:** 3-touch sequence over 2 weeks
4. **Demo:** 30-min discovery + demo (record with Loom for async)
5. **Proposal:** Custom ROI calculator shared within 24 hours

## Outreach Templates

### Cold Email Subject Lines (A/B test):
- "Cut your ${doc.sector} workflow time by 80%"
- "How [Company] uses AI to 10x their ${doc.sector} output"
- "Quick question about your current ${doc.sector} stack"

### Email Body Framework:
- **Hook:** Specific pain point relevant to their role/industry
- **Proof:** One specific metric or customer result
- **CTA:** Single clear ask (15-min call OR free trial link)

## Sales Metrics & Targets

| Metric | Month 3 | Month 6 | Month 12 |
|--------|---------|---------|---------|
| MQLs/month | 50 | 200 | 800 |
| Trial signups | 30 | 120 | 500 |
| Trial → Paid Conv. | 15% | 18% | 22% |
| ACV (Pro) | $348 | $348 | $500 |
| Enterprise deals | 0 | 3 | 35 |
| Sales cycle (Pro) | Self-serve | Self-serve | Self-serve |
| Sales cycle (Ent.) | — | 30 days | 45 days |

## Competitive Positioning

| vs. ${doc.competitorAnalysis[0]?.name || "Competitor A"} | Our Advantage |
|---|---|
| Speed | 10x faster to value |
| Price | 80% cheaper |
| UX | Modern vs legacy |
| AI | Native vs bolt-on |
`,
  };

  return templates[teamId] || `# ${teamId} Team Deliverable\n## ${doc.sector} Platform\n\nGenerated by MONK AI for ${doc.sector} sector.\n\n${doc.executiveSummary}\n\n## Key Outputs\n${doc.features.slice(0, 3).map(f => `- **${f.name}:** ${f.description}`).join("\n")}`;
}

export function mockWebsiteCode(doc: StartupDocument): string {
  const name = doc.suggestedLabel?.replace(/·.*/, "").trim() || `${doc.sector} Platform`;
  return `import type { NextPage } from 'next';
import Head from 'next/head';

const features = ${JSON.stringify(doc.features.slice(0, 4).map(f => ({ name: f.name, description: f.description })), null, 2)};

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>${name} — ${doc.uniqueValueProposition.slice(0, 60)}</title>
        <meta name="description" content="${doc.executiveSummary.slice(0, 160)}" />
      </Head>

      <main style={{ fontFamily: 'Inter, sans-serif', background: '#050508', color: '#fff', minHeight: '100vh' }}>
        {/* Navigation */}
        <nav style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#10B981' }}>${name}</span>
          <div style={{ display: 'flex', gap: '12px' }}>
            <a href="#features" style={{ color: '#71717A', textDecoration: 'none', fontSize: '14px' }}>Features</a>
            <a href="#pricing" style={{ color: '#71717A', textDecoration: 'none', fontSize: '14px' }}>Pricing</a>
            <button style={{ background: '#10B981', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              Get Started Free
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section style={{ textAlign: 'center', padding: '100px 40px 80px', maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '100px', padding: '6px 16px', marginBottom: '24px', fontSize: '12px', color: '#10B981', fontWeight: 600 }}>
            ✦ ${doc.sector} · AI-Powered Platform
          </div>
          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.08, marginBottom: '24px', letterSpacing: '-0.03em' }}>
            ${doc.uniqueValueProposition.split(",")[0]}
          </h1>
          <p style={{ fontSize: '18px', color: '#71717A', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.7 }}>
            ${doc.executiveSummary.split(".")[0]}.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '12px', padding: '16px 32px', cursor: 'pointer', fontWeight: 700, fontSize: '16px' }}>
              Start for Free →
            </button>
            <button style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '16px 32px', cursor: 'pointer', fontWeight: 600, fontSize: '16px' }}>
              Watch Demo
            </button>
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', fontSize: '2.5rem', fontWeight: 700, marginBottom: '60px' }}>
            Everything you need to succeed
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {features.map((feature: { name: string; description: string }, i: number) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '32px' }}>
                <div style={{ width: '48px', height: '48px', background: 'rgba(16,185,129,0.1)', borderRadius: '12px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                  {['⚡', '🤖', '📊', '🔗'][i % 4]}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '12px' }}>{feature.name}</h3>
                <p style={{ color: '#71717A', lineHeight: 1.7, fontSize: '14px' }}>{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ padding: '80px 40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>Simple, transparent pricing</h2>
          <p style={{ color: '#71717A', marginBottom: '60px', fontSize: '18px' }}>Start free. Upgrade when you're ready.</p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '900px', margin: '0 auto' }}>
            {[
              { name: 'Free', price: '$0', features: ['Core features', 'Up to 3 users', 'Basic analytics', 'Community support'] },
              { name: 'Pro', price: '$29', features: ['Everything in Free', 'Unlimited users', 'Advanced AI features', 'Priority support'], featured: true },
              { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'White-label options', 'SLA guarantee', 'Dedicated CSM'] },
            ].map((plan, i) => (
              <div key={i} style={{ flex: '1', minWidth: '240px', background: plan.featured ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)', border: \`1px solid \${plan.featured ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)'}\`, borderRadius: '20px', padding: '36px 28px' }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{plan.name}</h3>
                <div style={{ fontSize: '36px', fontWeight: 800, color: plan.featured ? '#10B981' : '#fff', marginBottom: '24px' }}>
                  {plan.price}<span style={{ fontSize: '16px', fontWeight: 400, color: '#71717A' }}>{plan.price !== 'Custom' ? '/mo' : ''}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '28px', textAlign: 'left' }}>
                  {plan.features.map((f, j) => <li key={j} style={{ padding: '6px 0', color: '#A1A1AA', fontSize: '14px' }}>✓ {f}</li>)}
                </ul>
                <button style={{ width: '100%', background: plan.featured ? '#10B981' : 'transparent', color: plan.featured ? '#000' : '#fff', border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '12px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: '100px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '20px' }}>Ready to transform your workflow?</h2>
          <p style={{ color: '#71717A', fontSize: '18px', marginBottom: '40px' }}>Join thousands of teams already using ${name}</p>
          <button style={{ background: '#10B981', color: '#000', border: 'none', borderRadius: '14px', padding: '18px 48px', cursor: 'pointer', fontWeight: 700, fontSize: '18px' }}>
            Start Free Today →
          </button>
        </section>

        {/* Footer */}
        <footer style={{ padding: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center', color: '#3F3F46', fontSize: '13px' }}>
          © ${new Date().getFullYear()} ${name}. Built with MONK AI. All rights reserved.
        </footer>
      </main>
    </>
  );
};

export default Home;
`;
}
