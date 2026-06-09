import {
  F5StreamEvent,
  F5StreamType,
  F5EventSource,
  AIWorkflowEvent,
  EventType,
  EventSeverity,
} from '../types/smi';
import { f5StreamEvents } from '../data/f5SimulationEvents';

// ─── F5 ADSP Simulation Connector ────────────────────────────────────────────
// Demonstration layer that maps SMI event structures to F5-style AI gateway,
// guardrail, red-team, and XOps event streams.
//
// DISCLAIMER: This is a mock simulation only. It is not an official F5 integration.
// If accepted through F5's partner process, this could evolve into a
// partner-approved ADSP integration pattern.

export interface F5SimulationResult {
  stream: F5StreamType;
  source: F5EventSource;
  eventsProcessed: number;
  totalContinuityDelta: number;
  passCount: number;
  warnCount: number;
  failCount: number;
  mappedSMIEvents: AIWorkflowEvent[];
}

// Stream type → SMI event type mapping table
const STREAM_TO_SMI_EVENT: Record<F5StreamType, EventType> = {
  'ai_gateway.request':                    'nominal_operation',
  'ai_gateway.response':                   'sensitive_data_risk',
  'ai_guardrails.policy_violation':        'guardrail_violation',
  'ai_guardrails.prompt_injection_detected': 'guardrail_violation',
  'ai_redteam.test_result':                'forbidden_behavior',
  'adsp.policy_version_changed':           'policy_version_mismatch',
  'agent.tool_call':                       'unauthorized_tool_call',
  'xops.workflow_anomaly':                 'memory_state_change',
};

// Classification → severity mapping
const CLASSIFICATION_TO_SEVERITY: Record<F5StreamEvent['classification'], EventSeverity> = {
  pass: 'info',
  warn: 'medium',
  fail: 'high',
};

/**
 * Map a single F5StreamEvent to a canonical SMI AIWorkflowEvent.
 * This is the core translation function for the simulation connector.
 */
export function mapF5EventToSMIEvent(f5Event: F5StreamEvent): AIWorkflowEvent {
  return {
    id: `smi-${f5Event.id}`,
    workflowId: f5Event.workflowId,
    baselineId: `bl-${f5Event.workflowId.replace('wf-', '')}`,
    timestamp: f5Event.timestamp,
    eventType: STREAM_TO_SMI_EVENT[f5Event.stream] ?? 'nominal_operation',
    severity: CLASSIFICATION_TO_SEVERITY[f5Event.classification],
    description: `[F5 ${f5Event.stream}] ${f5Event.description}`,
    payload: Object.fromEntries(
      Object.entries(f5Event.rawPayload).map(([k, v]) => [k, String(v)])
    ),
  };
}

/**
 * Run all F5 simulation events for a given stream type.
 * Returns aggregated results and the mapped SMI events.
 */
export function runF5SimulationStream(stream: F5StreamType): F5SimulationResult {
  const events = f5StreamEvents.filter((e) => e.stream === stream);
  const mapped = events.map(mapF5EventToSMIEvent);

  return {
    stream,
    source: events[0]?.source ?? 'ai-gateway',
    eventsProcessed: events.length,
    totalContinuityDelta: events.reduce((s, e) => s + e.continuityDelta, 0),
    passCount: events.filter((e) => e.classification === 'pass').length,
    warnCount: events.filter((e) => e.classification === 'warn').length,
    failCount: events.filter((e) => e.classification === 'fail').length,
    mappedSMIEvents: mapped,
  };
}

/**
 * Run all 8 F5 ADSP simulation streams and return results per stream.
 */
export function runAllF5Streams(): F5SimulationResult[] {
  const streams: F5StreamType[] = [
    'ai_gateway.request',
    'ai_gateway.response',
    'ai_guardrails.policy_violation',
    'ai_guardrails.prompt_injection_detected',
    'ai_redteam.test_result',
    'adsp.policy_version_changed',
    'agent.tool_call',
    'xops.workflow_anomaly',
  ];
  return streams.map(runF5SimulationStream);
}
