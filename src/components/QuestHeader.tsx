import React from 'react';
import GlassPanel from './GlassPanel';
import SignalPathStepper from './SignalPathStepper';

interface QuestHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  activeStep?: number;
  rightSlot?: React.ReactNode;
}

const QuestHeader: React.FC<QuestHeaderProps> = ({ eyebrow = 'AI Reality Check', title, subtitle, activeStep, rightSlot }) => (
  <GlassPanel className="p-4 sm:p-5 mb-5">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1">{eyebrow}</p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {rightSlot}
    </div>
    {activeStep && <div className="mt-5"><SignalPathStepper activeStep={activeStep} /></div>}
  </GlassPanel>
);

export default QuestHeader;
