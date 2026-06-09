// ─── Versioned SMI Engine Weights + Thresholds ───────────────────────────────
// Keep scoring rules centralized so enterprise reports can cite the rule profile.

import { SMI_ENGINE_VERSION } from '../../types/smiEngine';

export const SMI_RULE_PROFILE = {
  engineVersion: SMI_ENGINE_VERSION,
  scoringWeights: {
    goalToOutput: 0.30,
    promptToOutput: 0.20,
    baselineToOutput: 0.25,
    outputCohesion: 0.15,
    phrasePreservation: 0.10,
    symbolicAlignment: 0.32,
    echoWeightIndex: 0.24,
    morphologyAlignment: 0.30,
    baselineAlignment: 0.08,
    sourceIntegrity: 0.06,
  },
  thresholds: {
    acceptResonance: 80,
    acceptDriftPressureMax: 42,
    rerunResonanceMax: 44,
    highEntropy: 70,
    highDriftPressure: 70,
    lowSymbolicAlignment: 50,
    lowEchoWeight: 45,
    lowSourceIntegrity: 55,
    lowConfidence: 50,
    baselineDeviation: 65,
  },
  confidence: {
    minInputCompleteness: 30,
    evidenceWeight: 4,
    missingOutputPenalty: 45,
    lowAnchorPenalty: 18,
    highDriftPenalty: 12,
  },
} as const;

export type SMIRuleProfile = typeof SMI_RULE_PROFILE;
