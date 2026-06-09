import React from 'react';
import { ArrowLeft, ClipboardCheck, Download, Sparkles } from 'lucide-react';
import type { ImprovementCheckResult, RealityCheckResult, Testimonial } from '../types/realityCheck';
import { copySummaryToClipboard, downloadCheckAsHTML, downloadCheckAsJSON } from '../services/exportService';

interface RealityCheckReportDetailProps {
  result: RealityCheckResult;
  improvement?: ImprovementCheckResult | null;
  testimonial?: Testimonial | null;
  onBack?: () => void;
}

const StatBox: React.FC<{ label: string; value: string | number; muted?: boolean }> = ({ label, value, muted }) => (
  <div className="bg-gray-950/60 border border-gray-800 rounded-xl px-3 py-2">
    <p className="text-gray-600 text-[9px] uppercase tracking-widest font-semibold mb-1">{label}</p>
    <p className={`${muted ? 'text-gray-500' : 'text-gray-200'} text-sm font-mono font-semibold`}>{value}</p>
  </div>
);

const TextBlock: React.FC<{ label: string; children: React.ReactNode; accent?: string }> = ({ label, children, accent = 'text-gray-300' }) => (
  <div className="bg-gray-950/40 border border-gray-800 rounded-xl p-4">
    <p className="text-gray-600 text-[10px] uppercase tracking-widest font-semibold mb-2">{label}</p>
    <div className={`${accent} text-xs leading-relaxed whitespace-pre-wrap`}>{children}</div>
  </div>
);

const RealityCheckReportDetail: React.FC<RealityCheckReportDetailProps> = ({ result, improvement, testimonial, onBack }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    copySummaryToClipboard(result, improvement ?? undefined).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Reality Check Report</h2>
          </div>
          <p className="text-gray-500 text-sm">Saved {result.savedAt.slice(0, 10)} · {result.input.sourcePlatform}</p>
        </div>
        <div className="flex gap-2">
          {onBack && (
            <button onClick={onBack} className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          <button onClick={handleCopy} className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <ClipboardCheck className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Copy Summary'}
          </button>
          <button onClick={() => downloadCheckAsJSON(result, improvement ?? undefined)} className="flex items-center gap-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-gray-300 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <Download className="h-3.5 w-3.5" /> JSON
          </button>
          <button onClick={() => downloadCheckAsHTML(result, improvement ?? undefined)} className="flex items-center gap-2 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <Download className="h-3.5 w-3.5" /> HTML
          </button>
        </div>
      </div>

      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-2xl border border-cyan-800/50 bg-cyan-900/20 flex items-center justify-center text-cyan-300 text-3xl font-extrabold">
            {result.grade}
          </div>
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-widest font-semibold">Overall Score</p>
            <p className="text-white text-3xl font-bold font-mono">{result.overallScore}<span className="text-gray-600 text-lg">/100</span></p>
            <p className="text-cyan-300 text-xs mt-1">{result.verdict}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <StatBox label="Intent" value={result.intentMatch} />
          <StatBox label="Continuity" value={result.continuity} />
          <StatBox label="Specificity" value={result.specificity} />
          <StatBox label="Action" value={result.actionability} />
          <StatBox label="Truth Risk" value={result.truthRisk} muted />
          <StatBox label="Waste Risk" value={result.wastedPromptingRisk} muted />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextBlock label="User Goal">{result.input.userGoal}</TextBlock>
        <TextBlock label="Original Prompt">{result.input.originalPrompt}</TextBlock>
      </div>

      <TextBlock label="Original AI Output">{result.input.aiOutput}</TextBlock>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TextBlock label="What Drifted" accent="text-orange-200/90">
          {result.whatDrifted.map((item, index) => `${index + 1}. ${item}`).join('\n')}
        </TextBlock>
        <TextBlock label="Why It Matters" accent="text-gray-300">{result.whyItMatters}</TextBlock>
      </div>

      <TextBlock label="Next Best Prompt" accent="text-cyan-200">{result.nextBestPrompt}</TextBlock>

      {improvement && (
        <div className="bg-green-900/10 border border-green-800/30 rounded-2xl p-4">
          <p className="text-green-500 text-[10px] uppercase tracking-widest font-semibold mb-2">Improvement Check</p>
          <p className="text-green-200 text-sm mb-3">{improvement.summaryMessage}</p>
          <div className="grid grid-cols-3 gap-2">
            <StatBox label="Original" value={improvement.originalScore} />
            <StatBox label="Improved" value={improvement.improvedScore} />
            <StatBox label="Delta" value={`${improvement.scoreDelta >= 0 ? '+' : ''}${improvement.scoreDelta}`} />
          </div>
        </div>
      )}

      {testimonial && testimonial.text && (
        <TextBlock label="User Feedback" accent="text-purple-200">{testimonial.text}</TextBlock>
      )}

      <p className="text-gray-700 text-[10px] italic leading-relaxed">
        Scores are guidance for improving AI usage, not a guarantee of factual accuracy or professional advice.
      </p>
    </div>
  );
};

export default RealityCheckReportDetail;