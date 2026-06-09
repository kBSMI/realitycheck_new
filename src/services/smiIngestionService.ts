import {
  AIWorkflowEvent,
  EventType,
  EventSeverity,
} from '../types/smi';

// ─── SMI Ingestion Service ────────────────────────────────────────────────────
// Receives raw event objects, validates required fields, normalizes shape,
// and classifies event type and severity before routing into the scoring pipeline.
// In a production deployment this would be a REST or gRPC endpoint.

// Minimal raw event shape accepted at the intake boundary
export interface RawEvent {
  workflowId: string;
  baselineId: string;
  eventType: EventType;
  severity?: EventSeverity;
  description: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

// Result returned after normalization
export interface IngestResult {
  normalized: AIWorkflowEvent;
  valid: boolean;
  validationErrors: string[];
  routingDecision: 'score' | 'flag' | 'reject' | 'ignore';
}

let _eventCounter = 1000;

function nextEventId(): string {
  return `evt-ing-${String(++_eventCounter).padStart(4, '0')}`;
}

/** Derive routing decision from event type and severity. */
function routingDecision(event: AIWorkflowEvent): IngestResult['routingDecision'] {
  if (event.severity === 'critical') return 'flag';
  if (event.eventType === 'nominal_operation') return 'ignore';
  if (
    event.eventType === 'forbidden_behavior' ||
    event.eventType === 'guardrail_violation' ||
    event.eventType === 'unauthorized_tool_call'
  ) return 'score';
  return 'score';
}

/** Validate that required fields are present and well-typed. */
function validate(raw: RawEvent): string[] {
  const errors: string[] = [];
  if (!raw.workflowId) errors.push('workflowId is required');
  if (!raw.baselineId) errors.push('baselineId is required');
  if (!raw.eventType) errors.push('eventType is required');
  if (!raw.description || raw.description.trim().length === 0) errors.push('description is required');
  return errors;
}

/**
 * Normalize a raw event object into a canonical AIWorkflowEvent.
 * Does not write to the audit ledger — call auditLedgerService separately.
 */
export function normalizeEvent(raw: RawEvent): AIWorkflowEvent {
  return {
    id: nextEventId(),
    workflowId: raw.workflowId,
    baselineId: raw.baselineId,
    timestamp: raw.timestamp ?? new Date().toISOString(),
    eventType: raw.eventType,
    severity: raw.severity ?? 'info',
    description: raw.description,
    payload: (raw.payload as AIWorkflowEvent['payload']) ?? {},
  };
}

/**
 * Full ingestion pipeline: validate → normalize → route.
 * Returns the normalized event and routing metadata.
 */
export function ingestWorkflowEvent(raw: RawEvent): IngestResult {
  const errors = validate(raw);

  if (errors.length > 0) {
    const placeholder = normalizeEvent({ ...raw, eventType: 'nominal_operation', severity: 'info' });
    return {
      normalized: placeholder,
      valid: false,
      validationErrors: errors,
      routingDecision: 'reject',
    };
  }

  const normalized = normalizeEvent(raw);

  return {
    normalized,
    valid: true,
    validationErrors: [],
    routingDecision: routingDecision(normalized),
  };
}
