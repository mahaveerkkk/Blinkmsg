import React from 'react';
import {
  Lock,
  Search,
  Shield,
  Trash2,
  MessageSquare,
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
  onOpenSearch: () => void;
  onOpenVault: () => void;
  onTriggerPanic: () => void;
}

function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

export const ChatsListView: React.FC<ChatsListViewProps> = ({
  currentUser,
  activeRooms,
  blinkRequests,
  onOpenRoom,
  onAcceptRequest,
  onDeclineRequest,
  onClearRoom,
  onOpenSearch,
  onOpenVault,
  onTriggerPanic,
}) => {
  return (
    <div className="pb-28 max-w-md mx-auto select-none bg-black min-h-screen text-white">
      {/* Clean Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl px-4 py-3.5 flex items-center justify-between border-b border-white/[0.08]">
        <div>
          <h1 className="font-bold text-2xl tracking-tight text-white">
            Messages
          </h1>
          <p className="text-xs text-[#D4FF00] font-mono font-semibold">
            @{currentUser.handle}
          </p>
        </div>

        <div className="flex items-center space-x-2">
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

      {/* Prominent Search Bar (Telegram / WhatsApp Style) */}
      <div className="px-4 py-3">
        <div
          onClick={onOpenSearch}
          className="w-full bg-[#12151B] border border-white/[0.08] hover:border-white/20 rounded-2xl px-4 py-2.5 flex items-center space-x-2.5 cursor-pointer text-zinc-400 transition-all shadow-inner"
        >
          <Search className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-medium text-zinc-400">
            Search users by @handle...
          </span>
        </div>
      </div>

      {/* Incoming Requests */}
      {blinkRequests.length > 0 && (
        <div className="p-4 border-b border-white/[0.06]">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Incoming Requests ({blinkRequests.length})
          </p>
          <div className="space-y-2">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl bg-[#141416] border border-white/[0.08] flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar avatarId={req.fromUser.avatarId} size="sm" isOnline={true} name={req.fromUser.handle} />
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
                    className="px-3 py-1 rounded-full bg-[#D4FF00] text-black font-bold text-xs active:scale-95"
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
      <div className="px-4 pt-1">
        {activeRooms.length > 0 ? (
          <div className="space-y-1">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onOpenRoom(room)}
                className="p-3 rounded-2xl hover:bg-[#121214] active:bg-[#18181c] transition-all flex items-center justify-between cursor-pointer border-b border-white/[0.04] last:border-0"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="relative">
                    <Avatar
                      avatarId={room.peerAvatarId || 3}
                      size="md"
                      name={room.peerHandle || room.code}
                      isOnline={true}
                    />
                    {room.unreadCount && room.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#D4FF00] rounded-full ring-2 ring-black" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="font-semibold text-sm text-white truncate">
                        {room.peerHandle && room.peerHandle !== 'Waiting for friend...'
                          ? `@${room.peerHandle}`
                          : `Room #${room.code}`}
                      </h4>
                      <Lock className="w-3 h-3 text-[#D4FF00] shrink-0" />
                    </div>

                    <p className="text-xs text-zinc-400 truncate mt-0.5">
                      {room.lastMessageText || (room.isBurnOnRead ? '🔥 Burn on read' : `⏱️ Disappears in ${room.timerSeconds}s`)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {room.lastMessageTime ? formatTimeAgo(room.lastMessageTime) : `#${room.code}`}
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
              <MessageSquare className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="font-semibold text-white text-base mb-1">
              No Conversations Yet
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
              Use the Search bar above to find a @handle, or open the Secret Room tab to connect with a 6-digit PIN.
            </p>

            <button
              onClick={onOpenVault}
              className="px-5 py-2.5 rounded-full bg-[#D4FF00] text-black font-extrabold text-xs active:scale-95 transition-transform shadow-[0_0_15px_rgba(212,255,0,0.3)]"
            >
              Open Secret Room
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
