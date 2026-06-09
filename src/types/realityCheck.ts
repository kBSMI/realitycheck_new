import type { SMIEngineResult } from './smiEngine';

// ─── AI Reality Check Type Definitions ───────────────────────────────────────
// All types for the consumer/team reality check flow.
// No external API dependencies — all scoring is deterministic and local.

export type PainPoint =
  | 'missed_intent'
  | 'too_generic'
  | 'forgot_context'
  | 'wrong_tone'
  | 'changed_structure'
  | 'hallucination_risk'
  | 'not_actionable'
  | 'too_long'
  | 'too_shallow'
  | 'source_trust_issue';

export const PAIN_POINT_LABELS: Record<PainPoint, string> = {
  missed_intent:     'Missed Intent',
  too_generic:       'Too Generic',
  forgot_context:    'Forgot Context',
  wrong_tone:        'Wrong Tone',
  changed_structure: 'Changed Structure',
  hallucination_risk:'Hallucination Risk',
  not_actionable:    'Not Actionable',
  too_long:          'Too Long',
  too_shallow:       'Too Shallow',
  source_trust_issue:'Source Trust Issue',
};

export type SourcePlatform =
  | 'ChatGPT'
  | 'Claude'
  | 'Gemini'
  | 'Copilot'
  | 'Perplexity'
  | 'Other';

export const SOURCE_PLATFORMS: SourcePlatform[] = [
  'ChatGPT', 'Claude', 'Gemini', 'Copilot', 'Perplexity', 'Other',
];

export type RealityCheckGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export type RealityCheckVerdict =
  | 'Fresh Output'
  | 'Useful but Drifting'
  | 'Needs a Rewrite'
  | 'Rotten Output';

// ─── Input ────────────────────────────────────────────────────────────────────

export interface RealityCheckInput {
  userGoal: string;
  originalPrompt: string;
  aiOutput: string;
  expectedFormat?: string;
  targetAudience?: string;
  sourcePlatform: SourcePlatform;
  painPoints: PainPoint[];
}

// ─── Result ───────────────────────────────────────────────────────────────────

export interface RealityCheckResult {
  id: string;
  input: RealityCheckInput;

  // Primary
  grade: RealityCheckGrade;
  overallScore: number;              // 0–100
  verdict: RealityCheckVerdict;

  // Dimension scores (0–100; higher = better except truthRisk/wastedPromptingRisk)
  intentMatch: number;
  continuity: number;
  specificity: number;
  actionability: number;
  truthRisk: number;                 // 0–100; higher = worse
  wastedPromptingRisk: number;       // 0–100; higher = worse

  // Narrative
  whatDrifted: string[];
  whyItMatters: string;
  nextBestPrompt: string;
  recommendedAction: string;

  // Deterministic SMI engine assessment (no external AI calls).
  smiEngineResult?: SMIEngineResult;

  savedAt: string;                   // ISO 8601
}

// ─── Improvement check ────────────────────────────────────────────────────────

export interface ImprovementCheckResult {
  id: string;
  originalCheckId: string;
  improvedOutput: string;

  // Scores
  originalScore: number;
  improvedScore: number;
  scoreDelta: number;               // improvedScore - originalScore

  // Dimension deltas (positive = improved)
  intentMatchDelta: number;
  continuityDelta: number;
  specificityDelta: number;
  actionabilityDelta: number;
  truthRiskDelta: number;           // negative = better (risk went down)

  // Narrative
  improvedCategories: string[];     // dimension names that improved by >= 5 pts
  remainingDrift: string[];         // dimensions still below threshold
  testimonialPrompt: string;        // suggested testimonial question text
  summaryMessage: string;           // e.g. "Your score improved from 62 to 84 (+22)."

  savedAt: string;
}

// ─── Testimonial ──────────────────────────────────────────────────────────────

export type TestimonialRating = 'yes' | 'somewhat' | 'not_yet';

export const TESTIMONIAL_RATING_LABELS: Record<TestimonialRating, string> = {
  yes:      'Yes, it helped',
  somewhat: 'Somewhat',
  not_yet:  'Not yet',
};

export interface Testimonial {
  id: string;
  checkId: string;
  rating: TestimonialRating;
  text: string;
  createdAt: string;               // ISO 8601
}

// ─── Example starter ──────────────────────────────────────────────────────────

export interface ExampleStarter {
  id: string;
  label: string;
  icon: string;                    // lucide icon name string for display
  goal: string;
  prompt: string;
  aiOutput: string;
  platform: SourcePlatform;
  expectedFormat?: string;
  targetAudience?: string;
  painPoints: PainPoint[];
}

// ─── Use case type (for SMI Teams) ────────────────────────────────────────────

export type UseCaseType =
  | 'marketing'
  | 'support'
  | 'sales'
  | 'research'
  | 'operations'
  | 'product'
  | 'hr'
  | 'other';

export const USE_CASE_LABELS: Record<UseCaseType, string> = {
  marketing:  'Marketing',
  support:    'Customer Support',
  sales:      'Sales',
  research:   'Research',
  operations: 'Operations',
  product:    'Product',
  hr:         'HR',
  other:      'Other',
};

// ─── Team comparison ──────────────────────────────────────────────────────────

export type ClientReadinessVerdict = 'Approved' | 'Needs Refinement' | 'Not Ready';

export interface TeamComparisonResult {
  id: string;
  projectName: string;
  useCaseType?: UseCaseType;

  // Scores
  consistencyScore: number;          // 0–100: overall vocabulary + length overlap
  brandConsistencyScore: number;     // 0–100: voice/tone keyword match
  formatConsistencyScore: number;    // 0–100: structural pattern match
  actionabilityScore: number;        // 0–100: reused from reality check heuristic

  clientReadinessVerdict: ClientReadinessVerdict;
  driftExplanations: string[];
  correctionPrompt: string;
  recommendedRevisionPrompt: string;

  savedAt: string;
}
