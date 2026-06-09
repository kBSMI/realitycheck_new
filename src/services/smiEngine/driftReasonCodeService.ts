// ─── Drift Reason Code Service ───────────────────────────────────────────────

import type { PainPoint } from '../../types/realityCheck';
import type {
  ContinuityAnchor,
  DriftFinding,
  DriftReasonCode,
  DriftSeverity,
  SMIScores,
  SymbolicSignature,
} from '../../types/smiEngine';
import { SMI_RULE_PROFILE } from './engineConfig';
import { containsAny, normalizeText, wordCount } from './textUtils';

function severity(score: number, highThreshold = 65, mediumThreshold = 80): DriftSeverity {
  if (score < highThreshold) return 'high';
  if (score < mediumThreshold) return 'medium';
  return 'low';
}

function finding(
  code: DriftReasonCode,
  sev: DriftSeverity,
  message: string,
  evidence: string[],
  affectedAnchors: string[],
  confidence = 72
): DriftFinding {
  return { code, severity: sev, message, evidence, affectedAnchors, confidence };
}

function missingAnchors(anchors: ContinuityAnchor[], kind: ContinuityAnchor['kind']): ContinuityAnchor[] {
  return anchors.filter((anchor) => anchor.kind === kind && !anchor.presentInOutput);
}

