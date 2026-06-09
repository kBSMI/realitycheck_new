// ─── Team Example Workflows ───────────────────────────────────────────────────
// Five prefill workflows for the SMI Teams comparison tool.

import type { UseCaseType } from '../types/realityCheck';

export interface TeamExampleWorkflow {
  id: string;
  label: string;
  useCaseType: UseCaseType;
  description: string;
  baselineOutput: string;
}

export const teamExampleWorkflows: TeamExampleWorkflow[] = [
  {
    id: 'workflow-marketing',
    label: 'Marketing campaign brief',
    useCaseType: 'marketing',
    description: 'Brand-consistent campaign brief format',
    baselineOutput: `Campaign Brief: Q3 Product Launch — Horizon Analytics

Objective: Drive 500 qualified signups for Horizon Analytics Pro within 6 weeks.

Target Audience: Revenue operations managers at B2B SaaS companies (50–500 employees).

Core Message: "Stop guessing. Start knowing." — Horizon Analytics gives RevOps teams real-time pipeline visibility with zero manual data entry.

Channels:
- LinkedIn sponsored content (primary): 3 posts/week targeting RevOps job titles
- Email nurture sequence: 5-email sequence over 3 weeks to warm leads
- Partner co-marketing: 2 webinars with partner CRMs (HubSpot, Pipedrive)

Success Metrics: 500 signups, 40% email open rate, $12 CPL on LinkedIn.

Budget: $18,000 over 6 weeks. 60% paid, 40% content/design.`,
  },

  {
    id: 'workflow-support',
    label: 'Customer support response',
    useCaseType: 'support',
    description: 'Empathetic, solution-first support reply',
    baselineOutput: `Hi Sarah,

Thank you for reaching out — I completely understand how frustrating it is when an export doesn't work the way you expect, especially when you're on a deadline.

I looked into your account and found the issue: your export was triggered during a scheduled maintenance window (10:00–10:15 PM UTC on June 3rd), which caused the job to time out silently rather than return an error.

Here's what to do to get your data now:
1. Log back in and navigate to Reports > Export History.
2. Select the failed export and click "Retry Export."
3. Your file should be ready within 2 minutes.

If the retry doesn't work, reply here with your account ID and I'll run the export manually for you.

We're also adding a user-facing notification for maintenance windows in our next release (June 14th), so you won't be caught off guard again.

Thanks again for your patience, Sarah.

Best,
Marcus — Support Team`,
  },

  {
    id: 'workflow-sales',
    label: 'Sales follow-up email',
    useCaseType: 'sales',
    description: 'Value-led, next-step focused outreach',
    baselineOutput: `Subject: Quick follow-up — your pipeline visibility challenge

Hi James,

Really enjoyed our call Thursday. Based on what you shared about your Q3 forecast accuracy issues, I wanted to send over one specific thing that might help right now.

We worked with a similar RevOps team at Clearbit last quarter — they were spending 6 hours a week manually reconciling pipeline data. After integrating Horizon, they cut that to 20 minutes and improved forecast accuracy from 61% to 84% in 60 days.

I'd like to walk you through how that integration worked — it takes 15 minutes and I think you'd see the parallel to your setup immediately.

Would Thursday at 2pm PT or Friday morning work for a quick technical walkthrough?

Best,
Priya`,
  },

  {
    id: 'workflow-sop',
    label: 'SOP / process document',
    useCaseType: 'operations',
    description: 'Clear, numbered procedural format',
    baselineOutput: `SOP: Onboarding a New Enterprise Client
Version 1.2 | Owner: Customer Success | Last Updated: 2026-05-15

Purpose: Ensure all enterprise clients receive a consistent, high-quality onboarding experience within the first 30 days.

Scope: Applies to all accounts with ARR > $50,000.

Prerequisites: Signed contract, completed billing setup, assigned CSM.

Steps:

1. Day 0 — Kickoff Setup
   1.1 Send welcome email using template CS-001 within 24 hours of contract signature.
   1.2 Schedule kickoff call within 3 business days.
   1.3 Create client workspace in Notion using the Enterprise Onboarding template.

2. Day 1–7 — Kickoff Call
   2.1 Complete the kickoff call agenda (template CS-002).
   2.2 Document 3 primary success metrics agreed with the client.
   2.3 Assign technical onboarding specialist if integration is required.

3. Day 8–21 — Implementation
   3.1 Confirm data integration is live and validated.
   3.2 Run first training session (recorded for async access).

4. Day 22–30 — Go-Live Check
   4.1 Confirm all success metrics are being tracked.
   4.2 Schedule 30-day review call.
   4.3 Mark onboarding complete in CRM.`,
  },

  {
    id: 'workflow-proposal',
    label: 'Client proposal',
    useCaseType: 'sales',
    description: 'Structured, client-specific proposal format',
    baselineOutput: `Proposal: Revenue Operations Analytics for TechCorp Inc.
Prepared by: Horizon Analytics | Date: June 5, 2026

Executive Summary:
This proposal outlines how Horizon Analytics can help TechCorp Inc. eliminate manual pipeline reporting, improve forecast accuracy from ~65% to 85%+, and save your RevOps team approximately 8 hours per week within 60 days of go-live.

The Problem We're Solving:
Based on our discovery call, TechCorp's RevOps team currently: (1) reconciles pipeline data manually every Monday — 4–6 hours per week, (2) relies on end-of-quarter CRM exports for board reporting — creating a 2-week lag, and (3) has forecast accuracy that varies by ±22% quarter to quarter.

Our Proposed Solution:
Phase 1 (Days 1–14): CRM integration and baseline data validation.
Phase 2 (Days 15–30): Live dashboard setup and team training.
Phase 3 (Days 31–60): Forecast model calibration and 30-day review.

Investment: $2,400/month (annual) or $2,900/month (monthly).
Includes: Unlimited users, dedicated CSM, SLA-backed uptime, and quarterly business reviews.

Next Steps: Sign agreement by June 12th to begin implementation June 16th.`,
  },
];
