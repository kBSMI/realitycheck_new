// ─── Baseline Comparison Service ─────────────────────────────────────────────
// Makes baseline preservation first-class for teams/enterprise workflows.

import type {
  ContinuityAnchor,
  DriftReasonCode,
  SMIBaselineComparison,
  SMIScores,
} from '../../types/smiEngine';

export function buildBaselineComparison(params: {
  baselineOutput?: string;
  anchors: ContinuityAnchor[];
  scores: SMIScores;
  reasonCodes: DriftReasonCode[];
}): SMIBaselineComparison {
  const baselineAnchors = params.anchors.filter((anchor) => anchor.source === 'baseline');
  const preservedAnchors = baselineAnchors.filter((anchor) => anchor.presentInOutput).map((anchor) => anchor.label);
  const missingAnchors = baselineAnchors.filter((anchor) => !anchor.presentInOutput).map((anchor) => anchor.label);
  const deviationReasonCodes = params.reasonCodes.filter((code) =>
    code === 'BASELINE_DEVIATION' || code === 'FORMAT_DRIFT' || code === 'MISSING_CONSTRAINT' || code === 'TASK_SUBSTITUTION'
  );

  return {
    baselineProvided: Boolean(params.baselineOutput),
    baselineAlignment: params.baselineOutput ? params.scores.baselineAlignment : 100,
    preservedAnchors,
    missingAnchors,
    deviationReasonCodes,
  };
}
