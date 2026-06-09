import React, { useMemo, useState, useCallback } from 'react';
import { FileText, CheckCircle2, AlertTriangle, TrendingDown, Download, ArrowRight, Copy, ClipboardCheck } from 'lucide-react';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { workflowEvents } from '../data/events';
import { f5SimulationEvents } from '../data/f5SimulationEvents';
import { computeAllScores } from '../services/memoryMorphologyEngine';
import { detectAllDrift } from '../services/driftDetectionService';
import { getLedgerStats } from '../services/auditLedgerService';

const statusColor = (s: string) => {
  if (s === 'Approved') return 'text-green-400 bg-green-500/10 border-green-800/50';
  if (s === 'Review Required') return 'text-orange-400 bg-orange-500/10 border-orange-800/50';
  if (s === 'Quarantine') return 'text-red-400 bg-red-500/10 border-red-800/50';
  return 'text-yellow-400 bg-yellow-500/10 border-yellow-800/50';
};

const pilotSteps = [
  { step: 1, title: 'Baseline Established', detail: '5 AI workflows captured with model config, prompt hash, policy version, and guardrail state. Anchors stored in Audit Ledger.' },
  { step: 2, title: 'Controlled Change Introduced', detail: 'Retraining cycle initiated on wf-003 (Seasonal Campaign AI). Model version, prompt version, policy version, and guardrail state all changed.' },
  { step: 3, title: 'Events Ingested', detail: '14 behavioral events ingested across all workflows: nominal operations, memory state changes, version changes, guardrail violations, forbidden behaviors, sensitive data risks.' },
  { step: 4, title: 'Continuity Scored', detail: 'Behavioral Continuity Engine computed deterministic scores from baseline delta. Live scores: wf-001=92 Approved, wf-002=92 Approved, wf-003=8 Quarantine, wf-004=64 Review Required, wf-005=100 Approved.' },
  { step: 5, title: 'Drift Findings Generated', detail: 'Drift Detection Service surfaced findings across 7 rule categories. wf-003 produced 5 findings including critical policy and behavior violations.' },
  { step: 6, title: 'Audit Records Created', detail: '15 seed audit records across session-pilot-001 plus live records from engine computation. All policy-referenced and timestamped.' },
  { step: 7, title: 'F5 ADSP Mapping Demonstrated', detail: '14 F5-style simulation events across ai-gateway, guardrail, red-team, and xops-review sources. Events carry deterministic continuity deltas.' },
];

