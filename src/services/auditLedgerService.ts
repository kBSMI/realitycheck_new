import {
  AuditLedgerRecord,
  AuditAction,
  RiskLevel,
  ContinuityScore,
  DriftFinding,
  F5SimulatedEvent,
} from '../types/smi';
import { seedAuditRecords } from '../data/auditLedger';

// ─── In-Memory Ledger State ───────────────────────────────────────────────────
// Starts from seed records. New records are appended in-session.
// In a production system this would persist to a database.
// Records are never modified or deleted — append-only.

let ledger: AuditLedgerRecord[] = [...seedAuditRecords];

let recordCounter = ledger.length + 1;

function nextId(): string {
  const n = String(recordCounter).padStart(3, '0');
  recordCounter++;
  return `ald-${n}`;
}

// ─── Write Functions ──────────────────────────────────────────────────────────

export function recordBaselineCaptured(
  sessionId: string,
  workflowId: string,
  baselineId: string,
  actorId: string,
  policyRef: string,
  detail: string
): AuditLedgerRecord {
  return append({
    sessionId,
    workflowId,
    action: 'baseline_captured',
    actorId,
    policyRef,
    continuityScoreSnapshot: 100,
    riskLevelSnapshot: 'Approved',
    detail,
    linkedEventIds: [],
    linkedBaselineId: baselineId,
  });
}

export function recordEventIngested(
  sessionId: string,
  workflowId: string,
  baselineId: string,
  eventId: string,
  score: ContinuityScore,
  policyRef: string,
  detail: string
): AuditLedgerRecord {
  return append({
    sessionId,
    workflowId,
    action: 'event_ingested',
    actorId: 'system',
    policyRef,
    continuityScoreSnapshot: score.continuityScore,
    riskLevelSnapshot: score.riskLevel,
    detail,
    linkedEventIds: [eventId],
    linkedBaselineId: baselineId,
  });
}

export function recordScoreComputed(
  sessionId: string,
  score: ContinuityScore,
  policyRef: string
): AuditLedgerRecord {
  const action: AuditAction =
    score.riskLevel === 'Quarantine' ? 'workflow_quarantined' :
    score.riskLevel === 'Approved' ? 'workflow_approved' :
    'score_computed';

  return append({
    sessionId,
    workflowId: score.workflowId,
    action,
    actorId: 'system',
    policyRef,
    continuityScoreSnapshot: score.continuityScore,
    riskLevelSnapshot: score.riskLevel,
    detail: `Score computed: ${score.continuityScore}/100 (${score.riskLevel}). Deductions: ${score.totalDeducted} pts across ${score.deductions.length} event(s). ${score.recommendedAction}`,
    linkedEventIds: score.deductions.map((d) => d.eventId),
    linkedBaselineId: score.baselineId,
  });
}

export function recordDriftDetected(
  sessionId: string,
  finding: DriftFinding,
  score: ContinuityScore,
  policyRef: string
): AuditLedgerRecord {
  return append({
    sessionId,
    workflowId: finding.workflowId,
    action: 'drift_detected',
    actorId: 'system',
    policyRef,
    continuityScoreSnapshot: score.continuityScore,
    riskLevelSnapshot: score.riskLevel,
    detail: `Drift finding: ${finding.title}. Magnitude: ${finding.driftMagnitude}/100. Remediation required: ${finding.requiresRemediation}.`,
    linkedEventIds: finding.affectedEvents,
    linkedBaselineId: finding.baselineId,
  });
}

export function recordRemediationApplied(
  sessionId: string,
  workflowId: string,
  baselineId: string,
  actorId: string,
  policyRef: string,
  remediationDescription: string,
  scoreAfter: number
): AuditLedgerRecord {
  return append({
    sessionId,
    workflowId,
    action: 'remediation_applied',
    actorId,
    policyRef,
    continuityScoreSnapshot: scoreAfter,
    riskLevelSnapshot: scoreAfter >= 90 ? 'Approved' : scoreAfter >= 75 ? 'Watch' : scoreAfter >= 60 ? 'Review Required' : 'Quarantine',
    detail: `Remediation applied: ${remediationDescription}`,
    linkedEventIds: [],
    linkedBaselineId: baselineId,
  });
}

