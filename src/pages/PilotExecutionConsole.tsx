import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Terminal, ChevronRight, Copy, ClipboardCheck, Trash2, Info,
  AlertTriangle, BookLock, Activity, Layers, Hash, ListOrdered,
} from 'lucide-react';
import {
  parseCommand,
  executeCommand,
  getAutocompleteOptions,
  getCommandPreview,
  getContextualSuggestions,
  getActiveWorkflowId,
  getSessionState,
  clearAllSessions,
  CommandResult,
  OutputLine,
  OutputLineType,
  LifecycleStage,
} from '../services/commandExecutionService';
import { ContinuityScore, AuditLedgerRecord } from '../types/smi';

// ─── Output line styling ──────────────────────────────────────────────────────

function lineClass(type: OutputLineType): string {
  switch (type) {
    case 'header':    return 'text-cyan-400 font-bold';
    case 'step':      return 'text-white font-semibold';
    case 'info':      return 'text-gray-300';
    case 'score':     return 'text-white font-mono';
    case 'risk':      return 'text-orange-400 font-semibold';
    case 'finding':   return 'text-orange-300';
    case 'audit':     return 'text-gray-500 font-mono text-xs';
    case 'report':    return 'text-cyan-300';
    case 'success':   return 'text-green-400';
    case 'warn':      return 'text-yellow-400';
    case 'error':     return 'text-red-400';
    case 'hint':      return 'text-gray-500 text-xs';
    case 'separator': return 'text-gray-800 select-none';
    default:          return 'text-gray-400';
  }
}

function riskBadgeClass(risk: string) {
  if (risk === 'Approved') return 'bg-green-500/10 text-green-400 border-green-800/50';
  if (risk === 'Watch') return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/50';
  if (risk === 'Review Required') return 'bg-orange-500/10 text-orange-400 border-orange-800/50';
  return 'bg-red-500/10 text-red-400 border-red-800/50';
}

function stageBadgeClass(stage: LifecycleStage) {
  if (stage === 'idle') return 'text-gray-500 bg-gray-800 border-gray-700';
  if (stage === 'baseline') return 'text-cyan-400 bg-cyan-900/20 border-cyan-800/50';
  if (stage === 'changed') return 'text-yellow-400 bg-yellow-900/20 border-yellow-800/50';
  if (stage === 'scored') return 'text-white bg-gray-700/40 border-gray-600';
  if (stage === 'drifted') return 'text-orange-400 bg-orange-900/20 border-orange-800/50';
  if (stage === 'audited') return 'text-blue-400 bg-blue-900/20 border-blue-800/50';
  return 'text-green-400 bg-green-900/20 border-green-800/50';
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  result: CommandResult;
}

// ─── Terminal output line ─────────────────────────────────────────────────────

const OutputLineView: React.FC<{ line: OutputLine }> = ({ line: l }) => {
  if (l.type === 'separator') {
    return <div className="border-t border-gray-800 my-1" />;
  }
  return (
    <div className={`font-mono text-xs leading-relaxed whitespace-pre-wrap ${lineClass(l.type)}`}>
      {l.text}
    </div>
  );
};

// ─── Command result block ─────────────────────────────────────────────────────

const CommandResultView: React.FC<{ entry: HistoryEntry; index: number }> = ({ entry, index }) => {
  const { result } = entry;
  const ts = new Date(result.timestamp).toLocaleTimeString('en-US', { hour12: false });

  return (
    <div className="mb-3">
      <div className="flex items-center space-x-2 mb-1">
        <span className="text-green-500 font-mono text-xs select-none">❯</span>
        <span className="text-green-300 font-mono text-xs">{result.commandText}</span>
        <span className="text-gray-700 font-mono text-xs ml-auto">{ts} #{index + 1}</span>
      </div>
      <div className="pl-4 space-y-0.5">
        {result.lines.map((l, i) => (
          <OutputLineView key={i} line={l} />
        ))}
      </div>
    </div>
  );
};

// ─── Score panel ─────────────────────────────────────────────────────────────

