import type { SMIEngineInput, SMIEngineResult, SMISLAClass } from './smiEngine';

export type TenantPlan = 'free' | 'beta' | 'teams' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'trial';

export interface TenantProfile {
  id: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  allowedInputModes: Array<'single' | 'batch' | 'stream'>;
  maxRecordsPerBatch: number;
  maxEventsPerMinute: number;
  defaultSlaClass: SMISLAClass;
  createdAt: string;
}

export interface ApiKeyRecord {
  id: string;
  tenantId: string;
  keyPrefix: string;
  keyHash: string;
  label: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

export interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
  reason: string;
}

export interface StreamCursor {
  tenantId: string;
  streamId: string;
  lastSequence: number;
  lastAuditHash?: string;
  updatedAt: string;
}

export interface SMIQueueJob {
  id: string;
  tenantId: string;
  input: SMIEngineInput;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  slaClass: SMISLAClass;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: SMIEngineResult;
  error?: string;
}

export interface SLATarget {
  slaClass: SMISLAClass;
  maxLatencyMs: number;
  maxQueueDepth: number;
  posture: 'interactive' | 'standard' | 'bulk' | 'regulated';
}

export interface SLAObservation {
  slaClass: SMISLAClass;
  durationMs: number;
  withinTarget: boolean;
  targetMs: number;
  observedAt: string;
}
