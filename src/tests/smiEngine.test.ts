import { describe, expect, it } from 'vitest';
import { runSMIMorphologicalContinuityEngine } from '../services/smiEngine/morphologyEngine';
import { stableHash, stableObjectHash } from '../services/smiEngine/auditHashService';
import { scoreRealityCheck } from '../services/realityCheckService';
import { processEnterpriseBatch, createStreamAccumulator } from '../services/smiEngine/enterpriseInputAdapterService';
import type { SMIEngineInput } from '../types/smiEngine';
import type { RealityCheckInput } from '../types/realityCheck';

const alignedInput: SMIEngineInput = {
  userGoal: 'Create a concise 30-day launch plan for a solo founder launching a mobile AI app',
  originalPrompt: 'Create a concise 30-day launch plan for a solo founder. Format it as weekly milestones, include audience, offer, channel, first experiment, and success metric.',
  aiOutput: `30-Day Launch Plan for a Solo Founder
1. Week 1: Define the target audience as paid AI power users and solo builders.
2. Week 2: Package the offer as a mobile AI Reality Check that scores drift and gives a next prompt.
3. Week 3: Test one channel with creator communities and measure signups.
4. Week 4: Run the first experiment and track activation, saved reports, and upgrade interest.`,
  expectedFormat: 'weekly milestones with audience, offer, channel, experiment, success metric',
  targetAudience: 'solo founder',
  sourcePlatform: 'ChatGPT',
  painPoints: [],
};

const driftedInput: SMIEngineInput = {
  userGoal: 'Create a concise 30-day launch plan for a solo founder launching a mobile AI app',
  originalPrompt: 'Create a concise 30-day launch plan for a solo founder. Format it as weekly milestones, include audience, offer, channel, first experiment, and success metric.',
  aiOutput: 'Launching an app can be exciting. There are many ways to market things online. You should generally think about social media, branding, and customers. Overall, keep improving and stay consistent.',
  expectedFormat: 'weekly milestones with audience, offer, channel, experiment, success metric',
  targetAudience: 'solo founder',
  sourcePlatform: 'ChatGPT',
  painPoints: ['too_generic', 'changed_structure', 'missed_intent'],
};

const sourceRiskInput: SMIEngineInput = {
  userGoal: 'Verify with citations whether RAG poisoning can affect enterprise AI source of truth',
  originalPrompt: 'Use trusted sources and citations to explain whether source-of-truth erosion can happen in RAG systems.',
  aiOutput: 'Research shows RAG poisoning is always a proven enterprise risk and every AI knowledge base can be corrupted without detection.',
  sourcePlatform: 'Other',
  painPoints: ['source_trust_issue', 'hallucination_risk'],
};

const baselineInput: SMIEngineInput = {
  userGoal: 'Keep this client proposal aligned to our approved baseline and preserve the executive summary format',
  originalPrompt: 'Revise the proposal but keep the executive summary, pricing table, timeline, and client-readiness actions.',
  baselineOutput: 'Executive Summary\nPricing Table\nTimeline\nClient-readiness actions\nNext steps',
  aiOutput: 'Here are some general thoughts about improving a business proposal. Make it clear and professional.',
  painPoints: ['changed_structure'],
};

