# SMI Pilot Test Plan

**Version:** 1.0  
**Classification:** Pilot / Pre-NDA Review

---

## Purpose

This document defines the test cases a reviewer can use to verify that the SMI Continuity Assurance Pilot Console is functioning correctly and that the scoring, drift detection, and audit systems produce the expected results from the synthetic dataset.

All test cases are deterministic. The same inputs always produce the same expected outputs.

---

## Test Scope

| Area | Covered |
|---|---|
| Continuity scoring engine | Yes |
| Baseline anchor verification | Yes |
| Drift detection rule passes | Yes |
| Audit ledger write and read | Yes |
| F5 ADSP simulation connector | Yes |
| Lifecycle demo end-to-end | Yes |
| Pilot report generation | Yes |

---

## Expected Score Outputs

The following scores are produced by the live engine from the synthetic event dataset. Use these as reference values when verifying the console.

| Workflow | Expected Score | Expected Risk Level |
|---|---|---|
| wf-001 Core Inference Engine | 92 | Approved |
| wf-002 Data Enrichment Agent | 92 | Approved |
| wf-003 Seasonal Campaign AI | 8 | Quarantine |
| wf-004 LCOS Connector v3 | 64 | Review Required |
| wf-005 AI Gateway Proxy | 100 | Approved |
| wf-cs Customer Support AI (Lifecycle Demo) | 63 | Review Required |

> wf-cs deduction breakdown: `prompt_version_change` (-12, hash mismatch) + `unauthorized_tool_call` (-10, billing-api) + `forbidden_behavior` (-15, confidence 0.88) = -37 → score 63, Review Required.
>
> wf-001/wf-002 each have a single `memory_state_change` event (-8), resulting in 92 (Approved).
> wf-004 has `prompt_version_change` (-12) + `policy_version_mismatch` (-15) + `orchestration_change` (-9) = -36 → score 64 (Review Required).
> wf-005 has only a `nominal_operation` event (0 deduction) → score 100 (Approved).

---

## Test Cases

### TC-01: Dashboard Score Grid

**Objective:** Verify all 5 workflow scores display correctly on the Dashboard.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Dashboard | Score cards visible for all 5 workflows |
| 2 | Check wf-005 score | 100, Approved (green) |
| 3 | Check wf-003 score | ≤ 60, Quarantine (red) |
| 4 | Check risk level badge colors | Green=Approved, Yellow=Watch, Orange=Review Required, Red=Quarantine |

---

### TC-02: Baseline Anchor Content

**Objective:** Verify baseline anchor details are accurate for wf-003.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Workflow Baselines | Baseline list visible |
| 2 | Select wf-003 (Seasonal Campaign AI) | Baseline bl-003 displayed |
| 3 | Check baseline policy version | 2.1.0 |
| 4 | Check baseline guardrailsEnabled | true |
| 5 | Check live workflow policy version | 1.8.0 |
| 6 | Verify drift is indicated | Policy version mismatch visible |

---

### TC-03: Deterministic Scoring — wf-003

**Objective:** Verify the scoring engine produces a Quarantine result for wf-003 from the event dataset.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Continuity Analysis | Score breakdown visible |
| 2 | Select wf-003 | Score ≤ 60, risk level Quarantine |
| 3 | Verify deduction list | model_version_change (-15), policy_version_mismatch (-15), guardrail_violation (-15), forbidden_behavior (-15), unauthorized_tool_call (-10), sensitive_data_risk (-10), prompt_version_change (-12) visible |
| 4 | Verify policyAlignment sub-score | Low (policy version mismatch + guardrails disabled) |
| 5 | Verify recommended action | Contains "Quarantine" and "do not deploy" language |

---

### TC-04: Drift Detection — wf-003

**Objective:** Verify the Drift Detection Service produces findings for wf-003.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Continuity Analysis | Select wf-003 |
| 2 | Review drift findings | At least 3 findings present |
| 3 | Verify finding categories | policy_drift and behavior_drift present |
| 4 | Check requiresRemediation flags | Critical findings show remediation required |
| 5 | Check remediation recommendations | Each finding includes action, effort, and projected improvement |

---

### TC-05: Audit Ledger — Session Records

