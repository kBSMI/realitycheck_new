import { stableObjectHash, stableHash } from '../services/smiEngine/auditHashService';

export interface SignedAuditEnvelope<T> {
  payload: T;
  canonicalHash: string;
  signature: string;
  algorithm: 'local-fnv1a-placeholder' | 'hmac-sha256';
  signedAt: string;
  note: string;
}

export function createLocalSignedEnvelope<T>(payload: T): SignedAuditEnvelope<T> {
  const canonicalHash = stableObjectHash(payload);
  return {
    payload,
    canonicalHash,
    signature: stableHash(`local-signature:${canonicalHash}`),
    algorithm: 'local-fnv1a-placeholder',
    signedAt: new Date().toISOString(),
    note: 'Local placeholder only. Production must replace with server-side HMAC/SHA-256 or managed key signature.',
  };
}

export function verifyLocalSignedEnvelope<T>(envelope: SignedAuditEnvelope<T>): boolean {
  return envelope.canonicalHash === stableObjectHash(envelope.payload)
    && envelope.signature === stableHash(`local-signature:${envelope.canonicalHash}`);
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export async function createServerSignedEnvelope<T>(payload: T, secret: string): Promise<SignedAuditEnvelope<T>> {
  if (!secret) throw new Error('SMI_AUDIT_SIGNING_SECRET is required for server audit signing.');
  const canonicalHash = stableObjectHash(payload);
  return {
    payload,
    canonicalHash,
    signature: await hmacSha256(canonicalHash, secret),
    algorithm: 'hmac-sha256',
    signedAt: new Date().toISOString(),
    note: 'Server-side HMAC/SHA-256 audit envelope. Production can swap this signer for managed KMS without changing the payload contract.',
  };
}

export async function verifyServerSignedEnvelope<T>(envelope: SignedAuditEnvelope<T>, secret: string): Promise<boolean> {
  if (envelope.algorithm !== 'hmac-sha256') return false;
  if (envelope.canonicalHash !== stableObjectHash(envelope.payload)) return false;
  return envelope.signature === await hmacSha256(envelope.canonicalHash, secret);
}
