import type { RealityCheckResult, ImprovementCheckResult, Testimonial } from './realityCheck';
import type { SMIEngineInput, SMIEngineResult, SMISLAClass } from './smiEngine';

export type PlanCode = 'free' | 'plus' | 'pro' | 'teams' | 'enterprise';
export type EntitlementFlag =
  | 'full_report_unlock'
  | 'improvement_check'
  | 'history_sync'
  | 'team_workspace'
  | 'enterprise_console'
  | 'batch_ingestion'
  | 'stream_ingestion'
  | 'audit_ledger'
  | 'api_access';

export interface AuthUserProfile {
  id: string;
  email?: string;
  displayName?: string;
  plan: PlanCode;
  createdAt: string;
}

export interface UserEntitlement {
  userId: string;
  plan: PlanCode;
  monthlyCredits: number;
  flags: EntitlementFlag[];
  periodStart?: string;
  periodEnd?: string;
}

export interface CreditBalanceSnapshot {
  userId?: string;
  balance: number;
  source: 'local' | 'cloud';
  updatedAt: string;
}

export type CreditLedgerEntryKind = 'grant' | 'purchase' | 'usage' | 'refund' | 'adjustment';

export interface ProductionCreditLedgerEntry {
  id: string;
  userId?: string;
  kind: CreditLedgerEntryKind;
  creditsDelta: number;
  label: string;
  externalRef?: string;
  createdAt: string;
}

export interface RealityCheckRepository {
  saveRealityCheck(result: RealityCheckResult): Promise<RealityCheckResult>;
  listRealityChecks(userId?: string): Promise<RealityCheckResult[]>;
  getRealityCheck(id: string, userId?: string): Promise<RealityCheckResult | null>;
  deleteRealityCheck(id: string, userId?: string): Promise<void>;
  saveImprovementCheck(result: ImprovementCheckResult): Promise<ImprovementCheckResult>;
  listImprovementChecks(checkId: string, userId?: string): Promise<ImprovementCheckResult[]>;
}

export interface SupportCreditRepository {
  getBalance(userId?: string): Promise<CreditBalanceSnapshot>;
  addLedgerEntry(entry: Omit<ProductionCreditLedgerEntry, 'id' | 'createdAt'>): Promise<ProductionCreditLedgerEntry>;
  listLedger(userId?: string): Promise<ProductionCreditLedgerEntry[]>;
}

export interface TestimonialRepository {
  saveTestimonial(testimonial: Testimonial): Promise<Testimonial>;
  listTestimonials(userId?: string): Promise<Testimonial[]>;
}

export interface UnlockDecision {
  allowed: boolean;
  reason: string;
  creditsRequired: number;
  currentBalance: number;
  entitlement?: UserEntitlement;
}

export interface UnlockReceipt {
  unlocked: boolean;
  ledgerEntry?: ProductionCreditLedgerEntry;
  reportId: string;
  includedImprovementChecks: number;
  message: string;
}

export interface CheckoutPlan {
  id: string;
  label: string;
  mode: 'payment' | 'subscription';
  priceCents: number;
  currency: 'usd';
  creditsIncluded: number;
  planCode?: PlanCode;
  stripePriceLookupKey: string;
}

export interface CheckoutSessionRequest {
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  url?: string;
  sessionId?: string;
  status: 'mocked' | 'created' | 'not_configured';
  message: string;
}

export interface SMIJobRequest {
  id: string;
  tenantId: string;
  input: SMIEngineInput;
  mode: 'single' | 'batch' | 'stream';
  slaClass: SMISLAClass;
  createdAt: string;
}

export interface SMIJobResult {
  requestId: string;
  tenantId: string;
  result: SMIEngineResult;
  completedAt: string;
  durationMs: number;
}
