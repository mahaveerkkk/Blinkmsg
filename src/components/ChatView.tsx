import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Timer,
  Flame,
  Check,
  CheckCheck,
  Eye,
  Trash2,
  Lock,
  ArrowUp,
  ShieldCheck,
} from 'lucide-react';
import { ChatMessage, ChatRoom, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { NetworkService } from '../services/network';

interface ChatViewProps {
  room: ChatRoom;
  currentUser: UserProfile;
  onLeaveRoom: () => void;
}

const TIMER_OPTIONS = [
  { label: '🔥 Burn on Read', value: 0, isBurn: true },
  { label: '10 seconds', value: 10, isBurn: false },
  { label: '30 seconds', value: 30, isBurn: false },
  { label: '1 minute', value: 60, isBurn: false },
  { label: '5 minutes', value: 300, isBurn: false },
];

export const ChatView: React.FC<ChatViewProps> = ({
  room,
  currentUser,
  onLeaveRoom,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentTimer, setCurrentTimer] = useState(room.timerSeconds || 30);
  const [isBurnOnRead, setIsBurnOnRead] = useState(room.isBurnOnRead || false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial encrypted handshake notice
    const initialNotice: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'System',
      text: `Messages are end-to-end encrypted and disappear after ${isBurnOnRead ? 'reading' : `${currentTimer}s`}.`,
      createdAt: Date.now(),
      timerSeconds: 15,
      expiresAt: Date.now() + 15000,
      isBurnOnRead: false,
      status: 'delivered',
    };
    setMessages([initialNotice]);

    const unsubscribe = NetworkService.subscribeToRoom(room.id, {
      onMessage: (incoming: any) => {
        sound.playReceive();
        setMessages((prev) => [...prev, incoming]);
      },
      onTyping: (typingHandle: string) => {
        if (typingHandle !== currentUser.handle) {
          setPeerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2000);
        }
      },
    });

    return () => unsubscribe();
  }, [room.id]);

  // Master countdown timer for message self-destruction
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setMessages((prev) => {
        let hasExpired = false;
        const next = prev.filter((msg) => {
          if (msg.senderId === 'system') return true;
          if (msg.isBurnOnRead && !msg.isRevealed) return true;
          if (msg.expiresAt && now >= msg.expiresAt) {
            hasExpired = true;
            return false;
          }
          return true;
        });

        if (hasExpired) sound.playBurn();
        return hasExpired ? next : prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    sound.playSend();

    const expiresAt = isBurnOnRead ? 0 : Date.now() + currentTimer * 1000;

    const newMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      roomId: room.id,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      text: inputText.trim(),
      createdAt: Date.now(),
      timerSeconds: currentTimer,
      expiresAt,
      isBurnOnRead,
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    NetworkService.broadcastMessage(room.id, newMsg);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    NetworkService.broadcastTyping(room.id, currentUser.handle);
  };

  const handleRevealBurnOnRead = (msgId: string) => {
    sound.vibrate(15);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isRevealed: true,
              expiresAt: Date.now() + 6000, // 6s countdown once opened
            }
          : m
      )
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white select-none">
      {/* Top Header (Telegram iOS / Apple Messages Style) */}
      <header className="px-3 py-2.5 bg-black/90 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-2">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white active:scale-90 transition-all rounded-full"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <Avatar
            avatarId={room.peerAvatarId || 3}
            size="sm"
            name={room.peerHandle}
            isOnline={true}
          />

          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-1">
              <h2 className="font-semibold text-[15px] text-white truncate leading-tight">
                {room.peerHandle ? `@${room.peerHandle}` : `Room #${room.code}`}
              </h2>
              <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[11px] text-emerald-400 font-medium leading-tight">
              End-to-End Encrypted
            </p>
          </div>
        </div>

        {/* Right Actions: Timer Pill & Delete */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-xs text-zinc-200 flex items-center space-x-1.5 active:scale-95 transition-all shadow-sm"
            >
              {isBurnOnRead ? (
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <Timer className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="font-medium text-[11px] font-mono">
                {isBurnOnRead ? 'Burn' : `${currentTimer}s`}
              </span>
            </button>

            {/* Timer Sheet Dropdown */}
            {showTimerMenu && (
              <div className="absolute right-0 top-11 w-44 rounded-2xl bg-[#18181c] border border-white/10 shadow-2xl p-1 z-50 animate-pop-in">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      sound.vibrate(8);
                      setCurrentTimer(opt.value);
                      setIsBurnOnRead(opt.isBurn);
                      setShowTimerMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/[0.08] flex items-center justify-between text-zinc-200 transition-colors"
                  >
                    <span>{opt.label}</span>
                    {((opt.isBurn && isBurnOnRead) ||
                      (!opt.isBurn && !isBurnOnRead && currentTimer === opt.value)) && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              sound.playPanic();
              onLeaveRoom();
            }}
            className="p-2 rounded-full text-zinc-400 hover:text-red-400 active:scale-90 transition-all"
            title="Delete & Purge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-[11px] text-zinc-400 text-center max-w-xs flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 mr-1" />
                  {msg.text}
                </span>
              </div>
            );
          }

          const timeLeftMs = msg.expiresAt ? Math.max(0, msg.expiresAt - Date.now()) : 0;
          const timeLeftSec = Math.ceil(timeLeftMs / 1000);

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-opacity duration-300`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                  isMe
                    ? 'bg-[#152e22] text-white border border-emerald-500/20 rounded-br-[4px]'
                    : 'bg-[#18181b] text-zinc-100 border border-white/[0.06] rounded-bl-[4px]'
                }`}
              >
                {/* Burn On Read Shield */}
                {msg.isBurnOnRead && !msg.isRevealed && !isMe ? (
                  <button
                    onClick={() => handleRevealBurnOnRead(msg.id)}
                    className="flex items-center space-x-2 py-1 px-2.5 rounded-xl bg-black/40 text-amber-300 text-xs font-medium active:scale-95 transition-transform"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Tap to view (Burns in 6s)</span>
                  </button>
                ) : (
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                )}

                {/* Footer Time & Timer Status */}
                <div
                  className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] ${
                    isMe ? 'text-emerald-300/60' : 'text-zinc-500'
                  }`}
                >
                  {(!msg.isBurnOnRead || msg.isRevealed) && (
                    <span className="font-mono">
                      ⏱ {timeLeftSec}s
                    </span>
                  )}

                  {msg.isBurnOnRead && !msg.isRevealed && (
                    <span className="flex items-center text-amber-400">
                      <Flame className="w-2.5 h-2.5 fill-current mr-0.5" />
                      burn
                    </span>
                  )}

                  {isMe && <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </div>
            </div>
          );
        })}

        {peerTyping && (
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-3 bg-black/95 border-t border-white/[0.08] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message"
            className="flex-1 bg-[#18181b] border border-white/[0.08] focus:border-white/20 rounded-full px-4 py-3 text-[15px] text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold disabled:opacity-20 active:scale-95 transition-all shadow-md shrink-0"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
