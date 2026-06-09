// ─── Enterprise Input Adapter Service ────────────────────────────────────────
// Adds batch/stream/API-shaped processing boundaries without external services.

import type {
  SMIEngineInput,
  SMIEngineResult,
  SMIEnterpriseProfile,
  SMIIngestionMode,
  SMIInputType,
  SMISLAClass,
} from '../../types/smiEngine';
import { runSMIMorphologicalContinuityEngine } from './morphologyEngine';

export interface SMIEnterpriseEnvelope {
  id: string;
  input: SMIEngineInput;
  inputType?: SMIInputType;
  ingestionMode?: SMIIngestionMode;
  slaClass?: SMISLAClass;
  receivedAt?: string;
}

export interface SMIEnterpriseBatchResult {
  batchId: string;
  processedAt: string;
  recordCount: number;
  results: Array<{ id: string; result: SMIEngineResult }>;
  summary: {
    averageResonance: number;
    averageDriftPressure: number;
    highRiskCount: number;
    rerunCount: number;
  };
}

export function buildEnterpriseProfile(params: {
  inputType?: SMIInputType;
  ingestionMode?: SMIIngestionMode;
  slaClass?: SMISLAClass;
  estimatedRecordCount?: number;
}): SMIEnterpriseProfile {
  const inputType = params.inputType ?? 'text';
  const ingestionMode = params.ingestionMode ?? 'single';
  const slaClass = params.slaClass ?? 'interactive';
  const estimatedRecordCount = params.estimatedRecordCount ?? 1;
  const processingPosture = ingestionMode === 'stream'
    ? 'streaming'
    : ingestionMode === 'batch' || estimatedRecordCount > 1000
      ? 'batch'
      : slaClass === 'bulk'
        ? 'queued'
        : 'interactive';

  const notes = [
    'Deterministic morphology engine; no external AI scoring calls.',
    'Production SLA depends on backend queue, storage, and worker deployment.',
  ];
  if (processingPosture === 'streaming') notes.push('Stream mode should use windowed scoring and persisted offsets.');
  if (processingPosture === 'batch') notes.push('Batch mode should use chunking, retry handling, and audit-ledger persistence.');
  if (slaClass === 'regulated') notes.push('Regulated mode should preserve canonical input hashes, engine version, and audit evidence chain.');

  return { inputType, ingestionMode, slaClass, estimatedRecordCount, processingPosture, notes };
}

export function processEnterpriseBatch(envelopes: SMIEnterpriseEnvelope[], batchId = `batch-${Date.now()}`): SMIEnterpriseBatchResult {
  const results = envelopes.map((envelope) => ({
    id: envelope.id,
    result: runSMIMorphologicalContinuityEngine({
      ...envelope.input,
      inputType: envelope.inputType ?? envelope.input.inputType ?? 'batch',
      ingestionMode: envelope.ingestionMode ?? envelope.input.ingestionMode ?? 'batch',
      slaClass: envelope.slaClass ?? envelope.input.slaClass ?? 'bulk',
    }),
  }));
  const recordCount = results.length;
  const averageResonance = recordCount
    ? Math.round(results.reduce((sum, item) => sum + item.result.scores.resonanceScore, 0) / recordCount)
    : 0;
  const averageDriftPressure = recordCount
    ? Math.round(results.reduce((sum, item) => sum + item.result.scores.driftPressure, 0) / recordCount)
    : 0;
  const highRiskCount = results.filter((item) => item.result.driftFindings.some((finding) => finding.severity === 'high')).length;
  const rerunCount = results.filter((item) => item.result.recommendation.trinaryDecision === '-1').length;

  return {
    batchId,
    processedAt: new Date().toISOString(),
    recordCount,
    results,
    summary: { averageResonance, averageDriftPressure, highRiskCount, rerunCount },
  };
}

export function createStreamAccumulator() {
  const envelopes: SMIEnterpriseEnvelope[] = [];
  return {
    push(envelope: SMIEnterpriseEnvelope) {
      envelopes.push({ ...envelope, ingestionMode: envelope.ingestionMode ?? 'stream' });
      return envelopes.length;
    },
    flush(batchId?: string) {
      const result = processEnterpriseBatch(envelopes.splice(0), batchId ?? `stream-window-${Date.now()}`);
      return result;
    },
    size() {
      return envelopes.length;
    },
  };
}
