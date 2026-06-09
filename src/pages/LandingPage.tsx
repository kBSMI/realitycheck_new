import React from 'react';
import { ArrowRight, BarChart3, Building2, Gauge, Gem, Lock, Network, ShieldCheck, Sparkles, Trophy, Users } from 'lucide-react';
import NeuralBackdrop from '../components/NeuralBackdrop';
import RorschachLayer from '../components/RorschachLayer';
import IntentCore from '../components/IntentCore';
import GlassPanel from '../components/GlassPanel';
import MobileBottomNav from '../components/MobileBottomNav';
import ExplainerVideoCard from '../components/ExplainerVideoCard';

export type AppShell =
  | 'landing'
  | 'consumer'
  | 'mobile'
  | 'support'
  | 'teams'
  | 'enterprise'
  | 'demo'
  | 'reference'
  | 'history'
  | 'validation'
  | 'index'
  | 'privacy'
  | 'auth'
  | 'pricing'
  | 'terms'
  | 'refunds'
  | 'scoring'
  | 'admin';

interface LandingPageProps {
  onNavigate: (shell: AppShell) => void;
}

const quickLinks: { shell: AppShell; label: string; icon: React.ReactNode }[] = [
  { shell: 'consumer', label: 'Start Reality Quest', icon: <Gauge className="h-4 w-4" /> },
  { shell: 'mobile', label: 'Preview Mobile Journey', icon: <Network className="h-4 w-4" /> },
  { shell: 'support', label: 'Support Credits', icon: <Gem className="h-4 w-4" /> },
  { shell: 'history', label: 'My AI Wins', icon: <Trophy className="h-4 w-4" /> },
  { shell: 'index', label: 'AI Reality Index', icon: <BarChart3 className="h-4 w-4" /> },
  { shell: 'privacy', label: 'Privacy & Data', icon: <Lock className="h-4 w-4" /> },
  { shell: 'pricing', label: 'Pricing', icon: <Gem className="h-4 w-4" /> },
];

const laneCards = [
  {
    shell: 'consumer' as AppShell,
    icon: <Sparkles className="h-5 w-5" />,
    title: 'Individuals',
    line: 'Get the result you meant to ask for.',
    body: 'Paste your goal, prompt, and AI output. Reveal where meaning drifted and copy a recovery prompt.',
  },
  {
    shell: 'teams' as AppShell,
    icon: <Users className="h-5 w-5" />,
    title: 'Teams',
    line: 'Keep AI outputs consistent across repeatable work.',
    body: 'Compare preferred baselines against new AI work and produce client-ready consistency reports.',
  },
  {
    shell: 'enterprise' as AppShell,
    icon: <Building2 className="h-5 w-5" />,
    title: 'Enterprise',
    line: 'Validate AI workflow continuity after change.',
    body: 'Use SMI services for baselines, drift detection, audit evidence, and reference architecture maturity.',
  },
];

