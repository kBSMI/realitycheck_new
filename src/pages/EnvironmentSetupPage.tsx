import React from 'react';

export default function EnvironmentSetupPage() {
  const checks = [
    {
      label: 'Supabase URL',
      value: Boolean(import.meta.env.VITE_SUPABASE_URL),
    },
    {
      label: 'Supabase anon key',
      value: Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY),
    },
    {
      label: 'Supabase publishable key',
      value: Boolean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
    },
    {
      label: 'Stripe publishable key',
      value: Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY),
    },
    {
      label: 'App URL',
      value: Boolean(import.meta.env.VITE_APP_URL),
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
          Review browser-safe environment configuration for the deployed AI Reality Check app.
          Server-only secrets are intentionally not displayed here.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <div
              key={check.label}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 p-5"
            >
              <span className="font-medium text-white/80">{check.label}</span>
              <span
                className={
                  check.value
                    ? 'rounded-full bg-emerald-300/15 px-3 py-1 text-sm font-semibold text-emerald-200'
                    : 'rounded-full bg-amber-300/15 px-3 py-1 text-sm font-semibold text-amber-200'
                }
              >
                {check.value ? 'Configured' : 'Missing'}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-black/50 p-5">
          <h2 className="mb-2 text-xl font-semibold">Server-only variables</h2>
          <p className="text-sm leading-6 text-white/60">
            SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and
            SMI_AUDIT_SIGNING_SECRET should exist only in Vercel server environment variables.
            They should never be exposed through VITE_ variables or frontend code.
          </p>
        </div>
      </section>
    </main>
  );
}
