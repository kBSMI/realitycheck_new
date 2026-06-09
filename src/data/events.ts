import { AIWorkflowEvent } from '../types/smi';

// ─── AI Workflow Events ───────────────────────────────────────────────────────
// Raw behavioral and structural events observed across all workflows.
// Each event references the workflow and baseline it was measured against.
// These are the direct inputs to the MemoryMorphologyEngine scoring algorithm.
//
// Event distribution by workflow (live engine scores):
//   wf-001 (Core Inference)   — memory_state_change(-8) → score 92 Approved
//   wf-002 (Data Enrichment)  — memory_state_change(-8) → score 92 Approved
//   wf-003 (Seasonal Campaign)— 7 events, -92 total → score 8 Quarantine
//   wf-004 (LCOS Connector)   — prompt+policy+orchestration → score 64 Review Required
//   wf-005 (AI Gateway)       — nominal_operation(0) → score 100 Approved

const T = (offsetMs: number) => new Date(Date.now() - offsetMs).toISOString();
const H = (h: number) => h * 60 * 60 * 1000;
const D = (d: number) => d * 24 * 60 * 60 * 1000;

export const workflowEvents: AIWorkflowEvent[] = [

  // ─── wf-001: Core Inference Engine ─────────────────────────────────────────
  // Two nominal operations — no deductions, minor drift from memory update
  {
    id: 'evt-001-a',
    workflowId: 'wf-001',
    baselineId: 'bl-001',
    timestamp: T(H(1)),
    eventType: 'nominal_operation',
    severity: 'info',
    description: 'Inference cycle completed within policy bounds — 1,240 requests processed',
    payload: {},
  },
  {
    id: 'evt-001-b',
    workflowId: 'wf-001',
    baselineId: 'bl-001',
    timestamp: T(H(5)),
    eventType: 'memory_state_change',
    severity: 'low',
    description: 'Session context buffer flushed and re-initialized — minor state change',
    payload: {
      stateKey: 'session-context-buffer',
      previousStateHash: 'aa11bb22cc33dd44',
      newStateHash: 'aa11bb22cc33dd45',
    },
  },

  // ─── wf-002: Data Enrichment Agent ─────────────────────────────────────────
  // Nominal operation + a memory state change from schema cache refresh
  {
    id: 'evt-002-a',
    workflowId: 'wf-002',
    baselineId: 'bl-002',
    timestamp: T(H(2)),
    eventType: 'nominal_operation',
    severity: 'info',
    description: 'Enrichment batch completed — 8,400 records classified, no violations',
    payload: {},
  },
  {
    id: 'evt-002-b',
    workflowId: 'wf-002',
    baselineId: 'bl-002',
    timestamp: T(H(12)),
    eventType: 'memory_state_change',
    severity: 'low',
    description: 'Schema cache refreshed — enrichment lookup table updated',
    payload: {
      stateKey: 'enrichment-schema-cache',
      previousStateHash: 'bb22cc33dd44ee55',
      newStateHash: 'bb22cc33dd44ee66',
    },
  },

  // ─── wf-003: Seasonal Campaign AI ──────────────────────────────────────────
  // Multiple high-severity events accumulated during retraining cycle.
  // Model version change, prompt version change, policy mismatch, guardrail
  // disabled, unauthorized tool call, forbidden behavior, sensitive data risk.
  {
    id: 'evt-003-a',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(8)),
    eventType: 'model_version_change',
    severity: 'high',
    description: 'Model updated from approved version 2024-05-13 to 2024-08-06 during retraining',
    payload: {
      previousModelVersion: '2024-05-13',
      newModelVersion: '2024-08-06',
    },
  },
  {
    id: 'evt-003-b',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(7)),
    eventType: 'prompt_version_change',
    severity: 'high',
    description: 'Campaign targeting prompt updated to 3.1.0 — hash does not match baseline',
    payload: {
      previousPromptVersion: '3.0.0',
      newPromptVersion: '3.1.0',
      promptHashMatch: false,
    },
  },
  {
    id: 'evt-003-c',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(7)),
    eventType: 'policy_version_mismatch',
    severity: 'critical',
    description: 'Policy rolled back to v1.8.0 during retraining — guardrails disabled',
    payload: {
      expectedPolicyVersion: '2.1.0',
      actualPolicyVersion: '1.8.0',
    },
  },
  {
    id: 'evt-003-d',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(6)),
    eventType: 'guardrail_violation',
    severity: 'critical',
    description: 'Guardrail layer disabled — policy enforcement gap created',
    payload: {
      guardrailId: 'grl-enterprise-001',
      guardrailRule: 'guardrailsEnabled must be true in production',
    },
  },
  {
    id: 'evt-003-e',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(5)),
    eventType: 'unauthorized_tool_call',
    severity: 'high',
    description: 'Tool "external-pixel" called — not in approved tool list at baseline',
    payload: {
      toolName: 'external-pixel',
      toolCallArgs: '{"destination":"analytics.thirdparty.com","payload":"segment_id"}',
    },
  },
  {
    id: 'evt-003-f',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(4)),
    eventType: 'forbidden_behavior',
    severity: 'critical',
    description: 'Forbidden behavior detected: direct-pii-output in campaign targeting response',
    payload: {
      behaviorLabel: 'direct-pii-output',
      behaviorConfidence: 0.94,
    },
  },
  {
    id: 'evt-003-g',
    workflowId: 'wf-003',
    baselineId: 'bl-003',
    timestamp: T(D(3)),
    eventType: 'sensitive_data_risk',
    severity: 'high',
    description: 'PII exposure risk — email addresses present in un-redacted model output',
    payload: {
      dataCategory: 'PII',
      exposureVector: 'unredacted-model-output',
    },
  },

  // ─── wf-004: LCOS Connector v3 ──────────────────────────────────────────────
  // Prompt minor version bump, policy version lag, orchestration change
  {
    id: 'evt-004-a',
    workflowId: 'wf-004',
    baselineId: 'bl-004',
    timestamp: T(D(4)),
    eventType: 'prompt_version_change',
    severity: 'medium',
    description: 'Bridge prompt updated from 1.2.0 to 1.2.3 — patch version, hash differs',
    payload: {
      previousPromptVersion: '1.2.0',
      newPromptVersion: '1.2.3',
      promptHashMatch: false,
    },
  },
  {
    id: 'evt-004-b',
    workflowId: 'wf-004',
    baselineId: 'bl-004',
    timestamp: T(D(3)),
    eventType: 'policy_version_mismatch',
    severity: 'medium',
    description: 'Policy version 1.8.0 — upgrade to enterprise policy 2.1.0 not applied',
    payload: {
      expectedPolicyVersion: '2.1.0',
      actualPolicyVersion: '1.8.0',
    },
  },
  {
    id: 'evt-004-c',
    workflowId: 'wf-004',
    baselineId: 'bl-004',
    timestamp: T(D(2)),
    eventType: 'orchestration_change',
    severity: 'medium',
    description: 'LCOS bridge orchestrator updated — routing logic changed',
    payload: {
      previousOrchestrator: 'lcos-bridge-v2.1',
      newOrchestrator: 'lcos-bridge-v2.3',
    },
  },

  // ─── wf-005: AI Gateway Proxy ───────────────────────────────────────────────
  // Single nominal event — fully aligned with baseline
  {
    id: 'evt-005-a',
    workflowId: 'wf-005',
    baselineId: 'bl-005',
    timestamp: T(H(1)),
    eventType: 'nominal_operation',
    severity: 'info',
    description: 'Gateway routing cycle completed — all auth checks passed, 0 violations',
    payload: {},
  },
];

export const getEventsForWorkflow = (workflowId: string): AIWorkflowEvent[] =>
  workflowEvents.filter((e) => e.workflowId === workflowId);
