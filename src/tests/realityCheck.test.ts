// ─── Reality Check Service Tests ──────────────────────────────────────────────
// Covers determinism, empty input, score ordering, pain point effects,
// and localStorage round-trip via storage service.

import { describe, it, expect, beforeEach } from 'vitest';
import { scoreRealityCheck, scoreTeamConsistency, _resetIdCounter } from '../services/realityCheckService';
import type { RealityCheckInput } from '../types/realityCheck';

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Import storage service AFTER mocking localStorage
const { saveCheck, loadChecks, removeCheck, clearAllChecks } = await import('../services/realityCheckStorageService');

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const strongInput: RealityCheckInput = {
  userGoal: 'Write a concise executive summary of Q3 financial results for the board',
  originalPrompt: 'Write a concise executive summary of Q3 financial results for the board. Format: 3 bullet points. Audience: non-technical executives.',
  aiOutput: `Here are the Q3 financial results for the board:
1. Revenue increased 12% year-over-year to $4.2M, driven by the enterprise subscription tier.
2. Operating margin improved to 18% due to a 9% reduction in infrastructure costs.
3. Cash reserves stand at $2.1M, providing 9 months of runway at current burn rate.`,
  expectedFormat: '3 bullet points',
  targetAudience: 'non-technical executives',
  sourcePlatform: 'ChatGPT',
  painPoints: [],
};

const genericInput: RealityCheckInput = {
  userGoal: 'Write a concise executive summary of Q3 financial results for the board',
  originalPrompt: 'Summarize the Q3 results',
  aiOutput: 'The Q3 results were generally good with various improvements across different areas. Things seem to be going well and the team has been doing some things to make the situation better.',
  expectedFormat: '3 bullet points',
  targetAudience: 'non-technical executives',
  sourcePlatform: 'ChatGPT',
  painPoints: [],
};

const emptyOutputInput: RealityCheckInput = {
  userGoal: 'Summarize the report',
  originalPrompt: 'Summarize this report',
  aiOutput: '',
  sourcePlatform: 'Claude',
  painPoints: [],
};

// ─── Test Group 1: Determinism ────────────────────────────────────────────────

describe('scoreRealityCheck — determinism', () => {
  beforeEach(() => _resetIdCounter());

  it('returns identical scores for identical input called twice', () => {
    const r1 = scoreRealityCheck(strongInput);
    _resetIdCounter();
    const r2 = scoreRealityCheck(strongInput);
    expect(r1.overallScore).toBe(r2.overallScore);
    expect(r1.intentMatch).toBe(r2.intentMatch);
    expect(r1.continuity).toBe(r2.continuity);
    expect(r1.specificity).toBe(r2.specificity);
    expect(r1.actionability).toBe(r2.actionability);
    expect(r1.truthRisk).toBe(r2.truthRisk);
    expect(r1.wastedPromptingRisk).toBe(r2.wastedPromptingRisk);
    expect(r1.grade).toBe(r2.grade);
    expect(r1.verdict).toBe(r2.verdict);
  });

  it('scores are all integers in 0–100 range', () => {
    const r = scoreRealityCheck(strongInput);
    for (const key of ['overallScore', 'intentMatch', 'continuity', 'specificity', 'actionability', 'truthRisk', 'wastedPromptingRisk'] as const) {
      expect(r[key]).toBeGreaterThanOrEqual(0);
      expect(r[key]).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r[key])).toBe(true);
    }
  });
});

// ─── Test Group 2: Empty input validation ────────────────────────────────────

describe('scoreRealityCheck — empty input', () => {
  beforeEach(() => _resetIdCounter());

  it('returns overallScore 0 for empty aiOutput', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.overallScore).toBe(0);
  });

  it('returns grade F for empty aiOutput', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.grade).toBe('F');
  });

  it('returns Rotten Output verdict for empty aiOutput', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.verdict).toBe('Rotten Output');
  });

  it('returns wastedPromptingRisk of 100 for empty aiOutput', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.wastedPromptingRisk).toBe(100);
  });

  it('whatDrifted contains a message about missing output', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.whatDrifted.some((w) => w.toLowerCase().includes('output'))).toBe(true);
  });
});

// ─── Test Group 3: Score ordering ─────────────────────────────────────────────

describe('scoreRealityCheck — score ordering', () => {
  beforeEach(() => _resetIdCounter());

  it('strong aligned output scores higher overall than generic output', () => {
    const strong  = scoreRealityCheck(strongInput);
    const generic = scoreRealityCheck(genericInput);
    expect(strong.overallScore).toBeGreaterThan(generic.overallScore);
  });

  it('strong output has higher intentMatch than generic output', () => {
    const strong  = scoreRealityCheck(strongInput);
    const generic = scoreRealityCheck(genericInput);
    expect(strong.intentMatch).toBeGreaterThan(generic.intentMatch);
  });

  it('strong output has higher specificity than generic output', () => {
    const strong  = scoreRealityCheck(strongInput);
    const generic = scoreRealityCheck(genericInput);
    expect(strong.specificity).toBeGreaterThan(generic.specificity);
  });

  it('strong output has higher actionability than generic output', () => {
    const strong  = scoreRealityCheck(strongInput);
    const generic = scoreRealityCheck(genericInput);
    expect(strong.actionability).toBeGreaterThanOrEqual(generic.actionability);
  });
});