const ScorePanel: React.FC<{ score: ContinuityScore | null }> = ({ score }) => {
  if (!score) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Activity className="h-4 w-4 text-gray-600" />
          <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">Last Continuity Score</span>
        </div>
        <p className="text-gray-700 text-xs">No score computed yet. Run: score continuity &lt;wf&gt;</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Activity className="h-4 w-4 text-cyan-500" />
        <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Last Continuity Score</span>
      </div>
      <div className="flex items-center space-x-3 mb-2">
        <span className="text-4xl font-bold text-white">{score.continuityScore}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riskBadgeClass(score.riskLevel)}`}>
          {score.riskLevel}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        {[
          { label: 'Drift', v: score.driftScore },
          { label: 'Policy Align', v: score.policyAlignment },
          { label: 'Tool Variance', v: score.toolBehaviorVariance },
          { label: 'State Degr.', v: score.stateDegradation },
        ].map((s) => (
          <div key={s.label} className="bg-gray-800/60 rounded p-1.5">
            <p className="text-white text-xs font-semibold">{s.v}</p>
            <p className="text-gray-600 text-xs">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-gray-600 text-xs">-{score.totalDeducted} pts | {score.deductions.length} event(s)</p>
      <p className="text-gray-700 text-xs mt-0.5">{new Date(score.computedAt).toLocaleTimeString()}</p>
    </div>
  );
};

// ─── Audit record panel ───────────────────────────────────────────────────────

const AuditPanel: React.FC<{ record: AuditLedgerRecord | null }> = ({ record }) => {
  if (!record) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <BookLock className="h-4 w-4 text-gray-600" />
          <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">Last Audit Record</span>
        </div>
        <p className="text-gray-700 text-xs">No audit record written yet. Run: write audit &lt;wf&gt;</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <BookLock className="h-4 w-4 text-cyan-500" />
        <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Last Audit Record</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">ID</span>
          <span className="text-cyan-400 font-mono text-xs">{record.id}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Action</span>
          <span className="text-gray-300 text-xs">{record.action.replace(/_/g, ' ')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Score</span>
          <span className="text-white font-bold text-xs">{record.continuityScoreSnapshot}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Risk</span>
          <span className={`text-xs ${riskBadgeClass(record.riskLevelSnapshot)} px-1.5 py-0.5 rounded-full border`}>{record.riskLevelSnapshot}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Hash</span>
          <span className="flex items-center space-x-1 text-cyan-700 font-mono text-xs">
            <Hash className="h-3 w-3" />
            <span>{record.currentHash.slice(0, 8)}</span>
          </span>
        </div>
        <p className="text-gray-700 font-mono text-xs truncate" title={record.policyRef}>{record.policyRef}</p>
      </div>
    </div>
  );
};

// ─── Workflow context panel ───────────────────────────────────────────────────

const WorkflowContextPanel: React.FC<{
  workflowId: string | null;
  stage: LifecycleStage;
  eventCount: number;
  runtimeTools: string[];
}> = ({ workflowId, stage, eventCount, runtimeTools }) => {
  if (!workflowId) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Layers className="h-4 w-4 text-gray-600" />
          <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">Workflow Context</span>
        </div>
        <p className="text-gray-700 text-xs">No active workflow. Try: list workflows</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Layers className="h-4 w-4 text-cyan-500" />
        <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Workflow Context</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Active Workflow</span>
          <span className="text-cyan-400 font-mono text-xs">{workflowId}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Lifecycle Stage</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${stageBadgeClass(stage)}`}>{stage}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Session Events</span>
          <span className="text-white text-xs font-semibold">{eventCount}</span>
        </div>
        {runtimeTools.length > 0 && (
          <div className="mt-1.5">
            <p className="text-gray-500 text-xs mb-1">Runtime Tools</p>
            <div className="flex flex-wrap gap-1">
              {runtimeTools.map((t) => (
                <span key={t} className="bg-gray-800 text-gray-400 text-xs px-1.5 py-0.5 rounded font-mono">{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Command preview ──────────────────────────────────────────────────────────

const CommandPreviewPanel: React.FC<{ input: string }> = ({ input }) => {
  const preview = getCommandPreview(input);
  if (!preview) {
    return (
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <Info className="h-4 w-4 text-gray-600" />
          <span className="text-gray-500 text-xs font-medium uppercase tracking-widest">Command Guide</span>
        </div>
        <p className="text-gray-700 text-xs">Type a command to see details. Try: help</p>
      </div>
    );
  }
  return (
    <div className="bg-gray-900/60 border border-cyan-900/40 rounded-xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Info className="h-4 w-4 text-cyan-500" />
        <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Command Guide</span>
      </div>
      <p className="text-cyan-400 font-mono text-xs font-bold mb-2">{preview.commandName}</p>
      <div className="space-y-2">
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider">Purpose</p>
          <p className="text-gray-300 text-xs leading-relaxed">{preview.purpose}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider">Effect</p>
          <p className="text-gray-400 text-xs">{preview.effect}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider">Audit Impact</p>
          <p className="text-gray-400 text-xs">{preview.auditImpact}</p>
        </div>
        <div>
          <p className="text-gray-600 text-xs uppercase tracking-wider">Next Step</p>
          <p className="text-cyan-700 font-mono text-xs">{preview.nextStep}</p>
        </div>
      </div>
    </div>
  );
};

// ─── Demo script panel ────────────────────────────────────────────────────────

const DEMO_STEPS: { label: string; command: string }[] = [
  { label: 'Show baseline',              command: 'show baseline wf-cs' },
  { label: 'Simulate prompt change',     command: 'simulate prompt_change wf-cs' },
  { label: 'Add tool access',            command: 'simulate tool_access_added wf-cs billing-api' },
  { label: 'Simulate unauthorized call', command: 'simulate unauthorized_tool_call wf-cs billing-api' },
  { label: 'Score continuity',           command: 'score continuity wf-cs' },
  { label: 'Detect drift',               command: 'detect drift wf-cs' },
  { label: 'Write audit record',         command: 'write audit wf-cs' },
  { label: 'Generate report',            command: 'generate report wf-cs' },
];

const DemoScriptPanel: React.FC<{ onSelect: (cmd: string) => void }> = ({ onSelect }) => (
  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
    <div className="flex items-center space-x-2 mb-1">
      <ListOrdered className="h-4 w-4 text-cyan-500" />
      <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Demo Script</span>
    </div>
    <p className="text-gray-600 text-xs mb-3">Click to load into input. Press Enter or Run to execute.</p>
    <div className="space-y-1">
      {DEMO_STEPS.map((step, i) => (
        <button
          key={step.command}
          onClick={() => onSelect(step.command)}
          className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-700/50 border border-gray-800 hover:border-cyan-900/50 transition-colors duration-150 group"
        >
          <span className="text-gray-700 font-mono text-xs w-4 shrink-0 text-right">{i + 1}.</span>
          <div className="min-w-0 flex-1">
            <p className="text-cyan-600 font-mono text-xs group-hover:text-cyan-400 truncate transition-colors">{step.command}</p>
            <p className="text-gray-600 text-xs">{step.label}</p>
          </div>
        </button>
      ))}
      <div className="flex items-center space-x-2 py-1">
        <div className="flex-1 border-t border-gray-800" />
        <span className="text-gray-700 text-xs shrink-0">or run the full chain</span>
        <div className="flex-1 border-t border-gray-800" />
      </div>
      <button
        onClick={() => onSelect('run lifecycle wf-cs')}
        className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-cyan-900/10 hover:bg-cyan-900/25 border border-cyan-900/30 hover:border-cyan-800/50 transition-colors duration-150 group"
      >
        <Terminal className="h-3 w-3 text-cyan-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
        <div className="min-w-0">
          <p className="text-cyan-500 font-mono text-xs group-hover:text-cyan-300 transition-colors">run lifecycle wf-cs</p>
          <p className="text-gray-600 text-xs">Full 9-step lifecycle in one command</p>
        </div>
      </button>
    </div>
  </div>
);

// ─── Contextual suggestions ───────────────────────────────────────────────────

const ContextualSuggestionsPanel: React.FC<{
  workflowId: string | null;
  stage: LifecycleStage;
  onSelect: (cmd: string) => void;
}> = ({ workflowId, stage, onSelect }) => {
  const suggestions = getContextualSuggestions(workflowId, stage);
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-widest mb-3">Suggested Next Commands</p>
      <div className="space-y-1.5">
        {suggestions.map((s) => (
          <button
            key={s.command}
            onClick={() => onSelect(s.command)}
            className="w-full text-left flex items-center space-x-2 px-2 py-1.5 rounded-lg bg-gray-800/40 hover:bg-gray-700/50 border border-gray-800 hover:border-gray-700 transition-colors duration-150 group"
          >
            <ChevronRight className="h-3 w-3 text-gray-600 group-hover:text-cyan-500 shrink-0 transition-colors" />
            <div className="min-w-0">
              <p className="text-cyan-600 font-mono text-xs group-hover:text-cyan-400 truncate transition-colors">{s.command}</p>
              <p className="text-gray-600 text-xs">{s.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const PilotExecutionConsole: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [inputHistoryIdx, setInputHistoryIdx] = useState(-1);
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [autocompleteIdx, setAutocompleteIdx] = useState(-1);
  const [copied, setCopied] = useState(false);

  // Context state — re-derived after each command
  const [activeWorkflowId, setActiveWorkflowId] = useState<string | null>(null);
  const [lifecycleStage, setLifecycleStage] = useState<LifecycleStage>('idle');
  const [lastScore, setLastScore] = useState<ContinuityScore | null>(null);
  const [lastAuditRecord, setLastAuditRecord] = useState<AuditLedgerRecord | null>(null);
  const [sessionEventCount, setSessionEventCount] = useState(0);
  const [runtimeTools, setRuntimeTools] = useState<string[]>([]);

  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [history]);

  const refreshContext = useCallback((wfId: string | null) => {
    const id = wfId ?? getActiveWorkflowId();
    setActiveWorkflowId(id);
    if (id) {
      const session = getSessionState(id);
      if (session) {
        setLifecycleStage(session.lifecycleStage);
        setLastScore(session.lastScore);
        setLastAuditRecord(session.lastAuditRecord);
        setSessionEventCount(session.accumulatedEvents.length);
        setRuntimeTools([...session.runtimeTools]);
      }
    }
  }, []);

  const handleSubmit = useCallback(() => {
    const cmd = inputValue.trim();
    if (!cmd) return;

    setAutocomplete([]);
    setAutocompleteIdx(-1);

    const parsed = parseCommand(cmd);
    const result = executeCommand(parsed);

    if (parsed.type === 'clear') {
      setHistory([]);
      setInputValue('');
      setInputHistory([]);
      setInputHistoryIdx(-1);
      setActiveWorkflowId(null);
      setLifecycleStage('idle');
      setLastScore(null);
      setLastAuditRecord(null);
      setSessionEventCount(0);
      setRuntimeTools([]);
      clearAllSessions();
      return;
    }

    setHistory((prev) => [...prev, { result }]);
    setInputHistory((prev) => [cmd, ...prev.slice(0, 49)]);
    setInputHistoryIdx(-1);
    setInputValue('');

    refreshContext(result.updatedWorkflowId ?? null);
  }, [inputValue, refreshContext]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocomplete.length > 0 && autocompleteIdx >= 0) {
        setInputValue(autocomplete[autocompleteIdx]);
        setAutocomplete([]);
        setAutocompleteIdx(-1);
      } else {
        handleSubmit();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const opts = getAutocompleteOptions(inputValue);
      if (opts.length === 1) {
        setInputValue(opts[0]);
        setAutocomplete([]);
      } else if (opts.length > 1) {
        setAutocomplete(opts);
        setAutocompleteIdx(0);
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (autocomplete.length > 0) {
        setAutocompleteIdx((prev) => Math.max(0, prev - 1));
      } else {
        const nextIdx = Math.min(inputHistoryIdx + 1, inputHistory.length - 1);
        setInputHistoryIdx(nextIdx);
        if (inputHistory[nextIdx]) setInputValue(inputHistory[nextIdx]);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (autocomplete.length > 0) {
        setAutocompleteIdx((prev) => Math.min(autocomplete.length - 1, prev + 1));
      } else {
        const nextIdx = Math.max(inputHistoryIdx - 1, -1);
        setInputHistoryIdx(nextIdx);
        setInputValue(nextIdx === -1 ? '' : inputHistory[nextIdx] ?? '');
      }
      return;
    }

    if (e.key === 'Escape') {
      setAutocomplete([]);
      setAutocompleteIdx(-1);
    }
  }, [autocomplete, autocompleteIdx, inputValue, inputHistory, inputHistoryIdx, handleSubmit]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setAutocomplete([]);
    setAutocompleteIdx(-1);
  }, []);

  const handleSuggestionSelect = useCallback((cmd: string) => {
    setInputValue(cmd);
    inputRef.current?.focus();
  }, []);

  const handleCopyOutput = useCallback(() => {
    const text = history.map((entry) => {
      const lines = [`> ${entry.result.commandText}`];
      entry.result.lines.forEach((l) => {
        if (l.type !== 'separator') lines.push(l.text);
      });
      return lines.join('\n');
    }).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [history]);

  const sessionStage = activeWorkflowId
    ? (getSessionState(activeWorkflowId)?.lifecycleStage ?? lifecycleStage)
    : lifecycleStage;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Pilot Execution Console</h2>
          </div>
          <p className="text-gray-400 text-sm">
            Deterministic command-line interface for executing SMI continuity assurance workflows.
            Type commands to drive the full pilot lifecycle — baseline to report.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0 ml-4">
          <button
            onClick={handleCopyOutput}
            disabled={history.length === 0}
            className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
          >
            {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Output'}</span>
          </button>
          <button
            onClick={() => {
              setHistory([]);
              setInputValue('');
              setInputHistory([]);
              setInputHistoryIdx(-1);
              setActiveWorkflowId(null);
              setLifecycleStage('idle');
              setLastScore(null);
              setLastAuditRecord(null);
              setSessionEventCount(0);
              setRuntimeTools([]);
              clearAllSessions();
            }}
            className="flex items-center space-x-1.5 bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-800/50 text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-200"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start space-x-3 bg-amber-900/15 border border-amber-800/40 rounded-xl px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-amber-200/70 text-xs leading-relaxed">
          This demo uses deterministic synthetic data and simulated F5-style event structures. It is not an
          official F5 integration and does not call external AI models.
        </p>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* ── Terminal panel ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col bg-black border border-gray-800 rounded-xl overflow-hidden" style={{ minHeight: '560px' }}>

          {/* Terminal header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-900/80 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-red-600/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-600/60" />
                <div className="w-3 h-3 rounded-full bg-green-600/60" />
              </div>
              <span className="text-gray-500 font-mono text-xs ml-2">smi-console — pilot-session-001</span>
            </div>
            <span className="text-gray-700 font-mono text-xs">{history.length} cmd{history.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Output area */}
          <div
            ref={terminalRef}
            className="flex-1 overflow-y-auto p-4 space-y-1"
            style={{ maxHeight: '440px' }}
            onClick={() => inputRef.current?.focus()}
          >
            {history.length === 0 && (
              <div className="space-y-1">
                <p className="text-green-500 font-mono text-xs">SMI Continuity Assurance Pilot Console v7.0</p>
                <p className="text-gray-600 font-mono text-xs">Deterministic command execution — no external AI — no random values</p>
                <p className="text-gray-700 font-mono text-xs">────────────────────────────────────────────────────</p>
                <p className="text-gray-500 font-mono text-xs">Type <span className="text-cyan-500">help</span> to see all commands.</p>
                <p className="text-gray-500 font-mono text-xs">Quick start: <span className="text-cyan-500">run lifecycle wf-cs</span></p>
                <p className="text-gray-700 font-mono text-xs mt-2">────────────────────────────────────────────────────</p>
              </div>
            )}
            {history.map((entry, i) => (
              <CommandResultView key={i} entry={entry} index={i} />
            ))}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-800 px-4 py-3 relative">
            {/* Autocomplete dropdown */}
            {autocomplete.length > 0 && (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-xl z-10">
                {autocomplete.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => { setInputValue(opt); setAutocomplete([]); setAutocompleteIdx(-1); inputRef.current?.focus(); }}
                    className={`w-full text-left px-3 py-1.5 font-mono text-xs transition-colors ${
                      i === autocompleteIdx ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center space-x-2">
              <span className="text-green-500 font-mono text-sm select-none">❯</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or press Tab to autocomplete..."
                className="flex-1 bg-transparent text-green-300 font-mono text-sm placeholder-gray-700 outline-none caret-green-400"
                autoFocus
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={handleSubmit}
                className="bg-cyan-800/50 hover:bg-cyan-700/60 border border-cyan-700/50 text-cyan-300 px-3 py-1 rounded text-xs font-mono transition-colors shrink-0"
              >
                Run
              </button>
            </div>
            <p className="text-gray-800 font-mono text-xs mt-1.5">
              Tab: autocomplete · ↑↓: history · Enter: submit · Esc: dismiss autocomplete
            </p>
          </div>
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="flex flex-col space-y-3">
          <WorkflowContextPanel
            workflowId={activeWorkflowId}
            stage={sessionStage}
            eventCount={sessionEventCount}
            runtimeTools={runtimeTools}
          />
          <ScorePanel score={lastScore} />
          <AuditPanel record={lastAuditRecord} />
          <DemoScriptPanel onSelect={handleSuggestionSelect} />
          <CommandPreviewPanel input={inputValue} />
          <ContextualSuggestionsPanel
            workflowId={activeWorkflowId}
            stage={sessionStage}
            onSelect={handleSuggestionSelect}
          />
        </div>
      </div>
    </div>
  );
};

export default PilotExecutionConsole;
