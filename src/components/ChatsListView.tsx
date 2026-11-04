import React from 'react';
import { MessageSquare, Flame, ShieldAlert, ArrowRight, Clock, Trash2, Zap } from 'lucide-react';
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
  onNavigateRadar: () => void;
}

export const ChatsListView: React.FC<ChatsListViewProps> = ({
  activeRooms,
  blinkRequests,
  onOpenRoom,
  onAcceptRequest,
  onDeclineRequest,
  onClearRoom,
  onNavigateRadar,
}) => {
  return (
    <div className="pb-24 pt-3 px-4 max-w-lg mx-auto">
      {/* Pending Blink Requests */}
      {blinkRequests.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-bold mb-3 px-1 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 fill-current" />
            <span>Incoming Blink Requests ({blinkRequests.length})</span>
          </div>

          <div className="space-y-2.5">
            {blinkRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-[#0e1626] border border-amber-500/40 shadow-lg flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <Avatar avatarId={req.fromUser.avatarId} size="md" glow={true} />
                  <div>
                    <h4 className="font-bold text-sm text-slate-100">
                      {req.fromUser.displayName}
                    </h4>
                    <p className="text-[11px] text-cyan-400 font-mono">
                      @{req.fromUser.handle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      sound.playSend();
                      onAcceptRequest(req);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-md active:scale-95 transition-transform"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      sound.vibrate(10);
                      onDeclineRequest(req.id);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-[#131824] text-slate-400 text-xs hover:text-red-400 active:scale-95 transition-transform"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Encrypted Rooms */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3 px-1">
          <span className="font-bold uppercase tracking-wider text-slate-300">
            Active Encrypted Blinks ({activeRooms.length})
          </span>
          <span className="text-[11px] text-emerald-400/80 font-mono">
            Encrypted & Ephemeral
          </span>
        </div>

        {activeRooms.length > 0 ? (
          <div className="space-y-2.5">
            {activeRooms.map((room) => (
              <div
                key={room.id}
                onClick={() => onOpenRoom(room)}
                className="p-3.5 rounded-2xl bg-[#0d111a] border border-[#1f293d] hover:border-emerald-500/40 transition-all flex items-center justify-between cursor-pointer shadow-md group"
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="relative">
                    <Avatar avatarId={room.peerAvatarId || 3} size="md" glow={true} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d111a]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <h4 className="font-semibold text-sm text-slate-100 truncate">
                        {room.peerHandle ? `@${room.peerHandle}` : `Room #${room.code}`}
                      </h4>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                        {room.code}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                      <span className="flex items-center text-amber-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {room.isBurnOnRead ? 'Burn on Read' : `${room.timerSeconds}s timer`}
                      </span>
                      <span>•</span>
                      <span className="text-emerald-400 font-mono">E2EE Ready</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sound.playBurn();
                      onClearRoom(room.id);
                    }}
                    className="p-2 rounded-xl text-slate-500 hover:text-red-400 opacity-60 hover:opacity-100 active:scale-90 transition-all"
                    title="Nuke this room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-[#131824] flex items-center justify-center text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-4 rounded-3xl bg-[#0d111a]/50 border border-dashed border-[#1f293d]">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-40" />
            <h3 className="font-bold text-slate-300 text-sm mb-1">
              No Active Blinks
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mb-5">
              Messages and rooms are automatically erased once closed. Connect with someone on the Radar or create a Secret Vault room.
            </p>
            <button
              onClick={onNavigateRadar}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(0,255,170,0.3)] active:scale-95 transition-transform"
            >
              Explore Blink Radar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
