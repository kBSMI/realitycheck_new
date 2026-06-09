// ─── Emotional/Tone Continuity Vector Service ────────────────────────────────
// Engineering-safe implementation: detects tone markers, intensity, metaphor
// density, and cadence from user-provided text.

import type { EmotionalContinuityVector } from '../../types/smiEngine';
import { clamp01, tokenize, wordCount } from './textUtils';

const POSITIVE_MARKERS = ['clear','helpful','confident','trust','safe','useful','strong','polished','better','aligned','care','support'];
const NEGATIVE_MARKERS = ['wrong','bad','frustrated','confusing','missed','lost','drift','generic','broken','risk','unsafe','failed'];
const INTENSITY_MARKERS = ['really','very','extremely','always','never','urgent','critical','must','need','important','exactly'];
const METAPHOR_MARKERS = ['like','as if','mirror','signal','heart','path','journey','network','anchor','bridge','drift','core','echo','thread'];

export function buildEmotionalContinuityVector(...texts: string[]): EmotionalContinuityVector {
  const text = texts.filter(Boolean).join(' ');
  const tokens = tokenize(text);
  const wc = wordCount(text);
  const lower = text.toLowerCase();

  const positive = POSITIVE_MARKERS.filter((marker) => lower.includes(marker)).length;
  const negative = NEGATIVE_MARKERS.filter((marker) => lower.includes(marker)).length;
  const intensityHits = INTENSITY_MARKERS.filter((marker) => lower.includes(marker)).length;
  const metaphorHits = METAPHOR_MARKERS.filter((marker) => lower.includes(marker)).length;

  const polarity = clamp01((positive + 1) / (positive + negative + 2)) * 2 - 1;
  const intensity = clamp01((intensityHits + negative * 0.5 + positive * 0.25) / Math.max(tokens.length / 18, 1));
  const metaphorDensity = clamp01(metaphorHits / Math.max(wc / 40, 1));

  const toneMarkers = [
    ...POSITIVE_MARKERS.filter((marker) => lower.includes(marker)),
    ...NEGATIVE_MARKERS.filter((marker) => lower.includes(marker)),
    ...INTENSITY_MARKERS.filter((marker) => lower.includes(marker)),
  ].slice(0, 10);

  const cadence: EmotionalContinuityVector['cadence'] = wc < 80 ? 'brief' : wc > 260 ? 'dense' : 'balanced';

  return {
    polarity: Number(polarity.toFixed(2)),
    intensity: Number(intensity.toFixed(2)),
    toneMarkers,
    metaphorDensity: Number(metaphorDensity.toFixed(2)),
    cadence,
  };
}
