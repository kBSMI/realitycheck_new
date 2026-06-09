import type { PlanCode, ProductionCreditLedgerEntry, UserEntitlement } from '../../types/production';
import { CHECKOUT_PLANS } from '../../services/pricingCatalogService';
import { getEntitlement } from '../../services/entitlementService';

export interface StripeWebhookFulfillmentResult {
  handled: boolean;
  eventType: string;
  verified: boolean;
  ledgerEntry?: Omit<ProductionCreditLedgerEntry, 'id' | 'createdAt'>;
  entitlement?: UserEntitlement;
  message: string;
}

interface StripeCheckoutSessionObject {
  client_reference_id?: string;
  metadata?: Record<string, string>;
  id?: string;
  subscription?: string;
}

interface StripeWebhookEvent {
  type: string;
  data?: { object?: StripeCheckoutSessionObject };
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return bytesToHex(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

function parseStripeSignature(header: string): { timestamp: string; signatures: string[] } {
  const parts = header.split(',').map((part) => part.trim());
  return {
    timestamp: parts.find((part) => part.startsWith('t='))?.slice(2) ?? '',
    signatures: parts.filter((part) => part.startsWith('v1=')).map((part) => part.slice(3)),
  };
}

export async function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
  toleranceSeconds?: number;
  nowSeconds?: number;
}): Promise<boolean> {
  const { timestamp, signatures } = parseStripeSignature(params.signatureHeader);
  if (!timestamp || signatures.length === 0 || !params.webhookSecret) return false;
  const now = params.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > (params.toleranceSeconds ?? 300)) return false;
  const expected = await hmacSha256(`${timestamp}.${params.rawBody}`, params.webhookSecret);
  return signatures.includes(expected);
}

export function buildFulfillmentFromCheckoutSession(event: StripeWebhookEvent): StripeWebhookFulfillmentResult {
  if (event.type !== 'checkout.session.completed') {
    return { handled: false, eventType: event.type, verified: true, message: 'Event ignored by fulfillment handler.' };
  }
  const session = event.data?.object;
  const planId = session?.metadata?.planId;
  const plan = planId ? CHECKOUT_PLANS.find((item) => item.id === planId) : undefined;
  if (!session?.client_reference_id || !plan) {
    return { handled: false, eventType: event.type, verified: true, message: 'Missing user reference or plan metadata.' };
  }

  const entitlement = plan.planCode
    ? getEntitlement(session.client_reference_id, plan.planCode as PlanCode)
    : undefined;

  return {
    handled: true,
    eventType: event.type,
    verified: true,
    ledgerEntry: {
      userId: session.client_reference_id,
      kind: plan.mode === 'subscription' ? 'grant' : 'purchase',
      creditsDelta: plan.creditsIncluded,
      label: `${plan.label} fulfilled by Stripe webhook`,
      externalRef: session.id,
    },
    entitlement,
    message: entitlement
      ? 'Stripe webhook verified; credits and subscription entitlement are ready to persist.'
      : 'Stripe webhook verified; credit pack is ready to persist.',
  };
}

export async function handleStripeWebhook(params: {
  rawBody: string;
  signatureHeader: string;
  webhookSecret: string;
}): Promise<StripeWebhookFulfillmentResult> {
  const verified = await verifyStripeWebhookSignature(params);
  if (!verified) {
    return { handled: false, eventType: 'unknown', verified: false, message: 'Invalid Stripe webhook signature.' };
  }
  const event = JSON.parse(params.rawBody) as StripeWebhookEvent;
  return buildFulfillmentFromCheckoutSession(event);
}
