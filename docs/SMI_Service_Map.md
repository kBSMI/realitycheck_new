# SMI Service Map

**Version:** 1.0  
**Classification:** Pilot / Pre-NDA Review

---

## Overview

The SMI Continuity Assurance platform is composed of nine services. Each service has a defined input/output contract, a pilot implementation in the console, and a path to enterprise deployment.

---

## Service Data Flow

```
External Events
      │
      ▼
┌─────────────────────────┐
│  SMI Ingestion Service  │  ◄── F5 ADSP Connector
│  (normalize + route)    │  ◄── Guardrail Connector
└────────────┬────────────┘
             │
      ┌──────┴──────┐
      ▼             ▼
┌──────────┐  ┌─────────────────────────┐
│ Baseline │  │  Behavioral Continuity  │
│  Anchor  │──│  Engine (Scoring)       │
│  Service │  └────────────┬────────────┘
└──────────┘               │
                    ┌──────┴──────┐
                    ▼             ▼
             ┌──────────┐  ┌─────────────┐
             │  Drift   │  │   Audit     │
             │Detection │  │   Ledger    │
             └────┬─────┘  └──────┬──────┘
                  │               │
                  └───────┬───────┘
                          ▼
                  ┌───────────────┐
                  │ Pilot Report  │
                  │   Service     │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │ Dashboard /   │
                  │ XOps Console  │
                  └───────────────┘
```

---

## Service Specifications

### 1. SMI Ingestion Service

| Field | Value |
|---|---|
| Purpose | Normalize and classify raw events from AI workflows and upstream systems |
| Input | Raw workflow events, F5 ADSP stream payloads, guardrail triggers, version change signals |
| Output | Normalized AIWorkflowEvent, routing decision (consume / flag / reject / ignore) |
| Pilot State | Implemented as TypeScript event objects across 9 event types |
| Enterprise Path | REST / gRPC microservice; Kafka consumer for high-throughput streams; SDK connectors for major agent frameworks |

---

### 2. Baseline Anchor Service

| Field | Value |
|---|---|
| Purpose | Capture and version the approved behavioral state of a workflow at sign-off time |
| Input | AIWorkflow object, XOps reviewer ID, risk level decision, reviewer notes |
| Output | Immutable BaselineAnchor record, audit ledger entry: baseline_captured |
| Pilot State | 5 anchors + 1 lifecycle demo anchor covering all pilot workflows |
| Enterprise Path | Append-only database persistence; CI/CD pipeline integration for deployment-gate capture; baseline diff API |

---

### 3. Behavioral Continuity Engine (Memory Morphology Engine)

| Field | Value |
|---|---|
| Purpose | Compute deterministic continuity score from baseline delta using event-type deduction table |
| Input | AIWorkflow (live), BaselineAnchor (approved), AIWorkflowEvent[] |
| Output | ContinuityScore: primary score, 4 sub-scores, risk level, deduction breakdown, recommended action |
| Pilot State | Live in-browser scoring engine; reproducible across all 5 workflows + lifecycle demo |
| Enterprise Path | Stateless scoring microservice (Lambda / Cloud Run); stream scoring via Kafka consumer |

**Deduction Table (summary):**

| Event Type | Deduction |
|---|---|
| model_version_change | -15 |
| policy_version_mismatch | -15 |
| guardrail_violation | -15 |
| forbidden_behavior (≥50% confidence) | -15 |
| prompt_version_change (hash mismatch) | -12 |
| prompt_version_change (hash match) | -3 |
| unauthorized_tool_call | -10 |
| sensitive_data_risk | -10 |
| orchestration_change | -9 |
| memory_state_change | -8 |
| nominal_operation | 0 |

---

### 4. Drift Detection Service

