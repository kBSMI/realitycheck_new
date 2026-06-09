import React, { useMemo } from 'react';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { workflowEvents } from '../data/events';
import { computeAllScores } from '../services/memoryMorphologyEngine';
import { Anchor, CheckCircle2, Clock, AlertTriangle, XCircle, Eye, Shield } from 'lucide-react';

const statusIcon = (status: string) => {
  switch (status) {
    case 'Approved': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'Watch': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case 'Review Required': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
    case 'Quarantine': return <XCircle className="h-4 w-4 text-red-400" />;
    default: return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
  }
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'Approved': return 'bg-green-500/10 text-green-400 border-green-800/50';
    case 'Watch': return 'bg-yellow-500/10 text-yellow-400 border-yellow-800/50';
    case 'Review Required': return 'bg-orange-500/10 text-orange-400 border-orange-800/50';
    case 'Quarantine': return 'bg-red-500/10 text-red-400 border-red-800/50';
    default: return 'bg-blue-500/10 text-blue-400 border-blue-800/50';
  }
};

const scoreBarColor = (score: number) => {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-400';
  if (score >= 60) return 'bg-orange-500';
  return 'bg-red-500';
};

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const WorkflowBaselines: React.FC = () => {
  const scores = useMemo(
    () => computeAllScores(workflows, baselines, workflowEvents),
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Workflow Baselines</h2>
          <p className="text-gray-400 text-sm mt-1">
            Baseline anchors define the approved behavioral state for each AI workflow. Continuity scores
            are computed as delta from the captured anchor. All scores below are live engine output.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {workflows.map((wf) => {
          const baseline = baselines.find((b) => b.workflowId === wf.id);
          const score = scores.find((s) => s.workflowId === wf.id);
          if (!baseline || !score) return null;

          return (
            <div
              key={wf.id}
              className="bg-gray-900/80 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors duration-200"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {statusIcon(score.riskLevel)}
                  <h3 className="text-white font-semibold">{wf.name}</h3>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(score.riskLevel)}`}>
                  {score.riskLevel}
                </span>
              </div>

              <p className="text-gray-400 text-sm mb-4">{wf.description}</p>

              {/* Live score */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Live Continuity Score (engine output)</span>
                  <span className="text-white font-semibold">{score.continuityScore} / 100</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${scoreBarColor(score.continuityScore)}`}
                    style={{ width: `${score.continuityScore}%` }}
                  />
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Drift Score', value: score.driftScore, invert: true },
                  { label: 'Policy Alignment', value: score.policyAlignment, invert: false },
                  { label: 'Tool Variance', value: score.toolBehaviorVariance, invert: false },
                  { label: 'State Degradation', value: score.stateDegradation, invert: true },
                ].map((sub) => (
                  <div key={sub.label} className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <p className="text-gray-500 text-xs">{sub.label}</p>
                    <p className={`text-sm font-semibold ${
                      sub.invert
                        ? sub.value > 50 ? 'text-red-400' : 'text-green-400'
                        : sub.value >= 75 ? 'text-green-400' : sub.value >= 50 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {sub.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Deduction summary */}
              {score.deductions.length > 0 && (
                <div className="mb-4 bg-gray-800/40 rounded-lg p-3">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">Score deductions</p>
                  <div className="space-y-1">
                    {score.deductions.slice(0, 3).map((d, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-400">{d.reason.replace(/_/g, ' ')}</span>
                        <span className="text-red-400 font-mono">-{d.points}</span>
                      </div>
                    ))}
                    {score.deductions.length > 3 && (
                      <p className="text-gray-600 text-xs">+{score.deductions.length - 3} more</p>
                    )}
                  </div>
                </div>
              )}

              {/* Baseline config */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center space-x-2 text-xs">
                  <Shield className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  <span className="text-gray-500">Baseline policy:</span>
                  <span className="text-cyan-400 font-mono">{baseline.policyConfig.version}</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500">Live policy:</span>
                  <span className={`font-mono ${wf.policyConfig.version === baseline.policyConfig.version ? 'text-green-400' : 'text-red-400'}`}>
                    {wf.policyConfig.version}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <Eye className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                  <span className="text-gray-500">Baseline model:</span>
                  <span className="text-cyan-400 font-mono">{baseline.modelConfig.version}</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-500">Live:</span>
                  <span className={`font-mono ${wf.modelConfig.version === baseline.modelConfig.version ? 'text-green-400' : 'text-red-400'}`}>
                    {wf.modelConfig.version}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
                <div className="flex items-center space-x-1.5">
                  <Anchor className="h-3.5 w-3.5 text-cyan-600" />
                  <span className="font-mono">{baseline.id}</span>
                  <span className="text-gray-700">·</span>
                  <span>{baseline.capturedBy}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{fmt(baseline.capturedAt)}</span>
                </div>
              </div>

              {/* Recommended action */}
              <div className="mt-3 pt-3 border-t border-gray-800">
                <p className="text-gray-500 text-xs leading-relaxed">{score.recommendedAction}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <h4 className="text-gray-300 font-medium mb-2">About Baseline Anchors</h4>
        <p className="text-gray-500 text-sm leading-relaxed">
          SMI Baseline Anchors capture a deterministic snapshot of model configuration, prompt hash,
          and policy version at the moment of XOps approval. All subsequent continuity scores are
          computed as point deductions from 100 based on measured delta from the anchor. Anchors are
          stored in the Audit Ledger and cannot be modified retroactively.
        </p>
      </div>
    </div>
  );
};

export default WorkflowBaselines;
