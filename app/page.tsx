"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  DatabaseZap,
  FileCode2,
  GitCommitHorizontal,
  GitFork,
  Gauge,
  Link2,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import type { AgentName, MonkRun, RunState } from "@/lib/monk/types";

const flowNodes: Array<{ state: RunState; label: string; agent: AgentName }> = [
  { state: "PLANNING", label: "PM Scope", agent: "PRODUCT_MANAGER" },
  { state: "COMPLIANCE_REVIEW", label: "Compliance", agent: "COMPLIANCE_GATEKEEPER" },
  { state: "WAITING_APPROVAL", label: "Approval", agent: "HUMAN_APPROVAL" },
  { state: "ENGINEERING", label: "Engineering", agent: "ENGINEERING_EXECUTOR" },
  { state: "VERIFYING", label: "Verify", agent: "VERIFICATION" },
  { state: "COMPLETED", label: "Evidence", agent: "TELEMETRY" },
];

const stateTone: Record<RunState, string> = {
  INTAKE: "border-slate-600 bg-slate-900 text-slate-200",
  PLANNING: "border-cyan-400 bg-cyan-950/60 text-cyan-100",
  COMPLIANCE_REVIEW: "border-amber-400 bg-amber-950/60 text-amber-100",
  BLOCKED: "border-red-400 bg-red-950/70 text-red-100",
  WAITING_APPROVAL: "border-indigo-400 bg-indigo-950/60 text-indigo-100",
  ENGINEERING: "border-blue-400 bg-blue-950/60 text-blue-100",
  VERIFYING: "border-emerald-400 bg-emerald-950/60 text-emerald-100",
  COMPLETED: "border-green-400 bg-green-950/70 text-green-100",
  FAILED: "border-red-400 bg-red-950/70 text-red-100",
};

const severityTone: Record<string, string> = {
  LOW: "border-emerald-400/50 bg-emerald-950/40 text-emerald-100",
  MEDIUM: "border-yellow-400/50 bg-yellow-950/40 text-yellow-100",
  HIGH: "border-orange-400/50 bg-orange-950/40 text-orange-100",
  CRITICAL: "border-red-400/60 bg-red-950/50 text-red-100",
  PENDING: "border-slate-600 bg-slate-900 text-slate-300",
};

