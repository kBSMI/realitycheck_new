import type { SLAObservation, SLATarget } from '../../types/enterpriseRuntime';
import type { SMISLAClass } from '../../types/smiEngine';
import { saveSLAObservationRecord } from '../repositories/enterpriseRuntimeRepository';

export const SLA_TARGETS: Record<SMISLAClass, SLATarget> = {
  interactive: { slaClass: 'interactive', maxLatencyMs: 900, maxQueueDepth: 10, posture: 'interactive' },
  standard: { slaClass: 'standard', maxLatencyMs: 5_000, maxQueueDepth: 100, posture: 'standard' },
  bulk: { slaClass: 'bulk', maxLatencyMs: 60_000, maxQueueDepth: 10_000, posture: 'bulk' },
  regulated: { slaClass: 'regulated', maxLatencyMs: 15_000, maxQueueDepth: 500, posture: 'regulated' },
};

const observations: SLAObservation[] = [];

export function recordSLAObservation(slaClass: SMISLAClass, durationMs: number): SLAObservation {
  const target = SLA_TARGETS[slaClass];
  const observation: SLAObservation = {
    slaClass,
    durationMs,
    targetMs: target.maxLatencyMs,
    withinTarget: durationMs <= target.maxLatencyMs,
    observedAt: new Date().toISOString(),
  };
  observations.unshift(observation);
  void saveSLAObservationRecord(observation);
  return observation;
}

export function listSLAObservations(): SLAObservation[] {
  return observations.slice(0, 250);
}