export function detectDriftFindings(params: {
  anchors: ContinuityAnchor[];
  intentSignature: SymbolicSignature;
  promptSignature: SymbolicSignature;
  outputSignature: SymbolicSignature;
  scores: SMIScores;
  aiOutput: string;
  baselineOutput?: string;
  painPoints: PainPoint[];
}): DriftFinding[] {
  const findings: DriftFinding[] = [];
  const output = params.aiOutput;
  const normalizedOutput = normalizeText(output);

  if (!output.trim()) {
    return [finding('NO_OUTPUT_PROVIDED', 'high', 'No AI output was provided for continuity assessment.', [], [], 96)];
  }

  const formatMissing = missingAnchors(params.anchors, 'format');
  if (formatMissing.length > 0 || params.painPoints.includes('changed_structure')) {
    findings.push(finding(
      'FORMAT_DRIFT',
      formatMissing.length > 2 ? 'high' : 'medium',
      'Requested format or structure was not fully preserved in the output.',
      formatMissing.slice(0, 4).map((anchor) => anchor.label),
      formatMissing.map((anchor) => anchor.id),
      78
    ));
  }

  const audienceMissing = missingAnchors(params.anchors, 'audience');
  if (audienceMissing.length > 0) {
    findings.push(finding(
      'AUDIENCE_DRIFT',
      'medium',
      'Target audience cues were weak or missing in the output.',
      audienceMissing.slice(0, 4).map((anchor) => anchor.label),
      audienceMissing.map((anchor) => anchor.id),
      72
    ));
  }

  const taskMissing = [...missingAnchors(params.anchors, 'task'), ...missingAnchors(params.anchors, 'deliverable')];
  if (taskMissing.length > 0 || params.painPoints.includes('missed_intent')) {
    findings.push(finding(
      'TASK_SUBSTITUTION',
      severity(params.scores.morphologyAlignment),
      'The output appears to shift away from the requested task or deliverable.',
      taskMissing.slice(0, 5).map((anchor) => anchor.label),
      taskMissing.map((anchor) => anchor.id),
      76
    ));
  }

  const genericPatterns = ['generally', 'various', 'many ways', 'some things', 'in general', 'typically', 'overall'];
  if (genericPatterns.some((term) => normalizedOutput.includes(term)) || params.painPoints.includes('too_generic')) {
    findings.push(finding(
      'GENERIC_OUTPUT',
      'medium',
      'Output uses broad or generic language where specific guidance was needed.',
      genericPatterns.filter((term) => normalizedOutput.includes(term)),
      [],
      70
    ));
  }

  const constraintsMissing = missingAnchors(params.anchors, 'constraint');
  if (constraintsMissing.length > 0) {
    findings.push(finding(
      'MISSING_CONSTRAINT',
      constraintsMissing.length > 2 ? 'high' : 'medium',
      'One or more explicit user constraints appear to be missing from the output.',
      constraintsMissing.slice(0, 4).map((anchor) => anchor.label),
      constraintsMissing.map((anchor) => anchor.id),
      74
    ));
  }

  if (params.painPoints.includes('wrong_tone')) {
    findings.push(finding(
      'TONE_MISMATCH',
      'medium',
      'The user reported that tone did not match the intended result.',
      ['wrong_tone pain point selected'],
      missingAnchors(params.anchors, 'tone').map((anchor) => anchor.id),
      65
    ));
  }

  const sourceRequired = params.intentSignature.sourceRequirements.length > 0 || params.promptSignature.sourceRequirements.length > 0;
  const hasSourceMarkers = /https?:\/\/|source:|reference:|\[\d+\]|citation|doi:|retrieved/i.test(output);
  if (sourceRequired && !hasSourceMarkers) {
    findings.push(finding(
      'SOURCE_REQUIREMENT_MISSED',
      'high',
      'The prompt or goal requested source support, but the output does not show verifiable source markers.',
      [...params.intentSignature.sourceRequirements, ...params.promptSignature.sourceRequirements].slice(0, 4),
      missingAnchors(params.anchors, 'source').map((anchor) => anchor.id),
      84
    ));
  }

  const factualSignals = ['research shows', 'studies show', 'according to', 'data shows', 'proven', 'guaranteed', 'always', 'never'];
  const hasFactualSignal = factualSignals.some((term) => normalizedOutput.includes(term));
  if ((hasFactualSignal && !hasSourceMarkers) || params.painPoints.includes('hallucination_risk')) {
    findings.push(finding(
      'UNSUPPORTED_FACTUAL_CLAIM',
      'high',
      'Output includes factual-sounding claims that may need verification.',
      factualSignals.filter((term) => normalizedOutput.includes(term)),
      [],
      80
    ));
  }

  const sourceContextSignals = [
    'source of truth', 'knowledge base', 'policy', 'runbook', 'retrieval', 'rag', 'citation', 'dataset', 'logs', 'indexed', 'evidence'
  ];
  if (
    (sourceRequired || params.painPoints.includes('source_trust_issue')) &&
    (params.scores.sourceIntegrity < SMI_RULE_PROFILE.thresholds.lowSourceIntegrity || hasFactualSignal) &&
    !hasSourceMarkers
  ) {
    findings.push(finding(
      'SOURCE_CONTEXT_EROSION',
      'high',
      'Source-context continuity is weak: the response may sound factual while the supporting evidence layer is missing or degraded.',
      sourceContextSignals.filter((term) => normalizedOutput.includes(term)).concat(`sourceIntegrity: ${params.scores.sourceIntegrity}/100`),
      missingAnchors(params.anchors, 'source').map((anchor) => anchor.id),
      86
    ));
  }

  const actionSignals = /^\s*[-*•]\s+|^\s*\d+[.)]\s+/gm.test(output) || containsAny(output, ['step', 'next', 'action', 'do this', 'use this']);
  if (!actionSignals || params.painPoints.includes('not_actionable')) {
    findings.push(finding(
      'ACTIONABILITY_GAP',
      'medium',
      'Output may not provide enough concrete next actions.',
      [`output word count: ${wordCount(output)}`],
      [],
      66
    ));
  }

  if (params.baselineOutput) {
    const baselineLength = wordCount(params.baselineOutput);
    const outputLength = wordCount(output);
    const lengthRatio = baselineLength > 0 ? Math.min(baselineLength, outputLength) / Math.max(baselineLength, outputLength) : 1;
    if (params.scores.baselineAlignment < SMI_RULE_PROFILE.thresholds.baselineDeviation || lengthRatio < 0.45) {
      findings.push(finding(
        'BASELINE_DEVIATION',
        severity(params.scores.baselineAlignment),
        'Output deviates from the provided baseline continuity chain.',
        [`baselineAlignment: ${params.scores.baselineAlignment}/100`, `baseline/output length ratio: ${lengthRatio.toFixed(2)}`],
        params.anchors.filter((anchor) => anchor.source === 'baseline' && !anchor.presentInOutput).map((anchor) => anchor.id),
        82
      ));
    }
  }

  if (params.painPoints.includes('forgot_context')) {
    findings.push(finding(
      'CONTEXT_LOSS',
      'high',
      'The user reported that prior context was not carried forward.',
      ['forgot_context pain point selected'],
      params.anchors.filter((anchor) => !anchor.presentInOutput).map((anchor) => anchor.id),
      70
    ));
  }

  if (params.scores.driftPressure > SMI_RULE_PROFILE.thresholds.highDriftPressure) {
    findings.push(finding(
      'HIGH_DRIFT_PRESSURE',
      'high',
      'Drift pressure is elevated due to alignment gaps, length divergence, source integrity, or selected pain points.',
      [`driftPressure: ${params.scores.driftPressure}/100`],
      [],
      78
    ));
  }

  if (params.scores.morphologyAlignment < SMI_RULE_PROFILE.thresholds.lowSymbolicAlignment) {
    findings.push(finding(
      'LOW_SYMBOLIC_ALIGNMENT',
      'high',
      'Symbolic morphology alignment is low between intent, prompt, and output.',
      [`morphologyAlignment: ${params.scores.morphologyAlignment}/100`],
      [],
      82
    ));
  }

  if (params.scores.echoWeightIndex < SMI_RULE_PROFILE.thresholds.lowEchoWeight) {
    findings.push(finding(
      'LOW_ECHO_WEIGHT',
      'medium',
      'Repeated-importance anchors did not strongly survive into the output.',
      [`echoWeightIndex: ${params.scores.echoWeightIndex}/100`],
      [],
      68
    ));
  }

  if (findings.length === 0 && params.scores.resonanceScore < 85) {
    findings.push(finding(
      'OVERBROAD_RESPONSE',
      'low',
      'No major failure mode detected, but the response can be tightened for stronger continuity.',
      [`resonanceScore: ${params.scores.resonanceScore}/100`],
      [],
      58
    ));
  }

  return findings;
}
