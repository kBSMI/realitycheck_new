import type { ProductionCreditLedgerEntry, SupportCreditRepository } from '../../types/production';
import { cloudPersistenceAvailable, getSupabaseClient } from '../../lib/supabaseClient';
import { localList, localSaveList } from './localRepositoryStore';

const LEDGER_KEY = 'arc_repo_support_credit_ledger';

interface CreditLedgerRow {
  id: string;
  user_id?: string;
  kind: string;
  credits_delta: number;
  label: string;
  external_ref?: string;
  created_at: string;
}

function rowToEntry(row: CreditLedgerRow): ProductionCreditLedgerEntry {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind as ProductionCreditLedgerEntry['kind'],
    creditsDelta: row.credits_delta,
    label: row.label,
    externalRef: row.external_ref,
    createdAt: row.created_at,
  };
}

function shouldUseCloud(userId?: string): boolean {
  return Boolean(userId && cloudPersistenceAvailable());
}

export function createSupportCreditRepository(): SupportCreditRepository {
  return {
    async getBalance(userId) {
      const ledger = await this.listLedger(userId);
      return {
        userId,
        balance: ledger.reduce((sum, entry) => sum + entry.creditsDelta, 0),
        source: shouldUseCloud(userId) ? 'cloud' : 'local',
        updatedAt: new Date().toISOString(),
      };
    },

    async addLedgerEntry(entry) {
      const saved: ProductionCreditLedgerEntry = {
        ...entry,
        id: `credit-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      };
      const client = getSupabaseClient();
      if (shouldUseCloud(entry.userId) && client) {
        await client.from('support_credit_ledger').insert({
          id: saved.id,
          user_id: saved.userId,
          kind: saved.kind,
          credits_delta: saved.creditsDelta,
          label: saved.label,
          external_ref: saved.externalRef,
          created_at: saved.createdAt,
        });
      }
      const ledger = localList<ProductionCreditLedgerEntry>(LEDGER_KEY);
      localSaveList(LEDGER_KEY, [saved, ...ledger]);
      return saved;
    },

    async listLedger(userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        const { data } = await client
          .from('support_credit_ledger')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .returns<CreditLedgerRow[]>();
        if (data) return data.map(rowToEntry);
      }
      return localList<ProductionCreditLedgerEntry>(LEDGER_KEY).filter((entry) => !userId || entry.userId === userId || !entry.userId);
    },
  };
}

export const supportCreditRepository = createSupportCreditRepository();
