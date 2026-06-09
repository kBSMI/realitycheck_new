import AuthButton from '../components/AuthButton';
import UserMenu from '../components/UserMenu';

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-200">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Beta identity layer</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Sign in to sync reports and credits.</h1>
        <p className="mt-3 text-gray-400">This page is production-foundation scaffolding. Codex can replace the local preview button with Supabase Auth UI or magic-link login once environment keys are present.</p>
        <div className="mt-6"><AuthButton /></div>
      </div>
      <UserMenu />
    </div>
  );
}
