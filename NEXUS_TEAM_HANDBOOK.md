# NEXUS AI: Internal Team Handbook & Comprehensive User Manual

**Document Purpose:** This is the master internal reference guide for all team members operating, maintaining, or developing NEXUS. It exhaustively documents every feature, explaining *why* it exists, *how* it operates under the hood, and *step-by-step directions* on how to use it in the frontend UI.

---

## Part 1: Core System Philosophy (For the Team)

Before diving into features, every team member must understand our foundational philosophy. NEXUS is **not** an "AI Chatbot." 

We built NEXUS because standard Large Language Models (LLMs) hallucinate. When processing unstructured corporate intelligence (e.g., market filings, competitor pricing), you cannot trust a probabilistic model to maintain state. 

Instead, NEXUS uses **Deterministic Cognitive Infrastructure**:
1. **Scrape:** Headless Puppeteer browsers scrape unstructured HTML.
2. **Extract:** We force the LLM into a rigid JSON-schema pipeline to extract semantic "Signals" (e.g., `PRICING_COMPRESSION`) rather than generating raw text.
3. **Anchor:** These extracted Signals are mathematically anchored into a deterministic **SQLite Temporal Knowledge Graph**.
4. **Govern:** If the system detects conflicting data or queue saturation, it freezes (`GOVERNANCE_FROZEN`) to protect institutional memory.

---

## Part 2: Exhaustive Feature Deep-Dive & User Manual

### 2.1. Role-Based Access Control (Cognitive Viewports)
**Why it exists:** Executives (CEOs) get overwhelmed by raw data streams; Analysts need deep, granular control. NEXUS filters situational awareness based on the operator's persona.
**How it works:** The React `navStore.ts` tracks the `activePersona`. Changing this invalidates the Graph cache and instantly morphs the CSS layouts and available tools.
**How to use:**
1. Locate the **Persona Selector** in the top navigation bar.
2. Select an Executive role (e.g., `Chief Executive Officer`). Notice how the dashboard becomes muted, sparse, and focuses on high-level intelligence.
3. Switch to a tactical role (e.g., `Threat Intelligence` or `Analyst`). The UI will expand to reveal deep-dive metric panels and chaotic raw event feeds.

### 2.2. Interactive Temporal Knowledge Graph
**Why it exists:** To visualize the exact structural relationships between competitors and market events without relying on invisible "vector embeddings."
**How it works:** An SVG/D3-based canvas that maps `Company` entities (purple nodes) and `Signal` entities (teal/orange nodes). 
**How to use:**
1. The graph occupies the central viewport. Click and drag to pan around the topology. Scroll to zoom.
2. **De-cluttered UX:** By default, you will only see large Company names. We intentionally hide Signal text to prevent UI overlap.
3. **Hover Discovery:** Hover your mouse over any small Signal node. Its human-readable label (e.g., `MARKET EXPANSION`) will smoothly fade in.
4. **Deep Linking:** Click on any node. This dispatches an event to the global store, triggering the Explainability Panel and Copilot to focus entirely on that specific node's history.

### 2.3. Sector Intelligence Filtering
**Why it exists:** Institutional intelligence is too vast to view simultaneously. We must strictly partition contexts.
**How it works:** The `activeSector` state is instantly synced to both the Knowledge Graph visibility rules and the backend FastAPI Copilot payload.
**How to use:**
1. Open the **Sector Dropdown** at the top of the interface.
2. Switch from `Cyber Security` to `Fintech` or `Productivity SaaS`.
3. The Graph will instantaneously recalculate and re-render only the nodes belonging to that sector. The Copilot will also restrict its knowledge exclusively to that domain.

### 2.4. Strategic Intelligence Copilot
**Why it exists:** To allow operators to query the structured graph using natural language.
**How it works:** When queried, the backend explicitly builds a context string containing *only* the graph data for the `activeSector`. It instructs the LLM to adopt the `activePersona` (e.g., "You are the CEO, answer accordingly").
**How to use:**
1. Locate the **Copilot Chat Terminal** on the right side of the screen.
2. Type a strategic query: *"What are the current pricing threats facing our competitors?"*
3. The Agent will respond in character, citing exclusively the deterministic evidence present in the active sector's graph.

