// ─── AI Reality Check Scoring Service ────────────────────────────────────────
// Fully deterministic. No external API calls. No random values.
// All dimensions scored via transparent heuristics on the provided text.

import type {
  RealityCheckInput,
  RealityCheckResult,
  RealityCheckGrade,
  RealityCheckVerdict,
  PainPoint,
  TeamComparisonResult,
  UseCaseType,
  ClientReadinessVerdict,
  ImprovementCheckResult,
} from '../types/realityCheck';
import { runSMIMorphologicalContinuityEngine } from './smiEngine/morphologyEngine';

// ─── Shared text utilities ────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','at','to','of','and','or','but','for',
  'with','this','that','i','my','your','we','you','as','be','by','do','has',
  'have','its','not','so','was','are','from','will','can','get','how','what',
  'when','where','which','who','would','could','should','then','than','into',
  'out','up','if','no','just','more','also','any','all','been',
]);

// Instruction and format meta-words that appear in prompts/goals but never in outputs
const INSTRUCTION_WORDS = new Set([
  'write', 'create', 'make', 'list', 'summarize', 'explain', 'describe',
  'generate', 'provide', 'give', 'show', 'tell', 'produce', 'help', 'draft',
  'compose', 'include', 'ensure', 'format', 'using', 'concise', 'brief',
  'detailed', 'please', 'style', 'tone', 'manner', 'following', 'below',
  'summary', 'overview', 'outline', 'review', 'analysis', 'report',
]);

function keywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w) && !INSTRUCTION_WORDS.has(w));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(needles: string[], haystack: string): number {
  const h = haystack.toLowerCase();
  return needles.filter((n) => h.includes(n)).length;
}

// ─── 1. Intent Match ──────────────────────────────────────────────────────────
// Measures how well the output satisfies the stated user goal.

function scoreIntentMatch(input: RealityCheckInput): number {
  // Use only goal domain keywords — outputs respond to goals, not echo meta-instructions
  const goalWords = keywords(input.userGoal);
  if (goalWords.length === 0) return 0;

  const matched = countMatches(goalWords, input.aiOutput);
  let score = Math.round((matched / goalWords.length) * 100);

  // Pain-point penalties
  if (input.painPoints.includes('missed_intent'))  score = Math.max(0, score - 25);
  if (input.painPoints.includes('forgot_context')) score = Math.max(0, score - 10);

  return Math.min(100, score);
}

// ─── 2. Continuity ────────────────────────────────────────────────────────────
// Checks whether the output honours format, audience, and prompt constraints.

function scoreContinuity(input: RealityCheckInput): number {
  let score = 70; // baseline — assume reasonable continuity

  // Check format alignment
  if (input.expectedFormat) {
    const fmtWords = keywords(input.expectedFormat);
    const fmtMatch = countMatches(fmtWords, input.aiOutput);
    const fmtRatio = fmtWords.length > 0 ? fmtMatch / fmtWords.length : 0;
    if (fmtRatio < 0.3) score -= 15;
    else if (fmtRatio > 0.6) score += 10;
  }

  // Check audience alignment
  if (input.targetAudience) {
    const audWords = keywords(input.targetAudience);
    const audMatch = countMatches(audWords, input.aiOutput);
    const audRatio = audWords.length > 0 ? audMatch / audWords.length : 0;
    if (audRatio < 0.2) score -= 10;
    else if (audRatio > 0.5) score += 8;
  }

  // Check that prompt constraints appear in output
  const promptWords = keywords(input.originalPrompt);
  if (promptWords.length > 0) {
    const promptMatch = countMatches(promptWords, input.aiOutput);
    const promptRatio = promptMatch / promptWords.length;
    if (promptRatio < 0.25) score -= 12;
    else if (promptRatio > 0.6) score += 8;
  }

  // Pain-point penalties
  if (input.painPoints.includes('forgot_context'))    score -= 15;
  if (input.painPoints.includes('changed_structure')) score -= 15;
  if (input.painPoints.includes('wrong_tone'))        score -= 10;

  return Math.max(0, Math.min(100, score));
}

