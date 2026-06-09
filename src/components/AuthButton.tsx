import { FormEvent, useState } from 'react';
import { LogOut, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function AuthButton() {
  const { isSignedIn, user, cloudAuthReady, sendMagicLink, signInWithGoogle, signInLocalPreview, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const submitMagicLink = async (event: FormEvent) => {
    event.preventDefault();
    const result = await sendMagicLink(email);
    setMessage(result.message);
  };

  if (isSignedIn) {
    return (
      <button onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10">
        <LogOut className="h-3.5 w-3.5" />
        Sign out {user?.displayName ? `(${user.displayName})` : ''}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submitMagicLink} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          placeholder="you@example.com"
          className="min-w-0 flex-1 rounded-full border border-white/15 bg-black/30 px-3 py-2 text-xs text-gray-100 placeholder:text-gray-600 focus:border-cyan-400 focus:outline-none"
        />
        <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20">
          <Mail className="h-3.5 w-3.5" />
          Send magic link
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void signInWithGoogle().then((result) => setMessage(result.message))} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10">
          <UserCircle className="h-3.5 w-3.5" />
          Google sign-in
        </button>
        {!cloudAuthReady && (
          <button onClick={() => signInLocalPreview(email || undefined)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-gray-200 hover:bg-white/10">
            <UserCircle className="h-3.5 w-3.5" />
            Local preview
          </button>
        )}
      </div>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}
