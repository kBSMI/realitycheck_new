import React, { useState, useMemo } from 'react';
import {
  Anchor, Wrench, Zap, BarChart3, AlertTriangle, BookLock, FileText,
  CheckCircle2, XCircle, ChevronRight, ArrowRight, Clock, Shield,
  Play, RotateCcw, Lock, TestTube2, Eye, TrendingDown, Info,
  CircleDot,
} from 'lucide-react';
import { csWorkflow, csBaseline, csEvents, csF5Events } from '../data/lifecycleScenario';
import { computeContinuityScore } from '../services/memoryMorphologyEngine';
import { detectDrift, getRemediationForFinding } from '../services/driftDetectionService';
import {
  recordBaselineCaptured,
  recordEventIngested,
  recordScoreComputed,
  recordDriftDetected,
  recordXOpsReview,
  getLedgerByWorkflow,
  resetLedgerToSeed,
} from '../services/auditLedgerService';
import { AuditLedgerRecord } from '../types/smi';

// ─── Step definitions ─────────────────────────────────────────────────────────

interface Step {
  id: number;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    label: 'Establish Baseline',
    shortLabel: 'Baseline',
    icon: <Anchor className="h-4 w-4" />,
    description: 'Capture the approved state of Customer Support AI. Model, prompt hash, policy version, and allowed tools are anchored for comparison.',
  },
  {
    id: 2,
    label: 'Introduce Controlled Change',
    shortLabel: 'Change',
    icon: <Wrench className="h-4 w-4" />,
    description: 'Prompt version bumped from 2.0.0 → 2.1.0 (hash mismatch). billing-api tool added to allowed list — not in approved baseline.',
  },
  {
    id: 3,
    label: 'Ingest Events',
    shortLabel: 'Events',
    icon: <Zap className="h-4 w-4" />,
    description: '3 behavioral events ingested: prompt version change (hash mismatch), unauthorized tool call (billing-api), forbidden behavior (unauthorized refund at 88% confidence).',
  },
  {
    id: 4,
    label: 'Score Continuity',
    shortLabel: 'Score',
    icon: <BarChart3 className="h-4 w-4" />,
    description: 'SMI Behavioral Continuity Engine computes deterministic score: -12 (prompt), -10 (tool), -15 (behavior) = 37 deducted. Final score: 63 — Review Required.',
  },
  {
    id: 5,
    label: 'Detect Behavioral Drift',
    shortLabel: 'Drift',
    icon: <AlertTriangle className="h-4 w-4" />,
    description: 'Drift Detection Service runs 7 rule passes. Identifies tool drift, behavior drift, and state drift as root causes.',
  },
  {
    id: 6,
    label: 'Create Audit Record',
    shortLabel: 'Audit',
    icon: <BookLock className="h-4 w-4" />,
    description: 'All events, score computations, and drift findings written to the Audit Ledger. XOps review record appended.',
  },
  {
    id: 7,
    label: 'Generate Pilot Report',
    shortLabel: 'Report',
    icon: <FileText className="h-4 w-4" />,
    description: 'Final summary: risk level, recommended action, F5 simulation results, remediation path, and XOps sign-off requirement.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskColor = (r: string) => {
  if (r === 'Approved') return 'text-green-400 bg-green-500/10 border-green-800/50';
  if (r === 'Watch') return 'text-yellow-400 bg-yellow-500/10 border-yellow-800/50';
  if (r === 'Review Required') return 'text-orange-400 bg-orange-500/10 border-orange-800/50';
  return 'text-red-400 bg-red-500/10 border-red-800/50';
};

const riskBorder = (r: string) => {
  if (r === 'Approved') return 'border-green-800/40';
  if (r === 'Watch') return 'border-yellow-800/40';
  if (r === 'Review Required') return 'border-orange-800/40';
  return 'border-red-800/40';
};

