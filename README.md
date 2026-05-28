# MONK AI: Governed Autonomous Execution MVP

MONK AI is a governed, deterministic autonomous orchestration system built for predictability, safety, and local observability. Rather than relying on non-deterministic generalized agent SDKs, MONK AI coordinates discrete, highly specialized agents through a rigid, replayable state machine.

This MVP demonstrates a safe "human-in-the-loop" execution pipeline where high-stakes product changes require explicit compliance checks and human approval before any filesystem side effects are permitted.

## Architecture & Core Concepts

MONK AI is built on a custom deterministic orchestrator running in a local-first Next.js environment. The system strictly enforces the following guarded state transitions:

1.  **Product Manager (`PLANNING`)**: Synthesizes human intent into actionable product routes and requirements.
2.  **Compliance Gatekeeper (`COMPLIANCE_REVIEW`)**: Evaluates the plan against safety heuristics. Identifies regulated or critical terms (e.g., "medical", "billing") and determines the severity.
3.  **Human Approval (`WAITING_APPROVAL`)**: If the compliance severity requires it, execution pauses. The user is prompted to review the proposed mutations and either approve, edit shared memory (e.g., API route naming), or reject the run.
4.  **Engineering Executor (`ENGINEERING`)**: Executes the approved plan by writing mutations directly to the local filesystem.
5.  **Verification (`VERIFYING`)**: Validates the generated artifacts against deterministic safety checks and syntactical rules.
6.  **Telemetry (`COMPLETED / FAILED`)**: Finalizes the run and packages the lifecycle into a replayable `state.json` payload, which populates the Evidence Vault.

### Key Constraints & Design Decisions

*   **No Databases / Local JSON Persistence**: All state, telemetry, and evidence are written deterministically to local JSON files (`runs/<run-id>/state.json`). This ensures the system remains portable and demo-safe without database overhead.
*   **No Redux / No Global State Engines**: React state is managed cleanly at the component level to preserve isolation between the UI graph and the server-side orchestrator.
*   **No Generalized Agent Frameworks**: We avoid opaque frameworks in favor of a strictly defined state machine. This guarantees replay safety and precise telemetry mapping.
*   **No External Deployment Pipelines**: Execution is kept strictly local to highlight the orchestration loop and evidence gathering without cloud coupling.

## Features

*   **Deterministic Replay Engine**: The UI can reconstruct and replay any run from intake to completion, accurately displaying agent handoffs, latency, token costs, and state transitions via the timeline interface.
*   **Evidence Vault**: A dedicated UI panel that transparently exposes creation artifacts, mutation commits, and verification status for full audibility.
*   **Approval Interrupts**: Real-time halting of the execution graph to enforce safety and regulatory boundaries.
*   **Real-time Agent Graph**: Visualizes the pipeline's active node, blocked constraints, and verification statuses during both active execution and replay.

## Tech Stack

*   **Next.js 16 (App Router)**
*   **React 19**
*   **Tailwind CSS 4**
*   **Lucide React** (Iconography)
*   **TypeScript**

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Run the development server**:
    ```bash
    npm run dev
    ```
3.  **Explore the MVP**:
    Navigate to `http://localhost:3000`. Use the "Demo Rehearsal" prompts in the left panel to test standard flows, such as pausing at the human approval gate or triggering a compliance block with medical-related input.

## Repository Structure

```
├── app/                  # Next.js App Router (UI, API routes)
│   ├── api/runs/         # API endpoints for orchestration, approval, and fetching states
│   └── page.tsx          # Main Dashboard UI (Agent Graph, Stream, Evidence Vault)
├── lib/monk/             # Core Orchestrator Logic
│   ├── agents.ts         # Specialized agent implementations
│   ├── orchestrator.ts   # Deterministic state machine
│   ├── storage.ts        # Local JSON persistence interface
│   └── types.ts          # Shared types and state enums
├── runs/                 # Local persistence directory (auto-generated)
└── tailwind.config.*     # Tailwind configuration
```

## Future Considerations

As an MVP, MONK AI sets the architectural foundation for safe, governed AI interactions. Future iterations may safely plug this predictable orchestrator into broader enterprise data stores or deployment CI/CD pipelines, provided the determinism and human-approval gates are maintained.