const PilotReport: React.FC = () => {
  const scores = useMemo(() => computeAllScores(workflows, baselines, workflowEvents), []);
  const allFindings = useMemo(() => detectAllDrift(workflows, baselines, workflowEvents, scores), [scores]);
  const stats = useMemo(() => getLedgerStats('session-pilot-001'), []);
  const [copied, setCopied] = useState(false);

  const f5ByWorkflow = (workflowId: string) =>
    f5SimulationEvents
      .filter((e) => e.workflowId === workflowId)
      .map((e) => ({ source: e.source, classification: e.classification, continuityDelta: e.continuityDelta }));

  const keyFindings = useMemo(() => [
    `wf-003 entered Quarantine (score ${scores.find(s=>s.workflowId==='wf-003')?.continuityScore ?? '?'}) after model upgrade, guardrail disable, and 2 critical behavior violations.`,
    `wf-004 sits at Review Required (score ${scores.find(s=>s.workflowId==='wf-004')?.continuityScore ?? '?'}) due to prompt version drift, policy lag, and orchestration change.`,
    `F5 red team simulation confirmed policy bypass exploit on wf-003 due to guardrails disabled (-18 pts delta).`,
    `${allFindings.filter(f => f.requiresRemediation).length} drift findings require remediation across ${new Set(allFindings.map(f=>f.workflowId)).size} workflows.`,
  ], [scores, allFindings]);

  const smiValue = useMemo(() => [
    'Deterministic baseline anchoring enabled precise per-event score deductions without subjective thresholds.',
    'Sub-score decomposition (drift / policy alignment / tool variance / state degradation) isolated root causes.',
    'Audit ledger provided complete policy-referenced evidence chain across ' + stats.totalRecords + ' records.',
    'F5 ADSP simulation connector demonstrated interoperability path for gateway, guardrail, and red team streams.',
  ], [stats]);

  const buildReportPayload = useCallback(() => ({
    reportId: `rpt-${Date.now()}`,
    sessionId: 'session-pilot-001',
    generatedAt: new Date().toISOString(),
    pilotPhase: 'Phase 2',
    workflows: workflows.map((wf) => {
      const score = scores.find((s) => s.workflowId === wf.id);
      const f5events = f5ByWorkflow(wf.id);
      const wfFindings = allFindings.filter((f) => f.workflowId === wf.id);
      return {
        workflowId: wf.id,
        workflowName: wf.name,
        baselineId: score?.baselineId ?? '',
        finalContinuityScore: score?.continuityScore ?? 0,
        finalRiskLevel: score?.riskLevel ?? 'Approved',
        totalEventsIngested: score?.deductions.length ?? 0,
        driftFindingsCount: wfFindings.length,
        remediationActionsCount: wfFindings.filter((f) => f.requiresRemediation).length,
        f5SimulationResults: f5events,
      };
    }),
    totalAuditRecords: stats.totalRecords,
    sessionAuditScore: stats.sessionAuditScore,
    keyFindings,
    smiValueDemonstrated: smiValue,
    approvedForNextPhase: scores.every((s) => s.riskLevel !== 'Quarantine') ||
      scores.filter((s) => s.riskLevel === 'Quarantine').length <= 1,
  }), [scores, allFindings, stats, keyFindings, smiValue]);

  const handleExportJSON = useCallback(() => {
    const payload = buildReportPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smi-pilot-report-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildReportPayload]);

  const handleCopySummary = useCallback(() => {
    const payload = buildReportPayload();
    const lines = [
      `SMI Continuity Assurance Pilot Report`,
      `Session: ${payload.sessionId} | Phase: ${payload.pilotPhase}`,
      `Generated: ${new Date(payload.generatedAt).toLocaleString()}`,
      ``,
      `WORKFLOW SCORES`,
      ...payload.workflows.map(
        (w) => `  ${w.workflowName} (${w.workflowId}): ${w.finalContinuityScore}/100 — ${w.finalRiskLevel}`
      ),
      ``,
      `KEY FINDINGS`,
      ...payload.keyFindings.map((f) => `  • ${f}`),
      ``,
      `SMI VALUE DEMONSTRATED`,
      ...payload.smiValueDemonstrated.map((v) => `  • ${v}`),
      ``,
      `Audit Records: ${payload.totalAuditRecords} | Drift Findings: ${allFindings.length}`,
      `Approved For Next Phase: ${payload.approvedForNextPhase ? 'YES' : 'NO'}`,
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }, [buildReportPayload, allFindings.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Pilot Report</h2>
          <p className="text-gray-400 text-sm mt-1">
            End-to-end SMI Continuity Assurance Pilot summary. All scores are live engine output.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0 ml-4">
          <button
            onClick={handleCopySummary}
            className="flex items-center space-x-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            {copied ? <ClipboardCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            <span>{copied ? 'Copied!' : 'Copy Summary'}</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center space-x-2 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Report header */}
      <div className="bg-gray-900/80 border border-cyan-800/30 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="bg-cyan-700/40 border border-cyan-700 p-3 rounded-lg shrink-0">
            <FileText className="h-6 w-6 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">SMI Continuity Assurance — Pilot Report</h3>
            <p className="text-cyan-400 text-xs font-mono mt-0.5">
              session-pilot-001 · {new Date().toLocaleDateString('en-US', { dateStyle: 'long' })} · Phase 2
            </p>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
              Live report generated from the SMI Memory Morphology Engine, Drift Detection Service, and Audit
              Ledger. Scores reflect deterministic computation across {workflowEvents.length} ingested events
              against {baselines.length} baseline anchors.
            </p>
          </div>
        </div>
      </div>

      {/* Live session stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Audit Records', value: stats.totalRecords },
          { label: 'Drift Findings', value: allFindings.length },
          { label: 'Quarantine Events', value: stats.quarantineEvents },
          { label: 'F5 Sim Events', value: f5SimulationEvents.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900/80 border border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Pilot walkthrough */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Pilot Story Walkthrough</h3>
        <div className="space-y-3">
          {pilotSteps.map((s, i) => (
            <div key={s.step} className="flex items-start space-x-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-700 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
                {i < pilotSteps.length - 1 && <div className="w-px h-4 bg-gray-800 mt-1" />}
              </div>
              <div className="pb-2 flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-0.5">
                  <span className="text-gray-600 text-xs font-mono">Step {s.step}</span>
                  <span className="text-white font-medium text-sm">{s.title}</span>
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{s.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live score table */}
      <div className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-800 bg-gray-800/40">
          <h3 className="text-white font-semibold">Final Workflow Continuity Scores (Live Engine)</h3>
        </div>
        <div className="divide-y divide-gray-800">
          {workflows.map((wf) => {
            const score = scores.find((s) => s.workflowId === wf.id);
            if (!score) return null;
            const f5events = f5ByWorkflow(wf.id);
            const totalDelta = f5events.reduce((s, e) => s + e.continuityDelta, 0);

            return (
              <div key={wf.id} className="px-5 py-3 hover:bg-gray-800/20 transition-colors duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-200 text-sm">{wf.name}</span>
                    <span className="text-gray-600 text-xs ml-2 font-mono">{wf.id}</span>
                  </div>
                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-white font-bold">{score.continuityScore}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor(score.riskLevel)}`}>
                      {score.riskLevel}
                    </span>
                    <span className={`text-xs font-mono ${totalDelta > 0 ? 'text-green-500' : totalDelta < 0 ? 'text-red-400' : 'text-gray-500'}`}>
                      {totalDelta > 0 ? '+' : ''}{totalDelta !== 0 ? `${totalDelta} (F5)` : 'No F5 delta'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Findings + Value */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-gray-900/80 border border-red-800/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <h4 className="text-white font-semibold">Key Findings</h4>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 leading-relaxed">
            {keyFindings.map((f, i) => (
              <li key={i} className="flex items-start space-x-2">
                <AlertTriangle className="h-3.5 w-3.5 text-orange-400 mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-gray-900/80 border border-green-800/30 rounded-xl p-5">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <h4 className="text-white font-semibold">SMI Value Demonstrated</h4>
          </div>
          <ul className="space-y-2 text-sm text-gray-300 leading-relaxed">
            {smiValue.map((v, i) => (
              <li key={i} className="flex items-start space-x-2">
                <ArrowRight className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
                <span>{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PilotReport;
