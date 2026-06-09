# SMI F5 ADSP Simulation Guide

**Version:** 1.0  
**Classification:** Pilot / Pre-NDA Review

---

## Disclaimer

> The F5 ADSP Simulation Connector is a demonstration layer using mock event structures to illustrate how SMI could interoperate with AI gateway, guardrail, red-team, and XOps event streams. It is not an official F5 integration.

---

## Purpose

The F5 ADSP Simulation Connector demonstrates how the SMI Continuity Assurance layer could ingest and score events originating from an F5 AI infrastructure stack — including the AI Gateway, AI Guardrails, AI Red Team, and ADSP policy management layers.

The simulation uses 24 synthetic events distributed across all 8 F5 ADSP stream types and all 5 pilot workflows. Each event carries version context (model, prompt, policy), an SMI ingestion status, a mapped SMI event type, and a deterministic continuity delta.

---

## The 8 Simulated Stream Types

### Stream 1: ai_gateway.request

Covers inbound request classification, routing decisions, and auth validation at the AI gateway layer.

- Pass events: authorized requests classified within policy bounds
- Fail events: requests blocked due to policy version insufficient or guardrail state mismatch
- Warn events: rate limit threshold crossed, request flagged for review

**SMI mapping:** `nominal_operation`, `policy_version_mismatch`, `memory_state_change`

---

### Stream 2: ai_gateway.response

Covers outbound response validation, PII scanning, and auto-redaction.

- Pass events: clean responses with no PII detected
- Warn events: near-boundary PII auto-redacted before delivery
- Fail events: PII breach blocked at gateway due to guardrails disabled

**SMI mapping:** `nominal_operation`, `sensitive_data_risk`

---

### Stream 3: ai_guardrails.policy_violation

Covers active guardrail rule breaches, forbidden output detection, and enforcement gaps.

- Fail events: guardrail enforcement gap confirmed (guardrailsEnabled=false), forbidden behavior detected at high confidence
- Pass events: guardrail evaluation completed with zero violations

**SMI mapping:** `guardrail_violation`, `forbidden_behavior`, `nominal_operation`

---

### Stream 4: ai_guardrails.prompt_injection_detected

Covers adversarial prompt manipulation attempts and jailbreak probes.

- Pass events: injection blocked pre-inference; guardrails correctly intercepted
- Fail events: injection succeeded because guardrails were disabled

**SMI mapping:** `guardrail_violation`, `forbidden_behavior`

---

### Stream 5: ai_redteam.test_result

Covers adversarial test outcomes from red team exercises.

- Pass events: all adversarial inputs blocked; baseline integrity confirmed
- Fail events: policy bypass confirmed, PII extraction partially successful

**SMI mapping:** `nominal_operation`, `forbidden_behavior`, `sensitive_data_risk`

---

### Stream 6: adsp.policy_version_changed

Covers policy version change notifications at the ADSP layer.

- Fail events: policy rollback detected (downgrade from 2.1.0 to 1.8.0)
- Warn events: policy lag detected — current version below enterprise standard
- Pass events: policy upgrade confirmed, baseline re-capture triggered

**SMI mapping:** `policy_version_mismatch`, `baseline_capture`

---

### Stream 7: agent.tool_call

Covers tool invocations by agent workflows — authorized and unauthorized.

- Pass events: tool call within approved baseline tool list
- Fail events: unauthorized tool call (tool not in approved baseline)
- Warn events: orchestration change detected on tool routing path

**SMI mapping:** `nominal_operation`, `unauthorized_tool_call`, `orchestration_change`

---

### Stream 8: xops.workflow_anomaly

Covers XOps human-review escalations and workflow anomaly flags.

- Pass events: XOps review completed, no escalation required
- Fail events: quarantine escalation, multiple critical violations confirmed
- Warn events: review required, policy upgrade outstanding

**SMI mapping:** `nominal_operation`, `policy_version_mismatch`, `orchestration_change`

---

## Event Distribution Across Pilot Workflows

| Workflow | Notable F5 Events |
|---|---|
| wf-001 (Core Inference Engine) | Pass events across all 4 source streams; prompt injection blocked; red team confirmed baseline integrity |
| wf-002 (Data Enrichment Agent) | Near-boundary PII auto-redacted; authorized tool call completed |
| wf-003 (Seasonal Campaign AI) | Heaviest negative delta: policy rollback, guardrail enforcement gap, forbidden behavior, injection succeeded, red team policy bypass confirmed, quarantine escalation |
| wf-004 (LCOS Connector v3) | Policy lag, orchestration change, rate limit warn, XOps review required |
| wf-005 (AI Gateway Proxy) | Gold standard: all red team probes blocked, XOps approved, injection blocked at gateway |

---

## How to Run a Simulation

1. Navigate to the **F5 ADSP Simulation** page in the pilot console.
2. Click **Run Stream** on any individual stream panel, or click **Run All Streams** to execute all 8 in parallel.
3. Each simulation writes audit ledger records via `recordF5SimulationRun`.
4. Expand **event detail** to inspect per-event: event name, workflow, timestamp, severity, model/prompt/policy version, SMI consumed status, SMI event type mapping, and continuity delta.
5. Expand **raw payload** on any row to inspect the full event payload fields.

---

## Simulation to Audit Ledger Flow

```
F5 Stream Event
      │
      ▼
SMI Ingestion Service
  ├─ smiConsumed: consumed / flagged / rejected / ignored
  └─ smiEventType: mapped to canonical EventType
      │
      ▼
continuityDelta applied to current workflow score
      │
      ▼
Audit Ledger Record (action: f5_simulation_run)
  ├─ session ID
  ├─ workflow ID
  ├─ policyRef
  ├─ continuityScoreSnapshot
  └─ riskLevelSnapshot
```

---

## Continuity Delta Reference

| Classification | Typical Delta Range |
|---|---|
| pass | 0 (nominal confirmation) |
| warn | -2 to -5 (minor deviation flagged) |
| fail | -5 to -18 (policy violation, behavior breach, or exploit confirmed) |

---

## Candidate Real-World Integration Points

The following integration paths are illustrative of how this simulation layer could be replaced with live connections:

| Simulated Source | Real Integration Candidate |
|---|---|
| AI gateway request/response | F5 AI Gateway event webhook |
| Guardrail policy violation | F5 AI Guardrails enforcement stream |
| Prompt injection detection | F5 AI Guardrails injection filter callback |
| Red team test result | F5 AI Red Team scheduled probe API |
| ADSP policy version changed | F5 ADSP policy management event bus |
| Agent tool call | LangChain / LlamaIndex tool invocation hook |
| XOps workflow anomaly | Internal XOps ticketing / SIEM alert feed |

These integration paths would be scoped and agreed under a formal technology partner evaluation with F5 or equivalent enterprise partner process.

---

*See `SMI_IP_Boundary_Note.md` for IP and confidentiality terms.*
