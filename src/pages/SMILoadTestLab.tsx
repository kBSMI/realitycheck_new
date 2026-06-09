import React from 'react';

export default function SMILoadTestLab() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-white/50">
          Enterprise Validation
        </p>

        <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-6xl">
          SMI Load Test Lab
        </h1>

        <p className="max-w-3xl text-lg leading-8 text-white/70">
          Validate deterministic SMI scoring behavior under controlled local,
          API, batch, and staging load scenarios. This lab is designed for
          internal testing and enterprise readiness review.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="mb-2 text-xl font-semibold">Local Engine</h2>
            <p className="text-sm leading-6 text-white/60">
              Run deterministic validation without hitting production services.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="mb-2 text-xl font-semibold">API Smoke</h2>
            <p className="text-sm leading-6 text-white/60">
              Test staging endpoints with safe request volumes.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
            <h2 className="mb-2 text-xl font-semibold">k6 Export</h2>
            <p className="text-sm leading-6 text-white/60">
              Generate larger load-test commands for controlled infrastructure.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-5 text-amber-100">
          <p className="font-semibold">Production safety note</p>
          <p className="mt-2 text-sm leading-6 text-amber-100/80">
            Do not run large 100K or 1M request tests directly from the browser
            or against live payment/persistence flows. Use staging and controlled
            k6 scripts.
          </p>
        </div>
      </section>
    </main>
  );
}