const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => (
  <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden pb-24 sm:pb-0">
    <NeuralBackdrop density="medium" centerGlow rorschach />
    <RorschachLayer variant="soft" opacity={0.22} />

    <header className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-5 border-b border-white/10 bg-black/25 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl border border-white/15 bg-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,.08)]">
          <ShieldCheck className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="font-black tracking-tight leading-none">AI Reality Check</p>
          <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500 mt-1">Powered by SMI</p>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-2">
        <button onClick={() => onNavigate('privacy')} className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10">Privacy</button>
        <button onClick={() => onNavigate('auth')} className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10">Sign in</button>
        <button onClick={() => onNavigate('pricing')} className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10">Pricing</button>
        <button onClick={() => onNavigate('demo')} className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10">Demo</button>
        <button onClick={() => onNavigate('enterprise')} className="text-xs text-black bg-white hover:bg-zinc-200 px-4 py-2 rounded-xl font-semibold">Enterprise</button>
      </div>
    </header>

    <main className="relative z-10 px-4 sm:px-6 py-10 sm:py-16 max-w-7xl mx-auto">
      <section className="grid lg:grid-cols-[1.05fr_.95fr] gap-8 items-center min-h-[70vh]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 mb-6">
            <Sparkles className="h-4 w-4 text-white" />
            <span className="text-xs text-zinc-300">Navigate the heart of intent</span>
          </div>
          <h1 className="text-5xl sm:text-7xl font-black tracking-[-0.07em] leading-[0.95] mb-6">
            Step Into the<br />Heart of Your<br />AI Intent
          </h1>
          <p className="text-zinc-400 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
            Your goal, prompt, and AI output form a network. AI Reality Check helps reveal where meaning drifted, restore the signal, and get closer to the result you meant to ask for.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <button onClick={() => onNavigate('consumer')} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-black px-6 py-4 text-sm font-bold hover:bg-zinc-200 shadow-[0_0_42px_rgba(255,255,255,.16)]">
              Start Reality Quest <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onNavigate('mobile')} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-6 py-4 text-sm font-semibold text-zinc-200 hover:bg-white/10">
              Preview Mobile Experience
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
            {['Intent', 'Signal', 'Drift', 'Restore'].map((label, idx) => (
              <GlassPanel key={label} className="p-4 text-center">
                <div className="text-2xl font-black">{idx === 0 ? '01' : idx === 1 ? '02' : idx === 2 ? '03' : '04'}</div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 mt-1">{label}</div>
              </GlassPanel>
            ))}
          </div>
        </div>

        <GlassPanel className="relative p-6 sm:p-8 overflow-hidden">
          <RorschachLayer variant="dense" opacity={0.18} />
          <div className="relative">
            <IntentCore size="lg" state="idle" label="Intent Core" />
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[['Reality Grade', 'B-'], ['Signal State', 'Drifting'], ['Intent Match', '78'], ['Next Step', 'Restore']].map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{k}</p>
                  <p className="mt-1 text-xl font-black text-white">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </section>

      <section className="mt-4">
        <ExplainerVideoCard onNavigate={onNavigate} />
      </section>

      <section className="grid md:grid-cols-3 gap-4 mt-10">
        {laneCards.map((card) => (
          <GlassPanel key={card.title} className="p-6 group hover:bg-white/[0.08] transition-all">
            <div className="h-11 w-11 rounded-2xl bg-white/10 border border-white/12 flex items-center justify-center mb-4">{card.icon}</div>
            <h3 className="text-xl font-black mb-1">{card.title}</h3>
            <p className="text-zinc-200 text-sm font-semibold mb-3">{card.line}</p>
            <p className="text-zinc-500 text-sm leading-relaxed mb-5">{card.body}</p>
            <button onClick={() => onNavigate(card.shell)} className="text-sm font-semibold text-white/90 inline-flex items-center gap-2 group-hover:gap-3 transition-all">Open lane <ArrowRight className="h-4 w-4" /></button>
          </GlassPanel>
        ))}
      </section>

      <section className="mt-6 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {quickLinks.map((link) => (
          <button key={link.shell} onClick={() => onNavigate(link.shell)} className="rounded-2xl border border-white/10 bg-white/[0.045] hover:bg-white/[0.08] p-4 text-left transition-all">
            <div className="text-zinc-300 mb-3">{link.icon}</div>
            <div className="text-xs font-semibold text-zinc-300">{link.label}</div>
          </button>
        ))}
      </section>

      <GlassPanel className="mt-6 p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <p className="font-bold">Private by design. Local-first MVP.</p>
          <p className="text-sm text-zinc-500 mt-1">AI Reality Check only reviews content you provide. It does not pull private AI sessions or call external AI models in deterministic MVP mode.</p>
        </div>
        <button onClick={() => onNavigate('reference')} className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-zinc-200 hover:bg-white/10 inline-flex items-center gap-2">
          View Architecture <ArrowRight className="h-4 w-4" />
        </button>
      </GlassPanel>
    </main>
    <MobileBottomNav current="landing" onNavigate={onNavigate} />
  </div>
);

export default LandingPage;
