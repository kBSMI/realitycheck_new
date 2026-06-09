import React, { useMemo } from 'react';
import { BarChart3, AlertTriangle, TrendingUp } from 'lucide-react';
import { loadChecks, loadImprovements } from '../services/realityCheckStorageService';
import { PAIN_POINT_LABELS, SOURCE_PLATFORMS, type PainPoint, type SourcePlatform } from '../types/realityCheck';

interface PlatformRow {
  platform: SourcePlatform;
  checks: number;
  avgScore: number;
  avgImprovement: number;
  commonPainPoint: string;
  commonVerdict: string;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

function mostCommon<T extends string>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item] = (acc[item] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as T;
}

const AIRealityIndex: React.FC = () => {
  const checks = loadChecks();
  const improvements = loadImprovements();

  const rows = useMemo<PlatformRow[]>(() => {
    return SOURCE_PLATFORMS.map((platform) => {
      const platformChecks = checks.filter((check) => check.input.sourcePlatform === platform);
      const checkIds = new Set(platformChecks.map((check) => check.id));
      const platformImprovements = improvements.filter((improvement) => checkIds.has(improvement.originalCheckId));
      const painPoints = platformChecks.flatMap((check) => check.input.painPoints);
      const verdicts = platformChecks.map((check) => check.verdict);
      const commonPain = mostCommon(painPoints as PainPoint[]);

      return {
        platform,
        checks: platformChecks.length,
        avgScore: average(platformChecks.map((check) => check.overallScore)),
        avgImprovement: average(platformImprovements.map((improvement) => improvement.scoreDelta)),
        commonPainPoint: commonPain ? PAIN_POINT_LABELS[commonPain] : '—',
        commonVerdict: mostCommon(verdicts) ?? '—',
      };
    }).filter((row) => row.checks > 0);
  }, [checks, improvements]);

  const allPainPoints = checks.flatMap((check) => check.input.painPoints);
  const avgScore = average(checks.map((check) => check.overallScore));
  const avgDelta = average(improvements.map((improvement) => improvement.scoreDelta));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="h-5 w-5 text-cyan-400" />
          <h2 className="text-2xl font-bold text-white">AI Reality Index Preview</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">
          A local-data preview of how AI outputs are scoring across platforms, pain points, and improvement checks.
        </p>
      </div>

      <div className="bg-amber-900/10 border border-amber-800/30 rounded-2xl p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-amber-200/80 text-xs leading-relaxed">
          AI Reality Index is currently based only on local MVP checks from this browser. It is not a public benchmark,
          platform ranking, or verified third-party measurement.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {[
          { label: 'Saved Checks', value: checks.length },
          { label: 'Avg Score', value: avgScore || '—' },
          { label: 'Improvement Checks', value: improvements.length },
          { label: 'Avg Delta', value: improvements.length ? `+${avgDelta}` : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
            <p className="text-gray-600 text-[10px] uppercase tracking-widest font-semibold mb-1">{stat.label}</p>
            <p className="text-white text-2xl font-bold font-mono">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-cyan-400" />
          <h3 className="text-white text-sm font-semibold">Platform Snapshot</h3>
        </div>
        {rows.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 text-sm">No saved checks yet. Run AI Reality Check and save a result to populate this preview.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/60 text-gray-600 uppercase tracking-widest">
                <tr>
                  <th className="px-4 py-3">Platform</th>
                  <th className="px-4 py-3">Checks</th>
                  <th className="px-4 py-3">Avg Score</th>
                  <th className="px-4 py-3">Avg Improvement</th>
                  <th className="px-4 py-3">Common Pain Point</th>
                  <th className="px-4 py-3">Common Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map((row) => (
                  <tr key={row.platform} className="text-gray-300">
                    <td className="px-4 py-3 font-semibold">{row.platform}</td>
                    <td className="px-4 py-3 font-mono">{row.checks}</td>
                    <td className="px-4 py-3 font-mono">{row.avgScore || '—'}</td>
                    <td className="px-4 py-3 font-mono">{row.avgImprovement ? `+${row.avgImprovement}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-400">{row.commonPainPoint}</td>
                    <td className="px-4 py-3 text-gray-400">{row.commonVerdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-4">
        <p className="text-gray-600 text-[10px] uppercase tracking-widest font-semibold mb-2">Most Common Local Pain Points</p>
        <div className="flex flex-wrap gap-2">
          {allPainPoints.length === 0 ? (
            <span className="text-gray-600 text-xs">No pain points recorded yet.</span>
          ) : (
            Object.entries(allPainPoints.reduce<Record<string, number>>((acc, point) => {
              acc[point] = (acc[point] ?? 0) + 1;
              return acc;
            }, {}))
              .sort((a, b) => b[1] - a[1])
              .slice(0, 8)
              .map(([point, count]) => (
                <span key={point} className="px-2.5 py-1 bg-orange-900/20 border border-orange-800/30 text-orange-300 text-xs rounded-full">
                  {PAIN_POINT_LABELS[point as PainPoint]} · {count}
                </span>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AIRealityIndex;
