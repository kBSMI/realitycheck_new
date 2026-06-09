// ─── SMI Core Type Definitions ───────────────────────────────────────────────
// All types used by the scoring engine, drift detection, audit ledger, and UI.
// No union-type aliasing of string literals outside of this file.

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type RiskLevel = 'Approved' | 'Watch' | 'Review Required' | 'Quarantine';

export type EventType =
  | 'model_version_change'
  | 'prompt_version_change'
  | 'policy_version_mismatch'
  | 'unauthorized_tool_call'
  | 'forbidden_behavior'
  | 'sensitive_data_risk'
  | 'guardrail_violation'
  | 'memory_state_change'
  | 'orchestration_change'
  | 'nominal_operation'
  | 'baseline_capture'
  | 'baseline_override';

export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

// High-level source categories (used by audit ledger + scoring)
export type F5EventSource =
  | 'ai-gateway'
  | 'guardrail'
  | 'red-team'
  | 'xops-review';

// Granular F5 ADSP stream identifiers for Phase 3 simulation connector
export type F5StreamType =
  | 'ai_gateway.request'
  | 'ai_gateway.response'
  | 'ai_guardrails.policy_violation'
  | 'ai_guardrails.prompt_injection_detected'
  | 'ai_redteam.test_result'
  | 'adsp.policy_version_changed'
  | 'agent.tool_call'
  | 'xops.workflow_anomaly';

export type RemediationEffort = 'Low' | 'Medium' | 'High';

// ─── 1. AIWorkflow ─────────────────────────────────────────────────────────────
// Represents a registered AI workflow with its current approved baseline state.

export interface ModelConfig {
  modelId: string;         // e.g. "gpt-4o-2024-05-13"
  version: string;         // semver-style: "2.1.0"
  provider: string;
}

export interface PromptConfig {
  promptId: string;
  version: string;         // semver-style: "1.4.0"
  hash: string;            // deterministic content hash
}

export interface PolicyConfig {
  policyId: string;
  version: string;         // semver-style: "2.1.0"
  guardrailsEnabled: boolean;
  allowedTools: string[];
  forbiddenBehaviors: string[];
}

export interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  owner: string;
  environment: 'production' | 'staging' | 'development';
  modelConfig: ModelConfig;
  promptConfig: PromptConfig;
  policyConfig: PolicyConfig;
  dependsOn: string[];     // IDs of upstream workflows
  tags: string[];
  createdAt: string;
  lastActive: string;
}

// ─── 2. BaselineAnchor ────────────────────────────────────────────────────────
// Immutable snapshot of a workflow's approved state at a point in time.
// All scoring is measured as delta from this anchor.

export interface BaselineAnchor {
  id: string;
  workflowId: string;
  capturedAt: string;
  capturedBy: string;           // XOps reviewer ID or system
  sessionRef: string;
  approvedRiskLevel: RiskLevel;
  modelConfig: ModelConfig;
  promptConfig: PromptConfig;
  policyConfig: PolicyConfig;
  notes: string;
}

// ─── 3. AIWorkflowEvent ───────────────────────────────────────────────────────
// A single behavioral or structural event observed during workflow execution.
// These are the raw inputs to the scoring engine.

export interface AIWorkflowEvent {
  id: string;
  workflowId: string;
  baselineId: string;           // which baseline this event is measured against
  timestamp: string;
  eventType: EventType;
  severity: EventSeverity;
  description: string;
  payload: EventPayload;
}

export interface EventPayload {
  // Populated for model_version_change
  previousModelVersion?: string;
  newModelVersion?: string;

  // Populated for prompt_version_change
  previousPromptVersion?: string;
  newPromptVersion?: string;
  promptHashMatch?: boolean;

  // Populated for policy_version_mismatch
  expectedPolicyVersion?: string;
  actualPolicyVersion?: string;

  // Populated for unauthorized_tool_call
  toolName?: string;
  toolCallArgs?: string;

  // Populated for forbidden_behavior
  behaviorLabel?: string;
  behaviorConfidence?: number;  // 0–1

  // Populated for sensitive_data_risk
  dataCategory?: string;        // e.g. "PII", "PHI", "financial"
  exposureVector?: string;

  // Populated for guardrail_violation
  guardrailId?: string;
  guardrailRule?: string;

  // Populated for memory_state_change
  stateKey?: string;
  previousStateHash?: string;
  newStateHash?: string;

  // Populated for orchestration_change
  previousOrchestrator?: string;
  newOrchestrator?: string;
}

// ─── 4. F5SimulatedEvent ─────────────────────────────────────────────────────
// Mock F5 ADSP-style event used in simulation connector.

export interface F5SimulatedEvent {
  id: string;
  workflowId: string;
  source: F5EventSource;
  timestamp: string;
  eventName: string;
  description: string;
  classification: 'pass' | 'warn' | 'fail';
  continuityDelta: number;      // points added (+) or subtracted (-) from score
  policyRef: string;
  rawPayload: Record<string, string | number | boolean>;
}

