export type CreditLedgerEntryType = 'starter' | 'pack' | 'subscription_preview' | 'stablecoin_preview' | 'dust_pending' | 'dust_redeemed' | 'manual_adjustment' | 'usage';

export interface SupportCreditPack {
  id: string;
  name: string;
  priceLabel: string;
  credits: number;
  description: string;
  bestFor?: string;
}

export interface MonthlyPlanPreview {
  id: string;
  name: string;
  priceLabel: string;
  creditsPerMonth: number;
  features: string[];
}

export interface SupportedDustToken {
  id: string;
  chain: string;
  token: string;
  symbol: string;
  status: 'supported' | 'review-required';
  minRedeemableUsd: number;
}

export interface DustSupportRequest {
  id: string;
  tokenName: string;
  symbol: string;
  chain: string;
  contractAddress?: string;
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  status: 'pending_review';
}

export interface CreditLedgerEntry {
  id: string;
  type: CreditLedgerEntryType;
  label: string;
  creditsDelta: number;
  amountLabel?: string;
  createdAt: string;
}
