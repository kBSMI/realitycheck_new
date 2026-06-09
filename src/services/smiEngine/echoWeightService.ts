// ─── Echo Weight Service ─────────────────────────────────────────────────────

import type { ContinuityAnchor, LCAIMemToken } from '../../types/smiEngine';

export function calculateEchoWeightIndex(anchors: ContinuityAnchor[]): number {
  if (anchors.length === 0) return 0;
  const weighted = anchors.reduce((sum, anchor) => sum + anchor.echoWeight * anchor.weight, 0);
  const total = anchors.reduce((sum, anchor) => sum + anchor.weight, 0);
  return Math.round((weighted / Math.max(total, 0.01)) * 100);
}

export function tokensFromAnchors(anchors: ContinuityAnchor[]): LCAIMemToken[] {
  return anchors.map((anchor) => {
    const resonance = anchor.presentInOutput ? Math.min(1, anchor.weight * anchor.echoWeight + 0.15) : Math.max(0, anchor.weight * anchor.echoWeight - 0.15);
    const decay = Math.max(0, Math.min(1, 1 - resonance));
    return {
      id: anchor.id.replace(/^/, 'lcaimem-'),
      symbol: anchor.label,
      kind: anchor.kind,
      resonance: Number(resonance.toFixed(2)),
      decay: Number(decay.toFixed(2)),
      echoWeight: anchor.echoWeight,
      trinaryState: resonance >= 0.7 ? '+1' : resonance >= 0.45 ? '0' : '-1',
    };
  });
}