### 2.5. Evidence Explainability Panel (Zero-Trust AI)
**Why it exists:** To solve the LLM "black box" problem. When an AI makes an assertion, operators must be able to verify its source mathematically.
**How it works:** During the extraction phase, NEXUS saves the exact raw HTML string alongside the extracted JSON Signal. The Copilot returns `evidence_anchors` linking its answer to these saved strings.
**How to use:**
1. When the Copilot synthesizes a response, look at the adjacent **Explainability Panel**.
2. Or, click on any Signal node in the Knowledge Graph.
3. The panel will display the exact raw text snippet (e.g., a competitor's press release) and the mathematical confidence score indicating why the system generated that Signal.

### 2.6. Temporal Rail (Time Travel)
**Why it exists:** To perform counterfactual analysis. Memory in NEXUS isn't overwritten; it is versioned temporally.
**How it works:** Dragging the slider sends a specific `temporalTarget` UNIX timestamp to the backend. The backend reconstructs the SQLite graph state *exactly* as it existed on that date.
**How to use:**
1. Locate the **Timeline Slider** (Temporal Rail) at the bottom/side of the UI.
2. Toggle the Session Mode switch from `LIVE` (real-time ingestion) to `REPLAY`.
3. Scrub the slider back to a historical milestone (e.g., "Competitor Bankruptcy - Jan 2024").
4. The system triggers a visual `REWINDING` animation. Watch the Graph visually devolve back to its previous state.

### 2.7. System Integrity & Governance Dashboard
**Why it exists:** To prove NEXUS is a live infrastructure, not a mocked prototype. It monitors backend health and protects the database from hallucination spam.
**How it works:** Polls the `/api/system/health` endpoints to monitor SQLite write latency and active Puppeteer scraper threads.
**How to use:**
1. Look at the **Integrity Panel** (usually on the left side).
2. Monitor the **Database Sync** status. If it reads `HEALTHY`, the graph is accepting mutations.
3. Monitor the **Governance State**. If the event bus floods with contradictory data, this will turn RED and display `GOVERNANCE_FROZEN`, proving the system successfully blocked unsafe mutations.

### 2.8. Chaos Engineering Commands (Failure Injection)
**Why it exists:** To demonstrate graceful degradation during hackathon judging.
**How it works:** Simulates catastrophic infrastructure failures to prove NEXUS can survive the loss of its smartest components.
**How to use:**
1. Within the Operations View, you can trigger specific chaos events.
2. **Trigger Inference Timeout:** Force the Local LLM offline. Watch as NEXUS catches the exception, shifts to `DEGRADED` mode, and seamlessly falls back to using traditional Regex extraction to maintain basic situational awareness.
3. **Trigger Queue Saturation:** Flood the system with fake events to manually trigger a `GOVERNANCE_FROZEN` state.

---

## Part 3: Architecture Primer (For Developers)

For engineers getting onboarded into the codebase:

- **Frontend (`nexus-frontend/`):** Built on Next.js 14 and TailwindCSS. Global state is managed strictly by Zustand (`navStore.ts`, `graphStore.ts`). 
  - *Note on Graph UI:* The Knowledge Graph is an SVG-based React component (`KnowledgeGraph.tsx`). Avoid manipulating the DOM directly; always update `graphStore.ts`.
- **Backend (`nexus-backend/`):** Python FastAPI architecture.
  - *Graph Core:* `app/services/graph/` contains the logic for compiling temporal snapshots.
  - *Copilot:* `app/api/copilot.py` handles the LLM routing. It receives the `activeSector` and `activePersona` from the frontend to strictly sandbox the LLM context.
  - *Scraping:* `app/services/scraper/` manages the Puppeteer browser pool.

### Important Engineering Rules:
1. **Never write raw queries from UI to DB.** Always route through the Governance Queue.
2. **UI State is King.** If you add a new API payload (like we did with Sector filtering), ensure it binds dynamically to the `useNavStore` variables so it reacts instantly to executive context switches.
