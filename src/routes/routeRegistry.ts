export interface AppRouteDefinition {
  path: string;
  label: string;
  lane: 'consumer' | 'team' | 'enterprise' | 'demo' | 'legal' | 'account';
  lazyRecommended: boolean;
}

export const APP_ROUTES: AppRouteDefinition[] = [
  { path: '/', label: 'Home', lane: 'consumer', lazyRecommended: false },
  { path: '/reality-check', label: 'AI Reality Check', lane: 'consumer', lazyRecommended: false },
  { path: '/mobile', label: 'Mobile Experience', lane: 'consumer', lazyRecommended: true },
  { path: '/history', label: 'History', lane: 'consumer', lazyRecommended: true },
  { path: '/reports/:id', label: 'Report Detail', lane: 'consumer', lazyRecommended: true },
  { path: '/support-credits', label: 'Support Credits', lane: 'consumer', lazyRecommended: true },
  { path: '/pricing', label: 'Pricing', lane: 'consumer', lazyRecommended: true },
  { path: '/auth', label: 'Auth', lane: 'account', lazyRecommended: true },
  { path: '/privacy', label: 'Privacy Policy', lane: 'legal', lazyRecommended: true },
  { path: '/terms', label: 'Terms', lane: 'legal', lazyRecommended: true },
  { path: '/refunds', label: 'Refund Policy', lane: 'legal', lazyRecommended: true },
  { path: '/scoring-disclaimer', label: 'Scoring Disclaimer', lane: 'legal', lazyRecommended: true },
  { path: '/teams', label: 'SMI Teams', lane: 'team', lazyRecommended: true },
  { path: '/enterprise', label: 'Enterprise Console', lane: 'enterprise', lazyRecommended: true },
  { path: '/demo', label: 'Demo Mode', lane: 'demo', lazyRecommended: true },
  { path: '/architecture', label: 'Reference Architecture', lane: 'enterprise', lazyRecommended: true },
];
