import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Phone,
  Video,
  Info,
  Camera,
  Mic,
  Image,
  Heart,
  Timer,
  Flame,
  CheckCheck,
  Eye,
  Trash2,
  Sparkles,
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
  { label: 'Off (Standard)', value: 0, isBurn: false },
  { label: '🔥 Vanish on Read', value: 0, isBurn: true },
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
  const [vanishMode, setVanishMode] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial Vanish notice
    const welcomeMsg: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'System',
      text: 'Vanish mode is on. Messages disappear after being read.',
      createdAt: Date.now(),
      timerSeconds: 0,
      expiresAt: 0,
      isBurnOnRead: false,
      status: 'delivered',
    };
    setMessages([welcomeMsg]);

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

    return () => unsubscribe();
  }, [room.id]);

  // Vanish message destruction timer
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

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    sound.playSend();

    const expiresAt = isBurnOnRead ? 0 : Date.now() + (currentTimer || 30) * 1000;

    const newMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      roomId: room.id,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      text,
      createdAt: Date.now(),
      timerSeconds: currentTimer || 30,
      expiresAt,
      isBurnOnRead,
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    NetworkService.broadcastMessage(room.id, newMsg);
  };

  const handleDoubleTapLike = (msgId: string) => {
    sound.vibrate([10, 15]);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId ? { ...m, reaction: m.reaction === '❤️' ? undefined : '❤️' } : m
      )
    );
  };

  const handleRevealBurnOnRead = (msgId: string) => {
    sound.vibrate(12);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isRevealed: true,
              expiresAt: Date.now() + 6000,
            }
          : m
      )
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white select-none">
      {/* Instagram DM Header */}
      <header className="px-3 py-2.5 bg-black border-b border-[#262626] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-2">
          <button
            onClick={onLeaveRoom}
            className="p-1 -ml-1 text-white hover:text-zinc-400 active:scale-90 transition-all"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>

          <Avatar
            avatarId={room.peerAvatarId || 3}
            size="sm"
            isOnline={true}
          />

          <div className="min-w-0 pr-2">
            <h2 className="font-semibold text-sm text-white truncate leading-tight">
              {room.peerHandle ? `@${room.peerHandle}` : `Secret Room`}
            </h2>
            <p className="text-[11px] text-zinc-400 leading-tight">
              Active now
            </p>
          </div>
        </div>

        {/* Right Icons: Timer, Call, Video, Info */}
        <div className="flex items-center space-x-3 text-white">
          <button
            onClick={() => setShowTimerMenu(!showTimerMenu)}
            className="p-1 text-zinc-300 hover:text-white relative active:scale-95"
            title="Vanish Timer"
          >
            <Timer className="w-5 h-5 text-amber-400" />
            <span className="absolute -top-1 -right-1 text-[9px] font-mono text-amber-400 font-bold">
              {isBurnOnRead ? '🔥' : `${currentTimer}s`}
            </span>
          </button>

          <button className="p-1 text-white hover:text-zinc-400 active:scale-95">
            <Phone className="w-5 h-5" />
          </button>

          <button className="p-1 text-white hover:text-zinc-400 active:scale-95">
            <Video className="w-5 h-5" />
          </button>

          <button
            onClick={() => {
              sound.playPanic();
              onLeaveRoom();
            }}
            className="p-1 text-red-400 hover:text-red-300 active:scale-95"
            title="End Chat & Nuke"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

        {/* Timer Dropdown Menu */}
        {showTimerMenu && (
          <div className="absolute right-3 top-14 w-48 rounded-2xl bg-[#262626] border border-white/10 shadow-2xl p-1.5 z-50 animate-fade-in">
            <p className="text-[10px] uppercase font-bold text-zinc-400 px-3 py-1.5">
              Disappearing Messages
            </p>
            {TIMER_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  sound.vibrate(8);
                  setCurrentTimer(opt.value);
                  setIsBurnOnRead(opt.isBurn);
                  setShowTimerMenu(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-[#333333] flex items-center justify-between text-zinc-200 transition-colors"
              >
                <span>{opt.label}</span>
                {((opt.isBurn && isBurnOnRead) ||
                  (!opt.isBurn && !isBurnOnRead && currentTimer === opt.value)) && (
                  <span className="w-2 h-2 rounded-full bg-[#3797f0]" />
                )}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Instagram Vanish Mode Banner */}
      {vanishMode && (
        <div className="bg-[#121212] py-2 px-4 text-center border-b border-[#262626] flex items-center justify-center space-x-2 text-xs text-zinc-400">
          <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
          <span>Vanish mode is active • Seen messages disappear</span>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="px-3.5 py-1.5 rounded-full bg-[#262626]/80 text-[11px] text-zinc-400 text-center max-w-xs">
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
              {/* Instagram Style Bubble */}
              <div
                onDoubleClick={() => handleDoubleTapLike(msg.id)}
                className={`relative max-w-[76%] rounded-[20px] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm cursor-pointer select-none ${
                  isMe
                    ? 'bg-gradient-to-r from-[#833ab4] via-[#c13584] to-[#e1306c] text-white rounded-br-[4px]'
                    : 'bg-[#262626] text-white rounded-bl-[4px]'
                }`}
              >
                {/* Burn On Read Shield */}
                {msg.isBurnOnRead && !msg.isRevealed && !isMe ? (
                  <button
                    onClick={() => handleRevealBurnOnRead(msg.id)}
                    className="flex items-center space-x-2 py-1 px-2 rounded-xl bg-black/40 text-amber-300 text-xs font-medium active:scale-95 transition-transform"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Tap to view (Burns in 6s)</span>
                  </button>
                ) : (
                  <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                )}

                {/* Instagram Double-Tap Heart Reaction */}
                {msg.reaction && (
                  <div className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-full bg-[#262626] border border-black text-xs shadow-md">
                    {msg.reaction}
                  </div>
                )}
              </div>

              {/* Timestamp & Expiry Subtitle */}
              <div
                className={`flex items-center space-x-1 mt-1 text-[10px] text-zinc-500 px-1 ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {(!msg.isBurnOnRead || msg.isRevealed) && (
                  <span className="font-mono">⏱ {timeLeftSec}s</span>
                )}
                {isMe && <CheckCheck className="w-3 h-3 text-[#3797f0]" />}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {peerTyping && (
          <div className="flex items-center space-x-2 text-xs text-zinc-500 pl-2">
            <div className="flex space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Instagram DM Input Bar */}
      <div className="p-3 bg-black border-t border-[#262626] pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          {/* Blue Camera Icon Button */}
          <button className="w-9 h-9 rounded-full bg-[#3797f0] flex items-center justify-center text-white active:scale-95 transition-transform shrink-0">
            <Camera className="w-5 h-5 fill-current" />
          </button>

          {/* Pill Input */}
          <div className="flex-1 flex items-center bg-[#262626] rounded-full px-4 py-2 border border-transparent focus-within:border-zinc-700">
            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                NetworkService.broadcastTyping(room.id, currentUser.handle);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Message..."
              className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
            />

            {/* Input Action Icons */}
            {!inputText.trim() ? (
              <div className="flex items-center space-x-2.5 text-zinc-400 ml-2">
                <button className="hover:text-white active:scale-90">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="hover:text-white active:scale-90">
                  <Image className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleSendMessage('❤️')}
                  className="hover:text-red-500 active:scale-90"
                >
                  <Heart className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleSendMessage()}
                className="text-sm font-bold text-[#3797f0] hover:text-sky-400 active:scale-95 ml-2"
              >
                Send
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
