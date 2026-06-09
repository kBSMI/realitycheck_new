// ─── Export Service ───────────────────────────────────────────────────────────
// Client-side only. All output is generated in-browser; no server calls.

import type { RealityCheckResult, ImprovementCheckResult } from '../types/realityCheck';
import { buildExportJSON } from './realityCheckService';

// ─── Copy summary to clipboard ────────────────────────────────────────────────

export function copySummaryToClipboard(
  result: RealityCheckResult,
  improvement?: ImprovementCheckResult
): Promise<void> {
  const lines: string[] = [
    `AI Reality Check Report`,
    `Grade: ${result.grade}  |  Score: ${result.overallScore}/100  |  Verdict: ${result.verdict}`,
    `Goal: ${result.input.userGoal}`,
    `Platform: ${result.input.sourcePlatform}`,
    ``,
    `Dimension Scores:`,
    `  Intent Match:       ${result.intentMatch}/100`,
    `  Continuity:         ${result.continuity}/100`,
    `  Specificity:        ${result.specificity}/100`,
    `  Actionability:      ${result.actionability}/100`,
    `  Truth Risk:         ${result.truthRisk}/100 (higher = worse)`,
    `  Wasted Prompt Risk: ${result.wastedPromptingRisk}/100 (higher = worse)`,
    ``,
    `What Drifted:`,
    ...result.whatDrifted.map((w) => `  - ${w}`),
    ``,
    `Next Best Prompt:`,
    `  ${result.nextBestPrompt}`,
  ];

  if (improvement) {
    lines.push(``, `Improvement Check:`);
    lines.push(`  ${improvement.summaryMessage}`);
    if (improvement.improvedCategories.length > 0) {
      lines.push(`  Improved: ${improvement.improvedCategories.join(', ')}`);
    }
  }

  lines.push(
    ``,
    `---`,
    `AI Reality Check only reviews content you provide. This MVP does not connect to or pull`,
    `private sessions from ChatGPT, Claude, Gemini, Copilot, or other AI platforms.`,
    `Scores are guidance for improving AI usage, not professional advice.`,
  );

  return navigator.clipboard.writeText(lines.join('\n'));
}

// ─── Download JSON ────────────────────────────────────────────────────────────

export function downloadCheckAsJSON(
  result: RealityCheckResult,
  improvement?: ImprovementCheckResult
): void {
  const json = buildExportJSON(result, improvement);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reality-check-${result.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Download HTML report ─────────────────────────────────────────────────────

export function downloadCheckAsHTML(
  result: RealityCheckResult,
  improvement?: ImprovementCheckResult
): void {
  const gradeColor: Record<string, string> = {
    A: '#22c55e', B: '#06b6d4', C: '#eab308', D: '#f97316', F: '#ef4444',
  };
  const color = gradeColor[result.grade] ?? '#6b7280';

  const improvSection = improvement ? `
    <section>
      <h2>Improvement Check</h2>
      <p>${improvement.summaryMessage}</p>
      ${improvement.improvedCategories.length > 0 ? `<p><strong>Improved:</strong> ${improvement.improvedCategories.join(', ')}</p>` : ''}
      ${improvement.remainingDrift.length > 0 ? `<p><strong>Remaining Drift:</strong> ${improvement.remainingDrift.join('; ')}</p>` : ''}
    </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Reality Check Report</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; padding: 0 20px; color: #1f2937; background: #f9fafb; }
  h1 { font-size: 1.5rem; margin-bottom: 4px; }
  h2 { font-size: 1rem; font-weight: 600; color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 24px; }
  .grade { display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 12px; font-size: 2rem; font-weight: 900; color: white; background: ${color}; margin-bottom: 12px; }
  .meta { color: #6b7280; font-size: 0.85rem; margin-bottom: 16px; }
  .score-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 0.85rem; border-bottom: 1px dotted #e5e7eb; }
  .score-val { font-weight: 600; font-family: monospace; }
  ul { padding-left: 18px; margin: 6px 0; }
  li { font-size: 0.85rem; margin: 3px 0; }
  .prompt-box { background: #ecfeff; border: 1px solid #a5f3fc; border-radius: 8px; padding: 12px; font-size: 0.85rem; line-height: 1.6; }
  .note { color: #9ca3af; font-size: 0.75rem; font-style: italic; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
</style>
</head>
<body>
<div class="grade">${result.grade}</div>
<h1>AI Reality Check Report</h1>
<p class="meta">Score: ${result.overallScore}/100 &nbsp;|&nbsp; Verdict: ${result.verdict} &nbsp;|&nbsp; Platform: ${result.input.sourcePlatform} &nbsp;|&nbsp; ${result.savedAt.slice(0, 10)}</p>

<section>
  <h2>Goal</h2>
  <p>${result.input.userGoal}</p>
</section>

<section>
  <h2>Dimension Scores</h2>
  ${[
    ['Intent Match',       result.intentMatch],
    ['Continuity',         result.continuity],
    ['Specificity',        result.specificity],
    ['Actionability',      result.actionability],
    ['Truth Risk',         result.truthRisk + ' (higher = worse)'],
    ['Wasted Prompt Risk', result.wastedPromptingRisk + ' (higher = worse)'],
  ].map(([label, val]) => `<div class="score-row"><span>${label}</span><span class="score-val">${val}/100</span></div>`).join('')}
</section>

<section>
  <h2>What Drifted</h2>
  <ul>${result.whatDrifted.map((w) => `<li>${w}</li>`).join('')}</ul>
</section>

<section>
  <h2>Next Best Prompt</h2>
  <div class="prompt-box">${result.nextBestPrompt}</div>
</section>

<section>
  <h2>Recommended Action</h2>
  <p>${result.recommendedAction}</p>
</section>

${improvSection}

<p class="note">
  AI Reality Check only reviews content you provide. This MVP does not connect to or pull private sessions from ChatGPT, Claude, Gemini, Copilot, or other AI platforms.<br>
  Scores are guidance for improving AI usage, not a guarantee of factual accuracy or professional advice.
</p>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `reality-check-${result.id}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
