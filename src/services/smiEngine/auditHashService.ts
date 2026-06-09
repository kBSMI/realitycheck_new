// ─── Deterministic audit hashing + resonance sigil fingerprints ─────────────
// Client-side hashes here are stable audit fingerprints, not cryptographic proof.
// Production enterprise ledgers should additionally sign canonical hashes server-side
// with SHA-256/HMAC or a managed key service.

export function canonicalStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalStringify(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalStringify(record[key])}`)
    .join(',')}}`;
}

export function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function stableHash64(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * prime) & mask;
  }
  return `fnv1a64-${hash.toString(16).padStart(16, '0')}`;
}

export function stableObjectHash(value: unknown): string {
  return stableHash64(canonicalStringify(value));
}

export function createEvidenceChainHash(values: unknown[]): string {
  return stableObjectHash({ evidence: values });
}
