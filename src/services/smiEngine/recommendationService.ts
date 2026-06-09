// ─── Recommendation Service ─────────────────────────────────────────────────

import type {
  DriftFinding,
  RecommendationAction,
  SMIEngineInput,
  SMIRecommendation,
  SMIScores,
  TrinaryDecision,
} from '../../types/smiEngine';

function actionFromDecision(decision: TrinaryDecision, findings: DriftFinding[]): RecommendationAction {
  const hasTruthRisk = findings.some((finding) =>
    finding.code === 'UNSUPPORTED_FACTUAL_CLAIM' ||
    finding.code === 'SOURCE_REQUIREMENT_MISSED' ||
    finding.code === 'SOURCE_CONTEXT_EROSION'
  );
  if (hasTruthRisk) return 'verify';
  if (decision === '+1') return 'accept';
  if (decision === '-1') return 'rerun';
  return 'revise';
}

function buildReason(action: RecommendationAction, scores: SMIScores, findings: DriftFinding[]): string {
  const topFinding = findings[0];
  if (action === 'accept') {
    return `Continuity is strong: resonance ${scores.resonanceScore}/100, baseline alignment ${scores.baselineAlignment}/100, source integrity ${scores.sourceIntegrity}/100.`;
  }
  if (action === 'verify') {
    return 'Verification is recommended because source, provenance, or factual-risk findings were detected.';
  }
  if (action === 'rerun') {
    return `Rerun is recommended because resonance is ${scores.resonanceScore}/100 and entropy is ${scores.entropyIndex}/100.`;
  }
  return topFinding
    ? `Revise first for ${topFinding.code.toLowerCase().replace(/_/g, ' ')}: ${topFinding.message}`
    : 'Revise to improve continuity and specificity before using this output.';
}

export function buildSMINextBestPrompt(input: SMIEngineInput, findings: DriftFinding[]): string {
  const promptParts: string[] = [
    `My intended goal is: "${input.userGoal.trim()}".`,
    'Revise the previous answer so it stays aligned with this goal.',
  ];

  if (input.expectedFormat || findings.some((finding) => finding.code === 'FORMAT_DRIFT')) {
    promptParts.push(input.expectedFormat ? `Use this exact format: ${input.expectedFormat}.` : 'Preserve the requested structure and section order.');
  }

  if (input.targetAudience || findings.some((finding) => finding.code === 'AUDIENCE_DRIFT')) {
    promptParts.push(input.targetAudience ? `Write for this audience: ${input.targetAudience}.` : 'Re-align the tone and examples to the intended audience.');
  }

  if (input.baselineOutput || findings.some((finding) => finding.code === 'BASELINE_DEVIATION')) {
    promptParts.push('Preserve the baseline structure and only change what is necessary to satisfy the requested revision.');
  }

  if (findings.some((finding) => finding.code === 'GENERIC_OUTPUT' || finding.code === 'OVERBROAD_RESPONSE')) {
    promptParts.push('Replace generic language with concrete examples, exact steps, and clear constraints.');
  }

  if (findings.some((finding) => finding.code === 'ACTIONABILITY_GAP')) {
    promptParts.push('End with specific next actions I can take immediately.');
  }

  if (findings.some((finding) => finding.code === 'UNSUPPORTED_FACTUAL_CLAIM' || finding.code === 'SOURCE_REQUIREMENT_MISSED' || finding.code === 'SOURCE_CONTEXT_EROSION')) {
    promptParts.push('For factual claims, cite sources, identify the source of truth, or clearly mark anything that cannot be verified.');
  }

  if (findings.some((finding) => finding.code === 'CONTEXT_LOSS')) {
    promptParts.push('Carry forward the prior context and do not restart from a generic answer.');
  }

  return promptParts.join(' ');
}

export function buildSMIRecommendation(
  input: SMIEngineInput,
  decision: TrinaryDecision,
  scores: SMIScores,
  findings: DriftFinding[]
): SMIRecommendation {
  const action = actionFromDecision(decision, findings);
  return {
    action,
    trinaryDecision: decision,
    reason: buildReason(action, scores, findings),
    nextBestPrompt: buildSMINextBestPrompt(input, findings),
  };
}
