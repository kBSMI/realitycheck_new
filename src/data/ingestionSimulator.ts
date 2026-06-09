// ─── Ingestion Simulator Seed Data ────────────────────────────────────────────
// Deterministic synthetic events demonstrating each ingestion mode × event type.
// No external calls. All raw/normalized pairs are pre-computed from the SMI
// deduction table defined in memoryMorphologyEngine.ts.

import type { AIWorkflowEvent, EventType } from '../types/smi';

// ─── Ingestion mode types ─────────────────────────────────────────────────────

export type IngestionMode =
  | 'realtime'
  | 'batch'
  | 'historical_replay'
  | 'webhook_api'
  | 'metadata_only'
  | 'f5_simulated';

export const INGESTION_MODE_LABELS: Record<IngestionMode, string> = {
  realtime:          'Real-time Stream',
  batch:             'Batch File',
  historical_replay: 'Historical Replay',
  webhook_api:       'Webhook / API',
  metadata_only:     'Metadata-only',
  f5_simulated:      'F5-style Simulated',
};

// ─── Raw event type names (wire format) ───────────────────────────────────────

export type RawEventType =
  | 'ai_gateway.request'
  | 'ai_gateway.response'
  | 'ai_guardrails.policy_violation'
  | 'ai_guardrails.prompt_injection_detected'
  | 'ai_redteam.test_result'
  | 'policy_version_changed'
  | 'prompt_version_changed'
  | 'model_version_changed'
  | 'agent.tool_call'
  | 'tool_access_added'
  | 'unauthorized_tool_call'
  | 'memory_state_change'
  | 'orchestration_change'
  | 'support_escalation'
  | 'incident_record'
  | 'regression_test_result';

// ─── Core simulation record ───────────────────────────────────────────────────

