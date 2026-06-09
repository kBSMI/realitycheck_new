import React from 'react';
import { questSteps } from '../data/questSteps';

interface SignalPathStepperProps {
  activeStep: number;
  compact?: boolean;
}

const SignalPathStepper: React.FC<SignalPathStepperProps> = ({ activeStep, compact = false }) => (
  <div className="w-full">
    <div className="flex items-center gap-1.5">
      {questSteps.map((step, idx) => {
        const active = step.id === activeStep;
        const done = step.id < activeStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div className={`h-7 w-7 rounded-full border flex items-center justify-center text-[11px] font-semibold transition-all ${
                active ? 'border-white bg-white text-black shadow-[0_0_26px_rgba(255,255,255,.35)]' : done ? 'border-white/45 bg-white/15 text-white' : 'border-white/10 bg-white/[0.03] text-zinc-600'
              }`}>{step.id}</div>
              {!compact && <span className={`text-[9px] uppercase tracking-wider ${active ? 'text-white' : done ? 'text-zinc-300' : 'text-zinc-600'}`}>{step.label}</span>}
            </div>
            {idx < questSteps.length - 1 && <div className={`h-px flex-1 ${done ? 'bg-white/35' : 'bg-white/10'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  </div>
);

export default SignalPathStepper;
