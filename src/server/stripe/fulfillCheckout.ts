import type { ProductionCreditLedgerEntry, UserEntitlement } from '../../types/production';
import { supportCreditRepository } from '../../services/repositories/supportCreditRepository';
import { saveUserEntitlement } from '../../services/repositories/entitlementRepository';

export interface CheckoutFulfillmentInput {
  ledgerEntry?: Omit<ProductionCreditLedgerEntry, 'id' | 'createdAt'>;
  entitlement?: UserEntitlement;
}

export interface CheckoutFulfillmentReceipt {
  credited: boolean;
  entitled: boolean;
  ledgerEntry?: ProductionCreditLedgerEntry;
  entitlement?: UserEntitlement;
}

export async function fulfillCheckout(input: CheckoutFulfillmentInput): Promise<CheckoutFulfillmentReceipt> {
  const ledgerEntry = input.ledgerEntry
    ? await supportCreditRepository.addLedgerEntry(input.ledgerEntry)
    : undefined;
  const entitlement = input.entitlement
    ? await saveUserEntitlement(input.entitlement)
    : undefined;
  return {
    credited: Boolean(ledgerEntry),
    entitled: Boolean(entitlement),
    ledgerEntry,
    entitlement,
  };
}
