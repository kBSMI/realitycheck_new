import React, { useState, useMemo } from 'react';
import WorkflowSelector from '../components/WorkflowSelector';
import ContinuityScoreMonitor from '../components/ContinuityScoreMonitor';
import RemediationEngine from '../components/RemediationEngine';
import BehavioralEventLog from '../components/BehavioralEventLog';
import WorkflowDependencyMap from '../components/WorkflowDependencyMap';
import AuditLedgerPanel from '../components/AuditLedgerPanel';
import {
  ShieldCheck, TrendingDown, AlertTriangle, CheckCircle2,
  ArrowRight, GitBranch, TrendingUp, BookLock, FileText, Calculator, Anchor,
} from 'lucide-react';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { workflowEvents } from '../data/events';
import { computeAllScores } from '../services/memoryMorphologyEngine';

const Dashboard: React.FC = () => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('wf-001');

  const scores = useMemo(
    () => computeAllScores(workflows, baselines, workflowEvents),
    []
  );

  const approved = scores.filter((s) => s.riskLevel === 'Approved').length;
  const watch = scores.filter((s) => s.riskLevel === 'Watch').length;
  const review = scores.filter((s) => s.riskLevel === 'Review Required').length;
  const quarantine = scores.filter((s) => s.riskLevel === 'Quarantine').length;

  const kpis = [
    {
      label: 'Workflows Approved',
      value: String(approved),
      icon: <CheckCircle2 className="h-5 w-5 text-green-400" />,
      color: 'border-green-800/40 bg-green-900/20',
    },
    {
      label: 'Under Watch',
      value: String(watch),
      icon: <ShieldCheck className="h-5 w-5 text-yellow-400" />,
      color: 'border-yellow-800/40 bg-yellow-900/20',
    },
    {
      label: 'Review Required',
      value: String(review),
      icon: <AlertTriangle className="h-5 w-5 text-orange-400" />,
      color: 'border-orange-800/40 bg-orange-900/20',
    },
    {
      label: 'Quarantined',
      value: String(quarantine),
      icon: <TrendingDown className="h-5 w-5 text-red-400" />,
      color: 'border-red-800/40 bg-red-900/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Live KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-gray-900/80 backdrop-blur-lg border rounded-xl p-4 flex items-center space-x-3 ${kpi.color}`}
          >
            <div className="shrink-0">{kpi.icon}</div>
            <div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
              <p className="text-gray-400 text-xs">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bounded Validation Path + Pilot Evidence Outputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Bounded Validation Path */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-1">
            <ArrowRight className="h-4 w-4 text-cyan-400" />
            <h3 className="text-white text-sm font-semibold">Bounded Validation Path</h3>
          </div>
          <p className="text-gray-500 text-xs mb-4">SMI maps each phase to deterministic evidence — no subjective thresholds</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { n: 1, label: 'Approved Baseline' },
              { n: 2, label: 'Controlled Change' },
              { n: 3, label: 'Continuity Score' },
              { n: 4, label: 'Drift Explanation' },
              { n: 5, label: 'Audit Evidence' },
              { n: 6, label: 'Pilot Report' },
              { n: 7, label: 'Decision Gate' },
            ].map((step, i, arr) => (
              <React.Fragment key={step.n}>
                <div className="flex items-center space-x-1 bg-gray-800/60 border border-gray-700/50 rounded-lg px-2.5 py-1.5">
                  <span className="text-cyan-600 font-mono text-xs font-bold">{step.n}</span>
                  <span className="text-gray-300 text-xs whitespace-nowrap">{step.label}</span>
                </div>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-gray-700 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Pilot Evidence Outputs */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="h-4 w-4 text-cyan-400" />
            <h3 className="text-white text-sm font-semibold">Pilot Evidence Outputs</h3>
          </div>
          <p className="text-gray-500 text-xs mb-4">Structured outputs produced at each lifecycle stage</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Anchor className="h-3.5 w-3.5 text-cyan-500" />, label: 'Baseline Continuity Profile', desc: 'Anchor snapshot of approved AI workflow state' },
              { icon: <TrendingUp className="h-3.5 w-3.5 text-yellow-500" />, label: 'Before/After Score Delta', desc: 'Quantified point change from controlled change events' },
              { icon: <GitBranch className="h-3.5 w-3.5 text-orange-400" />, label: 'Drift Finding', desc: 'Named, categorized, magnitude-rated behavioral deviation' },
              { icon: <BookLock className="h-3.5 w-3.5 text-blue-400" />, label: 'Audit Ledger Record', desc: 'Hash-chained, policy-referenced evidence record' },
              { icon: <FileText className="h-3.5 w-3.5 text-green-400" />, label: 'Pilot Report', desc: 'Structured XOps sign-off document with key findings' },
              { icon: <Calculator className="h-3.5 w-3.5 text-gray-400" />, label: 'Cost-Avoidance Variables', desc: 'Score delta, event type, remediation effort, risk level' },
            ].map((item) => (
              <div key={item.label} className="flex items-start space-x-2 bg-gray-800/40 rounded-lg p-2.5">
                <div className="shrink-0 mt-0.5">{item.icon}</div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-medium leading-tight">{item.label}</p>
                  <p className="text-gray-500 text-xs leading-tight mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <WorkflowSelector onSelect={setSelectedWorkflowId} selectedId={selectedWorkflowId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ContinuityScoreMonitor workflowId={selectedWorkflowId} />
          <RemediationEngine workflowId={selectedWorkflowId} />
          <BehavioralEventLog workflowId={selectedWorkflowId} />
        </div>
        <div className="space-y-6">
          <WorkflowDependencyMap />
          <AuditLedgerPanel sessionId="session-pilot-001" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