// ─── 3. Specificity ───────────────────────────────────────────────────────────
// Rewards concrete language; penalises vague filler.

const GENERIC_PHRASES = [
  'various', 'some things', 'many ways', 'generally', 'typically', 'often',
  'usually', 'etc.', 'and so on', 'in general', 'broadly', 'somewhat',
  'kind of', 'sort of', 'a number of', 'certain', 'several factors',
];

const CONCRETE_PATTERNS = [
  /\d+%/g,
  /\b\d{4}\b/g,
  /"\w[^"]+"/g,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g,
  /\bstep\s+\d/gi,
];

function scoreSpecificity(input: RealityCheckInput): number {
  const out = input.aiOutput.toLowerCase();
  const genericCount = GENERIC_PHRASES.filter((p) => out.includes(p)).length;
  const concreteCount = CONCRETE_PATTERNS.reduce(
    (acc, re) => acc + (input.aiOutput.match(re)?.length ?? 0), 0
  );

  let score = 60 + concreteCount * 5 - genericCount * 10;

  if (input.painPoints.includes('too_generic'))  score -= 20;
  if (input.painPoints.includes('too_shallow'))  score -= 15;

  return Math.max(0, Math.min(100, score));
}

// ─── 4. Actionability ────────────────────────────────────────────────────────
// Rewards structured, step-based, executable output.

const ACTION_VERBS = [
  'use ', 'add ', 'create ', 'remove ', 'update ', 'run ', 'apply ',
  'check ', 'review ', 'confirm ', 'deploy ', 'set ', 'configure ',
  'install ', 'write ', 'define ', 'test ', 'verify ',
];

function scoreActionability(input: RealityCheckInput): number {
  const out  = input.aiOutput;
  const lout = out.toLowerCase();

  const bulletLines  = (out.match(/^\s*[-*•]\s+/gm) ?? []).length;
  const numberedLines = (out.match(/^\s*\d+[.)]\s+/gm) ?? []).length;
  const actionVerbCount = ACTION_VERBS.filter((v) => lout.includes(v)).length;
  const wc = wordCount(out);

  let score = 40;
  score += bulletLines * 5;
  score += numberedLines * 6;
  score += actionVerbCount * 4;
  if (wc > 80) score += 10;
  if (wc > 200) score += 5;

  if (input.painPoints.includes('not_actionable')) score -= 20;
  if (input.painPoints.includes('too_long'))       score -= 8;

  return Math.max(0, Math.min(100, score));
}

// ─── 5. Truth Risk ────────────────────────────────────────────────────────────
// Higher score = higher risk.

const ABSOLUTE_TERMS = [
  'always', 'never', 'all ', 'every ', '100%', 'proven', 'guaranteed',
  'definitively', 'certainly', 'impossible', 'undoubtedly', 'fact:',
  'research shows', 'studies show', 'experts say', 'it is known',
];

function scoreTruthRisk(input: RealityCheckInput): number {
  const lout = input.aiOutput.toLowerCase();
  const absoluteCount = ABSOLUTE_TERMS.filter((t) => lout.includes(t)).length;

  let risk = absoluteCount * 12;

  const hasCitationMarkers = /\[\d+\]|\bhttps?:\/\/|source:|reference:/i.test(input.aiOutput);
  const looksFactual = /according to|research|study|data shows|statistics/i.test(lout);
  if (looksFactual && !hasCitationMarkers) risk += 15;

  if (input.painPoints.includes('hallucination_risk'))  risk += 25;
  if (input.painPoints.includes('source_trust_issue'))  risk += 20;

  return Math.max(0, Math.min(100, risk));
}

// ─── 6. Wasted Prompting Risk ─────────────────────────────────────────────────

