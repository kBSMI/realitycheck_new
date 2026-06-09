import { ShieldCheck, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function UserMenu() {
  const { user, isSignedIn } = useAuth();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300">
      <div className="flex items-center gap-2 text-white">
        <UserCircle className="h-4 w-4" />
        <span className="font-semibold">{isSignedIn ? user?.email : 'Local preview mode'}</span>
      </div>
      <div className="mt-3 flex items-start gap-2 text-xs text-gray-400">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 text-cyan-300" />
        <p>Cloud auth is scaffolded for Codex/Supabase refinement. Current build keeps local preview safe and testable.</p>
      </div>
    </div>
  );
}