// ─── 4b. F5StreamEvent ────────────────────────────────────────────────────────
// Richer Phase 3 event shape — one per granular F5 stream type.
// Used exclusively by the F5 ADSP Simulation Connector page.

export type F5EventClassification = 'pass' | 'warn' | 'fail';
export type F5SMIConsumed = 'consumed' | 'flagged' | 'rejected' | 'ignored';

export interface F5StreamEvent {
  id: string;
  stream: F5StreamType;           // granular stream type
  source: F5EventSource;          // rolled-up source category
  workflowId: string;
  timestamp: string;
  severity: EventSeverity;
  eventName: string;
  description: string;
  classification: F5EventClassification;

  // Version context at time of event
  modelVersion: string;
  promptVersion: string;
  policyVersion: string;

  // SMI ingestion metadata
  smiConsumed: F5SMIConsumed;     // how SMI processed this event
  smiEventType: EventType;        // which SMI EventType it maps to
  continuityDelta: number;        // net continuity score change

  policyRef: string;
  rawPayload: Record<string, string | number | boolean>;
}

// ─── 5. ContinuityScore ───────────────────────────────────────────────────────
// Output of the MemoryMorphologyEngine for a workflow at a point in time.

export interface ScoreDeduction {
  reason: EventType;
  points: number;
  eventId: string;
  description: string;
}

export interface ContinuityScore {
  workflowId: string;
  baselineId: string;
  computedAt: string;

  // Primary score
  continuityScore: number;          // 0–100, starts at 100 minus deductions

  // Sub-scores (each 0–100)
  driftScore: number;               // magnitude of deviation from baseline
  policyAlignment: number;          // how closely policy config matches baseline
  toolBehaviorVariance: number;     // deviation in tool usage patterns
  stateDegradation: number;         // memory/state change accumulation

  // Risk classification
  riskLevel: RiskLevel;

  // Breakdown
  deductions: ScoreDeduction[];
  totalDeducted: number;

  // Action
  recommendedAction: string;
}

// ─── 6. DriftFinding ──────────────────────────────────────────────────────────
// A surfaced drift condition derived from score sub-components.

export type DriftCategory =
  | 'model_drift'
  | 'prompt_drift'
  | 'policy_drift'
  | 'tool_drift'
  | 'behavior_drift'
  | 'state_drift'
  | 'orchestration_drift'
  | 'data_risk';

export interface DriftFinding {
  id: string;
  workflowId: string;
  baselineId: string;
  detectedAt: string;
  category: DriftCategory;
  severity: EventSeverity;
  title: string;
  description: string;
  affectedEvents: string[];         // event IDs contributing to this finding
  driftMagnitude: number;           // 0–100 how far from baseline
  requiresRemediation: boolean;
}

// ─── 7. AuditLedgerRecord ────────────────────────────────────────────────────
// Hash-chained, append-only record written to the audit ledger.
// previousHash links to the prior record's currentHash for tamper evidence.

export type AuditAction =
  | 'baseline_captured'
  | 'event_ingested'
  | 'score_computed'
  | 'drift_detected'
  | 'remediation_applied'
  | 'workflow_quarantined'
  | 'workflow_approved'
  | 'xops_review_completed'
  | 'f5_simulation_run';

export interface AuditLedgerRecord {
  id: string;
  sessionId: string;
  workflowId: string;
  action: AuditAction;
  actorId: string;                  // system or XOps reviewer
  timestamp: string;
  policyRef: string;
  continuityScoreSnapshot: number;  // score at time of record
  riskLevelSnapshot: RiskLevel;
  detail: string;
  linkedEventIds: string[];
  linkedBaselineId: string;
  previousHash: string;             // currentHash of the previous record ('0000000000000000' for first)
  currentHash: string;              // deterministic hash of this record's fields
}

// ─── 8. PilotReport ──────────────────────────────────────────────────────────
// Aggregated summary document for XOps sign-off.

export interface PilotReportWorkflowEntry {
  workflowId: string;
  workflowName: string;
  baselineId: string;
  finalContinuityScore: number;
  finalRiskLevel: RiskLevel;
  totalEventsIngested: number;
  driftFindingsCount: number;
  remediationActionsCount: number;
  f5SimulationResults: {
    source: F5EventSource;
    classification: 'pass' | 'warn' | 'fail';
    continuityDelta: number;
  }[];
}

export interface PilotReport {
  id: string;
  sessionId: string;
  generatedAt: string;
  generatedBy: string;
  pilotPhase: string;
  workflows: PilotReportWorkflowEntry[];
  totalAuditRecords: number;
  sessionAuditScore: number;
  keyFindings: string[];
  smiValueDemonstrated: string[];
  approvedForNextPhase: boolean;
}