const WASTE_PAIN_POINTS: PainPoint[] = [
  'missed_intent', 'too_generic', 'forgot_context', 'changed_structure',
];

function scoreWastedPromptingRisk(
  intentMatch: number,
  continuity: number,
  specificity: number,
  actionability: number,
  painPoints: PainPoint[]
): number {
  let risk = 0;

  if (intentMatch   < 60) risk += 25;
  if (continuity    < 60) risk += 20;
  if (specificity   < 60) risk += 15;
  if (actionability < 60) risk += 10;

  const painPenalty = painPoints.filter((p) => WASTE_PAIN_POINTS.includes(p)).length * 10;
  risk += painPenalty;

  return Math.max(0, Math.min(100, risk));
}

// ─── Grade + Verdict ──────────────────────────────────────────────────────────

function toGrade(score: number): RealityCheckGrade {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

function toVerdict(score: number): RealityCheckVerdict {
  if (score >= 85) return 'Fresh Output';
  if (score >= 70) return 'Useful but Drifting';
  if (score >= 50) return 'Needs a Rewrite';
  return 'Rotten Output';
}

// ─── Narrative generation ─────────────────────────────────────────────────────

function buildWhatDrifted(
  intentMatch: number,
  continuity: number,
  specificity: number,
  actionability: number,
  truthRisk: number,
  painPoints: PainPoint[]
): string[] {
  const items: string[] = [];
  if (intentMatch   < 70) items.push(`Intent match low (${intentMatch}/100) — goal keywords underrepresented in output.`);
  if (continuity    < 70) items.push(`Continuity gap (${continuity}/100) — format, audience, or prompt constraints not honoured.`);
  if (specificity   < 70) items.push(`Low specificity (${specificity}/100) — output relies on generic language.`);
  if (actionability < 70) items.push(`Actionability gap (${actionability}/100) — missing steps, bullets, or concrete next actions.`);
  if (truthRisk     > 40) items.push(`Truth risk elevated (${truthRisk}/100) — absolute language or unsupported claims detected.`);
  if (painPoints.includes('forgot_context'))    items.push('Prior context not carried forward.');
  if (painPoints.includes('wrong_tone'))        items.push('Tone does not match the intended audience.');
  if (painPoints.includes('changed_structure')) items.push('Output structure differs from the requested format.');
  return items.length > 0 ? items : ['No significant drift detected.'];
}

function buildWhyItMatters(
  intentMatch: number,
  truthRisk: number,
  wastedRisk: number
): string {
  if (truthRisk > 60) return 'Unsupported claims or absolute language can erode trust and lead to decisions based on incorrect information.';
  if (wastedRisk > 60) return 'A high waste risk means each failed prompt costs time without improving output quality. Structural correction is more effective than reprompting.';
  if (intentMatch < 50) return 'When the output misses your stated goal, reprompting without changing the approach rarely helps. Address the intent gap directly.';
  return 'Minor drift means the output is usable but could be tightened with a targeted follow-up prompt.';
}

function buildNextBestPrompt(
  input: RealityCheckInput,
  intentMatch: number,
  continuity: number,
  specificity: number,
  actionability: number,
  truthRisk: number
): string {
  const parts: string[] = [];

  if (intentMatch < 60) {
    parts.push(`My goal is: "${input.userGoal.trim()}". Please confirm you understood this before responding.`);
  }
  if (specificity < 60) {
    parts.push('Be specific: include exact names, numbers, formats, and examples — avoid vague language.');
  }
  if (actionability < 60) {
    parts.push('Structure your response as numbered steps, each with a concrete action I can take immediately.');
  }
  if (continuity < 60) {
    if (input.expectedFormat) parts.push(`Format the response as: ${input.expectedFormat}.`);
    if (input.targetAudience) parts.push(`Write for: ${input.targetAudience}.`);
  }
  if (truthRisk > 50) {
    parts.push('If you make factual claims, cite a source or explicitly flag what you cannot verify.');
  }
  if (parts.length === 0) {
    parts.push('Refine your response by adding one concrete example and removing any vague qualifiers.');
  }

  return parts.join(' ');
}

function buildRecommendedAction(
  grade: RealityCheckGrade,
  intentMatch: number,
  truthRisk: number
): string {
  if (grade === 'A') return 'Output is high quality. Use it directly or lightly edit for your specific context.';
  if (grade === 'B') return 'Useful output with minor gaps. Apply the next-best prompt to tighten intent and specificity.';
  if (grade === 'C') {
    if (truthRisk > 50) return 'Verify all factual claims before using. Request citations or cross-check with a second source.';
    if (intentMatch < 60) return 'Restate your goal explicitly and provide a concrete example of the output you need.';
    return 'Use the suggested prompt to correct the identified gaps before incorporating this output.';
  }
  if (grade === 'D') return 'Significant rework needed. Consider starting with a more constrained prompt that defines format, audience, and goal in the first sentence.';
  return 'Output does not meet the stated goal. Start over with a restructured prompt that specifies format, audience, constraints, and goal in explicit terms.';
}

// Deterministic: lowest-scoring positive dimension still below 65
export function buildWhatToFixFirst(
  intentMatch: number,
  continuity: number,
  specificity: number,
  actionability: number
): string {
  const dims = [
    { name: 'intent match', score: intentMatch,   tip: 'Restate your goal in the first sentence of your prompt.' },
    { name: 'continuity',   score: continuity,     tip: 'Explicitly repeat the requested format, audience, and key constraints.' },
    { name: 'specificity',  score: specificity,    tip: 'Replace vague qualifiers with exact numbers, names, and examples.' },
    { name: 'actionability',score: actionability,  tip: 'Ask for numbered steps ending with a concrete next action.' },
  ];
  const worst = dims.filter((d) => d.score < 65).sort((a, b) => a.score - b.score)[0];
  if (!worst) return 'All dimensions are above threshold — minor tuning only.';
  return `Fix ${worst.name} first (${worst.score}/100): ${worst.tip}`;
}

// Deterministic expected improvement text
export function buildExpectedImprovement(
  intentMatch: number,
  continuity: number,
  specificity: number,
  actionability: number
): string {
  const dims = [
    { name: 'specificity',   score: specificity },
    { name: 'continuity',    score: continuity },
    { name: 'actionability', score: actionability },
    { name: 'intent match',  score: intentMatch },
  ].filter((d) => d.score < 70).sort((a, b) => a.score - b.score);

  if (dims.length === 0) return 'Applying the correction prompt should add polish to an already solid output.';
  const names = dims.slice(0, 2).map((d) => d.name).join(' and ');
  return `Applying the correction prompt should improve ${names} and reduce wasted reprompting risk by restoring the original format, audience, and deliverable constraints.`;
}

// ─── Deterministic ID ─────────────────────────────────────────────────────────

let _idCounter = 0;

function nextCheckId(): string {
  return `rc-${Date.now()}-${String(++_idCounter).padStart(4, '0')}`;
}

export function _resetIdCounter(): void {
  _idCounter = 0;
}

// ─── Main scoreRealityCheck export ───────────────────────────────────────────

export function scoreRealityCheck(input: RealityCheckInput): RealityCheckResult {
  if (!input.aiOutput || input.aiOutput.trim().length === 0) {
    return {
      id: nextCheckId(),
      input,
      grade: 'F',
      overallScore: 0,
      verdict: 'Rotten Output',
      intentMatch: 0,
      continuity: 0,
      specificity: 0,
      actionability: 0,
      truthRisk: 0,
      wastedPromptingRisk: 100,
      whatDrifted: ['No AI output provided — nothing to evaluate.'],
      whyItMatters: 'Without output, no reality check can be performed. Paste the AI response to continue.',
      nextBestPrompt: input.userGoal.trim()
        ? `State your goal directly: "${input.userGoal.trim()}" — then submit your prompt to your AI platform and paste the result here.`
        : 'Describe your goal clearly, run your prompt, and paste the AI output to get a Reality Check.',
      recommendedAction: 'Provide AI output to proceed.',
      smiEngineResult: runSMIMorphologicalContinuityEngine({
        userGoal: input.userGoal,
        originalPrompt: input.originalPrompt,
        aiOutput: input.aiOutput,
        expectedFormat: input.expectedFormat,
        targetAudience: input.targetAudience,
        sourcePlatform: input.sourcePlatform,
        painPoints: input.painPoints,
      }),
      savedAt: new Date().toISOString(),
    };
  }

  const intentMatch   = scoreIntentMatch(input);
  const continuity    = scoreContinuity(input);
  const specificity   = scoreSpecificity(input);
  const actionability = scoreActionability(input);
  const truthRisk     = scoreTruthRisk(input);
  const wastedPromptingRisk = scoreWastedPromptingRisk(
    intentMatch, continuity, specificity, actionability, input.painPoints
  );

  const raw =
    intentMatch   * 0.30 +
    continuity    * 0.20 +
    specificity   * 0.20 +
    actionability * 0.20 -
    truthRisk     * 0.10;

  const overallScore = Math.max(0, Math.min(100, Math.round(raw)));
  const grade   = toGrade(overallScore);
  const verdict = toVerdict(overallScore);

  const whatDrifted       = buildWhatDrifted(intentMatch, continuity, specificity, actionability, truthRisk, input.painPoints);
  const whyItMatters      = buildWhyItMatters(intentMatch, truthRisk, wastedPromptingRisk);
  const nextBestPrompt    = buildNextBestPrompt(input, intentMatch, continuity, specificity, actionability, truthRisk);
  const recommendedAction = buildRecommendedAction(grade, intentMatch, truthRisk);
  const smiEngineResult = runSMIMorphologicalContinuityEngine({
    userGoal: input.userGoal,
    originalPrompt: input.originalPrompt,
    aiOutput: input.aiOutput,
    expectedFormat: input.expectedFormat,
    targetAudience: input.targetAudience,
    sourcePlatform: input.sourcePlatform,
    painPoints: input.painPoints,
  });

  return {
    id: nextCheckId(),
    input,
    grade,
    overallScore,
    verdict,
    intentMatch,
    continuity,
    specificity,
    actionability,
    truthRisk,
    wastedPromptingRisk,
    whatDrifted,
    whyItMatters,
    nextBestPrompt,
    recommendedAction,
    smiEngineResult,
    savedAt: new Date().toISOString(),
  };
}

// ─── Improvement check ────────────────────────────────────────────────────────

let _improvIdCounter = 0;

export function scoreImprovementCheck(
  original: RealityCheckResult,
  improvedOutput: string
): ImprovementCheckResult {
  const improvedInput: RealityCheckInput = { ...original.input, aiOutput: improvedOutput };

  // Re-score all dimensions on improved output (no pain points for fair comparison)
  const cleanInput: RealityCheckInput = { ...improvedInput, painPoints: [] };
  const newIntentMatch   = improvedOutput.trim() ? scoreIntentMatch(cleanInput)   : 0;
  const newContinuity    = improvedOutput.trim() ? scoreContinuity(cleanInput)    : 0;
  const newSpecificity   = improvedOutput.trim() ? scoreSpecificity(cleanInput)   : 0;
  const newActionability = improvedOutput.trim() ? scoreActionability(cleanInput) : 0;
  const newTruthRisk     = improvedOutput.trim() ? scoreTruthRisk(cleanInput)     : 0;

  const newRaw =
    newIntentMatch   * 0.30 +
    newContinuity    * 0.20 +
    newSpecificity   * 0.20 +
    newActionability * 0.20 -
    newTruthRisk     * 0.10;

  const improvedScore = Math.max(0, Math.min(100, Math.round(newRaw)));
  const originalScore = original.overallScore;
  const scoreDelta    = improvedScore - originalScore;

  // Dimension deltas
  const intentMatchDelta   = newIntentMatch   - original.intentMatch;
  const continuityDelta    = newContinuity    - original.continuity;
  const specificityDelta   = newSpecificity   - original.specificity;
  const actionabilityDelta = newActionability - original.actionability;
  const truthRiskDelta     = newTruthRisk     - original.truthRisk; // negative = better

  // Improved categories: dimensions that improved by >= 5 pts (or truth risk dropped by >= 5)
  const THRESHOLD = 5;
  const improvedCategories: string[] = [];
  if (intentMatchDelta   >= THRESHOLD) improvedCategories.push('Intent Match');
  if (continuityDelta    >= THRESHOLD) improvedCategories.push('Continuity');
  if (specificityDelta   >= THRESHOLD) improvedCategories.push('Specificity');
  if (actionabilityDelta >= THRESHOLD) improvedCategories.push('Actionability');
  if (truthRiskDelta     <= -THRESHOLD) improvedCategories.push('Truth Risk (reduced)');

  // Remaining drift: dimensions still below 65
  const remainingDrift: string[] = [];
  if (newIntentMatch   < 65) remainingDrift.push(`Intent Match: ${newIntentMatch}/100`);
  if (newContinuity    < 65) remainingDrift.push(`Continuity: ${newContinuity}/100`);
  if (newSpecificity   < 65) remainingDrift.push(`Specificity: ${newSpecificity}/100`);
  if (newActionability < 65) remainingDrift.push(`Actionability: ${newActionability}/100`);
  if (newTruthRisk     > 50) remainingDrift.push(`Truth Risk elevated: ${newTruthRisk}/100`);

  // Summary message
  const deltaStr = scoreDelta >= 0 ? `+${scoreDelta}` : String(scoreDelta);
  let summaryMessage: string;
  if (scoreDelta > 15) {
    summaryMessage = `Your score improved from ${originalScore} to ${improvedScore} (${deltaStr}). The revised output is significantly closer to your stated goal.`;
  } else if (scoreDelta > 5) {
    summaryMessage = `Your score improved from ${originalScore} to ${improvedScore} (${deltaStr}). Good progress — a few dimensions still have room to tighten.`;
  } else if (scoreDelta > 0) {
    summaryMessage = `Your score improved slightly from ${originalScore} to ${improvedScore} (${deltaStr}). Consider applying the correction prompt again to address remaining drift.`;
  } else if (scoreDelta === 0) {
    summaryMessage = `Your score is unchanged at ${originalScore}. The revised output is similar in quality to the original — try a more targeted correction prompt.`;
  } else {
    summaryMessage = `Your score decreased from ${originalScore} to ${improvedScore} (${deltaStr}). The revised output may have introduced new drift. Review the flagged dimensions.`;
  }

  // Testimonial prompt
  const testimonialPrompt = scoreDelta > 0
    ? `You improved your score by ${deltaStr} points. Did AI Reality Check help you get closer to what you wanted?`
    : 'You ran an improvement check. Did AI Reality Check help clarify what to fix?';

  return {
    id: `ri-${Date.now()}-${String(++_improvIdCounter).padStart(4, '0')}`,
    originalCheckId: original.id,
    improvedOutput,
    originalScore,
    improvedScore,
    scoreDelta,
    intentMatchDelta,
    continuityDelta,
    specificityDelta,
    actionabilityDelta,
    truthRiskDelta,
    improvedCategories,
    remainingDrift,
    testimonialPrompt,
    summaryMessage,
    savedAt: new Date().toISOString(),
  };
}

// ─── Team comparison (extended) ───────────────────────────────────────────────

let _teamIdCounter = 0;

// Brand/voice keywords indicate consistent brand language
const BRAND_VOICE_MARKERS = [
  'we ', 'our ', 'you ', 'your ', 'partner', 'trust', 'solution', 'value',
  'commit', 'deliver', 'ensure', 'support', 'team', 'expert', 'custom',
];

export function scoreTeamConsistency(
  projectName: string,
  baselineOutput: string,
  newOutput: string,
  useCaseType?: UseCaseType
): TeamComparisonResult {
  const baselineWords = keywords(baselineOutput);
  const newWords      = keywords(newOutput);

  // Overall consistency: vocabulary overlap + length similarity
  const matched      = baselineWords.filter((w) => newWords.includes(w)).length;
  const total        = Math.max(baselineWords.length, 1);
  const overlapRatio = matched / total;
  const bLen = wordCount(baselineOutput);
  const nLen = wordCount(newOutput);
  const lenRatio = bLen > 0 ? Math.min(nLen, bLen) / Math.max(nLen, bLen) : 0;
  const consistencyScore = Math.round((overlapRatio * 0.7 + lenRatio * 0.3) * 100);

  // Brand consistency: how many brand/voice markers appear in both
  const bBrandCount = BRAND_VOICE_MARKERS.filter((m) => baselineOutput.toLowerCase().includes(m)).length;
  const nBrandCount = BRAND_VOICE_MARKERS.filter((m) => newOutput.toLowerCase().includes(m)).length;
  const brandOverlap = Math.min(bBrandCount, nBrandCount) / Math.max(bBrandCount, nBrandCount, 1);
  const brandConsistencyScore = Math.round(brandOverlap * 100);

  // Format consistency: structural pattern matching (bullets, numbered lists, headers)
  const bBullets  = (baselineOutput.match(/^\s*[-*•]\s+/gm) ?? []).length;
  const nBullets  = (newOutput.match(/^\s*[-*•]\s+/gm) ?? []).length;
  const bNumbers  = (baselineOutput.match(/^\s*\d+[.)]\s+/gm) ?? []).length;
  const nNumbers  = (newOutput.match(/^\s*\d+[.)]\s+/gm) ?? []).length;
  const bHeaders  = (baselineOutput.match(/^#{1,3}\s+/gm) ?? []).length;
  const nHeaders  = (newOutput.match(/^#{1,3}\s+/gm) ?? []).length;
  const structureSim =
    (Math.min(bBullets, nBullets) + Math.min(bNumbers, nNumbers) + Math.min(bHeaders, nHeaders)) /
    Math.max(bBullets + bNumbers + bHeaders, nBullets + nNumbers + nHeaders, 1);
  const formatConsistencyScore = Math.min(100, Math.round(structureSim * 100 + lenRatio * 30));

  // Actionability (reuse heuristic on new output)
  const actionInput: RealityCheckInput = {
    userGoal: projectName,
    originalPrompt: baselineOutput.slice(0, 200),
    aiOutput: newOutput,
    sourcePlatform: 'Other',
    painPoints: [],
  };
  const actionabilityScore = scoreActionability(actionInput);

  // Client readiness verdict
  const avgScore = (consistencyScore + brandConsistencyScore + formatConsistencyScore) / 3;
  const clientReadinessVerdict: ClientReadinessVerdict =
    avgScore >= 70 ? 'Approved' :
    avgScore >= 50 ? 'Needs Refinement' :
    'Not Ready';

  // Drift explanations
  const driftExplanations: string[] = [];
  if (overlapRatio < 0.4)  driftExplanations.push('Vocabulary overlap is low — the new output uses different terminology than the baseline.');
  if (lenRatio < 0.5)      driftExplanations.push('Output length differs significantly from the baseline — structure may have changed.');
  if (brandConsistencyScore < 50) driftExplanations.push('Brand voice markers are inconsistent — tone or framing has shifted.');
  if (formatConsistencyScore < 50) driftExplanations.push('Structural formatting differs from the baseline — bullet/number patterns have changed.');
  if (overlapRatio >= 0.7 && lenRatio >= 0.7) driftExplanations.push('Output is highly consistent with the baseline.');
  if (driftExplanations.length === 0) driftExplanations.push('Moderate consistency with baseline — minor vocabulary and length differences detected.');

  const correctionPrompt = consistencyScore < 60
    ? `Your baseline used this language: "${baselineWords.slice(0, 5).join(', ')}". Rewrite to match that framing, length, and structure.`
    : 'The output is broadly consistent with the baseline. Spot-check for tone and structure alignment before using.';

  const recommendedRevisionPrompt = clientReadinessVerdict === 'Not Ready'
    ? `Rewrite this output to match the baseline structure and vocabulary. Key missing terms: ${baselineWords.filter((w) => !newWords.includes(w)).slice(0, 4).join(', ')}.`
    : clientReadinessVerdict === 'Needs Refinement'
    ? 'Review tone, structure, and key terminology against the baseline before sending to the client.'
    : 'Output meets the baseline standard. A light review before client delivery is sufficient.';

  return {
    id: `tc-${Date.now()}-${String(++_teamIdCounter).padStart(4, '0')}`,
    projectName,
    useCaseType,
    consistencyScore:     Math.max(0, Math.min(100, consistencyScore)),
    brandConsistencyScore: Math.max(0, Math.min(100, brandConsistencyScore)),
    formatConsistencyScore: Math.max(0, Math.min(100, formatConsistencyScore)),
    actionabilityScore,
    clientReadinessVerdict,
    driftExplanations,
    correctionPrompt,
    recommendedRevisionPrompt,
    savedAt: new Date().toISOString(),
  };
}

// ─── Export helper for tests (dry-run JSON shape) ─────────────────────────────

export function buildExportJSON(
  result: RealityCheckResult,
  improvement?: ImprovementCheckResult
): string {
  const payload = {
    export_type: 'ai_reality_check',
    generated_at: new Date().toISOString(),
    grade: result.grade,
    overallScore: result.overallScore,
    verdict: result.verdict,
    userGoal: result.input.userGoal,
    sourcePlatform: result.input.sourcePlatform,
    scores: {
      intentMatch:       result.intentMatch,
      continuity:        result.continuity,
      specificity:       result.specificity,
      actionability:     result.actionability,
      truthRisk:         result.truthRisk,
      wastedPromptingRisk: result.wastedPromptingRisk,
    },
    whatDrifted:      result.whatDrifted,
    nextBestPrompt:   result.nextBestPrompt,
    recommendedAction: result.recommendedAction,
    ...(result.smiEngineResult ? {
      smi_engine: {
        version: result.smiEngineResult.engineVersion,
        trinaryDecision: result.smiEngineResult.recommendation.trinaryDecision,
        recommendationAction: result.smiEngineResult.recommendation.action,
        reasonCodes: result.smiEngineResult.reasonCodes,
        scores: result.smiEngineResult.scores,
        audit: result.smiEngineResult.auditRecord,
      },
    } : {}),
    ...(improvement ? {
      improvement: {
        originalScore:  improvement.originalScore,
        improvedScore:  improvement.improvedScore,
        scoreDelta:     improvement.scoreDelta,
        improvedCategories: improvement.improvedCategories,
        remainingDrift: improvement.remainingDrift,
      },
    } : {}),
    privacy_note: 'AI Reality Check only reviews content you provide. This MVP does not connect to or pull private sessions from ChatGPT, Claude, Gemini, Copilot, or other AI platforms.',
    scoring_note: 'Scores are guidance for improving AI usage, not a guarantee of factual accuracy or professional advice.',
  };
  return JSON.stringify(payload, null, 2);
}
