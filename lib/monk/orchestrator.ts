import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { planProductIntent, proposeEngineeringMutations, reviewCompliance } from "./agents";
import { getRunAppDir, loadRun, saveRun } from "./storage";
import {
  AgentName,
  ArtifactRecord,
  FailureReason,
  MonkRun,
  ProductVertical,
  RunState,
  TelemetryEvent,
  VerificationEvidence,
} from "./types";

const STATE_VERSION = 1;
const ORCHESTRATOR_VERSION = "monk-orchestrator-0.1.0";

const allowedTransitions: Record<RunState, RunState[]> = {
  INTAKE: ["PLANNING"],
  PLANNING: ["COMPLIANCE_REVIEW"],
  COMPLIANCE_REVIEW: ["BLOCKED", "WAITING_APPROVAL"],
  BLOCKED: [],
  WAITING_APPROVAL: ["ENGINEERING", "FAILED"],
  ENGINEERING: ["VERIFYING"],
  VERIFYING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export async function createRun(idea: string): Promise<MonkRun> {
  const cleanIdea = idea.trim();
  if (!cleanIdea) {
    throw new Error("Startup idea is required.");
  }

  const now = new Date().toISOString();
  const runId = `run-${Date.now()}`;
  let run: MonkRun = {
    stateVersion: STATE_VERSION,
    orchestratorVersion: ORCHESTRATOR_VERSION,
    runId,
    runLabel: buildRunLabel(cleanIdea),
    runStatusMessage: "Idea received. Product Manager is preparing scoped intent.",
    lastCheckpoint: "INTAKE_CAPTURED",
    idea: cleanIdea,
    state: "INTAKE",
    createdAt: now,
    updatedAt: now,
    retryCount: 0,
    maxRetries: 1,
    revisionCycles: 0,
    maxRevisionCycles: 2,
    approval: {
      required: true,
      approved: false,
    },
    proposedMutations: [],
    artifacts: [],
    telemetry: [],
    transitions: [],
  };

  run = addTelemetry(run, "PRODUCT_MANAGER", "INTAKE_RECEIVED", "Captured startup idea for governed execution.");
  run = transition(run, "PLANNING", "Product Manager started scoped product planning.");

  const productIntent = planProductIntent(cleanIdea);
  run.productIntent = productIntent;
  run.runStatusMessage = `Product Manager scoped a ${productIntent.vertical} micro-SaaS foundation.`;
  run.lastCheckpoint = "PRODUCT_SCOPED";
  run = addTelemetry(run, "PRODUCT_MANAGER", "PRODUCT_INTENT_CREATED", `${productIntent.entities.join(", ")} entities selected.`);
  run = transition(run, "COMPLIANCE_REVIEW", "Product intent ready for compliance review.");

  const compliance = reviewCompliance(cleanIdea);
  run.compliance = compliance;
  run = addTelemetry(run, "COMPLIANCE_GATEKEEPER", "COMPLIANCE_REVIEWED", `${compliance.severity}: ${compliance.reason}`);

  if (!compliance.approved) {
    run.runStatusMessage = compliance.reason;
    run.lastCheckpoint = "COMPLIANCE_BLOCKED";
    run = transition(run, "BLOCKED", "Compliance severity CRITICAL blocked execution.");
    await saveRun(touch(run));
    return run;
  }

  run.proposedMutations = proposeEngineeringMutations(productIntent, run.idea);
  run.runStatusMessage = `Compliance approved execution. Waiting for human approval before committing ${run.proposedMutations.length} proposed mutations.`;
  run.lastCheckpoint = "COMPLIANCE_APPROVED";
  run = addTelemetry(run, "ENGINEERING_EXECUTOR", "MUTATIONS_PROPOSED_FOR_APPROVAL", run.proposedMutations.map((mutation) => mutation.diffSummary).join("; "));
  run = transition(run, "WAITING_APPROVAL", "Compliance approved. Human approval is required before engineering.");
  await saveRun(touch(run));
  return run;
}

type ApprovalAction = "approve" | "reject" | "request_revision";

type ApprovalOptions = {
  action?: ApprovalAction;
  edits?: {
    runLabel?: string;
    apiRouteName?: string;
  };
};

export async function approveRun(runId: string, options: ApprovalOptions = {}): Promise<MonkRun> {
  let run = await loadRun(runId);
  const action = options.action || "approve";

  if (run.state !== "WAITING_APPROVAL") {
    run = failRun(run, "FAILED_APPROVAL", `Approval attempted from illegal state ${run.state}.`);
    await saveRun(touch(run));
    return run;
  }

  run = applyApprovalEdits(run, options.edits);

  if (action === "reject") {
    run.approval = {
      required: true,
      approved: false,
    };
    run.runStatusMessage = "Human rejected execution before any file mutations were committed.";
    run.lastCheckpoint = "HUMAN_REJECTED";
    run = addTelemetry(run, "HUMAN_APPROVAL", "EXECUTION_REJECTED", "Human rejected proposed mutations before external side effects.");
    run = transition(run, "FAILED", "Human rejected execution at approval interrupt.");
    await saveRun(touch(run));
    return run;
  }

  if (action === "request_revision") {
    if (run.revisionCycles >= run.maxRevisionCycles) {
      run = failRun(run, "FAILED_APPROVAL", "Revision request exceeded maximum revision cycles.");
      await saveRun(touch(run));
      return run;
    }

    run.revisionCycles += 1;
    run.proposedMutations = run.productIntent ? proposeEngineeringMutations(run.productIntent, run.idea) : [];
    run.runStatusMessage = `Human requested revision. Updated shared state and regenerated ${run.proposedMutations.length} proposed mutations.`;
    run.lastCheckpoint = "HUMAN_REVISION_REQUESTED";
    run = addTelemetry(run, "HUMAN_APPROVAL", "REVISION_REQUESTED", "Human edited shared memory and requested revised proposed mutations.");
    await saveRun(touch(run));
    return run;
  }

  run.approval = {
    required: true,
    approved: true,
    approvedAt: new Date().toISOString(),
    approvedBy: "Demo Operator",
  };
  run.runStatusMessage = "Human approval received. Engineering executor is preparing proposed mutations.";
  run.lastCheckpoint = "HUMAN_APPROVED";
  run = addTelemetry(run, "ORCHESTRATOR", "HUMAN_APPROVAL_COMMITTED", "Execution approval committed by orchestrator.");
  run = transition(run, "ENGINEERING", "Human approval committed. Engineering can propose mutations.");

  try {
    run = await executeEngineering(run);
    run = transition(run, "VERIFYING", "Engineering mutations committed. Verification started.");
    run = await verifyRun(run);

    if (run.evidence) {
      run.runStatusMessage = run.evidence.humanReadableSummary;
      run.lastCheckpoint = "VERIFICATION_PASSED";
      run = transition(run, "COMPLETED", "Verification passed with content evidence.");
    } else {
      run = failRun(run, "FAILED_VALIDATION", "Verification did not produce evidence.");
    }
  } catch (error) {
    run.retryCount += 1;
    run = addTelemetry(run, "ENGINEERING_EXECUTOR", "ENGINEERING_ERROR", error instanceof Error ? error.message : "Unknown engineering error.");

    if (run.retryCount <= run.maxRetries) {
      try {
        run = await executeEngineering(run);
        run = transition(run, "VERIFYING", "Engineering retry committed. Verification started.");
        run = await verifyRun(run);
        if (run.evidence) {
          run.runStatusMessage = run.evidence.humanReadableSummary;
          run.lastCheckpoint = "VERIFICATION_PASSED";
          run = transition(run, "COMPLETED", "Verification passed after engineering retry.");
        }
      } catch {
        run = failRun(run, "FAILED_ENGINEERING", "Engineering failed after retry limit.");
      }
    } else {
      run = failRun(run, "FAILED_ENGINEERING", "Engineering failed after retry limit.");
    }
  }

  await saveRun(touch(run));
  return run;
}

export async function getRun(runId: string) {
  return loadRun(runId);
}

function transition(run: MonkRun, nextState: RunState, reason: string): MonkRun {
  const previousState = run.state;
  if (!allowedTransitions[previousState].includes(nextState)) {
    const failed = failRun(run, "FAILED_TRANSITION", `Illegal transition ${previousState} -> ${nextState}.`);
    return addTelemetry(failed, "ORCHESTRATOR", "TRANSITION_REJECTED", reason);
  }

  const timestamp = new Date().toISOString();
  return touch({
    ...run,
    state: nextState,
    transitions: [
      ...run.transitions,
      {
        previousState,
        nextState,
        reason,
        timestamp,
        triggeringAgent: "ORCHESTRATOR",
      },
    ],
    telemetry: [
      ...run.telemetry,
      {
        id: `evt-${String(run.telemetry.length + 1).padStart(3, "0")}`,
        timestamp,
        agent: "ORCHESTRATOR",
        event: "STATE_TRANSITION",
        detail: `${previousState} -> ${nextState}: ${reason}`,
      },
    ],
  });
}

async function executeEngineering(run: MonkRun): Promise<MonkRun> {
  if (!run.productIntent) {
    throw new Error("Product intent missing.");
  }

  const proposedMutations = run.proposedMutations.length > 0 ? run.proposedMutations : proposeEngineeringMutations(run.productIntent, run.idea);
  run.proposedMutations = proposedMutations;
  run.revisionCycles += 1;
  run.runStatusMessage = "Human-approved mutations received. Orchestrator is committing files.";
  run.lastCheckpoint = "ENGINEERING_PROPOSED";
  run = addTelemetry(run, "ENGINEERING_EXECUTOR", "APPROVED_MUTATIONS_READY", proposedMutations.map((mutation) => mutation.diffSummary).join("; "));

  const committed: ArtifactRecord[] = [];
  for (const mutation of proposedMutations) {
    const commitId = `mutation-${String(run.artifacts.length + committed.length + 1).padStart(3, "0")}`;
    const safePath = normalizeArtifactPath(mutation.path);
    const target = path.join(getRunAppDir(run.runId), safePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, mutation.content, "utf8");
    committed.push({
      ...mutation,
      path: safePath,
      commitId,
      verificationStatus: "PENDING",
    });
  }

  run.artifacts = [...run.artifacts, ...committed];
  run.runStatusMessage = `Orchestrator committed ${committed.length} business-specific file mutations.`;
  run.lastCheckpoint = "MUTATIONS_COMMITTED";
  return addTelemetry(run, "ORCHESTRATOR", "MUTATIONS_COMMITTED", committed.map((artifact) => `${artifact.commitId}: ${artifact.diffSummary}`).join("; "));
}

async function verifyRun(run: MonkRun): Promise<MonkRun> {
  if (!run.productIntent) {
    return failRun(run, "FAILED_VALIDATION", "Product intent missing during verification.");
  }

  const vertical = run.productIntent.vertical;
  const files = run.artifacts.map((artifact) => artifact.path);
  const contentByPath = new Map(run.artifacts.map((artifact) => [artifact.path, artifact.content.toLowerCase()]));
  const checks = getVerificationChecks(vertical, run);

  const matchedRoutes = checks.routes.filter((route) => files.includes(route));
  const matchedSchemas = checks.schemaTerms.filter((term) => {
    const schema = contentByPath.get("lib/schema.ts") || "";
    return schema.includes(term);
  });
  const matchedTerms = checks.requiredTerms.filter((term) =>
    [...contentByPath.values()].some((content) => content.includes(term))
  );

  const passed =
    matchedRoutes.length === checks.routes.length &&
    matchedSchemas.length === checks.schemaTerms.length &&
    matchedTerms.length === checks.requiredTerms.length &&
    files.includes("package.json");

  run.artifacts = run.artifacts.map((artifact) => ({
    ...artifact,
    verificationStatus: passed ? "PASSED" : "FAILED",
  }));

  if (!passed) {
    return failRun(run, "FAILED_VALIDATION", "Verification failed content checks.");
  }

  const evidence: VerificationEvidence = {
    generatedFiles: files,
    matchedRoutes,
    matchedSchemas,
    telemetrySnapshot: {
      eventCount: run.telemetry.length,
      transitionCount: run.transitions.length,
      artifactCount: run.artifacts.length,
    },
    verificationSummary: `Verified ${files.length} generated files, ${matchedRoutes.length} routes, and ${matchedSchemas.length} schema terms.`,
    humanReadableSummary: buildHumanSummary(vertical),
  };

  run.evidence = evidence;
  run.lastCheckpoint = "VERIFICATION_EVIDENCE_RECORDED";
  run = addTelemetry(run, "VERIFICATION", "CONTENT_VERIFIED", evidence.verificationSummary);
  return touch(run);
}

function failRun(run: MonkRun, failureReason: FailureReason, message: string): MonkRun {
  const nextStateAllowed = allowedTransitions[run.state].includes("FAILED");
  const failed = touch({
    ...run,
    state: nextStateAllowed ? "FAILED" : run.state,
    failureReason,
    runStatusMessage: message,
    lastCheckpoint: failureReason,
  });

  return addTelemetry(failed, "ORCHESTRATOR", failureReason, message);
}

function addTelemetry(run: MonkRun, agent: AgentName, event: string, detail: string): MonkRun {
  const timestamp = new Date().toISOString();
  const telemetry: TelemetryEvent = {
    id: `evt-${String(run.telemetry.length + 1).padStart(3, "0")}`,
    timestamp,
    agent,
    event,
    detail,
  };

  return touch({
    ...run,
    telemetry: [...run.telemetry, telemetry],
  });
}

function touch(run: MonkRun): MonkRun {
  return {
    ...run,
    updatedAt: new Date().toISOString(),
  };
}

function buildRunLabel(idea: string) {
  const intent = planProductIntent(idea);
  if (intent.vertical === "invoice") return "Invoice SaaS Demo Run";
  if (intent.vertical === "task") return "Task Manager Demo Run";
  return "Micro-SaaS Demo Run";
}

function applyApprovalEdits(run: MonkRun, edits?: ApprovalOptions["edits"]): MonkRun {
  if (!edits) return run;

  let updated = run;
  const telemetryDetails: string[] = [];

  if (edits.runLabel) {
    const safeLabel = edits.runLabel.trim().slice(0, 80);
    if (safeLabel) {
      updated = {
        ...updated,
        runLabel: safeLabel,
      };
      telemetryDetails.push(`runLabel changed to "${safeLabel}"`);
    }
  }

  if (edits.apiRouteName && updated.productIntent) {
    const routeName = sanitizeRouteSegment(edits.apiRouteName);
    if (routeName) {
      const oldApiRoute = updated.productIntent.routes.find((route) => route.startsWith("/api/"));
      const nextApiRoute = `/api/${routeName}`;
      updated = {
        ...updated,
        productIntent: {
          ...updated.productIntent,
          routes: updated.productIntent.routes.map((route) => (route === oldApiRoute ? nextApiRoute : route)),
        },
        proposedMutations: updated.proposedMutations.map((mutation) => rewriteApiRouteMutation(mutation, routeName)),
      };
      telemetryDetails.push(`API route changed from ${oldApiRoute || "default"} to ${nextApiRoute}`);
    }
  }

  if (telemetryDetails.length === 0) return updated;

  updated.runStatusMessage = `Human edited shared memory: ${telemetryDetails.join("; ")}.`;
  updated.lastCheckpoint = "HUMAN_STATE_EDITED";
  return addTelemetry(updated, "HUMAN_APPROVAL", "SAFE_STATE_MUTATION", telemetryDetails.join("; "));
}

function sanitizeRouteSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function rewriteApiRouteMutation(mutation: ArtifactRecord | MonkRun["proposedMutations"][number], routeName: string) {
  if (!mutation.path.startsWith("app/api/")) return mutation;

  const previousPath = mutation.path;
  return {
    ...mutation,
    path: `app/api/${routeName}/route.ts`,
    content: mutation.content.replace(/(invoices|tasks|workspace)/gi, routeName),
    reasoningSummary: `${mutation.reasoningSummary} Human approval renamed API route from ${previousPath} to app/api/${routeName}/route.ts.`,
    diffSummary: `Renamed API route to /api/${routeName}`,
  };
}

function normalizeArtifactPath(artifactPath: string) {
  const normalized = path
    .normalize(artifactPath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
    .replace(/\\/g, "/");
  if (path.isAbsolute(normalized) || normalized.includes("..")) {
    throw new Error(`Unsafe artifact path rejected: ${artifactPath}`);
  }
  return normalized;
}

function getVerificationChecks(vertical: ProductVertical, run: MonkRun) {
  const expectedRoutes = run.productIntent?.routes.map(routeToArtifactPath) || [];

  if (vertical === "invoice") {
    return {
      routes: expectedRoutes,
      schemaTerms: ["invoice", "paymentstatus", "amountcents", "duedate"],
      requiredTerms: ["invoice", "payment", "overdue", "clientname"],
    };
  }

  if (vertical === "task") {
    return {
      routes: expectedRoutes,
      schemaTerms: ["task", "taskstatus", "priority", "duedate"],
      requiredTerms: ["kanban", "task", "owner", "in-progress"],
    };
  }

  return {
    routes: expectedRoutes,
    schemaTerms: ["workspacerecord", "customer", "nextaction", "status"],
    requiredTerms: ["workspace", "customer", "next action", "status"],
  };
}

function routeToArtifactPath(route: string) {
  if (route === "/") return "app/page.tsx";
  if (route.startsWith("/api/")) return `app/api/${route.replace("/api/", "")}/route.ts`;
  return `app/${route.replace(/^\//, "")}/page.tsx`;
}

function buildHumanSummary(vertical: ProductVertical) {
  if (vertical === "invoice") {
    return "Invoice SaaS scaffold successfully generated with invoice schema, payment fields, API handlers, and dashboard components.";
  }

  if (vertical === "task") {
    return "Task manager scaffold successfully generated with task schema, kanban routes, task API handlers, and dashboard components.";
  }

  return "Micro-SaaS scaffold successfully generated with workspace schema, API handlers, operating routes, and dashboard components.";
}
