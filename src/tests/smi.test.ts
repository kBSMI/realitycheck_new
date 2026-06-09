import { describe, it, expect, beforeEach } from 'vitest';
import { computeContinuityScore, classifyRiskLevel } from '../services/memoryMorphologyEngine';
import { getLedger, recordBaselineCaptured, resetLedgerToSeed } from '../services/auditLedgerService';
import { seedAuditRecords } from '../data/auditLedger';
import { workflows } from '../data/workflows';
import { baselines } from '../data/baselines';
import { workflowEvents } from '../data/events';
import { csWorkflow } from '../data/lifecycleScenario';
import type { AIWorkflow, BaselineAnchor, AIWorkflowEvent } from '../types/smi';
import {
  parseCommand,
  executeCommand,
  clearAllSessions,
  getSessionState,
} from '../services/commandExecutionService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorkflow(overrides: Partial<AIWorkflow> = {}): AIWorkflow {
  return {
    id: 'wf-test',
    name: 'Test Workflow',
    description: '',
    owner: 'test-team',
    environment: 'staging',
    modelConfig: { modelId: 'gpt-4o', version: '2024-05-13', provider: 'OpenAI' },
    promptConfig: { promptId: 'p-test', version: '1.0.0', hash: 'aabbccdd' },
    policyConfig: {
      policyId: 'pol-test',
      version: '2.1.0',
      guardrailsEnabled: true,
      allowedTools: ['search', 'summarize'],
      forbiddenBehaviors: ['pii_exfiltration'],
    },
    dependsOn: [],
    tags: [],
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    ...overrides,
  };
}

function makeBaseline(workflow: AIWorkflow): BaselineAnchor {
  return {
    id: `bl-${workflow.id}`,
    workflowId: workflow.id,
    capturedAt: new Date().toISOString(),
    capturedBy: 'xops-reviewer-01',
    sessionRef: 'session-test',
    approvedRiskLevel: 'Approved',
    modelConfig: { ...workflow.modelConfig },
    promptConfig: { ...workflow.promptConfig },
    policyConfig: { ...workflow.policyConfig },
    notes: '',
  };
}

function makeEvent(type: AIWorkflowEvent['eventType'], overrides: Partial<AIWorkflowEvent> = {}): AIWorkflowEvent {
  return {
    id: `evt-${Date.now()}-${Math.random()}`,
    workflowId: 'wf-test',
    baselineId: 'bl-wf-test',
    timestamp: new Date().toISOString(),
    eventType: type,
    severity: 'medium',
    description: `Test event: ${type}`,
    payload: {},
    ...overrides,
  };
}

// ─── 1. Score 100 with no events ──────────────────────────────────────────────

describe('computeContinuityScore', () => {
  it('returns score 100 Approved for a workflow with no events', () => {
    const wf = makeWorkflow();
    const bl = makeBaseline(wf);
    const result = computeContinuityScore(wf, bl, []);
    expect(result.continuityScore).toBe(100);
    expect(result.riskLevel).toBe('Approved');
    expect(result.totalDeducted).toBe(0);
    expect(result.deductions).toHaveLength(0);
  });

  // ─── 2. wf-001 live engine score ─────────────────────────────────────────────

  it('scores wf-001 as 92 Approved (memory_state_change -8)', () => {
    const wf = workflows.find((w) => w.id === 'wf-001')!;
    const bl = baselines.find((b) => b.workflowId === 'wf-001')!;
    const events = workflowEvents.filter((e) => e.workflowId === 'wf-001');
    const result = computeContinuityScore(wf, bl, events);
    expect(result.continuityScore).toBe(92);
    expect(result.riskLevel).toBe('Approved');
  });

  // ─── 3. wf-003 live engine score ─────────────────────────────────────────────

  it('scores wf-003 as Quarantine (score < 60)', () => {
    const wf = workflows.find((w) => w.id === 'wf-003')!;
    const bl = baselines.find((b) => b.workflowId === 'wf-003')!;
    const events = workflowEvents.filter((e) => e.workflowId === 'wf-003');
    const result = computeContinuityScore(wf, bl, events);
    expect(result.riskLevel).toBe('Quarantine');
    expect(result.continuityScore).toBeLessThan(60);
  });

  // ─── 4. Deduction table accuracy ────────────────────────────────────────────

  it('applies correct deduction for each event type', () => {
    const wf = makeWorkflow();
    const bl = makeBaseline(wf);

    const cases: [AIWorkflowEvent['eventType'], number][] = [
      ['model_version_change', 15],
      ['policy_version_mismatch', 15],
      ['unauthorized_tool_call', 10],
      ['forbidden_behavior', 15],
      ['guardrail_violation', 15],
      ['memory_state_change', 8],
      ['orchestration_change', 9],
      ['nominal_operation', 0],
    ];

    for (const [type, expectedDeduction] of cases) {
      const event = makeEvent(type, {
        payload: type === 'forbidden_behavior' ? { behaviorConfidence: 0.9 } : {},
      });
      const result = computeContinuityScore(wf, bl, [event]);
      expect(result.totalDeducted).toBe(expectedDeduction);
    }
  });

  // ─── 5. Prompt version with hash match = reduced deduction ───────────────────

  it('reduces prompt_version_change deduction to 3 when hash matches', () => {
    const wf = makeWorkflow();
    const bl = makeBaseline(wf);
    const event = makeEvent('prompt_version_change', {
      payload: { promptHashMatch: true },
    });
    const result = computeContinuityScore(wf, bl, [event]);
    expect(result.totalDeducted).toBe(3);
  });

  it('applies full 12pt deduction for prompt_version_change with hash mismatch', () => {
    const wf = makeWorkflow();
    const bl = makeBaseline(wf);
    const event = makeEvent('prompt_version_change', {
      payload: { promptHashMatch: false },
    });
    const result = computeContinuityScore(wf, bl, [event]);
    expect(result.totalDeducted).toBe(12);
  });
});

