import React, { useState, useMemo } from 'react';
import {
  Radio, CheckCircle2, XCircle, ChevronRight, ChevronDown,
  AlertTriangle, Info, Copy, ClipboardCheck, Database, Layers,
  Webhook, Clock, Shield, FileJson,
} from 'lucide-react';
import {
  simulatedIngestionEvents,
  INGESTION_MODE_LABELS,
  MODE_EVENT_COUNTS,
  type IngestionMode,
  type SimulatedIngestionEvent,
  type RawEventType,
} from '../data/ingestionSimulator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function impactColor(pts: number): string {
  if (pts === 0) return 'text-green-400';
  if (pts >= -5) return 'text-yellow-400';
  if (pts >= -10) return 'text-orange-400';
  return 'text-red-400';
}

function impactBg(pts: number): string {
  if (pts === 0) return 'bg-green-900/20 border-green-800/40';
  if (pts >= -5) return 'bg-yellow-900/20 border-yellow-800/40';
  if (pts >= -10) return 'bg-orange-900/20 border-orange-800/40';
  return 'bg-red-900/20 border-red-800/40';
}

function modeIcon(mode: IngestionMode): React.ReactNode {
  const cls = 'h-3.5 w-3.5';
  switch (mode) {
    case 'realtime':          return <Radio className={cls} />;
    case 'batch':             return <Database className={cls} />;
    case 'historical_replay': return <Clock className={cls} />;
    case 'webhook_api':       return <Webhook className={cls} />;
    case 'metadata_only':     return <Layers className={cls} />;
    case 'f5_simulated':      return <Shield className={cls} />;
  }
}

function modeBadgeColor(mode: IngestionMode): string {
  switch (mode) {
    case 'realtime':          return 'bg-cyan-900/40 border-cyan-800/50 text-cyan-300';
    case 'batch':             return 'bg-blue-900/40 border-blue-800/50 text-blue-300';
    case 'historical_replay': return 'bg-gray-800/60 border-gray-700/50 text-gray-300';
    case 'webhook_api':       return 'bg-yellow-900/30 border-yellow-800/40 text-yellow-300';
    case 'metadata_only':     return 'bg-teal-900/30 border-teal-800/40 text-teal-300';
    case 'f5_simulated':      return 'bg-orange-900/30 border-orange-800/40 text-orange-300';
  }
}

// ─── Mode tab strip ───────────────────────────────────────────────────────────

const ALL_MODES: IngestionMode[] = [
  'realtime', 'batch', 'historical_replay', 'webhook_api', 'metadata_only', 'f5_simulated',
];

const ModeTab: React.FC<{
  mode: IngestionMode;
  active: boolean;
  count: number;
  onClick: () => void;
}> = ({ mode, active, count, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 whitespace-nowrap ${
      active
        ? 'bg-cyan-800/40 border-cyan-700/60 text-cyan-200'
        : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
    }`}
  >
    <span className={active ? 'text-cyan-400' : 'text-gray-600'}>{modeIcon(mode)}</span>
    <span>{INGESTION_MODE_LABELS[mode]}</span>
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
      active ? 'bg-cyan-700/50 text-cyan-200' : 'bg-gray-800 text-gray-500'
    }`}>{count}</span>
  </button>
);

// ─── Event row ────────────────────────────────────────────────────────────────

