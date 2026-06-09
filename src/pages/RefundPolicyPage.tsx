export default function RefundPolicyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 text-gray-300">
      <h1 className="text-3xl font-semibold text-white">Refund Policy</h1>
      <p>Support credit packs and subscriptions are scaffolded for Stripe integration. Final refund rules should be confirmed before enabling live checkout.</p>
      <p>Recommended beta posture: handle launch-support refunds case by case and preserve ledger reversals as audit entries.</p>
    </article>
  );
}
