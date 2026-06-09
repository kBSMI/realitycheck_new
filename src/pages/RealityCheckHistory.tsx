import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock, Filter, ChevronDown, ChevronUp, Trash2,
  ExternalLink, XCircle, CheckCircle2, AlertTriangle,
  Search,
} from 'lucide-react';
import type {
  RealityCheckResult, SourcePlatform, RealityCheckVerdict, PainPoint,
} from '../types/realityCheck';
import { PAIN_POINT_LABELS, SOURCE_PLATFORMS } from '../types/realityCheck';
import { loadChecks, removeCheck, loadImprovementForCheck } from '../services/realityCheckStorageService';

// ─── Filter helpers ────────────────────────────────────────────────────────────

type SortOrder = 'newest' | 'oldest';
type FilterState = {
  platform: SourcePlatform | 'All';
  verdict: RealityCheckVerdict | 'All';
  painPoint: PainPoint | 'All';
  sort: SortOrder;
};

// Pure function
function filterChecks(
  checks: RealityCheckResult[],
  filters: FilterState
): RealityCheckResult[] {
  let result = [...checks];

  if (filters.platform !== 'All') {
    result = result.filter((c) => c.input.sourcePlatform === filters.platform);
  }
  if (filters.verdict !== 'All') {
    result = result.filter((c) => c.verdict === filters.verdict);
  }
  if (filters.painPoint !== 'All') {
    result = result.filter((c) => c.input.painPoints.includes(filters.painPoint as PainPoint));
  }

  return filters.sort === 'oldest'
    ? result.sort((a, b) => a.savedAt.localeCompare(b.savedAt))
    : result.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

// ─── Grade badge ──────────────────────────────────────────────────────────────

const GradeBadge: React.FC<{ grade: string }> = ({ grade }) => {
  const color: Record<string, string> = {
    A: 'bg-green-900/30 border-green-800/50 text-green-400',
    B: 'bg-cyan-900/30 border-cyan-800/50 text-cyan-400',
    C: 'bg-yellow-900/30 border-yellow-800/50 text-yellow-400',
    D: 'bg-orange-900/30 border-orange-800/50 text-orange-400',
    F: 'bg-red-900/30 border-red-800/50 text-red-400',
  };
  return (
    <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 ${color[grade] ?? color.F}`}>
      {grade}
    </span>
  );
};

const VerdictBadge: React.FC<{ verdict: string }> = ({ verdict }) => {
  const color: Record<string, string> = {
    'Fresh Output':       'bg-green-900/20 border-green-800/40 text-green-400',
    'Useful but Drifting':'bg-cyan-900/20 border-cyan-800/40 text-cyan-400',
    'Needs a Rewrite':    'bg-orange-900/20 border-orange-800/40 text-orange-400',
    'Rotten Output':      'bg-red-900/20 border-red-800/40 text-red-400',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${color[verdict] ?? ''}`}>
      {verdict}
    </span>
  );
};

// ─── Detail panel (inline read-only view) ────────────────────────────────────

