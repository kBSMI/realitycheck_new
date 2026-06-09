import {
  AIWorkflow,
  BaselineAnchor,
  AIWorkflowEvent,
  ContinuityScore,
  ScoreDeduction,
  RiskLevel,
  EventType,
} from '../types/smi';

// ─── Deduction Table ──────────────────────────────────────────────────────────
// Each event type carries a deterministic point deduction.
// Points are always whole numbers and are applied once per qualifying event.
//
// Rationale for weights:
//   - forbidden_behavior / guardrail_violation are the highest (15) because
//     they indicate active policy breaches, not just configuration drift.
//   - model_version_change (15) and policy_version_mismatch (15) are equally
//     critical because either can silently invalidate all prior assurances.
//   - prompt_version_change (12) is high when the hash doesn't match; if the
//     hash matches, the deduction is reduced to 3 (cosmetic version bump).
//   - unauthorized_tool_call (10) indicates active capability boundary breach.
//   - sensitive_data_risk (10) is a data governance violation.
//   - memory_state_change (8) is moderate — expected in long-running workflows
//     but must be tracked as accumulated state drift.
//   - orchestration_change (9) is between memory and tool because it can
//     alter control flow in ways that invalidate behavioral baselines.
//   - nominal_operation contributes 0 deductions.
//   - baseline_capture / baseline_override are administrative — no deduction.

const BASE_DEDUCTION: Record<EventType, number> = {
  model_version_change: 15,
  prompt_version_change: 12,         // see adjustForPayload for hash-match reduction
  policy_version_mismatch: 15,
  unauthorized_tool_call: 10,
  forbidden_behavior: 15,
  sensitive_data_risk: 10,
  guardrail_violation: 15,
  memory_state_change: 8,
  orchestration_change: 9,
  nominal_operation: 0,
  baseline_capture: 0,
  baseline_override: 0,
};

// ─── Payload Adjustments ──────────────────────────────────────────────────────
// Some event types have context-sensitive deductions based on their payload.

function adjustedDeduction(event: AIWorkflowEvent): number {
  const base = BASE_DEDUCTION[event.eventType];

  if (event.eventType === 'prompt_version_change') {
    // If the prompt hash still matches, treat this as a cosmetic version bump
    if (event.payload.promptHashMatch === true) return 3;
    return base; // hash mismatch = full deduction
  }

  if (event.eventType === 'forbidden_behavior') {
    // Scale by confidence: confidence < 0.5 halves the deduction
    const confidence = event.payload.behaviorConfidence ?? 1;
    return confidence >= 0.5 ? base : Math.round(base / 2);
  }

  return base;
}

// ─── Sub-score Computation ────────────────────────────────────────────────────
// Four sub-scores are derived from the event set.
// Each is independently capped 0–100.

function computeDriftScore(events: AIWorkflowEvent[]): number {
  // Drift = total deductions as a percentage of maximum possible deduction
  // across the change-detection categories.
  const changeEvents = events.filter(
    (e) =>
      e.eventType === 'model_version_change' ||
      e.eventType === 'prompt_version_change' ||
      e.eventType === 'policy_version_mismatch' ||
      e.eventType === 'orchestration_change'
  );
  const totalDeducted = changeEvents.reduce((s, e) => s + adjustedDeduction(e), 0);
  // Maximum possible drift from these categories = 51 (one of each)
  return Math.min(100, Math.round((totalDeducted / 51) * 100));
}

function computePolicyAlignment(
  workflow: AIWorkflow,
  baseline: BaselineAnchor,
  events: AIWorkflowEvent[]
): number {
  // Start at 100. Subtract for policy mismatches between live workflow and baseline.
  let score = 100;

  // Policy version mismatch
  if (workflow.policyConfig.version !== baseline.policyConfig.version) score -= 30;

  // Guardrails disabled when baseline had them enabled
  if (baseline.policyConfig.guardrailsEnabled && !workflow.policyConfig.guardrailsEnabled) score -= 35;

  // Each event-level policy violation subtracts 5 (capped)
  const policyEvents = events.filter(
    (e) => e.eventType === 'policy_version_mismatch' || e.eventType === 'guardrail_violation'
  );
  score -= Math.min(30, policyEvents.length * 5);

  return Math.max(0, score);
}

function computeToolBehaviorVariance(
  workflow: AIWorkflow,
  baseline: BaselineAnchor
): number {
  // Start at 100. Measure deviation in allowed tool sets between live and baseline.
  let score = 100;

  const baselineTools = new Set(baseline.policyConfig.allowedTools);
  const currentTools = new Set(workflow.policyConfig.allowedTools);

  // Tools added that weren't in baseline
  const added = [...currentTools].filter((t) => !baselineTools.has(t));
  // Tools removed that were in baseline
  const removed = [...baselineTools].filter((t) => !currentTools.has(t));

  score -= added.length * 10;
  score -= removed.length * 5;

  return Math.max(0, score);
}

function computeStateDegradation(events: AIWorkflowEvent[]): number {
  // Start at 0 (no degradation). Increase for each state-changing event.
  // Capped at 100 to represent total state invalidation.
  const stateEvents = events.filter(
    (e) => e.eventType === 'memory_state_change' || e.eventType === 'orchestration_change'
  );
  return Math.min(100, stateEvents.length * 12);
}

// ─── Risk Level Classification ────────────────────────────────────────────────

export function classifyRiskLevel(continuityScore: number): RiskLevel {
  if (continuityScore >= 90) return 'Approved';
  if (continuityScore >= 75) return 'Watch';
  if (continuityScore >= 60) return 'Review Required';
  return 'Quarantine';
}

// ─── Recommended Action ───────────────────────────────────────────────────────

