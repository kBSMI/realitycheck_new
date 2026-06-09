import { AIWorkflow } from '../types/smi';

// ─── Registered AI Workflows ──────────────────────────────────────────────────
// Five representative enterprise workflows spanning healthy, degraded, and
// quarantine states. All config values are deterministic and version-pinned.

export const workflows: AIWorkflow[] = [
  {
    id: 'wf-001',
    name: 'Core Inference Engine',
    description: 'Primary AI inference pipeline for customer-facing credit decisions. Runs under strict guardrail and XOps monitoring.',
    owner: 'ai-platform-team',
    environment: 'production',
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
    dependsOn: ['wf-002', 'wf-005'],
    tags: ['xops-monitored', 'guardrail-active', 'credit-decisioning', 'production-critical'],
    createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },

  {
    id: 'wf-002',
    name: 'Data Enrichment Agent',
    description: 'Automated data classification and enrichment pipeline. Feeds structured inputs to downstream inference workflows.',
    owner: 'data-engineering',
    environment: 'production',
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
    dependsOn: ['wf-005'],
    tags: ['audit-required', 'data-pipeline', 'enrichment'],
    createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },

  {
    id: 'wf-003',
    name: 'Seasonal Campaign AI',
    description: 'Campaign targeting optimization model. Undergoes periodic retraining cycles that historically introduce behavioral drift.',
    owner: 'marketing-tech',
    environment: 'production',
    modelConfig: {
      // DRIFT: model was updated from approved version during retraining
      modelId: 'gpt-4o',
      version: '2024-08-06',       // approved baseline was 2024-05-13
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'campaign-targeting-v3',
      version: '3.1.0',            // approved baseline was 3.0.0
      hash: 'c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6',  // hash mismatch from baseline
    },
    policyConfig: {
      // DRIFT: policy rolled back to older version during retraining
      policyId: 'enterprise-ai-policy',
      version: '1.8.0',            // approved baseline was 2.1.0
      guardrailsEnabled: false,     // guardrails disabled — critical violation
      allowedTools: ['audience-segment', 'campaign-score', 'ab-test-assign', 'external-pixel'],
      forbiddenBehaviors: ['direct-pii-output'],
    },
    dependsOn: ['wf-002'],
    tags: ['drift-detected', 'review-pending', 'campaign', 'retraining-cycle'],
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },

  {
    id: 'wf-004',
    name: 'LCOS Connector v3',
    description: 'Legacy connectivity layer bridging the LCOS system and the enterprise AI gateway. Accumulated state drift from incremental patches.',
    owner: 'platform-ops',
    environment: 'staging',
    modelConfig: {
      modelId: 'gpt-4o-mini',
      version: '2024-07-18',
      provider: 'openai',
    },
    promptConfig: {
      promptId: 'lcos-bridge-v1',
      version: '1.2.3',            // approved baseline was 1.2.0 — minor version bump
      hash: 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9',
    },
    policyConfig: {
      policyId: 'enterprise-ai-policy',
      version: '1.8.0',            // policy lag — not updated to 2.1.0
      guardrailsEnabled: true,
      allowedTools: ['lcos-read', 'lcos-write', 'bridge-transform'],
      forbiddenBehaviors: ['schema-override', 'external-api-call'],
    },
    dependsOn: ['wf-005'],
    tags: ['bridge-layer', 'legacy', 'policy-lag', 'staging'],
    createdAt: new Date(Date.now() - 240 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },

  {
    id: 'wf-005',
    name: 'AI Gateway Proxy',
    description: 'Enterprise AI gateway and API routing layer. Acts as the security boundary for all outbound model calls.',
    owner: 'ai-platform-team',
    environment: 'production',
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
    dependsOn: [],
    tags: ['xops-monitored', 'guardrail-active', 'gateway', 'security-boundary'],
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

export const getWorkflowById = (id: string): AIWorkflow | undefined =>
  workflows.find((w) => w.id === id);
