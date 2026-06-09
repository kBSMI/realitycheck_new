import { AIWorkflow, BaselineAnchor, RiskLevel } from '../types/smi';
import { baselines as seedBaselines } from '../data/baselines';

// ─── Baseline Anchor Service ──────────────────────────────────────────────────
// Captures and versions the approved behavioral state of a workflow at a point
// in time. All scoring is measured as delta from the captured anchor.
// In production this would persist to an append-only database.

// In-memory store — starts from seed data, extended at runtime
let _baselines: BaselineAnchor[] = [...seedBaselines];

let _baselineCounter = _baselines.length + 1;

function nextBaselineId(): string {
  return `bl-cap-${String(_baselineCounter++).padStart(3, '0')}`;
}

export interface CaptureBaselineOptions {
  workflowId: string;
  capturedBy: string;
  sessionRef: string;
  approvedRiskLevel: RiskLevel;
  notes?: string;
}

/**
 * Capture a new baseline anchor from the current workflow state.
 * Records the workflow's model, prompt, and policy config as an immutable snapshot.
 */
export function captureBaseline(
  workflow: AIWorkflow,
  options: CaptureBaselineOptions
): BaselineAnchor {
  const anchor: BaselineAnchor = {
    id: nextBaselineId(),
    workflowId: options.workflowId,
    capturedAt: new Date().toISOString(),
    capturedBy: options.capturedBy,
    sessionRef: options.sessionRef,
    approvedRiskLevel: options.approvedRiskLevel,
    modelConfig: { ...workflow.modelConfig },
    promptConfig: { ...workflow.promptConfig },
    policyConfig: {
      ...workflow.policyConfig,
      allowedTools: [...workflow.policyConfig.allowedTools],
      forbiddenBehaviors: [...workflow.policyConfig.forbiddenBehaviors],
    },
    notes: options.notes ?? '',
  };

  _baselines = [..._baselines, anchor];
  return anchor;
}

/**
 * Retrieve the most recent baseline for a given workflow ID.
 * Returns undefined if no baseline has been captured for the workflow.
 */
export function getBaselineForWorkflow(workflowId: string): BaselineAnchor | undefined {
  // Return the last captured baseline for the workflow (most recent capture)
  const matches = _baselines.filter((b) => b.workflowId === workflowId);
  return matches[matches.length - 1];
}

/**
 * Return all captured baselines, optionally filtered by workflow.
 */
export function getAllBaselines(workflowId?: string): BaselineAnchor[] {
  if (workflowId) return _baselines.filter((b) => b.workflowId === workflowId);
  return [..._baselines];
}
