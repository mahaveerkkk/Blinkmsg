import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Timer,
  Flame,
  ArrowLeft,
  Check,
  CheckCheck,
  Eye,
  Trash2,
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
  { label: 'Burn on read', value: 0, isBurn: true },
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
    // Initial connection notice
    const initialNotice: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'System',
      text: `End-to-end encrypted. Disappears after ${isBurnOnRead ? 'reading' : `${currentTimer}s`}.`,
      createdAt: Date.now(),
      timerSeconds: 15,
      expiresAt: Date.now() + 15000,
      isBurnOnRead: false,
      status: 'delivered',
    };
    setMessages([initialNotice]);

    const unsubscribe = NetworkService.subscribeToRoom(
      room.id,
      (incoming) => {
        sound.playReceive();
        setMessages((prev) => [...prev, incoming]);
      },
      (typingHandle) => {
        if (typingHandle !== currentUser.handle) {
          setPeerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2000);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [room.id]);

  // Master countdown timer for message self-destruction
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setMessages((prev) => {
        let hasExpired = false;
        const next = prev.filter((msg) => {
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
      {/* Header (Clean Telegram Style) */}
      <header className="px-3 py-2.5 bg-[#0a0a0c] border-b border-[#1c1c1f] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-2">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white active:scale-90 transition-all mr-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <Avatar avatarId={room.peerAvatarId || 3} size="sm" />

          <div>
            <div className="flex items-center space-x-1.5">
              <h2 className="font-semibold text-sm text-zinc-100">
                {room.peerHandle ? `@${room.peerHandle}` : `Room ${room.code}`}
              </h2>
            </div>
            <p className="text-[11px] text-emerald-400 flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 inline-block" />
              encrypted session
            </p>
          </div>
        </div>

        {/* Right Header: Timer Selector & Purge */}
        <div className="flex items-center space-x-1.5">
          {/* Timer Selector Pill */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="px-2.5 py-1.5 rounded-full bg-[#18181b] border border-white/10 text-xs text-zinc-300 flex items-center space-x-1 active:scale-95 transition-all"
            >
              {isBurnOnRead ? (
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <Timer className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="text-[11px] font-medium font-mono">
                {isBurnOnRead ? 'Burn' : `${currentTimer}s`}
              </span>
            </button>

            {/* iOS Style Action Sheet for Timer */}
            {showTimerMenu && (
              <div className="absolute right-0 top-10 w-44 rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-1 z-50 animate-fade-in">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => {
                      sound.vibrate(8);
                      setCurrentTimer(opt.value);
                      setIsBurnOnRead(opt.isBurn);
                      setShowTimerMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-[#27272a] flex items-center justify-between text-zinc-200 transition-colors"
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

          {/* Clean Delete / Purge Button */}
          <button
            onClick={() => {
              sound.playPanic();
              onLeaveRoom();
            }}
            className="p-2 rounded-full text-zinc-400 hover:text-red-400 active:scale-95 transition-all"
            title="End Chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full bg-[#141416] text-[11px] text-zinc-400 border border-white/5 text-center max-w-xs">
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
              {/* Clean Message Bubble */}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 transition-all ${
                  isMe
                    ? 'bg-[#1e3a2b] text-white rounded-br-sm'
                    : 'bg-[#1c1c1e] text-zinc-100 rounded-bl-sm'
                }`}
              >
                {/* Content or Burn On Read Shield */}
                {msg.isBurnOnRead && !msg.isRevealed && !isMe ? (
                  <button
                    onClick={() => handleRevealBurnOnRead(msg.id)}
                    className="flex items-center space-x-2 py-1 px-2 rounded-xl bg-black/30 text-amber-300 text-xs font-medium active:scale-95 transition-transform"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Tap to view (Burns in 6s)</span>
                  </button>
                ) : (
                  <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">
                    {msg.text}
                  </p>
                )}

                {/* Minimal Footer: Time Left & Checkmarks */}
                <div
                  className={`flex items-center justify-end space-x-1.5 mt-1 text-[10px] ${
                    isMe ? 'text-emerald-200/70' : 'text-zinc-500'
                  }`}
                >
                  {/* Subtle Expiry Counter */}
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

                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-400" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {peerTyping && (
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar (Clean iOS / Telegram style) */}
      <div className="p-2.5 bg-[#0a0a0c] border-t border-[#1c1c1f] pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          <input
            type="text"
            value={inputText}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message"
            className="flex-1 bg-[#18181b] border border-white/5 focus:border-zinc-700 rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-500 outline-none transition-all"
          />

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-9 h-9 rounded-full bg-emerald-500 text-black flex items-center justify-center disabled:opacity-30 disabled:scale-100 active:scale-90 transition-all shrink-0"
          >
            <Send className="w-4 h-4 fill-current -ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
