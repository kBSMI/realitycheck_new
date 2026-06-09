import type {
  RealityCheckInput,
  RealityCheckResult,
  ImprovementCheckResult,
  TeamComparisonResult,
  UseCaseType,
} from '../types/realityCheck';
import type { PilotReport } from '../types/smi';

export interface RealityCheckRequest {
  input: RealityCheckInput;
  clientRequestId?: string;
}

export interface RealityCheckResponse {
  result: RealityCheckResult;
}

export interface ImprovementCheckRequest {
  originalCheckId: string;
  improvedOutput: string;
}

export interface ImprovementCheckResponse {
  improvement: ImprovementCheckResult;
}

export interface TeamCompareRequest {
  projectName: string;
  useCaseType: UseCaseType;
  baselineOutput: string;
  newOutput: string;
}

export interface TeamCompareResponse {
  result: TeamComparisonResult;
}

export interface EnterpriseBaselineRequest {
  workflowId: string;
  workflowName: string;
  approvedBehaviorSummary: string;
  allowedTools?: string[];
  policyVersion?: string;
  promptVersion?: string;
  modelVersion?: string;
}

export interface EnterpriseBaselineResponse {
  baselineId: string;
  workflowId: string;
  createdAt: string;
  status: 'created' | 'updated' | 'rejected';
}

export interface EnterpriseScoreRequest {
  workflowId: string;
  eventIds?: string[];
  runMode: 'synthetic' | 'historical_replay' | 'live_event_sample';
}

export interface EnterpriseScoreResponse {
  workflowId: string;
  continuityScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  driftFindingCount: number;
  auditRecordId?: string;
}

export interface ReportExportRequest {
  reportId: string;
  format: 'json' | 'html' | 'pdf_future';
}

export interface ReportExportResponse {
  reportId: string;
  format: ReportExportRequest['format'];
  generatedAt: string;
  payload?: RealityCheckResult | TeamComparisonResult | PilotReport | Record<string, unknown>;
}