| Field | Value |
|---|---|
| Purpose | Run 7 deterministic rule passes to surface named DriftFinding objects |
| Input | AIWorkflow, BaselineAnchor, AIWorkflowEvent[], ContinuityScore |
| Output | DriftFinding[]: category, severity, magnitude, affected event IDs, remediation recommendation |
| Pilot State | Live service producing findings across all pilot workflows; 5 findings on wf-003 |
| Enterprise Path | Configurable rule thresholds per org; ticketing integration (Jira, ServiceNow); XOps finding queue |

**Drift Categories:**

`model_drift` · `prompt_drift` · `policy_drift` · `tool_drift` · `behavior_drift` · `state_drift` · `orchestration_drift`

---

### 5. Continuity Audit Ledger

| Field | Value |
|---|---|
| Purpose | Hash-chained, append-only, policy-referenced evidence chain for all continuity actions |
| Input | Actions from all services: baseline_captured, event_ingested, score_computed, drift_detected, remediation_applied, xops_review_completed, f5_simulation_run |
| Output | AuditLedgerRecord[]; session and workflow scoped queries; ledger stats; hash chain for tamper evidence |
| Pilot State | 15 seed records + live records from Lifecycle Demo; each record carries a djb2 hash chain (currentHash ← previousHash); full session evidence chain |
| Enterprise Path | Append-only PostgreSQL with insert-only RLS; replace pilot djb2 with SHA-256 for production tamper evidence; SIEM export (Splunk, Datadog) |

---

### 6. Policy / Guardrail Connector

| Field | Value |
|---|---|
| Purpose | Translate external guardrail system events into SMI event types |
| Input | Guardrail policy violation events, prompt injection detection results, forbidden behavior flags |
| Output | Mapped SMI AIWorkflowEvent (guardrail_violation, forbidden_behavior, sensitive_data_risk) |
| Pilot State | Demonstrated via F5 ADSP Simulation Connector guardrail stream events |
| Enterprise Path | Connectors for Aporia, Guardrails.AI, Azure AI Content Safety, AWS Bedrock Guardrails; webhook and poll modes |

---

### 7. F5 ADSP Simulation Connector

| Field | Value |
|---|---|
| Purpose | Map SMI event structures to F5-style AI gateway, guardrail, red-team, and XOps streams |
| Input | F5 ADSP stream events across 8 stream types with version context and classification |
| Output | F5StreamEvent with SMI ingestion metadata; audit ledger entry: f5_simulation_run |
| Pilot State | 24 events across all 8 stream types and 5 workflows; live simulation controls |
| Enterprise Path | Pursue formal technology partner evaluation with F5 to explore an approved ADSP connector; live webhook consumer; bidirectional score enforcement |

**Stream Types:**

`ai_gateway.request` · `ai_gateway.response` · `ai_guardrails.policy_violation` · `ai_guardrails.prompt_injection_detected` · `ai_redteam.test_result` · `adsp.policy_version_changed` · `agent.tool_call` · `xops.workflow_anomaly`

---

### 8. Pilot Report Service

| Field | Value |
|---|---|
| Purpose | Aggregate all engine outputs into a structured report for XOps sign-off |
| Input | ContinuityScore[], DriftFinding[], AuditLedger stats, F5 simulation results, session metadata |
| Output | PilotReport: per-workflow entries, key findings, SMI value demonstrated, approvedForNextPhase flag |
| Pilot State | Live Pilot Report page aggregating real engine output across all 5 workflows |
| Enterprise Path | PDF/JSON export; digital XOps reviewer signature; GRC platform integration; phase-gate automation |

---

### 9. Dashboard / XOps Review Console

| Field | Value |
|---|---|
| Purpose | Reviewer-facing interface for live monitoring, drift surfacing, and governance decisions |
| Input | Live scores, drift findings, audit ledger records, remediation recommendations |
| Output | Continuity status grid, finding queue, audit view, remediation cards, XOps decision record |
| Pilot State | This console — all 9 services operating together without external dependencies |
| Enterprise Path | SaaS hosted or on-premise; enterprise SSO; role-based access; real-time WebSocket updates; PagerDuty / Slack alerting |

---

*See `SMI_IP_Boundary_Note.md` for IP and confidentiality terms.*
