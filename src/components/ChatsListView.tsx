import React from 'react';
import { Lock, QrCode, Plus, Trash2 } from 'lucide-react';
import { ChatRoom, BlinkRequest } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';

interface ChatsListViewProps {
  activeRooms: ChatRoom[];
  blinkRequests: BlinkRequest[];
  onOpenRoom: (room: ChatRoom) => void;
  onAcceptRequest: (req: BlinkRequest) => void;
  onDeclineRequest: (reqId: string) => void;
  onClearRoom: (roomId: string) => void;
  onNewChat: () => void;
}

export const ChatsListView: React.FC<ChatsListViewProps> = ({
  activeRooms,
  blinkRequests,
  onOpenRoom,
  onAcceptRequest,
  onDeclineRequest,
  onClearRoom,
  onNewChat,
}) => {
  return (
    <div className="pb-24 pt-2 px-4 max-w-md mx-auto select-none">
      {/* Pending Chat Requests */}
      {blinkRequests.length > 0 && (
        <div className="mb-4">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
            Incoming Requests ({blinkRequests.length})
          </p>

          <div className="space-y-1.5">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl bg-[#141416] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar avatarId={req.fromUser.avatarId} size="sm" />
                  <div>
                    <h4 className="font-semibold text-sm text-white">
                      @{req.fromUser.handle}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      wants to start an encrypted chat
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => {
                      sound.playSend();
                      onAcceptRequest(req);
                    }}
                    className="px-3 py-1 rounded-full bg-emerald-500 text-black font-semibold text-xs active:scale-95 transition-transform"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      sound.vibrate(8);
                      onDeclineRequest(req.id);
                    }}
                    className="px-2.5 py-1 rounded-full bg-[#1e1e22] text-zinc-400 text-xs hover:text-white"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Chats List */}
      {activeRooms.length > 0 ? (
        <div className="space-y-1">
          {activeRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onOpenRoom(room)}
              className="p-3 rounded-2xl hover:bg-[#141416] active:bg-[#1c1c20] transition-colors flex items-center justify-between cursor-pointer border-b border-[#1c1c1f]/40 last:border-0"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <Avatar avatarId={room.peerAvatarId || 3} size="md" />

                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-semibold text-sm text-white truncate">
                      {room.peerHandle ? `@${room.peerHandle}` : `Room ${room.code}`}
                    </h4>
                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>

                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {room.isBurnOnRead ? 'Burn on read' : `Auto-deletes in ${room.timerSeconds}s`}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-zinc-500 font-mono">
                  #{room.code}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playBurn();
                    onClearRoom(room.id);
                  }}
                  className="p-1.5 rounded-full text-zinc-600 hover:text-red-400 active:scale-90 transition-all"
                  title="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 px-4">
          <div className="w-14 h-14 rounded-full bg-[#141416] border border-white/5 flex items-center justify-center text-zinc-600 mx-auto mb-3">
            <Lock className="w-6 h-6 text-zinc-500" />
          </div>
          <h3 className="font-semibold text-white text-base mb-1">
            No Messages Yet
          </h3>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-6 leading-relaxed">
            Start a zero-knowledge private conversation. Messages disappear automatically after being read.
          </p>

          <button
            onClick={onNewChat}
            className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-xs active:scale-95 transition-transform inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Start Encrypted Chat</span>
          </button>
        </div>
      )}

      {/* Floating Action Button (Clean iOS / Telegram style) */}
      <button
        onClick={onNewChat}
        className="fixed bottom-20 right-5 w-13 h-13 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-2xl active:scale-90 transition-transform p-3 z-30"
        title="New Chat"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
