import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
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

  if (!isOpen) return null;

  const handleSearch = (text: string) => {
    setQuery(text);
    const clean = text.trim().toLowerCase().replace('@', '');

    if (!clean) {
      setSearchResults([]);
      return;
    }

    const found = MOCK_RADAR_USERS.filter(
      (u) =>
        u.handle.toLowerCase().includes(clean) ||
        u.displayName.toLowerCase().includes(clean)
    );
    setSearchResults(found);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-[#121214] border border-[#222226] rounded-t-3xl sm:rounded-2xl p-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">
            Search by @handle
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search username..."
            autoFocus
            className="w-full bg-[#18181b] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>

        {/* Results */}
        <div className="space-y-1.5 overflow-y-auto min-h-[140px]">
          {searchResults.map((user) => (
            <div
              key={user.id}
              className="p-2.5 rounded-xl hover:bg-[#18181b] flex items-center justify-between transition-colors"
            >
              <div className="flex items-center space-x-2.5">
                <Avatar avatarId={user.avatarId} size="sm" />
                <div>
                  <h4 className="font-medium text-sm text-white">
                    @{user.handle}
                  </h4>
                  <p className="text-xs text-zinc-400">
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
                className="px-3 py-1.5 rounded-lg bg-white text-black font-medium text-xs active:scale-95 transition-transform"
              >
                Chat
              </button>
            </div>
          ))}

          {query && searchResults.length === 0 && (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No user found matching "@{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