const EventRow: React.FC<{
  event: SimulatedIngestionEvent;
  selected: boolean;
  onClick: () => void;
}> = ({ event, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 border-b border-gray-800/60 transition-colors duration-100 group ${
      selected ? 'bg-cyan-900/15 border-l-2 border-l-cyan-600' : 'hover:bg-gray-800/30 border-l-2 border-l-transparent'
    }`}
  >
    {/* Mode badge */}
    <span className={`inline-flex items-center space-x-1 border rounded-md px-1.5 py-0.5 text-[10px] font-medium shrink-0 ${modeBadgeColor(event.mode)}`}>
      {modeIcon(event.mode)}
      <span className="hidden xl:inline">{INGESTION_MODE_LABELS[event.mode]}</span>
    </span>

    {/* Source */}
    <span className="text-gray-500 text-xs shrink-0 hidden lg:block w-24 truncate">{event.source}</span>

    {/* Workflow */}
    <span className="text-gray-400 font-mono text-xs shrink-0 w-16">{event.workflowId}</span>

    {/* Event type */}
    <span className="text-cyan-600 font-mono text-xs flex-1 truncate">{event.rawEventType}</span>

    {/* Schema */}
    <span className="shrink-0">
      {event.schemaValid
        ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        : <XCircle className="h-3.5 w-3.5 text-red-500" />}
    </span>

    {/* Impact */}
    <span className={`font-mono text-xs font-semibold shrink-0 w-10 text-right ${impactColor(event.continuityImpact)}`}>
      {event.continuityImpact === 0 ? '—' : `${event.continuityImpact}`}
    </span>

    <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${selected ? 'text-cyan-500' : 'text-gray-700 group-hover:text-gray-500'}`} />
  </button>
);

// ─── JSON block ───────────────────────────────────────────────────────────────

