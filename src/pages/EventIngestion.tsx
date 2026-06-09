import React, { useState, useMemo } from 'react';
import {
  Zap, CheckCircle2, AlertTriangle, ShieldAlert, Clock, Filter,
  Play, XCircle, BookLock, GitBranch, Wrench, Shield, Brain, Activity,
} from 'lucide-react';
import { workflowEvents } from '../data/events';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { AIWorkflowEvent, EventType as SMIEventType } from '../types/smi';
import { ingestWorkflowEvent, RawEvent } from '../services/smiIngestionService';
import { computeContinuityScore } from '../services/memoryMorphologyEngine';
import { getBaselineForWorkflow } from '../data/baselines';
import { recordEventIngested } from '../services/auditLedgerService';

// ─── Display classification ────────────────────────────────────────────────────

type DisplayType = 'all' | 'Nominal' | 'Anomalous' | 'Guardrail Triggered';

function toDisplayType(evt: AIWorkflowEvent): 'Nominal' | 'Anomalous' | 'Guardrail Triggered' {
  if (evt.eventType === 'guardrail_violation' || evt.eventType === 'forbidden_behavior') return 'Guardrail Triggered';
  if (evt.eventType === 'nominal_operation' || evt.eventType === 'baseline_capture') return 'Nominal';
  return 'Anomalous';
}

// ─── Simulation button config ──────────────────────────────────────────────────

interface SimButton {
  label: string;
  icon: React.ReactNode;
  color: string;
  border: string;
  build: () => RawEvent;
}

const SIM_BUTTONS: SimButton[] = [
  {
    label: 'Normal Event',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    color: 'text-green-400',
    border: 'border-green-800/50 hover:border-green-700',
    build: () => ({
      workflowId: 'wf-001',
      baselineId: 'bl-001',
      eventType: 'nominal_operation' as SMIEventType,
      severity: 'info' as const,
      description: 'Simulated nominal operation — inference cycle completed within policy bounds.',
    }),
  },
  {
    label: 'Prompt Version Change',
    icon: <Brain className="h-3.5 w-3.5" />,
    color: 'text-yellow-400',
    border: 'border-yellow-800/50 hover:border-yellow-700',
    build: () => ({
      workflowId: 'wf-001',
      baselineId: 'bl-001',
      eventType: 'prompt_version_change' as SMIEventType,
      severity: 'medium' as const,
      description: 'Simulated prompt version change — hash mismatch detected against approved baseline.',
      payload: { previousPromptVersion: '4.2.0', newPromptVersion: '4.3.0', promptHashMatch: false },
    }),
  },
  {
    label: 'Policy Version Mismatch',
    icon: <GitBranch className="h-3.5 w-3.5" />,
    color: 'text-orange-400',
    border: 'border-orange-800/50 hover:border-orange-700',
    build: () => ({
      workflowId: 'wf-004',
      baselineId: 'bl-004',
      eventType: 'policy_version_mismatch' as SMIEventType,
      severity: 'medium' as const,
      description: 'Simulated policy version mismatch — workflow running policy v1.8.0, baseline requires v2.1.0.',
      payload: { expectedPolicyVersion: '2.1.0', actualPolicyVersion: '1.8.0' },
    }),
  },
  {
    label: 'Tool Access Added',
    icon: <Wrench className="h-3.5 w-3.5" />,
    color: 'text-blue-400',
    border: 'border-blue-800/50 hover:border-blue-700',
    build: () => ({
      workflowId: 'wf-002',
      baselineId: 'bl-002',
      eventType: 'unauthorized_tool_call' as SMIEventType,
      severity: 'high' as const,
      description: 'Simulated tool access expansion — "external-write" tool invoked, not in approved baseline tool list.',
      payload: { toolName: 'external-write', toolCallArgs: '{"destination":"external-endpoint","data":"batch-result"}' },
    }),
  },
  {
    label: 'Unauthorized Tool Call',
    icon: <XCircle className="h-3.5 w-3.5" />,
    color: 'text-red-400',
    border: 'border-red-800/50 hover:border-red-700',
    build: () => ({
      workflowId: 'wf-003',
      baselineId: 'bl-003',
      eventType: 'unauthorized_tool_call' as SMIEventType,
      severity: 'high' as const,
      description: 'Simulated unauthorized tool call — "external-pixel" invoked outside approved tool scope.',
      payload: { toolName: 'external-pixel', toolCallArgs: '{"destination":"analytics.thirdparty.com"}' },
    }),
  },
  {
    label: 'Guardrail Violation',
    icon: <Shield className="h-3.5 w-3.5" />,
    color: 'text-amber-400',
    border: 'border-amber-800/50 hover:border-amber-700',
    build: () => ({
      workflowId: 'wf-003',
      baselineId: 'bl-003',
      eventType: 'guardrail_violation' as SMIEventType,
      severity: 'critical' as const,
      description: 'Simulated guardrail violation — policy enforcement gap detected, guardrails reported as disabled.',
      payload: { guardrailId: 'grl-sim-001', guardrailRule: 'guardrailsEnabled must be true in production' },
    }),
  },
  {
    label: 'Memory / State Change',
    icon: <Activity className="h-3.5 w-3.5" />,
    color: 'text-cyan-400',
    border: 'border-cyan-800/50 hover:border-cyan-700',
    build: () => ({
      workflowId: 'wf-002',
      baselineId: 'bl-002',
      eventType: 'memory_state_change' as SMIEventType,
      severity: 'medium' as const,
      description: 'Simulated memory state change — session context buffer updated, hash drift from approved state.',
      payload: { stateKey: 'session-context', previousStateHash: 'aa11bb22cc33dd44', newStateHash: 'bb33cc44dd55ee66' },
    }),
  },
];

