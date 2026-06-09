// ─── Continuity Scorer ───────────────────────────────────────────────────────
// Implements deterministic symbolic/morphological scoring primitives.

import type { ContinuityAnchor, SMIScores, SymbolicSignature } from '../../types/smiEngine';
import { mergeSignatureTerms } from './intentSignatureService';
import { calculateEchoWeightIndex } from './echoWeightService';
import { SMI_RULE_PROFILE } from './engineConfig';
import { clamp, fuzzyOverlapRatio, jaccardSimilarity, overlapRatio, wordCount } from './textUtils';

function continuityAngleFromSimilarity(similarity: number): number {
  const safe = Math.max(-1, Math.min(1, similarity));
  return Math.round((Math.acos(safe) * 180) / Math.PI);
}

export function calculateBaselineAlignment(outputSignature: SymbolicSignature, baselineSignature?: SymbolicSignature): number {
  if (!baselineSignature) return 100;
  const baselineTerms = mergeSignatureTerms(baselineSignature);
  const outputTerms = mergeSignatureTerms(outputSignature);
  const exact = overlapRatio(baselineTerms, outputTerms);
  const fuzzy = fuzzyOverlapRatio(baselineTerms, outputTerms);
  return clamp((exact * 0.55 + fuzzy * 0.45) * 100);
}

export function calculateSourceIntegrity(
  intentSignature: SymbolicSignature,
  promptSignature: SymbolicSignature,
  outputText: string
): number {
  const sourceRequired = intentSignature.sourceRequirements.length > 0 || promptSignature.sourceRequirements.length > 0;
  const hasSourceMarkers = /https?:\/\/|source:|reference:|\[\d+\]|citation|doi:|retrieved/i.test(outputText);
  const factualSignals = /research shows|studies show|according to|data shows|proven|guaranteed|always|never|statistics|evidence/i.test(outputText);
  if (sourceRequired && !hasSourceMarkers) return 35;
  if (factualSignals && !hasSourceMarkers) return 55;
  if (sourceRequired && hasSourceMarkers) return 85;
  return 78;
}

export function calculateMorphologyAlignment(
  intentSignature: SymbolicSignature,
  promptSignature: SymbolicSignature,
  outputSignature: SymbolicSignature,
  baselineSignature?: SymbolicSignature
): number {
  const weights = SMI_RULE_PROFILE.scoringWeights;
  const intentTerms = mergeSignatureTerms(intentSignature);
  const promptTerms = mergeSignatureTerms(promptSignature);
  const outputTerms = mergeSignatureTerms(outputSignature);
  const baselineTerms = baselineSignature ? mergeSignatureTerms(baselineSignature) : [];

  const goalToOutput = Math.max(overlapRatio(intentTerms, outputTerms), fuzzyOverlapRatio(intentTerms, outputTerms));
  const promptToOutput = Math.max(overlapRatio(promptTerms, outputTerms), fuzzyOverlapRatio(promptTerms, outputTerms));
  const baselineToOutput = baselineTerms.length > 0
    ? Math.max(overlapRatio(baselineTerms, outputTerms), fuzzyOverlapRatio(baselineTerms, outputTerms))
    : goalToOutput;
  const outputCohesion = jaccardSimilarity([...intentTerms, ...promptTerms], outputTerms);
  const phrasePreservation = fuzzyOverlapRatio([...intentSignature.keyPhrases, ...promptSignature.keyPhrases], outputSignature.keyPhrases);

  return clamp((
    goalToOutput * weights.goalToOutput +
    promptToOutput * weights.promptToOutput +
    baselineToOutput * weights.baselineToOutput +
    outputCohesion * weights.outputCohesion +
    phrasePreservation * weights.phrasePreservation
  ) * 100);
}

export function calculateSymbolicAlignment(anchors: ContinuityAnchor[]): number {
  if (anchors.length === 0) return 0;
  const preserved = anchors.reduce((sum, anchor) => sum + (anchor.presentInOutput ? anchor.weight : 0), 0);
  const total = anchors.reduce((sum, anchor) => sum + anchor.weight, 0);
  return clamp((preserved / Math.max(total, 0.01)) * 100);
}

export function calculateResonanceScore(params: {
  symbolicAlignment: number;
  echoWeightIndex: number;
  morphologyAlignment: number;
  baselineAlignment: number;
  sourceIntegrity: number;
}): number {
  const weights = SMI_RULE_PROFILE.scoringWeights;
  return clamp(
    params.symbolicAlignment * weights.symbolicAlignment +
    params.echoWeightIndex * weights.echoWeightIndex +
    params.morphologyAlignment * weights.morphologyAlignment +
    params.baselineAlignment * weights.baselineAlignment +
    params.sourceIntegrity * weights.sourceIntegrity
  );
}

export function calculateDriftPressure(
  inputLength: number,
  outputLength: number,
  symbolicAlignment: number,
  morphologyAlignment: number,
  baselineAlignment: number,
  sourceIntegrity: number,
  painPointCount: number
): number {
  const lengthDivergence = inputLength > 0 ? Math.abs(outputLength - inputLength) / Math.max(inputLength, outputLength, 1) : 0;
  const lowAlignmentPressure =
    (100 - symbolicAlignment) * 0.28 +
    (100 - morphologyAlignment) * 0.28 +
    (100 - baselineAlignment) * 0.12 +
    (100 - sourceIntegrity) * 0.10;
  const painPressure = painPointCount * 6;
  return clamp(lowAlignmentPressure + lengthDivergence * 22 + painPressure);
}

export function calculateEntropyIndex(resonanceScore: number, driftPressure: number): number {
  return clamp((100 - resonanceScore) * 0.55 + driftPressure * 0.45);
}

export function calculateSMIScores(params: {
  intentSignature: SymbolicSignature;
  promptSignature: SymbolicSignature;
  outputSignature: SymbolicSignature;
  baselineSignature?: SymbolicSignature;
  anchors: ContinuityAnchor[];
  userGoal: string;
  originalPrompt: string;
  aiOutput: string;
  painPointCount: number;
}): SMIScores {
  const symbolicAlignment = calculateSymbolicAlignment(params.anchors);
  const morphologyAlignment = calculateMorphologyAlignment(
    params.intentSignature,
    params.promptSignature,
    params.outputSignature,
    params.baselineSignature
  );
  const baselineAlignment = calculateBaselineAlignment(params.outputSignature, params.baselineSignature);
  const sourceIntegrity = calculateSourceIntegrity(params.intentSignature, params.promptSignature, params.aiOutput);
  const echoWeightIndex = calculateEchoWeightIndex(params.anchors);
  const resonanceScore = calculateResonanceScore({
    symbolicAlignment,
    echoWeightIndex,
    morphologyAlignment,
    baselineAlignment,
    sourceIntegrity,
  });
  const driftPressure = calculateDriftPressure(
    wordCount(`${params.userGoal} ${params.originalPrompt}`),
    wordCount(params.aiOutput),
    symbolicAlignment,
    morphologyAlignment,
    baselineAlignment,
    sourceIntegrity,
    params.painPointCount
  );
  const continuitySimilarity = Math.max(0, Math.min(1, resonanceScore / 100));
  const continuityAngle = continuityAngleFromSimilarity(continuitySimilarity);
  const entropyIndex = calculateEntropyIndex(resonanceScore, driftPressure);

  return {
    symbolicAlignment,
    morphologyAlignment,
    resonanceScore,
    echoWeightIndex,
    driftPressure,
    continuityAngle,
    entropyIndex,
    baselineAlignment,
    sourceIntegrity,
  };
}
