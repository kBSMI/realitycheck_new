// ─── Shared deterministic text utilities for the SMI engine ─────────────────

export const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','at','to','of','and','or','but','for','with',
  'this','that','i','my','your','we','you','as','be','by','do','has','have','its',
  'not','so','was','are','from','will','can','get','how','what','when','where',
  'which','who','would','could','should','then','than','into','out','up','if','no',
  'just','more','also','any','all','been','they','them','their','our','ours','me',
]);

export const INSTRUCTION_WORDS = new Set([
  'write','create','make','list','summarize','explain','describe','generate','provide',
  'give','show','tell','produce','help','draft','compose','include','ensure','format',
  'using','please','following','below','response','answer','output','revise','rewrite',
]);

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(text: string): string[] {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function contentKeywords(text: string): string[] {
  return tokenize(text).filter((word) => word.length > 3 && !INSTRUCTION_WORDS.has(word));
}

export function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function containsAny(text: string, needles: string[]): boolean {
  const normalized = normalizeText(text);
  return needles.some((needle) => normalized.includes(normalizeText(needle)));
}

export function overlapRatio(sourceTerms: string[], targetTerms: string[]): number {
  const source = unique(sourceTerms.map(normalizeText).filter(Boolean));
  const target = new Set(unique(targetTerms.map(normalizeText).filter(Boolean)));
  if (source.length === 0) return 0;
  return source.filter((term) => target.has(term)).length / source.length;
}

export function fuzzyOverlapRatio(sourceTerms: string[], targetTerms: string[]): number {
  const source = unique(sourceTerms.map(normalizeText).filter((term) => term.length > 2));
  const target = unique(targetTerms.map(normalizeText).filter((term) => term.length > 2));
  if (source.length === 0) return 0;
  const matches = source.filter((term) => target.some((candidate) => candidate.includes(term) || term.includes(candidate)));
  return matches.length / source.length;
}

export function jaccardSimilarity(a: string[], b: string[]): number {
  const left = new Set(unique(a.map(normalizeText)));
  const right = new Set(unique(b.map(normalizeText)));
  const union = new Set([...left, ...right]);
  if (union.size === 0) return 0;
  let intersection = 0;
  left.forEach((term) => {
    if (right.has(term)) intersection += 1;
  });
  return intersection / union.size;
}

export function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function extractQuotedPhrases(text: string): string[] {
  const matches = [...text.matchAll(/["“”']([^"“”']{3,80})["“”']/g)].map((match) => normalizeText(match[1]));
  return unique(matches).slice(0, 12);
}

export function extractNgrams(text: string, min = 2, max = 4): string[] {
  const words = contentKeywords(text);
  const phrases: string[] = [];
  for (let size = min; size <= max; size += 1) {
    for (let index = 0; index <= words.length - size; index += 1) {
      phrases.push(words.slice(index, index + size).join(' '));
    }
  }
  return unique(phrases)
    .filter((phrase) => phrase.length > 7 && phrase.length < 64)
    .slice(0, 30);
}

export function extractStructuralMarkers(text: string): string[] {
  const markers: string[] = [];
  if (/^\s*[-*•]\s+/m.test(text)) markers.push('bullet-list');
  if (/^\s*\d+[.)]\s+/m.test(text)) markers.push('numbered-list');
  if (/\|.+\|/.test(text)) markers.push('table');
  if (/#{1,4}\s+/.test(text)) markers.push('markdown-headings');
  if (/```/.test(text)) markers.push('code-block');
  if (/\bweek\s+\d|day\s+\d|phase\s+\d/i.test(text)) markers.push('phased-plan');
  if (/\bexecutive summary\b/i.test(text)) markers.push('executive-summary');
  return unique(markers);
}
