import { Activity, CreditCard, KeyRound, ServerCog, Users } from 'lucide-react';
import { listApiKeyRecords, listSLAObservationRecords, listSMIJobRecords, listTenantProfiles } from '../services/repositories/enterpriseRuntimeRepository';
import { supportCreditRepository } from '../services/repositories/supportCreditRepository';
import { realityCheckRepository } from '../services/repositories/realityCheckRepository';
import { useEffect, useState } from 'react';

interface AdminCounts {
  reports: number;
  ledger: number;
}

const StatCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
    <div className="mb-3 text-cyan-300">{icon}</div>
    <p className="text-3xl font-black text-white">{value}</p>
    <p className="text-xs uppercase tracking-[0.25em] text-gray-500">{label}</p>
  </div>
);

export default function AdminPage() {
  const [counts, setCounts] = useState<AdminCounts>({ reports: 0, ledger: 0 });
  const tenants = listTenantProfiles();
  const apiKeys = listApiKeyRecords();
  const jobs = listSMIJobRecords();
  const sla = listSLAObservationRecords();

  useEffect(() => {
    Promise.all([
      realityCheckRepository.listRealityChecks(),
      supportCreditRepository.listLedger(),
    ]).then(([reports, ledger]) => setCounts({ reports: reports.length, ledger: ledger.length }));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 text-gray-200">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Production operations</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Admin Console</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-500">
          Operational view for tenants, API keys, payments, ledger corrections, jobs, SLA status, and report persistence. Cloud writes use Supabase when configured; local fallback remains available for review.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Tenants" value={tenants.length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="API keys" value={apiKeys.length} icon={<KeyRound className="h-5 w-5" />} />
        <StatCard label="Jobs" value={jobs.length} icon={<ServerCog className="h-5 w-5" />} />
        <StatCard label="SLA observations" value={sla.length} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Ledger entries" value={counts.ledger} icon={<CreditCard className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="font-semibold text-white">Recent Jobs</h2>
          <div className="mt-3 space-y-2">
            {jobs.slice(0, 6).map((job) => (
              <div key={job.id} className="rounded-xl bg-black/25 px-3 py-2 text-xs">
                <p className="font-mono text-gray-300">{job.id}</p>
                <p className="text-gray-500">{job.status} · {job.slaClass} · {job.tenantId}</p>
              </div>
            ))}
            {jobs.length === 0 && <p className="text-sm text-gray-500">No jobs persisted yet.</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <h2 className="font-semibold text-white">SLA Status</h2>
          <div className="mt-3 space-y-2">
            {sla.slice(0, 6).map((item) => (
              <div key={`${item.observedAt}-${item.slaClass}`} className="rounded-xl bg-black/25 px-3 py-2 text-xs">
                <p className="text-gray-300">{item.slaClass} · {Math.round(item.durationMs)}ms / {item.targetMs}ms</p>
                <p className={item.withinTarget ? 'text-green-400' : 'text-red-400'}>{item.withinTarget ? 'Within target' : 'Outside target'}</p>
              </div>
            ))}
            {sla.length === 0 && <p className="text-sm text-gray-500">No SLA observations persisted yet.</p>}
          </div>
        </section>
      </div>

      <p className="text-xs text-gray-600">Report records: {counts.reports}. Ledger corrections and tenant/API-key mutation controls should be guarded by role-based Supabase policies before public admin use.</p>
    </div>
  );
}