export interface SimulatedIngestionEvent {
  id: string;
  mode: IngestionMode;
  source: string;
  workflowId: string;
  rawEventType: RawEventType;
  smiEventType: EventType | null;          // null = no scoring impact
  description: string;
  rawEvent: Record<string, unknown>;
  normalizedSMIEvent: AIWorkflowEvent | null;
  schemaValid: boolean;
  schemaErrors: string[];
  continuityImpact: number;                // negative = deduction; 0 = no impact
  auditImpact: string;
  recommendedNextStep: string;
  timestamp: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

export const simulatedIngestionEvents: SimulatedIngestionEvent[] = [
  // ── 1. ai_gateway.request — realtime ────────────────────────────────────────
  {
    id: 'sim-001',
    mode: 'realtime',
    source: 'ai-gateway',
    workflowId: 'wf-cs',
    rawEventType: 'ai_gateway.request',
    smiEventType: 'nominal_operation',
    description: 'Inference request routed through AI gateway — within policy bounds.',
    rawEvent: {
      event_type: 'ai_gateway.request',
      workflow_id: 'wf-cs',
      request_id: 'req-8821a',
      model: 'gpt-4o-2024-05-13',
      prompt_version: '2.0.0',
      token_count: 312,
      latency_ms: 184,
      guardrails_active: true,
      timestamp: '2026-05-23T08:01:14.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-001',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T08:01:14.000Z',
      eventType: 'nominal_operation',
      severity: 'info',
      description: 'AI gateway request — nominal inference within policy bounds.',
      payload: { toolName: undefined },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'No audit record written — nominal operation does not trigger ledger entry.',
    recommendedNextStep: 'Continue monitoring. No action required.',
    timestamp: '2026-05-23T08:01:14.000Z',
  },

  // ── 2. ai_gateway.response — realtime ───────────────────────────────────────
  {
    id: 'sim-002',
    mode: 'realtime',
    source: 'ai-gateway',
    workflowId: 'wf-cs',
    rawEventType: 'ai_gateway.response',
    smiEventType: 'nominal_operation',
    description: 'AI gateway response returned — output passed all guardrail checks.',
    rawEvent: {
      event_type: 'ai_gateway.response',
      workflow_id: 'wf-cs',
      request_id: 'req-8821a',
      response_id: 'resp-cc103',
      output_tokens: 91,
      guardrail_result: 'pass',
      policy_ref: 'pol-cx-support-v2',
      timestamp: '2026-05-23T08:01:15.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-002',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T08:01:15.000Z',
      eventType: 'nominal_operation',
      severity: 'info',
      description: 'AI gateway response — output passed guardrail checks.',
      payload: {},
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'No audit record written — clean response pass.',
    recommendedNextStep: 'No action required. Response telemetry logged.',
    timestamp: '2026-05-23T08:01:15.000Z',
  },

  // ── 3. ai_guardrails.policy_violation — f5_simulated ────────────────────────
  {
    id: 'sim-003',
    mode: 'f5_simulated',
    source: 'guardrail',
    workflowId: 'wf-cs',
    rawEventType: 'ai_guardrails.policy_violation',
    smiEventType: 'guardrail_violation',
    description: 'Guardrail blocked output violating refund authorization policy.',
    rawEvent: {
      event_type: 'ai_guardrails.policy_violation',
      workflow_id: 'wf-cs',
      guardrail_id: 'grl-refund-auth-v1',
      rule_triggered: 'unauthorized-refund-issuance',
      violation_severity: 'high',
      blocked: true,
      policy_ref: 'pol-cx-support-v2',
      tool_in_scope: 'billing-api',
      timestamp: '2026-05-23T08:14:07.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-003',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T08:14:07.000Z',
      eventType: 'guardrail_violation',
      severity: 'high',
      description: 'Guardrail blocked unauthorized refund issuance attempt. Rule: unauthorized-refund-issuance.',
      payload: { guardrailId: 'grl-refund-auth-v1', guardrailRule: 'unauthorized-refund-issuance' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Triggers score recompute and drift detection.',
    recommendedNextStep: 'Run: score continuity wf-cs → detect drift wf-cs → write audit wf-cs',
    timestamp: '2026-05-23T08:14:07.000Z',
  },

  // ── 4. ai_guardrails.prompt_injection_detected — webhook_api ────────────────
  {
    id: 'sim-004',
    mode: 'webhook_api',
    source: 'guardrail',
    workflowId: 'wf-001',
    rawEventType: 'ai_guardrails.prompt_injection_detected',
    smiEventType: 'forbidden_behavior',
    description: 'Prompt injection attempt detected and blocked by guardrail layer.',
    rawEvent: {
      event_type: 'ai_guardrails.prompt_injection_detected',
      workflow_id: 'wf-001',
      injection_pattern: 'jailbreak-role-override',
      confidence: 0.94,
      blocked: true,
      prompt_version: '1.4.0',
      guardrail_ref: 'grl-injection-v3',
      policy_ref: 'pol-001-v2',
      timestamp: '2026-05-23T09:02:31.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-004',
      workflowId: 'wf-001',
      baselineId: 'bl-001',
      timestamp: '2026-05-23T09:02:31.000Z',
      eventType: 'forbidden_behavior',
      severity: 'critical',
      description: 'Prompt injection detected: jailbreak-role-override at 94% confidence. Blocked by guardrail.',
      payload: { behaviorLabel: 'prompt-injection', behaviorConfidence: 0.94 },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Flags workflow for immediate XOps review.',
    recommendedNextStep: 'Quarantine workflow pending XOps review. Check prompt version integrity.',
    timestamp: '2026-05-23T09:02:31.000Z',
  },

  // ── 5. ai_redteam.test_result — f5_simulated ────────────────────────────────
  {
    id: 'sim-005',
    mode: 'f5_simulated',
    source: 'red-team',
    workflowId: 'wf-cs',
    rawEventType: 'ai_redteam.test_result',
    smiEventType: 'forbidden_behavior',
    description: 'Red team test confirmed billing-api bypass via tool scope gap — no injection required.',
    rawEvent: {
      event_type: 'ai_redteam.test_result',
      workflow_id: 'wf-cs',
      scenario: 'billing-api-boundary-test',
      result: 'FAIL',
      exploited_condition: 'billing-api-in-allowed-tools',
      probe_count: 10,
      successful_exploits: 4,
      attack_vector: 'tool-scope-gap',
      severity: 'high',
      policy_ref: 'pol-cx-support-v2',
      timestamp: '2026-05-23T09:30:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-005',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T09:30:00.000Z',
      eventType: 'forbidden_behavior',
      severity: 'high',
      description: 'Red team: billing-api direct-issue path exercised — 4/10 inputs resulted in unauthorized refund approval.',
      payload: { behaviorLabel: 'unauthorized-refund-approval', behaviorConfidence: 0.88 },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Red team evidence attached to drift finding.',
    recommendedNextStep: 'Remove billing-api from allowed tools. Re-run red team scenario to confirm exploit closed.',
    timestamp: '2026-05-23T09:30:00.000Z',
  },

  // ── 6. policy_version_changed — batch ───────────────────────────────────────
  {
    id: 'sim-006',
    mode: 'batch',
    source: 'xops-review',
    workflowId: 'wf-002',
    rawEventType: 'policy_version_changed',
    smiEventType: 'policy_version_mismatch',
    description: 'Policy version bumped from 2.0.0 to 2.1.0 — runtime version does not match baseline.',
    rawEvent: {
      event_type: 'policy_version_changed',
      workflow_id: 'wf-002',
      previous_version: '2.0.0',
      new_version: '2.1.0',
      changed_by: 'policy-engine',
      change_ref: 'CR-2026-0089',
      baseline_policy_version: '2.0.0',
      timestamp: '2026-05-23T07:00:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-006',
      workflowId: 'wf-002',
      baselineId: 'bl-002',
      timestamp: '2026-05-23T07:00:00.000Z',
      eventType: 'policy_version_mismatch',
      severity: 'high',
      description: 'Policy version mismatch: baseline expects 2.0.0, runtime reports 2.1.0.',
      payload: { expectedPolicyVersion: '2.0.0', actualPolicyVersion: '2.1.0' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Policy drift flagged.',
    recommendedNextStep: 'Review policy change CR-2026-0089. Re-anchor baseline if change is approved.',
    timestamp: '2026-05-23T07:00:00.000Z',
  },

  // ── 7. prompt_version_changed — batch ───────────────────────────────────────
  {
    id: 'sim-007',
    mode: 'batch',
    source: 'ai-gateway',
    workflowId: 'wf-cs',
    rawEventType: 'prompt_version_changed',
    smiEventType: 'prompt_version_change',
    description: 'Prompt bumped from v2.0.0 to v2.1.0 with hash mismatch — controlled change detected.',
    rawEvent: {
      event_type: 'prompt_version_changed',
      workflow_id: 'wf-cs',
      previous_version: '2.0.0',
      new_version: '2.1.0',
      prompt_hash_previous: 'a1b2c3d4',
      prompt_hash_new: 'e5f6a7b8',
      hash_match: false,
      timestamp: '2026-05-23T07:30:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-007',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T07:30:00.000Z',
      eventType: 'prompt_version_change',
      severity: 'medium',
      description: 'Prompt version change: 2.0.0 → 2.1.0 with hash mismatch. Full deduction applies.',
      payload: { previousPromptVersion: '2.0.0', newPromptVersion: '2.1.0', promptHashMatch: false },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -12,
    auditImpact: 'Audit record written: event_ingested. Prompt drift tracked in ledger.',
    recommendedNextStep: 'Verify prompt change is intentional and authorized. Re-anchor if approved.',
    timestamp: '2026-05-23T07:30:00.000Z',
  },

  // ── 8. model_version_changed — webhook_api ───────────────────────────────────
  {
    id: 'sim-008',
    mode: 'webhook_api',
    source: 'ai-gateway',
    workflowId: 'wf-003',
    rawEventType: 'model_version_changed',
    smiEventType: 'model_version_change',
    description: 'Model swapped from gpt-4o to gpt-4o-mini without baseline update.',
    rawEvent: {
      event_type: 'model_version_changed',
      workflow_id: 'wf-003',
      previous_model: 'gpt-4o-2024-05-13',
      new_model: 'gpt-4o-mini-2024-07-18',
      provider: 'OpenAI',
      baseline_model: 'gpt-4o-2024-05-13',
      authorized: false,
      timestamp: '2026-05-23T06:45:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-008',
      workflowId: 'wf-003',
      baselineId: 'bl-003',
      timestamp: '2026-05-23T06:45:00.000Z',
      eventType: 'model_version_change',
      severity: 'high',
      description: 'Model version change: gpt-4o-2024-05-13 → gpt-4o-mini-2024-07-18. Unauthorized swap.',
      payload: { previousModelVersion: 'gpt-4o-2024-05-13', newModelVersion: 'gpt-4o-mini-2024-07-18' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Model drift flagged. Score drops to Quarantine range.',
    recommendedNextStep: 'Revert model to approved baseline version. Contact model owner for authorization.',
    timestamp: '2026-05-23T06:45:00.000Z',
  },

  // ── 9. agent.tool_call — realtime ────────────────────────────────────────────
  {
    id: 'sim-009',
    mode: 'realtime',
    source: 'ai-gateway',
    workflowId: 'wf-cs',
    rawEventType: 'agent.tool_call',
    smiEventType: 'nominal_operation',
    description: 'Agent invoked case-lookup tool — within approved baseline tool list.',
    rawEvent: {
      event_type: 'agent.tool_call',
      workflow_id: 'wf-cs',
      tool_name: 'case-lookup',
      tool_version: '1.2.0',
      args_hash: 'ff00ab12',
      result_status: 'success',
      in_allowed_list: true,
      policy_ref: 'pol-cx-support-v2',
      timestamp: '2026-05-23T08:05:22.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-009',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T08:05:22.000Z',
      eventType: 'nominal_operation',
      severity: 'info',
      description: 'Agent tool call: case-lookup — approved tool, nominal operation.',
      payload: { toolName: 'case-lookup' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'No audit record written — approved tool call.',
    recommendedNextStep: 'No action required. Tool call within policy scope.',
    timestamp: '2026-05-23T08:05:22.000Z',
  },

  // ── 10. tool_access_added — webhook_api ─────────────────────────────────────
  {
    id: 'sim-010',
    mode: 'webhook_api',
    source: 'xops-review',
    workflowId: 'wf-cs',
    rawEventType: 'tool_access_added',
    smiEventType: 'nominal_operation',
    description: 'billing-api added to runtime tool list — controlled change, not in approved baseline.',
    rawEvent: {
      event_type: 'tool_access_added',
      workflow_id: 'wf-cs',
      tool_name: 'billing-api',
      added_by: 'deployment-config',
      baseline_includes_tool: false,
      change_ref: 'CR-2026-0091',
      timestamp: '2026-05-23T07:32:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-010',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T07:32:00.000Z',
      eventType: 'nominal_operation',
      severity: 'medium',
      description: 'Controlled change: billing-api added to runtime tool scope. Not in approved baseline.',
      payload: { toolName: 'billing-api' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'Controlled change recorded. Triggers score comparison on next continuity check.',
    recommendedNextStep: 'Run score continuity wf-cs to measure impact of expanded tool scope.',
    timestamp: '2026-05-23T07:32:00.000Z',
  },

  // ── 11. unauthorized_tool_call — f5_simulated ────────────────────────────────
  {
    id: 'sim-011',
    mode: 'f5_simulated',
    source: 'guardrail',
    workflowId: 'wf-cs',
    rawEventType: 'unauthorized_tool_call',
    smiEventType: 'unauthorized_tool_call',
    description: 'Agent called billing-api — not in approved baseline tool list. -10 pts deduction.',
    rawEvent: {
      event_type: 'unauthorized_tool_call',
      workflow_id: 'wf-cs',
      tool_name: 'billing-api',
      tool_call_args: '{"customer_id":"cust-9921","action":"issue_refund","amount":150}',
      baseline_tool_list: ['case-lookup', 'account-status', 'escalate-tier2'],
      guardrail_blocked: false,
      policy_ref: 'pol-cx-support-v2',
      timestamp: '2026-05-23T08:12:44.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-011',
      workflowId: 'wf-cs',
      baselineId: 'bl-cs-v2',
      timestamp: '2026-05-23T08:12:44.000Z',
      eventType: 'unauthorized_tool_call',
      severity: 'high',
      description: 'Agent invoked billing-api — not in approved baseline tool list. Deduction: -10 pts.',
      payload: { toolName: 'billing-api', toolCallArgs: '{"action":"issue_refund","amount":150}' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -10,
    auditImpact: 'Audit record written: event_ingested. Tool drift finding generated.',
    recommendedNextStep: 'Run: detect drift wf-cs → write audit wf-cs',
    timestamp: '2026-05-23T08:12:44.000Z',
  },

  // ── 12. memory_state_change — historical_replay ──────────────────────────────
  {
    id: 'sim-012',
    mode: 'historical_replay',
    source: 'ai-gateway',
    workflowId: 'wf-001',
    rawEventType: 'memory_state_change',
    smiEventType: 'memory_state_change',
    description: 'Session memory context updated — state hash mismatch against baseline snapshot.',
    rawEvent: {
      event_type: 'memory_state_change',
      workflow_id: 'wf-001',
      state_key: 'conversation-context-v3',
      previous_state_hash: 'aa11bb22',
      new_state_hash: 'cc33dd44',
      change_source: 'context-window-rotation',
      replay_window: '2026-05-01T00:00:00Z/2026-05-22T23:59:59Z',
      timestamp: '2026-05-22T14:22:10.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-012',
      workflowId: 'wf-001',
      baselineId: 'bl-001',
      timestamp: '2026-05-22T14:22:10.000Z',
      eventType: 'memory_state_change',
      severity: 'medium',
      description: 'Memory state change: state key conversation-context-v3 hash mismatch. -8 pts.',
      payload: { stateKey: 'conversation-context-v3', previousStateHash: 'aa11bb22', newStateHash: 'cc33dd44' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -8,
    auditImpact: 'Audit record written: event_ingested. State drift tracked in ledger.',
    recommendedNextStep: 'Investigate context rotation source. Confirm expected behavior with workflow owner.',
    timestamp: '2026-05-22T14:22:10.000Z',
  },

  // ── 13. orchestration_change — historical_replay ─────────────────────────────
  {
    id: 'sim-013',
    mode: 'historical_replay',
    source: 'xops-review',
    workflowId: 'wf-002',
    rawEventType: 'orchestration_change',
    smiEventType: 'orchestration_change',
    description: 'Orchestrator swapped from LangChain to direct OpenAI calls — not in baseline config.',
    rawEvent: {
      event_type: 'orchestration_change',
      workflow_id: 'wf-002',
      previous_orchestrator: 'langchain-v0.2',
      new_orchestrator: 'openai-direct-v1',
      authorized: false,
      baseline_orchestrator: 'langchain-v0.2',
      replay_window: '2026-04-15T00:00:00Z/2026-05-01T00:00:00Z',
      timestamp: '2026-04-28T11:05:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-013',
      workflowId: 'wf-002',
      baselineId: 'bl-002',
      timestamp: '2026-04-28T11:05:00.000Z',
      eventType: 'orchestration_change',
      severity: 'high',
      description: 'Orchestration change: langchain-v0.2 → openai-direct-v1. Unauthorized swap. -9 pts.',
      payload: { previousOrchestrator: 'langchain-v0.2', newOrchestrator: 'openai-direct-v1' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -9,
    auditImpact: 'Audit record written: event_ingested. Orchestration drift finding attached.',
    recommendedNextStep: 'Revert orchestrator to approved baseline. Require XOps sign-off before any orchestration swap.',
    timestamp: '2026-04-28T11:05:00.000Z',
  },

  // ── 14. support_escalation — metadata_only ───────────────────────────────────
  {
    id: 'sim-014',
    mode: 'metadata_only',
    source: 'xops-review',
    workflowId: 'wf-cs',
    rawEventType: 'support_escalation',
    smiEventType: null,
    description: 'Tier-1 agent escalated refund decision to Tier-2 — expected behavior per policy baseline.',
    rawEvent: {
      event_type: 'support_escalation',
      workflow_id: 'wf-cs',
      escalation_id: 'esc-20260523-001',
      escalation_tier: 'tier-2',
      reason_code: 'refund-threshold-exceeded',
      policy_ref: 'pol-cx-support-v2',
      metadata_only: true,
      raw_transcript_included: false,
      timestamp: '2026-05-23T08:08:30.000Z',
    },
    normalizedSMIEvent: null,
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'No scoring impact. Metadata logged as positive policy alignment signal.',
    recommendedNextStep: 'Confirm escalation was handled by Tier-2. No continuity action required.',
    timestamp: '2026-05-23T08:08:30.000Z',
  },

  // ── 15. incident_record — metadata_only ─────────────────────────────────────
  {
    id: 'sim-015',
    mode: 'metadata_only',
    source: 'xops-review',
    workflowId: 'wf-003',
    rawEventType: 'incident_record',
    smiEventType: 'guardrail_violation',
    description: 'Post-incident record: unauthorized data access attempted during inference. Metadata-only.',
    rawEvent: {
      event_type: 'incident_record',
      workflow_id: 'wf-003',
      incident_id: 'INC-2026-0044',
      severity: 'critical',
      category: 'unauthorized-data-access',
      guardrail_triggered: true,
      guardrail_id: 'grl-pii-protection-v2',
      raw_output_included: false,
      de_identified: true,
      policy_ref: 'pol-003-v2',
      timestamp: '2026-05-22T21:14:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-015',
      workflowId: 'wf-003',
      baselineId: 'bl-003',
      timestamp: '2026-05-22T21:14:00.000Z',
      eventType: 'guardrail_violation',
      severity: 'critical',
      description: 'Incident INC-2026-0044: guardrail blocked unauthorized data access. De-identified metadata only.',
      payload: { guardrailId: 'grl-pii-protection-v2', guardrailRule: 'unauthorized-data-access' },
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: -15,
    auditImpact: 'Audit record written: event_ingested. Critical incident linked to audit ledger.',
    recommendedNextStep: 'Quarantine wf-003 pending XOps incident review. Run full drift and audit report.',
    timestamp: '2026-05-22T21:14:00.000Z',
  },

  // ── 16. regression_test_result — batch ───────────────────────────────────────
  {
    id: 'sim-016',
    mode: 'batch',
    source: 'xops-review',
    workflowId: 'wf-001',
    rawEventType: 'regression_test_result',
    smiEventType: 'nominal_operation',
    description: 'Regression test suite passed — all 47 test cases within policy-defined bounds.',
    rawEvent: {
      event_type: 'regression_test_result',
      workflow_id: 'wf-001',
      test_suite_id: 'suite-wf001-v2-regression',
      total_tests: 47,
      passed: 47,
      failed: 0,
      result: 'PASS',
      baseline_ref: 'bl-001',
      policy_ref: 'pol-001-v2',
      timestamp: '2026-05-23T06:00:00.000Z',
    },
    normalizedSMIEvent: {
      id: 'evt-sim-016',
      workflowId: 'wf-001',
      baselineId: 'bl-001',
      timestamp: '2026-05-23T06:00:00.000Z',
      eventType: 'nominal_operation',
      severity: 'info',
      description: 'Regression test suite PASS: 47/47 cases within policy bounds.',
      payload: {},
    },
    schemaValid: true,
    schemaErrors: [],
    continuityImpact: 0,
    auditImpact: 'Regression pass logged. Positive continuity signal — no deduction.',
    recommendedNextStep: 'Proceed with scheduled deployment. No continuity concerns.',
    timestamp: '2026-05-23T06:00:00.000Z',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getEventsByMode(mode: IngestionMode): SimulatedIngestionEvent[] {
  return simulatedIngestionEvents.filter((e) => e.mode === mode);
}

export function getEventsByWorkflow(workflowId: string): SimulatedIngestionEvent[] {
  return simulatedIngestionEvents.filter((e) => e.workflowId === workflowId);
}

export const MODE_EVENT_COUNTS: Record<IngestionMode, number> = {
  realtime:          simulatedIngestionEvents.filter((e) => e.mode === 'realtime').length,
  batch:             simulatedIngestionEvents.filter((e) => e.mode === 'batch').length,
  historical_replay: simulatedIngestionEvents.filter((e) => e.mode === 'historical_replay').length,
  webhook_api:       simulatedIngestionEvents.filter((e) => e.mode === 'webhook_api').length,
  metadata_only:     simulatedIngestionEvents.filter((e) => e.mode === 'metadata_only').length,
  f5_simulated:      simulatedIngestionEvents.filter((e) => e.mode === 'f5_simulated').length,
};
