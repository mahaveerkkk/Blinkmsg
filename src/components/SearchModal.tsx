import React, { useState } from 'react';
import { Search, X, Zap, Shield, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { MOCK_RADAR_USERS } from '../services/network';
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
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (text: string) => {
    setQuery(text);
    const clean = text.trim().toLowerCase().replace('@', '');

    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setHasSearched(true);
    const found = MOCK_RADAR_USERS.filter(
      (u) =>
        u.handle.toLowerCase().includes(clean) ||
        u.displayName.toLowerCase().includes(clean)
    );
    setSearchResults(found);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#090d16] border border-[#1f293d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Search by @handle
            </h3>
          </div>
          <button
            onClick={() => {
              sound.vibrate(10);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 bg-[#131824] active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type username (e.g. shadow_alex)"
            autoFocus
            className="w-full bg-[#131824] border border-[#1f293d] focus:border-cyan-500/50 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
          />
          <span className="absolute left-3.5 top-3.5 text-slate-500 font-mono text-sm">
            @
          </span>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 min-h-[160px]">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-3 rounded-2xl bg-[#0d111a] border border-[#1f293d] flex items-center justify-between hover:border-cyan-500/40 transition-all shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <Avatar avatarId={user.avatarId} size="md" glow={true} />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-semibold text-sm text-slate-100">
                      {user.displayName}
                    </h4>
                    <span className="text-[11px] text-cyan-400 font-mono">
                      @{user.handle}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                    {user.vibe}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onClose();
                  onStartChat(user);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs flex items-center space-x-1 active:scale-95 transition-transform shadow-md"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Blink</span>
              </button>
            </div>
          ))}

          {hasSearched && searchResults.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-30" />
              <p>No ghost user found matching "@{query}".</p>
              <p className="text-[10px] text-slate-600 mt-1">Make sure the handle is spelled correctly.</p>
            </div>
          )}

          {!hasSearched && (
            <div className="text-center py-8 text-slate-500 text-xs flex flex-col items-center">
              <Shield className="w-8 h-8 text-cyan-500/20 mb-2" />
              <p className="font-medium text-slate-400">Zero-Knowledge Directory</p>
              <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                Enter any person's exact @handle to send an instant encrypted Blink request.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
