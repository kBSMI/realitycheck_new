import { useState } from 'react';

export type AnalysisMode = 'live' | 'historical' | 'simulation';
export type ContinuityStatus = 'stable' | 'degrading' | 'remediating';

interface ContinuityStateHook {
  analysisMode: AnalysisMode;
  setAnalysisMode: (mode: AnalysisMode) => void;
  continuityStatus: ContinuityStatus;
  addBaselineAnchor: (tag: string) => void;
  sessionRef: string;
}

export const useContinuityState = (workflowId: string): ContinuityStateHook => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('live');
  const [continuityStatus] = useState<ContinuityStatus>('stable');

  const sessionRef = `session-pilot-${workflowId}-${Date.now()}`;

  const addBaselineAnchor = (tag: string) => {
    // Baseline anchors are stored in session context for audit trail
    console.info(`Baseline anchor registered: anchor:${sessionRef}:${tag}`);
  };

  return {
    analysisMode,
    setAnalysisMode,
    continuityStatus,
    addBaselineAnchor,
    sessionRef,
  };
};

export default useContinuityState;
