// ─── Enterprise Audit Ledger Service ────────────────────────────────────────
// Local-first audit ledger shape. Supabase/Postgres persistence can implement
// this same interface during the production beta phase.

import type { SMIAuditRecord, SMIEngineResult } from '../../types/smiEngine';
import { stableObjectHash } from './auditHashService';

export interface EnterpriseAuditLedgerEntry {
  id: string;
  record: SMIAuditRecord;
  resonanceSigilId: string;
  evidenceChainHash: string;
  recommendationAction: string;
  resonanceScore: number;
  driftPressure: number;
  confidenceScore: number;
  createdAt: string;
}

export function createEnterpriseAuditLedgerEntry(result: SMIEngineResult): EnterpriseAuditLedgerEntry {
  const id = stableObjectHash({
    engineVersion: result.engineVersion,
    evidenceChainHash: result.auditRecord.evidenceChainHash,
    timestamp: result.auditRecord.timestamp,
  });

  return {
    id,
    record: result.auditRecord,
    resonanceSigilId: result.resonanceSignature.sigilId,
    evidenceChainHash: result.auditRecord.evidenceChainHash,
    recommendationAction: result.recommendation.action,
    resonanceScore: result.scores.resonanceScore,
    driftPressure: result.scores.driftPressure,
    confidenceScore: result.confidence.confidenceScore,
    createdAt: result.auditRecord.timestamp,
  };
}
