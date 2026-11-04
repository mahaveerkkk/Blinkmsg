import React, { useState } from 'react';
import { MapPin, Globe, MessageCircle } from 'lucide-react';
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
    <div className="pb-24 pt-3 px-4 max-w-md mx-auto">
      {/* Presence Switch Card (Clean Minimal Card) */}
      <div className="rounded-2xl bg-[#121214] border border-[#1f1f23] p-4 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">
            Available to Chat
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {currentUser.isAvailable
              ? 'Other users can discover you'
              : 'You are completely invisible'}
          </p>
        </div>

        {/* Minimal Switch */}
        <button
          onClick={toggleAvailability}
          className={`w-12 h-7 rounded-full transition-colors duration-200 p-0.5 flex items-center ${
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

      {/* Filter Tabs */}
      {currentUser.isAvailable && (
        <div className="flex items-center space-x-2 mb-3">
          <button
            onClick={() => { sound.vibrate(6); setFilter('all'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span className="flex items-center">
              <Globe className="w-3.5 h-3.5 mr-1" />
              Everyone
            </span>
          </button>

          <button
            onClick={() => { sound.vibrate(6); setFilter('city'); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              filter === 'city'
                ? 'bg-zinc-800 text-white border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
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
              className="rounded-2xl bg-[#121214] border border-[#1f1f23] p-3 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar avatarId={target.avatarId} size="md" />

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h3 className="font-semibold text-white text-sm truncate">
                      @{target.handle}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {target.vibe}
                  </p>

                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {target.city} • Online
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onStartChatWithUser(target);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs active:scale-95 transition-transform shrink-0"
              >
                Chat
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl bg-[#121214]/50 border border-zinc-900 mt-6">
          <MessageCircle className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <h3 className="text-sm font-medium text-zinc-300 mb-1">
            Ghost Mode Active
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto">
            Turn on "Available to Chat" above to discover people who want to talk right now.
          </p>
        </div>
      )}
    </div>
  );
};