const severityDot = (s: string) => {
  switch (s) {
    case 'critical': return 'bg-red-400';
    case 'high': return 'bg-orange-400';
    case 'medium': return 'bg-yellow-400';
    default: return 'bg-gray-400';
  }
};

const classBadge = (c: 'pass' | 'warn' | 'fail') => {
  switch (c) {
    case 'pass': return 'bg-green-500/10 text-green-400 border-green-800/50';
    case 'warn': return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/50';
    case 'fail': return 'bg-red-500/10 text-red-400 border-red-800/50';
  }
};

const fmtTs = (ts: string) =>
  new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });

// ─── Component ─────────────────────────────────────────────────────────────────

const PilotLifecycleDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);   // 0 = not started
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const [ledgerRecords, setLedgerRecords] = useState<AuditLedgerRecord[]>([]);

  const score = useMemo(
    () => computeContinuityScore(csWorkflow, csBaseline, csEvents),
    []
  );

  const driftFindings = useMemo(
    () => detectDrift(csWorkflow, csBaseline, csEvents, score),
    [score]
  );

  const advanceTo = (step: number) => {
    if (running) return;
    setRunning(true);

    setTimeout(() => {
      // Execute side effects when step completes
      if (step === 1) {
        recordBaselineCaptured(
          'session-lifecycle-001',
          'wf-cs',
          'bl-cs',
          'xops-reviewer-01',
          'enterprise-ai-policy::2.1.0',
          'Baseline anchor captured: cx-support-agent-v2 v2.0.0. billing-api excluded. Guardrails active. Approved for staging.'
        );
      }
      if (step === 3) {
        csEvents.forEach((evt) => {
          recordEventIngested(
            'session-lifecycle-001',
            'wf-cs',
            'bl-cs',
            evt.id,
            score,
            'enterprise-ai-policy::2.1.0',
            evt.description
          );
        });
      }
      if (step === 4) {
        recordScoreComputed('session-lifecycle-001', score, 'enterprise-ai-policy::2.1.0');
      }
      if (step === 5) {
        driftFindings.forEach((f) => {
          recordDriftDetected('session-lifecycle-001', f, score, 'enterprise-ai-policy::2.1.0');
        });
      }
      if (step === 6) {
        recordXOpsReview(
          'session-lifecycle-001',
          'wf-cs',
          'bl-cs',
          'xops-reviewer-01',
          'REVIEW_REQUIRED',
          score,
          'enterprise-ai-policy::2.1.0',
          'Unauthorized refund behavior confirmed. Prompt change + billing-api tool addition combined to produce systematic policy breach. Do not promote to production without remediation.'
        );
        setLedgerRecords(getLedgerByWorkflow('wf-cs'));
      }
      if (step === 6 || step === 7) {
        setLedgerRecords(getLedgerByWorkflow('wf-cs'));
      }

      setCompletedSteps((prev) => new Set([...prev, step]));
      setActiveStep(step);
      setRunning(false);
    }, 700);
  };

  const reset = () => {
    resetLedgerToSeed();
    setActiveStep(0);
    setCompletedSteps(new Set());
    setLedgerRecords([]);
  };

  const isComplete = (s: number) => completedSteps.has(s);
  const canAdvance = (s: number) => s === activeStep + 1 && !running;
  const isActive = (s: number) => s === activeStep;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Lifecycle Demo: AI Guardrail Regression</h2>
          <p className="text-gray-400 text-sm mt-1 max-w-2xl">
            Walk through the complete SMI assurance lifecycle step by step. Each action below executes the
            real scoring engine, writes to the Audit Ledger, and produces live output you can inspect.
          </p>
        </div>
        {activeStep > 0 && (
          <button
            onClick={reset}
            className="flex items-center space-x-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Scenario context card */}
      <div className="bg-gray-900/80 border border-cyan-800/30 rounded-xl p-5">
        <div className="flex items-start space-x-3">
          <div className="bg-cyan-900/40 border border-cyan-800/50 rounded-lg p-2 shrink-0">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Scenario: Customer Support AI</p>
            <p className="text-gray-400 text-xs mt-1 leading-relaxed max-w-3xl">
              The agent baseline permits <span className="text-gray-200 font-mono text-[11px]">case-lookup</span>,{' '}
              <span className="text-gray-200 font-mono text-[11px]">account-status</span>, and{' '}
              <span className="text-gray-200 font-mono text-[11px]">escalate-tier2</span>.
              A staging update bumps the prompt version and adds{' '}
              <span className="text-orange-300 font-mono text-[11px]">billing-api</span> to the allowed tools.
              No prompt injection occurs — but SMI detects that the agent now bypasses the Tier-2 escalation
              gate and issues unauthorized refund recommendations directly.
            </p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              {['prompt-drift', 'tool-scope-expansion', 'unauthorized-refund', 'guardrail-violation'].map((t) => (
                <span key={t} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step stepper */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h3 className="text-white font-semibold text-sm">Demo Flow</h3>
          {activeStep === 0 && (
            <p className="text-gray-500 text-xs">Click Step 1 to begin.</p>
          )}
          {activeStep === 7 && (
            <span className="flex items-center space-x-1.5 text-green-400 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>All steps complete</span>
            </span>
          )}
        </div>

        {/* Step buttons row */}
        <div className="flex items-start gap-1.5 flex-wrap">
          {STEPS.map((step, i) => {
            const done = isComplete(step.id);
            const active = isActive(step.id);
            const canRun = canAdvance(step.id);
            const locked = !done && !canRun && !active;

            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => canRun ? advanceTo(step.id) : (done ? setActiveStep(step.id) : undefined)}
                  disabled={locked || running}
                  className={`flex flex-col items-center px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 min-w-[80px] ${
                    done && active
                      ? 'bg-cyan-800/50 border-cyan-700 text-white'
                      : done
                      ? 'bg-green-900/20 border-green-800/50 text-green-300 cursor-pointer hover:bg-green-900/30'
                      : canRun
                      ? 'bg-gray-800 border-gray-600 text-white cursor-pointer hover:bg-gray-700 ring-1 ring-cyan-700/60'
                      : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <div className={`mb-1 ${done ? 'text-green-400' : canRun ? 'text-cyan-400' : active ? 'text-cyan-400' : 'text-gray-600'}`}>
                    {done && !active ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                  </div>
                  <span>{step.shortLabel}</span>
                  {canRun && (
                    <span className="text-[9px] text-cyan-400 mt-0.5 flex items-center space-x-0.5">
                      <Play className="h-2.5 w-2.5" />
                      <span>Run</span>
                    </span>
                  )}
                </button>
                {i < STEPS.length - 1 && (
                  <ArrowRight className={`h-3.5 w-3.5 mt-3 shrink-0 ${done ? 'text-green-700' : 'text-gray-800'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step detail panel */}
      {activeStep > 0 && (
        <div className="space-y-4">
          {/* Step 1: Baseline */}
          {isComplete(1) && isActive(1) && (
            <StepPanel step={1} label="Baseline Established" icon={<Anchor className="h-4 w-4 text-cyan-400" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataCard title="Workflow">
                  <Row k="ID" v={csWorkflow.id} mono />
                  <Row k="Name" v={csWorkflow.name} />
                  <Row k="Owner" v={csWorkflow.owner} />
                  <Row k="Environment" v={csWorkflow.environment} />
                </DataCard>
                <DataCard title="Baseline Anchor">
                  <Row k="ID" v={csBaseline.id} mono />
                  <Row k="Captured by" v={csBaseline.capturedBy} />
                  <Row k="Risk Level" v={csBaseline.approvedRiskLevel} highlight="green" />
                  <Row k="Model" v={csBaseline.modelConfig.version} mono />
                  <Row k="Prompt" v={`${csBaseline.promptConfig.version} (hash locked)`} mono />
                  <Row k="Policy" v={csBaseline.policyConfig.version} mono />
                </DataCard>
              </div>
              <InfoBox>
                Allowed tools at baseline:{' '}
                {csBaseline.policyConfig.allowedTools.map((t) => (
                  <code key={t} className="text-cyan-300 text-[10px] mx-0.5">{t}</code>
                ))}.
                <span className="text-orange-300"> billing-api is NOT in scope</span> — any refund action requires Tier-2 escalation.
              </InfoBox>
            </StepPanel>
          )}

          {/* Step 2: Controlled change */}
          {isComplete(2) && isActive(2) && (
            <StepPanel step={2} label="Controlled Change Introduced" icon={<Wrench className="h-4 w-4 text-orange-400" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataCard title="Prompt Change">
                  <Row k="Previous version" v="2.0.0" mono />
                  <Row k="New version" v="2.1.0" mono />
                  <Row k="Hash match" v="No — content changed" highlight="red" />
                  <Row k="SMI deduction" v="-12 pts (hash mismatch)" highlight="red" />
                </DataCard>
                <DataCard title="Tool Scope Change">
                  <Row k="Tool added" v="billing-api" mono />
                  <Row k="Baseline approval" v="Not approved" highlight="red" />
                  <Row k="Capability unlocked" v="Direct refund issuance" highlight="red" />
                  <Row k="Escalation gate" v="BYPASSED" highlight="red" />
                </DataCard>
              </div>
              <InfoBox variant="warn">
                No prompt injection, no guardrail bypass — this is a tool scope expansion. SMI detects it because{' '}
                <span className="text-orange-300 font-mono text-[10px]">billing-api</span> was not in the approved baseline
                tool list, making every invocation an unauthorized tool call event.
              </InfoBox>
            </StepPanel>
          )}

          {/* Step 3: Events */}
          {isComplete(3) && isActive(3) && (
            <StepPanel step={3} label="Events Ingested" icon={<Zap className="h-4 w-4 text-yellow-400" />}>
              <div className="space-y-2">
                {csEvents.map((evt) => (
                  <div key={evt.id} className="flex items-start space-x-3 bg-gray-800/40 border border-gray-700/60 rounded-lg px-4 py-3">
                    <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${severityDot(evt.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-white text-xs font-semibold font-mono">{evt.eventType}</span>
                        <span className="text-gray-500 text-[10px] flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{fmtTs(evt.timestamp)}</span>
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-4 mt-2 text-xs">
                <span className="text-gray-500">{csEvents.length} total events</span>
                <span className="text-red-400">{csEvents.filter(e => e.severity === 'critical' || e.severity === 'high').length} high/critical</span>
                <span className="text-gray-500">{new Set(csEvents.map(e => e.eventType)).size} distinct event types</span>
              </div>
            </StepPanel>
          )}

          {/* Step 4: Score */}
          {isComplete(4) && isActive(4) && (
            <StepPanel step={4} label="Continuity Score Computed" icon={<BarChart3 className="h-4 w-4 text-blue-400" />}>
              {/* Score hero */}
              <div className={`flex items-center justify-between bg-gray-800/50 border ${riskBorder(score.riskLevel)} rounded-xl p-5`}>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Continuity Score</p>
                  <p className={`text-5xl font-bold font-mono ${score.continuityScore >= 90 ? 'text-green-400' : score.continuityScore >= 75 ? 'text-yellow-400' : score.continuityScore >= 60 ? 'text-orange-400' : 'text-red-400'}`}>
                    {score.continuityScore}
                  </p>
                  <p className="text-gray-500 text-xs mt-1">{score.totalDeducted} pts deducted from baseline 100</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-xs px-3 py-1 rounded-full border font-semibold ${riskColor(score.riskLevel)}`}>
                    {score.riskLevel}
                  </span>
                  <p className="text-gray-400 text-xs mt-2 max-w-xs leading-relaxed">{score.recommendedAction}</p>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Drift Score', value: score.driftScore, desc: 'Config deviation' },
                  { label: 'Policy Alignment', value: score.policyAlignment, desc: 'vs baseline policy' },
                  { label: 'Tool Behavior Variance', value: score.toolBehaviorVariance, desc: 'tool list delta' },
                  { label: 'State Degradation', value: score.stateDegradation, desc: 'state drift accum.' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-800/40 border border-gray-700/60 rounded-lg p-3">
                    <p className={`text-xl font-bold font-mono ${s.value <= 30 ? 'text-green-400' : s.value <= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {s.value}
                    </p>
                    <p className="text-gray-300 text-xs font-medium mt-0.5">{s.label}</p>
                    <p className="text-gray-500 text-[10px]">{s.desc}</p>
                  </div>
                ))}
              </div>

              {/* Deductions breakdown */}
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Deduction Breakdown</p>
                <div className="space-y-1.5">
                  {score.deductions.map((d, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800/30 rounded-lg px-3 py-2">
                      <div className="flex items-center space-x-2">
                        <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                        <span className="text-gray-300 text-xs font-mono">{d.reason}</span>
                      </div>
                      <span className="text-red-400 font-mono text-sm font-bold shrink-0 ml-3">-{d.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            </StepPanel>
          )}

          {/* Step 5: Drift */}
          {isComplete(5) && isActive(5) && (
            <StepPanel step={5} label="Behavioral Drift Detected" icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}>
              {driftFindings.length === 0 ? (
                <p className="text-gray-500 text-sm">No drift findings for this workflow.</p>
              ) : (
                <div className="space-y-3">
                  {driftFindings.map((f) => {
                    const remedy = getRemediationForFinding(f);
                    return (
                      <div key={f.id} className={`border rounded-xl p-4 ${f.severity === 'critical' || f.severity === 'high' ? 'border-red-800/40 bg-red-900/10' : f.severity === 'medium' ? 'border-orange-800/40 bg-orange-900/10' : 'border-gray-700 bg-gray-800/20'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot(f.severity)}`} />
                            <span className="text-white text-sm font-semibold">{f.title}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <span className="text-gray-500 text-[10px] font-mono">{f.category}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                              f.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-800/50' :
                              f.severity === 'high' ? 'text-orange-400 bg-orange-500/10 border-orange-800/50' :
                              'text-yellow-400 bg-yellow-500/10 border-yellow-800/50'
                            }`}>
                              {f.severity}
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">{f.description}</p>
                        <div className="flex items-start space-x-2 mt-2 pt-2 border-t border-gray-700/50">
                          <TrendingDown className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-gray-500 text-[10px]">Remediation ({remedy.effort} effort): </span>
                            <span className="text-cyan-300 text-xs">{remedy.action}</span>
                            <span className="ml-2 text-green-400 text-[10px]">+{remedy.improvement} pts estimated</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex items-center space-x-4 text-xs">
                <span className="text-gray-500">{driftFindings.length} findings total</span>
                <span className="text-red-400">{driftFindings.filter(f => f.requiresRemediation).length} require remediation</span>
              </div>
            </StepPanel>
          )}

          {/* Step 6: Audit */}
          {isComplete(6) && isActive(6) && (
            <StepPanel step={6} label="Audit Ledger Records Created" icon={<BookLock className="h-4 w-4 text-gray-300" />}>
              {ledgerRecords.length === 0 ? (
                <p className="text-gray-500 text-sm">No ledger records found for this workflow.</p>
              ) : (
                <div className="space-y-2">
                  {ledgerRecords.map((rec) => (
                    <div key={rec.id} className="bg-gray-800/40 border border-gray-700/60 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-200 text-xs font-mono font-semibold">{rec.action}</span>
                          <span className="text-gray-600 text-[10px] font-mono">{rec.id}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${riskColor(rec.riskLevelSnapshot)}`}>
                            {rec.riskLevelSnapshot}
                          </span>
                          <span className="text-gray-400 font-mono text-xs">{rec.continuityScoreSnapshot}</span>
                          <span className="text-gray-600 text-[10px]">{fmtTs(rec.timestamp)}</span>
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs leading-relaxed">{rec.detail}</p>
                      <p className="text-cyan-900 text-[10px] font-mono mt-1">{rec.policyRef}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-xs text-gray-500">{ledgerRecords.length} records written to Audit Ledger for wf-cs</div>
            </StepPanel>
          )}

          {/* Step 7: Report */}
          {isComplete(7) && isActive(7) && (
            <StepPanel step={7} label="Pilot Report Generated" icon={<FileText className="h-4 w-4 text-cyan-400" />}>
              {/* Summary verdict */}
              <div className={`border ${riskBorder(score.riskLevel)} rounded-xl p-5 bg-gray-800/30`}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Final Assessment — Customer Support AI</p>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`text-4xl font-bold font-mono ${score.continuityScore >= 90 ? 'text-green-400' : score.continuityScore >= 75 ? 'text-yellow-400' : score.continuityScore >= 60 ? 'text-orange-400' : 'text-red-400'}`}>
                        {score.continuityScore}
                      </span>
                      <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${riskColor(score.riskLevel)}`}>
                        {score.riskLevel}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-lg">{score.recommendedAction}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 text-xs">Session</p>
                    <p className="text-gray-300 text-xs font-mono">session-lifecycle-001</p>
                    <p className="text-gray-500 text-xs mt-1.5">Phase</p>
                    <p className="text-gray-300 text-xs">Pilot Phase 4</p>
                  </div>
                </div>
              </div>

              {/* F5 simulation summary */}
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">F5 ADSP Simulation Results</p>
                <div className="space-y-2">
                  {csF5Events.map((evt) => (
                    <div key={evt.id} className="flex items-start justify-between bg-gray-800/30 border border-gray-700/50 rounded-lg px-4 py-3">
                      <div className="flex items-start space-x-2">
                        {evt.source === 'guardrail' ? <Shield className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" /> :
                         evt.source === 'red-team' ? <TestTube2 className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" /> :
                         <Eye className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />}
                        <div>
                          <p className="text-white text-xs font-medium">{evt.eventName}</p>
                          <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{evt.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${classBadge(evt.classification)}`}>
                          {evt.classification.toUpperCase()}
                        </span>
                        <span className={`text-sm font-bold font-mono ${evt.continuityDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {evt.continuityDelta > 0 ? '+' : ''}{evt.continuityDelta}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/30 border border-red-800/30 rounded-xl p-4">
                  <p className="text-white text-xs font-semibold mb-2">Key Findings</p>
                  <ul className="space-y-2">
                    {[
                      `Score dropped to ${score.continuityScore} (${score.riskLevel}) from 3 events: prompt change, unauthorized tool call, and forbidden behavior.`,
                      `${driftFindings.length} drift finding(s): tool scope expansion and behavior drift without prompt injection.`,
                      'F5 red team confirmed: billing-api bypass requires no injection — tool boundary gap is sufficient exploit path.',
                      'SMI detected the policy violation before it escalated — guardrail was active but drift existed at the tool-scope level.',
                    ].map((f, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                        <span className="text-gray-300 text-xs leading-relaxed">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-gray-800/30 border border-green-800/30 rounded-xl p-4">
                  <p className="text-white text-xs font-semibold mb-2">Remediation Path</p>
                  <ul className="space-y-2">
                    {[
                      { action: 'Revert prompt to approved v2.0.0 or re-capture baseline after content review.', pts: 12 },
                      { action: 'Remove billing-api from allowed tools until Tier-2 escalation gate is enforced.', pts: 20 },
                      { action: 'Re-run red team billing-api boundary test to confirm exploit path closed.', pts: 0 },
                      { action: 'XOps sign-off required before staging promotion. Do not deploy to production.', pts: 0 },
                    ].map((r, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                        <span className="text-gray-300 text-xs leading-relaxed">
                          {r.action}
                          {r.pts > 0 && <span className="ml-1 text-green-400 font-mono text-[10px]">+{r.pts} pts</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* SMI value demonstrated */}
              <div className="bg-gray-800/30 border border-cyan-800/20 rounded-xl p-4">
                <p className="text-white text-xs font-semibold mb-2">SMI Value Demonstrated</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    'Detected behavioral drift with no prompt injection — purely through tool scope change vs baseline.',
                    'Deterministic scoring isolated the root cause: tool variance + forbidden behavior, not model version.',
                    'Audit ledger provided complete evidence chain with policy references at every step.',
                    'F5 red team simulation confirmed exploit path independently, aligning with SMI drift score.',
                  ].map((v, i) => (
                    <div key={i} className="flex items-start space-x-2">
                      <CircleDot className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="text-gray-300 text-xs leading-relaxed">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

            </StepPanel>
          )}

          {/* If user revisits earlier steps, show a summary nav */}
          {activeStep > 0 && activeStep < 7 && (
            <div className="flex items-center justify-end">
              {activeStep < 7 && canAdvance(activeStep + 1) && (
                <button
                  onClick={() => advanceTo(activeStep + 1)}
                  disabled={running}
                  className="flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
                >
                  <span>Next: {STEPS[activeStep]?.shortLabel ?? 'Step'}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Idle prompt */}
      {activeStep === 0 && (
        <div className="border border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center justify-center space-y-3 text-center">
          <Lock className="h-8 w-8 text-gray-700" />
          <p className="text-gray-500 text-sm">Click <span className="text-white font-semibold">Step 1 — Establish Baseline</span> above to begin the lifecycle demo.</p>
          <p className="text-gray-600 text-xs max-w-md">
            Each step executes the live SMI scoring engine and writes real records to the in-session Audit Ledger.
            You can click completed steps to revisit their output.
          </p>
          <button
            onClick={() => advanceTo(1)}
            className="mt-2 flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            <Play className="h-4 w-4" />
            <span>Begin Lifecycle Demo</span>
          </button>
        </div>
      )}

    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StepPanel: React.FC<{
  step: number;
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ step, label, icon, children }) => (
  <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
    <div className="px-5 py-3.5 border-b border-gray-800 bg-gray-800/30 flex items-center space-x-2">
      <span className="text-gray-500 text-xs font-mono">Step {step}</span>
      <span className="text-gray-700">·</span>
      {icon}
      <span className="text-white font-semibold text-sm">{label}</span>
    </div>
    <div className="p-5 space-y-4">
      {children}
    </div>
  </div>
);

const DataCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
    <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-2">{title}</p>
    <div className="space-y-1.5">{children}</div>
  </div>
);

const Row: React.FC<{ k: string; v: string; mono?: boolean; highlight?: 'green' | 'red' | 'orange' }> = ({
  k, v, mono, highlight,
}) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-gray-500 text-xs shrink-0">{k}</span>
    <span className={`text-xs text-right ${mono ? 'font-mono' : ''} ${
      highlight === 'green' ? 'text-green-400' :
      highlight === 'red' ? 'text-red-400' :
      highlight === 'orange' ? 'text-orange-400' :
      'text-gray-200'
    }`}>{v}</span>
  </div>
);

const InfoBox: React.FC<{ children: React.ReactNode; variant?: 'info' | 'warn' }> = ({
  children, variant = 'info',
}) => (
  <div className={`flex items-start space-x-2 rounded-lg p-3 text-xs leading-relaxed ${
    variant === 'warn'
      ? 'bg-orange-900/20 border border-orange-800/40 text-orange-200'
      : 'bg-blue-900/20 border border-blue-800/40 text-blue-200'
  }`}>
    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
    <span>{children}</span>
  </div>
);

export default PilotLifecycleDemo;
