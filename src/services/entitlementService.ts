import type { EntitlementFlag, PlanCode, UserEntitlement } from '../types/production';

export const PLAN_ENTITLEMENTS: Record<PlanCode, Omit<UserEntitlement, 'userId'>> = {
  free: {
    plan: 'free',
    monthlyCredits: 0,
    flags: [],
  },
  plus: {
    plan: 'plus',
    monthlyCredits: 30,
    flags: ['full_report_unlock', 'improvement_check', 'history_sync'],
  },
  pro: {
    plan: 'pro',
    monthlyCredits: 100,
    flags: ['full_report_unlock', 'improvement_check', 'history_sync', 'api_access'],
  },
  teams: {
    plan: 'teams',
    monthlyCredits: 300,
    flags: ['full_report_unlock', 'improvement_check', 'history_sync', 'team_workspace', 'batch_ingestion', 'audit_ledger', 'api_access'],
  },
  enterprise: {
    plan: 'enterprise',
    monthlyCredits: 1000,
    flags: ['full_report_unlock', 'improvement_check', 'history_sync', 'team_workspace', 'enterprise_console', 'batch_ingestion', 'stream_ingestion', 'audit_ledger', 'api_access'],
  },
};

export function getEntitlement(userId = 'local-preview', plan: PlanCode = 'free'): UserEntitlement {
  return { userId, ...PLAN_ENTITLEMENTS[plan] };
}

export function hasEntitlement(entitlement: UserEntitlement | undefined, flag: EntitlementFlag): boolean {
  return Boolean(entitlement?.flags.includes(flag));
}

export function planAllows(plan: PlanCode, flag: EntitlementFlag): boolean {
  return PLAN_ENTITLEMENTS[plan].flags.includes(flag);
}
