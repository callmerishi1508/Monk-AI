"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight, BrainCircuit, CheckCircle2, ChevronDown, ChevronRight,
  Code2, DollarSign, Download, FileText, Layers, Loader2, Maximize2,
  Megaphone, MessageSquare, Microscope, PenTool, Play, RefreshCw,
  Scale, Search, Settings, Shield, Sparkles, Star, Target, TrendingUp,
  Users, X, Zap, Building2, Activity, GitBranch, Eye, BarChart3,
  Globe, Package, FlaskConical, Briefcase, Clock, AlertTriangle,
  CheckSquare, Edit3, Trash2, Copy, ExternalLink, ArrowLeft,
} from "lucide-react";
import type { MonkSession, TeamId, TeamWorker, ClarificationQuestion, StartupDocument } from "@/lib/monk/types";

/* ══════════════════════════════════════════════════════════════
   STATIC CONFIG
   ══════════════════════════════════════════════════════════════ */

const EXAMPLE_PROMPTS = [
  "I want to start a trading company",
  "Build a dating website",
  "I want to solve food waste in restaurants",
  "Create a cybersecurity platform for small businesses",
  "Build an agriculture monitoring app using IoT",
  "I want to create an online learning platform for kids",
  "Build a peer-to-peer rental marketplace",
  "I want to solve mental health access for rural areas",
];

const STAGES = [
  { id: "IDEA_INTAKE",        label: "Idea Analysis",      icon: <Sparkles size={13} /> },
  { id: "TEAM_ASSEMBLY",      label: "Team Assembly",      icon: <Users size={13} /> },
  { id: "CLARIFICATION",      label: "Discovery Q&A",      icon: <MessageSquare size={13} /> },
  { id: "DOCUMENT_DRAFT",     label: "Building Document",  icon: <FileText size={13} /> },
  { id: "DOCUMENT_REVIEW",    label: "Human Review",       icon: <Eye size={13} /> },
  { id: "TEAM_DISPATCH",      label: "Team Dispatch",      icon: <Zap size={13} /> },
  { id: "PARALLEL_EXECUTION", label: "Teams Working",      icon: <Activity size={13} /> },
  { id: "CROSS_FUNCTIONAL",   label: "Cross-Team Sync",    icon: <GitBranch size={13} /> },
  { id: "OUTPUT_COLLECTION",  label: "Assembling Outputs", icon: <Package size={13} /> },
  { id: "COMPLETE",           label: "Complete",           icon: <CheckCircle2 size={13} /> },
];

const TEAM_ICONS: Record<TeamId, React.ReactNode> = {
  PRODUCT:     <FileText size={18} />,
  ENGINEERING: <Code2 size={18} />,
  DESIGN:      <PenTool size={18} />,
  RESEARCH:    <Microscope size={18} />,
  MARKETING:   <Megaphone size={18} />,
  LEGAL:       <Scale size={18} />,
  FINANCE:     <DollarSign size={18} />,
  SALES:       <TrendingUp size={18} />,
  COMPLIANCE:  <Shield size={18} />,
  QA:          <CheckCircle2 size={18} />,
  OPERATIONS:  <Settings size={18} />,
  SECURITY:    <Shield size={18} />,
};