// ─── Test Group 4: Pain point effects ────────────────────────────────────────

describe('scoreRealityCheck — pain points affect wastedPromptingRisk', () => {
  beforeEach(() => _resetIdCounter());

  it('adding missed_intent and too_generic pain points raises wastedPromptingRisk', () => {
    const withoutPain = scoreRealityCheck({ ...genericInput, painPoints: [] });
    const withPain    = scoreRealityCheck({
      ...genericInput,
      painPoints: ['missed_intent', 'too_generic'],
    });
    expect(withPain.wastedPromptingRisk).toBeGreaterThan(withoutPain.wastedPromptingRisk);
  });

  it('adding hallucination_risk pain point raises truthRisk', () => {
    const without = scoreRealityCheck({ ...genericInput, painPoints: [] });
    const with_   = scoreRealityCheck({ ...genericInput, painPoints: ['hallucination_risk'] });
    expect(with_.truthRisk).toBeGreaterThan(without.truthRisk);
  });

  it('adding wrong_tone reduces continuity score', () => {
    const without = scoreRealityCheck({ ...genericInput, painPoints: [] });
    const with_   = scoreRealityCheck({ ...genericInput, painPoints: ['wrong_tone'] });
    expect(with_.continuity).toBeLessThan(without.continuity);
  });
});

// ─── Test Group 5: Grade boundaries ──────────────────────────────────────────

describe('scoreRealityCheck — grade and verdict boundaries', () => {
  beforeEach(() => _resetIdCounter());

  it('strong input receives grade A, B, or C', () => {
    const r = scoreRealityCheck(strongInput);
    expect(['A', 'B', 'C']).toContain(r.grade);
  });

  it('generic output receives grade C, D, or F', () => {
    const r = scoreRealityCheck(genericInput);
    expect(['C', 'D', 'F']).toContain(r.grade);
  });

  it('empty output receives grade F', () => {
    const r = scoreRealityCheck(emptyOutputInput);
    expect(r.grade).toBe('F');
  });
});

// ─── Test Group 6: Storage service round-trip ─────────────────────────────────

describe('realityCheckStorageService — localStorage round-trip', () => {
  beforeEach(() => {
    localStorageMock.clear();
    _resetIdCounter();
  });

  it('save and load returns the saved record', () => {
    const result = scoreRealityCheck(strongInput);
    saveCheck(result);
    const loaded = loadChecks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(result.id);
    expect(loaded[0].overallScore).toBe(result.overallScore);
  });

  it('removeCheck eliminates the record by id', () => {
    const r1 = scoreRealityCheck(strongInput);
    const r2 = scoreRealityCheck(genericInput);
    saveCheck(r1);
    saveCheck(r2);
    removeCheck(r1.id);
    const loaded = loadChecks();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe(r2.id);
  });

  it('clearAllChecks empties the store', () => {
    const result = scoreRealityCheck(strongInput);
    saveCheck(result);
    clearAllChecks();
    expect(loadChecks()).toHaveLength(0);
  });

  it('multiple saves stack in insertion order (newest first)', () => {
    _resetIdCounter();
    const r1 = scoreRealityCheck(strongInput);
    _resetIdCounter();
    const r2 = scoreRealityCheck(genericInput);
    saveCheck(r1);
    saveCheck(r2);
    const loaded = loadChecks();
    // saveCheck uses unshift so r2 (saved last) is index 0
    expect(loaded[0].id).toBe(r2.id);
    expect(loaded[1].id).toBe(r1.id);
  });
});

// ─── Test Group 7: Team consistency scoring ───────────────────────────────────

describe('scoreTeamConsistency — deterministic baseline comparison', () => {
  it('identical outputs score 100', () => {
    const r = scoreTeamConsistency('test', 'hello world test', 'hello world test');
    expect(r.consistencyScore).toBe(100);
  });

  it('completely different outputs score lower than matching outputs', () => {
    const matching  = scoreTeamConsistency('test', 'financial revenue quarterly results', 'financial revenue quarterly results');
    const different = scoreTeamConsistency('test', 'financial revenue quarterly results', 'cats dogs weather cooking recipes');
    expect(matching.consistencyScore).toBeGreaterThan(different.consistencyScore);
  });

  it('returns a correctionPrompt string', () => {
    const r = scoreTeamConsistency('project', 'baseline content', 'different content');
    expect(typeof r.correctionPrompt).toBe('string');
    expect(r.correctionPrompt.length).toBeGreaterThan(0);
  });

  it('score is in 0–100 range', () => {
    const r = scoreTeamConsistency('p', 'aaa bbb ccc', 'xxx yyy zzz');
    expect(r.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(r.consistencyScore).toBeLessThanOrEqual(100);
  });
});
