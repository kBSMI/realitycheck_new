import type { RateLimitDecision, TenantProfile } from '../../types/enterpriseRuntime';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function evaluateRateLimit(tenant: TenantProfile, now = Date.now()): RateLimitDecision {
  const key = tenant.id;
  const windowMs = 60_000;
  const existing = buckets.get(key);
  const bucket = existing && existing.resetAt > now
    ? existing
    : { count: 0, resetAt: now + windowMs };

  const allowed = bucket.count < tenant.maxEventsPerMinute;
  if (allowed) bucket.count += 1;
  buckets.set(key, bucket);

  return {
    allowed,
    limit: tenant.maxEventsPerMinute,
    remaining: Math.max(0, tenant.maxEventsPerMinute - bucket.count),
    resetAt: new Date(bucket.resetAt).toISOString(),
    reason: allowed ? 'Within tenant event rate.' : 'Tenant event rate exceeded.',
  };
}

export function resetRateLimiter(): void {
  buckets.clear();
}
