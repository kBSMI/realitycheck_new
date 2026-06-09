import type { ApiKeyRecord, SLAObservation, SMIQueueJob, StreamCursor, TenantProfile } from '../../types/enterpriseRuntime';
import type { SMIEngineResult } from '../../types/smiEngine';
import { cloudPersistenceAvailable, getSupabaseClient } from '../../lib/supabaseClient';
import { localList, localSaveList, localUpsert } from './localRepositoryStore';

const TENANTS_KEY = 'arc_repo_enterprise_tenants';
const API_KEYS_KEY = 'arc_repo_api_keys';
const JOBS_KEY = 'arc_repo_smi_jobs';
const STREAMS_KEY = 'arc_repo_stream_offsets';
const SLA_KEY = 'arc_repo_sla_observations';
const AUDIT_KEY = 'arc_repo_audit_ledger_entries';

export interface AuditLedgerPersistedEntry {
  id: string;
  tenantId?: string;
  userId?: string;
  realityCheckId?: string;
  engineVersion: string;
  resonanceSigilId: string;
  canonicalInputHash: string;
  evidenceChainHash: string;
  serverSignature?: string;
  payload: SMIEngineResult | Record<string, unknown>;
  createdAt: string;
}

function clientReady() {
  return cloudPersistenceAvailable() && getSupabaseClient();
}

export async function saveTenantProfile(tenant: TenantProfile): Promise<TenantProfile> {
  const client = clientReady();
  if (client) {
    await client.from('enterprise_tenants').upsert({
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      status: tenant.status,
      allowed_input_modes: tenant.allowedInputModes,
      max_records_per_batch: tenant.maxRecordsPerBatch,
      max_events_per_minute: tenant.maxEventsPerMinute,
      default_sla_class: tenant.defaultSlaClass,
      created_at: tenant.createdAt,
    });
  }
  return localUpsert(TENANTS_KEY, tenant);
}

export function listTenantProfiles(): TenantProfile[] {
  return localList<TenantProfile>(TENANTS_KEY);
}

export async function saveApiKeyRecord(record: ApiKeyRecord): Promise<ApiKeyRecord> {
  const client = clientReady();
  if (client) {
    await client.from('api_keys').upsert({
      id: record.id,
      tenant_id: record.tenantId,
      key_prefix: record.keyPrefix,
      key_hash: record.keyHash,
      label: record.label,
      scopes: record.scopes,
      created_at: record.createdAt,
      last_used_at: record.lastUsedAt,
      revoked_at: record.revokedAt,
    });
  }
  return localUpsert(API_KEYS_KEY, record);
}

export function listApiKeyRecords(tenantId?: string): ApiKeyRecord[] {
  return localList<ApiKeyRecord>(API_KEYS_KEY).filter((record) => !tenantId || record.tenantId === tenantId);
}

export async function saveSMIJobRecord(job: SMIQueueJob): Promise<SMIQueueJob> {
  const client = clientReady();
  if (client) {
    await client.from('smi_jobs').upsert({
      id: job.id,
      tenant_id: job.tenantId,
      status: job.status,
      input_payload: job.input,
      result_payload: job.result,
      sla_class: job.slaClass,
      created_at: job.createdAt,
      started_at: job.startedAt,
      completed_at: job.completedAt,
      error: job.error,
    });
  }
  return localUpsert(JOBS_KEY, job);
}

export function listSMIJobRecords(tenantId?: string): SMIQueueJob[] {
  return localList<SMIQueueJob>(JOBS_KEY).filter((job) => !tenantId || job.tenantId === tenantId);
}

export async function saveStreamCursorRecord(cursor: StreamCursor): Promise<StreamCursor> {
  const client = clientReady();
  if (client) {
    await client.from('stream_offsets').upsert({
      tenant_id: cursor.tenantId,
      stream_id: cursor.streamId,
      last_sequence: cursor.lastSequence,
      last_audit_hash: cursor.lastAuditHash,
      updated_at: cursor.updatedAt,
    });
  }
  const existing = localList<StreamCursor>(STREAMS_KEY);
  localSaveList(STREAMS_KEY, [cursor, ...existing.filter((item) => !(item.tenantId === cursor.tenantId && item.streamId === cursor.streamId))]);
  return cursor;
}

export function listStreamCursorRecords(tenantId?: string): StreamCursor[] {
  return localList<StreamCursor>(STREAMS_KEY).filter((cursor) => !tenantId || cursor.tenantId === tenantId);
}

export async function saveSLAObservationRecord(observation: SLAObservation, tenantId?: string): Promise<SLAObservation> {
  const client = clientReady();
  if (client) {
    await client.from('sla_observations').insert({
      tenant_id: tenantId,
      sla_class: observation.slaClass,
      duration_ms: observation.durationMs,
      within_target: observation.withinTarget,
      target_ms: observation.targetMs,
      observed_at: observation.observedAt,
    });
  }
  localSaveList(SLA_KEY, [{ tenantId, observation }, ...localList<{ tenantId?: string; observation: SLAObservation }>(SLA_KEY)]);
  return observation;
}

export function listSLAObservationRecords(tenantId?: string): SLAObservation[] {
  return localList<{ tenantId?: string; observation: SLAObservation }>(SLA_KEY)
    .filter((item) => !tenantId || item.tenantId === tenantId)
    .map((item) => item.observation);
}

export async function saveAuditLedgerEntry(entry: AuditLedgerPersistedEntry): Promise<AuditLedgerPersistedEntry> {
  const client = clientReady();
  if (client) {
    await client.from('audit_ledger_entries').upsert({
      id: entry.id,
      tenant_id: entry.tenantId,
      user_id: entry.userId,
      reality_check_id: entry.realityCheckId,
      engine_version: entry.engineVersion,
      resonance_sigil_id: entry.resonanceSigilId,
      canonical_input_hash: entry.canonicalInputHash,
      evidence_chain_hash: entry.evidenceChainHash,
      server_signature: entry.serverSignature,
      payload: entry.payload,
      created_at: entry.createdAt,
    });
  }
  return localUpsert(AUDIT_KEY, entry);
}

export function listAuditLedgerEntries(tenantId?: string): AuditLedgerPersistedEntry[] {
  return localList<AuditLedgerPersistedEntry>(AUDIT_KEY).filter((entry) => !tenantId || entry.tenantId === tenantId);
}