const DetailPanel: React.FC<{ result: RealityCheckResult }> = ({ result }) => {
  const improvement = loadImprovementForCheck(result.id);

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4 mt-3">
      {/* Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          { label: 'Intent Match',   val: result.intentMatch },
          { label: 'Continuity',     val: result.continuity },
          { label: 'Specificity',    val: result.specificity },
          { label: 'Actionability',  val: result.actionability },
          { label: 'Truth Risk',     val: result.truthRisk },
          { label: 'Prompt Waste Risk', val: result.wastedPromptingRisk },
        ].map(({ label, val }) => (
          <div key={label} className="bg-gray-900/40 rounded-lg px-3 py-2">
            <p className="text-gray-600 text-[9px] uppercase tracking-widest">{label}</p>
            <p className="text-gray-300 text-sm font-mono font-semibold">{val}/100</p>
          </div>
        ))}
      </div>

      {/* What drifted */}
      <div>
        <p className="text-gray-600 text-[10px] font-semibold uppercase tracking-widest mb-1.5">What Drifted</p>
        <div className="space-y-1">
          {result.whatDrifted.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              {w.includes('No significant') ? (
                <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="h-3 w-3 text-orange-500 mt-0.5 shrink-0" />
              )}
              <p className="text-gray-500 text-xs">{w}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next best prompt */}
      <div className="bg-cyan-900/10 border border-cyan-900/30 rounded-xl px-3 py-2">
        <p className="text-cyan-600 text-[10px] font-semibold uppercase tracking-widest mb-1">Next Best Prompt</p>
        <p className="text-cyan-300 text-xs font-mono leading-relaxed">{result.nextBestPrompt}</p>
      </div>

      {/* Improvement summary if available */}
      {improvement && (
        <div className={`rounded-xl border px-3 py-2 ${
          improvement.scoreDelta > 0
            ? 'bg-green-900/10 border-green-900/30'
            : 'bg-gray-900/40 border-gray-800'
        }`}>
          <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest mb-1">Improvement</p>
          <p className="text-gray-300 text-xs">{improvement.summaryMessage}</p>
        </div>
      )}

      {/* Pain points */}
      {result.input.painPoints.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {result.input.painPoints.map((p) => (
            <span key={p} className="px-2 py-0.5 bg-orange-900/20 border border-orange-800/30 text-orange-400 text-[10px] rounded-full">
              {PAIN_POINT_LABELS[p]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── History row ──────────────────────────────────────────────────────────────

const HistoryRow: React.FC<{
  result: RealityCheckResult;
  onDelete: () => void;
}> = ({ result, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const improvement = loadImprovementForCheck(result.id);
  const topPain = result.input.painPoints[0];

  return (
    <div className="bg-gray-900/60 border border-gray-800 hover:border-gray-700 rounded-xl transition-colors overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <GradeBadge grade={result.grade} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <p className="text-gray-300 text-sm font-medium truncate leading-tight">
                {result.input.userGoal.slice(0, 80)}{result.input.userGoal.length > 80 ? '…' : ''}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-gray-600 text-[10px] font-mono">{result.savedAt.slice(0, 10)}</span>
                <span className="text-gray-700 text-[10px]">{result.input.sourcePlatform}</span>
                <VerdictBadge verdict={result.verdict} />
                {topPain && (
                  <span className="px-1.5 py-0.5 bg-orange-900/20 border border-orange-800/30 text-orange-400 text-[9px] rounded-full">
                    {PAIN_POINT_LABELS[topPain]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-white text-sm font-mono font-bold">{result.overallScore}</p>
                {improvement && (
                  <p className={`text-[10px] font-mono ${improvement.scoreDelta > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                    {improvement.scoreDelta >= 0 ? '+' : ''}{improvement.scoreDelta}
                  </p>
                )}
              </div>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-gray-600 hover:text-gray-300 p-1 transition-colors"
                title="View report"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="text-gray-700 hover:text-red-500 p-1 transition-colors"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Expand/collapse toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-1.5 text-gray-700 hover:text-gray-500 text-[10px] border-t border-gray-800/60 transition-colors"
      >
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {expanded ? 'Hide details' : 'View report'}
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="px-4 pb-4">
          <DetailPanel result={result} />
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const ALL_VERDICTS: (RealityCheckVerdict | 'All')[] = [
  'All', 'Fresh Output', 'Useful but Drifting', 'Needs a Rewrite', 'Rotten Output',
];
const ALL_PAIN_POINTS: (PainPoint | 'All')[] = ['All', ...Object.keys(PAIN_POINT_LABELS) as PainPoint[]];

const RealityCheckHistory: React.FC = () => {
  const [checks,  setChecks]  = useState<RealityCheckResult[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    platform: 'All', verdict: 'All', painPoint: 'All', sort: 'newest',
  });
  const [showFilters,  setShowFilters]  = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    setChecks(loadChecks());
  }, []);

  const filtered = useMemo(() => filterChecks(checks, filters), [checks, filters]);

  const handleDelete = (id: string) => {
    removeCheck(id);
    setChecks(loadChecks());
  };

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    checks.forEach((c) => removeCheck(c.id));
    setChecks([]);
    setConfirmClear(false);
  };

  const selectClass = 'bg-gray-900 border border-gray-800 text-gray-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-700 transition-colors';

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Clock className="h-5 w-5 text-gray-400" />
            <h2 className="text-2xl font-bold text-white">Check History</h2>
          </div>
          <p className="text-gray-500 text-sm">All saved AI Reality Checks from this browser.</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-400 hover:text-white text-xs rounded-xl transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Platform</p>
              <select
                className={selectClass}
                value={filters.platform}
                onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value as FilterState['platform'] }))}
              >
                <option value="All">All Platforms</option>
                {SOURCE_PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Verdict</p>
              <select
                className={selectClass}
                value={filters.verdict}
                onChange={(e) => setFilters((f) => ({ ...f, verdict: e.target.value as FilterState['verdict'] }))}
              >
                {ALL_VERDICTS.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Pain Point</p>
              <select
                className={selectClass}
                value={filters.painPoint}
                onChange={(e) => setFilters((f) => ({ ...f, painPoint: e.target.value as FilterState['painPoint'] }))}
              >
                {ALL_PAIN_POINTS.map((p) => <option key={p} value={p}>{p === 'All' ? 'All Pain Points' : PAIN_POINT_LABELS[p as PainPoint]}</option>)}
              </select>
            </div>
            <div>
              <p className="text-gray-600 text-[10px] uppercase tracking-widest mb-1">Sort</p>
              <select
                className={selectClass}
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as SortOrder }))}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      {checks.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-gray-600 text-xs">
            {filtered.length} of {checks.length} check{checks.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={handleClearAll}
            className={`text-xs transition-colors ${confirmClear ? 'text-red-400 font-semibold' : 'text-gray-700 hover:text-red-500'}`}
          >
            {confirmClear ? 'Confirm clear all?' : 'Clear all history'}
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((r) => (
            <HistoryRow key={r.id} result={r} onDelete={() => handleDelete(r.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {checks.length === 0 ? (
            <>
              <Search className="h-10 w-10 text-gray-700 mb-4" />
              <p className="text-gray-400 text-sm font-medium mb-1">No saved checks yet</p>
              <p className="text-gray-600 text-xs">Run a Reality Check and click "Save" to see it here.</p>
            </>
          ) : (
            <>
              <AlertTriangle className="h-10 w-10 text-gray-700 mb-4" />
              <p className="text-gray-400 text-sm font-medium mb-1">No checks match the current filters</p>
              <button onClick={() => setFilters({ platform: 'All', verdict: 'All', painPoint: 'All', sort: 'newest' })}
                className="text-cyan-500 text-xs hover:underline mt-1">Clear filters</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RealityCheckHistory;
