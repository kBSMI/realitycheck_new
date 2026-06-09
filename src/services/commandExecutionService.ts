import {
  AIWorkflow,
  AIWorkflowEvent,
  ContinuityScore,
  DriftFinding,
  AuditLedgerRecord,
  BaselineAnchor,
} from '../types/smi';
import { workflows } from '../data/workflows';
import { baselines as seedBaselines } from '../data/baselines';
import { workflowEvents as seedEvents } from '../data/events';
import { csWorkflow, csBaseline, csEvents, csF5Events } from '../data/lifecycleScenario';
import { getBaselineForWorkflow, captureBaseline } from './baselineService';
import { ingestWorkflowEvent } from './smiIngestionService';
import { computeContinuityScore } from './memoryMorphologyEngine';
import { detectDrift } from './driftDetectionService';
import {
  recordBaselineCaptured,
  recordEventIngested,
  recordScoreComputed,
  recordDriftDetected,
  getLedger,
} from './auditLedgerService';
import { generatePilotReport } from './pilotReportService';

// ─── Tool Name Normalization ──────────────────────────────────────────────────

const TOOL_ALIASES: Record<string, string> = {
  'billing_api': 'billing-api',
};

function normalizeTool(name: string): string {
  return TOOL_ALIASES[name.toLowerCase()] ?? name;
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export type OutputLineType =
  | 'header'
  | 'step'
  | 'info'
  | 'score'
  | 'risk'
  | 'finding'
  | 'audit'
  | 'report'
  | 'success'
  | 'warn'
  | 'error'
  | 'hint'
  | 'separator';

export interface OutputLine {
  type: OutputLineType;
  text: string;
}

export interface CommandResult {
  commandText: string;
  timestamp: string;
  lines: OutputLine[];
  updatedWorkflowId?: string;
}

// ─── Command Preview ──────────────────────────────────────────────────────────

export interface CommandPreview {
  commandName: string;
  purpose: string;
  effect: string;
  auditImpact: string;
  nextStep: string;
}

// ─── Session State ────────────────────────────────────────────────────────────

export type LifecycleStage = 'idle' | 'baseline' | 'changed' | 'scored' | 'drifted' | 'audited' | 'reported';

interface WorkflowSessionState {
  accumulatedEvents: AIWorkflowEvent[];
  runtimeTools: string[];
  lastScore: ContinuityScore | null;
  lastFindings: DriftFinding[];
  lastAuditRecord: AuditLedgerRecord | null;
  lifecycleStage: LifecycleStage;
}

const _sessions = new Map<string, WorkflowSessionState>();

let _activeWorkflowId: string | null = null;

function getOrInitSession(workflowId: string): WorkflowSessionState {
  if (!_sessions.has(workflowId)) {
    const bl = resolveBaseline(workflowId);
    const runtimeTools = bl ? [...bl.policyConfig.allowedTools] : [];
    _sessions.set(workflowId, {
      accumulatedEvents: [],
      runtimeTools,
      lastScore: null,
      lastFindings: [],
      lastAuditRecord: null,
      lifecycleStage: 'idle',
    });
  }
  return _sessions.get(workflowId)!;
}

function resetSession(workflowId: string): void {
  const bl = resolveBaseline(workflowId);
  const runtimeTools = bl ? [...bl.policyConfig.allowedTools] : [];
  _sessions.set(workflowId, {
    accumulatedEvents: [],
    runtimeTools,
    lastScore: null,
    lastFindings: [],
    lastAuditRecord: null,
    lifecycleStage: 'idle',
  });
}

export function clearAllSessions(): void {
  _sessions.clear();
  _activeWorkflowId = null;
}

export function getActiveWorkflowId(): string | null {
  return _activeWorkflowId;
}

export function getSessionState(workflowId: string): WorkflowSessionState | null {
  return _sessions.get(workflowId) ?? null;
}

// ─── Workflow / Baseline Resolvers ────────────────────────────────────────────

const ALL_WORKFLOWS: AIWorkflow[] = [...workflows, csWorkflow];
const ALL_WORKFLOW_IDS = ALL_WORKFLOWS.map((w) => w.id);

function resolveWorkflow(workflowId: string): AIWorkflow | undefined {
  return ALL_WORKFLOWS.find((w) => w.id === workflowId);
}

function resolveBaseline(workflowId: string): BaselineAnchor | undefined {
  if (workflowId === 'wf-cs') return csBaseline;
  // Check service store first, then fall back to seed
  const fromService = getBaselineForWorkflow(workflowId);
  if (fromService) return fromService;
  return seedBaselines.find((b) => b.workflowId === workflowId);
}

function resolveSeedEvents(workflowId: string): AIWorkflowEvent[] {
  if (workflowId === 'wf-cs') return csEvents;
  return seedEvents.filter((e) => e.workflowId === workflowId);
}

// Build a transient workflow object that reflects runtime tool additions
function buildRuntimeWorkflow(workflowId: string): AIWorkflow | undefined {
  const wf = resolveWorkflow(workflowId);
  if (!wf) return undefined;
  const session = _sessions.get(workflowId);
  if (!session) return wf;
  return {
    ...wf,
    policyConfig: {
      ...wf.policyConfig,
      allowedTools: [...session.runtimeTools],
    },
  };
}

// ─── Parsed Command Types ─────────────────────────────────────────────────────

type ParsedCommand =
  | { type: 'help' }
  | { type: 'list_workflows' }
  | { type: 'show_baseline'; workflowId: string }
  | { type: 'run_baseline'; workflowId: string }
  | { type: 'simulate_normal'; workflowId: string }
  | { type: 'simulate_prompt_change'; workflowId: string }
  | { type: 'simulate_policy_mismatch'; workflowId: string }
  | { type: 'simulate_tool_access_added'; workflowId: string; toolName: string }
  | { type: 'simulate_unauthorized_tool'; workflowId: string; toolName: string }
  | { type: 'simulate_guardrail_violation'; workflowId: string }
  | { type: 'simulate_memory_state_change'; workflowId: string }
  | { type: 'score_continuity'; workflowId: string }
  | { type: 'detect_drift'; workflowId: string }
  | { type: 'write_audit'; workflowId: string }
  | { type: 'generate_report'; workflowId: string }
  | { type: 'run_lifecycle'; workflowId: string }
  | { type: 'clear' }
  | { type: 'unknown'; input: string };

// ─── Command Parser ───────────────────────────────────────────────────────────

export function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().toLowerCase().split(/\s+/);
  const [t0, t1, t2, t3] = tokens;

  if (t0 === 'help') return { type: 'help' };
  if (t0 === 'clear') return { type: 'clear' };
  if (t0 === 'list' && t1 === 'workflows') return { type: 'list_workflows' };

  if (t0 === 'show' && t1 === 'baseline' && t2) return { type: 'show_baseline', workflowId: t2 };
  if (t0 === 'run' && t1 === 'baseline' && t2) return { type: 'run_baseline', workflowId: t2 };
  if (t0 === 'run' && t1 === 'lifecycle' && t2) return { type: 'run_lifecycle', workflowId: t2 };
  if (t0 === 'score' && t1 === 'continuity' && t2) return { type: 'score_continuity', workflowId: t2 };
  if (t0 === 'detect' && t1 === 'drift' && t2) return { type: 'detect_drift', workflowId: t2 };
  if (t0 === 'write' && t1 === 'audit' && t2) return { type: 'write_audit', workflowId: t2 };
  if (t0 === 'generate' && t1 === 'report' && t2) return { type: 'generate_report', workflowId: t2 };

  if (t0 === 'simulate' && t2) {
    if (t1 === 'normal_event') return { type: 'simulate_normal', workflowId: t2 };
    if (t1 === 'prompt_change') return { type: 'simulate_prompt_change', workflowId: t2 };
    if (t1 === 'policy_mismatch') return { type: 'simulate_policy_mismatch', workflowId: t2 };
    if (t1 === 'guardrail_violation') return { type: 'simulate_guardrail_violation', workflowId: t2 };
    if (t1 === 'memory_state_change') return { type: 'simulate_memory_state_change', workflowId: t2 };
    if (t1 === 'tool_access_added' && t3) return { type: 'simulate_tool_access_added', workflowId: t2, toolName: t3 };
    if (t1 === 'unauthorized_tool_call' && t3) return { type: 'simulate_unauthorized_tool', workflowId: t2, toolName: t3 };
  }

  return { type: 'unknown', input };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function line(type: OutputLineType, text: string): OutputLine {
  return { type, text };
}

function sep(): OutputLine {
  return { type: 'separator', text: '─'.repeat(52) };
}

function riskColor(risk: string): OutputLineType {
  if (risk === 'Approved') return 'success';
  if (risk === 'Watch') return 'warn';
  if (risk === 'Review Required') return 'risk';
  return 'error';
}

let _eventCounter = 1000;
function nextEventId(workflowId: string): string {
  return `evt-console-${workflowId}-${_eventCounter++}`;
}

// ─── Command Executor ─────────────────────────────────────────────────────────

export function executeCommand(parsed: ParsedCommand): CommandResult {
  const now = new Date().toISOString();

  switch (parsed.type) {

    // ── help ────────────────────────────────────────────────────────────────
    case 'help': {
      return {
        commandText: 'help',
        timestamp: now,
        lines: [
          line('header', 'SMI Pilot Execution Console — Command Reference'),
          sep(),
          line('info', 'DISCOVERY'),
          line('hint', '  help                                    — show this reference'),
          line('hint', '  list workflows                          — list all pilot workflows'),
          line('hint', '  show baseline <workflow_id>             — inspect baseline anchor'),
          sep(),
          line('info', 'BASELINE'),
          line('hint', '  run baseline <workflow_id>              — capture live baseline'),
          sep(),
          line('info', 'SIMULATION'),
          line('hint', '  simulate normal_event <wf>              — ingest nominal operation event'),
          line('hint', '  simulate prompt_change <wf>             — simulate prompt version drift'),
          line('hint', '  simulate policy_mismatch <wf>           — simulate policy version mismatch'),
          line('hint', '  simulate tool_access_added <wf> <tool>  — add tool to runtime session state'),
          line('hint', '  simulate unauthorized_tool_call <wf> <tool> — simulate unauthorized tool use'),
          line('hint', '  simulate guardrail_violation <wf>       — simulate guardrail rule breach'),
          line('hint', '  simulate memory_state_change <wf>       — simulate memory/state drift'),
          sep(),
          line('info', 'SCORING & DRIFT'),
          line('hint', '  score continuity <wf>                   — compute continuity score'),
          line('hint', '  detect drift <wf>                       — run drift detection rules'),
          sep(),
          line('info', 'AUDIT & REPORT'),
          line('hint', '  write audit <wf>                        — write audit ledger records'),
          line('hint', '  generate report <wf>                    — generate pilot report'),
          sep(),
          line('info', 'LIFECYCLE (full pilot chain)'),
          line('hint', '  run lifecycle wf-cs                     — execute curated Customer Support AI scenario'),
          line('hint', '  run lifecycle <wf>                      — replay seed scenario for workflow'),
          sep(),
          line('info', 'UTILITY'),
          line('hint', '  clear                                   — clear terminal and reset session'),
          sep(),
          line('hint', 'Workflow IDs: wf-001  wf-002  wf-003  wf-004  wf-005  wf-cs'),
        ],
      };
    }

    // ── list workflows ───────────────────────────────────────────────────────
    case 'list_workflows': {
      const lines: OutputLine[] = [
        line('header', 'Registered AI Workflows'),
        sep(),
      ];
      for (const wf of ALL_WORKFLOWS) {
        const bl = resolveBaseline(wf.id);
        const seedEvts = resolveSeedEvents(wf.id);
        lines.push(line('info', `${wf.id.padEnd(8)} ${wf.name}`));
        lines.push(line('hint', `         Owner: ${wf.owner} | Env: ${wf.environment} | Events: ${seedEvts.length} | Baseline: ${bl ? bl.id : 'none'}`));
      }
      lines.push(sep());
      lines.push(line('hint', 'Try: show baseline <workflow_id>  or  run lifecycle wf-cs'));
      return { commandText: 'list workflows', timestamp: now, lines };
    }

    // ── show baseline ────────────────────────────────────────────────────────
    case 'show_baseline': {
      const wfId = parsed.workflowId;
      const bl = resolveBaseline(wfId);
      if (!bl) {
        return {
          commandText: `show baseline ${wfId}`,
          timestamp: now,
          lines: [
            line('error', `No baseline found for workflow "${wfId}".`),
            line('hint', `Try: run baseline ${wfId}`),
            line('hint', `Or: list workflows — to see available workflow IDs`),
          ],
        };
      }
      _activeWorkflowId = wfId;
      return {
        commandText: `show baseline ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('header', `Baseline Anchor: ${bl.id}`),
          sep(),
          line('info', `Workflow       : ${wfId}`),
          line('info', `Captured by    : ${bl.capturedBy}`),
          line('info', `Captured at    : ${new Date(bl.capturedAt).toLocaleString()}`),
          line('info', `Approved risk  : ${bl.approvedRiskLevel}`),
          sep(),
          line('info', `Model          : ${bl.modelConfig.modelId} v${bl.modelConfig.version}`),
          line('info', `Prompt         : ${bl.promptConfig.promptId} v${bl.promptConfig.version}`),
          line('info', `Prompt hash    : ${bl.promptConfig.hash.slice(0, 8)}...`),
          line('info', `Policy         : ${bl.policyConfig.policyId} v${bl.policyConfig.version}`),
          line('info', `Guardrails     : ${bl.policyConfig.guardrailsEnabled ? 'ENABLED' : 'DISABLED'}`),
          line('info', `Approved tools : ${bl.policyConfig.allowedTools.join(', ')}`),
          sep(),
          line('hint', `Notes: ${bl.notes || '—'}`),
          line('hint', `Next: simulate prompt_change ${wfId}  or  run lifecycle ${wfId}`),
        ],
      };
    }

    // ── run baseline ─────────────────────────────────────────────────────────
    case 'run_baseline': {
      const wfId = parsed.workflowId;
      const wf = resolveWorkflow(wfId);
      if (!wf) {
        return {
          commandText: `run baseline ${wfId}`,
          timestamp: now,
          lines: [line('error', `Unknown workflow "${wfId}". Try: list workflows`)],
        };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const anchor = captureBaseline(wf, {
        workflowId: wfId,
        capturedBy: 'console-operator',
        sessionRef: 'session-console-001',
        approvedRiskLevel: 'Approved',
        notes: 'Baseline captured via Pilot Execution Console',
      });
      const auditRec = recordBaselineCaptured(
        'session-console-001', wfId, anchor.id,
        'console-operator', 'enterprise-ai-policy::2.1.0',
        `Baseline ${anchor.id} captured via console for ${wf.name}`
      );
      session.lastAuditRecord = auditRec;
      session.lifecycleStage = 'baseline';
      return {
        commandText: `run baseline ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('success', `Baseline captured: ${anchor.id}`),
          sep(),
          line('info', `Workflow   : ${wf.name} (${wfId})`),
          line('info', `Model      : ${anchor.modelConfig.modelId} v${anchor.modelConfig.version}`),
          line('info', `Prompt     : ${anchor.promptConfig.promptId} v${anchor.promptConfig.version}`),
          line('info', `Policy     : ${anchor.policyConfig.version} — guardrails ${anchor.policyConfig.guardrailsEnabled ? 'ENABLED' : 'DISABLED'}`),
          line('info', `Tools      : ${anchor.policyConfig.allowedTools.join(', ')}`),
          line('audit', `Audit record written: ${auditRec.id} (baseline_captured)`),
          line('hint', `Next: simulate prompt_change ${wfId}`),
        ],
      };
    }

    // ── simulate normal_event ────────────────────────────────────────────────
    case 'simulate_normal': {
      const wfId = parsed.workflowId;
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate normal_event ${wfId}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'nominal_operation',
        severity: 'info',
        description: 'Nominal operation — workflow executing within approved parameters.',
        payload: {},
      });
      session.accumulatedEvents.push(result.normalized);
      return {
        commandText: `simulate normal_event ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('success', `Event ingested: nominal_operation`),
          line('info', `Event ID   : ${result.normalized.id}`),
          line('info', `Severity   : ${result.normalized.severity}`),
          line('info', `Routing    : ${result.routingDecision}`),
          line('info', `Score impact: 0 pts (nominal operations carry no deduction)`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate prompt_change ───────────────────────────────────────────────
    case 'simulate_prompt_change': {
      const wfId = parsed.workflowId;
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate prompt_change ${wfId}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'prompt_version_change',
        severity: 'medium',
        description: 'Prompt version changed — hash mismatch detected. Content has changed, not a cosmetic bump.',
        payload: {
          previousPromptVersion: bl?.promptConfig.version ?? '1.0.0',
          newPromptVersion: bumpVersion(bl?.promptConfig.version ?? '1.0.0'),
          promptHashMatch: false,
        },
      });
      session.accumulatedEvents.push(result.normalized);
      session.lifecycleStage = session.lifecycleStage === 'idle' ? 'changed' : session.lifecycleStage;
      return {
        commandText: `simulate prompt_change ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('warn', `Controlled change: prompt_version_change`),
          line('info', `Event ID       : ${result.normalized.id}`),
          line('info', `Previous version: ${bl?.promptConfig.version ?? '?'}`),
          line('info', `New version    : ${bumpVersion(bl?.promptConfig.version ?? '1.0.0')}`),
          line('info', `Hash match     : false — content has changed`),
          line('score', `Score impact   : -12 pts (hash mismatch)`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate policy_mismatch ─────────────────────────────────────────────
    case 'simulate_policy_mismatch': {
      const wfId = parsed.workflowId;
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate policy_mismatch ${wfId}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'policy_version_mismatch',
        severity: 'high',
        description: 'Policy version mismatch — live workflow running on outdated policy version.',
        payload: {
          expectedPolicyVersion: bl?.policyConfig.version ?? '2.1.0',
          actualPolicyVersion: '1.8.0',
        },
      });
      session.accumulatedEvents.push(result.normalized);
      session.lifecycleStage = session.lifecycleStage === 'idle' ? 'changed' : session.lifecycleStage;
      return {
        commandText: `simulate policy_mismatch ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('warn', `Policy drift detected: policy_version_mismatch`),
          line('info', `Event ID         : ${result.normalized.id}`),
          line('info', `Expected policy  : ${bl?.policyConfig.version ?? '2.1.0'}`),
          line('info', `Actual policy    : 1.8.0`),
          line('score', `Score impact     : -15 pts`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate tool_access_added ───────────────────────────────────────────
    case 'simulate_tool_access_added': {
      const { workflowId: wfId, toolName: rawToolName } = parsed;
      const toolName = normalizeTool(rawToolName);
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate tool_access_added ${wfId} ${toolName}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      if (!session.runtimeTools.includes(toolName)) {
        session.runtimeTools.push(toolName);
      }
      session.lifecycleStage = session.lifecycleStage === 'idle' ? 'changed' : session.lifecycleStage;
      return {
        commandText: `simulate tool_access_added ${wfId} ${toolName}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('info', `[1] Runtime session updated: ${toolName} added to active toolset`),
          line('info', `[2] Controlled change recorded: tool_access_added`),
          line('info', `[3] SMI will evaluate whether the expanded tool access remains within approved behavior boundaries`),
          line('hint', `[4] Next suggested command: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate unauthorized_tool_call ──────────────────────────────────────
    case 'simulate_unauthorized_tool': {
      const { workflowId: wfId, toolName: rawToolName } = parsed;
      const toolName = normalizeTool(rawToolName);
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate unauthorized_tool_call ${wfId} ${toolName}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'unauthorized_tool_call',
        severity: 'high',
        description: `Agent invoked "${toolName}" — not in the approved baseline tool list.`,
        payload: {
          toolName,
          toolCallArgs: `{"tool":"${toolName}","invocationContext":"console-simulation"}`,
        },
      });
      session.accumulatedEvents.push(result.normalized);
      return {
        commandText: `simulate unauthorized_tool_call ${wfId} ${toolName}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('warn', `Unauthorized tool call: ${toolName}`),
          line('info', `Event ID       : ${result.normalized.id}`),
          line('info', `Tool invoked   : ${toolName}`),
          line('info', `Status         : not in approved baseline tool list`),
          line('score', `Score impact   : -10 pts`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate guardrail_violation ─────────────────────────────────────────
    case 'simulate_guardrail_violation': {
      const wfId = parsed.workflowId;
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate guardrail_violation ${wfId}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'guardrail_violation',
        severity: 'critical',
        description: 'Guardrail rule breach detected — active policy constraint violated.',
        payload: {
          guardrailId: 'grl-policy-enforcement-001',
          guardrailRule: 'enterprise-ai-policy::2.1.0::output-constraint',
        },
      });
      session.accumulatedEvents.push(result.normalized);
      return {
        commandText: `simulate guardrail_violation ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('error', `Guardrail violation ingested`),
          line('info', `Event ID       : ${result.normalized.id}`),
          line('info', `Guardrail rule : enterprise-ai-policy::2.1.0::output-constraint`),
          line('score', `Score impact   : -15 pts`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── simulate memory_state_change ─────────────────────────────────────────
    case 'simulate_memory_state_change': {
      const wfId = parsed.workflowId;
      if (!resolveWorkflow(wfId)) {
        return { commandText: `simulate memory_state_change ${wfId}`, timestamp: now, lines: [line('error', `Unknown workflow "${wfId}".`)] };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const bl = resolveBaseline(wfId);
      const result = ingestWorkflowEvent({
        workflowId: wfId,
        baselineId: bl?.id ?? 'bl-unknown',
        eventType: 'memory_state_change',
        severity: 'medium',
        description: 'Memory or session state changed — deviation from approved baseline state recorded.',
        payload: {
          stateKey: 'session-context',
          previousStateHash: 'aabb1122',
          newStateHash: 'ccdd3344',
        },
      });
      session.accumulatedEvents.push(result.normalized);
      return {
        commandText: `simulate memory_state_change ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('warn', `Memory state change ingested`),
          line('info', `Event ID       : ${result.normalized.id}`),
          line('info', `State key      : session-context`),
          line('info', `Hash changed   : aabb1122 → ccdd3344`),
          line('score', `Score impact   : -8 pts`),
          line('hint', `Next: score continuity ${wfId}`),
        ],
      };
    }

    // ── score continuity ─────────────────────────────────────────────────────
    case 'score_continuity': {
      const wfId = parsed.workflowId;
      const wf = buildRuntimeWorkflow(wfId);
      const bl = resolveBaseline(wfId);
      if (!wf || !bl) {
        return {
          commandText: `score continuity ${wfId}`,
          timestamp: now,
          lines: [
            line('error', `Cannot score — workflow or baseline not found for "${wfId}".`),
            line('hint', `Try: run baseline ${wfId}`),
          ],
        };
      }
      _activeWorkflowId = wfId;
      const session = getOrInitSession(wfId);
      const allEvents = [...resolveSeedEvents(wfId), ...session.accumulatedEvents];
      const score = computeContinuityScore(wf, bl, allEvents);
      session.lastScore = score;
      session.lifecycleStage = 'scored';

      const deductionLines = score.deductions.map((d) =>
        line('score', `  ${d.reason.padEnd(30)} -${d.points} pts  [${d.eventId}]`)
      );

      return {
        commandText: `score continuity ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('header', `Continuity Score: ${score.continuityScore}/100`),
          sep(),
          line(riskColor(score.riskLevel), `Risk Level     : ${score.riskLevel}`),
          line('info', `Workflow       : ${wfId}`),
          line('info', `Baseline       : ${bl.id}`),
          line('info', `Events scored  : ${allEvents.length} (${session.accumulatedEvents.length} from console session)`),
          line('info', `Total deducted : -${score.totalDeducted} pts`),
          sep(),
          line('info', 'Deductions:'),
          ...deductionLines,
          sep(),
          line('info', `Sub-scores:`),
          line('hint', `  Drift score         : ${score.driftScore}`),
          line('hint', `  Policy alignment    : ${score.policyAlignment}`),
          line('hint', `  Tool behavior var.  : ${score.toolBehaviorVariance}`),
          line('hint', `  State degradation   : ${score.stateDegradation}`),
          sep(),
          line('info', `Recommended action: ${score.recommendedAction}`),
          line('hint', `Next: detect drift ${wfId}`),
        ],
      };
    }

    // ── detect drift ─────────────────────────────────────────────────────────
    case 'detect_drift': {
      const wfId = parsed.workflowId;
      const wf = buildRuntimeWorkflow(wfId);
      const bl = resolveBaseline(wfId);
      const session = getOrInitSession(wfId);
      if (!wf || !bl) {
        return {
          commandText: `detect drift ${wfId}`,
          timestamp: now,
          lines: [line('error', `Cannot detect drift — workflow or baseline not found for "${wfId}".`)],
        };
      }
      if (!session.lastScore) {
        return {
          commandText: `detect drift ${wfId}`,
          timestamp: now,
          lines: [
            line('warn', `No continuity score available for ${wfId}.`),
            line('hint', `Run: score continuity ${wfId}  first.`),
          ],
        };
      }
      _activeWorkflowId = wfId;
      const allEvents = [...resolveSeedEvents(wfId), ...session.accumulatedEvents];
      const findings = detectDrift(wf, bl, allEvents, session.lastScore);
      session.lastFindings = findings;
      session.lifecycleStage = 'drifted';

      if (findings.length === 0) {
        return {
          commandText: `detect drift ${wfId}`,
          timestamp: now,
          updatedWorkflowId: wfId,
          lines: [
            line('success', `No drift findings detected for ${wfId}.`),
            line('hint', `Next: write audit ${wfId}`),
          ],
        };
      }

      const findingLines: OutputLine[] = [];
      findings.forEach((f, i) => {
        findingLines.push(line('finding', `[${i + 1}] ${f.title}`));
        findingLines.push(line('info', `    Category  : ${f.category}`));
        findingLines.push(line('info', `    Severity  : ${f.severity}`));
        findingLines.push(line('info', `    Magnitude : ${f.driftMagnitude}/100`));
        findingLines.push(line('info', `    Remediation required: ${f.requiresRemediation}`));
      });

      return {
        commandText: `detect drift ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('header', `Drift Detection: ${findings.length} finding(s)`),
          sep(),
          ...findingLines,
          sep(),
          line('hint', `Next: write audit ${wfId}`),
        ],
      };
    }

    // ── write audit ──────────────────────────────────────────────────────────
    case 'write_audit': {
      const wfId = parsed.workflowId;
      const session = getOrInitSession(wfId);
      if (!session.lastScore) {
        return {
          commandText: `write audit ${wfId}`,
          timestamp: now,
          lines: [
            line('warn', `No score available for ${wfId}. Run score continuity first.`),
            line('hint', `Run: score continuity ${wfId}`),
          ],
        };
      }
      _activeWorkflowId = wfId;
      const bl = resolveBaseline(wfId);
      const policyRef = 'enterprise-ai-policy::2.1.0::console-session';
      const scoreRec = recordScoreComputed('session-console-001', session.lastScore, policyRef);
      session.lastAuditRecord = scoreRec;

      const auditLines: OutputLine[] = [
        line('header', 'Audit Ledger — Records Written'),
        sep(),
        line('audit', `Score record : ${scoreRec.id} (score_computed)`),
        line('info', `  Score snapshot : ${scoreRec.continuityScoreSnapshot}`),
        line('info', `  Risk snapshot  : ${scoreRec.riskLevelSnapshot}`),
        line('info', `  Hash           : ${scoreRec.currentHash.slice(0, 8)}...`),
      ];

      session.lastFindings.forEach((f) => {
        const driftRec = recordDriftDetected('session-console-001', f, session.lastScore!, policyRef);
        auditLines.push(line('audit', `Drift record : ${driftRec.id} (drift_detected)`));
        auditLines.push(line('info', `  Finding      : ${f.title}`));
        auditLines.push(line('info', `  Hash         : ${driftRec.currentHash.slice(0, 8)}...`));
        if (!session.lastAuditRecord || new Date(driftRec.timestamp) > new Date(session.lastAuditRecord.timestamp)) {
          session.lastAuditRecord = driftRec;
        }
      });

      session.lifecycleStage = 'audited';
      auditLines.push(sep());
      auditLines.push(line('hint', `Baseline: ${bl?.id ?? '—'}  |  Policy: ${policyRef}`));
      auditLines.push(line('hint', `Next: generate report ${wfId}`));

      return {
        commandText: `write audit ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: auditLines,
      };
    }

    // ── generate report ──────────────────────────────────────────────────────
    case 'generate_report': {
      const wfId = parsed.workflowId;
      const session = getOrInitSession(wfId);
      if (!session.lastScore) {
        return {
          commandText: `generate report ${wfId}`,
          timestamp: now,
          lines: [
            line('warn', `No score available for ${wfId}.`),
            line('hint', `Run: score continuity ${wfId}  then  write audit ${wfId}`),
          ],
        };
      }
      _activeWorkflowId = wfId;
      const ledgerRecords = getLedger().filter((r) => r.workflowId === wfId);
      const report = generatePilotReport({
        sessionId: 'session-console-001',
        generatedBy: 'console-operator',
        pilotPhase: 'Phase 7 — Console Execution',
        scores: [session.lastScore],
        findings: session.lastFindings,
        auditRecords: ledgerRecords,
        f5Results: wfId === 'wf-cs'
          ? csF5Events.map((e) => ({ workflowId: e.workflowId, source: e.source, classification: e.classification, continuityDelta: e.continuityDelta }))
          : [],
      });
      session.lifecycleStage = 'reported';
      return {
        commandText: `generate report ${wfId}`,
        timestamp: now,
        updatedWorkflowId: wfId,
        lines: [
          line('header', `Pilot Report: ${report.id}`),
          sep(),
          line('info', `Session        : ${report.sessionId}`),
          line('info', `Phase          : ${report.pilotPhase}`),
          line('info', `Generated      : ${new Date(report.generatedAt).toLocaleString()}`),
          line('info', `Audit records  : ${report.totalAuditRecords}`),
          line('info', `Session score  : ${report.sessionAuditScore}`),
          sep(),
          line('report', 'Key Findings:'),
          ...report.keyFindings.map((f) => line('info', `  • ${f}`)),
          sep(),
          line('report', 'SMI Value Demonstrated:'),
          ...report.smiValueDemonstrated.map((v) => line('hint', `  • ${v}`)),
          sep(),
          line(report.approvedForNextPhase ? 'success' : 'warn',
            `Approved for next phase: ${report.approvedForNextPhase ? 'YES' : 'NO'}`),
        ],
      };
    }

    // ── run lifecycle ─────────────────────────────────────────────────────────
    case 'run_lifecycle': {
      const wfId = parsed.workflowId;
      if (wfId === 'wf-cs') return runLifecycleCurated(now);
      return runLifecycleSeed(wfId, now);
    }

    // ── clear ─────────────────────────────────────────────────────────────────
    case 'clear': {
      clearAllSessions();
      return { commandText: 'clear', timestamp: now, lines: [] };
    }

    // ── unknown ───────────────────────────────────────────────────────────────
    case 'unknown': {
      const input = parsed.input;
      const partial = input.toLowerCase().split(/\s+/)[0];
      const suggestions = COMMAND_SUGGESTIONS.filter((c) => c.startsWith(partial)).slice(0, 4);
      return {
        commandText: input,
        timestamp: now,
        lines: [
          line('error', `Unrecognized command: "${input}"`),
          line('hint', `Type "help" for a full command reference.`),
          ...(suggestions.length > 0
            ? [line('hint', `Did you mean: ${suggestions.join('  |  ')}`)]
            : []),
          line('hint', `Quick start: list workflows  |  run lifecycle wf-cs`),
        ],
      };
    }
  }
}

// ─── Curated Lifecycle: wf-cs ─────────────────────────────────────────────────

function runLifecycleCurated(now: string): CommandResult {
  resetSession('wf-cs');
  const session = getOrInitSession('wf-cs');
  _activeWorkflowId = 'wf-cs';

  // Step 1 — Baseline
  const blRecord = recordBaselineCaptured(
    'session-console-001', 'wf-cs', csBaseline.id,
    'console-operator', 'enterprise-ai-policy::2.1.0',
    'Baseline bl-cs loaded — Customer Support AI approved state'
  );
  session.lastAuditRecord = blRecord;
  session.lifecycleStage = 'baseline';

  // Step 2 — Controlled changes (two events)
  const promptEvt = ingestWorkflowEvent({
    workflowId: 'wf-cs', baselineId: csBaseline.id,
    eventType: 'prompt_version_change', severity: 'medium',
    description: 'Prompt version bumped 2.0.0→2.1.0 (hash mismatch)',
    payload: { previousPromptVersion: '2.0.0', newPromptVersion: '2.1.0', promptHashMatch: false },
  });

  // Also reflect tool access expansion in runtime state
  session.runtimeTools.push('billing-api');
  session.lifecycleStage = 'changed';

  // Step 3 — Ingest all three canonical csEvents
  for (const evt of csEvents) {
    session.accumulatedEvents.push(evt);
  }

  const ingestRecord = recordEventIngested(
    'session-console-001', 'wf-cs', csBaseline.id,
    promptEvt.normalized.id, { workflowId: 'wf-cs', baselineId: csBaseline.id, computedAt: now, continuityScore: 88, driftScore: 24, policyAlignment: 100, toolBehaviorVariance: 90, stateDegradation: 0, riskLevel: 'Watch', deductions: [], totalDeducted: 12, recommendedAction: '' },
    'enterprise-ai-policy::2.1.0::prompt-version-gate',
    'F5-style simulated event ingested alongside prompt change'
  );
  session.lastAuditRecord = ingestRecord;

  // Step 4 — Score
  const runtimeWf = buildRuntimeWorkflow('wf-cs')!;
  const score = computeContinuityScore(runtimeWf, csBaseline, session.accumulatedEvents);
  session.lastScore = score;
  session.lifecycleStage = 'scored';

  // Step 5 — Drift
  const findings = detectDrift(runtimeWf, csBaseline, session.accumulatedEvents, score);
  session.lastFindings = findings;
  session.lifecycleStage = 'drifted';

  // Step 6 — Audit
  const policyRef = 'enterprise-ai-policy::2.1.0::xops-monitored';
  const scoreRec = recordScoreComputed('session-console-001', score, policyRef);
  findings.forEach((f) => recordDriftDetected('session-console-001', f, score, policyRef));
  session.lastAuditRecord = scoreRec;
  session.lifecycleStage = 'audited';

  // Step 7 — Report
  const ledgerRecords = getLedger().filter((r) => r.workflowId === 'wf-cs');
  const report = generatePilotReport({
    sessionId: 'session-console-001',
    generatedBy: 'console-operator',
    pilotPhase: 'Phase 7 — Console Execution',
    scores: [score],
    findings,
    auditRecords: ledgerRecords,
    f5Results: csF5Events.map((e) => ({ workflowId: e.workflowId, source: e.source, classification: e.classification, continuityDelta: e.continuityDelta })),
  });
  session.lifecycleStage = 'reported';

  const primaryFinding = findings[0];

  return {
    commandText: 'run lifecycle wf-cs',
    timestamp: now,
    updatedWorkflowId: 'wf-cs',
    lines: [
      line('header', 'SMI Lifecycle Execution — Customer Support AI (wf-cs)'),
      sep(),
      line('step', `[1] Baseline loaded: Customer Support AI baseline (${csBaseline.id})`),
      line('info', `    Approved prompt v2.0.0 | billing-api NOT in approved tool list`),
      line('step', `[2] Controlled change applied: prompt version change + billing-api tool access`),
      line('info', `    Prompt v2.0.0 → v2.1.0 (hash mismatch) | billing-api added to runtime toolset`),
      line('step', `[3] Simulated F5-style event ingested`),
      line('info', `    3 events: prompt_version_change + unauthorized_tool_call + forbidden_behavior`),
      line('step', `[4] Continuity score calculated: ${score.continuityScore}`),
      line('info', `    Deductions: -12 (prompt) + -10 (tool) + -15 (behavior) = -${score.totalDeducted} total`),
      line('step', `[5] Risk level: ${score.riskLevel}`),
      line(riskColor(score.riskLevel), `    Score ${score.continuityScore}/100 — ${score.riskLevel}`),
      line('step', `[6] Drift finding created`),
      line('finding', `    ${primaryFinding?.title ?? 'Behavioral drift detected'} (${findings.length} total finding${findings.length !== 1 ? 's' : ''})`),
      line('step', `[7] Audit record written`),
      line('audit', `    Record ${scoreRec.id} — hash ${scoreRec.currentHash.slice(0, 8)}...`),
      line('step', `[8] Pilot report generated: ${report.id}`),
      line('report', `    ${report.totalAuditRecords} audit records | Approved for next phase: ${report.approvedForNextPhase ? 'YES' : 'NO'}`),
      line('step', `[9] Recommendation: human review before production promotion`),
      line('hint', `    Revert prompt to v2.0.0, remove billing-api from tool scope, re-anchor baseline`),
      sep(),
      line('hint', `Next: detect drift wf-cs | generate report wf-cs | run lifecycle wf-003`),
    ],
  };
}

// ─── Seed Lifecycle: any other workflow ──────────────────────────────────────

function runLifecycleSeed(wfId: string, now: string): CommandResult {
  const wf = resolveWorkflow(wfId);
  const bl = resolveBaseline(wfId);
  const seedEvts = resolveSeedEvents(wfId);

  if (!wf || !bl || seedEvts.length === 0) {
    return {
      commandText: `run lifecycle ${wfId}`,
      timestamp: now,
      lines: [
        line('warn', `No complete lifecycle scenario exists for this workflow yet.`),
        line('hint', `Try:`),
        line('hint', `  show baseline ${wfId}`),
        line('hint', `  simulate normal_event ${wfId}`),
        line('hint', `  simulate prompt_change ${wfId}`),
        line('hint', `  score continuity ${wfId}`),
      ],
    };
  }

  resetSession(wfId);
  const session = getOrInitSession(wfId);
  _activeWorkflowId = wfId;

  // Replay seed events
  const score = computeContinuityScore(wf, bl, seedEvts);
  session.lastScore = score;
  const findings = detectDrift(wf, bl, seedEvts, score);
  session.lastFindings = findings;

  const policyRef = 'enterprise-ai-policy::2.1.0';
  const scoreRec = recordScoreComputed('session-console-001', score, policyRef);
  session.lastAuditRecord = scoreRec;
  session.lifecycleStage = 'reported';

  return {
    commandText: `run lifecycle ${wfId}`,
    timestamp: now,
    updatedWorkflowId: wfId,
    lines: [
      line('header', `Lifecycle Replay — ${wf.name} (${wfId})`),
      sep(),
      line('step', `[1] Baseline loaded: ${bl.id}`),
      line('step', `[2] Seed events replayed: ${seedEvts.length} event(s)`),
      line('step', `[3] Continuity score computed: ${score.continuityScore}`),
      line(riskColor(score.riskLevel), `[4] Risk level: ${score.riskLevel}`),
      line('step', `[5] Drift findings: ${findings.length}`),
      line('audit', `[6] Audit record written: ${scoreRec.id}`),
      sep(),
      line('info', `For the curated 9-step lifecycle demo, use: run lifecycle wf-cs`),
      line('hint', `Next: detect drift ${wfId}  |  generate report ${wfId}`),
    ],
  };
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

function bumpVersion(version: string): string {
  const parts = version.split('.');
  const last = parseInt(parts[parts.length - 1] ?? '0', 10);
  parts[parts.length - 1] = String(last + 1);
  return parts.join('.');
}

// Used externally to suppress unused warning — real ID generation is via nextEventId alias
const _nextEventId = nextEventId;
void _nextEventId;

// ─── Autocomplete ─────────────────────────────────────────────────────────────

const COMMAND_SUGGESTIONS = [
  'help',
  'list workflows',
  'show baseline',
  'run baseline',
  'run lifecycle',
  'simulate normal_event',
  'simulate prompt_change',
  'simulate policy_mismatch',
  'simulate tool_access_added',
  'simulate unauthorized_tool_call',
  'simulate guardrail_violation',
  'simulate memory_state_change',
  'score continuity',
  'detect drift',
  'write audit',
  'generate report',
  'clear',
];

const TOOL_SUGGESTIONS = ['billing-api', 'search', 'summarize', 'escalate', 'data-export', 'audit-log'];

export function getAutocompleteOptions(input: string): string[] {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === '') return ['help', 'list workflows', 'run lifecycle wf-cs', 'show baseline wf-cs'];

  const tokens = trimmed.split(/\s+/);
  const t0 = tokens[0];
  const t1 = tokens[1];
  const t2 = tokens[2];

  // Workflow ID position
  const needsWorkflowId =
    (t0 === 'show' && t1 === 'baseline') ||
    (t0 === 'run' && (t1 === 'baseline' || t1 === 'lifecycle')) ||
    (t0 === 'score' && t1 === 'continuity') ||
    (t0 === 'detect' && t1 === 'drift') ||
    (t0 === 'write' && t1 === 'audit') ||
    (t0 === 'generate' && t1 === 'report') ||
    (t0 === 'simulate' && t1 !== undefined && t2 === undefined);

  if (needsWorkflowId) {
    const prefix = t2 ?? '';
    return ALL_WORKFLOW_IDS.filter((id) => id.startsWith(prefix)).map((id) => `${tokens.slice(0, 2).join(' ')} ${id}`);
  }

  // Tool name position
  const needsTool =
    t0 === 'simulate' &&
    (t1 === 'tool_access_added' || t1 === 'unauthorized_tool_call') &&
    t2 !== undefined &&
    tokens.length >= 3;

  if (needsTool) {
    const prefix = tokens[3] ?? '';
    return TOOL_SUGGESTIONS.filter((t) => t.startsWith(prefix)).map((t) => `${tokens.slice(0, 3).join(' ')} ${t}`);
  }

  // Command prefix matching
  const matched = COMMAND_SUGGESTIONS.filter((c) => c.startsWith(trimmed));
  if (matched.length > 0) return matched.slice(0, 6);

  // First token prefix
  if (tokens.length === 1) {
    return COMMAND_SUGGESTIONS.filter((c) => c.startsWith(t0)).slice(0, 6);
  }

  return [];
}

// ─── Inline Command Preview ───────────────────────────────────────────────────

const COMMAND_PREVIEWS: Record<string, CommandPreview> = {
  help: { commandName: 'help', purpose: 'Show all supported SMI commands.', effect: 'Read-only.', auditImpact: 'None.', nextStep: 'list workflows' },
  list_workflows: { commandName: 'list workflows', purpose: 'List all registered AI workflows with baseline and event status.', effect: 'Read-only.', auditImpact: 'None.', nextStep: 'show baseline <workflow_id>' },
  show_baseline: { commandName: 'show baseline <wf>', purpose: 'Inspect the approved baseline anchor for a workflow.', effect: 'Read-only. Sets active workflow context.', auditImpact: 'None.', nextStep: 'simulate prompt_change <workflow_id>' },
  run_baseline: { commandName: 'run baseline <wf>', purpose: 'Capture the current live workflow state as a new baseline anchor.', effect: 'Adds baseline to runtime store.', auditImpact: 'Writes audit record: baseline_captured.', nextStep: 'simulate prompt_change <workflow_id>' },
  simulate_normal: { commandName: 'simulate normal_event <wf>', purpose: 'Inject a nominal operation event — 0 deduction.', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  simulate_prompt_change: { commandName: 'simulate prompt_change <wf>', purpose: 'Simulate a prompt version change with hash mismatch (-12 pts).', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  simulate_policy_mismatch: { commandName: 'simulate policy_mismatch <wf>', purpose: 'Simulate a policy version mismatch (-15 pts).', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  simulate_tool_access_added: { commandName: 'simulate tool_access_added <wf> <tool>', purpose: 'Add a tool to the active runtime toolset. Controlled change — no immediate deduction.', effect: 'Updates session state only. Does not mutate seed data.', auditImpact: 'No audit record until write audit or lifecycle execution.', nextStep: 'score continuity <workflow_id>' },
  simulate_unauthorized_tool: { commandName: 'simulate unauthorized_tool_call <wf> <tool>', purpose: 'Simulate an unauthorized tool invocation (-10 pts).', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  simulate_guardrail_violation: { commandName: 'simulate guardrail_violation <wf>', purpose: 'Simulate a guardrail rule breach (-15 pts).', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  simulate_memory_state_change: { commandName: 'simulate memory_state_change <wf>', purpose: 'Simulate memory or session state drift (-8 pts).', effect: 'Adds event to session state.', auditImpact: 'None until write audit.', nextStep: 'score continuity <workflow_id>' },
  score_continuity: { commandName: 'score continuity <wf>', purpose: 'Compute a deterministic continuity score from baseline delta.', effect: 'Updates session last score. Reflects all accumulated events + runtime tool changes.', auditImpact: 'None until write audit.', nextStep: 'detect drift <workflow_id>' },
  detect_drift: { commandName: 'detect drift <wf>', purpose: 'Run 7 drift detection rules and surface named DriftFinding objects.', effect: 'Updates session findings list.', auditImpact: 'None until write audit.', nextStep: 'write audit <workflow_id>' },
  write_audit: { commandName: 'write audit <wf>', purpose: 'Write score and drift findings to the hash-chained audit ledger.', effect: 'Appends records to the shared in-session audit ledger.', auditImpact: 'Writes score_computed and drift_detected records.', nextStep: 'generate report <workflow_id>' },
  generate_report: { commandName: 'generate report <wf>', purpose: 'Generate a structured pilot report for XOps sign-off.', effect: 'Aggregates scores, findings, and audit records into a PilotReport.', auditImpact: 'None.', nextStep: 'clear  or  run lifecycle <next_workflow_id>' },
  run_lifecycle: { commandName: 'run lifecycle <wf>', purpose: 'Execute the full SMI pilot chain in one command.', effect: 'For wf-cs: runs curated 9-step Customer Support AI scenario. For others: replays seed data.', auditImpact: 'Writes score_computed, drift_detected, and baseline_captured records.', nextStep: 'detect drift <wf>  |  generate report <wf>' },
  run_lifecycle_cs: { commandName: 'run lifecycle wf-cs', purpose: 'Execute the full SMI pilot chain — curated Customer Support AI scenario.', effect: 'Resets wf-cs session, replays 3 canonical events, scores, detects drift, writes audit, generates report.', auditImpact: 'Writes score_computed, event_ingested, drift_detected records.', nextStep: 'generate report wf-cs  |  run lifecycle wf-003' },
  clear: { commandName: 'clear', purpose: 'Clear the terminal and reset all session state.', effect: 'Clears terminal history and all console session states.', auditImpact: 'None.', nextStep: 'run lifecycle wf-cs' },
};

export function getCommandPreview(input: string): CommandPreview | null {
  const trimmed = input.trim().toLowerCase();
  if (trimmed === '') return null;

  const tokens = trimmed.split(/\s+/);
  const [t0, t1, t2] = tokens;

  if (t0 === 'help') return COMMAND_PREVIEWS['help'];
  if (t0 === 'clear') return COMMAND_PREVIEWS['clear'];
  if (t0 === 'list') return COMMAND_PREVIEWS['list_workflows'];
  if (t0 === 'show' && t1 === 'baseline') return COMMAND_PREVIEWS['show_baseline'];
  if (t0 === 'run' && t1 === 'baseline') return COMMAND_PREVIEWS['run_baseline'];
  if (t0 === 'run' && t1 === 'lifecycle') {
    if (t2 === 'wf-cs') return COMMAND_PREVIEWS['run_lifecycle_cs'];
    return COMMAND_PREVIEWS['run_lifecycle'];
  }
  if (t0 === 'score') return COMMAND_PREVIEWS['score_continuity'];
  if (t0 === 'detect') return COMMAND_PREVIEWS['detect_drift'];
  if (t0 === 'write') return COMMAND_PREVIEWS['write_audit'];
  if (t0 === 'generate') return COMMAND_PREVIEWS['generate_report'];
  if (t0 === 'simulate') {
    if (t1 === 'normal_event') return COMMAND_PREVIEWS['simulate_normal'];
    if (t1 === 'prompt_change') return COMMAND_PREVIEWS['simulate_prompt_change'];
    if (t1 === 'policy_mismatch') return COMMAND_PREVIEWS['simulate_policy_mismatch'];
    if (t1 === 'tool_access_added') return COMMAND_PREVIEWS['simulate_tool_access_added'];
    if (t1 === 'unauthorized_tool_call') return COMMAND_PREVIEWS['simulate_unauthorized_tool'];
    if (t1 === 'guardrail_violation') return COMMAND_PREVIEWS['simulate_guardrail_violation'];
    if (t1 === 'memory_state_change') return COMMAND_PREVIEWS['simulate_memory_state_change'];
  }
  return null;
}

// ─── Contextual Suggestions ───────────────────────────────────────────────────

export interface ContextualSuggestion {
  label: string;
  command: string;
  description: string;
}

export function getContextualSuggestions(workflowId: string | null, stage: LifecycleStage): ContextualSuggestion[] {
  if (!workflowId) {
    return [
      { label: 'List Workflows', command: 'list workflows', description: 'View all pilot workflows' },
      { label: 'Show wf-cs Baseline', command: 'show baseline wf-cs', description: 'Inspect Customer Support AI baseline' },
      { label: 'Run Full Lifecycle', command: 'run lifecycle wf-cs', description: 'Execute the curated 9-step pilot story' },
      { label: 'Help', command: 'help', description: 'View all commands' },
    ];
  }

  const wfId = workflowId;

  switch (stage) {
    case 'idle':
      return [
        { label: 'Show Baseline', command: `show baseline ${wfId}`, description: 'Inspect approved baseline anchor' },
        { label: 'Run Lifecycle', command: `run lifecycle ${wfId}`, description: 'Execute full pilot chain' },
        { label: 'Simulate Change', command: `simulate prompt_change ${wfId}`, description: 'Introduce a controlled change' },
      ];
    case 'baseline':
      return [
        { label: 'Simulate Prompt Change', command: `simulate prompt_change ${wfId}`, description: 'Introduce prompt version drift' },
        { label: 'Add Tool Access', command: `simulate tool_access_added ${wfId} billing-api`, description: 'Expand tool scope' },
        { label: 'Score Continuity', command: `score continuity ${wfId}`, description: 'Compute current score' },
      ];
    case 'changed':
      return [
        { label: 'Score Continuity', command: `score continuity ${wfId}`, description: 'Compute score after changes' },
        { label: 'Simulate Unauthorized Tool', command: `simulate unauthorized_tool_call ${wfId} billing-api`, description: 'Add a boundary violation' },
        { label: 'Simulate Guardrail Violation', command: `simulate guardrail_violation ${wfId}`, description: 'Add a guardrail breach event' },
      ];
    case 'scored':
      return [
        { label: 'Detect Drift', command: `detect drift ${wfId}`, description: 'Surface named drift findings' },
        { label: 'Write Audit', command: `write audit ${wfId}`, description: 'Write evidence to audit ledger' },
        { label: 'Generate Report', command: `generate report ${wfId}`, description: 'Produce XOps pilot report' },
      ];
    case 'drifted':
      return [
        { label: 'Write Audit', command: `write audit ${wfId}`, description: 'Write drift evidence to ledger' },
        { label: 'Generate Report', command: `generate report ${wfId}`, description: 'Produce XOps pilot report' },
      ];
    case 'audited':
      return [
        { label: 'Generate Report', command: `generate report ${wfId}`, description: 'Produce XOps pilot report' },
        { label: 'Run Another Lifecycle', command: `run lifecycle wf-003`, description: 'Run next workflow scenario' },
      ];
    case 'reported':
      return [
        { label: 'Clear & Reset', command: 'clear', description: 'Clear terminal and reset sessions' },
        { label: 'Run wf-003', command: 'run lifecycle wf-003', description: 'Replay Quarantine scenario' },
        { label: 'List Workflows', command: 'list workflows', description: 'View all workflows' },
      ];
  }
}
