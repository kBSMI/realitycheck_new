import React, { useState, useMemo } from 'react';
import {
  Shield, Zap, Eye, TestTube2, Server, Play, CheckCircle2, AlertTriangle,
  XCircle, ChevronDown, ChevronRight, Database, ArrowRight, Activity,
  Clock, Tag, FileText, Lock, GitBranch,
} from 'lucide-react';
import { f5StreamEvents, getStreamEventsByStream, getF5EventsBySource } from '../data/f5SimulationEvents';
import { F5StreamEvent, F5StreamType, F5EventSource } from '../types/smi';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { workflowEvents } from '../data/events';
import { computeAllScores } from '../services/memoryMorphologyEngine';
import { recordF5SimulationRun } from '../services/auditLedgerService';

const DISCLAIMER =
  'The F5 ADSP Simulation Connector is a demonstration layer using mock event structures to illustrate how SMI could interoperate with AI gateway, guardrail, red-team, and XOps event streams. It is not an official F5 integration.';

// ─── Stream type config ────────────────────────────────────────────────────────

interface StreamConfig {
  stream: F5StreamType;
  label: string;
  source: F5EventSource;
  icon: React.ReactNode;
  sourceLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STREAMS: StreamConfig[] = [
  {
    stream: 'ai_gateway.request',
    label: 'AI Gateway: Request',
    source: 'ai-gateway',
    icon: <Server className="h-4 w-4" />,
    sourceLabel: 'AI Gateway',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-900/20',
    borderColor: 'border-cyan-800/40',
  },
  {
    stream: 'ai_gateway.response',
    label: 'AI Gateway: Response',
    source: 'ai-gateway',
    icon: <ArrowRight className="h-4 w-4" />,
    sourceLabel: 'AI Gateway',
    color: 'text-blue-400',
    bgColor: 'bg-blue-900/20',
    borderColor: 'border-blue-800/40',
  },
  {
    stream: 'ai_guardrails.policy_violation',
    label: 'Guardrails: Policy Violation',
    source: 'guardrail',
    icon: <Shield className="h-4 w-4" />,
    sourceLabel: 'Guardrail',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/20',
    borderColor: 'border-orange-800/40',
  },
  {
    stream: 'ai_guardrails.prompt_injection_detected',
    label: 'Guardrails: Prompt Injection',
    source: 'guardrail',
    icon: <Lock className="h-4 w-4" />,
    sourceLabel: 'Guardrail',
    color: 'text-amber-400',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-800/40',
  },
  {
    stream: 'ai_redteam.test_result',
    label: 'AI Red Team: Test Result',
    source: 'red-team',
    icon: <TestTube2 className="h-4 w-4" />,
    sourceLabel: 'Red Team',
    color: 'text-rose-400',
    bgColor: 'bg-rose-900/20',
    borderColor: 'border-rose-800/40',
  },
  {
    stream: 'adsp.policy_version_changed',
    label: 'ADSP: Policy Version Changed',
    source: 'ai-gateway',
    icon: <GitBranch className="h-4 w-4" />,
    sourceLabel: 'ADSP',
    color: 'text-violet-400',
    bgColor: 'bg-violet-900/20',
    borderColor: 'border-violet-800/40',
  },
  {
    stream: 'agent.tool_call',
    label: 'Agent: Tool Call',
    source: 'guardrail',
    icon: <Zap className="h-4 w-4" />,
    sourceLabel: 'Guardrail',
    color: 'text-green-400',
    bgColor: 'bg-green-900/20',
    borderColor: 'border-green-800/40',
  },
  {
    stream: 'xops.workflow_anomaly',
    label: 'XOps: Workflow Anomaly',
    source: 'xops-review',
    icon: <Eye className="h-4 w-4" />,
    sourceLabel: 'XOps Review',
    color: 'text-gray-300',
    bgColor: 'bg-gray-800/40',
    borderColor: 'border-gray-700',
  },
];

// ─── Utilities ─────────────────────────────────────────────────────────────────

const classIcon = (c: 'pass' | 'warn' | 'fail') => {
  switch (c) {
    case 'pass': return <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />;
    case 'warn': return <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />;
    case 'fail': return <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />;
  }
};

const smiConsumedBadge = (s: F5StreamEvent['smiConsumed']) => {
  switch (s) {
    case 'consumed': return 'bg-green-500/10 text-green-400 border-green-800/60';
    case 'flagged':  return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/60';
    case 'rejected': return 'bg-red-500/10 text-red-400 border-red-800/60';
    case 'ignored':  return 'bg-gray-500/10 text-gray-400 border-gray-700';
  }
};

const severityDot = (s: F5StreamEvent['severity']) => {
  switch (s) {
    case 'critical': return 'bg-red-400';
    case 'high':     return 'bg-orange-400';
    case 'medium':   return 'bg-yellow-400';
    case 'low':      return 'bg-blue-400';
    case 'info':     return 'bg-gray-400';
  }
};

const wfName = (id: string) => workflows.find((w) => w.id === id)?.name ?? id;

const fmtTs = (ts: string) => {
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ─── Component ─────────────────────────────────────────────────────────────────

const F5ADSPSimulation: React.FC = () => {
  const [runState, setRunState] = useState<Record<F5StreamType, 'idle' | 'running' | 'complete'>>({
    'ai_gateway.request': 'idle',
    'ai_gateway.response': 'idle',
    'ai_guardrails.policy_violation': 'idle',
    'ai_guardrails.prompt_injection_detected': 'idle',
    'ai_redteam.test_result': 'idle',
    'adsp.policy_version_changed': 'idle',
    'agent.tool_call': 'idle',
    'xops.workflow_anomaly': 'idle',
  });

  const [expanded, setExpanded] = useState<Record<F5StreamType, boolean>>({
    'ai_gateway.request': false,
    'ai_gateway.response': false,
    'ai_guardrails.policy_violation': false,
    'ai_guardrails.prompt_injection_detected': false,
    'ai_redteam.test_result': false,
    'adsp.policy_version_changed': false,
    'agent.tool_call': false,
    'xops.workflow_anomaly': false,
  });

  const [payloadOpen, setPayloadOpen] = useState<Record<string, boolean>>({});

  const scores = useMemo(() => computeAllScores(workflows, baselines, workflowEvents), []);

  const runSimulation = (stream: F5StreamType, source: F5EventSource) => {
    setRunState((prev) => ({ ...prev, [stream]: 'running' }));
    setTimeout(() => {
      const streamEvents = getStreamEventsByStream(stream);
      streamEvents.forEach((evt) => {
        const legacyEvt = getF5EventsBySource(source).find((e) => e.id === evt.id);
        const wfScore = scores.find((s) => s.workflowId === evt.workflowId);
        if (legacyEvt && wfScore) {
          recordF5SimulationRun('session-pilot-001', legacyEvt, wfScore);
        }
      });
      setRunState((prev) => ({ ...prev, [stream]: 'complete' }));
    }, 1200);
  };

  const streamStats = (stream: F5StreamType) => {
    const evts = getStreamEventsByStream(stream);
    return {
      pass: evts.filter((e) => e.classification === 'pass').length,
      warn: evts.filter((e) => e.classification === 'warn').length,
      fail: evts.filter((e) => e.classification === 'fail').length,
      totalDelta: evts.reduce((s, e) => s + e.continuityDelta, 0),
      total: evts.length,
    };
  };

  const globalStats = useMemo(() => ({
    total: f5StreamEvents.length,
    pass: f5StreamEvents.filter((e) => e.classification === 'pass').length,
    warn: f5StreamEvents.filter((e) => e.classification === 'warn').length,
    fail: f5StreamEvents.filter((e) => e.classification === 'fail').length,
    totalDelta: f5StreamEvents.reduce((s, e) => s + e.continuityDelta, 0),
    streams: 8,
  }), []);

  const anyComplete = Object.values(runState).some((s) => s === 'complete');

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">F5 ADSP Simulation Connector</h2>
        <p className="text-gray-400 text-sm mt-1">
          Run simulated F5-style event streams against live SMI continuity scores. Each stream maps to one
          of the 8 ADSP stream types. Events are ingested by SMI, scored, and written to the Audit Ledger.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-4 flex items-start space-x-3">
        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-200 text-sm leading-relaxed">{DISCLAIMER}</p>
      </div>

      {/* Visual pipeline flow */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">
          Simulated Integration Pipeline
        </h3>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {[
            {
              label: 'F5 ADSP\n(Simulated)',
              sublabel: '8 Stream Types',
              icon: <Server className="h-5 w-5 text-cyan-400" />,
              border: 'border-cyan-800/50 bg-cyan-900/15',
            },
            {
              label: 'SMI\nIngestion Layer',
              sublabel: 'consume / flag / reject',
              icon: <Activity className="h-5 w-5 text-blue-400" />,
              border: 'border-blue-800/50 bg-blue-900/15',
            },
            {
              label: 'Continuity\nScoring Engine',
              sublabel: 'deterministic delta',
              icon: <Zap className="h-5 w-5 text-green-400" />,
              border: 'border-green-800/50 bg-green-900/15',
            },
            {
              label: 'Audit\nLedger',
              sublabel: 'append-only record',
              icon: <Database className="h-5 w-5 text-gray-400" />,
              border: 'border-gray-700 bg-gray-800/40',
            },
            {
              label: 'XOps\nReview',
              sublabel: 'approve / quarantine',
              icon: <Eye className="h-5 w-5 text-orange-400" />,
              border: 'border-orange-800/50 bg-orange-900/15',
            },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <div className={`flex flex-col items-center border rounded-xl px-4 py-3 min-w-[100px] flex-1 max-w-[150px] ${node.border}`}>
                <div className="mb-1.5">{node.icon}</div>
                <span className="text-gray-200 text-xs text-center font-semibold whitespace-pre-line leading-tight">{node.label}</span>
                <span className="text-gray-500 text-[10px] text-center mt-1 leading-tight">{node.sublabel}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="h-4 w-4 text-gray-600 shrink-0 hidden sm:block" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Global summary stats */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Streams', value: globalStats.streams, color: 'text-white' },
          { label: 'Total Events', value: globalStats.total, color: 'text-gray-200' },
          { label: 'Pass', value: globalStats.pass, color: 'text-green-400' },
          { label: 'Warn', value: globalStats.warn, color: 'text-yellow-400' },
          { label: 'Fail', value: globalStats.fail, color: 'text-red-400' },
          { label: 'Net Delta', value: `${globalStats.totalDelta > 0 ? '+' : ''}${globalStats.totalDelta}`, color: globalStats.totalDelta >= 0 ? 'text-green-400' : 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold font-mono ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Run all button */}
      {!anyComplete && (
        <div className="flex items-center justify-end">
          <button
            onClick={() => STREAMS.forEach((s) => runSimulation(s.stream, s.source))}
            className="flex items-center space-x-2 px-5 py-2.5 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
          >
            <Play className="h-4 w-4" />
            <span>Run All Streams</span>
          </button>
        </div>
      )}

      {/* Stream panels */}
      <div className="space-y-3">
        {STREAMS.map((cfg) => {
          const status = runState[cfg.stream];
          const stats = streamStats(cfg.stream);
          const events = getStreamEventsByStream(cfg.stream);
          const isExpanded = expanded[cfg.stream];

          return (
            <div
              key={cfg.stream}
              className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors duration-200"
            >
              <div className="p-5">
                {/* Stream header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={cfg.color}>{cfg.icon}</span>
                    <div>
                      <span className="text-white font-semibold text-sm">{cfg.label}</span>
                      <span className="ml-2 text-gray-500 text-xs font-mono">{cfg.stream}</span>
                    </div>
                  </div>
                  {status === 'complete' && (
                    <div className="flex items-center space-x-2 text-xs shrink-0 ml-2">
                      <span className="text-green-400">{stats.pass} pass</span>
                      <span className="text-yellow-400">{stats.warn} warn</span>
                      <span className="text-red-400">{stats.fail} fail</span>
                      <span className={`font-mono font-bold ${stats.totalDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {stats.totalDelta > 0 ? '+' : ''}{stats.totalDelta} pts
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-gray-500 text-xs mb-3 font-mono">
                  Source: <span className="text-gray-400">{cfg.sourceLabel}</span>
                  <span className="mx-2 text-gray-700">|</span>
                  {stats.total} event{stats.total !== 1 ? 's' : ''} in stream
                </p>

                {/* Controls */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => runSimulation(cfg.stream, cfg.source)}
                    disabled={status === 'running'}
                    className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      status === 'running'
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                        : status === 'complete'
                        ? 'bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300'
                        : 'bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white'
                    }`}
                  >
                    {status === 'running' ? (
                      <>
                        <div className="h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        <span>Simulating...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3" />
                        <span>{status === 'complete' ? 'Re-run' : 'Run Stream'}</span>
                      </>
                    )}
                  </button>

                  {status === 'complete' && (
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [cfg.stream]: !prev[cfg.stream] }))}
                      className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs transition-colors"
                    >
                      {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      <span>{isExpanded ? 'Collapse' : 'Expand'} event detail</span>
                    </button>
                  )}

                  {status === 'complete' && (
                    <span className="ml-auto flex items-center space-x-1 text-xs text-green-500">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Ledger written</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Event detail table */}
              {status === 'complete' && isExpanded && (
                <div className="border-t border-gray-800">
                  {/* Column header */}
                  <div className="px-5 py-2 bg-gray-800/40 grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-800">
                    <div className="col-span-1">Status</div>
                    <div className="col-span-3">Event / Workflow</div>
                    <div className="col-span-1 hidden lg:block">Severity</div>
                    <div className="col-span-2 hidden lg:block">Model Ver.</div>
                    <div className="col-span-1 hidden xl:block">Prompt Ver.</div>
                    <div className="col-span-1 hidden xl:block">Policy Ver.</div>
                    <div className="col-span-2">SMI Status</div>
                    <div className="col-span-1">Impact</div>
                    <div className="col-span-1 text-right">Detail</div>
                  </div>

                  {/* Rows */}
                  {events.map((evt) => {
                    const isPayloadOpen = payloadOpen[evt.id] ?? false;
                    return (
                      <div key={evt.id} className="divide-y divide-gray-800/60">
                        <div className="px-5 py-3 hover:bg-gray-800/25 transition-colors">
                          <div className="grid grid-cols-12 gap-2 items-start">
                            {/* Status */}
                            <div className="col-span-1 pt-0.5">
                              {classIcon(evt.classification)}
                            </div>

                            {/* Event name + workflow */}
                            <div className="col-span-3">
                              <p className="text-white text-xs font-medium leading-tight">{evt.eventName}</p>
                              <p className="text-gray-500 text-[10px] mt-0.5">{wfName(evt.workflowId)}</p>
                              <p className="text-gray-600 text-[10px] flex items-center space-x-1 mt-0.5">
                                <Clock className="h-2.5 w-2.5 shrink-0" />
                                <span>{fmtTs(evt.timestamp)}</span>
                              </p>
                            </div>

                            {/* Severity */}
                            <div className="col-span-1 hidden lg:flex items-center space-x-1 pt-0.5">
                              <span className={`h-2 w-2 rounded-full shrink-0 ${severityDot(evt.severity)}`} />
                              <span className="text-gray-400 text-[10px] capitalize">{evt.severity}</span>
                            </div>

                            {/* Model version */}
                            <div className="col-span-2 hidden lg:block pt-0.5">
                              <span className="text-gray-300 text-[10px] font-mono">{evt.modelVersion}</span>
                            </div>

                            {/* Prompt version */}
                            <div className="col-span-1 hidden xl:block pt-0.5">
                              <span className="text-gray-300 text-[10px] font-mono">{evt.promptVersion}</span>
                            </div>

                            {/* Policy version */}
                            <div className="col-span-1 hidden xl:block pt-0.5">
                              <span className="text-gray-300 text-[10px] font-mono">{evt.policyVersion}</span>
                            </div>

                            {/* SMI consumed */}
                            <div className="col-span-2 pt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${smiConsumedBadge(evt.smiConsumed)}`}>
                                {evt.smiConsumed}
                              </span>
                              <p className="text-gray-600 text-[10px] mt-0.5 font-mono">{evt.smiEventType}</p>
                            </div>

                            {/* Continuity delta */}
                            <div className="col-span-1 pt-0.5">
                              <span className={`text-sm font-bold font-mono ${evt.continuityDelta === 0 ? 'text-gray-500' : evt.continuityDelta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {evt.continuityDelta > 0 ? '+' : ''}{evt.continuityDelta}
                              </span>
                            </div>

                            {/* Toggle raw payload */}
                            <div className="col-span-1 flex justify-end pt-0.5">
                              <button
                                onClick={() => setPayloadOpen((prev) => ({ ...prev, [evt.id]: !isPayloadOpen }))}
                                className="text-gray-600 hover:text-gray-400 transition-colors"
                                title="Toggle raw payload"
                              >
                                {isPayloadOpen
                                  ? <ChevronDown className="h-3.5 w-3.5" />
                                  : <ChevronRight className="h-3.5 w-3.5" />
                                }
                              </button>
                            </div>
                          </div>

                          {/* Description row */}
                          <div className="mt-2 ml-7">
                            <p className="text-gray-400 text-[11px] leading-relaxed">{evt.description}</p>
                            <p className="text-cyan-900 text-[10px] font-mono mt-1">{evt.policyRef}</p>
                          </div>
                        </div>

                        {/* Raw payload expansion */}
                        {isPayloadOpen && (
                          <div className="px-5 py-3 bg-gray-950/60 border-t border-gray-800/60">
                            <div className="flex items-center space-x-1 mb-2">
                              <FileText className="h-3 w-3 text-gray-500" />
                              <span className="text-gray-500 text-[10px] font-semibold uppercase tracking-wider">Raw Payload</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                              {Object.entries(evt.rawPayload).map(([k, v]) => (
                                <div key={k} className="flex items-baseline space-x-1.5">
                                  <span className="text-gray-500 text-[10px] font-mono shrink-0">{k}:</span>
                                  <span className={`text-[10px] font-mono truncate ${
                                    v === true ? 'text-green-400' :
                                    v === false ? 'text-red-400' :
                                    typeof v === 'number' ? 'text-yellow-400' :
                                    'text-gray-300'
                                  }`}>
                                    {String(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SMI ingestion legend */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3 text-sm">SMI Ingestion Status Reference</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { status: 'consumed', desc: 'Event fully ingested and scored by SMI. Score delta applied.' },
            { status: 'flagged', desc: 'Event ingested with elevated attention. Scored and marked for XOps review.' },
            { status: 'rejected', desc: 'Event structure invalid or out-of-scope. Not scored, logged only.' },
            { status: 'ignored', desc: 'Event is below threshold or outside policy scope. No delta applied.' },
          ].map((item) => (
            <div key={item.status} className="space-y-1">
              <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${smiConsumedBadge(item.status as F5StreamEvent['smiConsumed'])}`}>
                {item.status}
              </span>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stream type legend */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center space-x-2 mb-3">
          <Tag className="h-4 w-4 text-gray-400" />
          <h3 className="text-white font-semibold text-sm">F5 ADSP Stream Type Reference</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {STREAMS.map((s) => {
            const stats = streamStats(s.stream);
            return (
              <div key={s.stream} className={`flex items-start space-x-3 p-3 border rounded-lg ${s.bgColor} ${s.borderColor}`}>
                <span className={`${s.color} mt-0.5 shrink-0`}>{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-200 text-xs font-semibold">{s.label}</span>
                    <span className="text-gray-500 text-[10px] font-mono ml-2 shrink-0">{stats.total} events</span>
                  </div>
                  <span className={`text-[10px] font-mono ${s.color} opacity-70`}>{s.stream}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};

export default F5ADSPSimulation;
