// ─── Example Starter Data ─────────────────────────────────────────────────────
// Six realistic starters for the AI Reality Check onboarding flow.
// Each has enough content for all 6 scoring dimensions to exercise meaningfully.

import type { ExampleStarter } from '../types/realityCheck';

export const exampleStarters: ExampleStarter[] = [
  {
    id: 'starter-writing',
    label: 'Check a writing response',
    icon: 'PenLine',
    goal: 'Write a professional follow-up email to a client after a discovery call, keeping it warm but brief',
    prompt: 'Write a short follow-up email to a potential client after our first discovery call. Keep it professional but warm. Mention that I enjoyed the conversation and will send a proposal by Friday.',
    aiOutput: `Hi [Name],

Thank you for taking the time to connect today. It was great learning more about your business and the challenges you are working through.

I really enjoyed our conversation and found your goals quite interesting. There are various ways we could potentially work together and several approaches that might be beneficial to you.

I will follow up soon with some information. Please feel free to reach out in the meantime if you have questions.

Best regards,
[Your Name]`,
    platform: 'ChatGPT',
    expectedFormat: 'Short email, 3–4 sentences',
    targetAudience: 'Potential client',
    painPoints: ['too_generic', 'missed_intent'],
  },

  {
    id: 'starter-research',
    label: 'Check a research answer',
    icon: 'Search',
    goal: 'Find out what the most effective marketing channels are for B2B SaaS companies in 2025',
    prompt: 'What are the most effective marketing channels for B2B SaaS companies right now? Give me data and sources.',
    aiOutput: `B2B SaaS companies are finding success across various digital channels. LinkedIn is generally considered the most effective platform for B2B marketing according to industry experts. Email marketing always performs well and studies show it has the highest ROI of any channel. Content marketing is also very important and proven to drive leads.

Paid search is definitely valuable, and SEO is something every company should invest in. Account-based marketing is increasingly popular and experts say it can dramatically improve conversion rates. Events and webinars are also seeing strong results as in-person connections are returning.

These are the main channels to consider for your B2B SaaS strategy.`,
    platform: 'Claude',
    expectedFormat: 'Numbered list with data points',
    targetAudience: 'Marketing director',
    painPoints: ['hallucination_risk', 'source_trust_issue', 'too_generic'],
  },

  {
    id: 'starter-business',
    label: 'Check a business plan',
    icon: 'Briefcase',
    goal: 'Draft a one-page executive summary for a Series A pitch deck for a B2B HR tech startup',
    prompt: 'Write a one-page executive summary for a Series A fundraising pitch deck. The company is an HR tech startup that helps mid-market companies reduce employee turnover using AI-powered engagement scoring. Target raise: $5M. Audience: VC investors.',
    aiOutput: `Our company is an innovative HR technology startup that is working to solve problems related to employee retention. We use artificial intelligence to help businesses improve their workplace culture and reduce turnover in various ways.

The market opportunity is significant and growing. Many companies struggle with employee retention issues and are looking for technology solutions. Our product helps teams better understand and engage their employees.

We are seeking investment to grow our team and expand our market reach. With the right funding, we believe we can scale our operations and achieve our business goals. We are excited about the opportunity to work with investors who share our vision for the future of work.`,
    platform: 'ChatGPT',
    expectedFormat: 'One-page executive summary with problem, solution, market, traction, ask',
    targetAudience: 'VC investors',
    painPoints: ['too_shallow', 'not_actionable', 'too_generic'],
  },

  {
    id: 'starter-coding',
    label: 'Check a coding/no-code response',
    icon: 'Code2',
    goal: 'Build a Zapier automation that sends a Slack notification when a new row is added to a Google Sheet',
    prompt: 'How do I create a Zapier automation that sends a Slack message every time a new row is added to a specific Google Sheet? Walk me through it step by step.',
    aiOutput: `Creating automations with Zapier is a great way to connect different tools in your workflow. There are many different things you can do with Zapier and Google Sheets together, and Slack integration is one of the most popular options that people use.

To get started, you would generally need to have accounts on the relevant platforms. Once you have those set up, you can begin exploring the automation possibilities. Zapier has a lot of templates and options that you can use to customize your workflow based on your specific needs.

The process typically involves connecting your apps, setting up triggers and actions, and then testing your automation to make sure everything works correctly. There are usually some configuration options you might want to consider depending on your use case, and you may need to adjust some settings along the way.

Once your automation is running, you will start receiving notifications based on your configuration. You can always go back and modify things if they are not working exactly as you expected. The key is to experiment and find what works best for your team.`,
    platform: 'Gemini',
    expectedFormat: 'Numbered step-by-step instructions',
    targetAudience: 'Non-technical business user',
    painPoints: ['too_long', 'changed_structure', 'not_actionable'],
  },

  {
    id: 'starter-resume',
    label: 'Check a job/resume response',
    icon: 'FileUser',
    goal: 'Rewrite my resume bullet point for a product manager role to highlight measurable impact',
    prompt: 'Rewrite this resume bullet point for a Senior Product Manager role. Make it more impactful and quantified. Original: "Worked on improving the checkout process to make it better for users."',
    aiOutput: `You should definitely consider revamping your professional experience section to better showcase what you have accomplished throughout your career. When it comes to resume writing, using strong action verbs and quantifiable metrics is generally recommended by career coaches and hiring professionals who work in talent acquisition.

For your checkout process work, you might want to think about what results were achieved and how you could frame those in a compelling way. Numbers and percentages tend to make a strong impression on recruiters. Consider the impact that your work had on the business as a whole.

Remember that your resume is your personal marketing document and it should tell a story about your professional journey. Each bullet point is an opportunity to demonstrate your value proposition to potential employers in a clear and memorable way.`,
    platform: 'Copilot',
    expectedFormat: 'Single rewritten bullet point starting with an action verb',
    targetAudience: 'Hiring manager',
    painPoints: ['wrong_tone', 'forgot_context', 'missed_intent'],
  },

  {
    id: 'starter-content',
    label: 'Check a content/social post',
    icon: 'Share2',
    goal: 'Write a LinkedIn post announcing our company just reached 1,000 paying customers',
    prompt: 'Write a LinkedIn post celebrating hitting 1,000 paying customers. Keep it authentic and grateful, not salesy. Mention the team effort. About 150 words.',
    aiOutput: `We are thrilled to share some exciting news! Our company has recently reached a significant milestone that we are very proud of. This achievement represents the hard work and dedication of many people across our organization.

We want to thank everyone who has been part of this journey. Our team has worked really hard and we appreciate all the support from our customers and partners. It has been quite a journey getting to this point and we are grateful for everyone who has helped along the way.

There are many more exciting things ahead as we continue to grow and improve our product. We are committed to continuing to provide value to our customers and we look forward to what the future holds.

Thank you to everyone who believed in us and supported our mission. We could not have done this without you!`,
    platform: 'ChatGPT',
    expectedFormat: 'LinkedIn post, ~150 words, authentic tone',
    targetAudience: 'LinkedIn network — customers, investors, potential hires',
    painPoints: ['too_generic', 'missed_intent', 'wrong_tone'],
  },
];
