import { createClient, type Session, type SupabaseClient, type User } from '@supabase/supabase-js';
import { appConfig, isCloudConfigured } from '../config/appConfig';

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
        detectSessionInUrl: true,
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
  return snapshot;
}

export function subscribeToAuthChanges(onChange: (snapshot: SupabaseSessionSnapshot | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    const snapshot = snapshotFromSession(session);
    saveSessionSnapshot(snapshot);
    onChange(snapshot);
  });
  return () => data.subscription.unsubscribe();
}

export async function signInWithMagicLink(email: string, redirectTo = appConfig.publicAppUrl): Promise<SupabaseClientResult<true>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase is not configured.' };
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });
  return { data: error ? null : true, error: error?.message ?? null };
}

export async function signInWithGoogle(redirectTo = appConfig.publicAppUrl): Promise<SupabaseClientResult<true>> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: 'Supabase is not configured.' };
  const { error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
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
