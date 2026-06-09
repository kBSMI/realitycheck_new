import AuthButton from '../components/AuthButton';
import UserMenu from '../components/UserMenu';

export default function AuthPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 text-gray-200">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-neural-silver">Secure identity layer</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Sign in to sync reports, credits, and audit history.</h1>
        <p className="mt-3 text-gray-400">Enter your email and we’ll send a secure magic link. After you click it, AI Reality Check returns you to the app and creates your profile automatically.</p>
        <div className="mt-6"><AuthButton /></div>
      </div>
      <UserMenu />
    </div>
  );
}
