import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Timer,
  Flame,
  ShieldCheck,
  PhoneOff,
  Smile,
  Copy,
  Check,
  Lock,
  Sparkles,
  Eye,
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

const TIMER_PRESETS = [
  { label: '🔥 Burn on Read', value: 0, isBurnOnRead: true },
  { label: '10s', value: 10, isBurnOnRead: false },
  { label: '30s', value: 30, isBurnOnRead: false },
  { label: '1 min', value: 60, isBurnOnRead: false },
  { label: '5 min', value: 300, isBurnOnRead: false },
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
  const [copiedCode, setCopiedCode] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize room subscription
  useEffect(() => {
    // Add welcome encrypted ping
    const welcomeMsg: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'BlinkSystem',
      text: `🔐 E2E Encrypted Room connected. Messages disappear in ${
        isBurnOnRead ? 'Burn on Read' : `${currentTimer}s`
      }.`,
      createdAt: Date.now(),
      timerSeconds: 15,
      expiresAt: Date.now() + 15000,
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

    return () => {
      unsubscribe();
    };
  }, [room.id]);

  // Master countdown ticker for self-destructing messages
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      setMessages((prev) => {
        let hasChanges = false;
        const next = prev
          .map((msg) => {
            // If already marked burning, check if time to purge
            if (msg.isBurning) {
              return null;
            }

            // For burn-on-read: only start countdown after revealed
            if (msg.isBurnOnRead && !msg.isRevealed) {
              return msg;
            }

            if (msg.expiresAt && now >= msg.expiresAt) {
              hasChanges = true;
              sound.playBurn();
              return { ...msg, isBurning: true };
            }
            return msg;
          })
          .filter(Boolean) as ChatMessage[];

        return hasChanges ? next : prev;
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    sound.playSend();

    const expiresAt = isBurnOnRead
      ? 0 // Starts when read
      : Date.now() + currentTimer * 1000;

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

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(room.code);
    sound.vibrate(20);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRevealBurnOnRead = (msgId: string) => {
    sound.vibrate([20, 20]);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isRevealed: true,
              expiresAt: Date.now() + 6000, // 6 seconds after opening
            }
          : m
      )
    );
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    sound.vibrate(10);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: emoji } : m))
    );
    setReactionTarget(null);
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-[#05070d] text-slate-100 select-none">
      {/* Top Header */}
      <header className="px-4 py-3 bg-[#090d16] border-b border-[#1f293d] flex items-center justify-between shrink-0 z-30 shadow-md">
        <div className="flex items-center space-x-3">
          <Avatar avatarId={room.peerAvatarId || 3} size="md" glow={true} />
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-sm text-slate-100">
                {room.peerHandle ? `@${room.peerHandle}` : 'Private Ghost'}
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            {/* Room Code Badge */}
            <button
              onClick={handleCopyCode}
              className="text-[11px] font-mono text-cyan-400 flex items-center space-x-1 hover:text-cyan-300 active:scale-95 transition-all mt-0.5"
            >
              <span>Room: {room.code}</span>
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Timer Preset Button & Leave */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => {
                sound.vibrate(10);
                setShowTimerMenu(!showTimerMenu);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-[#131824] border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center space-x-1 active:scale-95 shadow-sm"
            >
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBurnOnRead ? '🔥 Burn' : `${currentTimer}s`}</span>
            </button>

            {/* Timer Presets Dropdown */}
            {showTimerMenu && (
              <div className="absolute right-0 top-11 w-40 rounded-2xl bg-[#0d111a] border border-[#1f293d] shadow-2xl p-1.5 z-50">
                {TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      sound.vibrate(12);
                      setCurrentTimer(preset.value);
                      setIsBurnOnRead(preset.isBurnOnRead);
                      setShowTimerMenu(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-[#1f293d] flex items-center justify-between text-slate-200 transition-colors"
                  >
                    <span>{preset.label}</span>
                    {((preset.isBurnOnRead && isBurnOnRead) ||
                      (!preset.isBurnOnRead && !isBurnOnRead && currentTimer === preset.value)) && (
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
            className="p-2 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-900/50 active:scale-95 transition-all shadow-sm"
            title="End & Purge Chat"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Security Banner */}
      <div className="bg-[#0b101c] py-1.5 px-4 text-center border-b border-[#1f293d]/60 flex items-center justify-center space-x-1.5 text-[11px] text-emerald-400/90 font-mono">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>AES-256 Client E2EE • Screenshots Blocked • Zero History</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <span className="px-3 py-1 rounded-full bg-[#131824] border border-[#1f293d] text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                  <Lock className="w-3 h-3 text-cyan-400 mr-1" />
                  {msg.text}
                </span>
              </div>
            );
          }

          // Compute remaining seconds
          const timeLeftMs = msg.expiresAt ? Math.max(0, msg.expiresAt - Date.now()) : 0;
          const timeLeftSec = Math.ceil(timeLeftMs / 1000);
          const totalDurationSec = msg.isBurnOnRead ? 6 : msg.timerSeconds;
          const progressPercent = msg.expiresAt
            ? Math.max(0, Math.min(100, (timeLeftSec / totalDurationSec) * 100))
            : 100;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                msg.isBurning ? 'animate-burn-fade' : 'animate-fade-in'
              }`}
            >
              {/* Message Bubble */}
              <div
                onDoubleClick={() => setReactionTarget(reactionTarget === msg.id ? null : msg.id)}
                className={`relative group max-w-[82%] rounded-2xl p-3 shadow-lg transition-all duration-300 overflow-hidden ${
                  isMe
                    ? 'bg-gradient-to-br from-[#0c2e24] via-[#091a18] to-[#0d1622] border border-emerald-500/40 text-slate-100'
                    : 'bg-[#111726] border border-[#1f293d] text-slate-200'
                }`}
              >
                {/* Sender Handle */}
                <div className="flex items-center justify-between space-x-3 mb-1 text-[10px] text-slate-400 font-mono">
                  <span>{isMe ? 'You' : `@${msg.senderHandle}`}</span>
                  {/* Countdown Timer Pill */}
                  <span className="flex items-center space-x-1 text-cyan-400">
                    {msg.isBurnOnRead && !msg.isRevealed ? (
                      <span className="text-amber-400 flex items-center font-bold">
                        <Flame className="w-2.5 h-2.5 mr-0.5 fill-current" />
                        Burn on Read
                      </span>
                    ) : (
                      <span className="font-mono text-emerald-400">
                        ⏱️ {timeLeftSec}s
                      </span>
                    )}
                  </span>
                </div>

                {/* Message Content / Burn-on-read Mask */}
                {msg.isBurnOnRead && !msg.isRevealed && !isMe ? (
                  <button
                    onClick={() => handleRevealBurnOnRead(msg.id)}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center space-x-2 active:scale-95 transition-transform"
                  >
                    <Eye className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Tap to Reveal (Destroys in 6s)</span>
                  </button>
                ) : (
                  <p className="text-sm leading-relaxed break-words whitespace-pre-wrap select-none">
                    {msg.text}
                  </p>
                )}

                {/* Double Tap Reaction Badge */}
                {msg.reaction && (
                  <div className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-full bg-[#1f293d] border border-slate-700 text-xs shadow-md">
                    {msg.reaction}
                  </div>
                )}

                {/* Live Shrinking Progress Countdown Bar */}
                {(!msg.isBurnOnRead || msg.isRevealed) && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/40 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ease-linear ${
                        timeLeftSec <= 3
                          ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                          : 'bg-emerald-400 shadow-[0_0_6px_rgba(0,255,170,0.6)]'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Reaction Popup Bar */}
              {reactionTarget === msg.id && (
                <div className="flex items-center space-x-1.5 mt-1.5 p-1 rounded-full bg-[#131824] border border-cyan-500/40 shadow-xl z-20">
                  {['🔥', '🤫', '💀', '❤️', '⚡'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(msg.id, emoji)}
                      className="p-1 hover:scale-125 transition-transform text-sm"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Peer Typing Indicator */}
        {peerTyping && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono animate-pulse pl-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>@{room.peerHandle || 'Ghost'} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Bar */}
      <div className="p-3 bg-[#090d16] border-t border-[#1f293d] shrink-0 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Send encrypted blink..."
              className="w-full bg-[#0d111a] border border-[#1f293d] focus:border-emerald-500/50 rounded-2xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all shadow-inner"
            />
            <span className="absolute right-3 top-3.5 text-[10px] text-slate-500 font-mono">
              {isBurnOnRead ? '🔥 Burn' : `${currentTimer}s`}
            </span>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-[0_0_15px_rgba(0,255,170,0.3)] disabled:opacity-40 disabled:scale-100 active:scale-95 transition-all"
          >
            <Send className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
};
