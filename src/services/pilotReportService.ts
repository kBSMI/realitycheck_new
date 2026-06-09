import {
  PilotReport,
  PilotReportWorkflowEntry,
  ContinuityScore,
  DriftFinding,
  F5EventSource,
  AuditLedgerRecord,
} from '../types/smi';
import { workflows } from '../data/workflows';

// ─── Pilot Report Service ─────────────────────────────────────────────────────
// Aggregates all engine outputs — scores, drift findings, audit ledger stats,
// and F5 simulation results — into a structured PilotReport for XOps sign-off.

let _reportCounter = 1;

function nextReportId(): string {
  return `rpt-${String(_reportCounter++).padStart(3, '0')}`;
}

export interface GenerateReportOptions {
  sessionId: string;
  generatedBy: string;
  pilotPhase: string;
  scores: ContinuityScore[];
  findings: DriftFinding[];
  auditRecords: AuditLedgerRecord[];
  f5Results?: Array<{
    workflowId: string;
    source: F5EventSource;
    classification: 'pass' | 'warn' | 'fail';
    continuityDelta: number;
  }>;
}

/**
 * Generate a structured PilotReport from the current session state.
 * The report aggregates all engine outputs for XOps sign-off.
 */
export function generatePilotReport(options: GenerateReportOptions): PilotReport {
  const {
    sessionId,
    generatedBy,
    pilotPhase,
    scores,
    findings,
    auditRecords,
    f5Results = [],
  } = options;

  const workflowEntries: PilotReportWorkflowEntry[] = scores.map((score) => {
    const wf = workflows.find((w) => w.id === score.workflowId);
    const wfFindings = findings.filter((f) => f.workflowId === score.workflowId);
    const wfF5 = f5Results.filter((r) => r.workflowId === score.workflowId);

    return {
      workflowId: score.workflowId,
      workflowName: wf?.name ?? score.workflowId,
      baselineId: score.baselineId,
      finalContinuityScore: score.continuityScore,
      finalRiskLevel: score.riskLevel,
      totalEventsIngested: score.deductions.length,
      driftFindingsCount: wfFindings.length,
      remediationActionsCount: wfFindings.filter((f) => f.requiresRemediation).length,
      f5SimulationResults: wfF5.map(({ source, classification, continuityDelta }) => ({
        source,
        classification,
        continuityDelta,
      })),
    };
  });

  const quarantined = scores.filter((s) => s.riskLevel === 'Quarantine');
  const reviewRequired = scores.filter((s) => s.riskLevel === 'Review Required');
  const remediationCount = findings.filter((f) => f.requiresRemediation).length;

  const keyFindings: string[] = [
    quarantined.length > 0
      ? `${quarantined.length} workflow(s) in Quarantine: ${quarantined.map((s) => `${s.workflowId} (score ${s.continuityScore})`).join(', ')}.`
      : 'No workflows in Quarantine.',
    reviewRequired.length > 0
      ? `${reviewRequired.length} workflow(s) at Review Required: ${reviewRequired.map((s) => `${s.workflowId} (score ${s.continuityScore})`).join(', ')}.`
      : 'No workflows at Review Required.',
    `${remediationCount} drift finding(s) require remediation across ${new Set(findings.map((f) => f.workflowId)).size} workflow(s).`,
    `${auditRecords.length} audit records written for session ${sessionId}.`,
  ];

  const smiValueDemonstrated: string[] = [
    'Deterministic baseline anchoring produced precise per-event deductions without subjective thresholds.',
    'Sub-score decomposition (drift / policy alignment / tool variance / state degradation) isolated root causes.',
    `Complete policy-referenced evidence chain across ${auditRecords.length} audit records.`,
    'F5 ADSP simulation connector demonstrated interoperability path for gateway, guardrail, and red team streams.',
  ];

  const sessionAuditScore = auditRecords.length > 0
    ? Math.round(auditRecords.reduce((s, r) => s + r.continuityScoreSnapshot, 0) / auditRecords.length)
    : 0;

  const approvedForNextPhase = quarantined.length === 0 && reviewRequired.length <= 1;

  return {
    id: nextReportId(),
    sessionId,
    generatedAt: new Date().toISOString(),
    generatedBy,
    pilotPhase,
    workflows: workflowEntries,
    totalAuditRecords: auditRecords.length,
    sessionAuditScore,
    keyFindings,
    smiValueDemonstrated,
    approvedForNextPhase,
  };
}
