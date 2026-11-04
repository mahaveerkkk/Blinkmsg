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
  Camera,
  Smile,
  AlertTriangle,
} from 'lucide-react';
import { ChatMessage, ChatRoom, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { NetworkService } from '../services/network';

interface ChatViewProps {
  room: ChatRoom;
  currentUser: UserProfile;
  onLeaveRoom: () => void;
  onPeerConnected?: (peerHandle: string, peerAvatarId: number) => void;
}

const TIMER_OPTIONS = [
  { label: '🔥 Burn on Read', value: 0, isBurn: true },
  { label: '10 seconds', value: 10, isBurn: false },
  { label: '30 seconds', value: 30, isBurn: false },
  { label: '1 minute', value: 60, isBurn: false },
  { label: '5 minutes', value: 300, isBurn: false },
];

const EMOJI_REACTIONS = ['❤️', '🔥', '😂', '🤫', '⚡'];

export const ChatView: React.FC<ChatViewProps> = ({
  room,
  currentUser,
  onLeaveRoom,
  onPeerConnected,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [currentTimer, setCurrentTimer] = useState(room.timerSeconds || 30);
  const [isBurnOnRead, setIsBurnOnRead] = useState(room.isBurnOnRead || false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerHandle, setPeerHandle] = useState(room.peerHandle || '');
  const [peerAvatarId, setPeerAvatarId] = useState(room.peerAvatarId || 3);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [screenshotToast, setScreenshotToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Broadcast our join presence so peer receives our @handle & avatar
    NetworkService.broadcastPeerJoin(room.id, currentUser.handle, currentUser.avatarId);

    // Load existing active messages from Supabase
    NetworkService.fetchRoomMessages(room.id).then((savedMsgs) => {
      if (savedMsgs && savedMsgs.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          savedMsgs.forEach((m) => {
            if (!map.has(m.id)) map.set(m.id, m);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubscribe = NetworkService.subscribeToRoom(room.id, {
      onMessage: (incoming: any) => {
        if (!incoming || !incoming.id) return;

        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          sound.playReceive();
          return [...prev, incoming];
        });

        // Send delivery ack back to sender
        NetworkService.broadcastDeliveryAck(room.id, incoming.id, 'delivered');

        // Resolve peer handle if generic
        if (incoming.senderHandle && incoming.senderHandle !== currentUser.handle) {
          setPeerHandle(incoming.senderHandle);
          if (onPeerConnected) {
            onPeerConnected(incoming.senderHandle, peerAvatarId);
          }
        }
      },
      onTyping: (typingHandle: string) => {
        if (typingHandle !== currentUser.handle) {
          setPeerTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 2000);
        }
      },
      onReaction: (data) => {
        if (!data || !data.msgId) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === data.msgId ? { ...m, reaction: data.reaction } : m))
        );
      },
      onBurnReveal: (data) => {
        if (!data || !data.msgId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.msgId ? { ...m, isRevealed: true, expiresAt: data.expiresAt } : m
          )
        );
      },
      onTimerChange: (data) => {
        setCurrentTimer(data.timerSeconds);
        setIsBurnOnRead(data.isBurnOnRead);
        sound.playReceive();

        const noticeText = data.isBurnOnRead
          ? `@${data.setByHandle} enabled Burn-on-read for this room.`
          : `@${data.setByHandle} set message timer to ${data.timerSeconds}s.`;

        const notice: ChatMessage = {
          id: 'sys_' + Date.now(),
          roomId: room.id,
          senderId: 'system',
          senderHandle: 'System',
          text: noticeText,
          createdAt: Date.now(),
          timerSeconds: 15,
          expiresAt: Date.now() + 15000,
          isBurnOnRead: false,
          status: 'delivered',
        };
        setMessages((prev) => [...prev, notice]);
      },
      onPeerJoin: (peer) => {
        if (peer.handle && peer.handle !== currentUser.handle) {
          setPeerHandle(peer.handle);
          setPeerAvatarId(peer.avatarId || 3);
          sound.playReceive();

          const notice: ChatMessage = {
            id: 'sys_' + Date.now(),
            roomId: room.id,
            senderId: 'system',
            senderHandle: 'System',
            text: `@${peer.handle} connected to the room.`,
            createdAt: Date.now(),
            timerSeconds: 15,
            expiresAt: Date.now() + 15000,
            isBurnOnRead: false,
            status: 'delivered',
          };
          setMessages((prev) => [...prev, notice]);

          if (onPeerConnected) {
            onPeerConnected(peer.handle, peer.avatarId || 3);
          }
        }
      },
      onDeliveryAck: (data) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === data.msgId ? { ...m, status: data.status } : m))
        );
      },
      onScreenshotAlert: (data) => {
        if (data.handle !== currentUser.handle) {
          sound.playPanic();
          setScreenshotToast(`⚠️ @${data.handle} attempted screenshot or switched window!`);
          setTimeout(() => setScreenshotToast(null), 4000);
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

  // Web screenshot / tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        NetworkService.broadcastScreenshotAlert(room.id, currentUser.handle);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && e.key === 'S')) {
        setScreenshotToast('⚠️ Screenshot attempt recorded');
        setTimeout(() => setScreenshotToast(null), 3000);
        NetworkService.broadcastScreenshotAlert(room.id, currentUser.handle);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keyup', handleKey);
    };
  }, [room.id, currentUser.handle]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, peerTyping]);

  const handleSendMessage = (customText?: string, mediaUrl?: string) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !mediaUrl) return;

    sound.playSend();

    const expiresAt = isBurnOnRead ? 0 : Date.now() + currentTimer * 1000;

    const newMsg: ChatMessage = {
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      roomId: room.id,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      text: textToSend || (mediaUrl ? '📸 Photo' : ''),
      mediaUrl,
      createdAt: Date.now(),
      timerSeconds: currentTimer,
      expiresAt,
      isBurnOnRead,
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    NetworkService.broadcastMessage(room.id, newMsg, room.code);
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    NetworkService.broadcastTyping(room.id, currentUser.handle);
  };

  const handleSetTimer = (seconds: number, isBurn: boolean) => {
    setCurrentTimer(seconds);
    setIsBurnOnRead(isBurn);
    setShowTimerMenu(false);
    sound.vibrate(8);

    NetworkService.broadcastTimerChange(room.id, seconds, isBurn, currentUser.handle);

    const notice: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'System',
      text: isBurn
        ? 'You enabled Burn-on-read for this room.'
        : `You set message timer to ${seconds}s.`,
      createdAt: Date.now(),
      timerSeconds: 15,
      expiresAt: Date.now() + 15000,
      isBurnOnRead: false,
      status: 'delivered',
    };
    setMessages((prev) => [...prev, notice]);
  };

  const handleRevealBurnOnRead = (msgId: string) => {
    sound.vibrate(15);
    const expiresAt = Date.now() + 6000;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              isRevealed: true,
              expiresAt,
            }
          : m
      )
    );
    NetworkService.broadcastBurnReveal(room.id, msgId, expiresAt);
    NetworkService.broadcastDeliveryAck(room.id, msgId, 'read');
  };

  const handleSelectReaction = (msgId: string, emoji: string) => {
    sound.vibrate(6);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, reaction: emoji } : m))
    );
    setActiveReactionMsgId(null);
    NetworkService.broadcastReaction(room.id, msgId, emoji);
  };

  // Ephemeral Photo Compression & Upload
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_DIM) {
          height = (height * MAX_DIM) / width;
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = (width * MAX_DIM) / height;
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        handleSendMessage('', compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white select-none">
      {/* Top Header (Signal / Telegram Style) */}
      <header className="px-3 py-2.5 bg-black/95 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center space-x-2 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white active:scale-90 transition-all rounded-full shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <Avatar
            avatarId={peerAvatarId}
            size="sm"
            name={peerHandle || room.code}
            isOnline={true}
          />

          <div className="min-w-0 pr-2">
            <div className="flex items-center space-x-1.5">
              <h2 className="font-semibold text-[15px] text-white truncate leading-tight">
                {peerHandle && peerHandle !== 'Waiting for friend...'
                  ? `@${peerHandle}`
                  : `Room #${room.code}`}
              </h2>
              <Lock className="w-3 h-3 text-[#D4FF00] shrink-0" />
            </div>
            <p className="text-[11px] text-[#D4FF00] font-mono leading-tight">
              E2E Encrypted • {isBurnOnRead ? 'Burn on read' : `${currentTimer}s`}
            </p>
          </div>
        </div>

        {/* Right Actions: Timer Pill & Delete */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-xs text-zinc-200 flex items-center space-x-1.5 active:scale-95 transition-all shadow-sm"
              title="Disappearing Timer"
            >
              {isBurnOnRead ? (
                <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ) : (
                <Timer className="w-3.5 h-3.5 text-[#D4FF00]" />
              )}
              <span className="font-bold text-[11px] font-mono">
                {isBurnOnRead ? 'Burn' : `${currentTimer}s`}
              </span>
            </button>

            {/* Timer Dropdown */}
            {showTimerMenu && (
              <div className="absolute right-0 top-11 w-44 rounded-2xl bg-[#18181c] border border-white/10 shadow-2xl p-1 z-50 animate-pop-in">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleSetTimer(opt.value, opt.isBurn)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/[0.08] flex items-center justify-between text-zinc-200 transition-colors"
                  >
                    <span>{opt.label}</span>
                    {((opt.isBurn && isBurnOnRead) ||
                      (!opt.isBurn && !isBurnOnRead && currentTimer === opt.value)) && (
                      <Check className="w-3.5 h-3.5 text-[#D4FF00]" />
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
            title="Leave & Purge"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Screenshot / Tab Warning Toast */}
      {screenshotToast && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center space-x-2 text-xs text-amber-300 animate-fade-in z-20">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{screenshotToast}</span>
        </div>
      )}

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <span className="px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.06] text-[11px] text-zinc-400 text-center max-w-xs flex items-center space-x-1.5 shadow-sm">
                  <ShieldCheck className="w-3 h-3 text-[#D4FF00] shrink-0" />
                  <span>{msg.text}</span>
                </span>
              </div>
            );
          }

          const timeLeftMs = msg.expiresAt ? Math.max(0, msg.expiresAt - Date.now()) : 0;
          const timeLeftSec = Math.ceil(timeLeftMs / 1000);

          return (
            <div
              key={msg.id}
              className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-opacity duration-300`}
            >
              <div
                onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                className={`relative max-w-[82%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed shadow-sm cursor-pointer ${
                  isMe
                    ? 'bg-[#152e22] text-white border border-[#D4FF00]/25 rounded-br-[4px]'
                    : 'bg-[#18181b] text-zinc-100 border border-white/[0.06] rounded-bl-[4px]'
                }`}
              >
                {/* Ephemeral Photo Bubble */}
                {msg.mediaUrl && (
                  <div className="mb-2 rounded-xl overflow-hidden max-w-[260px]">
                    {msg.isBurnOnRead && !msg.isRevealed && !isMe ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRevealBurnOnRead(msg.id);
                        }}
                        className="w-full h-36 bg-black/80 flex flex-col items-center justify-center p-4 border border-amber-500/20 rounded-xl text-center active:scale-95 transition-transform"
                      >
                        <Flame className="w-7 h-7 text-amber-400 mb-1.5 fill-amber-400 animate-pulse" />
                        <span className="text-xs font-bold text-amber-300">Tap to View Photo</span>
                        <span className="text-[10px] text-zinc-500 mt-0.5">Burns in 6 seconds</span>
                      </button>
                    ) : (
                      <img
                        src={msg.mediaUrl}
                        alt="Ephemeral"
                        className="w-full max-h-64 object-cover rounded-xl"
                      />
                    )}
                  </div>
                )}

                {/* Burn On Read Shield */}
                {msg.isBurnOnRead && !msg.isRevealed && !isMe && !msg.mediaUrl ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRevealBurnOnRead(msg.id);
                    }}
                    className="flex items-center space-x-2 py-1.5 px-3 rounded-xl bg-black/50 text-amber-300 text-xs font-semibold active:scale-95 transition-transform border border-amber-500/20"
                  >
                    <Eye className="w-4 h-4 text-amber-400" />
                    <span>Tap to view (Burns in 6s)</span>
                  </button>
                ) : (
                  msg.text && <p className="break-words whitespace-pre-wrap">{msg.text}</p>
                )}

                {/* Footer Time & Timer Status */}
                <div
                  className={`flex items-center justify-end space-x-1.5 mt-1.5 text-[10px] ${
                    isMe ? 'text-[#D4FF00]/70' : 'text-zinc-500'
                  }`}
                >
                  {(!msg.isBurnOnRead || msg.isRevealed) && msg.expiresAt > 0 && (
                    <span className="font-mono font-medium">
                      ⏱ {timeLeftSec}s
                    </span>
                  )}

                  {msg.isBurnOnRead && !msg.isRevealed && (
                    <span className="flex items-center text-amber-400 font-bold">
                      <Flame className="w-2.5 h-2.5 fill-current mr-0.5" />
                      burn
                    </span>
                  )}

                  {/* Read Receipts */}
                  {isMe && (
                    <span title={msg.status}>
                      {msg.status === 'sent' && (
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      {msg.status === 'delivered' && (
                        <CheckCheck className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      {msg.status === 'read' && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#D4FF00]" />
                      )}
                    </span>
                  )}
                </div>

                {/* Emoji Reaction Badge on Message Corner */}
                {msg.reaction && (
                  <div className="absolute -bottom-2 -right-1 px-1.5 py-0.5 rounded-full bg-[#1e2024] border border-white/10 text-xs shadow-md animate-pop-in">
                    {msg.reaction}
                  </div>
                )}
              </div>

              {/* Quick Emoji Reaction Bar (Shows on Tap) */}
              {activeReactionMsgId === msg.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`flex items-center space-x-1 mt-1 p-1 rounded-full bg-[#18181c] border border-white/10 shadow-xl z-10 animate-pop-in ${
                    isMe ? 'mr-1' : 'ml-1'
                  }`}
                >
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSelectReaction(msg.id, emoji)}
                      className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 active:scale-95 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {peerTyping && (
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            <span className="font-mono text-[11px]">@{peerHandle || 'friend'} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-3 bg-black/95 border-t border-white/[0.08] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          {/* Hidden File Input for Ephemeral Photos */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-zinc-400 hover:text-white active:scale-90 transition-all shrink-0"
            title="Send Ephemeral Photo"
          >
            <Camera className="w-5 h-5 text-zinc-300" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Message (burns automatically)"
            className="flex-1 bg-[#18181b] border border-white/[0.08] focus:border-[#D4FF00]/40 rounded-full px-4 py-3 text-[15px] text-white placeholder-zinc-500 outline-none transition-all shadow-inner"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim()}
            className="w-11 h-11 rounded-full bg-[#D4FF00] text-black flex items-center justify-center font-bold disabled:opacity-20 active:scale-95 transition-all shadow-md shrink-0"
          >
            <ArrowUp className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};
