import {
  AIWorkflow,
  BaselineAnchor,
  AIWorkflowEvent,
  ContinuityScore,
  DriftFinding,
  DriftCategory,
  EventSeverity,
} from '../types/smi';

// ─── Drift Detection Rules ────────────────────────────────────────────────────
// Findings are derived from ContinuityScore sub-components and the raw event
// set. Each rule has a threshold below which a finding is raised.
//
// Rules are deterministic: same inputs → same findings, same order.

interface DriftRule {
  id: string;
  category: DriftCategory;
  test: (score: ContinuityScore, workflow: AIWorkflow, baseline: BaselineAnchor, events: AIWorkflowEvent[]) => DriftRuleResult | null;
}

interface DriftRuleResult {
  severity: EventSeverity;
  title: string;
  description: string;
  affectedEventIds: string[];
  driftMagnitude: number;
}

const rules: DriftRule[] = [
  // ── Rule 1: Model drift ───────────────────────────────────────────────────
  {
    id: 'rule-model-drift',
    category: 'model_drift',
    test: (_score, workflow, baseline, events) => {
      const modelEvents = events.filter((e) => e.eventType === 'model_version_change');
      if (modelEvents.length === 0) return null;

      const versionMismatch = workflow.modelConfig.version !== baseline.modelConfig.version;
      const providerMismatch = workflow.modelConfig.modelId !== baseline.modelConfig.modelId;

      if (!versionMismatch && !providerMismatch) return null;

      const severity: EventSeverity = providerMismatch ? 'critical' : 'high';
      const magnitude = providerMismatch ? 80 : 60;

      return {
        severity,
        title: 'Model Version Drift',
        description: providerMismatch
          ? `Model provider changed from ${baseline.modelConfig.provider}/${baseline.modelConfig.modelId} to ${workflow.modelConfig.provider}/${workflow.modelConfig.modelId}. All behavioral baselines are invalidated.`
          : `Model version updated from approved ${baseline.modelConfig.version} to ${workflow.modelConfig.version} without re-baseline. ${modelEvents.length} change event(s) recorded.`,
        affectedEventIds: modelEvents.map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 2: Prompt drift ─────────────────────────────────────────────────
  {
    id: 'rule-prompt-drift',
    category: 'prompt_drift',
    test: (_score, workflow, baseline, events) => {
      const promptEvents = events.filter((e) => e.eventType === 'prompt_version_change');
      if (promptEvents.length === 0) return null;

      const hashMismatch = workflow.promptConfig.hash !== baseline.promptConfig.hash;
      const versionChange = workflow.promptConfig.version !== baseline.promptConfig.version;

      if (!hashMismatch && !versionChange) return null;

      const severity: EventSeverity = hashMismatch ? 'high' : 'medium';
      const magnitude = hashMismatch ? 50 : 25;

      return {
        severity,
        title: 'Prompt Configuration Drift',
        description: hashMismatch
          ? `Prompt content hash does not match baseline anchor (${baseline.promptConfig.hash.slice(0, 8)}…). Version changed ${baseline.promptConfig.version} → ${workflow.promptConfig.version}. Model behavior may have shifted.`
          : `Prompt version bumped ${baseline.promptConfig.version} → ${workflow.promptConfig.version} — hash still matches, low behavioral risk.`,
        affectedEventIds: promptEvents.map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 3: Policy drift ─────────────────────────────────────────────────
  {
    id: 'rule-policy-drift',
    category: 'policy_drift',
    test: (_score, workflow, baseline, events) => {
      const policyEvents = events.filter((e) => e.eventType === 'policy_version_mismatch');
      const guardrailEvents = events.filter((e) => e.eventType === 'guardrail_violation');
      const total = policyEvents.length + guardrailEvents.length;
      if (total === 0) return null;

      const guardrailDisabled = baseline.policyConfig.guardrailsEnabled && !workflow.policyConfig.guardrailsEnabled;
      const severity: EventSeverity = guardrailDisabled ? 'critical' : 'high';
      const magnitude = guardrailDisabled ? 90 : 55;

      return {
        severity,
        title: guardrailDisabled ? 'CRITICAL: Guardrail Layer Disabled' : 'Policy Version Mismatch',
        description: guardrailDisabled
          ? `Guardrail enforcement disabled — baseline required guardrailsEnabled=true under policy ${baseline.policyConfig.version}. Current policy: ${workflow.policyConfig.version}. Active policy enforcement gap.`
          : `Policy version ${workflow.policyConfig.version} does not match approved baseline ${baseline.policyConfig.version}. ${policyEvents.length} mismatch event(s) recorded.`,
        affectedEventIds: [...policyEvents, ...guardrailEvents].map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 4: Tool drift ───────────────────────────────────────────────────
  {
    id: 'rule-tool-drift',
    category: 'tool_drift',
    test: (score, workflow, baseline, events) => {
      const toolEvents = events.filter((e) => e.eventType === 'unauthorized_tool_call');
      const toolVariance = score.toolBehaviorVariance;

      // Raise if unauthorized tool calls occurred OR tool set changed significantly
      if (toolEvents.length === 0 && toolVariance >= 80) return null;

      const baselineTools = new Set(baseline.policyConfig.allowedTools);
      const currentTools = new Set(workflow.policyConfig.allowedTools);
      const added = [...currentTools].filter((t) => !baselineTools.has(t));

      const severity: EventSeverity = toolEvents.length > 0 ? 'high' : 'medium';
      const magnitude = toolEvents.length > 0 ? 65 : 30;

      return {
        severity,
        title: toolEvents.length > 0 ? 'Unauthorized Tool Call Detected' : 'Tool Set Configuration Change',
        description: toolEvents.length > 0
          ? `${toolEvents.length} unauthorized tool call(s): ${toolEvents.map((e) => e.payload.toolName).join(', ')}. These tools are not in the approved baseline tool list.`
          : `Tool set expanded beyond baseline. Added: ${added.join(', ')}. Tool behavior variance score: ${toolVariance}/100.`,
        affectedEventIds: toolEvents.map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 5: Behavior drift ───────────────────────────────────────────────
  {
    id: 'rule-behavior-drift',
    category: 'behavior_drift',
    test: (_score, _workflow, _baseline, events) => {
      const behaviorEvents = events.filter(
        (e) => e.eventType === 'forbidden_behavior' || e.eventType === 'sensitive_data_risk'
      );
      if (behaviorEvents.length === 0) return null;

      const forbidden = behaviorEvents.filter((e) => e.eventType === 'forbidden_behavior');
      const dataRisk = behaviorEvents.filter((e) => e.eventType === 'sensitive_data_risk');

      const hasCritical = forbidden.some((e) => (e.payload.behaviorConfidence ?? 0) >= 0.8);
      const severity: EventSeverity = hasCritical ? 'critical' : 'high';
      const magnitude = hasCritical ? 85 : 55;

      const parts: string[] = [];
      if (forbidden.length > 0) {
        const labels = forbidden.map((e) => e.payload.behaviorLabel ?? 'unknown').join(', ');
        parts.push(`Forbidden behavior(s) detected: ${labels}`);
      }
      if (dataRisk.length > 0) {
        const categories = dataRisk.map((e) => e.payload.dataCategory ?? 'unknown').join(', ');
        parts.push(`Sensitive data risk: ${categories} exposure via ${dataRisk[0].payload.exposureVector ?? 'unknown vector'}`);
      }

      return {
        severity,
        title: 'Behavioral Policy Violation',
        description: parts.join('. ') + '.',
        affectedEventIds: behaviorEvents.map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 6: State drift ──────────────────────────────────────────────────
  {
    id: 'rule-state-drift',
    category: 'state_drift',
    test: (score, _workflow, _baseline, events) => {
      const stateEvents = events.filter((e) => e.eventType === 'memory_state_change');
      // Only raise a finding if degradation is moderate or above
      if (stateEvents.length < 2 && score.stateDegradation < 20) return null;

      const severity: EventSeverity = score.stateDegradation >= 60 ? 'high' : 'medium';
      const magnitude = score.stateDegradation;

      return {
        severity,
        title: 'State Degradation Accumulation',
        description: `${stateEvents.length} memory state change(s) recorded since baseline capture. State degradation index: ${score.stateDegradation}/100. Accumulated changes may invalidate session continuity assumptions.`,
        affectedEventIds: stateEvents.map((e) => e.id),
        driftMagnitude: magnitude,
      };
    },
  },

  // ── Rule 7: Orchestration drift ──────────────────────────────────────────
  {
    id: 'rule-orchestration-drift',
    category: 'orchestration_drift',
    test: (_score, _workflow, _baseline, events) => {
      const orchEvents = events.filter((e) => e.eventType === 'orchestration_change');
      if (orchEvents.length === 0) return null;

      return {
        severity: 'medium',
        title: 'Orchestration Layer Change',
        description: `${orchEvents.length} orchestration change(s) since baseline. Previous: ${orchEvents[0].payload.previousOrchestrator ?? 'unknown'} → Current: ${orchEvents[0].payload.newOrchestrator ?? 'unknown'}. Control flow may differ from baseline assumptions.`,
        affectedEventIds: orchEvents.map((e) => e.id),
        driftMagnitude: 35,
      };
    },
  },
];

// ─── Main Detection Function ──────────────────────────────────────────────────
// Runs all rules against the computed score + raw inputs.
// Returns findings sorted by driftMagnitude descending.

export function detectDrift(
  workflow: AIWorkflow,
  baseline: BaselineAnchor,
  events: AIWorkflowEvent[],
  score: ContinuityScore
): DriftFinding[] {
  const now = new Date().toISOString();

  const findings: DriftFinding[] = rules
    .map((rule, i) => {
      const result = rule.test(score, workflow, baseline, events);
      if (!result) return null;

      return {
        id: `drift-${workflow.id}-${rule.id}-${i}`,
        workflowId: workflow.id,
        baselineId: baseline.id,
        detectedAt: now,
        category: rule.category,
        severity: result.severity,
        title: result.title,
        description: result.description,
        affectedEvents: result.affectedEventIds,
        driftMagnitude: result.driftMagnitude,
        requiresRemediation: result.driftMagnitude >= 50 || result.severity === 'critical',
      } satisfies DriftFinding;
    })
    .filter((f): f is DriftFinding => f !== null)
    .sort((a, b) => b.driftMagnitude - a.driftMagnitude);

  return findings;
}

// ─── Batch Detection ─────────────────────────────────────────────────────────

export function detectAllDrift(
  workflows: AIWorkflow[],
  baselines: BaselineAnchor[],
  events: AIWorkflowEvent[],
  scores: ContinuityScore[]
): DriftFinding[] {
  return workflows.flatMap((wf) => {
    const baseline = baselines.find((b) => b.workflowId === wf.id);
    const score = scores.find((s) => s.workflowId === wf.id);
    if (!baseline || !score) return [];
    const wfEvents = events.filter((e) => e.workflowId === wf.id);
    return detectDrift(wf, baseline, wfEvents, score);
  });
}

// ─── Remediation Suggestions ─────────────────────────────────────────────────
// Maps each drift category to a recommended remediation action.

const REMEDIATION_MAP: Record<DriftCategory, { action: string; effort: 'Low' | 'Medium' | 'High'; improvement: number }> = {
  model_drift: {
    action: 'Roll model back to approved version or re-capture baseline after XOps review of new version.',
    effort: 'High',
    improvement: 15,
  },
  prompt_drift: {
    action: 'Restore approved prompt version and hash, or submit new prompt for XOps approval and re-baseline.',
    effort: 'Medium',
    improvement: 12,
  },
  policy_drift: {
    action: 'Upgrade policy to required version and re-enable guardrails. Re-capture baseline after verification.',
    effort: 'High',
    improvement: 30,
  },
  tool_drift: {
    action: 'Restrict tool list to approved baseline set. Submit unauthorized tools for policy review if needed.',
    effort: 'Medium',
    improvement: 10,
  },
  behavior_drift: {
    action: 'Investigate forbidden behavior source. Apply output filter guardrail. Re-run guardrail validation suite.',
    effort: 'High',
    improvement: 25,
  },
  state_drift: {
    action: 'Flush accumulated session state and re-initialize from baseline state hashes.',
    effort: 'Low',
    improvement: 8,
  },
  orchestration_drift: {
    action: 'Re-document orchestration changes and submit for policy review. Re-anchor baseline.',
    effort: 'Medium',
    improvement: 9,
  },
  data_risk: {
    action: 'Enable PII redaction layer. Audit recent outputs. File data incident report.',
    effort: 'High',
    improvement: 10,
  },
};

export function getRemediationForFinding(finding: DriftFinding) {
  return REMEDIATION_MAP[finding.category] ?? {
    action: 'Investigate and remediate drift condition. Re-capture baseline after resolution.',
    effort: 'Medium' as const,
    improvement: 5,
  };
}