export default function Home() {
  const [idea, setIdea] = useState("Invoice SaaS for freelancers to create invoices and track payment status");
  const [activeRun, setActiveRun] = useState<MonkRun | null>(null);
  const [runs, setRuns] = useState<MonkRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [approvalEdits, setApprovalEdits] = useState({ runLabel: "", apiRouteName: "" });

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (!activeRun) return;
    setApprovalEdits({
      runLabel: activeRun.runLabel,
      apiRouteName: getCurrentApiRouteName(activeRun),
    });
  }, [activeRun?.runId]);

  useEffect(() => {
    if (replayStep === null || !activeRun) return;
    const totalSteps = getReplayStepCount(activeRun);
    if (replayStep >= totalSteps - 1) return;
    const timer = window.setTimeout(() => setReplayStep((value) => (value === null ? null : value + 1)), 560);
    return () => window.clearTimeout(timer);
  }, [replayStep, activeRun]);

  const visibleTelemetry = useMemo(() => {
    if (!activeRun) return [];
    if (replayStep === null) return activeRun.telemetry;
    return activeRun.telemetry.slice(0, Math.min(replayStep + 1, activeRun.telemetry.length));
  }, [activeRun, replayStep]);

  const visibleTransitions = useMemo(() => {
    if (!activeRun) return [];
    if (replayStep === null) return activeRun.transitions;
    const transitionStep = replayStep - activeRun.telemetry.length;
    if (transitionStep < 0) return [];
    return activeRun.transitions.slice(0, Math.min(transitionStep + 1, activeRun.transitions.length));
  }, [activeRun, replayStep]);

  const evidenceVisible = useMemo(() => {
    if (!activeRun) return false;
    if (replayStep === null) return true;
    return replayStep >= activeRun.telemetry.length + activeRun.transitions.length;
  }, [activeRun, replayStep]);

  async function loadRuns() {
    const response = await fetch("/api/runs", { cache: "no-store" });
    const data = await response.json();
    setRuns(data.runs || []);
    if (!activeRun && data.runs?.[0]) setActiveRun(data.runs[0]);
  }

  async function createNewRun() {
    setIsLoading(true);
    setReplayStep(null);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      const data = await response.json();
      if (data.run) {
        setActiveRun(data.run);
        await loadRuns();
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprovalAction(action: "approve" | "reject" | "request_revision") {
    if (!activeRun) return;
    setIsLoading(true);
    setReplayStep(null);
    try {
      const response = await fetch(`/api/runs/${activeRun.runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          edits: approvalEdits,
        }),
      });
      const data = await response.json();
      if (data.run) {
        setActiveRun(data.run);
        await loadRuns();
      }
    } finally {
      setIsLoading(false);
    }
  }

  function startReplay() {
    if (!activeRun || getReplayStepCount(activeRun) === 0) return;
    setReplayStep(0);
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0d121b]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
              <Sparkles size={14} />
              MONK AI
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">Governed Autonomous Execution</h1>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Signal label="State" value={activeRun?.state || "READY"} />
            <Signal label="Compliance" value={activeRun?.compliance?.severity || "PENDING"} />
            <Signal label="Artifacts" value={String(activeRun?.artifacts.length || 0)} />
            <Signal label="Evidence" value={activeRun?.evidence ? "PASSED" : "WAITING"} />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-5 py-4 xl:grid-cols-[330px_minmax(0,1fr)_390px]">
        <LeftPanel
          idea={idea}
          setIdea={setIdea}
          activeRun={activeRun}
          runs={runs}
          isLoading={isLoading}
          createNewRun={createNewRun}
          loadRuns={loadRuns}
          selectRun={(run) => {
            setActiveRun(run);
            setReplayStep(null);
          }}
        />

        <CenterPanel
          run={activeRun}
          visibleTelemetry={visibleTelemetry}
          visibleTransitions={visibleTransitions}
          replaying={replayStep !== null}
          replayStep={replayStep}
          isLoading={isLoading}
          approvalEdits={approvalEdits}
          setApprovalEdits={setApprovalEdits}
          handleApprovalAction={handleApprovalAction}
          startReplay={startReplay}
        />

        <RightPanel run={activeRun} evidenceVisible={evidenceVisible} replaying={replayStep !== null} />
      </div>
    </main>
  );
}

function LeftPanel({
  idea,
  setIdea,
  activeRun,
  runs,
  isLoading,
  createNewRun,
  loadRuns,
  selectRun,
}: {
  idea: string;
  setIdea: (idea: string) => void;
  activeRun: MonkRun | null;
  runs: MonkRun[];
  isLoading: boolean;
  createNewRun: () => void;
  loadRuns: () => void;
  selectRun: (run: MonkRun) => void;
}) {
  return (
    <aside className="space-y-4">
      <Card title="Command Input" action={<IconButton title="Refresh runs" onClick={loadRuns} icon={<RefreshCw size={15} />} />}>
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-md border border-white/10 bg-[#080c13] p-3 text-sm text-slate-100 outline-none focus:border-emerald-400"
        />
        <button
          onClick={createNewRun}
          disabled={isLoading}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play size={16} />
          Start Governed Run
        </button>
      </Card>

      <Card title="Live Agent Graph">
        {activeRun ? <AgentGraph run={activeRun} /> : <p className="text-sm text-slate-400">Start or select a run to activate the graph.</p>}
      </Card>

      <Card title="Run History">
        <div className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-slate-400">No persisted runs yet.</p>
          ) : (
            runs.map((run) => (
              <button
                key={run.runId}
                onClick={() => selectRun(run)}
                className={`w-full rounded-md border p-3 text-left transition ${
                  activeRun?.runId === run.runId ? "border-emerald-400 bg-emerald-950/25" : "border-white/10 bg-[#0b1018] hover:bg-white/5"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-white">{run.runLabel}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] ${run.state === "BLOCKED" ? "bg-red-950 text-red-200" : "bg-slate-800 text-slate-300"}`}>
                    {run.state}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{run.runStatusMessage}</p>
              </button>
            ))
          )}
        </div>
      </Card>
    </aside>
  );
}

