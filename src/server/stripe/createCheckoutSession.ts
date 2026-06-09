import type { CheckoutSessionRequest, CheckoutSessionResponse } from '../../types/production';
import { findCheckoutPlan } from '../../services/pricingCatalogService';

export interface StripeCheckoutEndpointEnv {
  stripeSecretKey?: string;
  appUrl?: string;
}

export interface StripeCheckoutSessionPayload {
  mode: 'payment' | 'subscription';
  line_items: Array<{ price: string; quantity: number }>;
  success_url: string;
  cancel_url: string;
  client_reference_id: string;
  metadata: Record<string, string>;
}

export function buildStripeCheckoutPayload(request: CheckoutSessionRequest): StripeCheckoutSessionPayload | null {
  const plan = findCheckoutPlan(request.planId);
  if (!plan) return null;
  return {
    mode: plan.mode,
    line_items: [{ price: plan.stripePriceLookupKey, quantity: 1 }],
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    client_reference_id: request.userId,
    metadata: {
      planId: plan.id,
      creditsIncluded: String(plan.creditsIncluded),
      planCode: plan.planCode ?? '',
    },
  };
}

export async function createCheckoutSession(
  request: CheckoutSessionRequest,
  env: StripeCheckoutEndpointEnv = {},
  stripeFetch: typeof fetch = fetch
): Promise<CheckoutSessionResponse> {
  const payload = buildStripeCheckoutPayload(request);
  if (!payload) {
    return { status: 'not_configured', message: `Unknown checkout plan: ${request.planId}` };
  }
  if (!env.stripeSecretKey) {
    return {
      status: 'not_configured',
      message: 'STRIPE_SECRET_KEY is required on the server to create real Stripe Checkout Sessions.',
    };
  }

  const form = new URLSearchParams();
  form.set('mode', payload.mode);
  form.set('success_url', payload.success_url);
  form.set('cancel_url', payload.cancel_url);
  form.set('client_reference_id', payload.client_reference_id);
  payload.line_items.forEach((item, index) => {
    form.set(`line_items[${index}][price]`, item.price);
    form.set(`line_items[${index}][quantity]`, String(item.quantity));
  });
  Object.entries(payload.metadata).forEach(([key, value]) => {
    form.set(`metadata[${key}]`, value);
  });

  const response = await stripeFetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });

  if (!response.ok) {
    return { status: 'not_configured', message: await response.text() };
  }
  const data = await response.json() as { id?: string; url?: string };
  return {
    status: 'created',
    sessionId: data.id,
    url: data.url,
    message: 'Stripe Checkout Session created server-side.',
  };
}
