import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  MousePointer2,
  Network,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  Wand2,
} from 'lucide-react';
import type { AppShell } from './LandingPage';
import NeuralBackdrop from '../components/NeuralBackdrop';
import RorschachLayer from '../components/RorschachLayer';
import GlassPanel from '../components/GlassPanel';
import IntentCore from '../components/IntentCore';
import QuestHeader from '../components/QuestHeader';
import SignalPathStepper from '../components/SignalPathStepper';
import MobileBottomNav from '../components/MobileBottomNav';

interface MobileExperienceProps {
  onNavigate: (shell: AppShell) => void;
}

const journeyScreens = [
  {
    id: 1,
    label: 'Enter',
    title: 'Enter the Intent Network',
    headline: 'Start with what you meant.',
    copy: 'The user begins with the outcome they wanted, not another random prompt.',
    icon: <Network className="h-4 w-4" />,
    state: 'idle' as const,
  },
  {
    id: 2,
    label: 'Map',
    title: 'Map Your Signal',
    headline: 'Goal + prompt + AI output.',
    copy: 'Three simple inputs become a path through the network of meaning.',
    icon: <MousePointer2 className="h-4 w-4" />,
    state: 'tracing' as const,
  },
  {
    id: 3,
    label: 'Trace',
    title: 'Traverse the Network',
    headline: 'The app checks alignment.',
    copy: 'Intent, continuity, specificity, actionability, truth risk, and wasted prompting risk are traced.',
    icon: <Eye className="h-4 w-4" />,
    state: 'tracing' as const,
  },
  {
    id: 4,
    label: 'Reveal',
    title: 'Drift Revealed',
    headline: 'Now they can see what felt off.',
    copy: 'The result shows the grade, the drift, and the first thing to fix.',
    icon: <ClipboardCheck className="h-4 w-4" />,
    state: 'drift' as const,
  },
  {
    id: 5,
    label: 'Restore',
    title: 'Restore the Signal',
    headline: 'A better next prompt appears.',
    copy: 'The recovery prompt bridges the gap between what AI produced and what the user meant.',
    icon: <Wand2 className="h-4 w-4" />,
    state: 'restore' as const,
  },
  {
    id: 6,
    label: 'Win',
    title: 'Intent Restored',
    headline: 'The user gets a measurable win.',
    copy: 'Before/after scoring turns improvement into proof and a saved AI Win.',
    icon: <Trophy className="h-4 w-4" />,
    state: 'restored' as const,
  },
];

const userTypes = [
  ['Creators', 'Fix weak scripts, posts, and drafts without reprompting blindly.'],
  ['Students', 'Check if an answer stayed aligned with the assignment.'],
  ['Founders', 'Turn vague plans into usable launch, pitch, and product outputs.'],
  ['Builders', 'See where code/no-code instructions drifted from the build goal.'],
];