function CenterPanel({
  run,
  visibleTelemetry,
  visibleTransitions,
  replaying,
  replayStep,
  isLoading,
  approvalEdits,
  setApprovalEdits,
  handleApprovalAction,
  startReplay,
}: {
  run: MonkRun | null;
  visibleTelemetry: MonkRun["telemetry"];
  visibleTransitions: MonkRun["transitions"];
  replaying: boolean;
  replayStep: number | null;
  isLoading: boolean;
  approvalEdits: { runLabel: string; apiRouteName: string };
  setApprovalEdits: (edits: { runLabel: string; apiRouteName: string }) => void;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  startReplay: () => void;
}) {
  if (!run) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-[#101722] p-10 text-center">
        <p className="text-sm text-slate-400">Enter an idea to watch PM, Compliance, Approval, Engineering, Verification, and Telemetry coordinate.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <HeroRun run={run} handleApprovalAction={handleApprovalAction} startReplay={startReplay} isLoading={isLoading} />

      {replaying && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-950/15 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-100">Replay Run</p>
            <p className="text-xs text-emerald-200">
              Step {(replayStep || 0) + 1} of {getReplayStepCount(run)}
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${(((replayStep || 0) + 1) / getReplayStepCount(run)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">Replaying persisted telemetry, transitions, and evidence from this run state only.</p>
        </div>
      )}

      <Card title={replaying ? "Replay Stream" : "Execution Stream"} action={<span className="text-xs text-slate-500">{visibleTelemetry.length} events</span>}>
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {visibleTelemetry.map((event, index) => (
            <div
              key={event.id}
              className={`rounded-md border p-3 ${index === visibleTelemetry.length - 1 ? "border-emerald-400/50 bg-emerald-950/20" : "border-white/10 bg-[#0b1018]"}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-200">{event.agent}</span>
                <span className="text-xs text-emerald-300">{event.event}</span>
                <span className="text-xs text-slate-500">{formatTime(event.timestamp)}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{event.detail}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Approval Gate">
          <GateStatus
            run={run}
            approvalEdits={approvalEdits}
            setApprovalEdits={setApprovalEdits}
            handleApprovalAction={handleApprovalAction}
            isLoading={isLoading}
          />
        </Card>

        <Card title="State Changes">
          <div className="space-y-2">
            {visibleTransitions.length === 0 ? (
              <p className="text-sm text-slate-400">{replaying ? "Transitions will appear after telemetry replay." : "No transitions recorded."}</p>
            ) : visibleTransitions.map((transition, index) => (
              <div
                key={`${transition.timestamp}-${index}`}
                className={`rounded-md border p-3 ${
                  replaying && index === visibleTransitions.length - 1 ? "border-emerald-400/50 bg-emerald-950/20" : "border-white/10 bg-[#0b1018]"
                }`}
              >
                <p className="text-sm text-white">
                  {transition.previousState} <span className="text-slate-500">to</span> {transition.nextState}
                </p>
                <p className="mt-1 text-xs text-slate-400">{transition.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </section>
  );
}

function RightPanel({ run, evidenceVisible, replaying }: { run: MonkRun | null; evidenceVisible: boolean; replaying: boolean }) {
  const metrics = getRunMetrics(run);

  return (
    <aside className="space-y-4">
      <Card title="Evidence Vault">
        {run && evidenceVisible ? (
          <div className="space-y-4">
            <EvidenceSection
              title="Generated Files"
              status={`${run.evidence?.generatedFiles.length || run.artifacts.length} files`}
              icon={<FileCode2 size={15} />}
              tone="emerald"
            >
              <EvidenceList values={run.evidence?.generatedFiles || run.artifacts.map((artifact) => artifact.path)} />
            </EvidenceSection>

            <EvidenceSection
              title="Mutation Commits"
              status={`${run.artifacts.length} commits`}
              icon={<GitCommitHorizontal size={15} />}
              tone="blue"
            >
              <div className="space-y-2">
                {run.artifacts.map((artifact) => (
                  <div key={artifact.commitId} className="rounded border border-white/10 bg-[#080c13] p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{artifact.commitId}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${artifact.verificationStatus === "PASSED" ? "bg-emerald-950 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>
                        {artifact.verificationStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{artifact.diffSummary}</p>
                  </div>
                ))}
              </div>
            </EvidenceSection>

            <EvidenceSection
              title="Verification Results"
              status={run.evidence ? "PASSED" : "PENDING"}
              icon={<CheckCircle2 size={15} />}
              tone={run.evidence ? "emerald" : "slate"}
            >
              {run.evidence ? (
                <div className="space-y-3">
                  <p className="text-sm leading-6 text-slate-300">{run.evidence.humanReadableSummary}</p>
                  <EvidenceList values={[run.evidence.verificationSummary, ...run.evidence.matchedRoutes, ...run.evidence.matchedSchemas]} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Verification has not produced evidence yet.</p>
              )}
            </EvidenceSection>

            <EvidenceSection
              title="Compliance Outcome"
              status={run.compliance?.severity || "PENDING"}
              icon={<ShieldCheck size={15} />}
              tone={run.compliance?.severity === "CRITICAL" ? "red" : "emerald"}
            >
              <p className="text-sm leading-6 text-slate-300">{run.compliance?.reason || "Compliance review pending."}</p>
              {run.compliance?.reviewedTerms.length ? (
                <EvidenceList values={run.compliance.reviewedTerms} />
              ) : (
                <p className="mt-2 text-xs text-slate-500">No blocking regulated terms detected.</p>
              )}
            </EvidenceSection>

            <EvidenceSection
              title="Telemetry Snapshot"
              status={`${run.telemetry.length} events`}
              icon={<DatabaseZap size={15} />}
              tone="slate"
            >
              <div className="grid grid-cols-3 gap-2">
                <EvidenceStat label="Events" value={String(run.evidence?.telemetrySnapshot.eventCount || run.telemetry.length)} />
                <EvidenceStat label="Transitions" value={String(run.evidence?.telemetrySnapshot.transitionCount || run.transitions.length)} />
                <EvidenceStat label="Artifacts" value={String(run.evidence?.telemetrySnapshot.artifactCount || run.artifacts.length)} />
              </div>
            </EvidenceSection>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#0b1018] p-3">
            <p className="text-sm text-slate-400">
              {replaying ? "Evidence is hidden until the replay reaches the verification checkpoint." : "Verification evidence appears after approval and engineering commit."}
            </p>
          </div>
        )}
      </Card>

      <Card title="Repo and Deploy">
        <div className="space-y-3">
          <InfoRow icon={<GitFork size={15} />} label="Repository" value="Local workspace only" detail="C:\\AI Builders OpenAI x Outskill" />
          <InfoRow icon={<Link2 size={15} />} label="Deployment" value="Not deployed" detail="Local execution evidence only" />
          <InfoRow icon={<DatabaseZap size={15} />} label="Artifacts" value={run ? `runs/${run.runId}/app` : "No run selected"} detail="Committed by ORCHESTRATOR" />
        </div>
      </Card>

      <Card title="Operational Metrics">
        <div className="grid grid-cols-2 gap-3">
          <Metric icon={<Clock3 size={15} />} label="Latency" value={`${metrics.latencyMs}ms`} />
          <Metric icon={<Gauge size={15} />} label="Confidence" value={`${metrics.confidence}%`} />
          <Metric icon={<DatabaseZap size={15} />} label="Token Cost" value={metrics.tokenCost} />
          <Metric icon={<ShieldCheck size={15} />} label="Context Health" value={metrics.contextHealth} />
        </div>
      </Card>

      <Card title="Committed Mutations">
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {run?.artifacts.length ? (
            run.artifacts.map((artifact) => (
              <div key={artifact.commitId} className="rounded-md border border-white/10 bg-[#0b1018] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{artifact.path}</p>
                  <span className="shrink-0 rounded border border-emerald-400/30 bg-emerald-950/30 px-2 py-0.5 text-[11px] text-emerald-200">{artifact.commitId}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">{artifact.diffSummary}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400">No committed mutations.</p>
          )}
        </div>
      </Card>
    </aside>
  );
}

function HeroRun({
  run,
  handleApprovalAction,
  startReplay,
  isLoading,
}: {
  run: MonkRun;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  startReplay: () => void;
  isLoading: boolean;
}) {
  const severity = run.compliance?.severity || "PENDING";
  const verified = Boolean(run.evidence);

  return (
    <section className="rounded-lg border border-white/10 bg-[#111722] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${stateTone[run.state]}`}>{run.state}</span>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${severityTone[severity]}`}>Compliance {severity}</span>
            <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${verified ? "border-emerald-400/50 bg-emerald-950/40 text-emerald-100" : "border-slate-600 bg-slate-900 text-slate-300"}`}>
              {verified ? "Verified Evidence" : "Evidence Pending"}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-semibold text-white">{run.runLabel}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{run.runStatusMessage}</p>
          <p className="mt-2 text-xs text-slate-500">{run.runId} | {run.lastCheckpoint || "NO_CHECKPOINT"} | {run.orchestratorVersion}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {run.state === "WAITING_APPROVAL" && (
            <button
              onClick={() => handleApprovalAction("approve")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-400 px-4 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-300 disabled:opacity-60"
            >
              <UserCheck size={16} />
              Approve Execution
            </button>
          )}
          <button
            onClick={startReplay}
            disabled={run.telemetry.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Replay
          </button>
        </div>
      </div>
    </section>
  );
}

function AgentGraph({ run }: { run: MonkRun }) {
  return (
    <div className="space-y-2">
      {flowNodes.map((node, index) => {
        const status = getNodeStatus(run, node.state);
        return (
          <div key={node.state} className="relative">
            {index < flowNodes.length - 1 && <div className="absolute left-[15px] top-9 h-5 w-px bg-white/10" />}
            <div className={`flex items-center gap-3 rounded-md border p-3 ${status.className}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${status.dotClass}`}>
                {status.kind === "done" ? <CheckCircle2 size={15} /> : status.kind === "blocked" ? <Lock size={15} /> : <CircleDot size={15} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{node.label}</p>
                <p className="truncate text-xs text-slate-400">{node.agent}</p>
              </div>
              <span className="text-[10px] font-semibold uppercase text-slate-400">{status.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GateStatus({
  run,
  approvalEdits,
  setApprovalEdits,
  handleApprovalAction,
  isLoading,
}: {
  run: MonkRun;
  approvalEdits: { runLabel: string; apiRouteName: string };
  setApprovalEdits: (edits: { runLabel: string; apiRouteName: string }) => void;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  isLoading: boolean;
}) {
  if (run.state === "BLOCKED") {
    return (
      <div className="rounded-md border border-red-400/40 bg-red-950/30 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-red-100"><AlertTriangle size={16} />Blocked by Compliance</p>
        <p className="mt-2 text-sm text-slate-300">{run.compliance?.reason}</p>
      </div>
    );
  }

  if (run.approval.approved) {
    return (
      <div className="rounded-md border border-emerald-400/30 bg-emerald-950/20 p-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-100"><CheckCircle2 size={16} />Approved</p>
        <p className="mt-2 text-sm text-slate-300">Execution approval committed by ORCHESTRATOR.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-indigo-400/40 bg-indigo-950/25 p-3">
      <div>
        <p className="flex items-center gap-2 text-sm font-semibold text-indigo-100"><UserCheck size={16} />Human Approval Interrupt</p>
        <p className="mt-2 text-sm text-slate-300">Execution is paused before filesystem writes. Review proposed mutations, optionally edit safe shared memory, then resume or stop.</p>
      </div>

      <div className="rounded border border-white/10 bg-[#080c13] p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Pending Action</p>
        <p className="mt-1 text-sm text-white">Commit proposed mutations to <span className="text-emerald-300">runs/{run.runId}/app</span></p>
        <p className="mt-2 text-xs text-slate-400">Next execution step: ENGINEERING {"->"} VERIFYING</p>
      </div>

      <div className="rounded border border-white/10 bg-[#080c13] p-3">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Why Approval Is Needed</p>
        <p className="mt-1 text-sm text-slate-300">Compliance severity is <span className="font-semibold text-white">{run.compliance?.severity || "PENDING"}</span>. The orchestrator requires explicit human consent before external side effects.</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Affected State Fields</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {["runLabel", "productIntent.routes", "proposedMutations.path", "proposedMutations.content"].map((field) => (
            <span key={field} className="rounded border border-white/10 bg-[#0b1018] px-2 py-1 text-xs text-slate-300">{field}</span>
          ))}
        </div>
      </div>

      {run.state === "WAITING_APPROVAL" && (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">Run Label</span>
              <input
                value={approvalEdits.runLabel}
                onChange={(event) => setApprovalEdits({ ...approvalEdits, runLabel: event.target.value })}
                className="mt-1 w-full rounded-md border border-white/10 bg-[#080c13] px-3 py-2 text-sm text-white outline-none focus:border-indigo-300"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-[0.16em] text-slate-500">API Route Name</span>
              <input
                value={approvalEdits.apiRouteName}
                onChange={(event) => setApprovalEdits({ ...approvalEdits, apiRouteName: event.target.value })}
                placeholder="billing"
                className="mt-1 w-full rounded-md border border-white/10 bg-[#080c13] px-3 py-2 text-sm text-white outline-none focus:border-indigo-300"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-slate-500">Proposed Mutations Before Approval</p>
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {run.proposedMutations.map((mutation) => (
                <div key={mutation.path} className="rounded border border-white/10 bg-[#080c13] p-2">
                  <p className="text-xs font-semibold text-white">{previewMutationPath(mutation.path, approvalEdits.apiRouteName)}</p>
                  <p className="mt-1 text-xs text-slate-400">{mutation.diffSummary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApprovalAction("approve")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-400 px-3 py-2 text-sm font-semibold text-indigo-950 hover:bg-indigo-300 disabled:opacity-60"
            >
              <UserCheck size={15} />
              Approve and Resume
            </button>
            <button
              onClick={() => handleApprovalAction("request_revision")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 disabled:opacity-60"
            >
              Request Revision
            </button>
            <button
              onClick={() => handleApprovalAction("reject")}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-red-400/40 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-950/30 disabled:opacity-60"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#111722] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Signal({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#080c13] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1018] p-3">
      <div className="flex items-center gap-2 text-slate-400">{icon}<span className="text-xs">{label}</span></div>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1018] p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">{icon}{label}</div>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
      <p className="mt-1 break-words text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/5"
      title={title}
    >
      {icon}
    </button>
  );
}

function EvidenceSection({
  title,
  status,
  icon,
  tone,
  children,
}: {
  title: string;
  status: string;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "red" | "slate";
  children: React.ReactNode;
}) {
  const toneClass = {
    emerald: "border-emerald-400/30 bg-emerald-950/15 text-emerald-100",
    blue: "border-blue-400/30 bg-blue-950/15 text-blue-100",
    red: "border-red-400/35 bg-red-950/20 text-red-100",
    slate: "border-white/10 bg-[#0b1018] text-slate-100",
  }[tone];

  return (
    <section className={`rounded-md border p-3 ${toneClass}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-white">{title}</h3>
        </div>
        <span className="rounded border border-white/10 bg-black/20 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-200">
          {status}
        </span>
      </div>
      {children}
    </section>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/20 p-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function EvidenceList({ values }: { values: string[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded border border-white/10 bg-[#0b1018] px-2 py-1 text-xs text-slate-300">{value}</span>
        ))}
      </div>
    </div>
  );
}

function getNodeStatus(run: MonkRun, state: RunState) {
  if (run.state === "BLOCKED" && state !== "PLANNING" && state !== "COMPLIANCE_REVIEW") {
    return {
      kind: "blocked",
      label: "blocked",
      className: "border-red-400/30 bg-red-950/20",
      dotClass: "border-red-400/50 bg-red-950 text-red-200",
    };
  }

  if (run.state === state) {
    return {
      kind: "active",
      label: "active",
      className: "border-emerald-400/60 bg-emerald-950/25",
      dotClass: "border-emerald-300 bg-emerald-400 text-emerald-950",
    };
  }

  const completedStates = new Set(run.transitions.map((transition) => transition.nextState));
  if (completedStates.has(state) || (run.state === "COMPLETED" && state === "COMPLETED")) {
    return {
      kind: "done",
      label: "done",
      className: "border-white/10 bg-[#0b1018]",
      dotClass: "border-emerald-400/50 bg-emerald-950 text-emerald-200",
    };
  }

  return {
    kind: "waiting",
    label: "waiting",
    className: "border-white/10 bg-[#0b1018]",
    dotClass: "border-slate-600 bg-slate-900 text-slate-500",
  };
}

function getRunMetrics(run: MonkRun | null) {
  if (!run) {
    return { latencyMs: 0, confidence: 0, tokenCost: "$0.000", contextHealth: "Idle" };
  }

  const latencyMs = Math.max(0, new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime());
  const passedArtifacts = run.artifacts.filter((artifact) => artifact.verificationStatus === "PASSED").length;
  const confidence = run.state === "BLOCKED" ? 98 : run.artifacts.length ? Math.round((passedArtifacts / run.artifacts.length) * 100) : 72;
  const tokenCost = `$${((run.telemetry.length * 0.0008) + (run.artifacts.length * 0.0012)).toFixed(3)}`;
  const contextHealth = run.state === "BLOCKED" ? "Governed" : run.evidence ? "Healthy" : "Building";

  return { latencyMs, confidence, tokenCost, contextHealth };
}

function getCurrentApiRouteName(run: MonkRun) {
  const apiRoute = run.productIntent?.routes.find((route) => route.startsWith("/api/"));
  return apiRoute?.replace("/api/", "") || "";
}

function previewMutationPath(path: string, apiRouteName: string) {
  const cleanRoute = apiRouteName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (!cleanRoute || !path.startsWith("app/api/")) return path;
  return `app/api/${cleanRoute}/route.ts`;
}

function getReplayStepCount(run: MonkRun) {
  return run.telemetry.length + run.transitions.length + (run.evidence ? 1 : 0);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
