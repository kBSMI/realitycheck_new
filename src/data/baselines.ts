import { BaselineAnchor } from '../types/smi';

// ─── Baseline Anchors ─────────────────────────────────────────────────────────
// Each anchor captures the exact approved state of a workflow at a specific
// point in time. The scoring engine measures all subsequent events against
// the anchor's model, prompt, and policy configs.

export const baselines: BaselineAnchor[] = [
  // wf-001 — Core Inference Engine: approved, current, no drift
  {
    id: 'bl-001',
    workflowId: 'wf-001',
    capturedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    capturedBy: 'xops-reviewer-01',
    sessionRef: 'session-pilot-001',
    approvedRiskLevel: 'Approved',
    modelConfig: {
      modelId: 'gpt-4o',
      version: '2024-05-13',
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'credit-decision-v4',
      version: '4.2.0',
      hash: 'a3f9e1b2c4d5e6f7a8b9c0d1e2f3a4b5',
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '2.1.0',
      guardrailsEnabled: true,
      allowedTools: ['credit-lookup', 'identity-verify', 'risk-score'],
      forbiddenBehaviors: ['direct-pii-output', 'override-decision', 'external-api-call'],
    },
    notes: 'Approved by XOps for production deployment. All policy controls verified.',
  },

  // wf-002 — Data Enrichment Agent: approved, current, no drift
  {
    id: 'bl-002',
    workflowId: 'wf-002',
    capturedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    capturedBy: 'xops-reviewer-02',
    sessionRef: 'session-pilot-001',
    approvedRiskLevel: 'Approved',
    modelConfig: {
      modelId: 'gpt-4o-mini',
      version: '2024-07-18',
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'enrichment-classifier-v2',
      version: '2.0.1',
      hash: 'b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2',
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '2.1.0',
      guardrailsEnabled: true,
      allowedTools: ['data-classify', 'schema-validate', 'enrichment-lookup'],
      forbiddenBehaviors: ['raw-pii-storage', 'external-write', 'schema-override'],
    },
    notes: 'Approved after audit-required review cycle. No anomalies.',
  },

  // wf-003 — Seasonal Campaign AI: baseline was approved; workflow has since drifted
  {
    id: 'bl-003',
    workflowId: 'wf-003',
    capturedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    capturedBy: 'xops-reviewer-01',
    sessionRef: 'session-pilot-001',
    approvedRiskLevel: 'Approved',
    modelConfig: {
      modelId: 'gpt-4o',
      version: '2024-05-13',         // approved version — workflow has since changed
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'campaign-targeting-v3',
      version: '3.0.0',              // approved version — workflow is now on 3.1.0
      hash: 'f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5',  // hash no longer matches
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '2.1.0',              // approved version — workflow rolled back to 1.8.0
      guardrailsEnabled: true,
      allowedTools: ['audience-segment', 'campaign-score', 'ab-test-assign'],
      forbiddenBehaviors: ['direct-pii-output', 'external-pixel'],
    },
    notes: 'Approved pre-retraining cycle. Retraining has since introduced multiple drift conditions.',
  },

  // wf-004 — LCOS Connector v3: minor version bump and policy lag
  {
    id: 'bl-004',
    workflowId: 'wf-004',
    capturedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    capturedBy: 'xops-reviewer-02',
    sessionRef: 'session-pilot-001',
    approvedRiskLevel: 'Watch',
    modelConfig: {
      modelId: 'gpt-4o-mini',
      version: '2024-07-18',
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'lcos-bridge-v1',
      version: '1.2.0',              // current is 1.2.3 — minor bump
      hash: 'c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '1.8.0',
      guardrailsEnabled: true,
      allowedTools: ['lcos-read', 'lcos-write', 'bridge-transform'],
      forbiddenBehaviors: ['schema-override', 'external-api-call'],
    },
    notes: 'Approved at Watch level. Policy upgrade to 2.1.0 was required but not completed.',
  },

  // wf-005 — AI Gateway Proxy: fully aligned, highest score
  {
    id: 'bl-005',
    workflowId: 'wf-005',
    capturedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    capturedBy: 'xops-reviewer-01',
    sessionRef: 'session-pilot-001',
    approvedRiskLevel: 'Approved',
    modelConfig: {
      modelId: 'gpt-4o',
      version: '2024-05-13',
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'gateway-routing-v5',
      version: '5.0.0',
      hash: 'e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '2.1.0',
      guardrailsEnabled: true,
      allowedTools: ['route-request', 'auth-validate', 'rate-limit', 'log-event'],
      forbiddenBehaviors: ['bypass-auth', 'direct-model-call', 'log-suppression'],
    },
    notes: 'Gold standard gateway baseline. XOps sign-off confirmed.',
  },
];

export const getBaselineById = (id: string): BaselineAnchor | undefined =>
  baselines.find((b) => b.id === id);

export const getBaselineForWorkflow = (workflowId: string): BaselineAnchor | undefined =>
  baselines.find((b) => b.workflowId === workflowId);
