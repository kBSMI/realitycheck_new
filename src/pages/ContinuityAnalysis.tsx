import React, { useState, useMemo } from 'react';
import WorkflowSelector from '../components/WorkflowSelector';
import ContinuityScoreMonitor from '../components/ContinuityScoreMonitor';
import RemediationEngine from '../components/RemediationEngine';
import BehavioralEventLog from '../components/BehavioralEventLog';
import WorkflowDependencyMap from '../components/WorkflowDependencyMap';
import { BarChart3, TrendingDown, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { workflows, baselines, workflowEvents } from '../services/continuityService';
import { computeAllScores } from '../services/memoryMorphologyEngine';
import { detectAllDrift } from '../services/driftDetectionService';
import { DriftFinding } from '../types/smi';

const severityColor = (s: string) => {
  switch (s) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-800/50';
    case 'high': return 'text-orange-400 bg-orange-500/10 border-orange-800/50';
    case 'medium': return 'text-yellow-400 bg-yellow-500/10 border-yellow-800/50';
    default: return 'text-blue-400 bg-blue-500/10 border-blue-800/50';
  }
};

const severityIcon = (s: string) => {
  if (s === 'critical') return <ShieldAlert className="h-4 w-4 text-red-400" />;
  if (s === 'high') return <AlertTriangle className="h-4 w-4 text-orange-400" />;
  return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
};

const magnitudeBar = (mag: number) => {
  if (mag >= 70) return 'bg-red-500';
  if (mag >= 40) return 'bg-orange-500';
  return 'bg-yellow-500';
};

const ContinuityAnalysis: React.FC = () => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('wf-001');

  // Compute all scores and drift findings using the real engine
  const allScores = useMemo(
    () => computeAllScores(workflows, baselines, workflowEvents),
    []
  );

  const allFindings: DriftFinding[] = useMemo(
    () => detectAllDrift(workflows, baselines, workflowEvents, allScores),
    [allScores]
  );

  const criticalAndHigh = allFindings.filter(
    (f) => f.severity === 'critical' || f.severity === 'high'
  );

  const selectedScore = allScores.find((s) => s.workflowId === selectedWorkflowId);

  const wfName = (id: string) => workflows.find((w) => w.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Continuity Analysis</h2>
        <p className="text-gray-400 text-sm mt-1">
          Live engine output from the SMI Memory Morphology Engine and Drift Detection Service.
          All scores are computed deterministically from baseline delta.
        </p>
      </div>

      {/* Score summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {allScores.map((s) => (
          <button
            key={s.workflowId}
            onClick={() => setSelectedWorkflowId(s.workflowId)}
            className={`text-left bg-gray-900/80 border rounded-xl p-4 transition-colors duration-150 hover:border-gray-700 ${
              s.workflowId === selectedWorkflowId ? 'border-cyan-700' : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-gray-400 text-xs truncate pr-1">{wfName(s.workflowId)}</span>
              {s.riskLevel === 'Approved' && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />}
              {s.riskLevel === 'Watch' && <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
              {(s.riskLevel === 'Review Required' || s.riskLevel === 'Quarantine') && <ShieldAlert className="h-3.5 w-3.5 text-red-400 shrink-0" />}
            </div>
            <p className="text-2xl font-bold text-white">{s.continuityScore}</p>
            <p className={`text-xs font-medium mt-0.5 ${
              s.riskLevel === 'Approved' ? 'text-green-400' :
              s.riskLevel === 'Watch' ? 'text-yellow-400' :
              'text-red-400'
            }`}>{s.riskLevel}</p>
          </button>
        ))}
      </div>

      {/* Drift Findings from real engine */}
      {criticalAndHigh.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-4">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <h3 className="text-white font-semibold">Active Drift Findings</h3>
            <span className="text-xs px-2 py-0.5 bg-red-500/10 border border-red-800/50 text-red-400 rounded-full font-medium">
              {criticalAndHigh.length} active
            </span>
          </div>
          <div className="space-y-3">
            {criticalAndHigh.map((f) => (
              <div key={f.id} className="bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {severityIcon(f.severity)}
                    <div>
                      <span className="text-white font-medium text-sm">{wfName(f.workflowId)}</span>
                      <span className="text-gray-500 text-xs ml-2">{f.category.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${severityColor(f.severity)}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="text-white font-medium text-sm mb-1">{f.title}</p>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">{f.description}</p>
                <div className="flex items-center space-x-3 text-xs">
                  <div className="flex items-center space-x-2 flex-1">
                    <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
                    <span className="text-gray-500">Drift magnitude</span>
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden max-w-[120px]">
                      <div className={`h-full ${magnitudeBar(f.driftMagnitude)} rounded-full`} style={{ width: `${f.driftMagnitude}%` }} />
                    </div>
                    <span className="text-gray-400 font-mono">{f.driftMagnitude}%</span>
                  </div>
                  {f.requiresRemediation && (
                    <span className="text-orange-400 font-medium">Remediation required</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected workflow detail view */}
      <div>
        <div className="mb-4">
          <h3 className="text-white font-semibold mb-1">Per-Workflow Deep Dive</h3>
          {selectedScore && (
            <p className="text-gray-400 text-xs">
              Sub-scores for <span className="text-white">{wfName(selectedWorkflowId)}</span> —
              Drift: <span className="text-white">{selectedScore.driftScore}</span> /
              Policy alignment: <span className="text-white">{selectedScore.policyAlignment}</span> /
              Tool variance: <span className="text-white">{selectedScore.toolBehaviorVariance}</span> /
              State degradation: <span className="text-white">{selectedScore.stateDegradation}</span>
            </p>
          )}
        </div>
        <WorkflowSelector onSelect={setSelectedWorkflowId} selectedId={selectedWorkflowId} />
      </div>

      {/* Score deduction breakdown */}
      {selectedScore && selectedScore.deductions.length > 0 && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
          <h4 className="text-white font-semibold mb-3 text-sm">Score Deduction Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500 uppercase tracking-widest pb-1 border-b border-gray-800">
              <span>Event type</span>
              <span className="flex space-x-8"><span>Pts</span><span>Event ID</span></span>
            </div>
            {selectedScore.deductions.map((d, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="text-gray-300">{d.reason.replace(/_/g, ' ')}</span>
                <div className="flex items-center space-x-8">
                  <span className="text-red-400 font-bold w-8 text-right">-{d.points}</span>
                  <span className="text-gray-600 font-mono text-xs w-24 text-right truncate">{d.eventId}</span>
                </div>
              </div>
            ))}
            <div className="flex justify-between text-sm font-semibold pt-2 border-t border-gray-800">
              <span className="text-gray-300">Total deducted</span>
              <span className="text-red-400">-{selectedScore.totalDeducted}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span className="text-gray-300">Final continuity score</span>
              <span className="text-white">{selectedScore.continuityScore} / 100</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <ContinuityScoreMonitor workflowId={selectedWorkflowId} />
          <BehavioralEventLog workflowId={selectedWorkflowId} />
        </div>
        <div className="space-y-6">
          <RemediationEngine workflowId={selectedWorkflowId} />
          <WorkflowDependencyMap />
        </div>
      </div>
    </div>
  );
};

export default ContinuityAnalysis;
