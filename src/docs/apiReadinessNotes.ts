export interface ApiReadinessEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  purpose: string;
  status: 'planned' | 'prototype-ready' | 'future';
  lane: 'Consumer' | 'Teams' | 'Enterprise' | 'Reports';
}

export const apiReadinessEndpoints: ApiReadinessEndpoint[] = [
  {
    method: 'POST',
    path: '/api/reality-check',
    purpose:
      'Submit a user goal, prompt, AI output, platform, and pain points to generate an AI Reality Check Grade.',
    status: 'prototype-ready',
    lane: 'Consumer',
  },
  {
    method: 'POST',
    path: '/api/reality-check/improvement',
    purpose:
      'Compare an original AI output with an improved response and calculate score delta, remaining drift, and improvement summary.',
    status: 'prototype-ready',
    lane: 'Consumer',
  },
  {
    method: 'POST',
    path: '/api/team/compare',
    purpose:
      'Compare a team baseline output against a new AI output and return consistency, format, voice, actionability, and client-readiness scores.',
    status: 'prototype-ready',
    lane: 'Teams',
  },
  {
    method: 'POST',
    path: '/api/enterprise/baseline',
    purpose:
      'Create or update an approved AI workflow baseline for enterprise continuity validation.',
    status: 'planned',
    lane: 'Enterprise',
  },
  {
    method: 'POST',
    path: '/api/enterprise/score',
    purpose:
      'Score an AI workflow event or output against an approved baseline after model, prompt, policy, tool, API, memory/state, source-context, or orchestration changes.',
    status: 'planned',
    lane: 'Enterprise',
  },
  {
    method: 'POST',
    path: '/api/enterprise/drift',
    purpose:
      'Generate drift findings and likely contributing factors for enterprise review.',
    status: 'planned',
    lane: 'Enterprise',
  },
  {
    method: 'POST',
    path: '/api/enterprise/audit',
    purpose:
      'Write continuity scoring, drift findings, and review decisions into an audit ledger record.',
    status: 'planned',
    lane: 'Enterprise',
  },
  {
    method: 'POST',
    path: '/api/reports/export',
    purpose:
      'Export consumer, team, or enterprise reports as JSON, HTML, or future PDF outputs.',
    status: 'prototype-ready',
    lane: 'Reports',
  },
  {
    method: 'GET',
    path: '/api/reports/:id',
    purpose:
      'Retrieve a saved report by ID for authenticated future users or team workspaces.',
    status: 'future',
    lane: 'Reports',
  },
];

export const apiReadinessNotes = [
  'Current MVP services are deterministic and local-first.',
  'No external AI model calls are made in deterministic MVP mode.',
  'No hidden session pulling or scraping is supported.',
  'Future API integrations should require explicit user authorization.',
  'Consumer lane starts with user-provided goal, prompt, and output.',
  'Teams lane adds project baselines and repeatable output comparison.',
  'Enterprise lane adds ingestion, baseline anchors, continuity scoring, drift findings, audit records, and reports.',
];