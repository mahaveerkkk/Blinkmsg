import React from 'react';
import {
  Lock,
  Plus,
  Search,
  Shield,
  KeyRound,
  Radio,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { ChatRoom, BlinkRequest, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';

interface ChatsListViewProps {
  currentUser: UserProfile;
  activeRooms: ChatRoom[];
  blinkRequests: BlinkRequest[];
  onOpenRoom: (room: ChatRoom) => void;
  onAcceptRequest: (req: BlinkRequest) => void;
  onDeclineRequest: (reqId: string) => void;
  onClearRoom: (roomId: string) => void;
  onNewChat: () => void;
  onOpenSearch: () => void;
  onOpenVault: () => void;
  onOpenRadar: () => void;
  onTriggerPanic: () => void;
}

export const ChatsListView: React.FC<ChatsListViewProps> = ({
  currentUser,
  activeRooms,
  blinkRequests,
  onOpenRoom,
  onAcceptRequest,
  onDeclineRequest,
  onClearRoom,
  onNewChat,
  onOpenSearch,
  onOpenVault,
  onOpenRadar,
  onTriggerPanic,
}) => {
  return (
    <div className="pb-28 max-w-md mx-auto select-none bg-black min-h-screen text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl px-4 py-3.5 flex items-center justify-between border-b border-white/[0.08]">
        <div>
          <h1 className="font-bold text-2xl tracking-tight text-white">
            Messages
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            @{currentUser.handle}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onOpenSearch}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-300 active:scale-90 transition-all border border-white/[0.06]"
            title="Search username"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={onNewChat}
            className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold active:scale-90 transition-all shadow-md"
            title="New Chat"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <button
            onClick={onTriggerPanic}
            className="px-2.5 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold active:scale-90 transition-all flex items-center space-x-1"
            title="Panic Purge"
          >
            <Shield className="w-3.5 h-3.5 text-red-400" />
            <span className="text-[10px] tracking-wider uppercase font-bold">Panic</span>
          </button>
        </div>
      </header>

      {/* Quick Discovery Cards */}
      <div className="p-4 grid grid-cols-2 gap-2.5">
        <button
          onClick={onOpenVault}
          className="p-3.5 rounded-2xl bg-[#121214] border border-white/[0.08] hover:border-emerald-500/30 transition-all text-left group active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <KeyRound className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-white">
            Secret Room
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            1-Tap QR & 6-Digit PIN
          </p>
        </button>

        <button
          onClick={onOpenRadar}
          className="p-3.5 rounded-2xl bg-[#121214] border border-white/[0.08] hover:border-blue-500/30 transition-all text-left group active:scale-[0.98]"
        >
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-2">
            <Radio className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-sm text-white">
            People Nearby
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            World & City Radar
          </p>
        </button>
      </div>

      {/* Incoming Requests */}
      {blinkRequests.length > 0 && (
        <div className="px-4 mb-4">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Requests ({blinkRequests.length})
          </p>
          <div className="space-y-2">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar avatarId={req.fromUser.avatarId} size="sm" isOnline={true} />
                  <div>
                    <h4 className="font-semibold text-sm text-white">
                      @{req.fromUser.handle}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Encrypted chat request
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onAcceptRequest(req)}
                    className="px-3 py-1 rounded-full bg-emerald-500 text-black font-semibold text-xs active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDeclineRequest(req.id)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Chats Section */}
      <div className="px-4">
        <div className="flex items-center justify-between py-2">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Active Encrypted Blinks ({activeRooms.length})
          </span>
          <span className="text-[11px] text-emerald-400 font-medium">
            Zero Server Logs
          </span>
        </div>

        {activeRooms.length > 0 ? (
          <div className="space-y-1 mt-1">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onOpenRoom(room)}
                className="p-3 rounded-2xl hover:bg-[#121214] active:bg-[#18181c] transition-all flex items-center justify-between cursor-pointer border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <Avatar
                    avatarId={room.peerAvatarId || 3}
                    size="md"
                    name={room.peerHandle}
                    isOnline={true}
                  />

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {room.peerHandle ? `@${room.peerHandle}` : `Room #${room.code}`}
                      </h4>
                      <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                    </div>

                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {room.isBurnOnRead ? '🔥 Burn on read' : `⏱️ Disappears in ${room.timerSeconds}s`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    #{room.code}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playBurn();
                      onClearRoom(room.id);
                    }}
                    className="p-2 rounded-full text-zinc-500 hover:text-red-400 active:scale-90 transition-all"
                    title="Delete Chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 px-4 rounded-3xl bg-[#0c0c0e] border border-white/[0.05] mt-2">
            <div className="w-14 h-14 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto mb-3 shadow-inner">
              <Lock className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">
              No Active Chats
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
              Every message is encrypted and self-destructs after being read. No history is ever stored.
            </p>

            <button
              onClick={onNewChat}
              className="px-5 py-2.5 rounded-full bg-emerald-500 text-black font-semibold text-xs active:scale-95 transition-transform inline-flex items-center space-x-1.5 shadow-md"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Start Encrypted Chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
