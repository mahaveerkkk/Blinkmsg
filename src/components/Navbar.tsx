import React from 'react';
import { ShieldAlert, Search, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';

interface NavbarProps {
  user: UserProfile;
  onOpenSearch: () => void;
  onOpenProfile: () => void;
  onPanic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onOpenSearch,
  onOpenProfile,
  onPanic,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#05070d]/90 backdrop-blur-md border-b border-[#1f293d] px-4 py-3 flex items-center justify-between">
      {/* Brand & Status */}
      <div className="flex items-center space-x-2.5">
        <div className="relative">
          <img src="/logo.svg" alt="BlinkMsg" className="w-9 h-9 drop-shadow-[0_0_8px_rgba(0,255,170,0.5)]" />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#05070d] animate-pulse" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-black text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">
              BlinkMsg
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
              E2E
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono flex items-center">
            <Sparkles className="w-2.5 h-2.5 mr-1 text-cyan-400 inline" />
            @{user.handle}
          </p>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center space-x-2">
        {/* Search Handle Button */}
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-xl bg-[#0d111a] border border-[#1f293d] text-slate-300 hover:text-cyan-400 active:scale-95 transition-all shadow-sm"
          title="Search by @handle"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Panic Button */}
        <button
          onClick={onPanic}
          className="group relative px-2.5 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900/60 active:scale-95 transition-all flex items-center space-x-1 shadow-[0_0_10px_rgba(239,68,68,0.2)]"
          title="Emergency Panic Purge"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
          <span className="text-[11px] font-bold tracking-wider uppercase hidden sm:inline">PANIC</span>
        </button>

        {/* User Avatar */}
        <button
          onClick={onOpenProfile}
          className="relative active:scale-90 transition-transform ml-1"
          title="Edit Identity"
        >
          <Avatar avatarId={user.avatarId} size="sm" glow={user.isAvailable} />
        </button>
      </div>
    </header>
  );
};
