import React, { useState } from 'react';
import { MapPin, Globe, MessageSquare, Radio } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { MOCK_RADAR_USERS } from '../services/network';
import { sound } from '../services/sound';

interface RadarViewProps {
  currentUser: UserProfile;
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onStartChatWithUser: (targetUser: UserProfile) => void;
}

export const RadarView: React.FC<RadarViewProps> = ({
  currentUser,
  onUpdateUser,
  onStartChatWithUser,
}) => {
  const [filter, setFilter] = useState<'all' | 'city'>('all');
  const [activeUsers] = useState<UserProfile[]>(MOCK_RADAR_USERS);

  const toggleAvailability = () => {
    sound.vibrate(10);
    onUpdateUser({ isAvailable: !currentUser.isAvailable });
  };

  const filteredUsers = activeUsers.filter((u) => {
    if (filter === 'city') return u.city.toLowerCase() === currentUser.city.toLowerCase();
    return true;
  });

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto select-none">
      {/* Header */}
      <div className="mb-4">
        <h1 className="font-bold text-2xl tracking-tight text-white">
          People Nearby
        </h1>
        <p className="text-xs text-zinc-400">
          Discover anonymous users who want to chat right now.
        </p>
      </div>

      {/* Visibility Toggle Card */}
      <div className="rounded-2xl bg-[#121214] border border-white/[0.08] p-4 mb-4 flex items-center justify-between">
        <div className="pr-3">
          <h2 className="text-sm font-semibold text-white flex items-center">
            <span>Make Myself Visible</span>
            {currentUser.isAvailable && (
              <span className="ml-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {currentUser.isAvailable
              ? 'Other users can discover and chat with you'
              : 'You are completely hidden in ghost mode'}
          </p>
        </div>

        <button
          onClick={toggleAvailability}
          className={`w-12 h-7 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 ${
            currentUser.isAvailable ? 'bg-emerald-500' : 'bg-zinc-800'
          }`}
        >
          <div
            className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              currentUser.isAvailable ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Filter Chips */}
      {currentUser.isAvailable && (
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => { sound.vibrate(6); setFilter('all'); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-white text-black font-semibold'
                : 'bg-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <span className="flex items-center">
              <Globe className="w-3.5 h-3.5 mr-1" />
              Everyone
            </span>
          </button>

          <button
            onClick={() => { sound.vibrate(6); setFilter('city'); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === 'city'
                ? 'bg-white text-black font-semibold'
                : 'bg-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <span className="flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              {currentUser.city || 'City'}
            </span>
          </button>
        </div>
      )}

      {/* Active Users Feed */}
      {currentUser.isAvailable ? (
        <div className="space-y-2">
          {filteredUsers.map((target) => (
            <div
              key={target.id}
              className="rounded-2xl bg-[#121214] border border-white/[0.08] p-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar avatarId={target.avatarId} size="md" isOnline={true} name={target.handle} />

                <div className="min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">
                    @{target.handle}
                  </h3>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {target.vibe}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {target.city} • Active
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onStartChatWithUser(target);
                }}
                className="px-3.5 py-1.5 rounded-full bg-emerald-500 text-black font-semibold text-xs active:scale-95 transition-transform shrink-0"
              >
                Chat
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.05] mt-4">
          <Radio className="w-10 h-10 text-zinc-600 mx-auto mb-2 opacity-40" />
          <h3 className="text-sm font-semibold text-white mb-1">
            Ghost Mode Active
          </h3>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Toggle "Make Myself Visible" above to discover nearby active users.
          </p>
        </div>
      )}
    </div>
  );
};
