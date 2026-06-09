// ─── .lcaimem Token Service ─────────────────────────────────────────────────
// Engineering-safe tokenization of continuity anchors into lifecycle records.

import type { ContinuityAnchor, LCAIMemToken } from '../../types/smiEngine';
import { tokensFromAnchors } from './echoWeightService';

export function buildLCAIMemTokens(anchors: ContinuityAnchor[]): LCAIMemToken[] {
  return tokensFromAnchors(anchors);
}
