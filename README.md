# MONK AI MVP

MONK AI is a narrow hackathon MVP for governed autonomous execution. A user enters one startup idea, then the system runs a deterministic department flow:

1. Product Manager scopes the product intent.
2. Compliance Gatekeeper approves or blocks execution.
3. Human Approval pauses the run.
4. Engineering Executor proposes business-specific mutations.
5. Orchestrator commits files to `runs/<run-id>/app/`.
6. Verification validates generated content and records evidence.

## Run Locally

```bash
npm install
npm run dev -- --port 3001
```

Open `http://localhost:3001`.

## Demo Inputs

- Safe invoice run: `Invoice SaaS for freelancers to create invoices and track payment status`
- Safe task run: `Task manager SaaS with kanban routes and task APIs for startup operators`
- Blocked run: `Medical diagnosis SaaS for patient prescription recommendations`

## Evidence

Each run persists to `runs/<run-id>/state.json` with state transitions, telemetry, artifacts, commit IDs, compliance severity, approval status, and verification evidence.
