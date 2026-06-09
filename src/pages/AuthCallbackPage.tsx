import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { handleSupabaseAuthCallback } from '../lib/supabaseClient';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Finishing secure sign-in...');
  const [returnTo, setReturnTo] = useState('/reality-check');

  useEffect(() => {
    let mounted = true;
    handleSupabaseAuthCallback(window.location.href).then((result) => {
      if (!mounted) return;
      setReturnTo(result.returnTo);
      if (!result.ok) {
        setStatus('error');
        setMessage(result.error ?? 'Sign-in failed. Please request a new magic link.');
        return;
      }
      setStatus('success');
      setMessage('Signed in. Redirecting...');
      window.setTimeout(() => navigate(result.returnTo, { replace: true }), 650);
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const Icon = status === 'loading' ? Loader2 : status === 'success' ? CheckCircle2 : AlertTriangle;
  const iconClass = status === 'loading' ? 'animate-spin text-neural-silver' : status === 'success' ? 'text-neural-success' : 'text-neural-critical';

  return (
    <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-signal-white">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-black/40">
        <Icon className={`h-7 w-7 ${iconClass}`} />
      </div>
      <p className="mt-5 text-xs uppercase tracking-[0.3em] text-neural-faint">Secure callback</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">{status === 'error' ? 'Magic link needs attention' : 'Completing sign-in'}</h1>
      <p className="mt-3 text-sm text-neural-muted">{message}</p>
      {status === 'error' && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button onClick={() => navigate('/auth', { replace: true })} className="arc-button-primary px-4 py-2 text-sm">
            Request a new link
          </button>
          <button onClick={() => navigate(returnTo, { replace: true })} className="arc-button-secondary px-4 py-2 text-sm">
            Continue without signing in
          </button>
        </div>
      )}
    </div>
  );
}
