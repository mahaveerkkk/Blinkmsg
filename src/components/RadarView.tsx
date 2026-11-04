import React, { useState, useEffect } from 'react';
import { MessageSquare, MapPin, Radio, RefreshCw, Users } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { NetworkService } from '../services/network';
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
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadUsers = async () => {
    setLoading(true);
    const users = await NetworkService.fetchActiveProfiles(currentUser.handle);
    setActiveUsers(users);
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    const interval = setInterval(loadUsers, 8000);
    return () => clearInterval(interval);
  }, [currentUser.handle]);

  const toggleAvailability = () => {
    sound.vibrate(10);
    onUpdateUser({ isAvailable: !currentUser.isAvailable });
  };

  const filteredUsers = activeUsers.filter((u) => {
    if (filter === 'city') return u.city.toLowerCase() === (currentUser.city || '').toLowerCase();
    return true;
  });

  return (
    <div className="pb-32 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* 1. Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="font-extrabold text-2xl tracking-tight text-white">
              Active Now
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-[#00F5A0]/10 text-[#00F5A0] text-[10px] font-mono font-bold border border-[#00F5A0]/25 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
              <span>{activeUsers.length} Online</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real registered users currently available on BlinkMsg.
          </p>
        </div>

        <button
          onClick={() => {
            sound.vibrate(8);
            loadUsers();
          }}
          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all active:scale-90"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 2. Ghost Mode Banner */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-3.5 mb-4 flex items-center justify-between shadow-sm">
        <div className="pr-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-white">
              My Visibility:
            </span>
            {currentUser.isAvailable ? (
              <span className="text-[11px] font-mono font-bold text-[#00F5A0] flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
                <span>Online to others</span>
              </span>
            ) : (
              <span className="text-[11px] font-mono font-bold text-zinc-400">
                👻 Ghost Mode (Hidden)
              </span>
            )}
          </div>
          <span className="text-[11px] text-zinc-400 mt-0.5 block">
            {currentUser.isAvailable
              ? 'Others can see you and ping you.'
              : 'You are invisible, but you can still view and ping online users.'}
          </span>
        </div>

        <button
          onClick={toggleAvailability}
          className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 cursor-pointer ${
            currentUser.isAvailable ? 'bg-[#00F5A0]' : 'bg-zinc-800'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
              currentUser.isAvailable ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 3. Filter Buttons */}
      <div className="flex items-center space-x-2 mb-3">
        <button
          onClick={() => {
            sound.vibrate(6);
            setFilter('all');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'all'
              ? 'bg-white/10 text-white shadow-sm border border-white/10'
              : 'text-zinc-400 hover:text-white bg-[#0F121C]'
          }`}
        >
          All Users ({activeUsers.length})
        </button>
        <button
          onClick={() => {
            sound.vibrate(6);
            setFilter('city');
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            filter === 'city'
              ? 'bg-white/10 text-[#00F5A0] shadow-sm border border-[#00F5A0]/30'
              : 'text-zinc-400 hover:text-white bg-[#0F121C]'
          }`}
        >
          Near {currentUser.city || 'My City'}
        </button>
      </div>

      {/* 4. Real Active Users List */}
      <div className="space-y-2">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((user) => (
            <div
              key={user.id}
              className="p-3 rounded-2xl bg-[#0F121C] border border-white/[0.06] hover:border-white/[0.12] flex items-center justify-between transition-all group"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar
                  avatarId={user.avatarId}
                  size="md"
                  isOnline={true}
                  name={user.displayName || user.handle}
                />
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-bold text-sm text-white truncate group-hover:text-[#D4FF00] transition-colors">
                      {user.displayName || user.handle}
                    </h4>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0]" />
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {user.vibe || `📍 ${user.city || 'Online'}`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sound.playSend();
                  onStartChatWithUser(user);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-extrabold text-xs active:scale-95 transition-all shadow-sm flex items-center space-x-1 shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-20 px-6 rounded-2xl bg-[#0F121C] border border-white/[0.06] mt-2">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto mb-3">
              <Users className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="font-bold text-white text-sm mb-1">
              No Other Users Online
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              When other real users create an account or open the app, they will automatically appear here live.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
