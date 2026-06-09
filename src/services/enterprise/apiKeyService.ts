import type { ApiKeyRecord } from '../../types/enterpriseRuntime';
import { saveApiKeyRecord } from '../repositories/enterpriseRuntimeRepository';
import { stableHash64 } from '../smiEngine/auditHashService';

const apiKeys = new Map<string, ApiKeyRecord>();

export function createLocalApiKeyRecord(params: {
  tenantId: string;
  label: string;
  scopes: string[];
  rawKey: string;
}): ApiKeyRecord {
  const keyPrefix = params.rawKey.slice(0, 8);
  const record: ApiKeyRecord = {
    id: `api-key-${Date.now()}`,
    tenantId: params.tenantId,
    keyPrefix,
    keyHash: stableHash64(`local-pepper:${params.rawKey}`),
    label: params.label,
    scopes: params.scopes,
    createdAt: new Date().toISOString(),
  };
  apiKeys.set(record.id, record);
  void saveApiKeyRecord(record);
  return record;
}

export function verifyLocalApiKey(rawKey: string, requiredScope: string): ApiKeyRecord | null {
  const hash = stableHash64(`local-pepper:${rawKey}`);
  const match = Array.from(apiKeys.values()).find((record) => !record.revokedAt && record.keyHash === hash && record.scopes.includes(requiredScope));
  if (!match) return null;
  match.lastUsedAt = new Date().toISOString();
  void saveApiKeyRecord(match);
  return match;
}
