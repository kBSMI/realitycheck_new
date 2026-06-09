export const DEFAULT_AUTH_RETURN_TO = '/reality-check';

const UNSAFE_SCHEMES = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value) return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (UNSAFE_SCHEMES.test(value)) return false;
  return true;
}

export function normalizeAuthReturnTo(value: string | null | undefined, fallback = DEFAULT_AUTH_RETURN_TO): string {
  if (!isSafeInternalPath(value)) return fallback;
  if (value === '/auth' || value.startsWith('/auth?') || value === '/auth/callback' || value.startsWith('/auth/callback?')) {
    return fallback;
  }
  return value;
}

export function getCurrentInternalPath(): string {
  if (typeof window === 'undefined') return DEFAULT_AUTH_RETURN_TO;
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function getAuthCallbackUrl(returnTo?: string | null): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const safeReturnTo = normalizeAuthReturnTo(returnTo ?? getCurrentInternalPath());
  const callbackPath = `/auth/callback?returnTo=${encodeURIComponent(safeReturnTo)}`;
  return origin ? `${origin}${callbackPath}` : callbackPath;
}

export function getReturnToFromSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith('?') ? search : `?${search}`);
  return normalizeAuthReturnTo(params.get('returnTo'));
}
