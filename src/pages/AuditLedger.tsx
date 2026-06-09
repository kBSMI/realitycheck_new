import React, { useState } from 'react';
import { getLedger, getLedgerStats } from '../services/auditLedgerService';
import { AuditLedgerRecord, AuditAction } from '../types/smi';
import { BookLock, Download, Hash, Clock, Filter } from 'lucide-react';

type ActionFilter = 'all' | AuditAction;

const actionBadge = (action: AuditAction) => {
  switch (action) {
    case 'baseline_captured': return 'bg-cyan-500/10 text-cyan-400 border-cyan-800/50';
    case 'workflow_approved': return 'bg-green-500/10 text-green-400 border-green-800/50';
    case 'workflow_quarantined': return 'bg-red-500/10 text-red-400 border-red-800/50';
    case 'drift_detected': return 'bg-orange-500/10 text-orange-400 border-orange-800/50';
    case 'f5_simulation_run': return 'bg-blue-500/10 text-blue-400 border-blue-800/50';
    case 'xops_review_completed': return 'bg-green-500/10 text-green-300 border-green-800/50';
    case 'remediation_applied': return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/50';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-700';
  }
};

const riskBadge = (level: string) => {
  switch (level) {
    case 'Approved': return 'text-green-400';
    case 'Watch': return 'text-yellow-400';
    case 'Review Required': return 'text-orange-400';
    case 'Quarantine': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const actionFilters: { id: ActionFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'baseline_captured', label: 'Baseline' },
  { id: 'drift_detected', label: 'Drift' },
  { id: 'workflow_quarantined', label: 'Quarantine' },
  { id: 'score_computed', label: 'Score' },
  { id: 'f5_simulation_run', label: 'F5 Sim' },
  { id: 'xops_review_completed', label: 'XOps Review' },
];

const AuditLedger: React.FC = () => {
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const allRecords = getLedger();
  const stats = getLedgerStats('session-pilot-001');

  const records = actionFilter === 'all'
    ? allRecords
    : allRecords.filter((r) => r.action === actionFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Ledger</h2>
          <p className="text-gray-400 text-sm mt-1">
            Append-only record of all SMI continuity events. Each entry is policy-referenced,
            actor-attributed, and snapshots the continuity score at the moment of writing.
          </p>
        </div>
        <button className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 shrink-0 ml-4">
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Records', value: stats.totalRecords, color: 'text-white' },
          { label: 'Workflows', value: stats.uniqueWorkflows, color: 'text-cyan-400' },
          { label: 'Drift Events', value: stats.driftEvents, color: 'text-orange-400' },
          { label: 'Quarantine', value: stats.quarantineEvents, color: 'text-red-400' },
          { label: 'F5 Sim Runs', value: stats.f5Events, color: 'text-blue-400' },
          { label: 'Session Score', value: stats.sessionAuditScore, color: 'text-cyan-400' },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900/80 border border-gray-800 rounded-xl p-3">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center flex-wrap gap-2 bg-gray-900/80 border border-gray-800 rounded-xl p-3">
        <Filter className="h-4 w-4 text-gray-500 shrink-0" />
        {actionFilters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActionFilter(f.id)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors duration-150 ${
              actionFilter === f.id
                ? 'bg-cyan-700 border border-cyan-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-gray-600 text-xs">{records.length} records</span>
      </div>

      {/* Ledger entries */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 text-xs text-gray-500 uppercase tracking-widest px-5 py-3 border-b border-gray-800 bg-gray-800/40 font-medium gap-2">
          <span className="col-span-2">Action</span>
          <span className="col-span-1">Score</span>
          <span className="col-span-1">Risk</span>
          <span className="col-span-2">Workflow</span>
          <span className="col-span-2">Policy Ref</span>
          <span className="col-span-1">Time</span>
          <span className="col-span-3 text-right">Hash Chain</span>
        </div>
        <div className="divide-y divide-gray-800">
          {records.map((r: AuditLedgerRecord) => (
            <div key={r.id} className="px-5 py-3 hover:bg-gray-800/30 transition-colors duration-150">
              {/* Desktop row */}
              <div className="hidden lg:grid grid-cols-12 items-start gap-2 text-sm">
                <div className="col-span-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${actionBadge(r.action)}`}>
                    {r.action.replace(/_/g, ' ')}
                  </span>
                </div>
                <span className="col-span-1 text-cyan-400 font-bold">{r.continuityScoreSnapshot}</span>
                <span className={`col-span-1 text-xs font-medium ${riskBadge(r.riskLevelSnapshot)}`}>{r.riskLevelSnapshot}</span>
                <span className="col-span-2 text-gray-300 text-xs truncate">{r.workflowId}</span>
                <span className="col-span-2 text-cyan-700 text-xs font-mono truncate">{r.policyRef}</span>
                <div className="col-span-1 flex items-center space-x-1 text-gray-500 text-xs">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">{fmt(r.timestamp)}</span>
                </div>
                <div className="col-span-3 flex flex-col items-end space-y-0.5">
                  <span
                    title={`Current: ${r.currentHash}`}
                    className="flex items-center space-x-1 text-cyan-700 text-xs font-mono cursor-help hover:text-cyan-500 transition-colors"
                  >
                    <Hash className="h-3 w-3 shrink-0" />
                    <span>{r.currentHash.slice(0, 8)}</span>
                  </span>
                  <span
                    title={`Previous: ${r.previousHash}`}
                    className="text-gray-600 text-xs font-mono cursor-help"
                  >
                    ↑ {r.previousHash.slice(0, 8)}
                  </span>
                </div>
              </div>

              {/* Mobile card */}
              <div className="lg:hidden space-y-1">
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${actionBadge(r.action)}`}>
                    {r.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500 text-xs">{fmt(r.timestamp)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-cyan-400 font-bold text-sm">{r.continuityScoreSnapshot}</span>
                  <span className={`text-xs ${riskBadge(r.riskLevelSnapshot)}`}>{r.riskLevelSnapshot}</span>
                  <span className="text-gray-500 text-xs">{r.workflowId}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed truncate">{r.detail}</p>
                <div className="flex items-center space-x-2 pt-0.5">
                  <span className="flex items-center space-x-1 text-cyan-800 text-xs font-mono">
                    <Hash className="h-3 w-3" />
                    <span>{r.currentHash.slice(0, 8)}</span>
                  </span>
                  <span className="text-gray-700 text-xs font-mono">← {r.previousHash.slice(0, 8)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center space-x-2 mb-2">
          <BookLock className="h-4 w-4 text-cyan-500" />
          <h4 className="text-gray-300 font-medium">Hash-Chained Ledger Integrity</h4>
        </div>
        <p className="text-gray-500 text-sm leading-relaxed">
          Every record is linked to the previous via a deterministic djb2 hash chain. The
          <span className="text-cyan-700 font-mono text-xs mx-1">currentHash</span>
          covers all record fields including the
          <span className="text-cyan-700 font-mono text-xs mx-1">previousHash</span>,
          so any retroactive modification breaks the chain and is immediately detectable.
          Each record also carries a policy reference, actor ID, session ID, and continuity score
          snapshot from the SMI engine at the moment of the recorded action — providing verifiable
          evidence for XOps review, compliance reporting, and enterprise governance.
        </p>
      </div>
    </div>
  );
};

export default AuditLedger;
