# SMI Ingestion Model

## Purpose

This document describes how the SMI Continuity Assurance Pilot ingests AI workflow events for bounded validation. The ingestion model is designed to be metadata-first, source-agnostic, and compatible with a range of enterprise AI observability pipelines without requiring raw traffic inspection.

All data in the current prototype is deterministic and synthetic. Production ingestion parameters would be scoped during a technical pilot engagement based on actual event volume, latency requirements, data sensitivity, and deployment architecture.

---

## Six Ingestion Modes

| Mode | Label | Description | Use Case | Pilot Status |
|------|-------|-------------|----------|--------------|
| `realtime` | Real-time Stream | Continuous event feed from AI gateway or guardrail layer | Live workflow monitoring | Simulated |
| `batch` | Batch File | Periodic bulk upload of event logs (JSON, JSONL, CSV) | Nightly reconciliation, policy audit | Simulated |
| `historical_replay` | Historical Replay | Re-processing of archived event windows against a baseline | Retrospective drift analysis | Simulated |
| `webhook_api` | Webhook / API | Push-based inbound events via HTTP endpoint | Guardrail callbacks, policy engine hooks | Simulated |
| `metadata_only` | Metadata-only | Ingestion of version IDs, hashes, and outcome codes only — no raw content | Privacy-sensitive workflows | Simulated |
| `f5_simulated` | F5-style Simulated | Mock F5 ADSP-style events for gateway, guardrail, and red team simulation | F5 interoperability demonstration | Simulated |

---

## Event Type Catalog

All 16 event types supported by the Ingestion Simulator, with their SMI normalization mapping and continuity deduction.

| Raw Event Type | SMI EventType | Deduction (pts) | Severity | Notes |
|----------------|---------------|-----------------|----------|-------|
| `ai_gateway.request` | `nominal_operation` | 0 | info | Nominal inference request; no scoring impact |
| `ai_gateway.response` | `nominal_operation` | 0 | info | Clean response pass; no scoring impact |
| `ai_guardrails.policy_violation` | `guardrail_violation` | -15 | high | Guardrail blocked policy-violating output |
| `ai_guardrails.prompt_injection_detected` | `forbidden_behavior` | -15 | critical | Injection attempt detected and blocked |
| `ai_redteam.test_result` | `forbidden_behavior` | -15 | high | Red team found exploitable condition |
| `policy_version_changed` | `policy_version_mismatch` | -15 | high | Runtime policy version does not match baseline |
| `prompt_version_changed` | `prompt_version_change` | -12 (hash mismatch) / -3 (hash match) | medium | Hash match reduces deduction |
| `model_version_changed` | `model_version_change` | -15 | high | Model swap without baseline update |
| `agent.tool_call` | `nominal_operation` | 0 | info | Approved tool call; no scoring impact |
| `tool_access_added` | `nominal_operation` | 0 | medium | Controlled change — triggers score comparison |
| `unauthorized_tool_call` | `unauthorized_tool_call` | -10 | high | Tool not in approved baseline list |
| `memory_state_change` | `memory_state_change` | -8 | medium | State hash mismatch against baseline |
| `orchestration_change` | `orchestration_change` | -9 | high | Orchestrator swap not in baseline |
| `support_escalation` | `nominal_operation` (or null) | 0 | info | Policy-compliant escalation; positive signal |
| `incident_record` | `guardrail_violation` | -15 | critical | Post-incident metadata; triggers audit record |
| `regression_test_result` | `nominal_operation` | 0 | info | Test suite pass; positive continuity signal |

---

## Metadata-first Approach

SMI does not require raw enterprise traffic for initial validation. The preferred pilot approach ingests:

- Baseline IDs and capture timestamps
- Model, prompt, and policy version identifiers and hashes
- Tool-call metadata (tool name, authorization status)
- Guardrail event codes and outcomes
- Workflow outcome codes and escalation flags
- Timestamps and session references
- Selected de-identified summaries where additional context is needed

Raw content, PII, and proprietary prompts are not required and should not be included in pilot data packages.

---

## Schema Validation

Every inbound event is validated against the SMI intake schema before normalization. Validation checks:

1. `workflow_id` — required, must match a registered workflow
2. `event_type` — required, must be a recognized raw event type
3. `timestamp` — required, ISO 8601 format
4. `policy_ref` — required for scoring events; optional for nominal/metadata events
5. Payload fields — type-checked per event type (e.g., `confidence` must be 0–1 for behavioral events)

Events that fail validation are rejected at the intake boundary. A `routingDecision: 'reject'` is returned with the validation error list. Failed events are not scored but are logged for operational review.

---

## Routing Decisions

After normalization, each event is assigned a routing decision:

| Decision | Condition | Effect |
|----------|-----------|--------|
| `score` | Standard behavioral or structural event | Fed into scoring engine; audit record written |
| `flag` | Critical severity event | Scoring + immediate XOps alert |
| `ignore` | Nominal operation with no policy impact | Logged but not scored |
| `reject` | Schema validation failure | Not processed; error returned to caller |

---

## Production Integration Path

The current prototype uses static seed data. A production integration would follow this path:

1. **Schema alignment** — customer provides sample events from their AI gateway, guardrail, and policy engine
2. **Mapping definition** — SMI team creates a normalization map from customer event schema to SMI `AIWorkflowEvent`
3. **Pilot connector** — lightweight adapter deployed in customer environment to forward normalized events
4. **Baseline capture** — initial baseline anchored from approved workflow state
5. **Event replay** — selected historical window replayed to establish baseline score distribution
6. **Live ingestion** — real-time or scheduled batch ingestion activated for ongoing monitoring

No raw traffic is required at any stage. The pilot connector forwards metadata and normalized event codes only.
