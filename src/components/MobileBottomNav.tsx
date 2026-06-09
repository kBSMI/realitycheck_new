import React from 'react';
import { Home, Gauge, Trophy, BarChart3, Gem } from 'lucide-react';
import type { AppShell } from '../pages/LandingPage';

interface MobileBottomNavProps {
  current?: AppShell;
  onNavigate: (shell: AppShell) => void;
}

const items: { shell: AppShell; label: string; icon: React.ReactNode }[] = [
  { shell: 'landing', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { shell: 'consumer', label: 'Quest', icon: <Gauge className="h-4 w-4" /> },
  { shell: 'history', label: 'Wins', icon: <Trophy className="h-4 w-4" /> },
  { shell: 'index', label: 'Index', icon: <BarChart3 className="h-4 w-4" /> },
  { shell: 'support', label: 'Credits', icon: <Gem className="h-4 w-4" /> },
];

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ current, onNavigate }) => (
  <nav className="fixed bottom-3 left-3 right-3 z-40 sm:hidden rounded-3xl border border-white/12 bg-black/70 backdrop-blur-xl shadow-2xl shadow-black/60 px-2 py-2">
    <div className="grid grid-cols-5 gap-1">
      {items.map((item) => {
        const active = current === item.shell;
        return (
          <button key={item.shell} onClick={() => onNavigate(item.shell)} className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] transition-all ${active ? 'bg-white text-black' : 'text-zinc-400 hover:bg-white/10 hover:text-white'}`}>
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </div>
  </nav>
);

export default MobileBottomNav;
