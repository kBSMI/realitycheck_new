import type { CreditLedgerEntry, DustSupportRequest } from '../types/commerce';

const CREDIT_KEY = 'arc_credit_ledger';
const DUST_REQUEST_KEY = 'arc_dust_support_requests';

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T[] : [];
  } catch {
    return [];
  }
}

function saveList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadCreditLedger(): CreditLedgerEntry[] {
  return loadList<CreditLedgerEntry>(CREDIT_KEY);
}

export function getCreditBalance(): number {
  return loadCreditLedger().reduce((sum, entry) => sum + entry.creditsDelta, 0);
}

export function addLedgerEntry(entry: Omit<CreditLedgerEntry, 'id' | 'createdAt'>): CreditLedgerEntry {
  const saved: CreditLedgerEntry = { ...entry, id: `ledger-${Date.now()}`, createdAt: new Date().toISOString() };
  const ledger = loadCreditLedger();
  ledger.unshift(saved);
  saveList(CREDIT_KEY, ledger);
  return saved;
}

export function simulateCreditPackPurchase(name: string, credits: number, amountLabel: string): CreditLedgerEntry {
  return addLedgerEntry({ type: 'pack', label: `${name} simulated checkout`, creditsDelta: credits, amountLabel });
}

export function spendCredit(label = 'Reality Check unlock'): CreditLedgerEntry | null {
  if (getCreditBalance() < 1) return null;
  return addLedgerEntry({ type: 'usage', label, creditsDelta: -1 });
}

export function loadDustSupportRequests(): DustSupportRequest[] {
  return loadList<DustSupportRequest>(DUST_REQUEST_KEY);
}

export function saveDustSupportRequest(input: Omit<DustSupportRequest, 'id' | 'createdAt' | 'status'>): DustSupportRequest {
  const saved: DustSupportRequest = { ...input, id: `dust-${Date.now()}`, createdAt: new Date().toISOString(), status: 'pending_review' };
  const requests = loadDustSupportRequests();
  requests.unshift(saved);
  saveList(DUST_REQUEST_KEY, requests);
  return saved;
}

export function clearCreditLedger(): void {
  localStorage.removeItem(CREDIT_KEY);
}
