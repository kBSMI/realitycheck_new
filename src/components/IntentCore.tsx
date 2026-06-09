import React from 'react';
import type { IntentCoreState } from '../styles/neuralTheme';

interface IntentCoreProps {
  state?: IntentCoreState;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  score?: string | number;
  className?: string;
}

const sizes = {
  sm: 'h-24 w-24',
  md: 'h-40 w-40',
  lg: 'h-60 w-60',
};

const ring: Record<IntentCoreState, string> = {
  idle: 'shadow-white/20',
  tracing: 'shadow-white/30 animate-pulse',
  drift: 'shadow-zinc-400/20 skew-x-2',
  restore: 'shadow-white/35 animate-pulse',
  restored: 'shadow-white/50',
};

const IntentCore: React.FC<IntentCoreProps> = ({ state = 'idle', size = 'md', label, score, className = '' }) => (
  <div className={`relative mx-auto flex items-center justify-center ${sizes[size]} ${className}`} aria-label={label ?? 'Intent core'}>
    <div className={`absolute inset-0 rounded-full border border-white/15 bg-white/[0.03] blur-[1px] shadow-[0_0_90px] ${ring[state]}`} />
    <div className="absolute inset-4 rounded-full border border-white/20 bg-[radial-gradient(circle,rgba(255,255,255,.32),rgba(255,255,255,.06)_42%,rgba(0,0,0,.15)_70%)]" />
    <div className="absolute inset-8 rounded-full border border-white/20 bg-black/50 backdrop-blur-xl" />
    <div className="relative text-center">
      {score !== undefined ? (
        <div className="text-5xl font-black tracking-tight text-white drop-shadow-[0_0_18px_rgba(255,255,255,.45)]">{score}</div>
      ) : (
        <div className="h-9 w-9 mx-auto rounded-full bg-white shadow-[0_0_42px_rgba(255,255,255,.9)]" />
      )}
      {label && <p className="mt-2 text-[10px] uppercase tracking-[0.32em] text-zinc-300">{label}</p>}
    </div>
  </div>
);

export default IntentCore;
