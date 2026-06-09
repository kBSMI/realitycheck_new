// ─── Continuity Service ───────────────────────────────────────────────────────
// Facade over the SMI data layer and scoring engines.
// All UI components call this service — it delegates to the new engine layer.
// Kept async (with minimal delay) to preserve clean API contracts for future
// backend integration.

import { workflows } from '../data/workflows';
import { baselines, getBaselineForWorkflow } from '../data/baselines';
import { workflowEvents, getEventsForWorkflow } from '../data/events';
import { mockDependencies } from '../data/legacyCompat';
import {
  computeContinuityScore,
  computeHistoricalPulse,
  classifyRiskLevel,
} from './memoryMorphologyEngine';
import { detectDrift } from './driftDetectionService';
import { getLedgerBySession } from './auditLedgerService';

// Legacy types kept for component compatibility during Phase 2 transition.
// Phase 3 will migrate components to the full SMI types directly.
import { AIWorkflow as LegacyWorkflow, WorkflowDependency } from '../types/continuity';

// ─── Adapter: SMI workflow → UI workflow shape ────────────────────────────────

function toUiWorkflow(workflowId: string): LegacyWorkflow {
  const wf = workflows.find((w) => w.id === workflowId);
  const baseline = getBaselineForWorkflow(workflowId);
  const events = getEventsForWorkflow(workflowId);

  if (!wf || !baseline) {
    return {
      id: workflowId,
      name: workflowId,
      description: '',
      status: 'Quarantine',
      continuityScore: 0,
      policyTags: [],
      lastActive: new Date().toISOString(),
    };
  }

  const score = computeContinuityScore(wf, baseline, events);
  const risk = classifyRiskLevel(score.continuityScore);

  return {
    id: wf.id,
    name: wf.name,
    description: wf.description,
    status: risk,
    continuityScore: score.continuityScore,
    policyTags: wf.policyConfig ? [
      `policy-${wf.policyConfig.version}`,
      wf.policyConfig.guardrailsEnabled ? 'guardrail-active' : 'guardrail-disabled',
      ...wf.tags.slice(0, 2),
    ] : wf.tags,
    lastActive: wf.lastActive,
  };
}

// ─── Simulated async wrapper ──────────────────────────────────────────────────

const sim = <T>(data: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), 80));

// ─── Public API ───────────────────────────────────────────────────────────────

export const getAllWorkflows = (): Promise<LegacyWorkflow[]> =>
  sim(workflows.map((wf) => toUiWorkflow(wf.id)));

export const getContinuityPulse = (workflowId: string) => {
  const wf = workflows.find((w) => w.id === workflowId);
  const baseline = getBaselineForWorkflow(workflowId);
  if (!wf || !baseline) return sim([]);

  const events = getEventsForWorkflow(workflowId);
  const pulse = computeHistoricalPulse(wf, baseline, events, 12);
  return sim(pulse.map((p) => ({ workflowId, ...p })));
};

export const getBehavioralEvents = (workflowId: string) => {
  const events = getEventsForWorkflow(workflowId);
  return sim(events.map((e) => ({
    id: e.id,
    workflowId: e.workflowId,
    timestamp: e.timestamp,
    classification: (
      e.eventType === 'guardrail_violation' || e.eventType === 'forbidden_behavior'
        ? 'Guardrail Triggered'
        : e.eventType === 'nominal_operation' || e.eventType === 'baseline_capture'
        ? 'Nominal'
        : 'Anomalous'
    ) as 'Nominal' | 'Anomalous' | 'Guardrail Triggered',
    message: e.description,
    severity: e.eventType === 'nominal_operation' ? 90 : e.eventType.includes('violation') || e.eventType.includes('forbidden') ? 20 : 55,
  })));
};

export const getRemediationRecommendations = (workflowId: string) => {
  const wf = workflows.find((w) => w.id === workflowId);
  const baseline = getBaselineForWorkflow(workflowId);
  if (!wf || !baseline) return sim([]);

  const events = getEventsForWorkflow(workflowId);
  const score = computeContinuityScore(wf, baseline, events);
  const findings = detectDrift(wf, baseline, events, score);

  return sim(findings
    .filter((f) => f.requiresRemediation)
    .map((f, i) => {
      const effort = f.driftMagnitude >= 70 ? 'High' : f.driftMagnitude >= 40 ? 'Medium' : 'Low';
      const improvement = Math.round(f.driftMagnitude * 0.4);
      return {
        id: `rem-${workflowId}-${i}`,
        workflowId,
        recommendation: f.description,
        scoreImprovement: improvement,
        effort: effort as 'Low' | 'Medium' | 'High',
        timestamp: f.detectedAt,
      };
    })
  );
};

export const getAuditLedger = (sessionId: string) => {
  const records = getLedgerBySession(sessionId);
  return sim(records.map((r) => ({
    id: r.id,
    sessionId: r.sessionId,
    score: r.continuityScoreSnapshot,
    source: r.detail.slice(0, 80),
    timestamp: r.timestamp,
    policyRef: r.policyRef,
  })));
};

export const getWorkflowDependencies = (): Promise<WorkflowDependency[]> =>
  sim(mockDependencies);

export const getWorkflowPolicyTags = (workflowId: string): Promise<string[]> => {
  const wf = workflows.find((w) => w.id === workflowId);
  return sim(wf?.policyConfig ? [
    `policy-${wf.policyConfig.version}`,
    ...wf.tags,
  ] : []);
};

// Re-export raw SMI data for pages that need the full model
export { workflows, baselines, workflowEvents };
export { computeContinuityScore, computeAllScores, computeHistoricalPulse } from './memoryMorphologyEngine';
export { detectDrift, detectAllDrift, getRemediationForFinding } from './driftDetectionService';
export { getLedger, getLedgerBySession, getLedgerByWorkflow, getLedgerStats, recordScoreComputed, recordF5SimulationRun } from './auditLedgerService';
