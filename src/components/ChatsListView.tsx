import React from 'react';
import {
  ChevronDown,
  Edit,
  Camera,
  Plus,
  Shield,
  Search,
  Lock,
} from 'lucide-react';
import { ChatRoom, BlinkRequest, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { MOCK_RADAR_USERS } from '../services/network';
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
  onOpenProfile: () => void;
  onStartChatWithUser: (user: UserProfile) => void;
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
  onOpenProfile,
  onStartChatWithUser,
}) => {
  return (
    <div className="pb-24 max-w-md mx-auto select-none bg-black min-h-screen text-white">
      {/* Instagram Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#1f1f23]">
        <button
          onClick={onOpenProfile}
          className="flex items-center space-x-1.5 active:opacity-70 transition-opacity"
        >
          <span className="font-bold text-xl tracking-tight text-white">
            {currentUser.handle}
          </span>
          <ChevronDown className="w-4 h-4 text-white" />
        </button>

        <div className="flex items-center space-x-4">
          <button
            onClick={onNewChat}
            className="text-white hover:text-zinc-300 active:scale-90 transition-transform"
            title="New Chat"
          >
            <Edit className="w-6 h-6 stroke-[1.8]" />
          </button>
        </div>
      </header>

      {/* Instagram Search Bar */}
      <div className="px-4 py-2">
        <button
          onClick={onOpenSearch}
          className="w-full bg-[#262626] rounded-xl px-4 py-2 flex items-center space-x-2 text-zinc-400 text-sm active:scale-[0.99] transition-transform"
        >
          <Search className="w-4 h-4 text-zinc-500" />
          <span>Search</span>
        </button>
      </div>

      {/* Instagram "Active Now" Stories Tray */}
      <div className="py-3 px-4 border-b border-[#1f1f23] overflow-x-auto no-scrollbar flex items-center space-x-4">
        {/* Your Note */}
        <div
          onClick={onOpenProfile}
          className="flex flex-col items-center cursor-pointer shrink-0"
        >
          <div className="relative">
            <Avatar avatarId={currentUser.avatarId} size="md" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#3797f0] text-white flex items-center justify-center text-xs font-bold border-2 border-black">
              +
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 max-w-[56px] truncate text-center">
            Your note
          </span>
        </div>

        {/* Active Users */}
        {MOCK_RADAR_USERS.map((user) => (
          <div
            key={user.id}
            onClick={() => onStartChatWithUser(user)}
            className="flex flex-col items-center cursor-pointer shrink-0 active:scale-95 transition-transform"
          >
            <Avatar
              avatarId={user.avatarId}
              size="md"
              hasStory={true}
              isOnline={user.isAvailable}
            />
            <span className="text-[11px] text-zinc-300 mt-1 max-w-[60px] truncate text-center">
              {user.displayName}
            </span>
          </div>
        ))}
      </div>

      {/* Incoming Blink Requests */}
      {blinkRequests.length > 0 && (
        <div className="px-4 py-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
            Requests ({blinkRequests.length})
          </p>
          <div className="space-y-2">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-2xl bg-[#141416] border border-white/5 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar avatarId={req.fromUser.avatarId} size="sm" isOnline={true} />
                  <div>
                    <h4 className="font-semibold text-sm text-white">
                      @{req.fromUser.handle}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      wants to send a disappearing message
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onAcceptRequest(req)}
                    className="px-3 py-1 rounded-full bg-[#3797f0] text-white font-semibold text-xs active:scale-95"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onDeclineRequest(req.id)}
                    className="px-2 py-1 text-xs text-zinc-400 hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Header */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <h3 className="font-bold text-base text-white">Messages</h3>
        <span className="text-xs text-[#3797f0] font-semibold">
          E2E Encrypted
        </span>
      </div>

      {/* Active Chats List */}
      <div className="divide-y divide-[#1f1f23]/40">
        {activeRooms.length > 0 ? (
          activeRooms.map((room) => (
            <div
              key={room.id}
              onClick={() => onOpenRoom(room)}
              className="px-4 py-3 hover:bg-[#141416] active:bg-[#1c1c1e] transition-colors flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center space-x-3 min-w-0 pr-3">
                <Avatar
                  avatarId={room.peerAvatarId || 3}
                  size="md"
                  isOnline={true}
                />

                <div className="min-w-0">
                  <h4 className="font-semibold text-sm text-white truncate">
                    {room.peerHandle ? `@${room.peerHandle}` : `Room #${room.code}`}
                  </h4>

                  <p className="text-xs text-zinc-400 truncate mt-0.5 flex items-center">
                    <span className="text-[#3797f0] mr-1">Vanish mode</span>
                    <span>• {room.isBurnOnRead ? 'Burn on read' : `${room.timerSeconds}s timer`}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    sound.playSend();
                    onOpenRoom(room);
                  }}
                  className="text-zinc-500 hover:text-white active:scale-90"
                >
                  <Camera className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 px-4">
            <div className="w-16 h-16 rounded-full bg-[#1c1c1e] flex items-center justify-center text-zinc-500 mx-auto mb-3">
              <Lock className="w-7 h-7 text-zinc-400" />
            </div>
            <h3 className="font-bold text-base text-white mb-1">
              Your Messages are Vanishing
            </h3>
            <p className="text-xs text-zinc-500 max-w-xs mx-auto mb-5 leading-relaxed">
              No chat history is stored on servers. Tap below to invite a friend with QR or secret code.
            </p>
            <button
              onClick={onNewChat}
              className="px-5 py-2.5 rounded-full bg-[#3797f0] text-white font-semibold text-xs active:scale-95 transition-transform"
            >
              Start Chat
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
