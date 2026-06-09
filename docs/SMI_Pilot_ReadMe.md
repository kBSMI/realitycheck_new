# SMI Continuity Assurance Pilot — README

**Version:** 1.0  
**Phase:** Pilot Console (Phase 1–6)  
**Classification:** Pilot / Pre-NDA Review

---

## What Is This

The SMI Continuity Assurance Pilot Console is an interactive demonstration of Symbolic Memory Infrastructure (SMI) applied as an AI Continuity Assurance layer for enterprise AI workflows.

It shows how SMI establishes behavioral baselines for AI workflows and measures all subsequent behavior against those anchors — producing deterministic continuity scores, drift findings, audit evidence, and remediation recommendations.

---

## What the Pilot Demonstrates

| Step | Capability |
|---|---|
| 1 | Baseline establishment — approved model, prompt, policy, and tool state captured as an immutable anchor |
| 2 | Controlled change introduction — model version, prompt hash, policy version, or tool scope altered |
| 3 | Event ingestion — behavioral, structural, and operational events normalized and scored |
| 4 | Continuity scoring — deterministic 0–100 score computed from baseline delta |
| 5 | Drift detection — named findings surfaced across 7 rule categories |
| 6 | Audit ledger — append-only, policy-referenced evidence chain written |
| 7 | Pilot report — session summary for XOps sign-off |

---

## Pilot Workflows

Five representative enterprise AI workflows are included:

| ID | Name | Score | Risk Level |
|---|---|---|---|
| wf-001 | Core Inference Engine | 92 | Approved |
| wf-002 | Data Enrichment Agent | 92 | Approved |
| wf-003 | Seasonal Campaign AI | 8 | Quarantine |
| wf-004 | LCOS Connector v3 | 64 | Review Required |
| wf-005 | AI Gateway Proxy | 100 | Approved |

A sixth scenario workflow (wf-cs, Customer Support AI) is used in the Lifecycle Demo to illustrate the guardrail regression scenario end-to-end.

---

## Key Design Constraints

- All data is synthetic. No live AI infrastructure is required.
- Scoring is deterministic. The same inputs always produce the same outputs. No `Math.random()` is used anywhere in the scoring engine.
- No external API keys, databases, or backend dependencies are required to run the pilot console.
- The F5 ADSP Simulation Connector uses mock event structures only. It is not an official F5 integration.

---

## Navigation

| Page | Purpose |
|---|---|
| Dashboard | Live continuity score grid for all workflows |
| Workflow Baselines | Baseline anchor details and sub-scores |
| Event Ingestion | Event log with type, severity, and score impact; simulation buttons for all 7 event types |
| Continuity Analysis | Score trend, drift findings, remediation recommendations |
| F5 ADSP Simulation | 8-stream simulation connector with per-event detail |
| Audit Ledger | Hash-chained append-only session evidence chain |
| Pilot Report | Session summary with JSON export and clipboard copy for XOps sign-off |
| Service Framework | 9-service architecture documentation |
| Lifecycle Demo | Step-by-step walkthrough of the guardrail regression scenario |
| Pilot Test Scenarios | 5 selectable pre-built scenarios for structured scenario review |

---

## Technology Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React (icons)
- Vitest — 14 unit tests covering scoring engine, risk level classification, and hash chain integrity
- All services implemented as pure TypeScript functions — no backend required for the pilot

---

## Next Stage

The next stage of SMI development involves packaging the nine services behind a lightweight API layer for bounded validation under partner review or NDA. See `SMI_Service_Map.md` for the service architecture and integration paths.

---

*See `SMI_IP_Boundary_Note.md` for IP and confidentiality terms applicable to this pilot material.*