const TEAM_COLORS: Record<TeamId, { border: string; bg: string; text: string; glow: string }> = {
  PRODUCT:     { border: "border-cyan-500/30",    bg: "bg-cyan-500/10",    text: "text-cyan-300",    glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]" },
  ENGINEERING: { border: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300", glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]" },
  DESIGN:      { border: "border-violet-500/30",  bg: "bg-violet-500/10",  text: "text-violet-300",  glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]" },
  RESEARCH:    { border: "border-purple-500/30",  bg: "bg-purple-500/10",  text: "text-purple-300",  glow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]" },
  MARKETING:   { border: "border-pink-500/30",    bg: "bg-pink-500/10",    text: "text-pink-300",    glow: "shadow-[0_0_20px_rgba(236,72,153,0.15)]" },
  LEGAL:       { border: "border-amber-500/30",   bg: "bg-amber-500/10",   text: "text-amber-300",   glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]" },
  FINANCE:     { border: "border-yellow-500/30",  bg: "bg-yellow-500/10",  text: "text-yellow-300",  glow: "shadow-[0_0_20px_rgba(234,179,8,0.15)]" },
  SALES:       { border: "border-orange-500/30",  bg: "bg-orange-500/10",  text: "text-orange-300",  glow: "shadow-[0_0_20px_rgba(249,115,22,0.15)]" },
  COMPLIANCE:  { border: "border-red-500/30",     bg: "bg-red-500/10",     text: "text-red-300",     glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]" },
  QA:          { border: "border-teal-500/30",    bg: "bg-teal-500/10",    text: "text-teal-300",    glow: "shadow-[0_0_20px_rgba(20,184,166,0.15)]" },
  OPERATIONS:  { border: "border-blue-500/30",    bg: "bg-blue-500/10",    text: "text-blue-300",    glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
  SECURITY:    { border: "border-rose-500/30",    bg: "bg-rose-500/10",    text: "text-rose-300",    glow: "shadow-[0_0_20px_rgba(244,63,94,0.15)]" },
};

const ACTIVE_STAGES = new Set([
  "IDEA_INTAKE", "TEAM_ASSEMBLY", "CLARIFICATION", "DOCUMENT_DRAFT",
  "TEAM_DISPATCH", "PARALLEL_EXECUTION", "CROSS_FUNCTIONAL", "OUTPUT_COLLECTION",
]);

/* ══════════════════════════════════════════════════════════════
   ROOT PAGE
   ══════════════════════════════════════════════════════════════ */

export default function Home() {
  const [session, setSession] = useState<MonkSession | null>(null);
  const [sessions, setSessions] = useState<MonkSession[]>([]);
  const [ideaInput, setIdeaInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [currentPromptIdx, setCurrentPromptIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<string | null>(null);
  const [drawerOutput, setDrawerOutput] = useState<{ title: string; content: string; type: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load API keys from local storage
  useEffect(() => {
    const savedKey = localStorage.getItem("MONK_API_KEY");
    if (savedKey) setApiKey(savedKey);
  }, []);

  async function saveSettings() {
    localStorage.setItem("MONK_API_KEY", apiKey);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
    } catch (e) {
      console.error("Failed to save settings to backend", e);
    }
    setShowSettings(false);
  }

  // Rotate example prompts
  useEffect(() => {
    const t = setInterval(() => setCurrentPromptIdx(i => (i + 1) % EXAMPLE_PROMPTS.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Load session list on mount
  useEffect(() => { loadSessions(); }, []);

  // Poll active session
  useEffect(() => {
    if (!session) { stopPolling(); return; }
    if (ACTIVE_STAGES.has(session.stage)) {
      pollingRef.current = setInterval(() => pollSession(session.sessionId), 2500);
    } else {
      stopPolling();
    }
    return stopPolling;
  }, [session?.stage, session?.sessionId]);

  function stopPolling() {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  }

  async function loadSessions() {
    try {
      const res = await fetch("/api/sessions", { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setSessions(d.sessions || []); }
    } catch {}
  }

  async function pollSession(id: string) {
    try {
      const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setSession(d.session); }
    } catch {}
  }

  async function createSession() {
    if (!ideaInput.trim() || isCreating) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: ideaInput.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setSession(d.session);
        setIdeaInput("");
        await loadSessions();
      }
    } catch {} finally { setIsCreating(false); }
  }

  async function approveTeams(teamIds: TeamId[]) {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/approve-teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teams: teamIds }),
      });
      if (res.ok) { const d = await res.json(); if (d.session) setSession(d.session); }
    } catch {}
  }

  async function answerQuestion(questionId: string, answer: string | null, skipped = false) {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, answer, skipped }),
      });
      if (res.ok) { const d = await res.json(); if (d.session) setSession(d.session); }
    } catch {}
  }

  async function skipAllQuestions() {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipAll: true }),
      });
      if (res.ok) { const d = await res.json(); if (d.session) setSession(d.session); }
    } catch {}
  }

  async function reviewDocument(action: "APPROVE" | "MODIFY" | "REFRAME", modifications?: string) {
    if (!session) return;
    try {
      const res = await fetch(`/api/sessions/${session.sessionId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, modifications }),
      });
      if (res.ok) { const d = await res.json(); if (d.session) setSession(d.session); }
    } catch {}
  }

  function downloadOutput(output: MonkSession["teamOutputs"][0]) {
    const isCode = output.outputType === "WEBSITE_CODE" || output.outputType === "TRD";
    const ext = isCode ? ".tsx" : ".md";
    const blob = new Blob([output.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${output.teamId.toLowerCase()}-${output.title.replace(/\s+/g, "-").toLowerCase()}${ext}`;
    a.click(); URL.revokeObjectURL(url);
  }

  function downloadDocument(doc: StartupDocument) {
    const md = formatDocumentAsMarkdown(doc);
    const blob = new Blob([md], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "startup-document.md";
    a.click(); URL.revokeObjectURL(url);
  }

  const stageIndex = STAGES.findIndex(s => s.id === session?.stage);
  const isProcessing = session && ACTIVE_STAGES.has(session.stage);

  /* ── LANDING PAGE ── */
  if (!session) {
    return (
      <LandingPage
        ideaInput={ideaInput}
        setIdeaInput={setIdeaInput}
        isCreating={isCreating}
        createSession={createSession}
        currentPromptIdx={currentPromptIdx}
        sessions={sessions}
        onSelectSession={s => setSession(s)}
        showHistory={showHistory}
        setShowHistory={setShowHistory}
      />
    );
  }

  return (
    <>
      {/* Artifact Drawer */}
      {drawerOutput && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDrawerOutput(null)} />
          <div className="relative ml-auto w-full max-w-3xl bg-[#07070f] border-l border-white/[0.07] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-emerald-400" />
                <div>
                  <p className="font-semibold text-white text-sm">{drawerOutput.title}</p>
                  <p className="text-[9px] text-[#3F3F46] font-mono uppercase tracking-widest">{drawerOutput.type}</p>
                </div>
              </div>
              <button onClick={() => setDrawerOutput(null)} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-[#71717A] hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="font-mono text-[11px] text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{drawerOutput.content}</pre>
            </div>
            <div className="border-t border-white/[0.05] px-6 py-3 shrink-0 flex items-center justify-between">
              <p className="text-[8px] text-[#3F3F46] font-mono uppercase tracking-widest">Press Esc or click outside to close</p>
              <button onClick={() => { const blob = new Blob([drawerOutput.content], { type: "text/plain" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${drawerOutput.title.replace(/\s+/g, "-").toLowerCase()}.md`; a.click(); }}
                className="flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/8 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/15 transition-all">
                <Download size={10} /> Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full max-w-md bg-[#07070f] border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#52525B] mb-1.5">OpenAI API Key</label>
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-..." className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500/50 outline-none" />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button onClick={saveSettings} className="flex-1 bg-white text-black text-xs font-bold py-2.5 rounded-lg hover:bg-emerald-50 transition-all">Save Changes</button>
                <button onClick={() => setShowSettings(false)} className="px-4 py-2.5 rounded-lg border border-white/[0.08] text-xs font-bold text-[#71717A] hover:text-white transition-all">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="min-h-screen bg-[#050508] text-white flex flex-col">
        {/* Ambient orbs */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px]" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
          <div className="absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-violet-500/4 blur-[100px]" />
        </div>

        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-[#050508]/80 backdrop-blur-2xl">
          <div className="mx-auto max-w-[1800px] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setSession(null)} className="flex items-center gap-2 text-[#52525B] hover:text-white transition-colors">
                <ArrowLeft size={15} />
              </button>
              <div className="h-4 w-px bg-white/[0.08]" />
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                  <BrainCircuit size={16} className="text-emerald-400" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white">{session.sessionLabel}</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[8px] font-mono text-[#3F3F46] uppercase tracking-widest">{session.sector}</span>
                    {session.ideaType && (
                      <span className={`text-[7px] font-bold uppercase tracking-widest rounded-full px-1.5 py-0.5 ${
                        session.ideaType === "PROBLEM_STATEMENT" ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      }`}>{session.ideaType === "PROBLEM_STATEMENT" ? "Problem Statement" : "Direct Build"}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="flex-1 max-w-md hidden md:block">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-bold uppercase tracking-widest text-[#52525B]">Overall Progress</span>
                <span className="text-[10px] font-semibold text-white">{Math.round(session.overallProgress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
                  style={{ width: `${session.overallProgress}%`, boxShadow: "0 0 10px rgba(16,185,129,0.5)" }} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-white/[0.05] transition-all">
                <Settings size={14} /> Settings
              </button>
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-xs text-[#A1A1AA] hover:text-white hover:bg-white/[0.05] transition-all">
                <Clock size={14} /> History
              </button>
              {isProcessing && (
                <span className="flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/8 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-blue-400">
                  <Loader2 size={9} className="animate-spin" />Processing
                </span>
              )}
              {session.stage === "COMPLETE" && (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[8px] font-bold uppercase tracking-widest text-emerald-300">
                  <CheckCircle2 size={9} />Complete
                </span>
              )}
            </div>
          </div>
        </header>

        {/* 3-column layout */}
        <div className="relative z-10 flex flex-1 mx-auto max-w-[1800px] w-full">

          {/* LEFT — Stage Progress */}
          <aside className="hidden lg:flex flex-col w-[220px] shrink-0 border-r border-white/[0.04] p-4 gap-1">
            <p className="label-xs mb-3">Pipeline</p>
            {STAGES.map((s, i) => {
              const isCurrent = session.stage === s.id;
              const isDone = stageIndex > i && !isCurrent;
              const isWaiting = stageIndex < i;
              return (
                <div key={s.id} className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
                  isCurrent ? "bg-emerald-500/8 border border-emerald-500/20" :
                  isDone ? "opacity-60" : "opacity-25"
                }`}>
                  {i < STAGES.length - 1 && <div className="absolute left-[21px] top-10 h-3 w-px bg-white/[0.06]" />}
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                    isCurrent ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" :
                    isDone ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-500" : "border-white/[0.06] bg-white/[0.02] text-[#3F3F46]"
                  }`}>
                    {isDone ? <CheckCircle2 size={10} /> : isCurrent ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> : s.icon}
                  </div>
                  <span className={`text-[10px] font-semibold ${isCurrent ? "text-white" : isDone ? "text-[#71717A]" : "text-[#3F3F46]"}`}>{s.label}</span>
                  {isCurrent && isProcessing && <Loader2 size={8} className="ml-auto text-emerald-400 animate-spin shrink-0" />}
                </div>
              );
            })}
          </aside>

          {/* CENTER — Main stage UI */}
          <main className="flex-1 min-w-0 p-4 sm:p-8 overflow-y-auto">
            {session.sessionLabel.includes("Demo Mode") && (
              <div className="max-w-4xl mx-auto mb-6 bg-orange-500/10 border border-orange-500/20 text-orange-300 px-4 py-3 rounded-lg flex items-start sm:items-center gap-3 text-sm shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <strong className="font-semibold block sm:inline">Offline Fallback Mode Active: </strong>
                  <span>API quota exceeded or no valid key found. MONK AI has safely shifted to its local deterministic mock engine.</span>
                </div>
                <button onClick={() => setShowSettings(true)} className="ml-auto shrink-0 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 rounded text-xs font-bold transition-colors">
                  Configure API
                </button>
              </div>
            )}

            <div className="max-w-4xl mx-auto">
              <StageUI
                session={session}
                onApproveTeams={approveTeams}
                onAnswerQuestion={answerQuestion}
                onSkipAll={skipAllQuestions}
                onReviewDocument={reviewDocument}
                onDownloadDocument={downloadDocument}
                onViewOutput={o => setDrawerOutput({ title: o.title, content: o.content, type: o.outputType })}
                onDownloadOutput={downloadOutput}
              />
            </div>
          </main>

          {/* RIGHT — Live Activity Feed */}
          <aside className="hidden xl:flex flex-col w-[280px] shrink-0 border-l border-white/[0.04] p-4 overflow-y-auto max-h-screen sticky top-0">
            <p className="label-xs mb-3">Live Activity</p>
            <div className="space-y-2 flex-1">
              {session.events.length === 0
                ? <p className="text-[10px] text-[#3F3F46] text-center mt-8">Activity starts when processing begins…</p>
                : [...session.events].reverse().slice(0, 30).map((event, i) => (
                  <div key={event.id} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-[#3F3F46] mb-1">{event.stage} · {new Date(event.timestamp).toLocaleTimeString()}</p>
                    <p className="text-[11px] font-semibold text-[#A1A1AA] leading-snug">{event.event}</p>
                    <p className="text-[10px] text-[#52525B] mt-1 leading-relaxed">{event.detail}</p>
                  </div>
                ))
              }
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   LANDING PAGE
   ══════════════════════════════════════════════════════════════ */

function LandingPage({
  ideaInput, setIdeaInput, isCreating, createSession,
  currentPromptIdx, sessions, onSelectSession, showHistory, setShowHistory,
}: {
  ideaInput: string; setIdeaInput: (v: string) => void;
  isCreating: boolean; createSession: () => void;
  currentPromptIdx: number; sessions: MonkSession[];
  onSelectSession: (s: MonkSession) => void;
  showHistory: boolean; setShowHistory: (v: boolean) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey && ideaInput.trim()) {
      e.preventDefault(); createSession();
    }
  }

  const SECTORS = ["FinTech","HealthTech","EdTech","AgriTech","CyberSecurity","E-Commerce","SaaS","Web3","DeepTech","PropTech","LegalTech","ClimaTech","Gaming","Logistics","B2B SaaS","Consumer","Trading","Social","Media","BioTech"];

  return (
    <div className="min-h-screen bg-[#050508] text-white relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-emerald-500/[0.04] blur-[150px]" />
        <div className="absolute -top-40 left-0 w-[500px] h-[500px] rounded-full bg-violet-500/[0.05] blur-[120px]" />
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-indigo-500/[0.04] blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)", backgroundSize: "64px 64px" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
            <BrainCircuit size={18} className="text-emerald-400" />
          </div>
          <span className="text-[18px] font-bold tracking-tight text-white">MONK AI</span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-emerald-400">v2.0</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[11px] font-semibold text-[#71717A] hover:text-white hover:border-white/[0.1] transition-all">
            <Clock size={12} />{sessions.length > 0 ? `${sessions.length} Sessions` : "History"}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-2 text-[11px] font-semibold text-emerald-300">
          <Sparkles size={11} />From idea to startup in minutes · Universal · All Sectors
        </div>

        <h1 className="mb-5 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.06]">
          <span className="text-white">Turn any idea</span><br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">into a company.</span>
        </h1>

        <p className="mb-10 text-lg text-[#71717A] max-w-2xl mx-auto leading-relaxed">
          MONK AI assembles your team, asks the right questions, builds your startup document, and coordinates all departments — from product to legal — to deliver everything you need to launch.
        </p>

        {/* Input */}
        <div className="relative max-w-2xl mx-auto mb-6">
          <div className="rounded-3xl border border-white/[0.09] bg-white/[0.03] backdrop-blur-xl overflow-hidden shadow-[0_0_60px_rgba(16,185,129,0.06)] hover:border-white/[0.14] transition-all focus-within:border-emerald-500/30 focus-within:shadow-[0_0_60px_rgba(16,185,129,0.12)]">
            <textarea
              ref={textareaRef}
              value={ideaInput}
              onChange={e => setIdeaInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your startup idea, problem you want to solve, or product to build…"
              rows={3}
              className="w-full resize-none bg-transparent px-6 pt-5 pb-2 text-[15px] text-white leading-relaxed placeholder:text-[#3F3F46] focus:outline-none"
            />
            <div className="flex items-center justify-between px-5 pb-4 pt-1">
              <span className="text-[10px] text-[#3F3F46] font-mono">Enter ↵ to submit</span>
              <button onClick={createSession} disabled={!ideaInput.trim() || isCreating}
                className="flex items-center justify-center h-10 w-10 rounded-full bg-white text-black hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95">
                {isCreating ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Example prompts */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-[11px] text-[#3F3F46]">Try:</span>
          {EXAMPLE_PROMPTS.slice(0, 5).map((p, i) => (
            <button key={p} onClick={() => setIdeaInput(p)}
              className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-[#71717A] hover:text-white hover:border-white/[0.15] hover:bg-white/[0.06] transition-all">
              {p}
            </button>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-20 text-left">
          <p className="text-center text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] mb-8">How MONK AI works</p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { icon: <MessageSquare size={16} />, label: "Analyze Idea", desc: "Classify & discover" },
              { icon: <Users size={16} />, label: "Assemble Team", desc: "Right departments" },
              { icon: <FileText size={16} />, label: "Build Document", desc: "Full startup plan" },
              { icon: <Activity size={16} />, label: "Teams Execute", desc: "Parallel workflows" },
              { icon: <Download size={16} />, label: "Deliver Outputs", desc: "Download everything" },
            ].map((step, i) => (
              <div key={step.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
                <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.06] mx-auto mb-3 text-emerald-400">{step.icon}</div>
                <p className="text-[11px] font-semibold text-white mb-1">{step.label}</p>
                <p className="text-[9px] text-[#52525B]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sector scrolling marquee */}
        <div className="mt-16 overflow-hidden">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] mb-4">Works for all sectors</p>
          <div className="flex gap-3 animate-[scroll-names_30s_linear_infinite] whitespace-nowrap w-max">
            {[...SECTORS, ...SECTORS].map((sector, i) => (
              <span key={i} className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[10px] font-medium text-[#71717A]">{sector}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Session history panel */}
      {showHistory && sessions.length > 0 && (
        <div className="fixed inset-y-0 right-0 z-50 w-80 bg-[#07070f]/95 backdrop-blur-2xl border-l border-white/[0.06] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
            <span className="text-sm font-bold text-white">Session History</span>
            <button onClick={() => setShowHistory(false)} className="text-[#71717A] hover:text-white"><X size={15} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {sessions.map(s => (
              <button key={s.sessionId} onClick={() => { onSelectSession(s); setShowHistory(false); }}
                className="w-full rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5 text-left hover:bg-white/[0.05] hover:border-white/[0.09] transition-all group">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold text-white group-hover:text-emerald-300 transition-colors leading-tight">{s.sessionLabel}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest ${
                    s.stage === "COMPLETE" ? "bg-emerald-500/15 text-emerald-400" :
                    s.stage === "FAILED" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"
                  }`}>{s.stage}</span>
                </div>
                <p className="mt-1.5 text-[9px] text-[#3F3F46] leading-relaxed line-clamp-2">{s.idea}</p>
                <p className="mt-1.5 text-[8px] text-[#2F2F3A] font-mono">{new Date(s.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   STAGE UI DISPATCHER
   ══════════════════════════════════════════════════════════════ */

function StageUI({
  session, onApproveTeams, onAnswerQuestion, onSkipAll, onReviewDocument,
  onDownloadDocument, onViewOutput, onDownloadOutput,
}: {
  session: MonkSession;
  onApproveTeams: (teams: TeamId[]) => void;
  onAnswerQuestion: (qId: string, answer: string | null, skipped?: boolean) => void;
  onSkipAll: () => void;
  onReviewDocument: (action: "APPROVE" | "MODIFY" | "REFRAME", mods?: string) => void;
  onDownloadDocument: (doc: StartupDocument) => void;
  onViewOutput: (o: MonkSession["teamOutputs"][0]) => void;
  onDownloadOutput: (o: MonkSession["teamOutputs"][0]) => void;
}) {
  switch (session.stage) {
    case "IDEA_INTAKE":
      return <IdeaIntakeStage session={session} />;
    case "TEAM_ASSEMBLY":
      return <TeamAssemblyStage session={session} onApprove={onApproveTeams} />;
    case "CLARIFICATION":
      return <ClarificationStage session={session} onAnswer={onAnswerQuestion} onSkipAll={onSkipAll} />;
    case "DOCUMENT_DRAFT":
      return <DocumentDraftStage session={session} />;
    case "DOCUMENT_REVIEW":
      return <DocumentReviewStage session={session} onReview={onReviewDocument} onDownload={onDownloadDocument} />;
    case "TEAM_DISPATCH":
    case "PARALLEL_EXECUTION":
    case "CROSS_FUNCTIONAL":
    case "OUTPUT_COLLECTION":
      return <ParallelExecutionStage session={session} />;
    case "COMPLETE":
      return <CompleteStage session={session} onViewOutput={onViewOutput} onDownloadOutput={onDownloadOutput} onDownloadDocument={onDownloadDocument} />;
    case "FAILED":
      return <FailedStage session={session} />;
    default:
      return <LoadingStage label="Initializing pipeline..." />;
  }
}

/* ── Stage 1: Idea Intake ──────────────────────────────── */

function IdeaIntakeStage({ session }: { session: MonkSession }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader icon={<Sparkles size={18} className="text-emerald-400" />} title="Analyzing Your Idea" subtitle="MONK AI is classifying your idea and understanding its context" />
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-6 backdrop-blur-xl">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] mb-3">Your Idea</p>
        <p className="text-[15px] text-white leading-relaxed">{session.idea}</p>
      </div>
      <ProcessingCard label="Classification Engine" detail="Analyzing sector, idea type, and startup context..." />
    </div>
  );
}

/* ── Stage 2: Team Assembly ──────────────────────────────── */

function TeamAssemblyStage({ session, onApprove }: { session: MonkSession; onApprove: (t: TeamId[]) => void }) {
  const [selected, setSelected] = useState<Set<TeamId>>(new Set());
  const proposed = session.proposedTeams;
  const isReady = proposed.length > 0;

  useEffect(() => {
    if (proposed.length > 0) setSelected(new Set(proposed.map(t => t.teamId)));
  }, [proposed.length]);

  function toggle(id: TeamId) {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  }

  if (!isReady) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <SectionHeader icon={<Users size={18} className="text-cyan-400" />} title="Assembling Your Team" subtitle="AI is selecting the right departments for your startup" />
        <ProcessingCard label="Team Assembly Engine" detail="Evaluating which departments are required for your specific startup..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <SectionHeader icon={<Users size={18} className="text-cyan-400" />} title="Your Startup Team"
        subtitle={`MONK AI recommends ${proposed.length} departments. You can modify before proceeding.`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {proposed.map(team => {
          const colors = TEAM_COLORS[team.teamId];
          const isSel = selected.has(team.teamId);
          return (
            <button key={team.teamId} onClick={() => toggle(team.teamId)}
              className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all group ${
                isSel ? `${colors.border} ${colors.bg} ${colors.glow}` : "border-white/[0.04] bg-white/[0.01] opacity-50"
              }`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isSel ? `${colors.border} ${colors.bg} ${colors.text}` : "border-white/[0.06] text-[#3F3F46]"}`}>
                {TEAM_ICONS[team.teamId]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-bold ${isSel ? "text-white" : "text-[#52525B]"}`}>{team.label}</p>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${isSel ? "bg-white border-white" : "border-white/[0.1] bg-transparent"}`}>
                    {isSel && <CheckCircle2 size={10} className="text-black" />}
                  </div>
                </div>
                <p className={`text-[10px] mt-1 leading-relaxed ${isSel ? "text-[#71717A]" : "text-[#3F3F46]"}`}>{team.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
        <div>
          <p className="text-sm font-semibold text-white">{selected.size} teams selected</p>
          <p className="text-[10px] text-[#52525B] mt-0.5">Deselect any team you don't need · All teams work in parallel</p>
        </div>
        <button onClick={() => onApprove([...selected])} disabled={selected.size === 0}
          className="flex items-center gap-2 rounded-xl bg-white text-black px-5 py-3 text-[12px] font-bold hover:bg-emerald-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] active:scale-95">
          <ArrowRight size={14} />Confirm Team → Start Discovery
        </button>
      </div>
    </div>
  );
}

/* ── Stage 3: Clarification Q&A ─────────────────────────── */

function ClarificationStage({
  session, onAnswer, onSkipAll,
}: {
  session: MonkSession;
  onAnswer: (qId: string, answer: string | null, skipped?: boolean) => void;
  onSkipAll: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const questions = session.clarificationQuestions;
  const answered = new Set(session.clarificationAnswers.map(a => a.questionId));
  const nextQuestion = questions.find(q => !answered.has(q.id));
  const totalAnswered = session.clarificationAnswers.length;
  const totalQuestions = questions.length;

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <SectionHeader icon={<MessageSquare size={18} className="text-violet-400" />} title="Discovery Questions" subtitle="Loading questions…" />
        <ProcessingCard label="Discovery Engine" detail="Generating targeted questions to understand your vision..." />
      </div>
    );
  }

  async function submitAnswer(q: ClarificationQuestion) {
    setSubmitting(q.id);
    const ans = answers[q.id]?.trim() || null;
    await onAnswer(q.id, ans || null, !ans);
    setSubmitting(null);
  }

  async function skipQuestion(q: ClarificationQuestion) {
    setSubmitting(q.id);
    await onAnswer(q.id, null, true);
    setSubmitting(null);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader icon={<MessageSquare size={18} className="text-violet-400" />} title="Discovery Questions"
        subtitle={`${totalAnswered} of ${totalQuestions} answered · AI decides for skipped ones`} />

      {/* Progress */}
      <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-400 rounded-full transition-all duration-500"
          style={{ width: `${(totalAnswered / Math.max(1, totalQuestions)) * 100}%` }} />
      </div>

      {/* Answered questions */}
      {session.clarificationAnswers.map(a => {
        const q = questions.find(q => q.id === a.questionId);
        if (!q) return null;
        return (
          <div key={a.questionId} className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-4">
            <p className="text-[11px] font-bold text-emerald-400/70 mb-2">{q.question}</p>
            <p className="text-sm text-[#A1A1AA]">{a.skipped ? "↷ Skipped — AI will decide" : a.answer}</p>
          </div>
        );
      })}

      {/* Current question */}
      {nextQuestion && (
        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/[0.04] p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-6 w-6 rounded-full border border-violet-500/30 bg-violet-500/15 flex items-center justify-center">
              <span className="text-[9px] font-bold text-violet-400">{totalAnswered + 1}</span>
            </div>
            <p className="text-sm font-bold text-white">{nextQuestion.question}</p>
          </div>
          {nextQuestion.context && <p className="text-[11px] text-[#71717A] mb-4 pl-8">{nextQuestion.context}</p>}
          {nextQuestion.examples && (
            <div className="flex flex-wrap gap-1.5 mb-4 pl-8">
              {nextQuestion.examples.map(ex => (
                <button key={ex} onClick={() => setAnswers(prev => ({ ...prev, [nextQuestion.id]: ex }))}
                  className="rounded-full border border-violet-500/20 bg-violet-500/8 px-2.5 py-1 text-[10px] text-violet-300 hover:bg-violet-500/15 transition-all">
                  {ex}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2.5 pl-8">
            <textarea
              value={answers[nextQuestion.id] || ""}
              onChange={e => setAnswers(prev => ({ ...prev, [nextQuestion.id]: e.target.value }))}
              placeholder="Type your answer…"
              rows={2}
              className="flex-1 resize-none rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-violet-500/30 leading-relaxed"
            />
          </div>
          <div className="flex items-center gap-2 mt-3 pl-8">
            <button onClick={() => submitAnswer(nextQuestion)} disabled={submitting === nextQuestion.id}
              className="flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-[11px] font-bold hover:bg-violet-50 disabled:opacity-30 transition-all">
              {submitting === nextQuestion.id ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}Submit
            </button>
            {nextQuestion.skippable && (
              <button onClick={() => skipQuestion(nextQuestion)} disabled={submitting === nextQuestion.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-[11px] font-semibold text-[#71717A] hover:text-white hover:border-white/[0.1] transition-all">
                Skip →
              </button>
            )}
            <button onClick={onSkipAll}
              className="ml-auto rounded-xl border border-white/[0.04] px-3 py-2.5 text-[10px] text-[#3F3F46] hover:text-[#71717A] transition-all">
              Skip All & Let AI Decide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stage 4: Document Draft ─────────────────────────────── */

function DocumentDraftStage({ session }: { session: MonkSession }) {
  const sections = [
    "Executive Summary", "Problem Statement", "Solution", "Vision & Mission",
    "Target Market", "Features", "Competitor Analysis", "Tech Stack",
    "Roadmap & Timeline", "Budget", "Go-to-Market Strategy", "Risk Assessment",
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <SectionHeader icon={<FileText size={18} className="text-indigo-400" />} title="Building Your Startup Document"
        subtitle="MONK AI is generating a comprehensive startup plan tailored to your vision" />
      <ProcessingCard label="Document Architect" detail="Writing your complete startup document with all sections…" />
      <div className="grid grid-cols-2 gap-2">
        {sections.map((s, i) => (
          <div key={s} className="rounded-xl border border-white/[0.04] bg-white/[0.01] px-3 py-2.5 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-white/[0.08] animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            <span className="text-[10px] text-[#52525B] font-medium">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Stage 5: Document Review ────────────────────────────── */

function DocumentReviewStage({
  session, onReview, onDownload,
}: {
  session: MonkSession;
  onReview: (action: "APPROVE" | "MODIFY" | "REFRAME", mods?: string) => void;
  onDownload: (doc: StartupDocument) => void;
}) {
  const [modText, setModText] = useState("");
  const [showModInput, setShowModInput] = useState(false);
  const doc = session.startupDocument;
  if (!doc) return <LoadingStage label="Loading document..." />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeader icon={<Eye size={18} className="text-indigo-400" />} title="Review Your Startup Document"
          subtitle={`${session.documentRevisions.length > 0 ? `Revision ${session.documentRevisions.length}` : "First Draft"} · Review, modify, or reframe before teams begin work`} />
        <button onClick={() => onDownload(doc)}
          className="shrink-0 flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2 text-[10px] font-bold text-[#71717A] hover:text-white hover:border-white/[0.1] transition-all uppercase tracking-wider">
          <Download size={11} /> Download
        </button>
      </div>

      <DocumentViewer doc={doc} />

      {/* Actions */}
      {showModInput ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-5 space-y-4">
          <p className="text-sm font-bold text-white">What would you like to change?</p>
          <textarea
            value={modText} onChange={e => setModText(e.target.value)}
            placeholder="e.g., Add more focus on B2B enterprise customers, change the tech stack to use Python, add more competitive analysis…"
            rows={3}
            className="w-full resize-none rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-[#3F3F46] focus:outline-none focus:border-amber-500/30 leading-relaxed"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => { onReview("MODIFY", modText); setShowModInput(false); }} disabled={!modText.trim()}
              className="flex items-center gap-2 rounded-xl bg-amber-500 text-black px-5 py-2.5 text-[11px] font-bold hover:bg-amber-400 disabled:opacity-30 transition-all">
              <RefreshCw size={12} />Rebuild with Changes
            </button>
            <button onClick={() => setShowModInput(false)} className="rounded-xl border border-white/[0.06] px-4 py-2.5 text-[11px] text-[#71717A] hover:text-white transition-all">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => onReview("APPROVE")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-5 hover:bg-emerald-500/15 hover:shadow-[0_0_30px_rgba(16,185,129,0.12)] transition-all group">
            <CheckCircle2 size={22} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-emerald-300">Approve & Launch Teams</span>
            <span className="text-[10px] text-[#52525B] text-center">All teams will start working immediately</span>
          </button>
          <button onClick={() => setShowModInput(true)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 hover:bg-amber-500/8 transition-all group">
            <Edit3 size={22} className="text-amber-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-amber-300">Modify</span>
            <span className="text-[10px] text-[#52525B] text-center">Tell AI what to change and regenerate</span>
          </button>
          <button onClick={() => onReview("REFRAME")}
            className="flex flex-col items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.04] p-5 hover:bg-red-500/8 transition-all group">
            <RefreshCw size={22} className="text-red-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-red-300">Reframe Everything</span>
            <span className="text-[10px] text-[#52525B] text-center">Start fresh with a completely new approach</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Stage 6-9: Parallel Execution ──────────────────────── */

function ParallelExecutionStage({ session }: { session: MonkSession }) {
  const teams = session.approvedTeams || session.proposedTeams;
  const stage = session.stage;

  const stageLabelMap: Record<string, string> = {
    TEAM_DISPATCH: "Dispatching startup document to all departments…",
    PARALLEL_EXECUTION: "All teams are working simultaneously on their deliverables…",
    CROSS_FUNCTIONAL: "Teams are sharing insights and coordinating outputs…",
    OUTPUT_COLLECTION: "Assembling all deliverables for final delivery…",
  };
  const stageLabel = stageLabelMap[stage] ?? "Teams are working…";

  return (
    <div className="space-y-6">
      <SectionHeader icon={<Activity size={18} className="text-emerald-400" />} title="Teams Working"
        subtitle={stageLabel} />

      {/* Cross-functional links */}
      {stage === "CROSS_FUNCTIONAL" && session.crossFunctionalLinks.length > 0 && (
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.03] p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3">Cross-Team Data Flow</p>
          <div className="space-y-2">
            {session.crossFunctionalLinks.map((link, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="font-semibold text-white">{link.fromTeam}</span>
                <ArrowRight size={10} className="text-indigo-400" />
                <span className="font-semibold text-white">{link.toTeam}</span>
                <span className="text-[#71717A] ml-2">{link.dataType}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {teams.map(team => {
          const colors = TEAM_COLORS[team.teamId];
          const isDone = team.status === "DONE";
          const isActive = team.status === "ACTIVE" || team.status === "REVIEWING";
          const isBlocked = team.status === "BLOCKED";

          return (
            <div key={team.teamId} className={`rounded-2xl border p-4 transition-all ${
              isDone ? `${colors.border} ${colors.bg}` :
              isActive ? "border-white/[0.07] bg-white/[0.02]" :
              isBlocked ? "border-red-500/20 bg-red-500/[0.03]" :
              "border-white/[0.04] bg-white/[0.01] opacity-50"
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${isDone ? `${colors.border} ${colors.bg} ${colors.text}` : "border-white/[0.06] text-[#3F3F46]"}`}>
                  {TEAM_ICONS[team.teamId]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-white">{team.label}</p>
                  <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                    isDone ? colors.text : isActive ? "text-blue-400" : isBlocked ? "text-red-400" : "text-[#3F3F46]"
                  }`}>{team.status}</p>
                </div>
                {isActive && <Loader2 size={13} className="text-blue-400 animate-spin shrink-0" />}
                {isDone && <CheckCircle2 size={13} className={`${colors.text} shrink-0`} />}
              </div>

              {/* Progress bar */}
              <div className="h-1 w-full bg-white/[0.05] rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-700 ${isDone ? "bg-emerald-400" : isActive ? "bg-blue-400" : "bg-white/[0.1]"}`}
                  style={{ width: `${team.progress}%` }} />
              </div>

              <p className="text-[9px] text-[#52525B] leading-snug">{team.currentTask}</p>

              {/* Recent activity */}
              {team.activities.length > 0 && (
                <div className="mt-2 space-y-1">
                  {team.activities.slice(-2).map(a => (
                    <p key={a.id} className={`text-[8px] leading-snug ${a.type === "CROSS_FUNCTIONAL" ? "text-indigo-400/70" : a.type === "OUTPUT_READY" ? "text-emerald-400/70" : "text-[#3F3F46]"}`}>
                      {a.type === "CROSS_FUNCTIONAL" && "↔ "}{a.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overall progress */}
      <div className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">Overall Progress</span>
          <span className="text-sm font-semibold text-white">{Math.round(session.overallProgress)}%</span>
        </div>
        <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000"
            style={{ width: `${session.overallProgress}%`, boxShadow: "0 0 10px rgba(16,185,129,0.5)" }} />
        </div>
      </div>
    </div>
  );
}

/* ── Stage 10: Complete ───────────────────────────────────── */

function CompleteStage({
  session, onViewOutput, onDownloadOutput, onDownloadDocument,
}: {
  session: MonkSession;
  onViewOutput: (o: MonkSession["teamOutputs"][0]) => void;
  onDownloadOutput: (o: MonkSession["teamOutputs"][0]) => void;
  onDownloadDocument: (doc: StartupDocument) => void;
}) {
  const doc = session.startupDocument;
  const outputs = session.teamOutputs;

  const OUTPUT_LABELS: Record<string, { icon: React.ReactNode; color: string }> = {
    PRD:                  { icon: <FileText size={16} />,    color: "text-cyan-400" },
    TRD:                  { icon: <Code2 size={16} />,       color: "text-emerald-400" },
    WEBSITE_CODE:         { icon: <Globe size={16} />,       color: "text-emerald-400" },
    DESIGN_SYSTEM:        { icon: <PenTool size={16} />,     color: "text-violet-400" },
    COMPETITOR_ANALYSIS:  { icon: <BarChart3 size={16} />,   color: "text-fuchsia-400" },
    MARKET_GUIDE:         { icon: <TrendingUp size={16} />,  color: "text-amber-400" },
    FINANCIAL_PROJECTIONS:{ icon: <DollarSign size={16} />,  color: "text-yellow-400" },
    LEGAL_CHECKLIST:      { icon: <Scale size={16} />,       color: "text-amber-400" },
    RD_REPORT:            { icon: <Microscope size={16} />,  color: "text-purple-400" },
    GTM_STRATEGY:         { icon: <Megaphone size={16} />,   color: "text-pink-400" },
    USER_PERSONAS:        { icon: <Users size={16} />,       color: "text-blue-400" },
    STARTUP_DOCUMENT:     { icon: <FileText size={16} />,    color: "text-white" },
  };

  function downloadAll() {
    outputs.forEach((o, i) => {
      setTimeout(() => onDownloadOutput(o), i * 300);
    });
    if (doc) setTimeout(() => onDownloadDocument(doc), outputs.length * 300 + 300);
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 p-8 text-center">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Startup is Ready!</h2>
          <p className="text-[#71717A] mb-6">{outputs.length} deliverables across {(session.approvedTeams || session.proposedTeams).length} departments · {outputs.reduce((s, o) => s + (o.wordCount || 0), 0).toLocaleString()} total words generated</p>
          <button onClick={downloadAll}
            className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-6 py-3 text-[13px] font-bold hover:bg-emerald-50 transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.15)] active:scale-95">
            <Download size={15} />Download All Deliverables
          </button>
        </div>
      </div>

      {/* Startup Document Summary */}
      {doc && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Startup Document</h3>
            </div>
            <button onClick={() => onDownloadDocument(doc)}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[9px] font-bold text-[#71717A] hover:text-white uppercase tracking-wider transition-all">
              <Download size={9} />Download
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Features", value: doc.features.length },
              { label: "Competitors", value: doc.competitorAnalysis.length },
              { label: "Milestones", value: doc.roadmap.length },
              { label: "KPIs", value: doc.kpis.length },
            ].map(m => (
              <div key={m.label} className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-3 text-center">
                <p className="text-xl font-bold text-white">{m.value}</p>
                <p className="text-[9px] text-[#52525B] mt-0.5 uppercase tracking-wider">{m.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[11px] text-[#A1A1AA] leading-relaxed">{doc.executiveSummary}</p>
        </div>
      )}

      {/* All outputs grid */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3F3F46] mb-3">All Team Deliverables</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outputs.map((output, i) => {
            const meta = OUTPUT_LABELS[output.outputType] || { icon: <FileText size={16} />, color: "text-white" };
            const colors = TEAM_COLORS[output.teamId];
            return (
              <div key={`${output.teamId}-${i}`} className={`rounded-2xl border ${colors.border} ${colors.bg} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${colors.border} ${colors.bg} ${meta.color}`}>
                      {meta.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-white">{output.title}</p>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mt-0.5 ${colors.text}`}>{output.teamId}</p>
                      <p className="text-[9px] text-[#52525B] mt-1">{output.wordCount?.toLocaleString()} words</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => onViewOutput(output)} title="Preview"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#71717A] hover:text-white transition-all">
                      <Eye size={12} />
                    </button>
                    <button onClick={() => onDownloadOutput(output)} title="Download"
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.02] text-[#71717A] hover:text-white transition-all">
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Failed Stage ─────────────────────────────────────────── */

function FailedStage({ session }: { session: MonkSession }) {
  return (
    <div className="max-w-lg mx-auto text-center py-20 space-y-4">
      <div className="mx-auto h-16 w-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertTriangle size={28} className="text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white">Something went wrong</h2>
      <p className="text-[13px] text-[#71717A] leading-relaxed">{session.failureReason || "An unexpected error occurred during processing."}</p>
      <p className="text-[10px] text-[#3F3F46] font-mono">Session ID: {session.sessionId}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   DOCUMENT VIEWER
   ══════════════════════════════════════════════════════════════ */

function DocumentViewer({ doc }: { doc: StartupDocument }) {
  const [expandedSection, setExpandedSection] = useState<string | null>("executiveSummary");

  const sections = [
    { key: "executiveSummary",   label: "Executive Summary",         content: <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{doc.executiveSummary}</p> },
    ...(doc.problemStatement ? [{ key: "problemStatement", label: "Problem Statement", content: <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{doc.problemStatement}</p> }] : []),
    { key: "solution",           label: "Solution",                  content: <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{doc.solution}</p> },
    { key: "visionMission",      label: "Vision & Mission",          content: <><p className="text-[13px] text-white font-semibold mb-1">Vision</p><p className="text-[13px] text-[#A1A1AA] leading-relaxed mb-3">{doc.vision}</p><p className="text-[13px] text-white font-semibold mb-1">Mission</p><p className="text-[13px] text-[#A1A1AA] leading-relaxed">{doc.mission}</p></> },
    { key: "uvp",                label: "Unique Value Proposition",  content: <p className="text-[13px] text-emerald-300 leading-relaxed font-semibold">{doc.uniqueValueProposition}</p> },
    { key: "features",           label: `Features (${doc.features.length})`, content: (
      <div className="space-y-3">
        {doc.features.map((f, i) => (
          <div key={i} className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-white">{f.name}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-widest ${f.priority === "MUST_HAVE" ? "bg-emerald-500/10 text-emerald-400" : f.priority === "SHOULD_HAVE" ? "bg-amber-500/10 text-amber-400" : "bg-white/5 text-[#71717A]"}`}>{f.priority.replace("_", " ")}</span>
            </div>
            <p className="text-[11px] text-[#71717A] leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    ) },
    { key: "competitors",        label: `Competitors (${doc.competitorAnalysis.length})`, content: (
      <div className="space-y-3">
        {doc.competitorAnalysis.map((c, i) => (
          <div key={i} className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <p className="text-[12px] font-bold text-white mb-1">{c.name}</p>
            <p className="text-[10px] text-emerald-400 mb-0.5">Our edge: {c.differentiator}</p>
            <p className="text-[10px] text-red-400">Weakness: {c.weaknesses.join(", ")}</p>
          </div>
        ))}
      </div>
    ) },
    { key: "roadmap",            label: `Roadmap (${doc.roadmap.length} phases)`, content: (
      <div className="space-y-3">
        {doc.roadmap.map((m, i) => (
          <div key={i} className="p-3 rounded-xl border border-indigo-500/15 bg-indigo-500/[0.03]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-bold text-white">{m.name}</span>
              <span className="text-[9px] text-indigo-400 font-mono">{m.duration}</span>
            </div>
            <ul className="space-y-1">{m.deliverables.map((d, j) => <li key={j} className="text-[10px] text-[#71717A] flex items-start gap-1.5"><span className="text-indigo-400 mt-0.5">▸</span>{d}</li>)}</ul>
          </div>
        ))}
      </div>
    ) },
    { key: "budget",             label: `Budget (${doc.totalBudgetEstimate})`, content: (
      <div className="space-y-2">
        {doc.budget.map((b, i) => (
          <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-white/[0.04] bg-white/[0.01]">
            <div><p className="text-[11px] font-semibold text-white">{b.category}</p><p className="text-[9px] text-[#52525B]">{b.notes}</p></div>
            <span className="text-[11px] font-bold text-amber-300">{b.amount}</span>
          </div>
        ))}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04]">
          <span className="text-[12px] font-bold text-white">Total Estimate</span>
          <span className="text-[12px] font-bold text-amber-300">{doc.totalBudgetEstimate}</span>
        </div>
      </div>
    ) },
    { key: "gtm",                label: "Go-to-Market Strategy",     content: <p className="text-[13px] text-[#A1A1AA] leading-relaxed">{doc.goToMarket}</p> },
    { key: "survival",           label: "Market Survival Guide",     content: <p className="text-[13px] text-emerald-200/70 leading-relaxed">{doc.marketSurvivalGuide}</p> },
    { key: "kpis",               label: `KPIs & Metrics (${doc.kpis.length})`, content: (
      <div className="space-y-2">{doc.kpis.map((k, i) => <div key={i} className="p-3 rounded-xl border border-white/[0.04] bg-white/[0.01]"><p className="text-[11px] font-bold text-white">{k.name}</p><p className="text-[10px] text-emerald-400 mt-0.5">Target: {k.target}</p><p className="text-[9px] text-[#52525B] mt-0.5">{k.measurement}</p></div>)}</div>
    ) },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.01] overflow-hidden divide-y divide-white/[0.04]">
      {sections.map(sec => (
        <div key={sec.key}>
          <button onClick={() => setExpandedSection(expandedSection === sec.key ? null : sec.key)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider">{sec.label}</span>
            <ChevronDown size={13} className={`text-[#52525B] transition-transform ${expandedSection === sec.key ? "rotate-180" : ""}`} />
          </button>
          {expandedSection === sec.key && (
            <div className="px-5 pb-5 pt-2">{sec.content}</div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHARED ATOMS
   ══════════════════════════════════════════════════════════════ */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="text-[12px] text-[#71717A] mt-0.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

function ProcessingCard({ label, detail }: { label: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] p-5 flex items-center gap-4">
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-emerald-500/20 animate-ping opacity-40" />
        <div className="relative h-8 w-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-center">
          <Loader2 size={16} className="text-emerald-400 animate-spin" />
        </div>
      </div>
      <div>
        <p className="text-sm font-bold text-white">{label}</p>
        <p className="text-[11px] text-[#71717A] mt-0.5 leading-relaxed">{detail}</p>
      </div>
    </div>
  );
}

function LoadingStage({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <Loader2 size={24} className="text-emerald-400 animate-spin" />
      <p className="text-[13px] text-[#71717A]">{label}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   UTILITY
   ══════════════════════════════════════════════════════════════ */

function formatDocumentAsMarkdown(doc: StartupDocument): string {
  return `# Startup Document — ${doc.sector}
Generated by MONK AI on ${new Date(doc.generatedAt).toLocaleDateString()}

## Executive Summary
${doc.executiveSummary}

${doc.problemStatement ? `## Problem Statement\n${doc.problemStatement}\n` : ""}

## Solution
${doc.solution}

## Vision
${doc.vision}

## Mission
${doc.mission}

## Unique Value Proposition
${doc.uniqueValueProposition}

## Target Market
${doc.targetMarket}

## Features
${doc.features.map(f => `### ${f.name} [${f.priority}]
${f.description}
User Story: ${f.userStory}
`).join("\n")}

## Competitor Analysis
${doc.competitorAnalysis.map(c => `### ${c.name}
Strengths: ${c.strengths.join(", ")}
Weaknesses: ${c.weaknesses.join(", ")}
Our Edge: ${c.differentiator}
`).join("\n")}

## Tech Stack
${doc.techStack.map(t => `- **${t.layer}**: ${t.technology} — ${t.reason}`).join("\n")}

## Roadmap
${doc.roadmap.map((m, i) => `### Phase ${i + 1}: ${m.name} (${m.duration})
${m.deliverables.map(d => `- ${d}`).join("\n")}
`).join("\n")}

## Budget
${doc.budget.map(b => `- **${b.category}**: ${b.amount} — ${b.notes}`).join("\n")}

**Total Estimate: ${doc.totalBudgetEstimate}**

## Go-to-Market Strategy
${doc.goToMarket}

## Market Survival Guide
${doc.marketSurvivalGuide}

## Risk Assessment
${doc.riskAssessment.map(r => `### ${r.title}
Impact: ${r.impact} | Likelihood: ${r.likelihood}
Mitigation: ${r.mitigation}
`).join("\n")}

## KPIs
${doc.kpis.map(k => `- **${k.name}**: Target ${k.target} | ${k.measurement}`).join("\n")}

## User Personas
${doc.userPersonas.map(p => `### ${p.name} (${p.age}, ${p.role})
Pain Points: ${p.painPoints.join(", ")}
Goals: ${p.goals.join(", ")}
Tech Savviness: ${p.techSavviness}
`).join("\n")}
`;
}
