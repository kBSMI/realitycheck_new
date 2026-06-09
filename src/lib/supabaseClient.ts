import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { appConfig, isCloudConfigured } from '../config/appConfig';
import { getAuthCallbackUrl, getReturnToFromSearch } from './authRedirect';

export interface SupabaseSessionSnapshot {
  accessToken?: string;
  user?: {
    id: string;
    email?: string;
  };
}

export interface SupabaseClientResult<T> {
  data: T | null;
  error: string | null;
}

const SESSION_KEY = 'arc_supabase_session_snapshot';

let browserClient: SupabaseClient | null = null;

export function getSupabaseProjectUrl(): string {
  return appConfig.supabaseUrl.replace(/\/$/, '');
}

export function getSupabaseAnonKey(): string {
  return appConfig.supabaseAnonKey;
}

export function cloudPersistenceAvailable(): boolean {
  return isCloudConfigured();
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!cloudPersistenceAvailable()) return null;
  if (!browserClient) {
    browserClient = createClient(getSupabaseProjectUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    });
  }
  return browserClient;
}

function snapshotFromSession(session: Session | null): SupabaseSessionSnapshot | null {
  if (!session?.user?.id) return null;
  return {
    accessToken: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}

function snapshotFromUser(user: User | null, accessToken?: string): SupabaseSessionSnapshot | null {
  if (!user?.id) return null;
  return {
    accessToken,
    user: {
      id: user.id,
      email: user.email,
    },
  };
}

export function saveSessionSnapshot(session: SupabaseSessionSnapshot | null): void {
  if (typeof window === 'undefined') return;
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSessionSnapshot(): SupabaseSessionSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SupabaseSessionSnapshot) : null;
  } catch {
    return null;
  }
}

export async function refreshSessionSnapshot(): Promise<SupabaseSessionSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return getSessionSnapshot();
  const { data, error } = await client.auth.getSession();
  if (error) return getSessionSnapshot();
  const snapshot = snapshotFromSession(data.session);
  saveSessionSnapshot(snapshot);
  if (snapshot?.user?.id) await ensureArcProfile(snapshot).catch(() => undefined);
  return snapshot;
}

export function subscribeToAuthChanges(onChange: (snapshot: SupabaseSessionSnapshot | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const snapshot = snapshotFromSession(session);
    saveSessionSnapshot(snapshot);
    if (snapshot?.user?.id) void ensureArcProfile(snapshot);
    onChange(snapshot);
  });
  return () => data.subscription.unsubscribe();
}

export async function ensureArcProfile(session: SupabaseSessionSnapshot): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !session.user?.id) return;
  await client.from('arc_profiles').upsert({
    id: session.user.id,
    email: session.user.email,
    display_name: session.user.email?.split('@')[0] ?? null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function signInWithMagicLink(email: string, returnTo?: string): Promise<SupabaseClientResult<true>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase is not configured.' };
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: getAuthCallbackUrl(returnTo) },
  });
  return { data: error ? null : true, error: error?.message ?? null };
}

export async function signInWithGoogle(returnTo?: string): Promise<SupabaseClientResult<true>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase is not configured.' };
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: getAuthCallbackUrl(returnTo) },
  });
  return { data: error ? null : true, error: error?.message ?? null };
}

export async function signOutSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (client) await client.auth.signOut();
  saveSessionSnapshot(null);
}

export async function getAuthenticatedUserSnapshot(): Promise<SupabaseSessionSnapshot | null> {
  const client = getSupabaseClient();
  if (!client) return getSessionSnapshot();
  const { data } = await client.auth.getUser();
  const session = await refreshSessionSnapshot();
  return snapshotFromUser(data.user, session?.accessToken);
}


export interface AuthCallbackResult {
  ok: boolean;
  returnTo: string;
  error: string | null;
}

export async function handleSupabaseAuthCallback(url: string): Promise<AuthCallbackResult> {
  const parsed = new URL(url, appConfig.publicAppUrl || 'http://localhost:5173');
  const returnTo = getReturnToFromSearch(parsed.search);
  const urlError = parsed.searchParams.get('error_description') || parsed.searchParams.get('error');
  if (urlError) return { ok: false, returnTo, error: urlError };

  const code = parsed.searchParams.get('code');
  if (!code) return { ok: false, returnTo, error: 'Missing auth callback code. The magic link may be expired or incomplete.' };

  const client = getSupabaseClient();
  if (!client) return { ok: false, returnTo, error: 'Supabase is not configured.' };

  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error) return { ok: false, returnTo, error: error.message };

  const snapshot = snapshotFromSession(data.session);
  saveSessionSnapshot(snapshot);
  if (snapshot?.user?.id) await ensureArcProfile(snapshot).catch(() => undefined);

  return { ok: true, returnTo, error: null };
}