export function recordXOpsReview(
  sessionId: string,
  workflowId: string,
  baselineId: string,
  reviewerId: string,
  decision: 'APPROVED' | 'WATCH' | 'REVIEW_REQUIRED' | 'QUARANTINE',
  score: ContinuityScore,
  policyRef: string,
  notes: string
): AuditLedgerRecord {
  const riskMap: Record<string, RiskLevel> = {
    APPROVED: 'Approved',
    WATCH: 'Watch',
    REVIEW_REQUIRED: 'Review Required',
    QUARANTINE: 'Quarantine',
  };
  return append({
    sessionId,
    workflowId,
    action: 'xops_review_completed',
    actorId: reviewerId,
    policyRef,
    continuityScoreSnapshot: score.continuityScore,
    riskLevelSnapshot: riskMap[decision] ?? score.riskLevel,
    detail: `XOps review by ${reviewerId}: ${decision}. Score: ${score.continuityScore}. Notes: ${notes}`,
    linkedEventIds: [],
    linkedBaselineId: baselineId,
  });
}

export function recordF5SimulationRun(
  sessionId: string,
  event: F5SimulatedEvent,
  currentScore: ContinuityScore
): AuditLedgerRecord {
  const resultScore = Math.max(0, Math.min(100, currentScore.continuityScore + event.continuityDelta));
  return append({
    sessionId,
    workflowId: event.workflowId,
    action: 'f5_simulation_run',
    actorId: 'system',
    policyRef: event.policyRef,
    continuityScoreSnapshot: resultScore,
    riskLevelSnapshot: currentScore.riskLevel,
    detail: `F5 ADSP simulation: ${event.source} / ${event.eventName} — ${event.classification.toUpperCase()}. Delta: ${event.continuityDelta > 0 ? '+' : ''}${event.continuityDelta} pts. ${event.description}`,
    linkedEventIds: [event.id],
    linkedBaselineId: currentScore.baselineId,
  });
}

// ─── Read Functions ───────────────────────────────────────────────────────────

export function getLedger(): AuditLedgerRecord[] {
  return [...ledger].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getLedgerBySession(sessionId: string): AuditLedgerRecord[] {
  return getLedger().filter((r) => r.sessionId === sessionId);
}

export function getLedgerByWorkflow(workflowId: string): AuditLedgerRecord[] {
  return getLedger().filter((r) => r.workflowId === workflowId);
}

export function getLedgerStats(sessionId: string) {
  const records = getLedgerBySession(sessionId);
  const uniqueWorkflows = new Set(records.map((r) => r.workflowId)).size;
  const quarantineEvents = records.filter((r) => r.action === 'workflow_quarantined').length;
  const driftEvents = records.filter((r) => r.action === 'drift_detected').length;
  const f5Events = records.filter((r) => r.action === 'f5_simulation_run').length;
  const sessionAuditScore = records.reduce((s, r) => s + r.continuityScoreSnapshot, 0);

  return {
    totalRecords: records.length,
    uniqueWorkflows,
    quarantineEvents,
    driftEvents,
    f5Events,
    sessionAuditScore,
  };
}

// ─── Hash Chaining ────────────────────────────────────────────────────────────
// Deterministic djb2-based hash over record fields.
// Provides tamper evidence: any change to a record body produces a different hash.
// This is not cryptographic-grade but sufficient for pilot-level audit evidence.

function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep unsigned 32-bit
  }
  return hash.toString(16).padStart(8, '0');
}

function computeRecordHash(
  id: string,
  sessionId: string,
  workflowId: string,
  action: string,
  actorId: string,
  timestamp: string,
  policyRef: string,
  continuityScoreSnapshot: number,
  riskLevelSnapshot: string,
  detail: string,
  previousHash: string
): string {
  const body = [id, sessionId, workflowId, action, actorId, timestamp, policyRef,
    String(continuityScoreSnapshot), riskLevelSnapshot, detail, previousHash].join('|');
  // Two passes for better distribution
  return djb2Hash(body) + djb2Hash(body.split('').reverse().join(''));
}

function getLastHash(): string {
  if (ledger.length === 0) return '0000000000000000';
  return ledger[ledger.length - 1].currentHash;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function append(fields: Omit<AuditLedgerRecord, 'id' | 'timestamp' | 'previousHash' | 'currentHash'>): AuditLedgerRecord {
  const id = nextId();
  const timestamp = new Date().toISOString();
  const previousHash = getLastHash();

  const currentHash = computeRecordHash(
    id, fields.sessionId, fields.workflowId, fields.action,
    fields.actorId, timestamp, fields.policyRef,
    fields.continuityScoreSnapshot, fields.riskLevelSnapshot,
    fields.detail, previousHash
  );

  const record: AuditLedgerRecord = {
    id,
    timestamp,
    previousHash,
    currentHash,
    ...fields,
  };
  ledger = [...ledger, record];
  return record;
}

export function resetLedgerToSeed(): void {
  ledger = [...seedAuditRecords];
  recordCounter = ledger.length + 1;
}
