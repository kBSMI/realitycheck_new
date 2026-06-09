// ─── Improvement Comparison Service ──────────────────────────────────────────
// Scores improved output through the same deterministic SMI rules and compares
// it against the original output without recursively running the full engine.

import type {
  DriftReasonCode,
  SMIEngineInput,
  SMIImprovementComparison,
  SymbolicSignature,
  TrinaryDecision,
} from '../../types/smiEngine';
import { buildSymbolicSignature } from './intentSignatureService';
import { buildContinuityAnchors } from './symbolicAnchorService';
import { buildLCAIMemTokens } from './lcaimemTokenService';
import { calculateSMIScores } from './continuityScorer';
import { detectDriftFindings } from './driftReasonCodeService';
import { calculateTrinaryDecision } from './trinaryDecisionService';

function scoreOutputVariant(params: {
  input: SMIEngineInput;
  output: string;
  intentSignature: SymbolicSignature;
  promptSignature: SymbolicSignature;
  baselineSignature?: SymbolicSignature;
}): { resonanceScore: number; driftPressure: number; decision: TrinaryDecision; reasonCodes: DriftReasonCode[] } {
  const variantInput: SMIEngineInput = { ...params.input, aiOutput: params.output, improvedOutput: undefined };
  const outputSignature = buildSymbolicSignature(params.output);
  const anchors = buildContinuityAnchors(variantInput);
  buildLCAIMemTokens(anchors);
  const scores = calculateSMIScores({
    intentSignature: params.intentSignature,
    promptSignature: params.promptSignature,
    outputSignature,
    baselineSignature: params.baselineSignature,
    anchors,
    userGoal: params.input.userGoal,
    originalPrompt: params.input.originalPrompt,
    aiOutput: params.output,
    painPointCount: params.input.painPoints?.length ?? 0,
  });
  const findings = detectDriftFindings({
    anchors,
    intentSignature: params.intentSignature,
    promptSignature: params.promptSignature,
    outputSignature,
    scores,
    aiOutput: params.output,
    baselineOutput: params.input.baselineOutput,
    painPoints: params.input.painPoints ?? [],
  });
  return {
    resonanceScore: scores.resonanceScore,
    driftPressure: scores.driftPressure,
    decision: calculateTrinaryDecision(scores, findings),
    reasonCodes: Array.from(new Set(findings.map((finding) => finding.code))),
  };
}

export function buildImprovementComparison(params: {
  input: SMIEngineInput;
  intentSignature: SymbolicSignature;
  promptSignature: SymbolicSignature;
  baselineSignature?: SymbolicSignature;
  originalResonanceScore: number;
  originalDriftPressure: number;
}): SMIImprovementComparison {
  if (!params.input.improvedOutput?.trim()) {
    return {
      improvedProvided: false,
      originalResonanceScore: params.originalResonanceScore,
      improvedResonanceScore: params.originalResonanceScore,
      resonanceDelta: 0,
      originalDriftPressure: params.originalDriftPressure,
      improvedDriftPressure: params.originalDriftPressure,
      driftPressureDelta: 0,
      improvedDecision: '0',
      improvedReasonCodes: [],
    };
  }

  const improved = scoreOutputVariant({
    input: params.input,
    output: params.input.improvedOutput,
    intentSignature: params.intentSignature,
    promptSignature: params.promptSignature,
    baselineSignature: params.baselineSignature,
  });

  return {
    improvedProvided: true,
    originalResonanceScore: params.originalResonanceScore,
    improvedResonanceScore: improved.resonanceScore,
    resonanceDelta: improved.resonanceScore - params.originalResonanceScore,
    originalDriftPressure: params.originalDriftPressure,
    improvedDriftPressure: improved.driftPressure,
    driftPressureDelta: params.originalDriftPressure - improved.driftPressure,
    improvedDecision: improved.decision,
    improvedReasonCodes: improved.reasonCodes,
  };
}