describe('SMI Morphological Continuity Engine', () => {
  it('returns deterministic engine metadata, canonical audit hashes, and resonance sigil', () => {
    const result = runSMIMorphologicalContinuityEngine(alignedInput);
    expect(result.engineVersion).toBe('smi-morphology-v0.2-enterprise');
    expect(result.auditRecord.inputHash).toMatch(/^fnv1a-/);
    expect(result.auditRecord.canonicalInputHash).toMatch(/^fnv1a64-/);
    expect(result.auditRecord.resonanceSigilId).toMatch(/^sigil-/);
    expect(result.resonanceSignature.resonanceHash).toMatch(/^fnv1a64-/);
    expect(result.auditRecord.outputHash).toBe(stableHash(alignedInput.aiOutput));
    expect(result.auditRecord.reasonCodes).toEqual(result.reasonCodes);
  });

  it('uses canonical object hashing independent of key order', () => {
    const left = stableObjectHash({ b: 2, a: { d: 4, c: 3 } });
    const right = stableObjectHash({ a: { c: 3, d: 4 }, b: 2 });
    expect(left).toBe(right);
  });

  it('scores aligned output higher than drifted output', () => {
    const aligned = runSMIMorphologicalContinuityEngine(alignedInput);
    const drifted = runSMIMorphologicalContinuityEngine(driftedInput);
    expect(aligned.scores.resonanceScore).toBeGreaterThan(drifted.scores.resonanceScore);
    expect(aligned.scores.morphologyAlignment).toBeGreaterThan(drifted.scores.morphologyAlignment);
    expect(drifted.scores.driftPressure).toBeGreaterThan(aligned.scores.driftPressure);
  });

  it('detects format drift and generic output reason codes', () => {
    const result = runSMIMorphologicalContinuityEngine(driftedInput);
    expect(result.reasonCodes).toContain('FORMAT_DRIFT');
    expect(result.reasonCodes).toContain('GENERIC_OUTPUT');
    expect(result.reasonCodes.length).toBeGreaterThan(0);
  });

  it('detects source-of-truth erosion when citations are required but missing', () => {
    const result = runSMIMorphologicalContinuityEngine(sourceRiskInput);
    expect(result.reasonCodes).toContain('SOURCE_CONTEXT_EROSION');
    expect(result.reasonCodes).toContain('SOURCE_REQUIREMENT_MISSED');
    expect(result.scores.sourceIntegrity).toBeLessThan(60);
    expect(result.recommendation.action).toBe('verify');
  });

  it('makes baseline comparison first-class for teams and enterprise workflows', () => {
    const result = runSMIMorphologicalContinuityEngine(baselineInput);
    expect(result.baselineComparison.baselineProvided).toBe(true);
    expect(result.baselineComparison.baselineAlignment).toBeLessThan(70);
    expect(result.reasonCodes).toContain('BASELINE_DEVIATION');
  });

  it('scores improved output through the SMI improvement comparison path', () => {
    const result = runSMIMorphologicalContinuityEngine({
      ...driftedInput,
      improvedOutput: alignedInput.aiOutput,
    });
    expect(result.improvementComparison.improvedProvided).toBe(true);
    expect(result.improvementComparison.improvedResonanceScore).toBeGreaterThan(result.improvementComparison.originalResonanceScore);
    expect(result.improvementComparison.resonanceDelta).toBeGreaterThan(0);
  });

  it('includes confidence intervals and basis statements', () => {
    const result = runSMIMorphologicalContinuityEngine(alignedInput);
    expect(result.confidence.confidenceScore).toBeGreaterThan(40);
    expect(result.confidence.intervalLow).toBeLessThanOrEqual(result.confidence.confidenceScore);
    expect(result.confidence.intervalHigh).toBeGreaterThanOrEqual(result.confidence.confidenceScore);
    expect(result.confidence.basis.length).toBeGreaterThan(0);
  });

  it('uses trinary decision states for accept, hold, or rerun paths', () => {
    const aligned = runSMIMorphologicalContinuityEngine(alignedInput);
    const drifted = runSMIMorphologicalContinuityEngine(driftedInput);
    expect(['+1', '0', '-1']).toContain(aligned.recommendation.trinaryDecision);
    expect(['0', '-1']).toContain(drifted.recommendation.trinaryDecision);
    expect(['revise', 'rerun', 'verify', 'reject']).toContain(drifted.recommendation.action);
  });

  it('supports enterprise batch and stream adapters without external AI calls', () => {
    const batch = processEnterpriseBatch([
      { id: 'aligned', input: alignedInput, inputType: 'json', ingestionMode: 'batch', slaClass: 'bulk' },
      { id: 'drifted', input: driftedInput, inputType: 'json', ingestionMode: 'batch', slaClass: 'bulk' },
    ], 'test-batch');
    expect(batch.recordCount).toBe(2);
    expect(batch.summary.averageResonance).toBeGreaterThan(0);
    expect(batch.results[0].result.enterpriseProfile.processingPosture).toBe('batch');

    const stream = createStreamAccumulator();
    expect(stream.push({ id: 'event-1', input: alignedInput, inputType: 'event', slaClass: 'interactive' })).toBe(1);
    expect(stream.size()).toBe(1);
    expect(stream.flush('window-1').recordCount).toBe(1);
  });

  it('is integrated into scoreRealityCheck results', () => {
    const realityInput: RealityCheckInput = {
      userGoal: alignedInput.userGoal,
      originalPrompt: alignedInput.originalPrompt,
      aiOutput: alignedInput.aiOutput,
      expectedFormat: alignedInput.expectedFormat,
      targetAudience: alignedInput.targetAudience,
      sourcePlatform: 'ChatGPT',
      painPoints: [],
    };
    const result = scoreRealityCheck(realityInput);
    expect(result.smiEngineResult?.engineVersion).toBe('smi-morphology-v0.2-enterprise');
    expect(result.smiEngineResult?.auditRecord.outputHash).toBe(stableHash(realityInput.aiOutput));
    expect(result.smiEngineResult?.resonanceSignature.sigilId).toMatch(/^sigil-/);
  });
});
