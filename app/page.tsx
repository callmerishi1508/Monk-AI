"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  Pause,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Eye,
  ChevronRight,
  Info,
  XCircle,
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
  CRITICAL: "border-red-400/60 bg-red-950/50 text-red-100 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
  PENDING: "border-slate-500/50 bg-slate-800/80 text-slate-300 animate-pulse",
};

export default function Home() {
  const [idea, setIdea] = useState("Invoice SaaS for freelancers to create invoices and track payment status");
  const [activeRun, setActiveRun] = useState<MonkRun | null>(null);
  const [runs, setRuns] = useState<MonkRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const [replayPaused, setReplayPaused] = useState(false);
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
    if (replayPaused) return;
    const totalSteps = getReplayStepCount(activeRun);
    if (replayStep >= totalSteps - 1) return;
    const timer = window.setTimeout(() => {
      setReplayStep((prev) => {
        if (prev === null || prev >= totalSteps - 1) return prev;
        return prev + 1;
      });
    }, 650);
    return () => window.clearTimeout(timer);
  }, [replayStep, activeRun, replayPaused]);

  const visibleTelemetry = useMemo(() => {
    if (!activeRun) return [];
    if (replayStep === null) return activeRun.telemetry;
    return activeRun.telemetry.slice(0, Math.min(replayStep + 1, activeRun.telemetry.length));
  }, [activeRun, replayStep]);

  const visibleTransitions = useMemo(() => {
    if (!activeRun) return [];
    if (replayStep === null) return activeRun.transitions;
    const transitionCount = visibleTelemetry.filter((e) => e.event === "STATE_TRANSITION").length;
    return activeRun.transitions.slice(0, transitionCount);
  }, [activeRun, replayStep, visibleTelemetry]);

  const evidenceVisible = useMemo(() => {
    if (!activeRun) return false;
    if (replayStep === null) return true;
    return replayStep >= activeRun.telemetry.length;
  }, [activeRun, replayStep]);

  const replayState = useMemo(() => {
    if (!activeRun || replayStep === null) return activeRun?.state || null;
    return visibleTransitions.at(-1)?.nextState || "INTAKE";
  }, [activeRun, replayStep, visibleTransitions]);

  const visibleApprovalEvents = useMemo(() => {
    return visibleTelemetry.filter((event) => event.agent === "HUMAN_APPROVAL" || event.event.includes("APPROVAL"));
  }, [visibleTelemetry]);

  const headerMetrics = getRunMetrics(activeRun);
  const headerState = replayStep !== null && replayState ? `REPLAY ${replayState}` : activeRun?.state || "READY";
  const headerApproval = activeRun?.approval.approved ? "APPROVED" : activeRun?.state === "WAITING_APPROVAL" ? "WAITING" : "NOT REQUIRED";

  async function loadRuns() {
    try {
      const response = await fetch("/api/runs", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setRuns(data.runs || []);
        if (!activeRun && data.runs?.[0]) setActiveRun(data.runs[0]);
      }
    } catch (error) {
      console.error("Failed to load runs", error);
    }
  }

  async function createNewRun() {
    setIsLoading(true);
    setReplayStep(null);
    setReplayPaused(false);
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.run) {
          setActiveRun(data.run);
          await loadRuns();
        }
      }
    } catch (error) {
      console.error("Failed to create new run", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApprovalAction(action: "approve" | "reject" | "request_revision") {
    if (!activeRun) return;
    setIsLoading(true);
    setReplayStep(null);
    setReplayPaused(false);
    try {
      const response = await fetch(`/api/runs/${activeRun.runId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          edits: approvalEdits,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.run) {
          setActiveRun(data.run);
          await loadRuns();
        }
      }
    } catch (error) {
      console.error("Failed to process approval action", error);
    } finally {
      setIsLoading(false);
    }
  }

  function startReplay() {
    if (!activeRun || getReplayStepCount(activeRun) === 0) return;
    setReplayStep(0);
    setReplayPaused(false);
  }

  function stopReplay() {
    setReplayStep(null);
    setReplayPaused(false);
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <header className="border-b border-white/10 bg-[#0d121b]">
        <div className="mx-auto max-w-[1600px] px-5 py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_650px] xl:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-emerald-400/25 bg-emerald-950/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">
                <Sparkles size={14} />
                MONK AI
              </div>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-white md:text-5xl">Governed Autonomous Execution</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300">
                Product Manager, Compliance Gatekeeper, Human Approval, Engineering Executor, and Verification coordinate deterministically through one orchestration graph.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 md:grid-cols-5 xl:mt-1">
              <Signal label="Active State" value={headerState} emphasis />
              <Signal label="Compliance" value={activeRun?.compliance?.severity || "PENDING"} />
              <Signal label="Approval" value={headerApproval} />
              <Signal label="Replay" value={replayStep !== null ? replayPaused ? "PAUSED" : "RUNNING" : "READY"} />
              <Signal label="Confidence" value={`${headerMetrics.confidence}%`} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-5 px-5 py-6 xl:grid-cols-[360px_minmax(0,1fr)_420px]">
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
            setReplayPaused(false);
          }}
          replaying={replayStep !== null}
          replayState={replayState}
          visibleTransitions={visibleTransitions}
        />

        <CenterPanel
          run={activeRun}
          visibleTelemetry={visibleTelemetry}
          visibleTransitions={visibleTransitions}
          replaying={replayStep !== null}
          replayPaused={replayPaused}
          replayStep={replayStep}
          replayState={replayState}
          visibleApprovalEvents={visibleApprovalEvents}
          isLoading={isLoading}
          approvalEdits={approvalEdits}
          setApprovalEdits={setApprovalEdits}
          handleApprovalAction={handleApprovalAction}
          startReplay={startReplay}
          stopReplay={stopReplay}
          toggleReplayPause={() => setReplayPaused((value) => !value)}
          evidenceVisible={evidenceVisible}
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
  replaying,
  replayState,
  visibleTransitions,
}: {
  idea: string;
  setIdea: (idea: string) => void;
  activeRun: MonkRun | null;
  runs: MonkRun[];
  isLoading: boolean;
  createNewRun: () => void;
  loadRuns: () => void;
  selectRun: (run: MonkRun) => void;
  replaying: boolean;
  replayState: RunState | null;
  visibleTransitions: MonkRun["transitions"];
}) {
  return (
    <aside className="space-y-5">
      <Card title="Command Input" action={<IconButton title="Refresh runs" onClick={loadRuns} icon={<RefreshCw size={15} />} />}>
        <textarea
          value={idea}
          onChange={(event) => setIdea(event.target.value)}
          rows={5}
          className="w-full resize-none rounded-md border border-white/10 bg-[#080c13] p-4 text-sm text-slate-100 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/50"
        />
        <button
          onClick={createNewRun}
          disabled={isLoading || !idea.trim()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-4 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          <Play size={16} />
          Start Governed Run
        </button>
      </Card>

      <Card title="Live Agent Graph">
        {activeRun ? (
          <AgentGraph run={activeRun} replaying={replaying} replayState={replayState} visibleTransitions={visibleTransitions} />
        ) : (
          <p className="text-sm text-slate-400">Start or select a run to activate the graph.</p>
        )}
      </Card>

      <Card title="Demo Rehearsal">
        <div className="space-y-3">
          {[
            "Open dashboard and show prior runs",
            "Run invoice idea and pause at approval",
            "Rename API route to billing, then approve",
            "Replay the completed run",
            "Run medical idea and show compliance block",
          ].map((step, index) => (
            <div key={step} className="stagger-item flex gap-3 rounded-md border border-white/10 bg-[#0b1018] p-3 transition-all duration-200 hover:bg-white/5 hover:border-white/20">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-950/80 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]">{index + 1}</span>
              <p className="text-xs leading-6 font-medium text-slate-300">{step}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Run History">
        <div className="space-y-2">
          {runs.length === 0 ? (
            <p className="text-sm text-slate-400">No persisted runs yet.</p>
          ) : (
            runs.map((run, index) => (
              <button
                key={run.runId}
                onClick={() => selectRun(run)}
                className={`stagger-item w-full rounded-md border p-4 text-left transition-all duration-200 ${
                  activeRun?.runId === run.runId ? "border-emerald-400/60 bg-emerald-950/40 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.1)]" : "border-white/10 bg-[#0b1018] hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-white">{run.runLabel}</span>
                  <span className={`rounded px-2 py-1 text-[11px] font-bold ${run.state === "BLOCKED" ? "bg-red-950 text-red-200" : run.state === "COMPLETED" ? "bg-emerald-950 text-emerald-200" : "bg-slate-800 text-slate-300"}`}>
                    {run.state}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-slate-500 leading-relaxed">{run.runStatusMessage}</p>
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
  replayPaused,
  replayStep,
  replayState,
  visibleApprovalEvents,
  isLoading,
  approvalEdits,
  setApprovalEdits,
  handleApprovalAction,
  startReplay,
  stopReplay,
  toggleReplayPause,
  evidenceVisible,
}: {
  run: MonkRun | null;
  visibleTelemetry: MonkRun["telemetry"];
  visibleTransitions: MonkRun["transitions"];
  replaying: boolean;
  replayPaused: boolean;
  replayStep: number | null;
  replayState: RunState | null;
  visibleApprovalEvents: MonkRun["telemetry"];
  isLoading: boolean;
  approvalEdits: { runLabel: string; apiRouteName: string };
  setApprovalEdits: (edits: { runLabel: string; apiRouteName: string }) => void;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  startReplay: () => void;
  stopReplay: () => void;
  toggleReplayPause: () => void;
  evidenceVisible: boolean;
}) {
  const telemetryEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (replaying) {
      telemetryEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [visibleTelemetry.length, replaying]);

  if (!run) {
    return (
      <section className="rounded-lg border border-dashed border-white/15 bg-[#101722] p-10 text-center">
        <p className="text-sm text-slate-400">Enter an idea to watch PM, Compliance, Approval, Engineering, Verification, and Telemetry coordinate.</p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <HeroRun
        run={run}
        handleApprovalAction={handleApprovalAction}
        startReplay={startReplay}
        stopReplay={stopReplay}
        isLoading={isLoading}
        replaying={replaying}
        replayState={replayState}
      />

      {replaying && (
        <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-br from-emerald-950/40 to-slate-900/40 p-5 backdrop-blur-sm shadow-[0_0_30px_rgba(52,211,153,0.1)] transition-all duration-300">
          {/* Replay Header */}
          <div className="flex flex-col gap-4 mb-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                replayPaused 
                  ? "border-amber-400/50 bg-amber-950/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]" 
                  : "border-emerald-400/50 bg-emerald-950/50 shadow-[0_0_20px_rgba(52,211,153,0.2)] animate-pulse"
              }`}>
                {replayPaused ? <Pause size={20} className="text-amber-300" /> : <Play size={20} className="text-emerald-300" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-base font-bold text-white">Replay Run</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    replayPaused 
                      ? "bg-amber-950/50 text-amber-300 border border-amber-400/30" 
                      : "bg-emerald-950/50 text-emerald-300 border border-emerald-400/30"
                  }`}>
                    {replayPaused ? "Paused" : "Playing"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-sm text-slate-400">
                  <span>Current State:</span>
                  <span className="font-semibold text-emerald-300">{replayState}</span>
                  {!replayPaused && (replayStep || 0) < getReplayStepCount(run) - 1 && (
                    <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white tabular-nums">{(replayStep || 0) + 1}</span>
                  <span className="text-slate-500 text-lg">/</span>
                  <span className="text-lg text-slate-400 tabular-nums">{getReplayStepCount(run)}</span>
                </div>
                <div className="mt-1 flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${Math.round((((replayStep || 0) + 1) / Math.max(1, getReplayStepCount(run))) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 tabular-nums">
                    {Math.round((((replayStep || 0) + 1) / Math.max(1, getReplayStepCount(run))) * 100)}%
                  </span>
                </div>
              </div>
              {(replayStep || 0) < getReplayStepCount(run) - 1 ? (
                <button
                  onClick={toggleReplayPause}
                  className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:border-white/25 transition-all duration-200"
                >
                  {replayPaused ? <Play size={16} /> : <Pause size={16} />}
                  {replayPaused ? "Resume" : "Pause"}
                </button>
              ) : (
                <span className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-950/40 px-4 py-2.5 text-sm font-semibold text-emerald-200">
                  <CheckCircle2 size={16} />
                  Complete
                </span>
              )}
            </div>
          </div>

          {/* Main Progress Bar */}
          <div className="relative">
            <div className="h-3 overflow-hidden rounded-full bg-slate-800 shadow-inner">
              <div
                className="relative h-full rounded-full bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-300 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                style={{ width: `${(((replayStep || 0) + 1) / Math.max(1, getReplayStepCount(run))) * 100}%` }}
              >
                {!replayPaused && (replayStep || 0) < getReplayStepCount(run) - 1 && (
                  <div className="absolute inset-0 bg-white/20 animate-[pulse_2s_ease-in-out_infinite]" />
                )}
              </div>
            </div>
            {/* Progress bar glow effect */}
            <div className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.15)] pointer-events-none" />
          </div>

          {/* Replay Checkpoints Timeline */}
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              <span className="font-mono text-[10px]">CHECKPOINTS</span>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${visibleTelemetry.length > 0 ? "bg-cyan-950/50 text-cyan-300 border border-cyan-400/30 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "bg-slate-800 text-slate-500 border border-transparent"}`}>
                {visibleTelemetry.length} Events
              </span>
              <span className="text-slate-600">•</span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${visibleTransitions.length > 0 ? "bg-indigo-950/50 text-indigo-300 border border-indigo-400/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]" : "bg-slate-800 text-slate-500 border border-transparent"}`}>
                {visibleTransitions.length} Transitions
              </span>
              <span className="text-slate-600">•</span>
              <span className={`rounded px-2 py-0.5 text-[10px] font-semibold transition-colors duration-300 ${run.evidence && evidenceVisible ? "bg-emerald-950/50 text-emerald-300 border border-emerald-400/30 shadow-[0_0_10px_rgba(52,211,153,0.2)]" : "bg-slate-800 text-slate-500 border border-transparent"}`}>
                {run.evidence && evidenceVisible ? "Evidence" : "Pending"}
              </span>
            </div>
          </div>
        </div>
      )}

      <Card title={replaying ? "Replay Stream" : "Execution Stream"} action={<span className="text-xs text-slate-500 font-semibold">{visibleTelemetry.length} events</span>}>
        <div className="max-h-[480px] space-y-3 overflow-y-auto pr-2 scroll-smooth">
          {visibleTelemetry.map((event, index) => (
            <div
              key={event.id}
              className={`telemetry-event rounded-md border p-4 transition-all duration-300 ${replaying && index === visibleTelemetry.length - 1 ? "border-emerald-400 bg-emerald-950/30 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.15)]" : "border-white/10 bg-[#0b1018]"}`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-200">{event.agent}</span>
                <span className="text-sm font-semibold text-emerald-300">{event.event}</span>
                <span className="text-xs text-slate-500 ml-auto">{formatTime(event.timestamp)}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-200 break-words">{event.detail}</p>
            </div>
          ))}
          <div ref={telemetryEndRef} />
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Approval Gate">
          <GateStatus
            run={run}
            replaying={replaying}
            visibleApprovalEvents={visibleApprovalEvents}
            approvalEdits={approvalEdits}
            setApprovalEdits={setApprovalEdits}
            handleApprovalAction={handleApprovalAction}
            isLoading={isLoading}
          />
        </Card>

        <Card title="State Changes">
          <div className="space-y-3">
            {visibleTransitions.length === 0 ? (
              <p className="text-sm text-slate-400">{replaying ? "Transitions will appear after telemetry replay." : "No transitions recorded."}</p>
            ) : visibleTransitions.map((transition, index) => (
              <div
                key={`${transition.timestamp}-${index}`}
                className={`telemetry-event rounded-md border p-4 transition-all duration-300 ${
                  replaying && index === visibleTransitions.length - 1 ? "border-emerald-400 bg-emerald-950/30 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(52,211,153,0.15)]" : "border-white/10 bg-[#0b1018]"
                }`}
              >
                <p className="text-sm font-semibold text-white">
                  {transition.previousState} <span className="text-slate-500 mx-2">→</span> {transition.nextState}
                </p>
                <p className="mt-2 text-xs text-slate-400 break-words">{transition.reason}</p>
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
    <aside className="space-y-5">
      <Card title="Evidence Vault">
        {run && evidenceVisible ? (
          <div className="space-y-0">
            {/* Creation Phase */}
            <div className="group rounded-t-lg border border-white/10 bg-emerald-950/10 p-5 transition-colors duration-300 hover:bg-emerald-950/20">
              <EvidencePhaseHeader icon={<FileCode2 size={18} />} phase="Creation" color="emerald" />
              <div className="mt-4 rounded border border-emerald-400/25 bg-[#080c13] p-4 shadow-sm transition-colors duration-300 group-hover:border-emerald-400/40">
                <EvidenceSection
                  title="Generated Files"
                  status={`${run.evidence?.generatedFiles.length || run.artifacts.length} files`}
                  icon={<FileCode2 size={16} />}
                  tone="emerald"
                  compact
                >
                  <div className="space-y-2">
                    {(run.evidence?.generatedFiles || run.artifacts.map((artifact) => artifact.path)).map((file) => (
                    <div key={file} className="flex items-center gap-2 rounded border border-emerald-400/10 bg-[#0b1018] px-3 py-2.5 transition-colors hover:border-emerald-400/30">
                      <FileCode2 size={14} className="text-emerald-500/50 shrink-0" />
                        <p className="font-mono text-xs text-emerald-200 break-all">{file}</p>
                      </div>
                    ))}
                  </div>
                </EvidenceSection>
              </div>
            </div>

            {/* Mutation Phase */}
            <div className="group border-x border-white/10 bg-blue-950/10 p-5 transition-colors duration-300 hover:bg-blue-950/20">
              <EvidencePhaseHeader icon={<GitCommitHorizontal size={18} />} phase="Mutation" color="blue" />
              <div className="mt-4 rounded border border-blue-400/25 bg-[#080c13] p-4 shadow-sm transition-colors duration-300 group-hover:border-blue-400/40">
                <EvidenceSection
                  title="Mutation Commits"
                  status={`${run.artifacts.length} commits`}
                  icon={<GitCommitHorizontal size={16} />}
                  tone="blue"
                  compact
                >
                  <div className="space-y-3">
                    {run.artifacts.map((artifact) => (
                    <div key={artifact.commitId} className="group rounded border border-blue-400/20 bg-[#0b1018] p-4 transition-colors hover:border-blue-400/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <GitCommitHorizontal size={14} className="text-blue-400/50 shrink-0" />
                            <p className="font-mono text-sm font-bold text-blue-300">{artifact.commitId}</p>
                          </div>
                          <p className="mt-3 text-xs font-semibold text-slate-200 break-all">{artifact.path}</p>
                          <p className="mt-2 border-l-2 border-blue-400/20 pl-2 text-xs leading-5 text-slate-400 break-words">{artifact.diffSummary}</p>
                          </div>
                          <VerificationBadge status={artifact.verificationStatus} />
                        </div>
                      </div>
                    ))}
                  </div>
                </EvidenceSection>
              </div>
            </div>

            {/* Verification Phase */}
            <div className="group border-x border-white/10 bg-emerald-950/10 p-5 transition-colors duration-300 hover:bg-emerald-950/20">
              <EvidencePhaseHeader icon={<CheckCircle2 size={18} />} phase="Verification" color="emerald" />
              <div className="mt-4 space-y-4">
                <div className="rounded border border-emerald-400/25 bg-[#080c13] p-4 shadow-sm transition-colors duration-300 group-hover:border-emerald-400/40">
                  <EvidenceSection
                    title="Verification Results"
                    status={run.evidence ? "✓ PASSED" : "⏳ PENDING"}
                    icon={<CheckCircle2 size={16} />}
                    tone={run.evidence ? "emerald" : "slate"}
                    compact
                  >
                    {run.evidence ? (
                      <div className="space-y-4">
                        <div className="rounded border border-emerald-400/20 bg-emerald-950/20 p-3">
                          <p className="text-sm leading-6 text-emerald-100">{run.evidence.humanReadableSummary}</p>
                          <p className="mt-2 text-xs text-emerald-400/80 font-mono">{run.evidence.verificationSummary}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Validation Checks</p>
                          <div className="grid gap-2">
                            {run.evidence.checks.map((check, i) => (
                              <div key={i} className={`flex items-start gap-3 rounded border p-3 ${check.passed ? "border-emerald-400/10 bg-[#0b1018]" : "border-red-400/10 bg-[#0b1018]"}`}>
                                {check.passed ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-500 shrink-0" /> : <XCircle size={14} className="mt-0.5 text-red-500 shrink-0" />}
                                <div>
                                  <p className="text-xs font-semibold text-slate-200">{check.name}</p>
                                  <p className="mt-1 text-[11px] text-slate-400">{check.detail}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400">Verification in progress...</p>
                    )}
                  </EvidenceSection>
                </div>

                <div className="rounded border border-emerald-400/25 bg-[#080c13] p-4 shadow-sm">
                  <EvidenceSection
                    title="Compliance Review"
                    status={run.compliance?.severity || "⏳ PENDING"}
                    icon={<ShieldCheck size={16} />}
                    tone={run.compliance?.severity === "CRITICAL" ? "red" : "emerald"}
                    compact
                  >
                    <div className="space-y-3">
                      <div className={`rounded border p-3 ${run.compliance?.severity === "CRITICAL" ? "border-red-400/20 bg-red-950/20" : "border-emerald-400/20 bg-emerald-950/20"}`}>
                        <p className={`text-sm leading-6 ${run.compliance?.severity === "CRITICAL" ? "text-red-200" : "text-emerald-200"}`}>
                          {run.compliance?.reason || "Compliance review in progress..."}
                        </p>
                      </div>
                      {run.compliance?.reviewedTerms && run.compliance.reviewedTerms.length > 0 ? (
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Reviewed Terms</p>
                          <EvidenceList values={run.compliance.reviewedTerms} />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">✓ No blocking regulated terms detected</p>
                      )}
                    </div>
                  </EvidenceSection>
                </div>
              </div>
            </div>

            {/* Execution Metrics */}
            <div className="group rounded-b-lg border border-white/10 bg-slate-950/10 p-5 transition-colors duration-300 hover:bg-slate-950/20">
              <EvidencePhaseHeader icon={<DatabaseZap size={18} />} phase="Execution Metrics" color="slate" />
              <div className="mt-4 rounded border border-white/10 bg-[#080c13] p-4 shadow-sm transition-colors duration-300 group-hover:border-white/20">
                <EvidenceSection
                  title="Telemetry Snapshot"
                  status={`${run.telemetry.length} events`}
                  icon={<DatabaseZap size={16} />}
                  tone="slate"
                  compact
                >
                  <div className="grid grid-cols-3 gap-3">
                    <EvidenceStat label="Events" value={String(run.evidence?.telemetrySnapshot.eventCount || run.telemetry.length)} />
                    <EvidenceStat label="Transitions" value={String(run.evidence?.telemetrySnapshot.transitionCount || run.transitions.length)} />
                    <EvidenceStat label="Artifacts" value={String(run.evidence?.telemetrySnapshot.artifactCount || run.artifacts.length)} />
                  </div>
                </EvidenceSection>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-white/10 bg-[#0b1018] p-4">
            <p className="text-sm text-slate-400">
              {replaying ? "Evidence is hidden until the replay reaches the verification checkpoint." : "Verification evidence appears after approval and engineering commit."}
            </p>
          </div>
        )}
      </Card>

      <Card title="Repo and Deploy">
        <div className="space-y-4">
          <InfoRow icon={<GitFork size={16} />} label="Repository" value="Local workspace only" detail="C:\\AI Builders OpenAI x Outskill" />
          <InfoRow icon={<Link2 size={16} />} label="Deployment" value="Not deployed" detail="Local execution evidence only" />
          <InfoRow icon={<DatabaseZap size={16} />} label="Artifacts" value={run ? `runs/${run.runId}/app` : "No run selected"} detail="Committed by ORCHESTRATOR" />
        </div>
      </Card>

      <Card title="Operational Metrics">
        <div className="grid grid-cols-2 gap-4">
          <Metric icon={<Clock3 size={16} />} label="Latency" value={`${metrics.latencyMs}ms`} />
          <Metric icon={<Gauge size={16} />} label="Confidence" value={`${metrics.confidence}%`} />
          <Metric icon={<DatabaseZap size={16} />} label="Token Cost" value={metrics.tokenCost} />
          <Metric icon={<ShieldCheck size={16} />} label="Context Health" value={metrics.contextHealth} />
        </div>
      </Card>

      <Card title="Committed Mutations">
        <div className="max-h-[360px] space-y-3 overflow-y-auto pr-2">
          {run?.artifacts.length ? (
            run.artifacts.map((artifact) => (
              <div key={artifact.commitId} className="rounded-md border border-white/10 bg-[#0b1018] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{artifact.path}</p>
                  <span className="shrink-0 rounded border border-emerald-400/40 bg-emerald-950/30 px-2 py-1 text-[10px] font-bold text-emerald-200">{artifact.commitId}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{artifact.diffSummary}</p>
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
  stopReplay,
  isLoading,
  replaying,
  replayState,
}: {
  run: MonkRun;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  startReplay: () => void;
  stopReplay: () => void;
  isLoading: boolean;
  replaying: boolean;
  replayState: RunState | null;
}) {
  const severity = run.compliance?.severity || "PENDING";
  const verified = Boolean(run.evidence);
  const displayedState = replaying && replayState ? replayState : run.state;
  const metrics = getRunMetrics(run);

  return (
    <section className="rounded-lg border border-white/10 bg-[#111722] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-md border px-3 py-2 text-xs font-bold shadow-[0_0_24px_rgba(52,211,153,0.15)] ${stateTone[displayedState]}`}>{replaying ? `REPLAY ${displayedState}` : run.state}</span>
            <span className={`rounded-md border px-3 py-2 text-xs font-bold ${severityTone[severity]}`}>Compliance {severity}</span>
            <span className={`rounded-md border px-3 py-2 text-xs font-bold ${verified ? "border-emerald-400/60 bg-emerald-950/40 text-emerald-100" : "border-slate-600 bg-slate-900 text-slate-300"}`}>
              {verified ? "✓ Verified Evidence" : "⏳ Evidence Pending"}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white">{run.runLabel}</h2>
          <p className="mt-3 max-w-3xl text-base leading-6 text-slate-200">{run.runStatusMessage}</p>
          <p className="mt-3 text-[11px] text-slate-500 font-mono break-all">{run.runId} | {run.lastCheckpoint || "NO_CHECKPOINT"} | {run.orchestratorVersion}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {run.state === "WAITING_APPROVAL" && (
            <button
              onClick={() => handleApprovalAction("approve")}
              disabled={isLoading || replaying}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <UserCheck size={16} />
              Approve Execution
            </button>
          )}
          <button
            onClick={replaying ? stopReplay : startReplay}
            disabled={run.telemetry.length === 0 && !replaying}
            className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-slate-100 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={16} />
            {replaying ? "Exit Replay" : "Replay Run"}
          </button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        <HeroMetric label="Execution Confidence" value={`${metrics.confidence}%`} />
        <HeroMetric label="Latency" value={`${metrics.latencyMs}ms`} />
        <HeroMetric label="Artifacts" value={String(run.artifacts.length)} />
        <HeroMetric label="Transitions" value={String(run.transitions.length)} />
        <HeroMetric label="Context Health" value={metrics.contextHealth} />
      </div>
    </section>
  );
}

function AgentGraph({
  run,
  replaying,
  replayState,
  visibleTransitions,
}: {
  run: MonkRun;
  replaying: boolean;
  replayState: RunState | null;
  visibleTransitions: MonkRun["transitions"];
}) {
  return (
    <div className="space-y-3">
      {flowNodes.map((node, index) => {
        const status = getNodeStatus(run, node.state, replaying, replayState, visibleTransitions);
        return (
          <div key={node.state} className="relative">
            {index < flowNodes.length - 1 && <div className={`absolute left-[19px] top-12 h-6 w-px transition-colors duration-300 ${status.connectorClass}`} />}
            <div className={`flex items-center gap-3 rounded-md border p-4 transition-all duration-300 ${status.className}`}>
              <div className={`flex h-10 w-10 items-center justify-center rounded-full border-2 flex-shrink-0 transition-all duration-300 ${status.dotClass}`}>
                {status.kind === "done" ? <CheckCircle2 size={18} /> : status.kind === "blocked" ? <Lock size={18} /> : <CircleDot size={18} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-white">{node.label}</p>
                <p className="truncate text-xs text-slate-400">{node.agent}</p>
              </div>
              <span className={`text-[11px] font-bold uppercase whitespace-nowrap ${status.labelClass}`}>{status.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GateStatus({
  run,
  replaying,
  visibleApprovalEvents,
  approvalEdits,
  setApprovalEdits,
  handleApprovalAction,
  isLoading,
}: {
  run: MonkRun;
  replaying: boolean;
  visibleApprovalEvents: MonkRun["telemetry"];
  approvalEdits: { runLabel: string; apiRouteName: string };
  setApprovalEdits: (edits: { runLabel: string; apiRouteName: string }) => void;
  handleApprovalAction: (action: "approve" | "reject" | "request_revision") => void;
  isLoading: boolean;
}) {
  if (run.state === "BLOCKED") {
    return (
      <div className="rounded-md border border-red-400/50 bg-red-950/40 p-4">
        <p className="flex items-center gap-2 text-base font-bold text-red-100"><AlertTriangle size={18} />Blocked by Compliance</p>
        <p className="mt-3 text-sm leading-6 text-red-50">{run.compliance?.reason}</p>
      </div>
    );
  }

  if (run.approval.approved) {
    return (
      <div className="rounded-md border border-emerald-400/40 bg-emerald-950/30 p-4">
        <p className="flex items-center gap-2 text-base font-bold text-emerald-100"><CheckCircle2 size={18} />Approved and Executing</p>
        <p className="mt-3 text-sm leading-6 text-emerald-50">Execution approval committed by ORCHESTRATOR.</p>
        {replaying && (
          <ReplayApprovalEvents visibleApprovalEvents={visibleApprovalEvents} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border border-indigo-400/50 bg-indigo-950/30 p-4">
      <div>
        <p className="flex items-center gap-2 text-base font-bold text-indigo-100"><UserCheck size={18} />Human Approval Interrupt</p>
        <p className="mt-3 text-sm leading-6 text-indigo-50">Execution is paused before filesystem writes. Review proposed mutations, optionally edit safe shared memory, then resume or stop.</p>
      </div>

      {replaying && <ReplayApprovalEvents visibleApprovalEvents={visibleApprovalEvents} />}

      <div className="rounded border border-indigo-400/20 bg-indigo-950/20 p-4 transition-colors hover:border-indigo-400/40">
        <p className="text-xs uppercase tracking-widest font-bold text-indigo-300/70">Pending Action</p>
        <p className="mt-2 text-sm font-semibold text-white">Commit proposed mutations to <span className="text-emerald-300 break-all">runs/{run.runId}/app</span></p>
        <p className="mt-2 text-xs text-indigo-200/60">Next execution step: <span className="font-mono text-[10px]">ENGINEERING &rarr; VERIFYING</span></p>
      </div>

      <div className="rounded border border-white/10 bg-[#080c13] p-4">
        <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Why Approval Is Needed</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">Compliance severity is <span className="font-bold text-white">{run.compliance?.severity || "PENDING"}</span>. The orchestrator requires explicit human consent before external side effects.</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-widest font-bold text-slate-400">Affected State Fields</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["runLabel", "productIntent.routes", "proposedMutations.path", "proposedMutations.content"].map((field) => (
            <span key={field} className="rounded border border-white/10 bg-[#0b1018] px-3 py-1.5 text-xs font-medium text-slate-300">{field}</span>
          ))}
        </div>
      </div>

      {run.state === "WAITING_APPROVAL" && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">Run Label</span>
              <input
                value={approvalEdits.runLabel}
                onChange={(event) => setApprovalEdits({ ...approvalEdits, runLabel: event.target.value })}
                disabled={isLoading || replaying}
                className="mt-2 w-full rounded-md border border-white/10 bg-[#080c13] px-3 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">API Route Name</span>
              <input
                value={approvalEdits.apiRouteName}
                onChange={(event) => setApprovalEdits({ ...approvalEdits, apiRouteName: event.target.value })}
                placeholder="billing"
                disabled={isLoading || replaying}
                className="mt-2 w-full rounded-md border border-white/10 bg-[#080c13] px-3 py-3 text-sm text-white outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/50 transition-colors"
              />
            </label>
          </div>

          <div>
            <p className="mb-3 text-xs uppercase tracking-widest font-bold text-slate-400">Proposed Mutations Before Approval</p>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-2">
              {run.proposedMutations.map((mutation) => (
                <div key={mutation.path} className="rounded border border-white/10 bg-[#080c13] p-3">
                  <p className="text-xs font-semibold text-white break-all">{previewMutationPath(mutation.path, approvalEdits.apiRouteName)}</p>
                  <p className="mt-2 text-xs text-slate-400 break-words">{mutation.diffSummary}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => handleApprovalAction("approve")}
              disabled={isLoading || replaying}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <UserCheck size={16} />
              Approve and Resume
            </button>
            <button
              onClick={() => handleApprovalAction("request_revision")}
              disabled={isLoading || replaying}
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-4 py-3 text-sm font-bold text-slate-200 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Request Revision
            </button>
            <button
              onClick={() => handleApprovalAction("reject")}
              disabled={isLoading || replaying}
              className="inline-flex items-center gap-2 rounded-md border border-red-400/50 bg-red-950/30 px-4 py-3 text-sm font-bold text-red-100 hover:bg-red-950/50 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ReplayApprovalEvents({ visibleApprovalEvents }: { visibleApprovalEvents: MonkRun["telemetry"] }) {
  return (
    <div className="mt-4 rounded border border-white/10 bg-black/20 p-3">
      <p className="text-xs uppercase tracking-widest font-bold text-slate-500">Replay Approval Checkpoints</p>
      {visibleApprovalEvents.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">Approval checkpoint has not appeared in replay yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {visibleApprovalEvents.map((event) => (
            <p key={event.id} className="text-xs text-slate-300 telemetry-event">
              <span className="font-semibold text-emerald-300">{event.event}</span> — {event.detail}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#111722] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-base font-bold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Signal({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-md border px-4 py-3 ${emphasis ? "border-emerald-400/50 bg-emerald-950/30 ring-1 ring-emerald-400/30" : "border-white/10 bg-[#080c13]"}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1018] px-4 py-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1018] p-4">
      <div className="flex items-center gap-3 text-slate-400">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <p className="mt-3 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function InfoRow({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-[#0b1018] p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">{icon}{label}</div>
      <p className="mt-2 text-base font-bold text-white">{value}</p>
      <p className="mt-2 break-words text-xs text-slate-400">{detail}</p>
    </div>
  );
}

function IconButton({ title, onClick, icon }: { title: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
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
  compact = false,
}: {
  title: string;
  status: string;
  icon: React.ReactNode;
  tone: "emerald" | "blue" | "red" | "slate";
  children: React.ReactNode;
  compact?: boolean;
}) {
  const toneClass = {
    emerald: "border-emerald-400/40 bg-emerald-950/25 text-emerald-100",
    blue: "border-blue-400/40 bg-blue-950/25 text-blue-100",
    red: "border-red-400/45 bg-red-950/30 text-red-100",
    slate: "border-white/10 bg-[#0b1018] text-slate-100",
  }[tone];

  if (compact) {
    return (
      <div>
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {icon}
            <h4 className="text-sm font-bold text-white">{title}</h4>
          </div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${
            tone === "emerald" ? "bg-emerald-950 text-emerald-200" :
            tone === "blue" ? "bg-blue-950 text-blue-200" :
            tone === "red" ? "bg-red-950 text-red-200" :
            "bg-slate-800 text-slate-300"
          }`}>
            {status}
          </span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <section className={`rounded-md border p-4 ${toneClass}`}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon}
          <h3 className="text-base font-bold text-white">{title}</h3>
        </div>
        <span className="rounded border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-bold uppercase text-slate-200">
          {status}
        </span>
      </div>
      {children}
    </section>
  );
}

function EvidencePhaseHeader({ icon, phase, color }: { icon: React.ReactNode; phase: string; color: "emerald" | "blue" | "red" | "slate" }) {
  const colorClass = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    red: "text-red-300",
    slate: "text-slate-300",
  }[color];

  return (
    <div className="flex items-center gap-3">
      <div className={colorClass}>{icon}</div>
      <h4 className="text-sm font-bold uppercase tracking-widest text-white">{phase}</h4>
      <div className={`h-px flex-1 ${
        color === "emerald" ? "bg-emerald-400/20" :
        color === "blue" ? "bg-blue-400/20" :
        color === "red" ? "bg-red-400/20" :
        "bg-slate-400/20"
      }`} />
    </div>
  );
}

function EvidenceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-white/10 bg-black/40 p-4 text-center">
      <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function EvidenceList({ values }: { values: string[] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="rounded border border-emerald-400/20 bg-emerald-950/20 px-3 py-1.5 text-xs font-medium text-emerald-200">{value}</span>
        ))}
      </div>
    </div>
  );
}

function VerificationBadge({ status }: { status: "PENDING" | "PASSED" | "FAILED" }) {
  const config = {
    PASSED: { bg: "bg-emerald-950", border: "border-emerald-400/30", text: "text-emerald-200", icon: <CheckCircle2 size={12} />, label: "PASSED" },
    FAILED: { bg: "bg-red-950", border: "border-red-400/30", text: "text-red-200", icon: <XCircle size={12} />, label: "FAILED" },
    PENDING: { bg: "bg-slate-800", border: "border-slate-600/30", text: "text-slate-300", icon: <CircleDot size={12} />, label: "PENDING" },
  };
  const c = config[status];
  return (
    <span className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${c.bg} ${c.border} ${c.text}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

function getNodeStatus(
  run: MonkRun,
  state: RunState,
  replaying: boolean,
  replayState: RunState | null,
  visibleTransitions: MonkRun["transitions"]
) {
  const activeState = replaying && replayState ? replayState : run.state;

  if (activeState === "BLOCKED" && state !== "PLANNING" && state !== "COMPLIANCE_REVIEW") {
    return {
      kind: "blocked",
      label: "blocked",
      className: "border-red-400/50 bg-red-950/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]",
      dotClass: "border-red-400 bg-red-500/30 text-red-100",
      connectorClass: "bg-red-400/40",
      labelClass: "text-red-200",
    };
  }

  if (activeState === state) {
    return {
      kind: "active",
      label: "active",
      className: "border-emerald-400/70 bg-emerald-950/40 shadow-[0_0_28px_rgba(52,211,153,0.22)]",
      dotClass: "border-emerald-300 bg-emerald-400/50 text-emerald-900 animate-pulse",
      connectorClass: "bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse",
      labelClass: "text-emerald-200 font-bold",
    };
  }

  const completedStates = new Set((replaying ? visibleTransitions : run.transitions).map((transition) => transition.nextState));
  if (completedStates.has(state) || (!replaying && run.state === "COMPLETED" && state === "COMPLETED")) {
    return {
      kind: "done",
      label: "done",
      className: "border-emerald-400/30 bg-[#0b1018]",
      dotClass: "border-emerald-400/60 bg-emerald-950 text-emerald-300",
      connectorClass: "bg-emerald-400/40",
      labelClass: "text-emerald-300",
    };
  }

  return {
    kind: "waiting",
    label: "waiting",
    className: "border-white/10 bg-[#0b1018]",
    dotClass: "border-slate-600 bg-slate-900 text-slate-500",
    connectorClass: "bg-white/10",
    labelClass: "text-slate-500",
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
  return run.telemetry.length + (run.evidence ? 1 : 0);
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
