export const neuralTheme = {
  page: 'min-h-screen bg-[#050505] text-white relative overflow-hidden',
  surface: 'bg-white/[0.055] border border-white/[0.12] backdrop-blur-xl shadow-2xl shadow-black/40',
  surfaceHover: 'hover:bg-white/[0.075] hover:border-white/20 transition-all duration-200',
  muted: 'text-zinc-400',
  faint: 'text-zinc-500',
  signal: 'text-white',
  buttonPrimary: 'bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/10',
  buttonSecondary: 'bg-white/[0.06] text-zinc-200 border border-white/[0.14] hover:bg-white/[0.1]',
  input: 'w-full bg-black/45 border border-white/10 text-zinc-100 placeholder-zinc-600 rounded-2xl px-4 py-3 focus:outline-none focus:border-white/35 focus:ring-2 focus:ring-white/10 transition-all',
};

export type IntentCoreState = 'idle' | 'tracing' | 'drift' | 'restore' | 'restored';
export type RorschachVariant = 'soft' | 'dense' | 'fractured' | 'restored';
