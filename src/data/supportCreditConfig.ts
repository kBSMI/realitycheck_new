import type { MonthlyPlanPreview, SupportCreditPack, SupportedDustToken } from '../types/commerce';

export const supportCreditPacks: SupportCreditPack[] = [
  { id: 'starter', name: 'Starter Support', priceLabel: '$1', credits: 3, description: 'Try the full result loop with a few checks.', bestFor: 'First quest' },
  { id: 'builder', name: 'Builder Support', priceLabel: '$5', credits: 25, description: 'Enough credits for a week of serious AI work.', bestFor: 'Best value' },
  { id: 'power', name: 'Power Support', priceLabel: '$10', credits: 75, description: 'For creators, builders, researchers, and heavy AI users.' },
  { id: 'launch', name: 'Launch Supporter', priceLabel: '$25', credits: 250, description: 'Support public launch and unlock a larger Reality Check reserve.' },
];

export const monthlyPlanPreviews: MonthlyPlanPreview[] = [
  { id: 'plus', name: 'Plus', priceLabel: '$9/mo', creditsPerMonth: 100, features: ['Saved history', 'Improvement checks', 'HTML/JSON exports'] },
  { id: 'pro', name: 'Pro', priceLabel: '$19/mo', creditsPerMonth: 500, features: ['Advanced reports', 'Baseline comparisons', 'AI Reality Index insights'] },
  { id: 'teams', name: 'Teams', priceLabel: '$49+/mo', creditsPerMonth: 1500, features: ['Team baselines', 'Shared reports', 'Workflow consistency scoring'] },
];

export const supportedDustTokens: SupportedDustToken[] = [
  { id: 'base-usdc', chain: 'Base', token: 'USD Coin', symbol: 'USDC', status: 'supported', minRedeemableUsd: 1 },
  { id: 'sol-usdc', chain: 'Solana', token: 'USD Coin', symbol: 'USDC', status: 'supported', minRedeemableUsd: 1 },
  { id: 'polygon-usdc', chain: 'Polygon', token: 'USD Coin', symbol: 'USDC', status: 'supported', minRedeemableUsd: 1 },
];

export const dustThresholds = [
  { value: '$0.25', reward: 'Recorded support value; credit redemption begins at $1.' },
  { value: '$1.00', reward: '3 Support Credits' },
  { value: '$5.00', reward: '25 Support Credits' },
  { value: '$10.00', reward: '75 Support Credits' },
];