function recommendedAction(riskLevel: RiskLevel, deductions: ScoreDeduction[]): string {
  if (riskLevel === 'Approved') {
    return 'No action required. Maintain current baseline and continue XOps monitoring.';
  }
  if (riskLevel === 'Watch') {
    const topReason = deductions[0]?.reason ?? 'minor drift';
    return `Monitor closely. Primary contributor: ${topReason}. Schedule re-baseline review within 7 days.`;
  }
  if (riskLevel === 'Review Required') {
    const reasons = [...new Set(deductions.map((d) => d.reason))].slice(0, 2).join(', ');
    return `XOps review required before next deployment. Address: ${reasons}. Re-anchor baseline after remediation.`;
  }
  // Quarantine
  const criticalReasons = deductions
    .filter((d) => d.points >= 12)
    .map((d) => d.reason)
    .slice(0, 3)
    .join(', ');
  return `Workflow quarantined. Do not deploy. Critical violations: ${criticalReasons}. Full remediation and XOps sign-off required.`;
}

// ─── Main Scoring Function ────────────────────────────────────────────────────
//
// Algorithm:
//   1. Start continuityScore = 100
//   2. For each event in the workflow's event list:
//        a. Compute adjusted deduction (may differ from base for some types)
//        b. Record a ScoreDeduction entry
//   3. Subtract total deductions from 100 (floor 0)
//   4. Compute four sub-scores independently from the same event set
//   5. Classify risk level from final continuityScore
//   6. Generate recommended action
//
// The function is pure — given the same inputs it always returns the same output.

export function computeContinuityScore(
  workflow: AIWorkflow,
  baseline: BaselineAnchor,
  events: AIWorkflowEvent[]
): ContinuityScore {
  const now = new Date().toISOString();

  // ── Step 1 & 2: Build deductions list ────────────────────────────────────
  const deductions: ScoreDeduction[] = events
    .filter((e) => BASE_DEDUCTION[e.eventType] > 0 || adjustedDeduction(e) > 0)
    .map((e) => ({
      reason: e.eventType,
      points: adjustedDeduction(e),
      eventId: e.id,
      description: e.description,
    }))
    .filter((d) => d.points > 0);

  // ── Step 3: Compute primary score ────────────────────────────────────────
  const totalDeducted = deductions.reduce((s, d) => s + d.points, 0);
  const continuityScore = Math.max(0, 100 - totalDeducted);

  // ── Step 4: Sub-scores ───────────────────────────────────────────────────
  const driftScore = computeDriftScore(events);
  const policyAlignment = computePolicyAlignment(workflow, baseline, events);
  const toolBehaviorVariance = computeToolBehaviorVariance(workflow, baseline);
  const stateDegradation = computeStateDegradation(events);

  // ── Step 5 & 6: Risk level + action ─────────────────────────────────────
  const riskLevel = classifyRiskLevel(continuityScore);
  const action = recommendedAction(riskLevel, deductions);

  return {
    workflowId: workflow.id,
    baselineId: baseline.id,
    computedAt: now,
    continuityScore,
    driftScore,
    policyAlignment,
    toolBehaviorVariance,
    stateDegradation,
    riskLevel,
    deductions,
    totalDeducted,
    recommendedAction: action,
  };
}

// ─── Batch Scoring ────────────────────────────────────────────────────────────
// Convenience wrapper for scoring multiple workflows at once.

export function computeAllScores(
  workflows: AIWorkflow[],
  baselines: BaselineAnchor[],
  allEvents: AIWorkflowEvent[]
): ContinuityScore[] {
  return workflows.map((wf) => {
    const baseline = baselines.find((b) => b.workflowId === wf.id);
    if (!baseline) {
      // No baseline = maximum drift: score is 0
      return {
        workflowId: wf.id,
        baselineId: 'none',
        computedAt: new Date().toISOString(),
        continuityScore: 0,
        driftScore: 100,
        policyAlignment: 0,
        toolBehaviorVariance: 0,
        stateDegradation: 0,
        riskLevel: 'Quarantine' as RiskLevel,
        deductions: [],
        totalDeducted: 100,
        recommendedAction: 'No baseline found. Capture a baseline anchor before deploying this workflow.',
      };
    }
    const events = allEvents.filter((e) => e.workflowId === wf.id);
    return computeContinuityScore(wf, baseline, events);
  });
}

// ─── Historical Pulse ─────────────────────────────────────────────────────────
// Returns a time-series of scores for trend display.
// Each step replays the event set up to that point in time.

export function computeHistoricalPulse(
  workflow: AIWorkflow,
  baseline: BaselineAnchor,
  events: AIWorkflowEvent[],
  steps = 12
): Array<{ timestamp: string; score: number; behaviorPatterns: string[] }> {
  // Sort events oldest-first
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Distribute steps evenly across a 12-hour window for display
  const now = Date.now();
  const windowMs = 12 * 60 * 60 * 1000;
  const stepMs = windowMs / (steps - 1);

  return Array.from({ length: steps }, (_, i) => {
    const cutoffTime = now - windowMs + i * stepMs;
    const eventsUpTo = sorted.filter((e) => new Date(e.timestamp).getTime() <= cutoffTime);
    const score = computeContinuityScore(workflow, baseline, eventsUpTo).continuityScore;

    const patterns: string[] = [];
    if (eventsUpTo.some((e) => e.eventType === 'guardrail_violation')) patterns.push('guardrail-breach');
    if (eventsUpTo.some((e) => e.eventType === 'policy_version_mismatch')) patterns.push('policy-lag');
    if (eventsUpTo.some((e) => e.eventType === 'model_version_change')) patterns.push('model-drift');
    if (patterns.length === 0) patterns.push('steady-state');

    return {
      timestamp: new Date(cutoffTime).toISOString(),
      score,
      behaviorPatterns: patterns,
    };
  });
}
