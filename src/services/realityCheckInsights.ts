import type { RealityCheckResult } from '../types/realityCheck';

export interface ScoreDimensionInsight {
  key: keyof Pick<RealityCheckResult, 'intentMatch' | 'continuity' | 'specificity' | 'actionability'>;
  label: string;
  score: number;
}

export interface RealityScoreInsight {
  bestCategory: ScoreDimensionInsight;
  weakestCategory: ScoreDimensionInsight;
  firstFix: string;
}

export function getRealityScoreInsight(result: RealityCheckResult): RealityScoreInsight {
  const dimensions: ScoreDimensionInsight[] = [
    { key: 'intentMatch', label: 'Intent Match', score: result.intentMatch },
    { key: 'continuity', label: 'Continuity', score: result.continuity },
    { key: 'specificity', label: 'Specificity', score: result.specificity },
    { key: 'actionability', label: 'Actionability', score: result.actionability },
  ];
  const sorted = [...dimensions].sort((a, b) => a.score - b.score);
  const weakestCategory = sorted[0];
  const bestCategory = sorted[sorted.length - 1];

  const fixByKey: Record<ScoreDimensionInsight['key'], string> = {
    intentMatch: 'Restate the exact outcome you want before asking for a revision.',
    continuity: 'Re-anchor the format, audience, constraints, and prior context in the next prompt.',
    specificity: 'Ask for concrete examples, named sections, numbers, steps, or deliverables.',
    actionability: 'Ask the AI to convert the answer into steps, decisions, or copy-ready output.',
  };

  return {
    bestCategory,
    weakestCategory,
    firstFix: fixByKey[weakestCategory.key],
  };
}
