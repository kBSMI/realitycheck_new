// ─── SMI Morphological Continuity Engine ─────────────────────────────────────
// Deterministic v0.2 enterprise-ready service. No AI agents. No external LLM calls.

import type { SMIEngineInput, SMIEngineResult } from '../../types/smiEngine';
import { SMI_ENGINE_VERSION } from '../../types/smiEngine';
import { buildSymbolicSignature } from './intentSignatureService';
import { buildContinuityAnchors } from './symbolicAnchorService';
import { buildEmotionalContinuityVector } from './emotionalContinuityVectorService';
import { calculateSMIScores } from './continuityScorer';
import { detectDriftFindings } from './driftReasonCodeService';
import { calculateTrinaryDecision } from './trinaryDecisionService';
import { buildSMIRecommendation } from './recommendationService';
import { buildLCAIMemTokens } from './lcaimemTokenService';
import { canonicalStringify, createEvidenceChainHash, stableHash, stableObjectHash } from './auditHashService';
import { buildConfidenceProfile } from './confidenceService';
import { buildResonanceSignature } from './resonanceSignatureService';
import { buildBaselineComparison } from './baselineComparisonService';
import { buildImprovementComparison } from './improvementComparisonService';
import { buildEnterpriseProfile } from './enterpriseInputAdapterService';

export function runSMIMorphologicalContinuityEngine(input: SMIEngineInput): SMIEngineResult {
  const normalizedInput: SMIEngineInput = {
    ...input,
    userGoal: input.userGoal ?? '',
    originalPrompt: input.originalPrompt ?? '',
    aiOutput: input.aiOutput ?? '',
    painPoints: input.painPoints ?? [],
    inputType: input.inputType ?? 'text',
    ingestionMode: input.ingestionMode ?? 'single',
    slaClass: input.slaClass ?? 'interactive',
  };

  const intentSignature = buildSymbolicSignature(normalizedInput.userGoal);
  const promptSignature = buildSymbolicSignature(normalizedInput.originalPrompt);
  const outputSignature = buildSymbolicSignature(normalizedInput.aiOutput);
  const baselineSignature = normalizedInput.baselineOutput ? buildSymbolicSignature(normalizedInput.baselineOutput) : undefined;
  const improvedSignature = normalizedInput.improvedOutput ? buildSymbolicSignature(normalizedInput.improvedOutput) : undefined;

  const symbolicAnchors = buildContinuityAnchors(normalizedInput);
  const emotionalContinuityVector = buildEmotionalContinuityVector(
    normalizedInput.userGoal,
    normalizedInput.originalPrompt,
    normalizedInput.aiOutput,
    normalizedInput.baselineOutput ?? ''
  );
  const lcaimemTokens = buildLCAIMemTokens(symbolicAnchors);

  const scores = calculateSMIScores({
    intentSignature,
    promptSignature,
    outputSignature,
    baselineSignature,
    anchors: symbolicAnchors,
    userGoal: normalizedInput.userGoal,
    originalPrompt: normalizedInput.originalPrompt,
    aiOutput: normalizedInput.aiOutput,
    painPointCount: normalizedInput.painPoints?.length ?? 0,
  });

  const driftFindings = detectDriftFindings({
    anchors: symbolicAnchors,
    intentSignature,
    promptSignature,
    outputSignature,
    scores,
    aiOutput: normalizedInput.aiOutput,
    baselineOutput: normalizedInput.baselineOutput,
    painPoints: normalizedInput.painPoints ?? [],
  });

  const reasonCodes = Array.from(new Set(driftFindings.map((finding) => finding.code)));
  const trinaryDecision = calculateTrinaryDecision(scores, driftFindings);
  const recommendation = buildSMIRecommendation(normalizedInput, trinaryDecision, scores, driftFindings);
  const confidence = buildConfidenceProfile({
    userGoal: normalizedInput.userGoal,
    originalPrompt: normalizedInput.originalPrompt,
    aiOutput: normalizedInput.aiOutput,
    baselineOutput: normalizedInput.baselineOutput,
    anchors: symbolicAnchors,
    findings: driftFindings,
    scores,
  });
  const resonanceSignature = buildResonanceSignature({
    tokens: lcaimemTokens,
    emotionalContinuityVector,
    engineVersion: SMI_ENGINE_VERSION,
  });
  const baselineComparison = buildBaselineComparison({
    baselineOutput: normalizedInput.baselineOutput,
    anchors: symbolicAnchors,
    scores,
    reasonCodes,
  });
  const improvementComparison = buildImprovementComparison({
    input: normalizedInput,
    intentSignature,
    promptSignature,
    baselineSignature,
    originalResonanceScore: scores.resonanceScore,
    originalDriftPressure: scores.driftPressure,
  });
  const enterpriseProfile = buildEnterpriseProfile({
    inputType: normalizedInput.inputType,
    ingestionMode: normalizedInput.ingestionMode,
    slaClass: normalizedInput.slaClass,
    estimatedRecordCount: Number(normalizedInput.metadata?.recordCount ?? 1),
  });

  const canonicalInputHash = stableObjectHash({
    engineVersion: SMI_ENGINE_VERSION,
    userGoal: normalizedInput.userGoal,
    originalPrompt: normalizedInput.originalPrompt,
    aiOutput: normalizedInput.aiOutput,
    expectedFormat: normalizedInput.expectedFormat,
    targetAudience: normalizedInput.targetAudience,
    baselineOutput: normalizedInput.baselineOutput,
    improvedOutput: normalizedInput.improvedOutput,
    inputType: normalizedInput.inputType,
    ingestionMode: normalizedInput.ingestionMode,
    slaClass: normalizedInput.slaClass,
  });
  const evidenceChainHash = createEvidenceChainHash([
    canonicalInputHash,
    scores,
    reasonCodes,
    confidence,
    resonanceSignature.resonanceHash,
  ]);

  return {
    engineVersion: SMI_ENGINE_VERSION,
    intentSignature,
    promptSignature,
    outputSignature,
    baselineSignature,
    improvedSignature,
    symbolicAnchors,
    emotionalContinuityVector,
    lcaimemTokens,
    scores,
    driftFindings,
    reasonCodes,
    recommendation,
    confidence,
    resonanceSignature,
    baselineComparison,
    improvementComparison,
    enterpriseProfile,
    auditRecord: {
      engineVersion: SMI_ENGINE_VERSION,
      inputHash: stableHash(canonicalStringify(normalizedInput)),
      canonicalInputHash,
      goalHash: stableHash(normalizedInput.userGoal),
      promptHash: stableHash(normalizedInput.originalPrompt),
      outputHash: stableHash(normalizedInput.aiOutput),
      baselineHash: normalizedInput.baselineOutput ? stableHash(normalizedInput.baselineOutput) : undefined,
      improvedHash: normalizedInput.improvedOutput ? stableHash(normalizedInput.improvedOutput) : undefined,
      resonanceSigilId: resonanceSignature.sigilId,
      resonanceSignatureHash: resonanceSignature.resonanceHash,
      evidenceChainHash,
      timestamp: new Date().toISOString(),
      reasonCodes,
      trinaryDecision,
      inputType: normalizedInput.inputType ?? 'text',
      ingestionMode: normalizedInput.ingestionMode ?? 'single',
      slaClass: normalizedInput.slaClass ?? 'interactive',
    },
  };
}