**Objective:** Verify the Audit Ledger contains records for session-pilot-001.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Audit Ledger | Records visible |
| 2 | Filter or view session-pilot-001 | At least 15 seed records visible |
| 3 | Check record structure | Each record has action, policyRef, continuityScoreSnapshot, riskLevelSnapshot, currentHash, previousHash |
| 4 | Locate a workflow_quarantined record | Should reference wf-003 |
| 5 | Verify policyRef format | Format: enterprise-ai-policy::version::rule |
| 6 | Verify hash chain display | Each row shows currentHash (8 chars) and previousHash (8 chars) |

---

### TC-06: F5 ADSP Simulation — Single Stream

**Objective:** Verify simulation run writes to ledger and shows correct event detail.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to F5 ADSP Simulation | 8 stream panels visible |
| 2 | Click Run Stream on "AI Guardrails: Policy Violation" | Button shows "Simulating..." then completes |
| 3 | Expand event detail | 3 events visible: 2 fail, 1 pass |
| 4 | Check wf-003 fail event | GUARDRAIL_ENFORCEMENT_GAP, delta -15 |
| 5 | Check SMI consumed status | consumed, flagged, or pass/0 |
| 6 | Navigate to Audit Ledger | New f5_simulation_run records present |

---

### TC-07: F5 ADSP Simulation — All Streams

**Objective:** Verify running all 8 streams produces the expected aggregate delta.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to F5 ADSP Simulation | Summary stats visible |
| 2 | Click Run All Streams | All 8 streams complete |
| 3 | Check global totals | 24 total events visible |
| 4 | Verify pass/warn/fail counts are non-zero | Pass, warn, and fail all > 0 |
| 5 | Verify net delta is negative | Total continuity delta negative (wf-003 and wf-004 drive negative sum) |

---

### TC-08: Lifecycle Demo — Full 7-Step Flow

**Objective:** Verify the lifecycle demo produces the expected Review Required outcome for wf-cs.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Lifecycle Demo | Idle state with Begin button |
| 2 | Click Step 1 — Establish Baseline | Baseline card shows wf-cs, prompt v2.0.0, billing-api NOT in tools |
| 3 | Click Step 2 — Introduce Controlled Change | Change card shows prompt v2.1.0 hash mismatch, billing-api added |
| 4 | Click Step 3 — Ingest Events | 3 events listed: prompt_version_change (hash mismatch), unauthorized_tool_call (billing-api), forbidden_behavior (88% confidence) |
| 5 | Click Step 4 — Score Continuity | Score 63 shown; risk level Review Required; deductions -12, -10, -15 = -37 total |
| 6 | Click Step 5 — Detect Behavioral Drift | Findings include tool_drift and behavior_drift |
| 7 | Click Step 6 — Create Audit Record | Ledger records visible for wf-cs |
| 8 | Click Step 7 — Generate Pilot Report | Final report shows Review Required verdict, remediation path, F5 sim results |
| 9 | Verify recommended action | Contains "human review before production promotion" or equivalent |

---

### TC-09: Pilot Report — Live Engine Output

**Objective:** Verify the Pilot Report page reflects live engine output, not hardcoded values.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Navigate to Pilot Report | Report visible |
| 2 | Check wf-003 final score | Matches Continuity Analysis page output |
| 3 | Check wf-005 final score | Matches Dashboard value |
| 4 | Verify pilot walkthrough steps | 7 steps shown with check marks |
| 5 | Verify key findings | References wf-003 Quarantine (score 8) and wf-004 Review Required (score 64) |
| 6 | Verify Export JSON button | Clicking downloads a .json file with workflow scores, findings, and audit stats |
| 7 | Verify Copy Summary button | Clicking copies a plain-text summary to clipboard |

---

### TC-10: Scoring Determinism Check

**Objective:** Verify the scoring engine produces identical output on repeated calls.

| Step | Action | Expected Result |
|---|---|---|
| 1 | Load Continuity Analysis page | Score for wf-001 recorded |
| 2 | Refresh the page | Score for wf-001 unchanged |
| 3 | Navigate away and return | Score unchanged |
| 4 | Confirm no random variation | Score is stable across all page loads |

---

## Known Constraints

- All data is synthetic. Results reflect the mock event dataset, not live AI workflow behavior.
- The in-session Audit Ledger resets on page reload (in-memory store).
- The Lifecycle Demo uses a separate session ID (session-lifecycle-001) from the main pilot data (session-pilot-001).
- wf-cs score may differ slightly from estimates in documentation due to confidence-based deduction adjustments on forbidden_behavior events.

---

*See `SMI_Service_Map.md` for service architecture details. See `SMI_IP_Boundary_Note.md` for IP terms.*
