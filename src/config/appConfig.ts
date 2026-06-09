export type AppRuntimeMode = 'local' | 'beta' | 'production';

function readEnv(key: string): string {
  const env = import.meta.env as Record<string, string | undefined>;
  return env[key] ?? '';
}

function flag(key: string): boolean {
  return readEnv(key).toLowerCase() === 'true';
}

export const appConfig = {
  runtimeMode: (readEnv('VITE_APP_ENV') || 'local') as AppRuntimeMode,
  publicAppUrl: readEnv('VITE_PUBLIC_APP_URL') || 'http://localhost:5173',
  supabaseUrl: readEnv('VITE_SUPABASE_URL'),
  supabaseAnonKey: readEnv('VITE_SUPABASE_ANON_KEY'),
  stripePublishableKey: readEnv('VITE_STRIPE_PUBLISHABLE_KEY'),
  enableCloudRepositories: flag('VITE_ENABLE_CLOUD_REPOSITORIES'),
  enableStripeCheckout: flag('VITE_ENABLE_STRIPE_CHECKOUT'),
};

export function isCloudConfigured(): boolean {
  return Boolean(appConfig.supabaseUrl && appConfig.supabaseAnonKey && appConfig.enableCloudRepositories);
}

export function isStripeConfigured(): boolean {
  return Boolean(appConfig.stripePublishableKey && appConfig.enableStripeCheckout);
}
