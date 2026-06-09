import { useEffect, useMemo, useState } from 'react';
import {
  cloudPersistenceAvailable,
  getSessionSnapshot,
  refreshSessionSnapshot,
  saveSessionSnapshot,
  signInWithGoogle as signInWithGoogleProvider,
  signInWithMagicLink,
  signOutSupabase,
  subscribeToAuthChanges,
  type SupabaseSessionSnapshot,
} from '../lib/supabaseClient';
import type { AuthUserProfile, PlanCode } from '../types/production';

export interface AuthController {
  user: AuthUserProfile | null;
  session: SupabaseSessionSnapshot | null;
  loading: boolean;
  isSignedIn: boolean;
  cloudAuthReady: boolean;
  signInLocalPreview: (email?: string) => void;
  sendMagicLink: (email: string) => Promise<{ ok: boolean; message: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; message: string }>;
  signOut: () => Promise<void>;
}

function profileFromSession(session: SupabaseSessionSnapshot | null): AuthUserProfile | null {
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.email?.split('@')[0],
    plan: 'free' as PlanCode,
    createdAt: new Date().toISOString(),
  };
}

export function useAuth(): AuthController {
  const [session, setSession] = useState<SupabaseSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const cloudAuthReady = cloudPersistenceAvailable();

  useEffect(() => {
    let mounted = true;
    refreshSessionSnapshot().then((snapshot) => {
      if (!mounted) return;
      setSession(snapshot);
      setLoading(false);
    });
    const unsubscribe = subscribeToAuthChanges((snapshot) => {
      if (mounted) setSession(snapshot);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return useMemo(() => ({
    user: profileFromSession(session),
    session,
    loading,
    isSignedIn: Boolean(session?.user?.id),
    cloudAuthReady,
    signInLocalPreview: (email = 'local-preview@airealitycheck.test') => {
      const next: SupabaseSessionSnapshot = {
        accessToken: 'local-preview-token',
        user: { id: `local-user-${Date.now()}`, email },
      };
      saveSessionSnapshot(next);
      setSession(next);
    },
    sendMagicLink: async (email: string) => {
      if (!cloudAuthReady) {
        return { ok: false, message: 'Supabase is not configured. Use local preview mode for this build.' };
      }
      const result = await signInWithMagicLink(email);
      return {
        ok: Boolean(result.data),
        message: result.error ?? 'Magic link sent. Check your email to continue.',
      };
    },
    signInWithGoogle: async () => {
      if (!cloudAuthReady) {
        return { ok: false, message: 'Google sign-in is ready for Supabase configuration, but disabled in local preview.' };
      }
      const result = await signInWithGoogleProvider();
      return {
        ok: Boolean(result.data),
        message: result.error ?? 'Redirecting to Google sign-in.',
      };
    },
    signOut: async () => {
      await signOutSupabase();
      setSession(getSessionSnapshot());
    },
  }), [cloudAuthReady, loading, session]);
}
