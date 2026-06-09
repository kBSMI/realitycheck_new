export type WorkflowStatus = 'Approved' | 'Watch' | 'Review Required' | 'Quarantine';

export interface AIWorkflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  continuityScore: number; // 0-100
  policyTags: string[];
  lastActive: string; // ISO date string
}

export interface ContinuityPulse {
  workflowId: string;
  timestamp: string;
  score: number; // 0-100
  behaviorPatterns: string[];
}

export interface RemediationRecommendation {
  id: string;
  workflowId: string;
  recommendation: string;
  scoreImprovement: number;
  effort: 'Low' | 'Medium' | 'High';
  timestamp: string;
}

export interface BehavioralEvent {
  id: string;
  workflowId: string;
  timestamp: string;
  classification: 'Nominal' | 'Anomalous' | 'Guardrail Triggered';
  message: string;
  severity: number; // 0-100
}

export interface AuditEntry {
  id: string;
  sessionId: string;
  score: number;
  source: string;
  timestamp: string;
  policyRef: string;
}

export interface WorkflowDependency {
  sourceId: string;
  targetId: string;
  strength: number; // 0-100
  linkType: string;
  active: boolean;
}

export interface BaselineAnchor {
  workflowId: string;
  capturedAt: string;
  sessionRef: string;
}
