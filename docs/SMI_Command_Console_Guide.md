# SMI Pilot Execution Console — Command Reference Guide

**Version:** 1.0
**Classification:** Pilot / Pre-NDA Review

---

## Purpose

The Pilot Execution Console is a deterministic command-line interface for executing the SMI Continuity Assurance pilot lifecycle.

It is designed for XOps reviewers and technical evaluators who want to drive the full pilot story — from baseline capture through continuity scoring, drift detection, audit record creation, and report generation — via structured commands rather than clicking through the UI.

**What it is:**
- A deterministic command dispatcher that calls the same TypeScript service functions used by all other pages in the pilot console
- An operator/XOps validation tool for structured lifecycle execution
- A scriptable interface that could be wrapped as a CLI, REST API, or CI/CD step in future phases

**What it is NOT:**
- A chatbot
- A natural-language interface
- A connection to any external AI model
- An official F5 integration

All commands produce deterministic output from the same synthetic mock data. The same inputs always produce the same outputs.

---

## Supported Commands

### Discovery

| Command | Description | Mutates Session State | Writes Audit Record |
|---|---|---|---|
| `help` | Show all supported commands | No | No |
| `list workflows` | List all registered pilot workflows with baseline and event status | No | No |
| `show baseline <workflow_id>` | Inspect the approved baseline anchor for a workflow | No (sets active context) | No |

### Baseline

| Command | Description | Mutates Session State | Writes Audit Record |
|---|---|---|---|
| `run baseline <workflow_id>` | Capture the current live workflow state as a new baseline anchor | Yes — stores new baseline | Yes — `baseline_captured` |

### Simulation

| Command | Description | Score Impact | Writes Audit Record |
|---|---|---|---|
| `simulate normal_event <wf>` | Inject a nominal operation event | 0 pts | No (until write audit) |
| `simulate prompt_change <wf>` | Simulate a prompt version change with hash mismatch | -12 pts | No (until write audit) |
| `simulate policy_mismatch <wf>` | Simulate a policy version mismatch | -15 pts | No (until write audit) |
| `simulate tool_access_added <wf> <tool>` | Add a tool to the active runtime toolset (controlled change) | Affects toolBehaviorVariance sub-score only | No |
| `simulate unauthorized_tool_call <wf> <tool>` | Simulate an unauthorized tool invocation | -10 pts | No (until write audit) |
| `simulate guardrail_violation <wf>` | Simulate a guardrail rule breach | -15 pts | No (until write audit) |
| `simulate memory_state_change <wf>` | Simulate memory or session state drift | -8 pts | No (until write audit) |

**Note on `simulate tool_access_added`:** This command adds a tool to the session-scoped runtime state only. It does not mutate the immutable seed workflow data. A later `score continuity` command will reflect the expanded toolset in the `toolBehaviorVariance` sub-score. Adding a tool is a controlled change, not automatically a violation. Unauthorized behavior is represented separately by `simulate unauthorized_tool_call`.

### Scoring and Drift

| Command | Description | Mutates Session State | Writes Audit Record |
|---|---|---|---|
| `score continuity <wf>` | Compute a deterministic continuity score from baseline delta | Yes — updates last score | No (until write audit) |
| `detect drift <wf>` | Run 7 drift detection rules and surface named DriftFinding objects | Yes — updates findings list | No (until write audit) |

### Audit and Report

| Command | Description | Mutates Session State | Writes Audit Record |
|---|---|---|---|
| `write audit <wf>` | Write score and drift findings to the hash-chained audit ledger | Yes — updates last audit record | Yes — `score_computed` + `drift_detected` per finding |
| `generate report <wf>` | Generate a structured pilot report for XOps sign-off | Yes — advances to `reported` stage | No |

### Lifecycle (Full Pilot Chain)

| Command | Description |
|---|---|
| `run lifecycle wf-cs` | Execute the curated 9-step Customer Support AI scenario end-to-end |
| `run lifecycle <workflow_id>` | Replay the seed data scenario for the specified workflow |

### Utility

| Command | Description |
|---|---|
| `clear` | Clear the terminal and reset all session state |

---

## Workflow IDs

| ID | Name | Notes |
|---|---|---|
| `wf-001` | Core Inference Engine | Score 92, Approved |
| `wf-002` | Data Enrichment Agent | Score 92, Approved |
| `wf-003` | Seasonal Campaign AI | Score 8, Quarantine (7 events, -92 pts) |
| `wf-004` | LCOS Connector v3 | Score 64, Review Required |
| `wf-005` | AI Gateway Proxy | Score 100, Approved (gold standard) |
| `wf-cs` | Customer Support AI | Curated lifecycle demo — score 63, Review Required |

---

## Autocomplete

Press **Tab** to trigger autocomplete at any point in your input.

- After a verb like `simulate`: shows available sub-commands
- After sub-verb + workflow ID position: shows matching workflow IDs
- After tool name position (in `tool_access_added` or `unauthorized_tool_call`): shows common tool names
- Partial command prefix: shows matching commands

Press **↑** / **↓** to cycle through autocomplete options. Press **Enter** to select. Press **Esc** to dismiss.

---

## Inline Command Guide

As you type, the **Command Guide** panel on the right updates to show:

