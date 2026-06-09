// ─── Resonance Sigil Service ─────────────────────────────────────────────────
// Produces a deterministic resonance signature from symbolic anchor order,
// echo weights, emotional vector shape, and trinary memory state.
// This is a uniqueness/fingerprint layer, not a replacement for cryptographic
// server-side signing in production enterprise ledgers.

import type {
  EmotionalContinuityVector,
  LCAIMemToken,
  SMIResonanceSignature,
} from '../../types/smiEngine';
import { createEvidenceChainHash, stableObjectHash } from './auditHashService';
import { clamp } from './textUtils';

export function buildResonanceSignature(params: {
  tokens: LCAIMemToken[];
  emotionalContinuityVector: EmotionalContinuityVector;
  engineVersion: string;
}): SMIResonanceSignature {
  const orderedTokens = [...params.tokens].sort((left, right) => {
    if (right.echoWeight !== left.echoWeight) return right.echoWeight - left.echoWeight;
    return left.symbol.localeCompare(right.symbol);
  });
  const anchorSequence = orderedTokens.slice(0, 32).map((token) => `${token.kind}:${token.symbol}`);
  const echoVector = orderedTokens.slice(0, 32).map((token) => Number(token.echoWeight.toFixed(2)));
  const toneVector = [
    Number(params.emotionalContinuityVector.polarity.toFixed(2)),
    Number(params.emotionalContinuityVector.intensity.toFixed(2)),
    Number(params.emotionalContinuityVector.metaphorDensity.toFixed(2)),
  ];
  const trinarySequence = orderedTokens.slice(0, 32).map((token) => token.trinaryState);
  const components = { anchorSequence, echoVector, toneVector, trinarySequence };
  const patternHash = stableObjectHash({ version: params.engineVersion, components });
  const resonanceHash = createEvidenceChainHash([patternHash, components]);
  const diversity = new Set(anchorSequence).size;
  const trinaryDiversity = new Set(trinarySequence).size;
  const uniquenessScore = clamp(35 + diversity * 2 + trinaryDiversity * 8 + Math.round(params.emotionalContinuityVector.metaphorDensity * 10));

  return {
    sigilId: `sigil-${resonanceHash.replace(/^fnv1a64-/, '').slice(0, 12)}`,
    resonanceHash,
    patternHash,
    uniquenessScore,
    components,
    note: 'Resonance sigil is a deterministic continuity fingerprint. Production enterprise ledgers should pair it with server-side cryptographic signing.',
  };
}
