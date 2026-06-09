import type { ImprovementCheckResult, RealityCheckResult } from '../../types/realityCheck';
import type { RealityCheckRepository } from '../../types/production';
import { cloudPersistenceAvailable, getSessionSnapshot, getSupabaseClient } from '../../lib/supabaseClient';
import { localDelete, localList, localUpsert } from './localRepositoryStore';

const CHECKS_KEY = 'arc_repo_reality_checks';
const IMPROVEMENTS_KEY = 'arc_repo_improvement_checks';

interface RealityCheckRow {
  id: string;
  user_id?: string;
  payload: RealityCheckResult;
  created_at: string;
}

interface ImprovementRow {
  id: string;
  user_id?: string;
  reality_check_id: string;
  payload: ImprovementCheckResult;
  created_at: string;
}

function shouldUseCloud(userId?: string): boolean {
  return Boolean(userId && cloudPersistenceAvailable());
}

export function createRealityCheckRepository(): RealityCheckRepository {
  return {
    async saveRealityCheck(result) {
      const userId = getSessionSnapshot()?.user?.id;
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        await client.from('reality_checks').upsert({
          id: result.id,
          user_id: userId,
          payload: result,
          created_at: result.savedAt,
        });
      }
      return localUpsert(CHECKS_KEY, result);
    },

    async listRealityChecks(userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        const { data } = await client
          .from('reality_checks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .returns<RealityCheckRow[]>();
        if (data) return data.map((row) => row.payload);
      }
      return localList<RealityCheckResult>(CHECKS_KEY);
    },

    async getRealityCheck(id, userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        const { data } = await client
          .from('reality_checks')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .maybeSingle<RealityCheckRow>();
        if (data) return data.payload;
      }
      return localList<RealityCheckResult>(CHECKS_KEY).find((check) => check.id === id) ?? null;
    },

    async deleteRealityCheck(id, userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        await client.from('reality_checks').delete().eq('id', id).eq('user_id', userId);
      }
      localDelete(CHECKS_KEY, id);
    },

    async saveImprovementCheck(result) {
      const userId = getSessionSnapshot()?.user?.id;
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        await client.from('improvement_checks').upsert({
          id: result.id,
          user_id: userId,
          reality_check_id: result.originalCheckId,
          payload: result,
          created_at: result.savedAt,
        });
      }
      return localUpsert(IMPROVEMENTS_KEY, result);
    },

    async listImprovementChecks(checkId, userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        const { data } = await client
          .from('improvement_checks')
          .select('*')
          .eq('reality_check_id', checkId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .returns<ImprovementRow[]>();
        if (data) return data.map((row) => row.payload);
      }
      return localList<ImprovementCheckResult>(IMPROVEMENTS_KEY).filter((item) => item.originalCheckId === checkId);
    },
  };
}

export const realityCheckRepository = createRealityCheckRepository();