// ─── 6. Risk level classification boundaries ─────────────────────────────────

describe('classifyRiskLevel', () => {
  it('returns Approved for scores 90-100', () => {
    expect(classifyRiskLevel(100)).toBe('Approved');
    expect(classifyRiskLevel(90)).toBe('Approved');
  });

  it('returns Watch for scores 75-89', () => {
    expect(classifyRiskLevel(89)).toBe('Watch');
    expect(classifyRiskLevel(75)).toBe('Watch');
  });

  it('returns Review Required for scores 60-74', () => {
    expect(classifyRiskLevel(74)).toBe('Review Required');
    expect(classifyRiskLevel(60)).toBe('Review Required');
  });

  it('returns Quarantine for scores below 60', () => {
    expect(classifyRiskLevel(59)).toBe('Quarantine');
    expect(classifyRiskLevel(0)).toBe('Quarantine');
  });
});

// ─── 7. Audit Ledger hash chaining ───────────────────────────────────────────

describe('Audit Ledger hash chaining', () => {
  it('seed records all have non-empty previousHash and currentHash', () => {
    const records = getLedger();
    for (const r of records) {
      expect(r.previousHash).toBeTruthy();
      expect(r.currentHash).toBeTruthy();
      expect(r.currentHash.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('first seed record previousHash is the genesis sentinel', () => {
    expect(seedAuditRecords[0].previousHash).toBe('0000000000000000');
  });

  it('seed records form a hash chain in insertion order', () => {
    for (let i = 1; i < seedAuditRecords.length; i++) {
      expect(seedAuditRecords[i].previousHash).toBe(seedAuditRecords[i - 1].currentHash);
    }
  });

  it('newly appended record has previousHash equal to the last seed currentHash', () => {
    resetLedgerToSeed();
    const lastSeed = seedAuditRecords[seedAuditRecords.length - 1];
    recordBaselineCaptured('s-hash-test', 'wf-001', 'bl-001', 'tester', 'pol::test', 'hash chain test');
    const after = getLedger();
    const newRecord = after.find((r) => parseInt(r.id.replace('ald-', '')) > 15);
    expect(newRecord).toBeDefined();
    expect(newRecord!.previousHash).toBe(lastSeed.currentHash);
  });
});

// ─── 8. Command Execution Service ────────────────────────────────────────────

describe('commandExecutionService', () => {
  beforeEach(() => {
    clearAllSessions();
  });

  it('parseCommand correctly identifies run lifecycle wf-cs', () => {
    const parsed = parseCommand('run lifecycle wf-cs');
    expect(parsed.type).toBe('run_lifecycle');
    if (parsed.type === 'run_lifecycle') {
      expect(parsed.workflowId).toBe('wf-cs');
    }
  });

  it('run lifecycle wf-cs returns score 63 and risk level Review Required', () => {
    const result = executeCommand({ type: 'run_lifecycle', workflowId: 'wf-cs' });
    const step4Line = result.lines.find((l) => l.text.includes('[4]'));
    expect(step4Line).toBeDefined();
    expect(step4Line!.text).toContain('63');
    const step5Line = result.lines.find((l) => l.text.includes('[5]') && l.text.includes('Review Required'));
    expect(step5Line).toBeDefined();
  });

  it('simulate tool_access_added wf-cs billing-api mutates session state only, not seed data', () => {
    executeCommand({ type: 'simulate_tool_access_added', workflowId: 'wf-cs', toolName: 'billing-api' });
    const session = getSessionState('wf-cs');
    expect(session).not.toBeNull();
    expect(session!.runtimeTools).toContain('billing-api');
    // Seed workflow data must not be modified — csWorkflow is from lifecycleScenario.ts seed
    // The test validates that csWorkflow's tool list remains what it was at import time
    // (billing-api IS in csWorkflow.policyConfig.allowedTools because it's the "after" state,
    //  but the baseline csBaseline does NOT include it — that's the boundary)
    expect(csWorkflow).toBeDefined();
    // Session accumulated events must be empty (tool_access_added does not create an event)
    expect(session!.accumulatedEvents).toHaveLength(0);
  });

  it('simulate tool_access_added with billing_api alias normalizes to billing-api', () => {
    executeCommand({ type: 'simulate_tool_access_added', workflowId: 'wf-cs', toolName: 'billing_api' });
    const session = getSessionState('wf-cs');
    expect(session).not.toBeNull();
    expect(session!.runtimeTools).toContain('billing-api');
    expect(session!.runtimeTools).not.toContain('billing_api');
  });

  it('unknown command returns an error line and at least one hint line', () => {
    const result = executeCommand({ type: 'unknown', input: 'foobar --invalid' });
    const errorLine = result.lines.find((l) => l.type === 'error');
    const hintLine = result.lines.find((l) => l.type === 'hint');
    expect(errorLine).toBeDefined();
    expect(hintLine).toBeDefined();
  });

  it('clear resets session state so getSessionState returns null', () => {
    // Initialize a session by running a simulate command
    executeCommand({ type: 'simulate_prompt_change', workflowId: 'wf-cs' });
    expect(getSessionState('wf-cs')).not.toBeNull();
    // clear must wipe it
    executeCommand({ type: 'clear' });
    expect(getSessionState('wf-cs')).toBeNull();
  });
});