const MobileExperience: React.FC<MobileExperienceProps> = ({ onNavigate }) => {
  const [activeStep, setActiveStep] = useState(1);
  const active = useMemo(() => journeyScreens.find((screen) => screen.id === activeStep) ?? journeyScreens[0], [activeStep]);

  const next = () => setActiveStep((current) => (current === journeyScreens.length ? 1 : current + 1));

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-24 sm:pb-0">
      <NeuralBackdrop density="high" centerGlow rorschach />
      <RorschachLayer variant={activeStep >= 4 ? 'fractured' : 'soft'} opacity={activeStep >= 4 ? 0.16 : 0.1} />

      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-10">
        <QuestHeader
          title="Mobile Journey Preview"
          subtitle="A normal-user walkthrough that feels like entering a neural network, revealing drift, restoring signal, and saving an AI win."
          activeStep={activeStep}
          rightSlot={<div className="hidden sm:flex h-12 w-12 rounded-2xl bg-white text-black items-center justify-center"><PlayCircle className="h-5 w-5" /></div>}
        />

        <section className="grid lg:grid-cols-[.95fr_1.05fr] gap-5 items-start">
          <div className="space-y-4">
            <GlassPanel className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Tap-through preview</p>
                  <h2 className="text-2xl font-black tracking-[-0.04em] mt-1">{active.title}</h2>
                </div>
                <button onClick={next} className="h-11 w-11 rounded-2xl bg-white text-black flex items-center justify-center hover:bg-zinc-200">
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
              <SignalPathStepper activeStep={activeStep} />
            </GlassPanel>

            <div className="relative mx-auto w-full max-w-[390px] rounded-[2.6rem] border border-white/15 bg-black p-3 shadow-[0_0_90px_rgba(255,255,255,.08)]">
              <div className="rounded-[2rem] border border-white/10 bg-[#070707] min-h-[660px] overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.16),transparent_31%),linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[length:auto,44px_44px,44px_44px]" />
                <RorschachLayer variant={activeStep >= 6 ? 'restored' : activeStep >= 4 ? 'fractured' : 'soft'} opacity={0.12} />

                <div className="relative p-5 min-h-[660px] flex flex-col">
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-4">
                    <span>9:41</span>
                    <span className="tracking-[0.22em] uppercase">AI Reality Check</span>
                  </div>

                  <div className="flex items-center gap-2 mb-5">
                    <div className="h-8 w-8 rounded-2xl bg-white text-black flex items-center justify-center">{active.icon}</div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Step {active.id} / 6</p>
                      <p className="text-sm font-black">{active.label}</p>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <IntentCore size={activeStep >= 4 ? 'sm' : 'md'} state={active.state} score={activeStep === 4 ? 'B-' : activeStep === 6 ? '+22' : undefined} label={activeStep === 6 ? 'Signal Gain' : 'Intent Core'} />
                    <h3 className="text-2xl font-black tracking-[-0.05em] leading-tight mt-5">{active.headline}</h3>
                    <p className="text-sm text-zinc-500 leading-relaxed mt-3">{active.copy}</p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {activeStep <= 2 && [
                      ['Goal', 'What were you trying to get?'],
                      ['Prompt', 'What did you ask AI?'],
                      ['Output', 'What did AI give you?'],
                    ].map(([label, value], idx) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">{label}</p>
                          <p className="text-sm font-bold text-zinc-200 mt-1">{value}</p>
                        </div>
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-white text-black' : 'bg-white/10 text-zinc-400'}`}>{idx + 1}</span>
                      </div>
                    ))}

                    {activeStep === 3 && ['Mapping intent', 'Tracing continuity', 'Detecting drift', 'Checking truth risk'].map((item, idx) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] p-3 flex items-center gap-3">
                        <CheckCircle2 className={`h-4 w-4 ${idx < 3 ? 'text-white' : 'text-zinc-600'}`} />
                        <span className="text-sm text-zinc-300">{item}</span>
                      </div>
                    ))}

                    {activeStep === 4 && [
                      ['Intent Match', '78'],
                      ['Continuity', '66'],
                      ['Wasted Prompting', 'High'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4 flex items-center justify-between">
                        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</span>
                        <span className="text-lg font-black">{value}</span>
                      </div>
                    ))}

                    {activeStep === 5 && (
                      <div className="rounded-3xl border border-white/12 bg-white/[0.07] p-4">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500 mb-2">Recovery Prompt</p>
                        <p className="text-sm leading-relaxed text-zinc-200">Revise this using the original audience, structure, and deliverable. Keep it specific, concise, and ready to use.</p>
                        <button className="mt-4 w-full rounded-2xl bg-white text-black py-3 text-sm font-black">Copy Prompt</button>
                      </div>
                    )}

                    {activeStep === 6 && (
                      <div className="rounded-3xl border border-white/12 bg-white/[0.07] p-4">
                        <div className="grid grid-cols-3 items-center text-center gap-2">
                          <div><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Before</p><p className="text-2xl font-black">62</p></div>
                          <ArrowRight className="h-5 w-5 mx-auto text-zinc-500" />
                          <div><p className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">After</p><p className="text-2xl font-black">84</p></div>
                        </div>
                        <p className="text-center text-sm font-bold mt-4">Quest Complete. AI Win saved.</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6 grid grid-cols-2 gap-3">
                    <button onClick={next} className="rounded-2xl border border-white/15 bg-white/[0.06] py-3 text-sm font-bold hover:bg-white/10">
                      Next Step
                    </button>
                    <button onClick={() => onNavigate('consumer')} className="rounded-2xl bg-white text-black py-3 text-sm font-black hover:bg-zinc-200">
                      Try It
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <GlassPanel className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-11 w-11 rounded-2xl bg-white text-black flex items-center justify-center"><Sparkles className="h-5 w-5" /></div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Why it works</p>
                  <h3 className="text-xl font-black">A game-like path to better AI results</h3>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  ['No jargon first', 'The user sees simple language: what you wanted, what you asked, what AI gave you.'],
                  ['Immediate clarity', 'The app reveals why the answer felt off without making the user feel like they failed.'],
                  ['A real next move', 'The recovery prompt gives them something useful to copy right away.'],
                  ['Proof of improvement', 'Before/after scoring turns a better answer into a visible win.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                    <p className="font-bold text-sm">{title}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Who it is for</p>
                  <h3 className="text-xl font-black">Normal users who know AI can do more</h3>
                </div>
                <RotateCcw className="h-5 w-5 text-zinc-500" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {userTypes.map(([title, body]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                    <p className="font-bold text-sm">{title}</p>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{body}</p>
                  </div>
                ))}
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 sm:p-6">
              <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500 mb-2">Main app promise</p>
              <h3 className="text-2xl font-black tracking-[-0.04em] mb-3">Get the result you meant to ask for.</h3>
              <p className="text-sm text-zinc-500 leading-relaxed mb-5">
                AI Reality Check is not another chatbot. It is a guided checkup for the answer you already got, built to help users stop guessing and start improving.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <button onClick={() => onNavigate('consumer')} className="rounded-2xl bg-white text-black px-5 py-4 font-bold text-sm inline-flex items-center justify-center gap-2 hover:bg-zinc-200">
                  Start Reality Quest <ArrowRight className="h-4 w-4" />
                </button>
                <button onClick={() => onNavigate('support')} className="rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-4 font-semibold text-sm inline-flex items-center justify-center gap-2 hover:bg-white/10">
                  View Support Credits <Sparkles className="h-4 w-4" />
                </button>
              </div>
            </GlassPanel>
          </div>
        </section>
      </main>
      <MobileBottomNav current="mobile" onNavigate={onNavigate} />
    </div>
  );
};

export default MobileExperience;
