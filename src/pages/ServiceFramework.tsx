import React, { useState } from 'react';
import {
  Layers, Anchor, Cpu, TrendingDown, BookLock, Shield, Network,
  FileText, LayoutDashboard, ChevronDown, ChevronRight, ArrowRight,
  Package, Plug, Zap, Server,
} from 'lucide-react';

// ─── Service definitions ──────────────────────────────────────────────────────

interface ServiceDef {
  id: string;
  num: number;
  name: string;
  tagline: string;
  icon: React.ReactNode;
  iconColor: string;
  borderColor: string;
  bgColor: string;
  purpose: string;
  input: string[];
  output: string[];
  pilotValue: string;
  enterprisePath: string;
}

const SERVICES: ServiceDef[] = [
  {
    id: 'svc-ingestion',
    num: 1,
    name: 'SMI Ingestion Service',
    tagline: 'Raw event normalization and intake',
    icon: <Zap className="h-5 w-5" />,
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-800/40',
    bgColor: 'bg-cyan-900/10',
    purpose:
      'Receives raw behavioral, structural, and operational events from AI workflows and upstream systems. Normalizes event shape, validates required fields, classifies event type and severity, and routes each event into the continuity scoring pipeline.',
    input: [
      'Raw AI workflow execution events (JSON)',
      'F5 ADSP / AI gateway stream payloads',
      'Guardrail trigger notifications',
      'Model and prompt version change signals',
    ],
    output: [
      'Normalized AIWorkflowEvent objects',
      'Event type and severity classification',
      'Routing decision (score / flag / reject / ignore)',
      'Ingest acknowledgment record',
    ],
    pilotValue:
      'Demonstrated via mock JSON event objects covering all 9 SMI event types. The ingestion layer normalizes heterogeneous event shapes into a single scored pipeline, showing how a unified intake can serve multiple upstream sources.',
    enterprisePath:
      'Package as a REST or gRPC microservice. Connect to Kafka / event bus for high-throughput stream ingestion. Add schema validation (OpenAPI / Avro) and authentication middleware. SDKs provided for F5 ADSP, LangChain, and custom agent frameworks.',
  },
  {
    id: 'svc-baseline',
    num: 2,
    name: 'Baseline Anchor Service',
    tagline: 'Approved-state capture and versioning',
    icon: <Anchor className="h-5 w-5" />,
    iconColor: 'text-blue-400',
    borderColor: 'border-blue-800/40',
    bgColor: 'bg-blue-900/10',
    purpose:
      'Captures and versions the approved behavioral state of a workflow at a designated point in time. Stores an immutable snapshot of model config, prompt version and hash, policy config, and allowed tool set. All subsequent scoring is measured as delta from the anchor.',
    input: [
      'AIWorkflow object (model, prompt, policy, tools)',
      'XOps reviewer ID and session reference',
      'Risk level approval decision',
      'Reviewer notes',
    ],
    output: [
      'BaselineAnchor record (immutable)',
      'Baseline ID for downstream scoring references',
      'Audit ledger entry: baseline_captured',
    ],
    pilotValue:
      'Five baseline anchors established across pilot workflows. wf-003 demonstrates drift by showing measurable delta between the captured anchor (policy 2.1.0, guardrails enabled) and the live workflow state (policy 1.8.0, guardrails off).',
    enterprisePath:
      'Persist anchors in an append-only database (e.g., Supabase, PostgreSQL). Expose a baseline capture API with XOps reviewer authentication. Integrate with CI/CD pipeline to trigger capture events on approved deployment gates. Add baseline diffing to surface changes between versions.',
  },
  {
    id: 'svc-engine',
    num: 3,
    name: 'Behavioral Continuity Engine',
    tagline: 'Memory Morphology Engine — deterministic scoring',
    icon: <Cpu className="h-5 w-5" />,
    iconColor: 'text-green-400',
    borderColor: 'border-green-800/40',
    bgColor: 'bg-green-900/10',
    purpose:
      'The core scoring function. Computes a deterministic continuity score (0–100) by applying event-type deductions to the baseline-100 starting point. Produces four independent sub-scores (drift, policy alignment, tool behavior variance, state degradation), risk level classification, and a recommended action.',
    input: [
      'AIWorkflow (live state)',
      'BaselineAnchor (approved state)',
      'AIWorkflowEvent[] (all events since baseline)',
    ],
    output: [
      'ContinuityScore: primary score 0–100',
      'Sub-scores: driftScore, policyAlignment, toolBehaviorVariance, stateDegradation',
      'RiskLevel: Approved / Watch / Review Required / Quarantine',
      'Deduction breakdown with per-event attribution',
      'Recommended action string',
    ],
    pilotValue:
      'Live engine running in the browser: wf-001=92 Approved, wf-002=92 Approved, wf-003=8 Quarantine, wf-004=64 Review Required, wf-005=100 Approved. Lifecycle Demo (wf-cs) produces score 63 Review Required from tool scope expansion alone — no injection required. All scores are reproducible from the same event inputs.',
    enterprisePath:
      'Extract as a stateless scoring microservice. Accepts workflow + baseline + events, returns ContinuityScore. Deployable as a Lambda / Cloud Run function. Can be called synchronously per-event or batch-scored on a schedule. Future: stream scoring via Kafka consumer.',
  },
  {
    id: 'svc-drift',
    num: 4,
    name: 'Drift Detection Service',
    tagline: '7-rule behavioral drift analysis',
    icon: <TrendingDown className="h-5 w-5" />,
    iconColor: 'text-orange-400',
    borderColor: 'border-orange-800/40',
    bgColor: 'bg-orange-900/10',
    purpose:
      'Runs 7 deterministic rule passes over the event set and ContinuityScore sub-components to surface named DriftFinding objects. Each finding carries a category, severity, drift magnitude, affected event IDs, and a remediation recommendation with effort estimate and projected score recovery.',
    input: [
      'AIWorkflow (live state)',
      'BaselineAnchor (approved state)',
      'AIWorkflowEvent[] (event set)',
      'ContinuityScore (from Behavioral Continuity Engine)',
    ],
    output: [
      'DriftFinding[] — named findings per rule',
      'Category: model_drift, prompt_drift, policy_drift, tool_drift, behavior_drift, state_drift, orchestration_drift',
      'Per-finding: severity, magnitude, affected event IDs, remediation action, effort, projected improvement',
    ],
    pilotValue:
      'wf-003 produces 5 findings including critical policy_drift and behavior_drift. The Lifecycle Demo Customer Support AI produces tool_drift and behavior_drift with remediation path estimating +32 pts recovery after removing billing-api and reverting prompt.',
    enterprisePath:
      'Extend rule set with configurable thresholds per organization. Connect to ticketing systems (Jira, ServiceNow) to auto-create remediation tickets on critical findings. Integrate with XOps dashboards to surface findings by workflow, team, and time window.',
  },
  {
    id: 'svc-ledger',
    num: 5,
    name: 'Continuity Audit Ledger',
    tagline: 'Append-only policy-referenced evidence chain',
    icon: <BookLock className="h-5 w-5" />,
    iconColor: 'text-gray-300',
    borderColor: 'border-gray-700',
    bgColor: 'bg-gray-800/20',
    purpose:
      'Immutable, append-only ledger of all continuity-relevant actions. Every baseline capture, event ingestion, score computation, drift detection, remediation, and XOps review produces a policy-referenced ledger record. The ledger is the authoritative evidence chain for enterprise governance and audit.',
    input: [
      'Actions from all other services: baseline_captured, event_ingested, score_computed, drift_detected, remediation_applied, xops_review_completed, f5_simulation_run',
      'Session ID, workflow ID, actor ID',
      'Continuity score snapshot and risk level at time of action',
    ],
    output: [
      'AuditLedgerRecord — immutable timestamped entry',
      'Session-scoped ledger query',
      'Workflow-scoped ledger query',
      'Ledger stats: quarantine count, drift count, F5 event count, session audit score',
    ],
    pilotValue:
      '15 seed records plus live records written by the Lifecycle Demo. Every record includes a deterministic djb2 hash chain linking currentHash ← previousHash, a policy reference, score snapshot, and linked event IDs — demonstrating a complete, reviewable, tamper-evident evidence chain for XOps sign-off.',
    enterprisePath:
      'Persist to an append-only PostgreSQL table with insert-only RLS policies. Replace pilot djb2 hashing with SHA-256 for production-grade tamper evidence. Export to SIEM systems (Splunk, Datadog). Generate compliance reports (SOC 2, ISO 27001) from the ledger directly.',
  },
  {
    id: 'svc-guardrail',
    num: 6,
    name: 'Policy / Guardrail Connector',
    tagline: 'Guardrail event ingestion and policy mapping',
    icon: <Shield className="h-5 w-5" />,
    iconColor: 'text-amber-400',
    borderColor: 'border-amber-800/40',
    bgColor: 'bg-amber-900/10',
    purpose:
      'Translates guardrail system events (policy violations, prompt injection detections, forbidden behavior flags) into SMI event types. Maintains a mapping between external guardrail rule IDs and SMI event categories so that every guardrail trigger contributes to the continuity score.',
    input: [
      'Guardrail policy violation events (JSON)',
      'Prompt injection detection results',
      'Forbidden behavior classification with confidence scores',
      'Guardrail rule ID and policy reference',
    ],
    output: [
      'Mapped SMI AIWorkflowEvent (guardrail_violation, forbidden_behavior, sensitive_data_risk)',
      'Severity classification based on confidence and rule severity',
      'Routing to Ingestion Service for scoring',
    ],
    pilotValue:
      'Demonstrated by the F5 ADSP Simulation Connector: guardrail events from ai_guardrails.policy_violation and ai_guardrails.prompt_injection_detected streams are mapped to SMI event types and contribute deterministic continuity deltas. wf-003 shows how disabled guardrails create an enforcement gap that SMI surfaces as a critical finding.',
    enterprisePath:
      'Build connectors for commercial guardrail platforms (Aporia, Guardrails.AI, Azure AI Content Safety, AWS Bedrock Guardrails). Provide a webhook endpoint for real-time guardrail event push. Support pull mode for scheduled batch ingestion from guardrail event logs.',
  },
  {
    id: 'svc-f5',
    num: 7,
    name: 'F5 ADSP Simulation Connector',
    tagline: 'AI gateway / red team / XOps stream mapping',
    icon: <Network className="h-5 w-5" />,
    iconColor: 'text-rose-400',
    borderColor: 'border-rose-800/40',
    bgColor: 'bg-rose-900/10',
    purpose:
      'Demonstration layer that maps SMI event structures to F5-style AI gateway, guardrail, red-team, and XOps event streams. Covers all 8 F5 ADSP stream types. Illustrates how SMI could interoperate with an enterprise AI gateway infrastructure without requiring live F5 infrastructure in the pilot.',
    input: [
      'F5 ADSP stream events across 8 stream types',
      'Stream type: ai_gateway.request, ai_gateway.response, ai_guardrails.policy_violation, ai_guardrails.prompt_injection_detected, ai_redteam.test_result, adsp.policy_version_changed, agent.tool_call, xops.workflow_anomaly',
      'Per-event: model version, prompt version, policy version, classification, continuity delta',
    ],
    output: [
      'F5StreamEvent — rich typed event with SMI ingestion metadata',
      'smiConsumed status: consumed / flagged / rejected / ignored',
      'smiEventType mapping to canonical SMI event category',
      'Audit ledger record: f5_simulation_run',
      'Aggregate continuity delta per stream and workflow',
    ],
    pilotValue:
      '24 F5StreamEvents across all 8 stream types and all 5 pilot workflows. wf-003 accumulates -88 pts across F5 simulation sources. The Lifecycle Demo scenario uses 3 F5 events (guardrail block, red team confirmation, XOps escalation) to independently validate the SMI drift findings.',
    enterprisePath:
      'Pursue a formal technology partner evaluation with F5 to explore an approved ADSP connector. Build a live webhook consumer for F5 AI Gateway event streams. Add mutual TLS and API key auth for enterprise security boundaries. Expose SMI scores back to F5 for dynamic policy enforcement (score below threshold → block).',
  },
  {
    id: 'svc-report',
    num: 8,
    name: 'Pilot Report Service',
    tagline: 'Session-scoped continuity evidence report',
    icon: <FileText className="h-5 w-5" />,
    iconColor: 'text-teal-400',
    borderColor: 'border-teal-800/40',
    bgColor: 'bg-teal-900/10',
    purpose:
      'Aggregates all engine outputs — scores, drift findings, audit ledger stats, F5 simulation results — into a structured pilot report for XOps reviewer sign-off. The report is the primary deliverable for pilot phase completion and NDA-bounded partner review.',
    input: [
      'ContinuityScore[] for all workflows in session',
      'DriftFinding[] across all workflows',
      'AuditLedger stats for session',
      'F5 simulation results per workflow',
      'Session metadata: phase, reviewer, timestamp',
    ],
    output: [
      'PilotReport — structured summary document',
      'Per-workflow entries: final score, risk level, event count, drift count, F5 results',
      'Key findings list',
      'SMI value demonstrated list',
      'approvedForNextPhase flag',
    ],
    pilotValue:
      'Live Pilot Report page aggregates real engine output across all 5 workflows and shows the full session evidence chain. Demonstrates that a reviewer can understand the SMI value proposition — baseline to report — in under 3 minutes.',
    enterprisePath:
      'Generate PDF and JSON export formats for compliance submission. Add digital signature from XOps reviewer. Integrate with risk management platforms (ServiceNow GRC, Archer). Auto-trigger report generation at each pilot phase gate.',
  },
  {
    id: 'svc-dashboard',
    num: 9,
    name: 'Dashboard / XOps Review Console',
    tagline: 'Live continuity monitoring and reviewer interface',
    icon: <LayoutDashboard className="h-5 w-5" />,
    iconColor: 'text-sky-400',
    borderColor: 'border-sky-800/40',
    bgColor: 'bg-sky-900/10',
    purpose:
      'The reviewer-facing interface for real-time continuity monitoring, workflow status, drift surfacing, and audit ledger inspection. Provides the operational layer through which XOps reviewers make approve / watch / quarantine decisions and initiate remediation workflows.',
    input: [
      'Live ContinuityScore[] for all monitored workflows',
      'DriftFinding[] requiring reviewer attention',
      'Audit ledger records filtered by session and workflow',
      'Remediation recommendations with effort and impact estimates',
    ],
    output: [
      'Workflow continuity status grid (all risk levels at a glance)',
      'Drift finding queue with severity sorting',
      'Audit ledger view with policy references',
      'Remediation recommendation cards',
      'XOps review decision record (approve / escalate / quarantine)',
    ],
    pilotValue:
      'This console is the pilot dashboard. It demonstrates all 9 services operating together: baselines established, events ingested, scores computed, drift surfaced, audit ledger maintained, F5 simulation run, and pilot report generated — all without external dependencies.',
    enterprisePath:
      'Deploy as a hosted SaaS console or on-premise behind enterprise SSO (Okta, Azure AD). Add role-based access: XOps Reviewer, Platform Engineer, Executive View. Real-time score updates via WebSocket. Configurable alerting (PagerDuty, Slack) on Quarantine events.',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">{children}</p>
);

// ─── Component ─────────────────────────────────────────────────────────────────

const ServiceFramework: React.FC = () => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Service Framework</h2>
        <p className="text-gray-400 text-sm mt-1 max-w-2xl">
          The full SMI pilot requires 9 services. Each service has a defined purpose, input/output contract,
          pilot demonstration value, and a path to enterprise integration.
        </p>
      </div>

      {/* What is SMI */}
      <div className="bg-gray-900/80 border border-cyan-800/30 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-cyan-900/40 border border-cyan-800/50 rounded-lg p-2.5 shrink-0">
            <Layers className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-base">Symbolic Memory Infrastructure (SMI)</h3>
            <p className="text-gray-300 text-sm leading-relaxed mt-1.5 max-w-3xl">
              SMI is an AI Continuity Assurance layer that maintains deterministic, policy-referenced behavioral
              baselines for enterprise AI workflows. It establishes a trusted reference state at approval time
              and measures all subsequent behavior against that anchor — providing continuous, quantified
              assurance across model, prompt, policy, tool, memory/state, API, and orchestration changes.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {['Deterministic Scoring', 'Baseline-anchored', 'Policy-referenced', 'Audit-ready', 'Gateway-compatible'].map((t) => (
                <span key={t} className="text-xs px-2.5 py-1 bg-cyan-900/40 border border-cyan-800/50 text-cyan-300 rounded-full font-medium">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Risk scale reference */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3">Continuity Score Risk Levels</h3>
        <div className="space-y-2">
          {[
            { range: '90–100', label: 'Approved', bar: 'bg-green-500', text: 'text-green-400', width: 'w-full' },
            { range: '75–89', label: 'Watch', bar: 'bg-yellow-400', text: 'text-yellow-400', width: 'w-4/5' },
            { range: '60–74', label: 'Review Required', bar: 'bg-orange-500', text: 'text-orange-400', width: 'w-3/5' },
            { range: '< 60', label: 'Quarantine', bar: 'bg-red-500', text: 'text-red-400', width: 'w-2/5' },
          ].map((r) => (
            <div key={r.label} className="flex items-center space-x-3">
              <span className="text-gray-500 text-xs font-mono w-14 shrink-0">{r.range}</span>
              <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full ${r.bar} ${r.width} rounded-full`} />
              </div>
              <span className={`text-xs font-semibold w-28 shrink-0 ${r.text}`}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 9 Service catalog */}
      <div>
        <h3 className="text-white font-semibold mb-4">Service Catalog — 9 Services</h3>
        <div className="space-y-3">
          {SERVICES.map((svc) => {
            const isOpen = expanded[svc.id] ?? false;
            return (
              <div
                key={svc.id}
                className={`border rounded-xl overflow-hidden transition-colors duration-200 ${svc.borderColor} ${isOpen ? svc.bgColor : 'bg-gray-900/80 hover:bg-gray-900'}`}
              >
                {/* Header row */}
                <button
                  onClick={() => toggle(svc.id)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`shrink-0 ${svc.iconColor}`}>{svc.icon}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 text-xs font-mono">{String(svc.num).padStart(2, '0')}</span>
                        <span className="text-white font-semibold text-sm">{svc.name}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{svc.tagline}</p>
                    </div>
                  </div>
                  <div className={`shrink-0 ml-3 ${isOpen ? 'text-gray-300' : 'text-gray-600'}`}>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-gray-800/60">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4">

                      {/* Purpose */}
                      <div className="lg:col-span-2">
                        <SectionLabel>Purpose</SectionLabel>
                        <p className="text-gray-300 text-sm leading-relaxed">{svc.purpose}</p>
                      </div>

                      {/* Input */}
                      <div>
                        <SectionLabel>Input</SectionLabel>
                        <ul className="space-y-1.5">
                          {svc.input.map((inp, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <ArrowRight className="h-3 w-3 text-gray-600 shrink-0 mt-1" />
                              <span className="text-gray-400 text-xs leading-relaxed">{inp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Output */}
                      <div>
                        <SectionLabel>Output</SectionLabel>
                        <ul className="space-y-1.5">
                          {svc.output.map((out, i) => (
                            <li key={i} className="flex items-start space-x-2">
                              <ArrowRight className="h-3 w-3 text-cyan-700 shrink-0 mt-1" />
                              <span className="text-gray-400 text-xs leading-relaxed">{out}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Pilot value */}
                      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                        <SectionLabel>Pilot Value</SectionLabel>
                        <p className="text-gray-300 text-xs leading-relaxed">{svc.pilotValue}</p>
                      </div>

                      {/* Enterprise path */}
                      <div className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3">
                        <div className="flex items-center space-x-1.5 mb-1.5">
                          <Plug className="h-3 w-3 text-gray-500" />
                          <SectionLabel>Future Enterprise Integration Path</SectionLabel>
                        </div>
                        <p className="text-gray-300 text-xs leading-relaxed">{svc.enterprisePath}</p>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Service dependency flow */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4 text-sm">Service Data Flow</h3>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Events In', icon: <Server className="h-3.5 w-3.5" />, color: 'border-gray-700 text-gray-400' },
            { label: 'Ingestion Service', icon: <Zap className="h-3.5 w-3.5" />, color: 'border-cyan-800/60 text-cyan-400' },
            { label: 'Baseline Anchor', icon: <Anchor className="h-3.5 w-3.5" />, color: 'border-blue-800/60 text-blue-400' },
            { label: 'Continuity Engine', icon: <Cpu className="h-3.5 w-3.5" />, color: 'border-green-800/60 text-green-400' },
            { label: 'Drift Detection', icon: <TrendingDown className="h-3.5 w-3.5" />, color: 'border-orange-800/60 text-orange-400' },
            { label: 'Audit Ledger', icon: <BookLock className="h-3.5 w-3.5" />, color: 'border-gray-600 text-gray-300' },
            { label: 'Pilot Report', icon: <FileText className="h-3.5 w-3.5" />, color: 'border-teal-800/60 text-teal-400' },
            { label: 'XOps Console', icon: <LayoutDashboard className="h-3.5 w-3.5" />, color: 'border-sky-800/60 text-sky-400' },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <div className={`flex items-center space-x-1.5 border rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap ${node.color} bg-gray-900/60`}>
                {node.icon}
                <span>{node.label}</span>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-gray-700 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
        <p className="text-gray-600 text-xs mt-3">
          Guardrail Connector and F5 ADSP Connector feed into the Ingestion Service. Policy / Guardrail Connector and F5 ADSP Connector operate in parallel with the main event flow.
        </p>
      </div>

      {/* Current prototype state */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-2 shrink-0">
            <Package className="h-5 w-5 text-gray-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Current Prototype State</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              The framework is represented as a mock/synthetic pilot console using deterministic scoring and
              JSON-style data structures. The next stage is packaging the services behind a lightweight
              API/dashboard wrapper for bounded validation under partner review or NDA.
            </p>
          </div>
        </div>
      </div>

      {/* Why this is different */}
      <div className="bg-gray-900/80 border border-cyan-900/30 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="bg-cyan-900/30 border border-cyan-800/50 rounded-lg p-2 shrink-0">
            <Layers className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Why This Is Different from More Compute</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              More compute and stronger models can improve capability, but they do not automatically provide
              independent evidence that an AI workflow remained behaviorally stable after deployment changes.
              SMI is designed as an external assurance layer for continuity across model, prompt, policy, tool,
              memory/state, API, and orchestration changes.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ServiceFramework;
