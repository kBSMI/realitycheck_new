// ─── Confidence Service ──────────────────────────────────────────────────────
// Estimates how confident the deterministic engine can be based on input
// completeness, evidence density, drift agreement, and source/baseline support.

import type { ContinuityAnchor, DriftFinding, SMIConfidenceProfile, SMIScores } from '../../types/smiEngine';
import { SMI_RULE_PROFILE } from './engineConfig';
import { clamp, wordCount } from './textUtils';

export function buildConfidenceProfile(params: {
  userGoal: string;
  originalPrompt: string;
  aiOutput: string;
  baselineOutput?: string;
  anchors: ContinuityAnchor[];
  findings: DriftFinding[];
  scores: SMIScores;
}): SMIConfidenceProfile {
  const basis: string[] = [];
  const inputCompleteness = clamp(
    (wordCount(params.userGoal) > 4 ? 25 : 0) +
    (wordCount(params.originalPrompt) > 6 ? 25 : 0) +
    (wordCount(params.aiOutput) > 8 ? 30 : 0) +
    (params.baselineOutput && wordCount(params.baselineOutput) > 8 ? 20 : 0)
  );

  if (inputCompleteness >= 70) basis.push('sufficient goal, prompt, and output context');
  if (params.baselineOutput) basis.push('baseline comparison available');
  if (params.anchors.length >= 8) basis.push('multiple continuity anchors extracted');
  if (params.findings.length > 0) basis.push('drift findings supported by reason codes');
  if (params.scores.sourceIntegrity < SMI_RULE_PROFILE.thresholds.lowSourceIntegrity) basis.push('source integrity limits confidence');

  const evidenceBoost = Math.min(22, params.anchors.length * 1.5 + params.findings.length * SMI_RULE_PROFILE.confidence.evidenceWeight);
  const penalties =
    (wordCount(params.aiOutput) === 0 ? SMI_RULE_PROFILE.confidence.missingOutputPenalty : 0) +
    (params.anchors.length < 4 ? SMI_RULE_PROFILE.confidence.lowAnchorPenalty : 0) +
    (params.scores.driftPressure > SMI_RULE_PROFILE.thresholds.highDriftPressure ? SMI_RULE_PROFILE.confidence.highDriftPenalty : 0);
  const confidenceScore = clamp(inputCompleteness * 0.62 + evidenceBoost + 12 - penalties);
  const spread = clamp(28 - Math.round(confidenceScore / 5), 6, 28);

  return {
    confidenceScore,
    intervalLow: clamp(confidenceScore - spread),
    intervalHigh: clamp(confidenceScore + spread),
    basis: basis.length ? basis : ['limited evidence available'],
    evidenceCount: params.anchors.length + params.findings.length,
    inputCompleteness,
  };
}
