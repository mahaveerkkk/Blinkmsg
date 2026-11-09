import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Timer,
  Flame,
  Check,
  CheckCheck,
  Eye,
  EyeOff,
  Trash2,
  Lock,
  ArrowUp,
  ShieldCheck,
  Camera,
  Mic,
  Square,
  Play,
  Pause,
  Fingerprint,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { ChatMessage, ChatRoom, UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { NetworkService } from '../services/network';

interface ChatViewProps {
  room: ChatRoom;
  currentUser: UserProfile;
  onLeaveRoom: () => void;
  onPeerConnected?: (peerHandle: string, peerDisplayName: string, peerAvatarId: number) => void;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  const [isStealthHoldMode, setIsStealthHoldMode] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [peerHandle, setPeerHandle] = useState(room.peerHandle || '');
  const [peerDisplayName, setPeerDisplayName] = useState(room.peerDisplayName || '');
  const [peerAvatarId, setPeerAvatarId] = useState(room.peerAvatarId || 3);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [screenshotToast, setScreenshotToast] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Hold-to-Reveal State
  const [holdingMsgId, setHoldingMsgId] = useState<string | null>(null);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initial encrypted notice
    const initialNotice: ChatMessage = {
      id: 'sys_' + Date.now(),
      roomId: room.id,
      senderId: 'system',
      senderHandle: 'System',
      text: `Messages are end-to-end encrypted and self-destruct after ${isBurnOnRead ? 'reading' : `${currentTimer}s`}.`,
      createdAt: Date.now(),
      timerSeconds: 15,
      expiresAt: Date.now() + 15000,
      isBurnOnRead: false,
      status: 'delivered',
    };
    setMessages([initialNotice]);

    // Broadcast our join presence so peer receives our name, handle & avatar
    NetworkService.broadcastPeerJoin(
      room.id,
      currentUser.handle,
      currentUser.displayName,
      currentUser.avatarId
    );

    // Load existing active messages from Supabase
    NetworkService.fetchRoomMessages(room.id).then((savedMsgs) => {
      if (savedMsgs && savedMsgs.length > 0) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>();
          prev.forEach((m) => map.set(m.id, m));
          savedMsgs.forEach((m) => {
            if (!map.has(m.id)) {
              // For receiver: countdown timer starts RIGHT NOW upon opening/reading the chat!
              if (m.senderHandle !== currentUser.handle) {
                if (m.timerSeconds > 0 && !m.isBurnOnRead && !m.isHoldToReveal) {
                  m.expiresAt = Date.now() + m.timerSeconds * 1000;
                  m.isRead = true;
                }
              }
              map.set(m.id, m);
            }
          });
          return Array.from(map.values());
        });

        // Send delivery or read ack back to sender for fetched messages
        savedMsgs.forEach((msg) => {
          if (msg.senderHandle !== currentUser.handle && msg.senderId !== currentUser.id) {
            const ackStatus = msg.isBurnOnRead && !msg.isRevealed ? 'delivered' : 'read';
            NetworkService.broadcastDeliveryAck(room.id, msg.id, ackStatus);
          }
        });
      }
    });

    const unsubscribe = NetworkService.subscribeToRoom(room.id, {
      onMessage: (incoming: any) => {
        if (!incoming || !incoming.id) return;

        // For receiver: if actively inside ChatView, timer starts as soon as displayed on screen!
        if (incoming.senderHandle !== currentUser.handle) {
          if (incoming.timerSeconds > 0 && !incoming.isBurnOnRead && !incoming.isHoldToReveal) {
            incoming.expiresAt = Date.now() + incoming.timerSeconds * 1000;
            incoming.isRead = true;
          }
        }

        setMessages((prev) => {
          if (prev.some((m) => m.id === incoming.id)) return prev;
          sound.playReceive();
          return [...prev, incoming];
        });

        const ackStatus = (incoming.isBurnOnRead || incoming.isHoldToReveal) && !incoming.isRevealed ? 'delivered' : 'read';
        NetworkService.broadcastDeliveryAck(room.id, incoming.id, ackStatus);

        // Resolve peer handle and displayName
        if (incoming.senderHandle && incoming.senderHandle !== currentUser.handle) {
          setPeerHandle(incoming.senderHandle);
          if (incoming.senderDisplayName) {
            setPeerDisplayName(incoming.senderDisplayName);
          }
          if (onPeerConnected) {
            onPeerConnected(
              incoming.senderHandle,
              incoming.senderDisplayName || incoming.senderHandle,
              peerAvatarId
            );
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

        const setterName = (data.setByHandle === currentUser.handle)
          ? 'You'
          : (peerDisplayName || data.setByHandle.replace(/^@/, ''));

        const noticeText = data.isBurnOnRead
          ? `${setterName} enabled Burn-on-read for this room.`
          : `${setterName} set message timer to ${data.timerSeconds}s.`;

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
          if (peer.displayName) setPeerDisplayName(peer.displayName);
          if (peer.avatarId) setPeerAvatarId(peer.avatarId);
          sound.playReceive();

          const cleanPeerName = peer.displayName || peer.handle;
          const notice: ChatMessage = {
            id: 'sys_' + Date.now(),
            roomId: room.id,
            senderId: 'system',
            senderHandle: 'System',
            text: `${cleanPeerName} connected to the chat.`,
            createdAt: Date.now(),
            timerSeconds: 15,
            expiresAt: Date.now() + 15000,
            isBurnOnRead: false,
            status: 'delivered',
          };
          setMessages((prev) => [...prev, notice]);

          if (onPeerConnected) {
            onPeerConnected(peer.handle, cleanPeerName, peer.avatarId || 3);
          }
        }
      },
      onDeliveryAck: (data) => {
        if (!data || !data.msgId) return;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === data.msgId) {
              if (m.status === 'read' && data.status === 'delivered') return m;
              return { ...m, status: data.status };
            }
            return m;
          })
        );
      },
      onScreenshotAlert: (data) => {
        if (data.handle !== currentUser.handle) {
          sound.playPanic();
          const cleanName = peerDisplayName || data.handle.replace(/^@/, '');
          setScreenshotToast(`⚠️ ${cleanName} took screenshot or recorded screen!`);
          setTimeout(() => setScreenshotToast(null), 4000);
        }
      },
    });

    return () => unsubscribe();
  }, [room.id]);

  // Master live countdown timer with CINEMATIC DISINTEGRATION
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setNowTime(now);

      setMessages((prev) => {
        let hasChanges = false;
        const next = prev.map((msg) => {
          if (msg.senderId === 'system') return msg;
          if ((msg.isBurnOnRead || msg.isHoldToReveal) && !msg.isRevealed) return msg;

          // Check if message reached expiration
          if (msg.expiresAt && now >= msg.expiresAt) {
            if (!msg.isBurning) {
              sound.playBurn();
              hasChanges = true;
              return { ...msg, isBurning: true };
            }
          }
          return msg;
        });

        return hasChanges ? next : prev;
      });

      // Filter out messages that finished burning animation (after 450ms)
      setMessages((prev) => {
        const stillAlive = prev.filter((msg) => {
          if (msg.isBurning && msg.expiresAt && now >= msg.expiresAt + 450) {
            return false;
          }
          return true;
        });
        return stillAlive.length !== prev.length ? stillAlive : prev;
      });
    }, 250);

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

  const handleSendMessage = (customText?: string, mediaUrl?: string, audioUrl?: string, audioDuration?: number) => {
    const textToSend = (customText !== undefined ? customText : inputText).trim();
    if (!textToSend && !mediaUrl && !audioUrl) return;

    sound.playSend();

    const expiresAt = isBurnOnRead || isStealthHoldMode ? 0 : Date.now() + currentTimer * 1000;

    const newMsg: ChatMessage = {
      id: generateUUID(),
      roomId: room.id,
      senderId: currentUser.id,
      senderHandle: currentUser.handle,
      senderDisplayName: currentUser.displayName,
      text: textToSend || (mediaUrl ? '📸 Photo' : (audioUrl ? '🎙️ Voice Note' : '')),
      mediaUrl,
      audioUrl,
      audioDuration,
      createdAt: Date.now(),
      timerSeconds: currentTimer,
      expiresAt,
      isBurnOnRead: isBurnOnRead || isStealthHoldMode,
      isHoldToReveal: isStealthHoldMode,
      status: 'sent',
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');
    NetworkService.broadcastMessage(room.id, newMsg, room.code, peerHandle || room.peerHandle);
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

  // Hold-to-Reveal Handlers
  const handleHoldStart = (msgId: string) => {
    sound.playHoldPulse();
    setHoldingMsgId(msgId);
  };

  const handleHoldEnd = (msg: ChatMessage) => {
    setHoldingMsgId(null);
    sound.playBurn();

    // Immediately trigger disintegration upon releasing finger
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              isRevealed: true,
              isBurning: true,
              expiresAt: Date.now() + 350,
            }
          : m
      )
    );
    NetworkService.broadcastBurnReveal(room.id, msg.id, Date.now() + 350);
  };

  // Voice Note Recording with MediaRecorder
  const handleStartVoiceRecord = async () => {
    try {
      sound.vibrate(15);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          handleSendMessage('', undefined, base64Audio, recordSeconds || 3);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      alert('Microphone access required for Voice Notes.');
    }
  };

  const handleStopVoiceRecord = (cancel = false) => {
    sound.vibrate(10);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (cancel) {
        audioChunksRef.current = [];
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
  };

  // Voice Note Play Once & Vaporize
  const handlePlayVoice = (msg: ChatMessage) => {
    if (!msg.audioUrl) return;
    sound.vibrate(8);

    if (playingAudioId === msg.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(msg.audioUrl);
    audioPlayerRef.current = audio;
    setPlayingAudioId(msg.id);

    audio.onended = () => {
      setPlayingAudioId(null);
      sound.playBurn();

      // Disintegrate after listening once!
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id
            ? { ...m, isBurning: true, expiresAt: Date.now() + 350 }
            : m
        )
      );
    };

    audio.play().catch(() => {});
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
    <div className="flex flex-col h-[100dvh] bg-[#000000] text-white select-none relative overflow-hidden font-sans">
      {/* Ambient background glow for visual depth */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#00F5A0]/[0.025] blur-[120px] pointer-events-none" />

      {/* Top Header (Luxury Signal / iOS Glass Style) */}
      <header className="px-3.5 py-2.5 bg-[#000000]/90 backdrop-blur-2xl border-b border-white/[0.08] flex items-center justify-between shrink-0 z-30 shadow-md safe-top">
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            onClick={onLeaveRoom}
            className="p-1.5 -ml-1 text-zinc-400 hover:text-white active:scale-90 transition-all rounded-full hover:bg-white/[0.06] shrink-0"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="relative shrink-0">
            <Avatar
              avatarId={peerAvatarId}
              size="sm"
              name={peerDisplayName || peerHandle || room.code}
              isOnline={true}
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#D4FF00] border-2 border-black absolute -bottom-0.5 -right-0.5" />
          </div>

          <div className="min-w-0 pr-1">
            <div className="flex items-center space-x-1.5">
              <h2 className="font-bold text-[15px] text-white truncate leading-tight tracking-tight">
                {peerDisplayName || (peerHandle && peerHandle !== 'Waiting for friend...'
                  ? peerHandle.replace(/^@/, '')
                  : `Room #${room.code}`)}
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-[#D4FF00]/10 text-[#D4FF00] text-[9px] font-mono font-bold border border-[#D4FF00]/30 shrink-0">
                E2EE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate leading-tight mt-0.5 font-medium">
              {isBurnOnRead ? '🔥 Burn on read' : `⏱️ Disappears in ${currentTimer}s`}
            </p>
          </div>
        </div>

        {/* Right Actions: Timer Pill */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              className="px-2.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs text-zinc-200 flex items-center space-x-1.5 active:scale-95 transition-all shadow-sm"
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
              <div className="absolute right-0 top-11 w-44 rounded-2xl bg-[#16181F] border border-white/10 shadow-2xl p-1 z-50 animate-pop-in">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => handleSetTimer(opt.value, opt.isBurn)}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs hover:bg-white/[0.08] flex items-center justify-between text-zinc-200 transition-colors"
                  >
                    <span className="font-medium">{opt.label}</span>
                    {((opt.isBurn && isBurnOnRead) ||
                      (!opt.isBurn && !isBurnOnRead && currentTimer === opt.value)) && (
                      <Check className="w-3.5 h-3.5 text-[#D4FF00]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Screenshot Warning Toast */}
      {screenshotToast && (
        <div className="absolute top-16 left-4 right-4 z-40 bg-red-950/90 border border-red-500/50 text-red-200 p-3 rounded-2xl text-xs font-mono text-center shadow-2xl animate-fade-in backdrop-blur-xl">
          {screenshotToast}
        </div>
      )}

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 relative">
        {messages.map((msg) => {
          const isMe = msg.senderHandle === currentUser.handle;

          if (msg.senderId === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-3">
                <span className="px-3.5 py-1.5 rounded-full bg-white/[0.04] backdrop-blur-md border border-white/[0.06] text-[11px] text-zinc-400 text-center max-w-xs flex items-center space-x-1.5 shadow-sm font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4FF00] shrink-0" />
                  <span>{msg.text}</span>
                </span>
              </div>
            );
          }

          const timeLeftMs = msg.expiresAt ? Math.max(0, msg.expiresAt - nowTime) : 0;
          const timeLeftSec = Math.ceil(timeLeftMs / 1000);
          const isHoldingThis = holdingMsgId === msg.id;

          return (
            <div
              key={msg.id}
              className={`relative flex flex-col ${isMe ? 'items-end' : 'items-start'} group transition-all duration-200 ${
                msg.isBurning ? 'animate-disintegrate' : ''
              }`}
            >
              {/* Message Capsule */}
              <div
                className={`relative max-w-[85%] px-3.5 py-2.5 text-[14.5px] leading-[1.42] shadow-md transition-all ${
                  isMe
                    ? 'bg-gradient-to-br from-[#0e4230] via-[#0b3325] to-[#08261c] text-white border border-[#25D366]/25 shadow-emerald-950/40 rounded-[20px] rounded-br-[4px]'
                    : 'bg-gradient-to-br from-[#1a1c24] to-[#121319] text-[#ececf1] border border-white/[0.08] shadow-black/50 rounded-[20px] rounded-bl-[4px]'
                }`}
              >
                {/* 1. HOLD TO REVEAL PRIVACY SHIELD (For secret photos & secret text) */}
                {(msg.isHoldToReveal || (msg.isBurnOnRead && !isMe)) && !msg.isRevealed ? (
                  <div
                    onMouseDown={() => handleHoldStart(msg.id)}
                    onMouseUp={() => handleHoldEnd(msg)}
                    onTouchStart={() => handleHoldStart(msg.id)}
                    onTouchEnd={() => handleHoldEnd(msg)}
                    className="relative p-4 rounded-2xl bg-black/70 border border-white/[0.12] flex flex-col items-center justify-center text-center cursor-pointer select-none active:scale-95 transition-transform overflow-hidden min-w-[210px]"
                  >
                    {isHoldingThis ? (
                      /* Revealed state while thumb is pressed down */
                      <div className="relative animate-fade-in w-full">
                        {msg.mediaUrl ? (
                          <img
                            src={msg.mediaUrl}
                            alt="Revealed"
                            className="w-full max-h-64 object-cover rounded-xl"
                          />
                        ) : (
                          <p className="text-sm font-medium text-white break-words py-2">{msg.text}</p>
                        )}
                        {/* Dynamic Anti-Recording Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                          <span className="font-mono text-xs text-white rotate-[-25deg] tracking-widest uppercase">
                            @{currentUser.handle} • CONFIDENTIAL
                          </span>
                        </div>
                        <span className="text-[10px] text-red-400 font-mono font-bold mt-2 block animate-pulse">
                          Release finger to disintegrate
                        </span>
                      </div>
                    ) : (
                      /* Frosted Privacy Shield */
                      <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center text-[#D4FF00] mb-2 animate-fingerprint">
                          <Fingerprint className="w-7 h-7" />
                        </div>
                        <span className="text-xs font-black tracking-wider text-white uppercase">
                          HOLD TO REVEAL
                        </span>
                        <span className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          Fingerprint privacy shield
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Ephemeral Photo Bubble */}
                    {msg.mediaUrl && (
                      <div className="mb-2 rounded-xl overflow-hidden max-w-[260px] shadow-inner relative">
                        <img
                          src={msg.mediaUrl}
                          alt="Ephemeral"
                          className="w-full max-h-64 object-cover rounded-xl"
                        />
                      </div>
                    )}

                    {/* Disappearing Voice Note Capsule ("Listen Once") */}
                    {msg.audioUrl && (
                      <div className="mb-2 p-2.5 rounded-2xl bg-black/40 border border-white/[0.08] flex items-center space-x-3 min-w-[200px]">
                        <button
                          onClick={() => handlePlayVoice(msg)}
                          className="w-9 h-9 rounded-full bg-[#D4FF00] text-black flex items-center justify-center active:scale-90 transition-transform shrink-0 shadow-md"
                        >
                          {playingAudioId === msg.id ? (
                            <Pause className="w-4 h-4 fill-black" />
                          ) : (
                            <Play className="w-4 h-4 fill-black ml-0.5" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1">
                            <span className="font-bold text-white flex items-center space-x-1">
                              <Volume2 className="w-3 h-3 text-[#D4FF00]" />
                              <span>Voice Note</span>
                            </span>
                            <span>{msg.audioDuration ? `${msg.audioDuration}s` : '0:03'}</span>
                          </div>

                          {/* Animated Voice Waveform */}
                          <div className="flex items-center space-x-1 h-3">
                            {[4, 10, 6, 14, 8, 12, 5, 11, 7, 13, 6, 9].map((height, idx) => (
                              <div
                                key={idx}
                                className={`w-1 rounded-full transition-all duration-200 ${
                                  playingAudioId === msg.id ? 'bg-[#D4FF00] animate-pulse' : 'bg-white/20'
                                }`}
                                style={{ height: `${height}px` }}
                              />
                            ))}
                          </div>

                          <span className="text-[9px] text-amber-400 font-mono mt-1 block font-bold">
                            🎧 Listen Once • Burns after playing
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Standard Text Bubble */}
                    {msg.text && !msg.audioUrl && (
                      <div className="break-words">
                        <span>{msg.text}</span>

                        {/* Inline timestamp & LIVE COUNTDOWN */}
                        <span className="inline-flex items-center space-x-1.5 float-right ml-2.5 mt-1 -mb-0.5 select-none text-[10.5px] font-mono text-zinc-400/80">
                          {msg.expiresAt > 0 && (
                            <span
                              className={`inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold select-none transition-colors ${
                                timeLeftSec <= 5
                                  ? 'bg-red-500/25 text-red-400 border border-red-500/40 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.35)]'
                                  : 'bg-black/30 text-[#D4FF00] border border-[#D4FF00]/30'
                              }`}
                            >
                              {timeLeftSec <= 5 ? (
                                <Flame className="w-2.5 h-2.5 fill-red-400 text-red-400 animate-bounce mr-0.5" />
                              ) : (
                                <span className="text-[9px] mr-0.5">⏱</span>
                              )}
                              <span>{timeLeftSec}s</span>
                            </span>
                          )}

                          {isMe && (
                            <span className="ml-1">
                              {msg.status === 'read' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-[#00F5A0] stroke-[2.5]" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-zinc-400 stroke-[2]" />
                              ) : (
                                <Check className="w-3.5 h-3.5 text-zinc-500 stroke-[2]" />
                              )}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}

        {peerTyping && (
          <div className="flex items-center space-x-1.5 text-xs text-zinc-400 pl-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF00] animate-pulse" />
            <span className="font-mono text-[11px] text-[#D4FF00]">
              {peerDisplayName || (peerHandle ? peerHandle.replace(/^@/, '') : 'Friend')} is typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-3 bg-[#07080B]/95 backdrop-blur-2xl border-t border-white/[0.08] pb-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20">
        <div className="flex items-center space-x-2 max-w-lg mx-auto">
          {/* Ephemeral Photo Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-[#11141D] hover:bg-[#181D2A] border border-white/[0.08] text-zinc-300 hover:text-white flex items-center justify-center active:scale-90 transition-all shrink-0 shadow-sm"
            title="Send Confidential Photo"
          >
            <Camera className="w-5 h-5 text-zinc-300" />
          </button>

          {/* Stealth Hold-to-Reveal Toggle */}
          <button
            onClick={() => {
              sound.vibrate(8);
              setIsStealthHoldMode(!isStealthHoldMode);
            }}
            className={`w-10 h-10 rounded-full border flex items-center justify-center active:scale-90 transition-all shrink-0 shadow-sm ${
              isStealthHoldMode
                ? 'bg-[#D4FF00]/20 border-[#D4FF00] text-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                : 'bg-[#11141D] border-white/[0.08] text-zinc-400 hover:text-zinc-200'
            }`}
            title="Toggle Hold-to-Reveal Stealth Shield"
          >
            <Fingerprint className="w-5 h-5" />
          </button>

          {/* Voice Recording / Input Bar */}
          {isRecording ? (
            <div className="flex-1 bg-red-950/40 border border-red-500/40 rounded-full px-4 py-2 flex items-center justify-between animate-pulse">
              <div className="flex items-center space-x-2 text-red-400 font-mono text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span>Recording Secret Audio: {recordSeconds}s</span>
              </div>
              <button
                onClick={() => handleStopVoiceRecord(true)}
                className="text-xs text-zinc-400 hover:text-white uppercase font-mono"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex-1 bg-[#11141D] border border-white/[0.08] focus-within:border-[#D4FF00]/50 rounded-full px-4 py-2 flex items-center transition-all shadow-inner">
              <input
                type="text"
                value={inputText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isStealthHoldMode ? 'Hold-to-Reveal message...' : 'Confidential message...'}
                className="w-full bg-transparent text-[14.5px] text-white placeholder-zinc-500 outline-none font-medium"
              />
            </div>
          )}

          {/* Send or Voice Record Action */}
          {inputText.trim() ? (
            <button
              onClick={() => handleSendMessage()}
              className="w-10 h-10 rounded-full bg-[#D4FF00] hover:bg-[#c4ed00] text-black shadow-[0_0_15px_rgba(212,255,0,0.35)] flex items-center justify-center font-bold active:scale-90 transition-all shrink-0 cursor-pointer"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : isRecording ? (
            <button
              onClick={() => handleStopVoiceRecord(false)}
              className="w-10 h-10 rounded-full bg-red-500 hover:bg-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] flex items-center justify-center active:scale-90 transition-all shrink-0"
              title="Send Voice Note"
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : (
            <button
              onClick={handleStartVoiceRecord}
              className="w-10 h-10 rounded-full bg-[#11141D] hover:bg-[#181D2A] border border-white/[0.08] text-zinc-300 hover:text-[#D4FF00] flex items-center justify-center active:scale-90 transition-all shrink-0 shadow-sm"
              title="Record Disappearing Voice Note"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
