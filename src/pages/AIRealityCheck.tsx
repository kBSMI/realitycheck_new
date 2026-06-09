import React, { useMemo, useState } from 'react';
import { ArrowRight, BookmarkPlus, CheckCircle2, Copy, Download, Gauge, RefreshCw, Sparkles } from 'lucide-react';
import type { AppShell } from './LandingPage';
import NeuralBackdrop from '../components/NeuralBackdrop';
import RorschachLayer from '../components/RorschachLayer';
import GlassPanel from '../components/GlassPanel';
import IntentCore from '../components/IntentCore';
import QuestHeader from '../components/QuestHeader';
import MobileBottomNav from '../components/MobileBottomNav';
import type { PainPoint, RealityCheckInput, RealityCheckResult, SourcePlatform, TestimonialRating } from '../types/realityCheck';
import { PAIN_POINT_LABELS, SOURCE_PLATFORMS, TESTIMONIAL_RATING_LABELS } from '../types/realityCheck';
import { realityCheckCategories, realityCheckScenarios } from '../data/realityCheckScenarios';
import { buildExpectedImprovement, buildWhatToFixFirst, scoreImprovementCheck, scoreRealityCheck } from '../services/realityCheckService';
import { saveCheck, saveImprovement, saveTestimonial } from '../services/realityCheckStorageService';
import { copySummaryToClipboard, downloadCheckAsHTML, downloadCheckAsJSON } from '../services/exportService';

interface AIRealityCheckProps {
  onNavigate: (shell: AppShell) => void;
}

const inputClass = 'w-full rounded-2xl bg-black/45 border border-white/10 text-zinc-100 placeholder-zinc-600 px-4 py-3 text-sm focus:outline-none focus:border-white/35 focus:ring-2 focus:ring-white/10 transition-all';

const defaultInput: RealityCheckInput = {
  userGoal: '',
  originalPrompt: '',
  aiOutput: '',
  expectedFormat: '',
  targetAudience: '',
  sourcePlatform: 'ChatGPT',
  painPoints: [],
};

function gradeState(score: number) {
  if (score >= 75) return 'restored' as const;
  if (score >= 55) return 'drift' as const;
  return 'drift' as const;
}

const ScorePill: React.FC<{ label: string; value: number; invert?: boolean }> = ({ label, value, invert }) => {
  const good = invert ? value <= 35 : value >= 70;
  const mid = invert ? value <= 60 : value >= 50;
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <div className="flex justify-between gap-3 text-xs mb-2"><span className="text-zinc-500">{label}</span><span className="font-mono text-white">{value}</span></div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className={`h-full rounded-full ${good ? 'bg-white' : mid ? 'bg-zinc-400' : 'bg-zinc-700'}`} style={{ width: `${value}%` }} /></div>
    </div>
  );
};

