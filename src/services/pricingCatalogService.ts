import type { CheckoutPlan } from '../types/production';

export const CHECKOUT_PLANS: CheckoutPlan[] = [
  { id: 'starter-support', label: '$1 Starter Support Credits', mode: 'payment', priceCents: 100, currency: 'usd', creditsIncluded: 3, stripePriceLookupKey: 'arc_starter_support_100' },
  { id: 'builder-support', label: '$5 Builder Support Credits', mode: 'payment', priceCents: 500, currency: 'usd', creditsIncluded: 25, stripePriceLookupKey: 'arc_builder_support_500' },
  { id: 'power-support', label: '$10 Power Support Credits', mode: 'payment', priceCents: 1000, currency: 'usd', creditsIncluded: 75, stripePriceLookupKey: 'arc_power_support_1000' },
  { id: 'launch-supporter', label: '$25 Launch Supporter Credits', mode: 'payment', priceCents: 2500, currency: 'usd', creditsIncluded: 250, stripePriceLookupKey: 'arc_launch_supporter_2500' },
  { id: 'plus-monthly', label: 'Plus Monthly', mode: 'subscription', priceCents: 900, currency: 'usd', creditsIncluded: 30, planCode: 'plus', stripePriceLookupKey: 'arc_plus_monthly' },
  { id: 'pro-monthly', label: 'Pro Monthly', mode: 'subscription', priceCents: 1900, currency: 'usd', creditsIncluded: 100, planCode: 'pro', stripePriceLookupKey: 'arc_pro_monthly' },
  { id: 'teams-monthly', label: 'Teams Monthly', mode: 'subscription', priceCents: 4900, currency: 'usd', creditsIncluded: 300, planCode: 'teams', stripePriceLookupKey: 'arc_teams_monthly' },
];

export function findCheckoutPlan(planId: string): CheckoutPlan | undefined {
  return CHECKOUT_PLANS.find((plan) => plan.id === planId);
}
