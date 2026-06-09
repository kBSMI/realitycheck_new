import React from 'react';
import type { RorschachVariant } from '../styles/neuralTheme';

interface RorschachLayerProps {
  variant?: RorschachVariant;
  opacity?: number;
  className?: string;
}

const variantClass: Record<RorschachVariant, string> = {
  soft: 'scale-100 blur-2xl',
  dense: 'scale-110 blur-xl',
  fractured: 'scale-105 blur-sm opacity-80',
  restored: 'scale-100 blur-xl brightness-125',
};

const RorschachLayer: React.FC<RorschachLayerProps> = ({ variant = 'soft', opacity = 0.4, className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} style={{ opacity }} aria-hidden="true">
    <div className={`absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 ${variantClass[variant]}`}>
      <div className="absolute inset-0 rounded-[45%] bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,.62),transparent_18%),radial-gradient(circle_at_70%_35%,rgba(255,255,255,.38),transparent_21%),radial-gradient(circle_at_35%_70%,rgba(255,255,255,.24),transparent_25%),radial-gradient(circle_at_72%_76%,rgba(255,255,255,.32),transparent_20%)]" />
      <div className="absolute inset-0 translate-x-[52%] scale-x-[-1] rounded-[45%] bg-[radial-gradient(circle_at_28%_28%,rgba(255,255,255,.62),transparent_18%),radial-gradient(circle_at_70%_35%,rgba(255,255,255,.38),transparent_21%),radial-gradient(circle_at_35%_70%,rgba(255,255,255,.24),transparent_25%),radial-gradient(circle_at_72%_76%,rgba(255,255,255,.32),transparent_20%)]" />
    </div>
    {variant === 'fractured' && (
      <div className="absolute inset-0 bg-[linear-gradient(112deg,transparent_0_45%,rgba(255,255,255,.18)_46%,transparent_48%_100%),linear-gradient(68deg,transparent_0_55%,rgba(255,255,255,.11)_56%,transparent_58%_100%)]" />
    )}
  </div>
);

export default RorschachLayer;
