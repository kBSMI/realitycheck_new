import type { UserEntitlement } from '../../types/production';
import { cloudPersistenceAvailable, getSupabaseClient } from '../../lib/supabaseClient';
import { localList, localSaveList } from './localRepositoryStore';

const ENTITLEMENTS_KEY = 'arc_repo_user_entitlements';

interface EntitlementRow {
  user_id: string;
  plan: UserEntitlement['plan'];
  monthly_credits: number;
  flags: string[];
  period_start?: string;
  period_end?: string;
  updated_at: string;
}

function rowToEntitlement(row: EntitlementRow): UserEntitlement {
  return {
    userId: row.user_id,
    plan: row.plan,
    monthlyCredits: row.monthly_credits,
    flags: row.flags as UserEntitlement['flags'],
    periodStart: row.period_start,
    periodEnd: row.period_end,
  };
}

export async function saveUserEntitlement(entitlement: UserEntitlement): Promise<UserEntitlement> {
  const client = getSupabaseClient();
  if (cloudPersistenceAvailable() && client) {
    await client.from('user_entitlements').upsert({
      user_id: entitlement.userId,
      plan: entitlement.plan,
      monthly_credits: entitlement.monthlyCredits,
      flags: entitlement.flags,
      period_start: entitlement.periodStart,
      period_end: entitlement.periodEnd,
      updated_at: new Date().toISOString(),
    });
  }

  const existing = localList<UserEntitlement>(ENTITLEMENTS_KEY);
  localSaveList(ENTITLEMENTS_KEY, [entitlement, ...existing.filter((item) => item.userId !== entitlement.userId)]);
  return entitlement;
}

export async function getUserEntitlement(userId: string): Promise<UserEntitlement | null> {
  const client = getSupabaseClient();
  if (cloudPersistenceAvailable() && client) {
    const { data } = await client
      .from('user_entitlements')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle<EntitlementRow>();
    if (data) return rowToEntitlement(data);
  }
  return localList<UserEntitlement>(ENTITLEMENTS_KEY).find((item) => item.userId === userId) ?? null;
}