const JsonBlock: React.FC<{ title: string; data: Record<string, unknown> | null; empty?: string }> = ({ title, data, empty }) => {
  const [copied, setCopied] = useState(false);
  const text = data ? JSON.stringify(data, null, 2) : null;

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="rounded-lg border border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900/60 border-b border-gray-800">
        <div className="flex items-center space-x-1.5">
          <FileJson className="h-3 w-3 text-gray-500" />
          <span className="text-gray-400 text-xs font-medium">{title}</span>
        </div>
        {data && (
          <button
            onClick={handleCopy}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="Copy JSON"
          >
            {copied ? <ClipboardCheck className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
      <div className="bg-black/40 px-3 py-2.5 overflow-x-auto max-h-48">
        {text
          ? <pre className="text-gray-300 font-mono text-[11px] leading-relaxed whitespace-pre">{text}</pre>
          : <p className="text-gray-600 text-xs italic">{empty ?? 'Not applicable'}</p>}
      </div>
    </div>
  );
};

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel: React.FC<{ event: SimulatedIngestionEvent }> = ({ event }) => {
  const [copiedStep, setCopiedStep] = useState(false);

  const handleCopyStep = () => {
    navigator.clipboard.writeText(event.recommendedNextStep).then(() => {
      setCopiedStep(true);
      setTimeout(() => setCopiedStep(false), 2000);
    });
  };

  const normalizedForDisplay = event.normalizedSMIEvent
    ? { ...event.normalizedSMIEvent } as Record<string, unknown>
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`inline-flex items-center space-x-1 border rounded-md px-2 py-1 text-xs font-medium ${modeBadgeColor(event.mode)}`}>
            {modeIcon(event.mode)}
            <span>{INGESTION_MODE_LABELS[event.mode]}</span>
          </span>
          <span className="text-gray-600 text-xs">{event.source}</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-gray-500 font-mono text-xs">{event.workflowId}</span>
        </div>
        <p className="text-white text-sm font-semibold font-mono">{event.rawEventType}</p>
        <p className="text-gray-400 text-xs mt-1 leading-relaxed">{event.description}</p>
      </div>

      {/* Schema validation */}
      <div className={`flex items-start space-x-2 rounded-lg border px-3 py-2 ${event.schemaValid ? 'bg-green-900/10 border-green-800/30' : 'bg-red-900/10 border-red-800/30'}`}>
        {event.schemaValid
          ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
          : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
        <div>
          <p className={`text-xs font-semibold ${event.schemaValid ? 'text-green-400' : 'text-red-400'}`}>
            Schema {event.schemaValid ? 'Valid' : 'Invalid'}
          </p>
          {event.schemaErrors.length > 0 && (
            <ul className="text-red-400 text-xs mt-1 space-y-0.5">
              {event.schemaErrors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      </div>

      {/* Raw event */}
      <JsonBlock title="Raw Event (wire format)" data={event.rawEvent} />

      {/* Normalized SMI event */}
      <JsonBlock
        title="Normalized SMI Event"
        data={normalizedForDisplay}
        empty="Metadata-only ingestion — no SMI event mapping required."
      />

      {/* Continuity impact */}
      <div className={`flex items-center space-x-3 rounded-lg border px-3 py-2.5 ${impactBg(event.continuityImpact)}`}>
        <span className={`text-2xl font-bold font-mono ${impactColor(event.continuityImpact)}`}>
          {event.continuityImpact === 0 ? '0' : event.continuityImpact}
        </span>
        <div>
          <p className="text-gray-400 text-xs font-medium">Continuity Impact (pts)</p>
          <p className="text-gray-500 text-xs">
            {event.continuityImpact === 0
              ? 'No deduction — nominal or metadata signal'
              : `Deduction applied to continuity score`}
          </p>
        </div>
      </div>

      {/* Audit impact */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-lg px-3 py-2.5">
        <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Audit Impact</p>
        <p className="text-gray-300 text-xs leading-relaxed">{event.auditImpact}</p>
      </div>

      {/* Recommended next step */}
      <div className="bg-cyan-900/10 border border-cyan-900/30 rounded-lg px-3 py-2.5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-cyan-600 text-[10px] font-semibold uppercase tracking-widest">Recommended Next Step</p>
          <button onClick={handleCopyStep} className="text-gray-700 hover:text-gray-400 transition-colors" title="Copy">
            {copiedStep ? <ClipboardCheck className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </button>
        </div>
        <p className="text-cyan-300 text-xs font-mono leading-relaxed">{event.recommendedNextStep}</p>
      </div>

      {/* Timestamp */}
      <p className="text-gray-700 text-[10px] font-mono text-right">{event.timestamp}</p>
    </div>
  );
};

// ─── Posture card ─────────────────────────────────────────────────────────────

const PostureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  body: string;
  color: string;
}> = ({ icon, title, body, color }) => (
  <div className={`bg-gray-900/60 border rounded-xl p-5 ${color}`}>
    <div className="flex items-start space-x-3">
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div>
        <h4 className="text-white text-sm font-semibold mb-2">{title}</h4>
        <p className="text-gray-400 text-xs leading-relaxed">{body}</p>
      </div>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const IngestionSimulator: React.FC = () => {
  const [activeMode, setActiveMode] = useState<IngestionMode | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RawEventType | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string>(simulatedIngestionEvents[0].id);
  const [detailExpanded, setDetailExpanded] = useState(true);

  const filtered = useMemo(() => {
    let list = simulatedIngestionEvents;
    if (activeMode !== 'all') list = list.filter((e) => e.mode === activeMode);
    if (typeFilter !== 'all') list = list.filter((e) => e.rawEventType === typeFilter);
    return list;
  }, [activeMode, typeFilter]);

  const selected = simulatedIngestionEvents.find((e) => e.id === selectedId) ?? simulatedIngestionEvents[0];

  const allTypes = useMemo((): RawEventType[] => {
    const seen = new Set<RawEventType>();
    simulatedIngestionEvents.forEach((e) => seen.add(e.rawEventType));
    return Array.from(seen).sort();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center space-x-2 mb-1">
          <Radio className="h-5 w-5 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">Ingestion Simulator</h2>
        </div>
        <p className="text-gray-400 text-sm max-w-3xl">
          Demonstrates how SMI ingests AI workflow events across six ingestion modes. Each record shows
          the raw wire-format event, its normalized SMI representation, schema validation result,
          continuity impact, and recommended next step. All data is deterministic and synthetic.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start space-x-3 bg-amber-900/15 border border-amber-800/40 rounded-xl px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-amber-200/70 text-xs leading-relaxed">
          This simulator uses deterministic synthetic data. It does not process real enterprise traffic,
          claim production SLA or throughput guarantees, or represent an official F5 integration.
        </p>
      </div>

      {/* Mode tab strip */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveMode('all')}
          className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all duration-150 ${
            activeMode === 'all'
              ? 'bg-cyan-800/40 border-cyan-700/60 text-cyan-200'
              : 'bg-gray-900/60 border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <span>All Modes</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            activeMode === 'all' ? 'bg-cyan-700/50 text-cyan-200' : 'bg-gray-800 text-gray-500'
          }`}>{simulatedIngestionEvents.length}</span>
        </button>
        {ALL_MODES.map((mode) => (
          <ModeTab
            key={mode}
            mode={mode}
            active={activeMode === mode}
            count={MODE_EVENT_COUNTS[mode]}
            onClick={() => setActiveMode(mode)}
          />
        ))}
      </div>

      {/* Main content: table + detail */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* Event table */}
        <div className="xl:col-span-3 bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          {/* Table toolbar */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 bg-gray-900/40">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">Events</span>
              <span className="text-gray-700 text-xs">({filtered.length})</span>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-gray-600 text-xs">Type:</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as RawEventType | 'all')}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-cyan-700"
              >
                <option value="all">All</option>
                {allTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-900/30 border-b border-gray-800">
            <span className="text-gray-700 text-[10px] uppercase tracking-widest w-24 shrink-0">Mode</span>
            <span className="text-gray-700 text-[10px] uppercase tracking-widest w-24 shrink-0 hidden lg:block">Source</span>
            <span className="text-gray-700 text-[10px] uppercase tracking-widest w-16 shrink-0">WF</span>
            <span className="text-gray-700 text-[10px] uppercase tracking-widest flex-1">Event Type</span>
            <span className="text-gray-700 text-[10px] uppercase tracking-widest shrink-0">Schema</span>
            <span className="text-gray-700 text-[10px] uppercase tracking-widest w-10 text-right shrink-0">Pts</span>
            <span className="w-3.5 shrink-0" />
          </div>

          {/* Rows */}
          <div className="overflow-y-auto" style={{ maxHeight: '480px' }}>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-gray-600 text-sm">No events match the current filter.</p>
              </div>
            ) : (
              filtered.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  selected={selectedId === event.id}
                  onClick={() => { setSelectedId(event.id); setDetailExpanded(true); }}
                />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className="xl:col-span-2 bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setDetailExpanded(!detailExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/40 hover:bg-gray-800/40 transition-colors"
          >
            <div className="flex items-center space-x-2">
              <Info className="h-3.5 w-3.5 text-cyan-500" />
              <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Event Detail</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-600 transition-transform duration-150 ${detailExpanded ? 'rotate-180' : ''}`} />
          </button>
          {detailExpanded && (
            <div className="overflow-y-auto p-4" style={{ maxHeight: '540px' }}>
              <DetailPanel event={selected} />
            </div>
          )}
        </div>
      </div>

      {/* Posture cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <PostureCard
          icon={<Database className="h-4 w-4 text-blue-400" />}
          title="Ingestion Posture"
          color="border-blue-900/30"
          body="The current prototype demonstrates deterministic validation using synthetic and JSON-backed data. Production ingestion SLAs, throughput limits, bulk-processing capacity, and retention policies would be established during a scoped technical pilot based on event volume, latency requirements, data sensitivity, and deployment architecture."
        />
        <PostureCard
          icon={<Layers className="h-4 w-4 text-teal-400" />}
          title="Metadata-first Approach"
          color="border-teal-900/30"
          body="SMI does not require raw enterprise traffic for initial validation. The preferred pilot approach is metadata-first: baseline IDs, model/prompt/policy versions, tool-call metadata, guardrail events, workflow outcomes, timestamps, and selected de-identified summaries."
        />
        <PostureCard
          icon={<Clock className="h-4 w-4 text-gray-400" />}
          title="Bulk / Historical Replay"
          color="border-gray-700/40"
          body="For large historical datasets, SMI would use filtering, normalization, batch replay, and customer-defined sampling windows. The goal is to process relevant continuity signals rather than unnecessary raw data."
        />
      </div>
    </div>
  );
};

export default IngestionSimulator;
