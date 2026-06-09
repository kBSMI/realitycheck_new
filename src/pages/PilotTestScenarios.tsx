import React, { useState, useMemo } from 'react';
import {
  FlaskConical, ChevronRight, ArrowRight, RotateCcw, Play, Lock,
  Anchor, Zap, BarChart3, AlertTriangle, BookLock, FileText,
  CheckCircle2, XCircle, Clock, Shield, TestTube2, Eye,
  TrendingDown, Info, CircleDot, Layers, Brain, GitBranch,
  AlertCircle, Activity,
} from 'lucide-react';
import {
  pilotTestScenarios,
  PilotTestScenario,
} from '../data/pilotTestScenarios';
import { computeContinuityScore } from '../services/memoryMorphologyEngine';
import { detectDrift, getRemediationForFinding } from '../services/driftDetectionService';
import {
  recordBaselineCaptured,
  recordEventIngested,
  recordScoreComputed,
  recordDriftDetected,
  recordXOpsReview,
  getLedgerByWorkflow,
} from '../services/auditLedgerService';
import { AuditLedgerRecord } from '../types/smi';

// ─── Step Definitions ──────────────────────────────────────────────────────────

interface Step { id: number; label: string; shortLabel: string; icon: React.ReactNode }

const STEPS: Step[] = [
  { id: 1, label: 'Establish Baseline', shortLabel: 'Baseline', icon: <Anchor className="h-4 w-4" /> },
  { id: 2, label: 'Introduce Change', shortLabel: 'Change', icon: <GitBranch className="h-4 w-4" /> },
  { id: 3, label: 'Ingest Events', shortLabel: 'Events', icon: <Zap className="h-4 w-4" /> },
  { id: 4, label: 'Score Continuity', shortLabel: 'Score', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 5, label: 'Detect Drift', shortLabel: 'Drift', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 6, label: 'Create Audit Record', shortLabel: 'Audit', icon: <BookLock className="h-4 w-4" /> },
  { id: 7, label: 'Pilot Report', shortLabel: 'Report', icon: <FileText className="h-4 w-4" /> },
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

const scoreColor = (s: number) =>
  s >= 90 ? 'text-green-400' : s >= 75 ? 'text-yellow-400' : s >= 60 ? 'text-orange-400' : 'text-red-400';

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

const scenarioIcon = (n: number) => {
  switch (n) {
    case 1: return <Brain className="h-5 w-5 text-cyan-400" />;
    case 2: return <Layers className="h-5 w-5 text-blue-400" />;
    case 3: return <Shield className="h-5 w-5 text-green-400" />;
    case 4: return <Activity className="h-5 w-5 text-orange-400" />;
    case 5: return <AlertCircle className="h-5 w-5 text-red-400" />;
    default: return <FlaskConical className="h-5 w-5 text-gray-400" />;
  }
};

// ─── Scenario Selector ────────────────────────────────────────────────────────

const ScenarioCard: React.FC<{
  scenario: PilotTestScenario;
  selected: boolean;
  onSelect: () => void;
}> = ({ scenario, selected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
      selected
        ? 'bg-cyan-900/30 border-cyan-700 ring-1 ring-cyan-700/50'
        : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 hover:bg-gray-900/80'
    }`}
  >
    <div className="flex items-start space-x-3">
      <div className={`rounded-lg p-2 shrink-0 ${selected ? 'bg-cyan-900/60' : 'bg-gray-800/60'}`}>
        {scenarioIcon(scenario.number)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-white text-sm font-semibold leading-tight">
            <span className="text-gray-500 font-normal">#{scenario.number} </span>
            {scenario.title}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${riskColor(scenario.expectedRiskLevel)}`}>
            {scenario.expectedRiskLevel}
          </span>
        </div>
        <p className="text-gray-400 text-xs mt-1 leading-relaxed line-clamp-2">{scenario.subtitle}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {scenario.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-500 px-1.5 py-0.5 rounded-full font-mono">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  </button>
);

// ─── Demo Runner ──────────────────────────────────────────────────────────────

const ScenarioRunner: React.FC<{ scenario: PilotTestScenario }> = ({ scenario }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [running, setRunning] = useState(false);
  const [ledgerRecords, setLedgerRecords] = useState<AuditLedgerRecord[]>([]);

  const score = useMemo(
    () => computeContinuityScore(scenario.workflow, scenario.baseline, scenario.events),
    [scenario]
  );

  const driftFindings = useMemo(
    () => detectDrift(scenario.workflow, scenario.baseline, scenario.events, score),
    [scenario, score]
  );

  const sessionId = `session-${scenario.id}-001`;
  const policyRef = `enterprise-ai-policy::${scenario.baseline.policyConfig.version}`;

  const advanceTo = (step: number) => {
    if (running) return;
    setRunning(true);
    setTimeout(() => {
      if (step === 1) {
        recordBaselineCaptured(
          sessionId,
          scenario.workflow.id,
          scenario.baseline.id,
          scenario.baseline.capturedBy,
          policyRef,
          `Baseline anchor captured: ${scenario.baseline.promptConfig.promptId} v${scenario.baseline.promptConfig.version}. Policy v${scenario.baseline.policyConfig.version}. Approved risk level: ${scenario.baseline.approvedRiskLevel}.`
        );
      }
      if (step === 3) {
        scenario.events.forEach((evt) => {
          recordEventIngested(sessionId, scenario.workflow.id, scenario.baseline.id, evt.id, score, policyRef, evt.description);
        });
      }
      if (step === 4) {
        recordScoreComputed(sessionId, score, policyRef);
      }
      if (step === 5) {
        driftFindings.forEach((f) => {
          recordDriftDetected(sessionId, f, score, policyRef);
        });
      }
      if (step === 6) {
        recordXOpsReview(
          sessionId,
          scenario.workflow.id,
          scenario.baseline.id,
          'xops-reviewer-pilot',
          score.riskLevel === 'Quarantine' ? 'QUARANTINE' :
          score.riskLevel === 'Review Required' ? 'REVIEW_REQUIRED' :
          score.riskLevel === 'Watch' ? 'WATCH' : 'APPROVED',
          score,
          policyRef,
          `Scenario "${scenario.title}" completed. Score: ${score.continuityScore}. Risk: ${score.riskLevel}. ${driftFindings.length} drift finding(s) detected.`
        );
        setLedgerRecords(getLedgerByWorkflow(scenario.workflow.id));
      }
      if (step === 7) {
        setLedgerRecords(getLedgerByWorkflow(scenario.workflow.id));
      }

      setCompletedSteps((prev) => new Set([...prev, step]));
      setActiveStep(step);
      setRunning(false);
    }, 600);
  };

  const reset = () => {
    setActiveStep(0);
    setCompletedSteps(new Set());
    setLedgerRecords([]);
  };

  const isComplete = (s: number) => completedSteps.has(s);
  const canAdvance = (s: number) => s === activeStep + 1 && !running;
  const isActive = (s: number) => s === activeStep;

  return (
    <div className="space-y-5">
      {/* Scenario header */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start space-x-3">
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2 shrink-0">
              {scenarioIcon(scenario.number)}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <span className="text-gray-500 text-xs">Scenario {scenario.number}</span>
                <span className="text-gray-700 text-xs">·</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riskColor(scenario.expectedRiskLevel)}`}>
                  Expected: {scenario.expectedRiskLevel}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg mt-0.5">{scenario.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed mt-1 max-w-2xl">{scenario.subtitle}</p>
            </div>
          </div>
          {activeStep > 0 && (
            <button
              onClick={reset}
              className="flex items-center space-x-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
        <div className="mt-3 bg-cyan-950/40 border border-cyan-800/30 rounded-lg px-4 py-2.5 flex items-start space-x-2">
          <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
          <p className="text-cyan-200 text-xs leading-relaxed"><span className="font-semibold">SMI Signal: </span>{scenario.smiSignal}</p>
        </div>
      </div>

      {/* Step stepper */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h4 className="text-white font-semibold text-sm">Demo Flow</h4>
          {activeStep === 0 && <p className="text-gray-500 text-xs">Click Step 1 to begin.</p>}
          {activeStep === 7 && (
            <span className="flex items-center space-x-1.5 text-green-400 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>All steps complete</span>
            </span>
          )}
        </div>
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
                  className={`flex flex-col items-center px-3 py-2.5 rounded-xl border text-xs font-medium transition-all duration-200 min-w-[76px] ${
                    done && active ? 'bg-cyan-800/50 border-cyan-700 text-white'
                    : done ? 'bg-green-900/20 border-green-800/50 text-green-300 cursor-pointer hover:bg-green-900/30'
                    : canRun ? 'bg-gray-800 border-gray-600 text-white cursor-pointer hover:bg-gray-700 ring-1 ring-cyan-700/60'
                    : 'bg-gray-900/50 border-gray-800 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  <div className={`mb-1 ${done ? 'text-green-400' : canRun ? 'text-cyan-400' : active ? 'text-cyan-400' : 'text-gray-600'}`}>
                    {done && !active ? <CheckCircle2 className="h-4 w-4" /> : step.icon}
                  </div>
                  <span>{step.shortLabel}</span>
                  {canRun && (
                    <span className="text-[9px] text-cyan-400 mt-0.5 flex items-center space-x-0.5">
                      <Play className="h-2.5 w-2.5" /><span>Run</span>
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

      {/* Idle */}
      {activeStep === 0 && (
        <div className="border border-dashed border-gray-700 rounded-xl p-8 flex flex-col items-center justify-center space-y-3 text-center">
          <Lock className="h-7 w-7 text-gray-700" />
          <p className="text-gray-500 text-sm">Click <span className="text-white font-semibold">Step 1 — Establish Baseline</span> to begin.</p>
          <button
            onClick={() => advanceTo(1)}
            className="mt-1 flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Play className="h-4 w-4" />
            <span>Begin Scenario {scenario.number}</span>
          </button>
        </div>
      )}

      {/* Step detail panels */}
      {activeStep > 0 && (
        <div className="space-y-4">

          {/* Step 1: Baseline */}
          {isComplete(1) && isActive(1) && (
            <StepPanel step={1} label="Baseline Established" icon={<Anchor className="h-4 w-4 text-cyan-400" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataCard title="Workflow">
                  <Row k="ID" v={scenario.workflow.id} mono />
                  <Row k="Name" v={scenario.workflow.name} />
                  <Row k="Owner" v={scenario.workflow.owner} />
                  <Row k="Environment" v={scenario.workflow.environment} />
                  <Row k="Model" v={`${scenario.workflow.modelConfig.modelId} v${scenario.baseline.modelConfig.version}`} mono />
                </DataCard>
                <DataCard title="Baseline Anchor">
                  <Row k="ID" v={scenario.baseline.id} mono />
                  <Row k="Captured by" v={scenario.baseline.capturedBy} />
                  <Row k="Risk Level" v={scenario.baseline.approvedRiskLevel} highlight="green" />
                  <Row k="Prompt version" v={`v${scenario.baseline.promptConfig.version} (hash locked)`} mono />
                  <Row k="Policy version" v={scenario.baseline.policyConfig.version} mono />
                  <Row k="Guardrails" v={scenario.baseline.policyConfig.guardrailsEnabled ? 'Enabled' : 'Disabled'} highlight={scenario.baseline.policyConfig.guardrailsEnabled ? 'green' : 'red'} />
                </DataCard>
              </div>
              <DataCard title="Approved Tool Scope at Baseline">
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {scenario.baseline.policyConfig.allowedTools.map((t) => (
                    <span key={t} className="text-[11px] bg-green-900/20 border border-green-800/40 text-green-300 px-2 py-0.5 rounded-full font-mono">{t}</span>
                  ))}
                </div>
              </DataCard>
              {scenario.baseline.notes && (
                <InfoBox>{scenario.baseline.notes}</InfoBox>
              )}
            </StepPanel>
          )}

          {/* Step 2: Controlled change */}
          {isComplete(2) && isActive(2) && (
            <StepPanel step={2} label="Controlled Change Introduced" icon={<GitBranch className="h-4 w-4 text-orange-400" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DataCard title="Prompt Configuration — Current vs Baseline">
                  <Row k="Baseline version" v={`v${scenario.baseline.promptConfig.version}`} mono />
                  <Row k="Current version" v={`v${scenario.workflow.promptConfig.version}`} mono />
                  <Row k="Hash match" v={scenario.workflow.promptConfig.hash === scenario.baseline.promptConfig.hash ? 'Match' : 'MISMATCH'} highlight={scenario.workflow.promptConfig.hash === scenario.baseline.promptConfig.hash ? 'green' : 'red'} />
                </DataCard>
                <DataCard title="Policy Configuration — Current vs Baseline">
                  <Row k="Baseline policy" v={`v${scenario.baseline.policyConfig.version}`} mono />
                  <Row k="Current policy" v={`v${scenario.workflow.policyConfig.version}`} mono />
                  <Row k="Guardrails" v={scenario.workflow.policyConfig.guardrailsEnabled ? 'Enabled' : 'DISABLED'} highlight={scenario.workflow.policyConfig.guardrailsEnabled ? 'green' : 'red'} />
                </DataCard>
              </div>
              {(() => {
                const baselineTools = new Set(scenario.baseline.policyConfig.allowedTools);
                const currentTools = scenario.workflow.policyConfig.allowedTools;
                const added = currentTools.filter((t) => !baselineTools.has(t));
                const baselineModel = scenario.baseline.modelConfig.version;
                const currentModel = scenario.workflow.modelConfig.version;
                const modelChanged = baselineModel !== currentModel;
                return (
                  <div className="space-y-3">
                    {(added.length > 0 || modelChanged) && (
                      <DataCard title="Changes Detected">
                        {modelChanged && <Row k="Model version change" v={`${baselineModel} → ${currentModel}`} mono highlight="red" />}
                        {added.length > 0 && (
                          <>
                            <Row k="Tools added (not in baseline)" v={added.join(', ')} mono highlight="orange" />
                            <Row k="Capability delta" v={`+${added.length} tools outside approved scope`} highlight="red" />
                          </>
                        )}
                      </DataCard>
                    )}
                    <InfoBox variant="warn">
                      These changes were introduced without re-baselining. SMI will measure all subsequent behavior against the original approved anchor, surfacing any deviation as behavioral drift.
                    </InfoBox>
                  </div>
                );
              })()}
            </StepPanel>
          )}

          {/* Step 3: Events */}
          {isComplete(3) && isActive(3) && (
            <StepPanel step={3} label="Events Ingested" icon={<Zap className="h-4 w-4 text-yellow-400" />}>
              <div className="space-y-2">
                {scenario.events.map((evt) => (
                  <div key={evt.id} className="flex items-start space-x-3 bg-gray-800/40 border border-gray-700/60 rounded-lg px-4 py-3">
                    <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${severityDot(evt.severity)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-white text-xs font-semibold font-mono">{evt.eventType}</span>
                        <span className="text-gray-500 text-[10px] flex items-center space-x-1">
                          <Clock className="h-2.5 w-2.5" /><span>{fmtTs(evt.timestamp)}</span>
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-4 mt-1 text-xs">
                <span className="text-gray-500">{scenario.events.length} total events</span>
                <span className="text-red-400">{scenario.events.filter(e => e.severity === 'critical' || e.severity === 'high').length} high/critical</span>
                <span className="text-gray-500">{new Set(scenario.events.map(e => e.eventType)).size} distinct types</span>
              </div>
            </StepPanel>
          )}

          {/* Step 4: Score */}
          {isComplete(4) && isActive(4) && (
            <StepPanel step={4} label="Continuity Score Computed" icon={<BarChart3 className="h-4 w-4 text-blue-400" />}>
              <div className={`flex items-center justify-between bg-gray-800/50 border ${riskBorder(score.riskLevel)} rounded-xl p-5`}>
                <div>
                  <p className="text-gray-400 text-xs mb-1">Continuity Score</p>
                  <p className={`text-5xl font-bold font-mono ${scoreColor(score.continuityScore)}`}>{score.continuityScore}</p>
                  <p className="text-gray-500 text-xs mt-1">{score.totalDeducted} pts deducted from baseline 100</p>
                </div>
                <div className="text-right">
                  <span className={`inline-block text-xs px-3 py-1 rounded-full border font-semibold ${riskColor(score.riskLevel)}`}>
                    {score.riskLevel}
                  </span>
                  <p className="text-gray-400 text-xs mt-2 max-w-xs leading-relaxed">{score.recommendedAction}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Drift Score', value: score.driftScore, desc: 'Config deviation' },
                  { label: 'Policy Alignment', value: score.policyAlignment, desc: 'vs baseline policy' },
                  { label: 'Tool Variance', value: score.toolBehaviorVariance, desc: 'tool list delta' },
                  { label: 'State Degradation', value: score.stateDegradation, desc: 'state drift accum.' },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-800/40 border border-gray-700/60 rounded-lg p-3">
                    <p className={`text-xl font-bold font-mono ${s.value <= 30 ? 'text-green-400' : s.value <= 60 ? 'text-yellow-400' : 'text-red-400'}`}>{s.value}</p>
                    <p className="text-gray-300 text-xs font-medium mt-0.5">{s.label}</p>
                    <p className="text-gray-500 text-[10px]">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Deduction Breakdown</p>
                {score.deductions.length === 0 ? (
                  <p className="text-green-400 text-xs">No deductions — continuity fully maintained.</p>
                ) : (
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
                )}
              </div>
            </StepPanel>
          )}

          {/* Step 5: Drift */}
          {isComplete(5) && isActive(5) && (
            <StepPanel step={5} label="Behavioral Drift Detected" icon={<AlertTriangle className="h-4 w-4 text-orange-400" />}>
              {driftFindings.length === 0 ? (
                <div className="flex items-center space-x-2 bg-green-900/20 border border-green-800/30 rounded-lg px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <p className="text-green-300 text-sm">No drift findings detected. Workflow behavior aligns with baseline.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {driftFindings.map((f) => {
                    const remedy = getRemediationForFinding(f);
                    return (
                      <div key={f.id} className={`border rounded-xl p-4 ${
                        f.severity === 'critical' || f.severity === 'high' ? 'border-red-800/40 bg-red-900/10'
                        : f.severity === 'medium' ? 'border-orange-800/40 bg-orange-900/10'
                        : 'border-gray-700 bg-gray-800/20'
                      }`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot(f.severity)}`} />
                            <span className="text-white text-sm font-semibold">{f.title}</span>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0 ml-2">
                            <span className="text-gray-500 text-[10px] font-mono">{f.category}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${
                              f.severity === 'critical' ? 'text-red-400 bg-red-500/10 border-red-800/50'
                              : f.severity === 'high' ? 'text-orange-400 bg-orange-500/10 border-orange-800/50'
                              : 'text-yellow-400 bg-yellow-500/10 border-yellow-800/50'
                            }`}>{f.severity}</span>
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs leading-relaxed mb-2">{f.description}</p>
                        <div className="flex items-start space-x-2 pt-2 border-t border-gray-700/50">
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
                <span className="text-gray-500">{driftFindings.length} findings</span>
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
                  {ledgerRecords.slice(-12).map((rec) => (
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
              <p className="text-xs text-gray-500">{ledgerRecords.length} records written to Audit Ledger for {scenario.workflow.id}</p>
            </StepPanel>
          )}

          {/* Step 7: Report */}
          {isComplete(7) && isActive(7) && (
            <StepPanel step={7} label="Pilot Report" icon={<FileText className="h-4 w-4 text-cyan-400" />}>
              {/* Verdict */}
              <div className={`border ${riskBorder(score.riskLevel)} rounded-xl p-5 bg-gray-800/30`}>
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">Final Assessment — {scenario.workflow.name}</p>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`text-4xl font-bold font-mono ${scoreColor(score.continuityScore)}`}>{score.continuityScore}</span>
                      <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${riskColor(score.riskLevel)}`}>{score.riskLevel}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed max-w-lg">{score.recommendedAction}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-gray-500 text-xs">Scenario</p>
                    <p className="text-gray-300 text-xs font-mono">#{scenario.number}</p>
                    <p className="text-gray-500 text-xs mt-1.5">Session</p>
                    <p className="text-gray-300 text-xs font-mono">{sessionId}</p>
                  </div>
                </div>
              </div>

              {/* F5 simulation */}
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">F5 ADSP Simulation Results</p>
                <div className="space-y-2">
                  {scenario.f5Events.map((evt) => (
                    <div key={evt.id} className="flex items-start justify-between bg-gray-800/30 border border-gray-700/50 rounded-lg px-4 py-3">
                      <div className="flex items-start space-x-2">
                        {evt.source === 'guardrail' ? <Shield className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />
                        : evt.source === 'red-team' ? <TestTube2 className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                        : <Eye className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />}
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

              {/* Key insight */}
              <div className="bg-gray-800/30 border border-cyan-800/20 rounded-xl p-4">
                <p className="text-white text-xs font-semibold mb-2">Key Insight</p>
                <div className="flex items-start space-x-2">
                  <CircleDot className="h-3.5 w-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-gray-300 text-xs leading-relaxed">{scenario.keyInsight}</p>
                </div>
              </div>
            </StepPanel>
          )}

          {/* Next step button */}
          {activeStep > 0 && activeStep < 7 && canAdvance(activeStep + 1) && (
            <div className="flex items-center justify-end">
              <button
                onClick={() => advanceTo(activeStep + 1)}
                disabled={running}
                className="flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <span>Next: {STEPS[activeStep]?.shortLabel ?? 'Step'}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PilotTestScenarios: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runnerKey, setRunnerKey] = useState(0);

  const selectedScenario = pilotTestScenarios.find((s) => s.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setRunnerKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Pilot Test Scenarios</h2>
        <p className="text-gray-400 text-sm mt-1 max-w-2xl">
          Five selectable demo cases that each isolate a distinct assurance pattern. Select a scenario to
          walk through the full SMI lifecycle — baseline, change, events, score, drift, audit, report.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Scenario selector */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-3">Select a Scenario</p>
          {pilotTestScenarios.map((s) => (
            <ScenarioCard
              key={s.id}
              scenario={s}
              selected={selectedId === s.id}
              onSelect={() => handleSelect(s.id)}
            />
          ))}
        </div>

        {/* Right: Runner */}
        <div className="lg:col-span-2">
          {selectedScenario ? (
            <ScenarioRunner key={runnerKey} scenario={selectedScenario} />
          ) : (
            <div className="border border-dashed border-gray-700 rounded-xl p-12 flex flex-col items-center justify-center space-y-3 text-center h-full min-h-[400px]">
              <FlaskConical className="h-10 w-10 text-gray-700" />
              <p className="text-gray-500 text-sm">Select a scenario from the left panel to begin the demo.</p>
              <p className="text-gray-600 text-xs max-w-sm">
                Each scenario runs the live SMI scoring engine against purpose-built mock event data, then
                writes real audit records you can inspect.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const StepPanel: React.FC<{ step: number; label: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  step, label, icon, children,
}) => (
  <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
    <div className="px-5 py-3.5 border-b border-gray-800 bg-gray-800/30 flex items-center space-x-2">
      <span className="text-gray-500 text-xs font-mono">Step {step}</span>
      <span className="text-gray-700">·</span>
      {icon}
      <span className="text-white font-semibold text-sm">{label}</span>
    </div>
    <div className="p-5 space-y-4">{children}</div>
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
      highlight === 'green' ? 'text-green-400'
      : highlight === 'red' ? 'text-red-400'
      : highlight === 'orange' ? 'text-orange-400'
      : 'text-gray-200'
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

export default PilotTestScenarios;
