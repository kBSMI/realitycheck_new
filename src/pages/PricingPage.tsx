import { CHECKOUT_PLANS } from '../services/pricingCatalogService';

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 text-gray-200">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Support credits</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Unlock full Reality Checks when you need them.</h1>
        <p className="mt-2 text-gray-400">Checkout is currently scaffolded. Codex can wire these plans to Stripe Price lookup keys.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CHECKOUT_PLANS.map((plan) => (
          <div key={plan.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-lg font-semibold text-white">{plan.label}</p>
            <p className="mt-1 text-sm text-gray-400">{plan.creditsIncluded} credits included</p>
            <p className="mt-4 text-2xl font-semibold text-white">${(plan.priceCents / 100).toFixed(2)}</p>
            <p className="mt-3 text-xs text-gray-500">Stripe lookup key: {plan.stripePriceLookupKey}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
