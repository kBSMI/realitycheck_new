import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, isSupabaseReady } from '../lib/supabaseClient';
import { getSafeReturnTo } from '../lib/authRedirect';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Completing sign in...');

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      try {
        if (!isSupabaseReady || !supabase) {
          throw new Error('Supabase is not configured for this environment.');
        }

        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code) {
          throw new Error('Missing authentication code.');
        }

        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (user) {
          await supabase.from('arc_profiles').upsert({
            id: user.id,
            email: user.email,
            display_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email ||
              'AI Reality Check User',
            updated_at: new Date().toISOString(),
          });
        }

        if (!cancelled) {
          setStatus('success');
          setMessage('Sign in complete. Redirecting...');
        }

        const returnTo = getSafeReturnTo(searchParams.get('returnTo'));
        window.setTimeout(() => {
          navigate(returnTo || '/reality-check', { replace: true });
        }, 700);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to complete sign in.';
        if (!cancelled) {
          setStatus('error');
          setMessage(errorMessage);
        }
      }
    }

    completeAuth();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <main className="min-h-screen bg-black px-6 py-16 text-white">
      <section className="mx-auto max-w-2xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl">
        <p className="mb-3 text-sm uppercase tracking-[0.3em] text-white/50">
          AI Reality Check
        </p>

        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          {status === 'loading' && 'Completing sign in'}
          {status === 'success' && 'You are signed in'}
          {status === 'error' && 'Sign in needs attention'}
        </h1>

        <p className="text-lg leading-8 text-white/70">{message}</p>

        {status === 'error' && (
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/auth', { replace: true })}
              className="rounded-full bg-white px-5 py-3 font-semibold text-black transition hover:bg-white/80"
            >
              Try again
            </button>

            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="rounded-full border border-white/15 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
            >
              Go home
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
