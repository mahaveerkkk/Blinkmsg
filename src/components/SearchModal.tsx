import React, { useState } from 'react';
import { Search, X, Lock, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { supabase, NetworkService } from '../services/network';
import { sound } from '../services/sound';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onStartChat: (user: UserProfile) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onStartChat,
}) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (text: string) => {
    setQuery(text);
    const clean = text.trim().toLowerCase().replace('@', '');

    if (!clean) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    // 1. Check if user typed a 6-digit Personal Connection PIN
    if (clean.length === 6 && /^\d+$/.test(clean)) {
      try {
        const pinUser = await NetworkService.findProfileByPin(clean);
        if (pinUser) {
          setSearchResults([pinUser]);
          setLoading(false);
          return;
        }
      } catch {
        // continue to normal search
      }
    }

    // 2. Live Supabase Query
    if (supabase) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .ilike('handle', `%${clean}%`)
          .limit(10);

        if (data && data.length > 0) {
          const mapped: UserProfile[] = data.map((d: any) => ({
            id: d.id,
            handle: d.handle,
            displayName: d.display_name || d.handle,
            avatarId: d.avatar_id || 1,
            vibe: d.vibe || '',
            isAvailable: d.is_available || false,
            country: d.country || 'India',
            state: 'Delhi',
            city: d.city || 'New Delhi',
            lastActive: Date.now(),
          }));
          setSearchResults(mapped);
          setLoading(false);
          return;
        } else {
          setSearchResults([]);
        }
      } catch {
        setSearchResults([]);
      }
    } else {
      setSearchResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in font-sans">
      <div className="w-full max-w-md bg-[#0C0E14] border border-white/[0.1] rounded-t-[32px] sm:rounded-[32px] p-5 flex flex-col max-h-[85vh] shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative overflow-hidden">
        {/* Top ambient highlight line */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/50 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4 pt-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-extrabold text-white text-base tracking-tight">
              Encrypted Directory
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-[#00F5A0]/10 text-[#00F5A0] text-[9px] font-mono font-bold border border-[#00F5A0]/20">
              LIVE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.06] hover:bg-white/[0.1] active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type username (e.g. shadow_alex)"
            autoFocus
            className="w-full bg-[#131620] border border-white/[0.08] focus:border-[#D4FF00]/60 focus:ring-1 focus:ring-[#D4FF00]/30 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner font-medium"
          />
        </div>

        {/* Search Results List */}
        <div className="space-y-2 overflow-y-auto min-h-[160px] pr-1">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-3.5 rounded-2xl bg-[#141722]/80 hover:bg-[#1A1F2E] border border-white/[0.06] hover:border-white/[0.12] flex items-center justify-between transition-all duration-200 group"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar avatarId={user.avatarId} size="md" isOnline={true} name={user.displayName || user.handle} />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm text-white truncate group-hover:text-[#D4FF00] transition-colors">
                    {user.displayName || user.handle}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate font-mono mt-0.5">
                    @{user.handle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onClose();
                  onStartChat(user);
                }}
                className="px-4 py-2 rounded-xl bg-[#D4FF00] text-black font-extrabold text-xs active:scale-95 transition-all shrink-0 flex items-center space-x-1 shadow-[0_0_12px_rgba(212,255,0,0.25)] hover:brightness-110"
              >
                <span>Chat</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          ))}

          {query && searchResults.length === 0 && !loading && (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              No user found matching "@{query}"
            </div>
          )}

          {!query && (
            <div className="text-center py-12 text-zinc-500 text-xs flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
                <ShieldCheck className="w-6 h-6 text-[#D4FF00] opacity-80" />
              </div>
              <p className="font-bold text-zinc-300 text-sm">Direct Handle Lookup</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Connect directly with any handle. All chats remain end-to-end encrypted with zero server logs.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
