// ─── Intent Signature Service ────────────────────────────────────────────────
// Converts text into deterministic symbolic feature groups with phrase extraction.

import type { SymbolicSignature } from '../../types/smiEngine';
import {
  contentKeywords,
  containsAny,
  extractNgrams,
  extractQuotedPhrases,
  extractStructuralMarkers,
  normalizeText,
  unique,
} from './textUtils';

const TASK_TERMS = [
  'write','draft','summarize','explain','compare','analyze','plan','debug','build',
  'research','rewrite','evaluate','review','create','generate','outline','design',
  'improve','fix','translate','classify','verify','cite','launch','propose',
  'score','assess','validate','audit','detect','recommend','convert','extract',
];

const DELIVERABLE_TERMS = [
  'email','summary','proposal','report','plan','script','post','article','blog',
  'resume','cover letter','code','app','table','checklist','sop','policy','brief',
  'deck','outline','roadmap','workflow','response','letter','contract','analysis',
  'scorecard','dashboard','architecture','test plan','user journey','case study',
];

const AUDIENCE_TERMS = [
  'student','teacher','professor','client','customer','founder','executive','board',
  'investor','manager','team','developer','designer','patient','doctor','lawyer',
  'non-technical','technical','reader','audience','buyer','user','support agent',
  'small business','enterprise','security team','governance team','researcher',
];

const FORMAT_TERMS = [
  'bullet','bullets','numbered','table','paragraph','markdown','json','csv','step',
  'steps','section','sections','outline','checklist','template','short','concise',
  'detailed','one-page','slide','email format','headings','headers','schema',
  'before and after','scorecard','matrix','diagram','timeline',
];

const TONE_TERMS = [
  'professional','friendly','warm','direct','formal','casual','empathetic','academic',
  'confident','clear','simple','persuasive','reassuring','urgent','calm','polished',
  'brand voice','human','honest','respectful','concise','premium','playful',
];

const SOURCE_TERMS = [
  'source','sources','citation','citations','cite','reference','references','link',
  'verify','verified','data','study','studies','research','statistics','evidence',
  'fact','facts','quote','url','paper','publication','provenance','trusted source',
  'source of truth','knowledge base','rag','retrieval',
];

const RISK_TERMS = [
  'medical','health','diagnosis','legal','law','financial','investment','tax',
  'security','cybersecurity','privacy','compliance','regulated','policy','safety',
  'mental health','therapy','emergency','clinical','contract','governance',
];

const CONSTRAINT_MARKERS = [
  'must','should','do not','don\'t','avoid','include','exclude','without','with',
  'keep','only','exactly','at least','no more than','under','over','preserve',
  'never','always','required','require','make sure','ensure',
];

function phraseMatches(text: string, phrases: string[]): string[] {
  return phrases.filter((term) => containsAny(text, [term]));
}

function extractConstraints(text: string): string[] {
  const normalized = normalizeText(text);
  const constraints: string[] = [];
  CONSTRAINT_MARKERS.forEach((marker) => {
    const idx = normalized.indexOf(marker);
    if (idx >= 0) {
      const slice = normalized.slice(idx, idx + 96).trim();
      constraints.push(slice);
    }
  });
  return constraints.slice(0, 12);
}

export function buildSymbolicSignature(text: string): SymbolicSignature {
  const keywords = contentKeywords(text);
  const terms = unique(keywords);
  const quotedPhrases = extractQuotedPhrases(text);
  const keyPhrases = unique([...quotedPhrases, ...extractNgrams(text, 2, 4)]).slice(0, 30);
  const structuralMarkers = extractStructuralMarkers(text);

  return {
    task: phraseMatches(text, TASK_TERMS),
    deliverables: phraseMatches(text, DELIVERABLE_TERMS),
    audience: phraseMatches(text, AUDIENCE_TERMS),
    format: unique([...phraseMatches(text, FORMAT_TERMS), ...structuralMarkers]),
    tone: phraseMatches(text, TONE_TERMS),
    constraints: extractConstraints(text),
    sourceRequirements: phraseMatches(text, SOURCE_TERMS),
    riskMarkers: phraseMatches(text, RISK_TERMS),
    domainTerms: terms.filter((term) => term.length > 6).slice(0, 18),
    conceptTerms: terms.slice(0, 28),
    keyPhrases,
    quotedPhrases,
    structuralMarkers,
    rawKeywordCount: terms.length,
  };
}

export function mergeSignatureTerms(signature: SymbolicSignature): string[] {
  return unique([
    ...signature.task,
    ...signature.deliverables,
    ...signature.audience,
    ...signature.format,
    ...signature.tone,
    ...signature.constraints,
    ...signature.sourceRequirements,
    ...signature.riskMarkers,
    ...signature.domainTerms,
    ...signature.conceptTerms,
    ...signature.keyPhrases,
    ...signature.quotedPhrases,
    ...signature.structuralMarkers,
  ]).map((term) => normalizeText(term));
}
