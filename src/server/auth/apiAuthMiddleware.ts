import { stableHash64 } from '../../services/smiEngine/auditHashService';

export interface ApiAuthResult {
  authorized: boolean;
  keyHash?: string;
  reason: string;
}

export function verifyApiKeyPlaceholder(rawKey: string | undefined, expectedHash?: string): ApiAuthResult {
  if (!rawKey) return { authorized: false, reason: 'Missing API key.' };
  const keyHash = stableHash64(`server-pepper-required:${rawKey}`);
  if (!expectedHash) {
    return {
      authorized: false,
      keyHash,
      reason: 'No expected hash configured. Codex should wire this to tenant api_keys table with server-only pepper.',
    };
  }
  return {
    authorized: keyHash === expectedHash,
    keyHash,
    reason: keyHash === expectedHash ? 'API key matched placeholder hash.' : 'API key mismatch.',
  };
}
