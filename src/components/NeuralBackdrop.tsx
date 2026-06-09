import React from 'react';
import RorschachLayer from './RorschachLayer';

interface NeuralBackdropProps {
  density?: 'low' | 'medium' | 'high';
  centerGlow?: boolean;
  rorschach?: boolean;
  className?: string;
}

const densityOpacity = { low: 0.08, medium: 0.14, high: 0.22 };

const NeuralBackdrop: React.FC<NeuralBackdropProps> = ({ density = 'medium', centerGlow = true, rorschach = false, className = '' }) => (
  <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
    <div className="absolute inset-0 bg-[#050505]" />
    {centerGlow && (
      <div className="absolute left-1/2 top-[38%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-white/[0.08] blur-3xl" />
    )}
    <div
      className="absolute inset-0"
      style={{
        opacity: densityOpacity[density],
        backgroundImage:
          'linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px), radial-gradient(circle at 20% 30%, rgba(255,255,255,.5) 0 1px, transparent 2px), radial-gradient(circle at 70% 60%, rgba(255,255,255,.4) 0 1px, transparent 2px)',
        backgroundSize: '72px 72px, 72px 72px, 96px 96px, 116px 116px',
      }}
    />
    <svg className="absolute inset-0 h-full w-full opacity-[0.18]" viewBox="0 0 900 900" preserveAspectRatio="none">
      <g stroke="white" strokeWidth="1" fill="none">
        <path d="M44 698 C160 530 256 620 354 447 C458 260 604 374 762 166" />
        <path d="M110 192 C247 306 354 228 442 432 C521 616 671 516 826 744" />
        <path d="M32 438 C205 426 295 352 450 452 C609 556 678 454 876 438" />
      </g>
      <g fill="white">
        {[44,160,256,354,442,521,604,762,826].map((x, i) => (
          <circle key={i} cx={x} cy={(i * 83) % 620 + 120} r={i % 3 === 0 ? 3 : 2} opacity="0.55" />
        ))}
      </g>
    </svg>
    {rorschach && <RorschachLayer variant="soft" opacity={0.18} />}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,.16)_42%,rgba(0,0,0,.82)_100%)]" />
  </div>
);

export default NeuralBackdrop;
