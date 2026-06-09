// ─── SMI Morphological Continuity Engine Types ───────────────────────────────
// Deterministic, local-first engine contracts.
// No external AI model calls. No LLM-as-judge scoring.

import type { PainPoint, SourcePlatform } from './realityCheck';

export const SMI_ENGINE_VERSION = 'smi-morphology-v0.2-enterprise' as const;

export type SMIEngineVersion = typeof SMI_ENGINE_VERSION;

export type TrinaryDecision = '+1' | '0' | '-1';

export type RecommendationAction =
  | 'accept'
  | 'revise'
  | 'verify'
  | 'rerun'
  | 'reject';

export type DriftSeverity = 'low' | 'medium' | 'high';

export type ContinuityAnchorKind =
  | 'task'
  | 'deliverable'
  | 'audience'
  | 'format'
  | 'tone'
  | 'constraint'
  | 'source'
  | 'risk'
  | 'domain'
  | 'concept';

export type DriftReasonCode =
  | 'FORMAT_DRIFT'
  | 'AUDIENCE_DRIFT'
  | 'TASK_SUBSTITUTION'
  | 'GENERIC_OUTPUT'
  | 'MISSING_CONSTRAINT'
  | 'TONE_MISMATCH'
  | 'UNSUPPORTED_FACTUAL_CLAIM'
  | 'SOURCE_REQUIREMENT_MISSED'
  | 'SOURCE_CONTEXT_EROSION'
  | 'ACTIONABILITY_GAP'
  | 'BASELINE_DEVIATION'
  | 'CONTEXT_LOSS'
  | 'OVERBROAD_RESPONSE'
  | 'HIGH_DRIFT_PRESSURE'
  | 'LOW_SYMBOLIC_ALIGNMENT'
  | 'LOW_ECHO_WEIGHT'
  | 'LOW_CONFIDENCE'
  | 'NO_OUTPUT_PROVIDED';

export type SMIInputType = 'text' | 'json' | 'event' | 'log' | 'document' | 'batch' | 'stream';
export type SMIIngestionMode = 'single' | 'batch' | 'stream' | 'historical_replay' | 'api' | 'webhook';
export type SMISLAClass = 'interactive' | 'standard' | 'bulk' | 'regulated';

export interface SMIEngineInput {
  userGoal: string;
  originalPrompt: string;
  aiOutput: string;
  expectedFormat?: string;
  targetAudience?: string;
  baselineOutput?: string;
  improvedOutput?: string;
  sourcePlatform?: SourcePlatform;
  painPoints?: PainPoint[];
  inputType?: SMIInputType;
  ingestionMode?: SMIIngestionMode;
  slaClass?: SMISLAClass;
  metadata?: Record<string, string | number | boolean | undefined>;
}

export interface ContinuityAnchor {
  id: string;
  kind: ContinuityAnchorKind;
  label: string;
  source: 'goal' | 'prompt' | 'output' | 'baseline' | 'improved';
  weight: number; // 0–1
  presentInOutput: boolean;
  echoWeight: number; // 0–1 repeated-importance signal
}

export interface SymbolicSignature {
  task: string[];
  deliverables: string[];
  audience: string[];
  format: string[];
  tone: string[];
  constraints: string[];
  sourceRequirements: string[];
  riskMarkers: string[];
  domainTerms: string[];
  conceptTerms: string[];
  keyPhrases: string[];
  quotedPhrases: string[];
  structuralMarkers: string[];
  rawKeywordCount: number;
}

export interface EmotionalContinuityVector {
  polarity: number; // -1 to +1
  intensity: number; // 0–1
  toneMarkers: string[];
  metaphorDensity: number; // 0–1
  cadence: 'brief' | 'balanced' | 'dense';
}

export interface LCAIMemToken {
  id: string;
  symbol: string;
  kind: ContinuityAnchorKind;
  resonance: number; // 0–1
  decay: number; // 0–1, higher = more likely to revise/compost
  echoWeight: number; // 0–1
  trinaryState: TrinaryDecision;
}

export interface DriftFinding {
  code: DriftReasonCode;
  severity: DriftSeverity;
  message: string;
  evidence: string[];
  affectedAnchors: string[];
  confidence?: number;
}

export interface SMIScores {
  symbolicAlignment: number;
  morphologyAlignment: number;
  resonanceScore: number;
  echoWeightIndex: number;
  driftPressure: number;
  continuityAngle: number;
  entropyIndex: number;
  baselineAlignment: number;
  sourceIntegrity: number;
}

export interface SMIConfidenceProfile {
  confidenceScore: number;
  intervalLow: number;
  intervalHigh: number;
  basis: string[];
  evidenceCount: number;
  inputCompleteness: number;
}

export interface SMIResonanceSignature {
  sigilId: string;
  resonanceHash: string;
  patternHash: string;
  uniquenessScore: number;
  components: {
    anchorSequence: string[];
    echoVector: number[];
    toneVector: number[];
    trinarySequence: TrinaryDecision[];
  };
  note: string;
}

export interface SMIBaselineComparison {
  baselineProvided: boolean;
  baselineAlignment: number;
  preservedAnchors: string[];
  missingAnchors: string[];
  deviationReasonCodes: DriftReasonCode[];
}

export interface SMIImprovementComparison {
  improvedProvided: boolean;
  originalResonanceScore: number;
  improvedResonanceScore: number;
  resonanceDelta: number;
  originalDriftPressure: number;
  improvedDriftPressure: number;
  driftPressureDelta: number;
  improvedDecision: TrinaryDecision;
  improvedReasonCodes: DriftReasonCode[];
}

export interface SMIEnterpriseProfile {
  inputType: SMIInputType;
  ingestionMode: SMIIngestionMode;
  slaClass: SMISLAClass;
  estimatedRecordCount: number;
  processingPosture: 'interactive' | 'queued' | 'streaming' | 'batch';
  notes: string[];
}

export interface SMIRecommendation {
  action: RecommendationAction;
  trinaryDecision: TrinaryDecision;
  reason: string;
  nextBestPrompt: string;
}

export interface SMIAuditRecord {
  engineVersion: SMIEngineVersion;
  inputHash: string;
  canonicalInputHash: string;
  goalHash: string;
  promptHash: string;
  outputHash: string;
  baselineHash?: string;
  improvedHash?: string;
  resonanceSigilId: string;
  resonanceSignatureHash: string;
  evidenceChainHash: string;
  timestamp: string;
  reasonCodes: DriftReasonCode[];
  trinaryDecision: TrinaryDecision;
  inputType: SMIInputType;
  ingestionMode: SMIIngestionMode;
  slaClass: SMISLAClass;
}

export interface SMIEngineResult {
  engineVersion: SMIEngineVersion;
  intentSignature: SymbolicSignature;
  promptSignature: SymbolicSignature;
  outputSignature: SymbolicSignature;
  baselineSignature?: SymbolicSignature;
  improvedSignature?: SymbolicSignature;
  symbolicAnchors: ContinuityAnchor[];
  emotionalContinuityVector: EmotionalContinuityVector;
  lcaimemTokens: LCAIMemToken[];
  scores: SMIScores;
  driftFindings: DriftFinding[];
  reasonCodes: DriftReasonCode[];
  recommendation: SMIRecommendation;
  confidence: SMIConfidenceProfile;
  resonanceSignature: SMIResonanceSignature;
  baselineComparison: SMIBaselineComparison;
  improvementComparison: SMIImprovementComparison;
  enterpriseProfile: SMIEnterpriseProfile;
  auditRecord: SMIAuditRecord;
}
