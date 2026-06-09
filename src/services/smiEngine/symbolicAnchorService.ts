// ─── Symbolic Anchor Service ─────────────────────────────────────────────────
// Produces weighted continuity anchors from goal/prompt/baseline inputs and
// marks whether those anchors survive into the output.

import type {
  ContinuityAnchor,
  ContinuityAnchorKind,
  SMIEngineInput,
  SymbolicSignature,
} from '../../types/smiEngine';
import { buildSymbolicSignature } from './intentSignatureService';
import { fuzzyOverlapRatio, normalizeText, stableId, unique } from './textUtils';

function termPresent(term: string, outputText: string): boolean {
  const normalizedOutput = normalizeText(outputText);
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return false;
  if (normalizedOutput.includes(normalizedTerm)) return true;
  const termWords = normalizedTerm.split(/\s+/).filter(Boolean);
  if (termWords.length <= 1) return false;
  const outputWords = normalizedOutput.split(/\s+/).filter(Boolean);
  return fuzzyOverlapRatio(termWords, outputWords) >= 0.6;
}

function makeAnchorsFromTerms(
  kind: ContinuityAnchorKind,
  terms: string[],
  source: ContinuityAnchor['source'],
  outputText: string,
  baseWeight: number
): ContinuityAnchor[] {
  return unique(terms.map((term) => normalizeText(term)).filter((term) => term.length > 2)).map((term) => {
    const presentInOutput = termPresent(term, outputText);
    const echoWeight = presentInOutput ? Math.min(1, baseWeight + 0.2) : Math.max(0.1, baseWeight - 0.2);
    return {
      id: stableId(`${kind}-${source}`, term),
      kind,
      label: term,
      source,
      weight: Number(Math.max(0.1, Math.min(1, baseWeight)).toFixed(2)),
      presentInOutput,
      echoWeight: Number(echoWeight.toFixed(2)),
    };
  });
}

function anchorsFromSignature(
  signature: SymbolicSignature,
  source: ContinuityAnchor['source'],
  outputText: string,
  sourceWeight: number
): ContinuityAnchor[] {
  return [
    ...makeAnchorsFromTerms('task', signature.task, source, outputText, sourceWeight + 0.1),
    ...makeAnchorsFromTerms('deliverable', signature.deliverables, source, outputText, sourceWeight + 0.1),
    ...makeAnchorsFromTerms('audience', signature.audience, source, outputText, sourceWeight),
    ...makeAnchorsFromTerms('format', signature.format, source, outputText, sourceWeight),
    ...makeAnchorsFromTerms('tone', signature.tone, source, outputText, sourceWeight - 0.05),
    ...makeAnchorsFromTerms('constraint', signature.constraints, source, outputText, sourceWeight + 0.15),
    ...makeAnchorsFromTerms('source', signature.sourceRequirements, source, outputText, sourceWeight + 0.1),
    ...makeAnchorsFromTerms('risk', signature.riskMarkers, source, outputText, sourceWeight + 0.1),
    ...makeAnchorsFromTerms('domain', signature.domainTerms.slice(0, 10), source, outputText, sourceWeight - 0.1),
    ...makeAnchorsFromTerms('concept', signature.keyPhrases.slice(0, 12), source, outputText, sourceWeight - 0.05),
  ];
}

export function buildContinuityAnchors(input: SMIEngineInput): ContinuityAnchor[] {
  const goalSignature = buildSymbolicSignature(input.userGoal);
  const promptSignature = buildSymbolicSignature(input.originalPrompt);
  const baselineSignature = input.baselineOutput ? buildSymbolicSignature(input.baselineOutput) : undefined;
  const improvedSignature = input.improvedOutput ? buildSymbolicSignature(input.improvedOutput) : undefined;

  const anchors = [
    ...anchorsFromSignature(goalSignature, 'goal', input.aiOutput, 0.88),
    ...anchorsFromSignature(promptSignature, 'prompt', input.aiOutput, 0.78),
    ...(baselineSignature ? anchorsFromSignature(baselineSignature, 'baseline', input.aiOutput, 0.84) : []),
    ...(improvedSignature ? anchorsFromSignature(improvedSignature, 'improved', input.improvedOutput ?? input.aiOutput, 0.55) : []),
  ];

  const seen = new Map<string, ContinuityAnchor>();
  anchors.forEach((anchor) => {
    const key = `${anchor.kind}:${anchor.label}`;
    const existing = seen.get(key);
    if (!existing || anchor.weight > existing.weight) {
      seen.set(key, anchor);
    } else if (existing) {
      seen.set(key, {
        ...existing,
        echoWeight: Number(Math.min(1, existing.echoWeight + 0.1).toFixed(2)),
        presentInOutput: existing.presentInOutput || anchor.presentInOutput,
      });
    }
  });

  return Array.from(seen.values()).slice(0, 80);
}
