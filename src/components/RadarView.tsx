import React, { useState } from 'react';
import { Radar, Globe, MapPin, Zap, Eye, EyeOff, Radio } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'india' | 'city'>('all');
  const [activeUsers] = useState<UserProfile[]>(MOCK_RADAR_USERS);

  const toggleAvailability = () => {
    sound.vibrate(15);
    onUpdateUser({ isAvailable: !currentUser.isAvailable });
  };

  const filteredUsers = activeUsers.filter((u) => {
    if (filter === 'india') return u.country === 'India';
    if (filter === 'city') return u.city.toLowerCase() === currentUser.city.toLowerCase();
    return true;
  });

  return (
    <div className="pb-24 pt-3 px-4 max-w-lg mx-auto">
      {/* Radar Presence Switch Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0e1626] to-[#070b14] border border-[#1f293d] p-4 shadow-xl mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Radar className={`w-6 h-6 text-emerald-400 ${currentUser.isAvailable ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
              {currentUser.isAvailable && (
                <span className="absolute inset-0 rounded-2xl border-2 border-emerald-400 animate-ping opacity-25" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center">
                Blink Radar
                {currentUser.isAvailable ? (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                    LIVE
                  </span>
                ) : (
                  <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    GHOST
                  </span>
                )}
              </h2>
              <p className="text-[12px] text-slate-400">
                {currentUser.isAvailable
                  ? 'You are visible to people looking to chat'
                  : 'You are invisible. Toggle to discover nearby chats.'}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={toggleAvailability}
            className={`w-14 h-8 rounded-full transition-colors duration-300 p-1 flex items-center relative ${
              currentUser.isAvailable ? 'bg-emerald-500' : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
                currentUser.isAvailable ? 'translate-x-6 text-emerald-600' : 'translate-x-0 text-slate-400'
              }`}
            >
              {currentUser.isAvailable ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </div>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-4 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => { sound.vibrate(10); setFilter('all'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 border transition-all ${
            filter === 'all'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
              : 'bg-[#0d111a] text-slate-400 border-[#1f293d] hover:text-slate-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Global 🌍</span>
        </button>

        <button
          onClick={() => { sound.vibrate(10); setFilter('india'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 border transition-all ${
            filter === 'india'
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
              : 'bg-[#0d111a] text-slate-400 border-[#1f293d] hover:text-slate-200'
          }`}
        >
          <span>🇮🇳 India</span>
        </button>

        <button
          onClick={() => { sound.vibrate(10); setFilter('city'); }}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center space-x-1.5 border transition-all ${
            filter === 'city'
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
              : 'bg-[#0d111a] text-slate-400 border-[#1f293d] hover:text-slate-200'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{currentUser.city || 'My City'} 📍</span>
        </button>
      </div>

      {/* Active Users Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="flex items-center space-x-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Online Now ({filteredUsers.length})</span>
          </span>
          <span className="text-[11px] text-slate-500">Auto-expires on exit</span>
        </div>

        {filteredUsers.map((target) => (
          <div
            key={target.id}
            className="group relative rounded-2xl bg-[#0d111a] border border-[#1f293d] hover:border-emerald-500/40 p-3.5 transition-all duration-200 shadow-md flex items-center justify-between"
          >
            {/* User Details */}
            <div className="flex items-center space-x-3 min-w-0 pr-2">
              <div className="relative">
                <Avatar avatarId={target.avatarId} size="md" glow={true} />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0d111a]" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-semibold text-slate-100 text-sm truncate">
                    {target.displayName}
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    @{target.handle}
                  </span>
                </div>

                <p className="text-xs text-slate-300 truncate mt-0.5">
                  {target.vibe}
                </p>

                <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-1">
                  <span className="flex items-center">
                    <MapPin className="w-2.5 h-2.5 mr-0.5 text-emerald-400" />
                    {target.city}, {target.state}
                  </span>
                  <span>•</span>
                  <span className="text-emerald-400/80 font-mono">Active just now</span>
                </div>
              </div>
            </div>

            {/* Instant Blink Action */}
            <button
              onClick={() => {
                sound.playSend();
                onStartChatWithUser(target);
              }}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-[0_0_12px_rgba(0,255,170,0.3)] active:scale-95 transition-transform"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Blink</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
