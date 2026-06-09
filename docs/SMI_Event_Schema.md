# SMI Event Schema

**Version:** 1.0  
**Classification:** Pilot / Pre-NDA Review

---

## Overview

All behavioral, structural, and operational signals flowing through the SMI pipeline are normalized into one of two typed event shapes:

- **AIWorkflowEvent** — the canonical SMI event used by the scoring engine and audit ledger
- **F5StreamEvent** — the extended event shape used by the F5 ADSP Simulation Connector

Both shapes share a common vocabulary of event types, severities, and risk levels defined below.

---

## Core Enumerations

### EventType

The 12 event types that the scoring engine recognizes. Each carries a deterministic deduction weight.

| Value | Category | Deduction |
|---|---|---|
| `model_version_change` | Structural drift | -15 |
| `policy_version_mismatch` | Policy drift | -15 |
| `guardrail_violation` | Policy / behavior | -15 |
| `forbidden_behavior` | Behavior drift | -15 (≥50% conf) / -7 (<50% conf) |
| `prompt_version_change` | Structural drift | -12 (hash mismatch) / -3 (hash match) |
| `unauthorized_tool_call` | Tool drift | -10 |
| `sensitive_data_risk` | Data governance | -10 |
| `orchestration_change` | State / control flow | -9 |
| `memory_state_change` | State drift | -8 |
| `nominal_operation` | No violation | 0 |
| `baseline_capture` | Administrative | 0 |
| `baseline_override` | Administrative | 0 |

### EventSeverity

`info` · `low` · `medium` · `high` · `critical`

### RiskLevel

| Score Range | Level |
|---|---|
| 90–100 | `Approved` |
| 75–89 | `Watch` |
| 60–74 | `Review Required` |
| < 60 | `Quarantine` |

---

## AIWorkflowEvent

The canonical event shape ingested by the scoring engine.

```typescript
interface AIWorkflowEvent {
  id: string;              // unique event ID
  workflowId: string;      // references AIWorkflow.id
  baselineId: string;      // references BaselineAnchor.id
  timestamp: string;       // ISO 8601
  eventType: EventType;
  severity: EventSeverity;
  description: string;
  payload: EventPayload;
}
```

### EventPayload Fields

Payload fields are populated based on `eventType`. Only relevant fields are present per event.

| Field | Type | Populated by |
|---|---|---|
| `previousModelVersion` | string | model_version_change |
| `newModelVersion` | string | model_version_change |
| `previousPromptVersion` | string | prompt_version_change |
| `newPromptVersion` | string | prompt_version_change |
| `promptHashMatch` | boolean | prompt_version_change |
| `expectedPolicyVersion` | string | policy_version_mismatch |
| `actualPolicyVersion` | string | policy_version_mismatch |
| `toolName` | string | unauthorized_tool_call |
| `toolCallArgs` | string | unauthorized_tool_call |
| `behaviorLabel` | string | forbidden_behavior |
| `behaviorConfidence` | number (0–1) | forbidden_behavior |
| `dataCategory` | string | sensitive_data_risk |
| `exposureVector` | string | sensitive_data_risk |
| `guardrailId` | string | guardrail_violation |
| `guardrailRule` | string | guardrail_violation |
| `stateKey` | string | memory_state_change |
| `previousStateHash` | string | memory_state_change |
| `newStateHash` | string | memory_state_change |
| `previousOrchestrator` | string | orchestration_change |
| `newOrchestrator` | string | orchestration_change |

---

## F5StreamEvent

Extended event shape for the F5 ADSP Simulation Connector. Includes version context at time of event and SMI ingestion metadata.

```typescript
interface F5StreamEvent {
  id: string;
  stream: F5StreamType;        // granular F5 stream type
  source: F5EventSource;       // rolled-up source category
  workflowId: string;
  timestamp: string;           // ISO 8601
  severity: EventSeverity;
  eventName: string;           // e.g. "GUARDRAIL_ENFORCEMENT_GAP"
  description: string;
  classification: 'pass' | 'warn' | 'fail';

  // Version context at time of event
  modelVersion: string;
  promptVersion: string;
  policyVersion: string;

  // SMI ingestion metadata
  smiConsumed: 'consumed' | 'flagged' | 'rejected' | 'ignored';
  smiEventType: EventType;     // canonical SMI mapping
  continuityDelta: number;     // net continuity score impact

  policyRef: string;
  rawPayload: Record<string, string | number | boolean>;
}
```

### F5StreamType Values

| Value | Description |
|---|---|
| `ai_gateway.request` | Inbound request classification and routing |
| `ai_gateway.response` | Outbound response validation and redaction |
| `ai_guardrails.policy_violation` | Active guardrail rule breach |
| `ai_guardrails.prompt_injection_detected` | Adversarial prompt manipulation attempt |
| `ai_redteam.test_result` | Red team probe outcome |
| `adsp.policy_version_changed` | Policy version change at ADSP layer |
| `agent.tool_call` | Tool invocation from agent workflow |
| `xops.workflow_anomaly` | XOps anomaly escalation |

### F5EventSource Values

| Value | Description |
|---|---|
| `ai-gateway` | AI gateway and ADSP layer events |
| `guardrail` | Guardrail system enforcement events |
| `red-team` | Adversarial test probe events |
| `xops-review` | XOps human-review escalations |

### SMI Consumed Status

| Value | Meaning |
|---|---|
| `consumed` | Fully ingested and scored. Delta applied. |
| `flagged` | Ingested with elevated attention. Scored and marked for XOps review. |
| `rejected` | Invalid event structure or out-of-scope. Not scored. Logged only. |
| `ignored` | Below threshold or outside policy scope. No delta applied. |

---

## BaselineAnchor

Immutable snapshot of a workflow's approved state. All scoring is measured as delta from this record.

```typescript
interface BaselineAnchor {
  id: string;
  workflowId: string;
  capturedAt: string;          // ISO 8601
  capturedBy: string;          // XOps reviewer ID or "system"
  sessionRef: string;
  approvedRiskLevel: RiskLevel;
  modelConfig: ModelConfig;
  promptConfig: PromptConfig;
  policyConfig: PolicyConfig;
  notes: string;
}
```

---

## AuditLedgerRecord

Immutable record written to the Audit Ledger on each significant action.

```typescript
interface AuditLedgerRecord {
  id: string;
  sessionId: string;
  workflowId: string;
  action: AuditAction;         // see values below
  actorId: string;
  timestamp: string;           // ISO 8601
  policyRef: string;
  continuityScoreSnapshot: number;
  riskLevelSnapshot: RiskLevel;
  detail: string;
  linkedEventIds: string[];
  linkedBaselineId: string;
}
```

### AuditAction Values

`baseline_captured` · `event_ingested` · `score_computed` · `drift_detected` · `remediation_applied` · `workflow_quarantined` · `workflow_approved` · `xops_review_completed` · `f5_simulation_run`

---

*See `SMI_Service_Map.md` for service architecture. See `SMI_IP_Boundary_Note.md` for IP terms.*
