import React, { useState } from 'react';
import {
  Lock,
  Search,
  Trash2,
  QrCode,
  Flame,
  MessageSquare,
  ShieldAlert,
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
  onOpenScanner: () => void;
  onStartChatWithUser: (user: UserProfile) => void;
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
  onOpenScanner,
}) => {
  return (
    <div className="pb-28 max-w-md mx-auto select-none bg-[#000000] min-h-screen text-white relative font-sans">
      {/* 1. Clean, Professional Top Bar (Telegram / Signal Standard) */}
      <header className="sticky top-0 z-40 bg-[#000000]/90 backdrop-blur-2xl px-4 py-3 flex items-center justify-between border-b border-white/[0.06] safe-top">
        <div className="flex items-center space-x-2.5">
          <img
            src="/logo.png"
            alt="BlinkMsg"
            className="w-8 h-8 rounded-xl object-contain drop-shadow-[0_2px_10px_rgba(0,245,160,0.3)]"
          />
          <div>
            <h1 className="font-extrabold text-xl tracking-tight text-white leading-tight">
              Messages
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              @{currentUser.handle} {!currentUser.isAvailable && '• 👻 Ghost'}
            </p>
          </div>
        </div>

        {/* Clean Header Action Icons */}
        <div className="flex items-center space-x-2">
          {/* Working Camera QR Scanner */}
          <button
            onClick={onOpenScanner}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 transition-all flex items-center justify-center text-zinc-300 hover:text-white"
            title="Scan QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>

          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] active:scale-90 transition-all flex items-center justify-center text-zinc-300 hover:text-white"
            title="Search @handle"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Incoming Requests (Clean notifications if any) */}
      {blinkRequests.length > 0 && (
        <div className="p-3 mx-4 mt-3 rounded-2xl bg-[#0E111A] border border-[#D4FF00]/30 shadow-md">
          <p className="text-[10px] font-mono text-[#D4FF00] font-black uppercase tracking-wider mb-2">
            Incoming Chat Request ({blinkRequests.length})
          </p>
          <div className="space-y-2">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-2.5 rounded-xl bg-black/40 flex items-center justify-between"
              >
                <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                  <Avatar
                    avatarId={req.fromUser.avatarId}
                    size="sm"
                    isOnline={true}
                    name={req.fromUser.displayName || req.fromUser.handle}
                  />
                  <div className="min-w-0">
                    <h4 className="font-bold text-xs text-white truncate">
                      {req.fromUser.displayName || req.fromUser.handle}
                    </h4>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      @{req.fromUser.handle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={() => onAcceptRequest(req)}
                    className="px-3 py-1 rounded-lg bg-[#D4FF00] text-black font-black text-xs active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDeclineRequest(req.id)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Professional Chat Conversations List */}
      <div className="divide-y divide-white/[0.04]">
        {activeRooms.length > 0 ? (
          activeRooms.map((room) => {
            const displayName =
              room.peerDisplayName ||
              (room.peerHandle && room.peerHandle !== 'Waiting for friend...'
                ? room.peerHandle.replace(/^@/, '')
                : `Room #${room.code}`);

            const isDirect = room.code === 'DIRECT';

            return (
              <div
                key={room.id}
                onClick={() => onOpenRoom(room)}
                className="px-4 py-3 hover:bg-white/[0.03] active:bg-white/[0.06] transition-colors flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center space-x-3.5 min-w-0 pr-3 flex-1">
                  <div className="relative shrink-0">
                    <Avatar
                      avatarId={room.peerAvatarId || 3}
                      size="md"
                      name={displayName}
                      isOnline={true}
                    />
                    {room.unreadCount && room.unreadCount > 0 ? (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4FF00] text-black text-[9px] font-black rounded-full ring-2 ring-[#07080B] flex items-center justify-center">
                        {room.unreadCount}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h4 className="font-bold text-[14.5px] text-white truncate">
                          {displayName}
                        </h4>
                        {!isDirect && (
                          <Lock className="w-3 h-3 text-[#D4FF00] shrink-0" />
                        )}
                      </div>

                      <span className="text-[11px] text-zinc-400 font-mono shrink-0 ml-2">
                        {room.lastMessageTime ? formatTimeAgo(room.lastMessageTime) : (isDirect ? 'Direct' : `#${room.code}`)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400 truncate pr-2">
                        {room.lastMessageText || (room.isBurnOnRead ? '🔥 Burn on read' : `⏱ Disappears in ${room.timerSeconds || 30}s`)}
                      </p>

                      {room.isBurnOnRead && (
                        <Flame className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playBurn();
                    onClearRoom(room.id);
                  }}
                  className="p-2 text-zinc-400 hover:text-red-400 active:scale-90 transition-all shrink-0 -mr-1"
                  title="Delete Chat"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-28 px-6">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 mx-auto mb-4">
              <MessageSquare className="w-6 h-6 text-zinc-400" />
            </div>
            <h3 className="font-bold text-white text-base mb-1">
              No Messages Yet
            </h3>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
              Scan a QR code or search a @handle to start an end-to-end encrypted chat.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 max-w-xs mx-auto">
              <button
                onClick={onOpenVault}
                className="px-3.5 py-2 rounded-xl bg-[#D4FF00] text-black font-extrabold text-xs active:scale-95 transition-all shadow-md flex items-center space-x-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Enter PIN</span>
              </button>

              <button
                onClick={onOpenScanner}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-xs active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Scan QR</span>
              </button>

              <button
                onClick={onOpenSearch}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-bold text-xs active:scale-95 transition-all flex items-center space-x-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
