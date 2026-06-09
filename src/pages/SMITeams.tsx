import React, { useState, useEffect } from 'react';
import {
  Users, Play, Trash2, BarChart3, CheckCircle2, AlertTriangle,
  Copy, ClipboardCheck, BookmarkPlus, BookmarkCheck,
} from 'lucide-react';
import { scoreTeamConsistency } from '../services/realityCheckService';
import {
  saveTeamComparison, loadTeamComparisons, removeTeamComparison,
} from '../services/realityCheckStorageService';
import type { TeamComparisonResult } from '../types/realityCheck';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function consistencyColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function consistencyBg(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function consistencyLabel(score: number): string {
  if (score >= 80) return 'Highly Consistent';
  if (score >= 60) return 'Moderately Consistent';
  if (score >= 40) return 'Moderate Drift';
  return 'High Drift';
}

// ─── Result Card ──────────────────────────────────────────────────────────────

const ComparisonResultCard: React.FC<{
  result: TeamComparisonResult;
  onSave?: () => void;
  saved?: boolean;
}> = ({ result, onSave, saved }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.correctionPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Score header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-800 bg-gradient-to-r from-gray-900/60 to-gray-900/20">
        <div className="flex-1">
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-0.5">Team Consistency Score</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold font-mono ${consistencyColor(result.consistencyScore)}`}>
              {result.consistencyScore}
            </span>
            <span className="text-gray-600 text-sm">/100</span>
            <span className={`text-sm font-semibold ${consistencyColor(result.consistencyScore)}`}>
              {consistencyLabel(result.consistencyScore)}
            </span>
          </div>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            disabled={saved}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-150 ${
              saved
                ? 'bg-green-900/20 border-green-800/40 text-green-400 cursor-default'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
            }`}
          >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
            {saved ? 'Saved' : 'Save Report'}
          </button>
        )}
      </div>

      {/* Score bar */}
      <div className="px-5 pt-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${consistencyBg(result.consistencyScore)}`}
            style={{ width: `${result.consistencyScore}%` }}
          />
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Drift explanations */}
        <div>
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-2">Drift Analysis</p>
          <div className="space-y-1.5">
            {result.driftExplanations.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {result.consistencyScore >= 70
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                </span>
                <p className="text-gray-400 text-xs leading-relaxed">{e}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Correction prompt */}
        <div className="bg-cyan-900/10 border border-cyan-900/30 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-cyan-600 text-[10px] font-semibold uppercase tracking-widest">Correction Prompt</p>
            <button onClick={handleCopy} className="text-gray-600 hover:text-gray-300 transition-colors" title="Copy prompt">
              {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <p className="text-cyan-300 text-xs font-mono leading-relaxed">{result.correctionPrompt}</p>
        </div>

        <p className="text-gray-700 text-[10px] font-mono text-right">{result.savedAt}</p>
      </div>
    </div>
  );
};

// ─── Saved report row ─────────────────────────────────────────────────────────

const SavedReportRow: React.FC<{
  result: TeamComparisonResult;
  onDelete: () => void;
}> = ({ result, onDelete }) => (
  <div className="flex items-center justify-between px-4 py-3 bg-gray-900/40 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors">
    <div className="min-w-0 flex-1">
      <p className="text-gray-300 text-sm font-medium truncate">{result.projectName || 'Unnamed project'}</p>
      <p className="text-gray-600 text-xs">{result.savedAt.slice(0, 10)}</p>
    </div>
    <div className="flex items-center gap-3 shrink-0 ml-3">
      <span className={`text-sm font-bold font-mono ${consistencyColor(result.consistencyScore)}`}>
        {result.consistencyScore}/100
      </span>
      <button
        onClick={onDelete}
        className="text-gray-700 hover:text-red-500 transition-colors"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const textareaClass = 'w-full bg-gray-900 border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-3 placeholder-gray-600 focus:outline-none focus:border-cyan-700 leading-relaxed resize-none transition-colors';

const SMITeams: React.FC = () => {
  const [projectName,     setProjectName]     = useState('');
  const [baselineOutput,  setBaselineOutput]  = useState('');
  const [newOutput,       setNewOutput]       = useState('');
  const [result,          setResult]          = useState<TeamComparisonResult | null>(null);
  const [saved,           setSaved]           = useState(false);
  const [savedReports,    setSavedReports]    = useState<TeamComparisonResult[]>([]);

  useEffect(() => {
    setSavedReports(loadTeamComparisons());
  }, []);

  const handleCompare = () => {
    const r = scoreTeamConsistency(projectName || 'Unnamed project', baselineOutput, newOutput);
    setResult(r);
    setSaved(false);
  };

  const handleSave = () => {
    if (!result) return;
    saveTeamComparison(result);
    setSaved(true);
    setSavedReports(loadTeamComparisons());
  };

  const handleDelete = (id: string) => {
    removeTeamComparison(id);
    setSavedReports(loadTeamComparisons());
  };

  const canCompare = baselineOutput.trim().length > 0 && newOutput.trim().length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Users className="h-5 w-5 text-green-400" />
          <h2 className="text-2xl font-bold text-white">SMI Teams</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Compare new AI outputs against a preferred baseline. Measure consistency, surface drift, and get a correction prompt when quality slips.
        </p>
      </div>

      {/* Comparison form */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 space-y-4">
        {/* Project name */}
        <div>
          <label className="text-gray-300 text-sm font-medium block mb-1.5">Project name</label>
          <input
            className="w-full bg-gray-900 border border-gray-800 text-gray-200 text-sm rounded-xl px-4 py-2.5 placeholder-gray-600 focus:outline-none focus:border-cyan-700 transition-colors"
            placeholder="e.g. Support Response Templates Q3"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        {/* Textarea pair */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              Preferred baseline output
              <span className="text-gray-600 text-xs ml-2">Your gold-standard response</span>
            </label>
            <textarea
              className={textareaClass}
              rows={8}
              placeholder="Paste your preferred baseline AI output here..."
              value={baselineOutput}
              onChange={(e) => setBaselineOutput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-gray-300 text-sm font-medium block mb-1.5">
              New AI output
              <span className="text-gray-600 text-xs ml-2">The output to compare</span>
            </label>
            <textarea
              className={textareaClass}
              rows={8}
              placeholder="Paste the new AI output to compare against your baseline..."
              value={newOutput}
              onChange={(e) => setNewOutput(e.target.value)}
            />
          </div>
        </div>

        <button
          onClick={handleCompare}
          disabled={!canCompare}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-700 to-teal-700 hover:from-green-600 hover:to-teal-600 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-green-900/20 transition-all duration-150"
        >
          <Play className="h-4 w-4" />
          Run Comparison
        </button>
      </div>

      {/* Results */}
      {result && (
        <ComparisonResultCard result={result} onSave={handleSave} saved={saved} />
      )}

      {/* Saved reports */}
      {savedReports.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-gray-500" />
            <h3 className="text-gray-400 text-sm font-semibold">Saved Reports</h3>
            <span className="text-gray-700 text-xs">({savedReports.length})</span>
          </div>
          <div className="space-y-2">
            {savedReports.map((r) => (
              <SavedReportRow key={r.id} result={r} onDelete={() => handleDelete(r.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SMITeams;
