import React from 'react';
import { ArrowRight, MousePointer2, PlayCircle } from 'lucide-react';
import GlassPanel from './GlassPanel';
import IntentCore from './IntentCore';
import RorschachLayer from './RorschachLayer';
import type { AppShell } from '../pages/LandingPage';

interface ExplainerVideoCardProps {
  onNavigate: (shell: AppShell) => void;
}

const explainerSteps = [
  {
    time: '0:00',
    title: 'Paste what happened',
    copy: 'Add your goal, the prompt you used, and the AI answer you got.',
  },
  {
    time: '0:15',
    title: 'Reveal the drift',
    copy: 'AI Reality Check shows where the answer moved away from your intent.',
  },
  {
    time: '0:35',
    title: 'Restore the signal',
    copy: 'Copy a recovery prompt and get closer to the result you meant to ask for.',
  },
  {
    time: '0:55',
    title: 'Save the win',
    copy: 'Track before/after improvement so every check feels like progress.',
  },
];

const ExplainerVideoCard: React.FC<ExplainerVideoCardProps> = ({ onNavigate }) => (
  <GlassPanel className="relative overflow-hidden p-5 sm:p-6">
    <RorschachLayer variant="soft" opacity={0.13} />
    <div className="relative grid lg:grid-cols-[1.08fr_.92fr] gap-6 items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 mb-4">
          <PlayCircle className="h-4 w-4 text-white" />
          <span className="text-[11px] uppercase tracking-[0.2em] text-zinc-400">60-second explainer</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.06em] leading-[0.95] mb-4">
          See how a Reality Quest works.
        </h2>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-2xl">
          A quick walkthrough for people who use AI but still get answers that feel off. The app helps them see what drifted, what to fix first, and what to ask next.
        </p>

        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {explainerSteps.map((step) => (
            <div key={step.time} className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full bg-white text-black px-2 py-1 text-[10px] font-black">{step.time}</span>
                <p className="text-sm font-bold text-white">{step.title}</p>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">{step.copy}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button onClick={() => onNavigate('mobile')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-5 py-3 text-sm font-bold hover:bg-zinc-200">
            Watch the walkthrough <ArrowRight className="h-4 w-4" />
          </button>
          <button onClick={() => onNavigate('consumer')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.055] px-5 py-3 text-sm font-semibold text-zinc-200 hover:bg-white/10">
            Try a check now <MousePointer2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative rounded-[2rem] border border-white/12 bg-black/45 p-4 sm:p-5 shadow-[0_0_80px_rgba(255,255,255,.08)]">
        <div className="absolute inset-4 rounded-[1.5rem] border border-white/10 opacity-70" />
        <div className="relative rounded-[1.6rem] border border-white/10 bg-[#080808] p-5 min-h-[360px] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,.18),transparent_32%),linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] bg-[length:auto,42px_42px,42px_42px]" />
          <div className="relative">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-zinc-500 mb-5">
              <span>Preview</span>
              <span>Reality Quest</span>
            </div>
            <IntentCore size="md" state="restore" label="Intent Core" />
            <div className="mt-5 space-y-3">
              {[
                ['Goal', 'Get a better launch plan'],
                ['Drift', 'Too generic / missed structure'],
                ['Fix', 'Restore audience + format'],
              ].map(([label, value], idx) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{label}</p>
                    <p className="text-sm font-bold text-zinc-100 mt-1">{value}</p>
                  </div>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${idx === 2 ? 'bg-white text-black' : 'bg-white/10 text-zinc-300'}`}>
                    {idx + 1}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl bg-white text-black p-3 text-center text-sm font-black">
              Copy Recovery Prompt
            </div>
          </div>
        </div>
      </div>
    </div>
  </GlassPanel>
);

export default ExplainerVideoCard;
