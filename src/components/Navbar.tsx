import React from 'react';
import { Search, Plus, Shield } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';

interface NavbarProps {
  user: UserProfile;
  title: string;
  onOpenSearch: () => void;
  onNewChat: () => void;
  onPanic: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  title,
  onOpenSearch,
  onNewChat,
  onPanic,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-[#1c1c1f] px-4 py-2.5 flex items-center justify-between">
      {/* Title */}
      <div className="flex items-center space-x-2">
        <h1 className="font-semibold text-lg tracking-tight text-white">
          {title}
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenSearch}
          className="w-8 h-8 rounded-full bg-[#18181b] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all"
          title="Search by @handle"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={onNewChat}
          className="w-8 h-8 rounded-full bg-[#18181b] flex items-center justify-center text-zinc-400 hover:text-white active:scale-90 transition-all"
          title="New Secret Chat"
        >
          <Plus className="w-4 h-4" />
        </button>

        <button
          onClick={onPanic}
          className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium active:scale-90 transition-all flex items-center space-x-1"
          title="Emergency Clean"
        >
          <Shield className="w-3 h-3 text-red-400" />
          <span className="text-[10px] tracking-wider uppercase font-semibold">Panic</span>
        </button>
      </div>
    </header>
  );
};
