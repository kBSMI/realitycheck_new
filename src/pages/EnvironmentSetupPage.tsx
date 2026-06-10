import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/50">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        to="/auth"
        className="rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/80"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
      <div className="hidden max-w-[180px] truncate text-sm text-white/70 sm:block">
        {user.email || 'Signed in'}
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
