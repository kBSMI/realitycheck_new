import type { UnlockDecision, UnlockReceipt, UserEntitlement } from '../types/production';
import { hasEntitlement } from './entitlementService';
import { supportCreditRepository } from './repositories/supportCreditRepository';

export const FULL_REPORT_CREDIT_COST = 1;

export async function canUnlockFullReport(params: {
  reportId: string;
  userId?: string;
  entitlement?: UserEntitlement;
}): Promise<UnlockDecision> {
  const balance = await supportCreditRepository.getBalance(params.userId);
  const hasPlanAccess = hasEntitlement(params.entitlement, 'full_report_unlock');
  const allowed = hasPlanAccess || balance.balance >= FULL_REPORT_CREDIT_COST;

  return {
    allowed,
    reason: allowed
      ? hasPlanAccess ? 'Plan entitlement allows full report unlock.' : 'Credit balance is sufficient.'
      : 'Unlock requires one support credit or an active plan entitlement.',
    creditsRequired: hasPlanAccess ? 0 : FULL_REPORT_CREDIT_COST,
    currentBalance: balance.balance,
    entitlement: params.entitlement,
  };
}

export async function unlockFullReport(params: {
  reportId: string;
  userId?: string;
  entitlement?: UserEntitlement;
}): Promise<UnlockReceipt> {
  const decision = await canUnlockFullReport(params);
  if (!decision.allowed) {
    return {
      unlocked: false,
      reportId: params.reportId,
      includedImprovementChecks: 0,
      message: decision.reason,
    };
  }

  if (decision.creditsRequired === 0) {
    return {
      unlocked: true,
      reportId: params.reportId,
      includedImprovementChecks: 1,
      message: 'Report unlocked by plan entitlement. One improvement check is included.',
    };
  }

  const ledgerEntry = await supportCreditRepository.addLedgerEntry({
    userId: params.userId,
    kind: 'usage',
    creditsDelta: -FULL_REPORT_CREDIT_COST,
    label: `Full Reality Check unlock: ${params.reportId}`,
    externalRef: params.reportId,
  });

  return {
    unlocked: true,
    ledgerEntry,
    reportId: params.reportId,
    includedImprovementChecks: 1,
    message: 'Report unlocked. One improvement check is included.',
  };
}
