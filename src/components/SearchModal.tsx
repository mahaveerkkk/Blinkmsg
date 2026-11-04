import React, { useState } from 'react';
import { Search, X, Lock, ArrowRight } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { MOCK_RADAR_USERS, supabase } from '../services/network';
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

    // 1. Live Supabase Query
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
        }
      } catch {
        // fallback
      }
    }

    // 2. Fallback
    const found = MOCK_RADAR_USERS.filter(
      (u) =>
        u.handle.toLowerCase().includes(clean) ||
        u.displayName.toLowerCase().includes(clean)
    );
    setSearchResults(found);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#121214] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-5 flex flex-col max-h-[85vh] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">
            Search by @handle
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.06] active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-4">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type exact username (e.g. shadow_alex)"
            autoFocus
            className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
          />
        </div>

        {/* Results */}
        <div className="space-y-2 overflow-y-auto min-h-[160px]">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar avatarId={user.avatarId} size="md" isOnline={true} name={user.displayName || user.handle} />
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-white truncate">
                    {user.displayName || user.handle}
                  </h4>
                  <p className="text-xs text-zinc-400 truncate">
                    {user.vibe || user.city}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onClose();
                  onStartChat(user);
                }}
                className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-black font-semibold text-xs active:scale-95 transition-transform shrink-0 flex items-center space-x-1"
              >
                <span>Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {query && searchResults.length === 0 && (
            <div className="text-center py-10 text-zinc-500 text-xs">
              No user found matching "@{query}"
            </div>
          )}

          {!query && (
            <div className="text-center py-12 text-zinc-500 text-xs flex flex-col items-center">
              <Lock className="w-8 h-8 text-zinc-600 mb-2 opacity-40" />
              <p className="font-medium text-zinc-400">Zero-Knowledge Directory</p>
              <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                Search any user by their exact @handle to start an end-to-end encrypted chat.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
