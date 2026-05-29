<div align="center">
  <h1>MONK AI</h1>
  <p><strong>Turn Any Idea Into a Company — Autonomous Execution Engine</strong></p>
  <p>
    <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-Ready-blue?logo=typescript" alt="TypeScript" /></a>
    <img src="https://img.shields.io/badge/Status-MVP-success" alt="Status: MVP" />
  </p>
</div>

<br />

> **MONK AI** is an advanced autonomous orchestration system designed to automate the earliest and hardest parts of building a startup. By leveraging a strict deterministic state machine, MONK AI coordinates multiple specialized AI agents (Product, Engineering, Design, Legal, Finance, etc.) to transform a single raw idea into a comprehensive suite of startup deliverables—from PRDs to Financial Models—in minutes.

---

## ⚡ Core Features

- **10-Stage Deterministic Pipeline**: A highly predictable execution graph that guides your idea from intake to final deliverables without hallucination loops.
- **Dynamic Team Assembly**: Automatically provisions the exact departments your idea needs (e.g., *Trust & Safety* for Dating apps, *Compliance* for HealthTech).
- **Parallel AI Execution**: Multiple specialized agents work concurrently to generate Product Requirements (PRD), Technical Specs (TRD), Go-to-Market strategies, and financial models.
- **Human-in-the-Loop Governance**: Built-in approval gates ensure founders maintain complete control over the execution direction before heavy compute begins.
- **Fail-Safe Fallback Engine**: A highly realistic offline mock engine ensures the system runs perfectly and generates tailored documents even if API quotas or keys are exhausted.
- **Command Center Dashboard**: A premium, dark-mode, bento-box UI inspired by modern agentic systems (Sedai.io), featuring real-time activity feeds and progress rings.

## 🏗️ Architecture & Orchestration

MONK AI abandons opaque, non-deterministic agent frameworks in favor of a strictly defined local state machine. This guarantees replay safety, precise telemetry mapping, and a flawless UX.

### The Pipeline Lifecycle

1. **Idea Intake (`IDEA_INTAKE`)**: Synthesizes the raw human intent.
2. **Team Assembly (`TEAM_ASSEMBLY`)**: Selects the appropriate 8+ cross-functional teams.
3. **Clarification (`CLARIFICATION`)**: Asks dynamic questions tailored to the idea (or safely skips via AI).
4. **Document Generation (`DOCUMENT_DRAFT`)**: Creates a comprehensive unified startup profile (Executive Summary, Competitors, Budget, KPIs).
5. **Human Review (`DOCUMENT_REVIEW`)**: Gatekeeper node waiting for explicit founder approval.
6. **Team Dispatch & Execution (`TEAM_DISPATCH` ➔ `PARALLEL_EXECUTION`)**: Fan-out execution where all assembled teams draft their specific deliverables.
7. **Cross-Functional Sync (`CROSS_FUNCTIONAL`)**: (Placeholder for agent debate).
8. **Output Collection (`OUTPUT_COLLECTION` ➔ `COMPLETE`)**: Compiles 9+ deliverables into a downloadable payload.

## 🛠️ Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI & Styling**: React 19, Tailwind CSS 4, Framer Motion
- **Language**: TypeScript
- **State & Storage**: File-based local JSON persistence (`/runs` directory) — absolutely zero database overhead for the MVP.
- **AI Integration**: OpenAI GPT-4o integration wrapped in robust try/catch resilient architectures.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- OpenAI API Key (Optional — the app falls back to a highly realistic intelligent mock engine if omitted or if quotas are hit).

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/callmerishi1508/Monk-AI.git
   cd Monk-AI
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up your environment**:
   Create a `.env` file in the root directory:
   ```env
   OPENAI_API_KEY=your_api_key_here
   ```

4. **Run the development server**:
   ```bash
   npm run dev
   ```

5. **Start Building**:
   Navigate to `http://localhost:3000` and submit an idea like *"I want to build a robotics company"* to watch the orchestration engine spring into action.

## 📂 Repository Structure

```
├── app/                  # Next.js App Router (UI, API routes)
│   ├── api/sessions/     # Backend endpoints for state polling and transitions
│   └── page.tsx          # Main Command Center UI (Pipeline, Dashboard, Feed)
├── lib/monk/             # Core Orchestrator Logic
│   ├── agents.ts         # Specialized AI agent implementations & API fallbacks
│   ├── mock-engine.ts    # Advanced offline deterministic fallback generator
│   ├── orchestrator.ts   # State machine loop and transitions
│   └── types.ts          # Shared schemas and state enums
├── runs/                 # Local JSON persistence directory
└── public/               # Static assets
```

## 🤝 Contributing

We believe the future of software development involves tight collaboration between humans and autonomous agents. If you want to contribute:
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
<div align="center">
  <i>Engineered for the next generation of founders.</i>
</div>