// ─── Deduction lookup (matches scoring engine) ────────────────────────────────

const DEDUCTION: Record<SMIEventType, number> = {
  model_version_change: 15,
  prompt_version_change: 12,
  policy_version_mismatch: 15,
  unauthorized_tool_call: 10,
  forbidden_behavior: 15,
  sensitive_data_risk: 10,
  guardrail_violation: 15,
  memory_state_change: 8,
  orchestration_change: 9,
  nominal_operation: 0,
  baseline_capture: 0,
  baseline_override: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const typeIcon = (type: 'Nominal' | 'Anomalous' | 'Guardrail Triggered') => {
  switch (type) {
    case 'Nominal': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'Anomalous': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case 'Guardrail Triggered': return <ShieldAlert className="h-4 w-4 text-red-400" />;
  }
};

const typeBadge = (type: string) => {
  switch (type) {
    case 'Nominal': return 'bg-green-500/10 text-green-400 border-green-800/50';
    case 'Anomalous': return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/50';
    case 'Guardrail Triggered': return 'bg-red-500/10 text-red-400 border-red-800/50';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-700';
  }
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

// ─── Result card for simulated events ─────────────────────────────────────────

interface SimResult {
  eventId: string;
  eventType: SMIEventType;
  deduction: number;
  auditWritten: boolean;
  workflowId: string;
  timestamp: string;
}

// ─── Component ─────────────────────────────────────────────────────────────────

const EventIngestion: React.FC = () => {
  const [filter, setFilter] = useState<DisplayType>('all');
  const [simEvents, setSimEvents] = useState<AIWorkflowEvent[]>([]);
  const [lastResult, setLastResult] = useState<SimResult | null>(null);

  // Combine canonical workflow events with simulated additions
  const allCanonical = useMemo(() => workflowEvents, []);
  const combined = useMemo(() => [...simEvents, ...allCanonical], [simEvents, allCanonical]);

  const displayEvents = useMemo(() => {
    const tagged = combined.map((e) => ({ evt: e, display: toDisplayType(e) }));
    if (filter === 'all') return tagged;
    return tagged.filter((t) => t.display === filter);
  }, [combined, filter]);

  const counts = useMemo(() => ({
    Nominal: combined.filter((e) => toDisplayType(e) === 'Nominal').length,
    Anomalous: combined.filter((e) => toDisplayType(e) === 'Anomalous').length,
    'Guardrail Triggered': combined.filter((e) => toDisplayType(e) === 'Guardrail Triggered').length,
  }), [combined]);

  const handleSimulate = (btn: SimButton) => {
    const raw = btn.build();
    const result = ingestWorkflowEvent(raw);
    if (!result.valid) return;

    const evt = result.normalized;
    const deduction = DEDUCTION[evt.eventType] ?? 0;

    // Write audit record if there's a deduction
    let auditWritten = false;
    if (deduction > 0) {
      const wf = workflows.find((w) => w.id === evt.workflowId);
      const baseline = getBaselineForWorkflow(evt.workflowId);
      if (wf && baseline) {
        const currentScore = computeContinuityScore(
          wf,
          baseline,
          [...workflowEvents.filter((e) => e.workflowId === evt.workflowId), evt]
        );
        recordEventIngested(
          'session-pilot-sim',
          evt.workflowId,
          evt.baselineId,
          evt.id,
          currentScore,
          `enterprise-ai-policy::${baseline.policyConfig.version}`,
          evt.description
        );
        auditWritten = true;
      }
    }

    setSimEvents((prev) => [evt, ...prev]);
    setLastResult({
      eventId: evt.id,
      eventType: evt.eventType,
      deduction,
      auditWritten,
      workflowId: evt.workflowId,
      timestamp: evt.timestamp,
    });
  };

  const wfName = (id: string) => workflows.find((w) => w.id === id)?.name ?? id;
  const blVersion = (id: string) => baselines.find((b) => b.workflowId === id)?.policyConfig.version ?? '—';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Event Ingestion</h2>
        <p className="text-gray-400 text-sm mt-1">
          Inbound AI workflow events from guardrail systems, gateway logs, red team probes, and XOps monitors.
          Events are normalized, scored, and fed into the continuity engine. Use the simulation panel to inject test events.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        {([
          ['Nominal', 'border-green-800/40 bg-green-900/10', 'text-green-400'],
          ['Anomalous', 'border-yellow-800/40 bg-yellow-900/10', 'text-yellow-400'],
          ['Guardrail Triggered', 'border-red-800/40 bg-red-900/10', 'text-red-400'],
        ] as const).map(([type, card, text]) => (
          <div key={type} className={`border rounded-xl p-4 ${card}`}>
            <div className="flex items-center space-x-2 mb-1">
              {typeIcon(type)}
              <span className={`text-2xl font-bold ${text}`}>{counts[type]}</span>
            </div>
            <p className="text-gray-400 text-xs">{type}</p>
          </div>
        ))}
      </div>

      {/* Simulation panel */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-800 bg-gray-800/30 flex items-center space-x-2">
          <Play className="h-4 w-4 text-cyan-400" />
          <span className="text-white font-semibold text-sm">Event Simulation</span>
          <span className="text-gray-500 text-xs ml-2">Inject a synthetic event into the ingestion pipeline</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            {SIM_BUTTONS.map((btn) => (
              <button
                key={btn.label}
                onClick={() => handleSimulate(btn)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 border ${btn.border} ${btn.color} transition-all duration-150 hover:bg-gray-800`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>

          {/* Last result card */}
          {lastResult && (
            <div className="bg-gray-800/40 border border-gray-700/60 rounded-xl p-4">
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-3">Ingestion Result</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Normalized Event Type</p>
                  <p className="text-white text-xs font-mono font-semibold">{lastResult.eventType}</p>
                  <p className="text-gray-500 text-[10px] font-mono mt-0.5">{lastResult.eventId}</p>
                </div>
                <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Scoring Impact</p>
                  {lastResult.deduction > 0 ? (
                    <>
                      <p className="text-red-400 text-lg font-bold font-mono">-{lastResult.deduction} pts</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">Applied to {wfName(lastResult.workflowId)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-green-400 text-lg font-bold font-mono">0 pts</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">No deduction (nominal)</p>
                    </>
                  )}
                </div>
                <div className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-3">
                  <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1">Audit Record</p>
                  {lastResult.auditWritten ? (
                    <div className="flex items-center space-x-1.5 mt-1">
                      <BookLock className="h-4 w-4 text-cyan-400 shrink-0" />
                      <div>
                        <p className="text-cyan-300 text-xs font-semibold">Written</p>
                        <p className="text-gray-500 text-[10px]">Policy v{blVersion(lastResult.workflowId)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1.5 mt-1">
                      <CheckCircle2 className="h-4 w-4 text-gray-500 shrink-0" />
                      <p className="text-gray-500 text-xs">Not written (no deduction)</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center space-x-2 bg-gray-900/80 border border-gray-800 rounded-xl p-3 flex-wrap gap-1">
        <Filter className="h-4 w-4 text-gray-500 mr-1 shrink-0" />
        {(['all', 'Nominal', 'Anomalous', 'Guardrail Triggered'] as DisplayType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              filter === f ? 'bg-cyan-700 border border-cyan-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {f === 'all' ? `All (${combined.length})` : `${f} (${counts[f]})`}
          </button>
        ))}
        {simEvents.length > 0 && (
          <button
            onClick={() => { setSimEvents([]); setLastResult(null); }}
            className="ml-auto text-gray-600 hover:text-gray-400 text-xs transition-colors"
          >
            Clear simulated
          </button>
        )}
      </div>

      {/* Event stream */}
      <div className="space-y-3">
        {displayEvents.map(({ evt, display }) => (
          <div
            key={evt.id}
            className={`bg-gray-900/80 border rounded-xl p-4 hover:border-gray-700 transition-colors duration-200 ${
              simEvents.includes(evt) ? 'border-cyan-800/40' : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <Zap className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                <span className="text-white font-medium text-sm">{wfName(evt.workflowId)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeBadge(display)}`}>
                  {display}
                </span>
                {simEvents.includes(evt) && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-cyan-900/40 border border-cyan-800/50 text-cyan-400 rounded-full font-semibold">
                    SIM
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-1 text-gray-500 text-xs shrink-0 ml-2">
                <Clock className="h-3 w-3" />
                <span>{formatDate(evt.timestamp)}</span>
              </div>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{evt.description}</p>
            <div className="mt-2 flex items-center space-x-3 text-xs text-gray-600 flex-wrap gap-1">
              <span className="font-mono">{evt.workflowId}</span>
              <span className="font-mono text-gray-700">{evt.eventType}</span>
              {DEDUCTION[evt.eventType] > 0 && (
                <span className="text-red-900 font-mono">-{DEDUCTION[evt.eventType]} pts</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventIngestion;
