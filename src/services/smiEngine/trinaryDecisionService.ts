// ─── Trinary Decision Service ────────────────────────────────────────────────

import type { DriftFinding, SMIScores, TrinaryDecision } from '../../types/smiEngine';
import { SMI_RULE_PROFILE } from './engineConfig';

export function calculateTrinaryDecision(scores: SMIScores, findings: DriftFinding[]): TrinaryDecision {
  const highSeverityCount = findings.filter((finding) => finding.severity === 'high').length;
  const sourceContextRisk = findings.some((finding) => finding.code === 'SOURCE_CONTEXT_EROSION');

  if (
    scores.resonanceScore >= SMI_RULE_PROFILE.thresholds.acceptResonance &&
    scores.driftPressure < SMI_RULE_PROFILE.thresholds.acceptDriftPressureMax &&
    scores.sourceIntegrity >= 65 &&
    highSeverityCount === 0
  ) {
    return '+1';
  }

  if (
    scores.resonanceScore < SMI_RULE_PROFILE.thresholds.rerunResonanceMax ||
    scores.entropyIndex > SMI_RULE_PROFILE.thresholds.highEntropy ||
    highSeverityCount >= 3 ||
    (sourceContextRisk && scores.sourceIntegrity < 45)
  ) {
    return '-1';
  }

  return '0';
}

export function trinaryLabel(decision: TrinaryDecision): string {
  if (decision === '+1') return 'Accept / Preserve';
  if (decision === '0') return 'Hold / Revise / Verify';
  return 'Compost / Rerun';
}
