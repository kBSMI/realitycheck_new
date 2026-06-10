type EnvCheck = {
  label: string;
  configured: boolean;
  note: string;
};

export default function EnvironmentSetupPage() {
  const checks: EnvCheck[] = [
    {
      label: 'App URL',
      configured: Boolean(import.meta.env.VITE_APP_URL),
      note: 'Used for production redirects and app links.',
    },
    {
      label: 'Data Mode',
      configured: Boolean(import.meta.env.VITE_DATA_MODE),
      note: 'Should be set to supabase for production.',
    },
    {
      label: 'Supabase URL',
      configured: Boolean(import.meta.env.VITE_SUPABASE_URL),
      note: 'Browser-safe Supabase project URL.',
    },
    {
      label: 'Supabase anon key',
      configured: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
      note: 'Browser-safe anon key protected by RLS.',
    },
    {
      label: 'Supabase publishable key',
      configured: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
      note: 'Optional publishable key if your client supports it.',
    },
    {
      label: 'Stripe publishable key',
      configured: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
      note: 'Browser-safe Stripe publishable key.',
    },
  ];

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-white/50">
          Production Setup
        </p>

        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
          Environment Setup
        </h1>

        <p className="max-w-3xl text-lg leading-8 text-white/70">
          Review browser-safe environment configuration for the deployed AI
          Reality Check app. Server-only secrets are intentionally not displayed
          here.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="rounded-2xl border border-white/10 bg-black/40 p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium text-white/80">{check.label}</span>

                <span
                  className={
                    check.configured
                      ? 'rounded-full bg-emerald-300/15 px-3 py-1 text-sm font-semibold text-emerald-200'
                      : 'rounded-full bg-amber-300/15 px-3 py-1 text-sm font-semibold text-amber-200'
                  }
                >
                  {check.configured ? 'Configured' : 'Missing'}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/55">
                {check.note}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/50 p-5">
          <h2 className="mb-2 text-xl font-semibold">
            Server-only variables
          </h2>

          <p className="text-sm leading-6 text-white/60">
            SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY,
            STRIPE_WEBHOOK_SECRET, and SMI_AUDIT_SIGNING_SECRET should exist
            only in Vercel server environment variables. They should never be
            exposed through VITE_ variables or frontend code.
          </p>
        </div>
      </section>
    </main>
  );
}
