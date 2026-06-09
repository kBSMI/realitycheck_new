import React, { useMemo } from 'react';
import { BarChart3, MessageSquareQuote, TrendingUp, Users, CheckCircle2, MinusCircle, XCircle } from 'lucide-react';
import { PAIN_POINT_LABELS, TESTIMONIAL_RATING_LABELS } from '../types/realityCheck';
import { loadChecks, loadImprovements, loadTestimonials } from '../services/realityCheckStorageService';

function average(values: number[]): number {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function topCounts(items: string[], limit = 5): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  items.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

const MetricCard: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode }> = ({ label, value, sub, icon }) => (
  <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
    <div className="flex items-center justify-between mb-3">
      <p className="text-gray-600 text-[10px] uppercase tracking-widest font-semibold">{label}</p>
      <span className="text-gray-600">{icon}</span>
    </div>
    <p className="text-white text-2xl font-bold font-mono">{value}</p>
    {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
  </div>
);

const ValidationDashboard: React.FC = () => {
  const checks = loadChecks();
  const improvements = loadImprovements();
  const testimonials = loadTestimonials();

  const metrics = useMemo(() => {
    const originalScores = checks.map((check) => check.overallScore);
    const improvedScores = improvements.map((improvement) => improvement.improvedScore);
    const deltas = improvements.map((improvement) => improvement.scoreDelta);
    const platforms = topCounts(checks.map((check) => check.input.sourcePlatform));
    const painPoints = topCounts(checks.flatMap((check) => check.input.painPoints.map((pain) => PAIN_POINT_LABELS[pain])));
    return {
      averageOriginalScore: average(originalScores),
      averageImprovedScore: average(improvedScores),
      averageDelta: average(deltas),
      platforms,
      painPoints,
      yes: testimonials.filter((t) => t.rating === 'yes').length,
      somewhat: testimonials.filter((t) => t.rating === 'somewhat').length,
      notYet: testimonials.filter((t) => t.rating === 'not_yet').length,
    };
  }, [checks, improvements, testimonials]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Validation Metrics</h2>
          </div>
          <p className="text-gray-500 text-sm max-w-2xl leading-relaxed">
            Founder validation dashboard. Local-only MVP metrics. These are early product-learning signals, not public benchmark claims.
          </p>
        </div>
        <div className="bg-cyan-900/10 border border-cyan-900/30 rounded-xl px-4 py-3">
          <p className="text-cyan-300 text-xs font-semibold uppercase tracking-widest">Proof Loop</p>
          <p className="text-gray-500 text-xs mt-1">Check → improve → save → testimonial</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Checks" value={checks.length} icon={<Users className="h-4 w-4" />} />
        <MetricCard label="Improvement Checks" value={improvements.length} icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Testimonials" value={testimonials.length} icon={<MessageSquareQuote className="h-4 w-4" />} />
        <MetricCard label="Avg. Delta" value={metrics.averageDelta >= 0 ? `+${metrics.averageDelta}` : metrics.averageDelta} sub="after correction prompt" icon={<TrendingUp className="h-4 w-4" />} />
        <MetricCard label="Avg. Original" value={metrics.averageOriginalScore} sub="Reality Check score" icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Avg. Improved" value={metrics.averageImprovedScore} sub="after user retry" icon={<BarChart3 className="h-4 w-4" />} />
        <MetricCard label="Yes, It Helped" value={metrics.yes} icon={<CheckCircle2 className="h-4 w-4" />} />
        <MetricCard label="Somewhat / Not Yet" value={`${metrics.somewhat}/${metrics.notYet}`} icon={<MinusCircle className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Most Common Platforms</h3>
          {metrics.platforms.length ? (
            <div className="space-y-2">
              {metrics.platforms.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-gray-500 font-mono">{item.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-600 text-sm">No platform data yet.</p>}
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-white text-sm font-semibold mb-3">Most Common Pain Points</h3>
          {metrics.painPoints.length ? (
            <div className="space-y-2">
              {metrics.painPoints.map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-gray-400">{item.label}</span>
                  <span className="text-gray-500 font-mono">{item.count}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-600 text-sm">No pain-point data yet.</p>}
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-white text-sm font-semibold mb-3">Anonymized Local Testimonials</h3>
        {testimonials.length ? (
          <div className="space-y-3">
            {testimonials.map((testimonial) => {
              const check = checks.find((item) => item.id === testimonial.checkId);
              return (
                <div key={testimonial.id} className="bg-gray-950/50 border border-gray-800 rounded-xl p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-cyan-900/20 border border-cyan-800/40 text-cyan-300 text-[10px] rounded-full">
                      {TESTIMONIAL_RATING_LABELS[testimonial.rating]}
                    </span>
                    {check && <span className="text-gray-600 text-[10px]">Related grade: {check.grade} · {check.overallScore}/100</span>}
                    <span className="text-gray-700 text-[10px]">{testimonial.createdAt.slice(0, 10)}</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{testimonial.text || 'No written note provided.'}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <XCircle className="h-9 w-9 text-gray-700 mb-3" />
            <p className="text-gray-500 text-sm">No testimonials captured yet.</p>
            <p className="text-gray-700 text-xs mt-1">Run an improvement check, then answer the feedback card.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidationDashboard;