const AIRealityCheck: React.FC<AIRealityCheckProps> = ({ onNavigate }) => {
  const [input, setInput] = useState<RealityCheckInput>(defaultInput);
  const [category, setCategory] = useState('All');
  const [result, setResult] = useState<RealityCheckResult | null>(null);
  const [improvedOutput, setImprovedOutput] = useState('');
  const [improvement, setImprovement] = useState<ReturnType<typeof scoreImprovementCheck> | null>(null);
  const [testimonialText, setTestimonialText] = useState('');
  const [testimonialRating, setTestimonialRating] = useState<TestimonialRating>('yes');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const filteredScenarios = useMemo(
    () => category === 'All' ? realityCheckScenarios : realityCheckScenarios.filter((s) => s.category === category),
    [category]
  );

  const activeStep = improvement ? 6 : result ? 4 : 2;
  const whatToFix = result ? buildWhatToFixFirst(result.intentMatch, result.continuity, result.specificity, result.actionability) : '';
  const expectedImprovement = result ? buildExpectedImprovement(result.intentMatch, result.continuity, result.specificity, result.actionability) : '';
  const dimensions = result ? [
    { label: 'Intent Match', value: result.intentMatch },
    { label: 'Continuity', value: result.continuity },
    { label: 'Specificity', value: result.specificity },
    { label: 'Actionability', value: result.actionability },
    { label: 'Truth Risk', value: result.truthRisk, invert: true },
    { label: 'Wasted Prompting', value: result.wastedPromptingRisk, invert: true },
  ] : [];
  const bestCategory = result ? dimensions.filter((d) => !d.invert).sort((a, b) => b.value - a.value)[0] : null;
  const weakestCategory = result ? dimensions.filter((d) => !d.invert).sort((a, b) => a.value - b.value)[0] : null;

  const update = <K extends keyof RealityCheckInput>(key: K, value: RealityCheckInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));

  const togglePain = (pain: PainPoint) => {
    setInput((prev) => ({
      ...prev,
      painPoints: prev.painPoints.includes(pain) ? prev.painPoints.filter((p) => p !== pain) : [...prev.painPoints, pain],
    }));
  };

  const loadScenario = (scenarioId: string) => {
    const scenario = realityCheckScenarios.find((s) => s.id === scenarioId);
    if (!scenario) return;
    setInput({
      userGoal: scenario.goal,
      originalPrompt: scenario.prompt,
      aiOutput: scenario.aiOutput,
      expectedFormat: scenario.expectedFormat ?? '',
      targetAudience: scenario.targetAudience ?? '',
      sourcePlatform: scenario.platform,
      painPoints: scenario.painPoints,
    });
    setResult(null);
    setImprovement(null);
    setSaved(false);
  };

  const runCheck = () => {
    const scored = scoreRealityCheck(input);
    setResult(scored);
    setImprovement(null);
    setSaved(false);
    setCopied(false);
  };

  const copyRecoveryPrompt = async () => {
    if (!result) return;
    await navigator.clipboard?.writeText(result.nextBestPrompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const runImprovement = () => {
    if (!result) return;
    const checked = scoreImprovementCheck(result, improvedOutput);
    setImprovement(checked);
    saveImprovement(checked);
  };

  const saveResult = () => {
    if (!result) return;
    saveCheck(result);
    setSaved(true);
  };

  const submitTestimonial = () => {
    if (!result) return;
    saveTestimonial({ id: `t-${Date.now()}`, checkId: result.id, rating: testimonialRating, text: testimonialText, createdAt: new Date().toISOString() });
    setTestimonialText('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-24 sm:pb-0">
      <NeuralBackdrop density="medium" centerGlow rorschach />
      <RorschachLayer variant={improvement ? 'restored' : result ? 'fractured' : 'soft'} opacity={result ? 0.12 : 0.08} />
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-5 sm:py-8">
        <QuestHeader
          title={improvement ? 'Intent Restored' : result ? 'Drift Revealed' : 'Map Your Signal'}
          subtitle={improvement ? 'You repaired the signal and moved closer to the result you meant to ask for.' : result ? 'See exactly where the AI output drifted from your intent.' : 'Share your goal, prompt, and AI output to build your signal path.'}
          activeStep={activeStep}
          rightSlot={<div className="hidden sm:flex rounded-2xl bg-white text-black px-4 py-3 text-sm font-black">Reality Quest</div>}
        />

        {!result && (
          <div className="grid lg:grid-cols-[1fr_.85fr] gap-5">
            <GlassPanel className="p-5 sm:p-6">
              <div className="grid gap-4">
                <label className="block"><span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">1. What were you trying to get?</span><textarea className={`${inputClass} mt-2 min-h-[96px]`} value={input.userGoal} onChange={(e) => update('userGoal', e.target.value)} placeholder="I wanted a 30-day launch plan for my app..." /></label>
                <label className="block"><span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">2. What did you ask AI?</span><textarea className={`${inputClass} mt-2 min-h-[110px]`} value={input.originalPrompt} onChange={(e) => update('originalPrompt', e.target.value)} placeholder="Paste your prompt..." /></label>
                <label className="block"><span className="text-xs text-zinc-500 uppercase tracking-[0.2em]">3. What did AI give you?</span><textarea className={`${inputClass} mt-2 min-h-[150px]`} value={input.aiOutput} onChange={(e) => update('aiOutput', e.target.value)} placeholder="Paste the AI response..." /></label>
                <div className="grid sm:grid-cols-3 gap-3">
                  <select className={inputClass} value={input.sourcePlatform} onChange={(e) => update('sourcePlatform', e.target.value as SourcePlatform)}>
                    {SOURCE_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                  <input className={inputClass} value={input.expectedFormat} onChange={(e) => update('expectedFormat', e.target.value)} placeholder="Expected format" />
                  <input className={inputClass} value={input.targetAudience} onChange={(e) => update('targetAudience', e.target.value)} placeholder="Target audience" />
                </div>
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] mb-3">What felt off?</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PAIN_POINT_LABELS) as PainPoint[]).map((pain) => (
                      <button key={pain} type="button" onClick={() => togglePain(pain)} className={`rounded-full px-3 py-2 text-xs border transition-all ${input.painPoints.includes(pain) ? 'bg-white text-black border-white' : 'bg-white/[0.04] text-zinc-400 border-white/10 hover:bg-white/10 hover:text-white'}`}>{PAIN_POINT_LABELS[pain]}</button>
                    ))}
                  </div>
                </div>
                <button onClick={runCheck} className="rounded-2xl bg-white text-black px-6 py-4 font-black hover:bg-zinc-200 inline-flex items-center justify-center gap-2">
                  Trace My Signal <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </GlassPanel>

            <div className="space-y-4">
              <GlassPanel className="p-5 relative overflow-hidden">
                <RorschachLayer variant="dense" opacity={0.1} />
                <div className="relative"><IntentCore size="md" state="tracing" label="Signal" /><p className="text-center text-sm text-zinc-500 mt-4">Every field you complete lights another node in the path between what you meant and what AI materialized.</p></div>
              </GlassPanel>
              <GlassPanel className="p-5">
                <div className="flex items-center gap-2 mb-4"><Sparkles className="h-4 w-4" /><h2 className="font-black">Browse Examples</h2></div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {['All', ...realityCheckCategories].slice(0, 12).map((c) => <button key={c} onClick={() => setCategory(c)} className={`rounded-full px-3 py-1.5 text-xs border ${category === c ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-zinc-400'}`}>{c}</button>)}
                </div>
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {filteredScenarios.slice(0, 12).map((s) => <button key={s.id} onClick={() => loadScenario(s.id)} className="w-full text-left rounded-2xl border border-white/10 bg-black/35 hover:bg-white/10 p-3"><p className="text-sm font-bold">{s.label}</p><p className="text-xs text-zinc-500 mt-1">{s.expectedUseCaseSummary}</p></button>)}
                </div>
              </GlassPanel>
            </div>
          </div>
        )}

        {result && (
          <div className="grid lg:grid-cols-[.85fr_1.15fr] gap-5">
            <GlassPanel className="p-6 relative overflow-hidden">
              <RorschachLayer variant={improvement ? 'restored' : 'fractured'} opacity={0.18} />
              <div className="relative">
                <IntentCore size="lg" state={gradeState(result.overallScore)} score={result.grade} label={result.verdict} />
                <div className="mt-5 text-center"><p className="text-5xl font-black">{result.overallScore}</p><p className="text-zinc-500 text-xs uppercase tracking-[0.24em]">Alignment Score</p></div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {dimensions.map((d) => <ScorePill key={d.label} label={d.label} value={d.value} invert={d.invert} />)}
                </div>
              </div>
            </GlassPanel>

            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <GlassPanel className="p-4"><p className="text-xs text-zinc-500">Best Category</p><p className="font-black mt-1">{bestCategory?.label}</p><p className="text-sm text-zinc-400">{bestCategory?.value}/100</p></GlassPanel>
                <GlassPanel className="p-4"><p className="text-xs text-zinc-500">Weakest Category</p><p className="font-black mt-1">{weakestCategory?.label}</p><p className="text-sm text-zinc-400">{weakestCategory?.value}/100</p></GlassPanel>
                <GlassPanel className="p-4"><p className="text-xs text-zinc-500">Platform</p><p className="font-black mt-1">{result.input.sourcePlatform}</p><p className="text-sm text-zinc-400">User-provided</p></GlassPanel>
              </div>

              <GlassPanel className="p-5">
                <h2 className="font-black text-xl mb-3">What happened?</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">The AI produced something usable, but the signal needs review against your original goal, format, audience, and trust requirements.</p>
              </GlassPanel>
              <GlassPanel className="p-5">
                <h2 className="font-black text-xl mb-3">What drifted?</h2>
                <ul className="space-y-2 text-sm text-zinc-400">{result.whatDrifted.map((item) => <li key={item} className="flex gap-2"><Gauge className="h-4 w-4 mt-0.5 text-zinc-500" /> {item}</li>)}</ul>
              </GlassPanel>
              <GlassPanel className="p-5">
                <h2 className="font-black text-xl mb-3">First fix to make</h2>
                <p className="text-sm text-zinc-400 leading-relaxed">{whatToFix}</p>
              </GlassPanel>
              <GlassPanel className="p-5">
                <div className="flex items-center justify-between gap-3 mb-3"><h2 className="font-black text-xl">Restore the Signal</h2><button onClick={copyRecoveryPrompt} className="rounded-xl bg-white text-black px-3 py-2 text-xs font-bold inline-flex items-center gap-1"><Copy className="h-3 w-3" /> {copied ? 'Copied' : 'Copy'}</button></div>
                <div className="rounded-2xl bg-black/45 border border-white/10 p-4 text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{result.nextBestPrompt}</div>
                <p className="text-sm text-zinc-500 mt-3"><strong className="text-zinc-300">Expected improvement:</strong> {expectedImprovement}</p>
              </GlassPanel>

              <GlassPanel className="p-5">
                <h2 className="font-black text-xl mb-3">Did the next prompt improve the result?</h2>
                <textarea className={`${inputClass} min-h-[110px]`} value={improvedOutput} onChange={(e) => setImprovedOutput(e.target.value)} placeholder="Paste the improved AI output here..." />
                <button onClick={runImprovement} className="mt-3 rounded-2xl bg-white text-black px-5 py-3 text-sm font-black hover:bg-zinc-200 inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Run Improvement Check</button>
                {improvement && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="text-3xl font-black">{improvement.scoreDelta >= 0 ? '+' : ''}{improvement.scoreDelta}</p>
                    <p className="text-sm text-zinc-400 mt-1">{improvement.summaryMessage}</p>
                    <p className="text-xs text-zinc-500 mt-2">Original {improvement.originalScore} → Improved {improvement.improvedScore}</p>
                  </div>
                )}
              </GlassPanel>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <button onClick={saveResult} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/10 inline-flex items-center justify-center gap-2"><BookmarkPlus className="h-4 w-4" /> {saved ? 'Saved' : 'Save Win'}</button>
                <button onClick={() => copySummaryToClipboard(result)} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/10 inline-flex items-center justify-center gap-2"><Copy className="h-4 w-4" /> Copy Summary</button>
                <button onClick={() => downloadCheckAsJSON(result)} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/10 inline-flex items-center justify-center gap-2"><Download className="h-4 w-4" /> JSON</button>
                <button onClick={() => downloadCheckAsHTML(result)} className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-semibold hover:bg-white/10 inline-flex items-center justify-center gap-2"><Download className="h-4 w-4" /> HTML</button>
              </div>

              {improvement && (
                <GlassPanel className="p-5">
                  <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="h-5 w-5" /><h2 className="font-black text-xl">Quest Complete</h2></div>
                  <p className="text-sm text-zinc-500 mb-4">If AI Reality Check helped you get closer to the result you wanted, capture the proof while it is fresh.</p>
                  <div className="grid sm:grid-cols-3 gap-2 mb-3">{(Object.keys(TESTIMONIAL_RATING_LABELS) as TestimonialRating[]).map((r) => <button key={r} onClick={() => setTestimonialRating(r)} className={`rounded-xl px-3 py-2 text-xs border ${testimonialRating === r ? 'bg-white text-black border-white' : 'border-white/10 bg-white/5 text-zinc-400'}`}>{TESTIMONIAL_RATING_LABELS[r]}</button>)}</div>
                  <textarea className={`${inputClass} min-h-[82px]`} value={testimonialText} onChange={(e) => setTestimonialText(e.target.value)} placeholder="What changed after using the recovery prompt?" />
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button onClick={submitTestimonial} className="rounded-2xl bg-white text-black px-4 py-3 text-sm font-bold">Save Testimonial</button>
                    <button onClick={() => onNavigate('history')} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10">View My Wins</button>
                    <button onClick={() => { setResult(null); setImprovement(null); setInput(defaultInput); }} className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/10">Start Another Quest</button>
                  </div>
                </GlassPanel>
              )}
            </div>
          </div>
        )}
      </main>
      <MobileBottomNav current="consumer" onNavigate={onNavigate} />
    </div>
  );
};

export default AIRealityCheck;