- **Command name** — the full syntax
- **Purpose** — what the command does
- **Effect** — whether it changes session state
- **Audit impact** — whether it writes an audit ledger record
- **Next step** — the recommended next command in the lifecycle chain

---

## Example Lifecycle Run

### Full pilot story — one command

```
run lifecycle wf-cs
```

**Expected output:**

```
SMI Lifecycle Execution — Customer Support AI (wf-cs)
────────────────────────────────────────────────────────
[1] Baseline loaded: Customer Support AI baseline (bl-cs)
    Approved prompt v2.0.0 | billing-api NOT in approved tool list
[2] Controlled change applied: prompt version change + billing-api tool access
    Prompt v2.0.0 → v2.1.0 (hash mismatch) | billing-api added to runtime toolset
[3] Simulated F5-style event ingested
    3 events: prompt_version_change + unauthorized_tool_call + forbidden_behavior
[4] Continuity score calculated: 63
    Deductions: -12 (prompt) + -10 (tool) + -15 (behavior) = -37 total
[5] Risk level: Review Required
    Score 63/100 — Review Required
[6] Drift finding created
    <finding title> (N total findings)
[7] Audit record written
    Record ald-XXX — hash XXXXXXXX...
[8] Pilot report generated: rpt-XXX
    N audit records | Approved for next phase: NO
[9] Recommendation: human review before production promotion
    Revert prompt to v2.0.0, remove billing-api from tool scope, re-anchor baseline
```

### Step-by-step manual execution

The same outcome can be achieved manually:

```
show baseline wf-cs
simulate prompt_change wf-cs
simulate tool_access_added wf-cs billing_api
simulate unauthorized_tool_call wf-cs billing_api
simulate guardrail_violation wf-cs
score continuity wf-cs
detect drift wf-cs
write audit wf-cs
generate report wf-cs
```

---

## Contextual Suggestions Panel

The **Suggested Next Commands** panel updates after each command based on the active workflow and current lifecycle stage:

| Stage | Suggestions |
|---|---|
| (no active workflow) | `list workflows` · `show baseline wf-cs` · `run lifecycle wf-cs` |
| `idle` | `show baseline` · `run lifecycle` · `simulate prompt_change` |
| `baseline` | `simulate prompt_change` · `simulate tool_access_added` · `score continuity` |
| `changed` | `score continuity` · `simulate unauthorized_tool_call` · `simulate guardrail_violation` |
| `scored` | `detect drift` · `write audit` · `generate report` |
| `drifted` | `write audit` · `generate report` |
| `audited` | `generate report` · `run lifecycle wf-003` |
| `reported` | `clear` · `run lifecycle wf-003` · `list workflows` |

---

## How Execution Works

Each command in the console calls the same TypeScript service functions used by all other pages in the pilot console:

| Service | Called by |
|---|---|
| `memoryMorphologyEngine.computeContinuityScore` | `score continuity` |
| `driftDetectionService.detectDrift` | `detect drift` |
| `auditLedgerService.recordScoreComputed` | `write audit` |
| `auditLedgerService.recordDriftDetected` | `write audit` |
| `auditLedgerService.recordBaselineCaptured` | `run baseline` |
| `baselineService.captureBaseline` | `run baseline` |
| `smiIngestionService.ingestWorkflowEvent` | All `simulate *` commands |
| `pilotReportService.generatePilotReport` | `generate report` |

There are no network calls, no external API dependencies, and no random values. The scoring engine is the same deterministic function called by the Dashboard, Continuity Analysis, and Lifecycle Demo pages.

**Session state** is maintained in a module-level in-memory map keyed by workflow ID. Accumulated events and runtime tool additions are stored in session state and used when scoring. Seed data in `workflows.ts`, `baselines.ts`, and `events.ts` is never mutated.

---

## Design Constraints

- All data is synthetic mock data — no live AI workflow infrastructure required
- No external API calls — all execution is local TypeScript
- No random values — deterministic scoring engine throughout
- Seed data (`workflows.ts`, `baselines.ts`, `events.ts`) is never modified
- `simulate tool_access_added` updates session-scoped runtime state only
- No official F5 integration — any F5-related output uses simulated mock event structures
- The console is not a chatbot and performs no natural language interpretation

---

## Future Integration Path

The command set implemented in this console is designed to be thin wrappers over the core service layer. Each command could be exposed in future phases as:

| Integration Path | Description |
|---|---|
| **REST API endpoint** | `POST /api/smi/execute` with `{ command: "score continuity wf-003" }` returning `CommandResult` JSON |
| **CLI tool** | `smi score continuity wf-003` — thin binary wrapping the same service layer |
| **CI/CD step** | `smi run lifecycle wf-cs --assert-score-above 60` — gate deployments on continuity score thresholds |
| **XOps automation hook** | Triggered on deployment events to auto-score new workflow versions against captured baselines |
| **Webhook consumer** | Replace `simulate *` commands with live F5 ADSP stream events routed through the ingestion service |

These integration paths do not require changing the service layer — only the transport and trigger mechanism.

---

*See `SMI_Service_Map.md` for the full service architecture. See `SMI_IP_Boundary_Note.md` for IP and confidentiality terms.*
