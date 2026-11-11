import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  QrCode,
  Flame,
  Lock,
  Ghost,
  Mic,
  Image as ImageIcon,
  ArrowUp,
  Copy,
  Check,
  RefreshCw,
  Fingerprint,
  Sparkles,
  Plus,
  Search,
  Clock,
  Camera,
  Play,
  Volume2,
  VolumeX,
  Eye,
  Shield,
  X,
  Bell,
  CheckCheck,
  Zap,
  CornerUpLeft,
  UserPlus,
  KeyRound,
  ShieldAlert,
  Wand2,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { StorageService } from './services/storage';
import { NetworkService, handleToPin, supabase } from './services/network';
import { QRScannerModal } from './components/QRScannerModal';

// ==========================================
// SUBTLE TACTILE AUDIO & HAPTIC ENGINE
// ==========================================
class TactileSound {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  vibrate(pattern: number | number[] = 15) {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // ignore haptic error
    }
  }

  play(type: 'send' | 'receive' | 'smoke' | 'tap' | 'alert') {
    if (this.muted) return;
    try {
      this.init();
      this.vibrate(type === 'alert' ? [40, 60, 40] : type === 'smoke' ? 25 : 12);
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'send') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'receive') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(740, now);
        osc.frequency.setValueAtTime(1040, now + 0.07);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === 'smoke') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(48, now + 0.35);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.start(now);
        osc.stop(now + 0.38);
      } else if (type === 'tap') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(240, now + 0.08);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // AudioContext policy fallback
    }
  }
}

const audio = new TactileSound();

// ==========================================
// TYPES & DATA CONTRACTS
// ==========================================
interface ContactItem {
  id: string;
  name: string;
  handle: string;
  code: string;
  avatar: string;
  color?: string;
  online: boolean;
  unread: number;
  time: string;
}

interface MessageItem {
  id: string;
  sender: 'me' | 'them' | 'system';
  type: 'text' | 'voice' | 'photo' | 'screenshot_alert';
  text: string;
  timerMode?: '10s' | '30s' | '60s' | 'burn';
  totalSeconds: number;
  remainingSeconds: number;
  seen: boolean;
  shielded?: boolean;
  whisperEffect?: boolean;
  replyTo?: { sender: string; text: string } | null;
  reactions?: string[];
  caption?: string;
  previewUrl?: string;
  audioUrl?: string;
  duration?: string;
  time: string;
  disintegrating?: boolean;
  everRevealed?: boolean;
}

interface HandshakeRequest {
  id: string;
  name: string;
  handle: string;
  code: string;
  avatar: string;
  via: string;
  time: string;
}

const DECOY_CONTACTS: ContactItem[] = [
  {
    id: 'd1',
    name: 'Mom ❤️',
    handle: '@home_family',
    code: '101-202',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    online: true,
    unread: 0,
    time: '1h ago',
  },
  {
    id: 'd2',
    name: 'College Study Notes',
    handle: '@uni_notes',
    code: '442-108',
    avatar: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&auto=format&fit=crop&q=80',
    online: false,
    unread: 0,
    time: 'Yesterday',
  },
];

const DECOY_CHATS: Record<string, MessageItem[]> = {
  d1: [
    {
      id: 'dm1',
      sender: 'them',
      type: 'text',
      text: 'Beta, did you have dinner? Call when you are free.',
      totalSeconds: 0,
      remainingSeconds: 0,
      seen: true,
      time: '9:15 PM',
      disintegrating: false,
    },
    {
      id: 'dm2',
      sender: 'me',
      type: 'text',
      text: 'Yes Mom, having dinner now. Will call in 15 mins!',
      totalSeconds: 0,
      remainingSeconds: 0,
      seen: true,
      time: '9:16 PM',
      disintegrating: false,
    },
  ],
  d2: [
    {
      id: 'dm3',
      sender: 'them',
      type: 'text',
      text: 'Attached Chapter 4 syllabus notes for tomorrow exam.',
      totalSeconds: 0,
      remainingSeconds: 0,
      seen: true,
      time: 'Yesterday',
      disintegrating: false,
    },
  ],
};

export const App: React.FC = () => {
  // Navigation: 'onboarding' | 'list' | 'chat'
  const initialProfile = StorageService.getProfile();
  const [screen, setScreen] = useState<'onboarding' | 'list' | 'chat'>(
    initialProfile ? 'list' : 'onboarding'
  );

  // Active Contact & Real Data Lists
  const [activeContactId, setActiveContactId] = useState<string>('');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [chats, setChats] = useState<Record<string, MessageItem[]>>({});
  const [pendingRequests, setPendingRequests] = useState<HandshakeRequest[]>([]);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState<boolean>(false);

  // User Identity & Security Codes
  const [myHandle, setMyHandle] = useState<string>(() => {
    return initialProfile ? `@${initialProfile.handle}` : '@ghost_cipher';
  });
  const [myCode, setMyCode] = useState<string>(() => {
    if (initialProfile) {
      const pin = handleToPin(initialProfile.handle);
      return `${pin.slice(0, 3)}-${pin.slice(3, 6)}`;
    }
    const local = localStorage.getItem('blink_user_code');
    return local || '904-112';
  });
  const [recoveryPin, setRecoveryPin] = useState<string>(() => {
    return initialProfile?.pin || localStorage.getItem('blink_recovery_pin') || '2580';
  });
  const [decoyPin] = useState<string>('0000');
  const [decoyModeActive, setDecoyModeActive] = useState<boolean>(false);
  const [ghostMode, setGhostMode] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);

  // Onboarding State
  const [isGeneratingId, setIsGeneratingId] = useState<boolean>(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState<boolean>(false);
  const [restoreHandleInput, setRestoreHandleInput] = useState<string>('@ghost_cipher');
  const [restorePinInput, setRestorePinInput] = useState<string>('');
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false);

  // Modals & Sheets
  const [showQrPinPopover, setShowQrPinPopover] = useState<boolean>(false);
  const [popoverTab, setPopoverTab] = useState<'qr' | 'pin' | 'scan'>('qr');
  const [copied, setCopied] = useState<boolean>(false);
  const [pinSavedToast, setPinSavedToast] = useState<boolean>(false);
  const [showConnectSheet, setShowConnectSheet] = useState<boolean>(false);
  const [connectCodeInput, setConnectCodeInput] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCameraScanner, setShowCameraScanner] = useState<boolean>(false);

  // Disclaimer Popup on Code Regeneration
  const [showRegenerateDisclaimer, setShowRegenerateDisclaimer] = useState<boolean>(false);

  // App Lock
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('blink_app_lock_active') === 'true';
  });
  const [lockInput, setLockInput] = useState<string>('');
  const [lockError, setLockError] = useState<boolean>(false);

  // Liquid Aurora Composer State
  const [messageText, setMessageText] = useState<string>('');
  const [timerMode, setTimerMode] = useState<'10s' | '30s' | '60s' | 'burn'>('30s');
  const [showTimerMenu, setShowTimerMenu] = useState<boolean>(false);
  const [shieldMode, setShieldMode] = useState<boolean>(false);
  const [typingPulse, setTypingPulse] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSecs, setRecordSecs] = useState<number>(0);

  // Advanced Chat Features
  const [remoteTyping, setRemoteTyping] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showSendEffectMenu, setShowSendEffectMenu] = useState<boolean>(false);
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [inAppBanner, setInAppBanner] = useState<{ name: string; code: string; text: string } | null>(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sendHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Current Active Contact & Messages
  const activeContactsList = decoyModeActive ? DECOY_CONTACTS : contacts;
  const activeChatsMap = decoyModeActive ? DECOY_CHATS : chats;
  const activeContact = activeContactsList.find((c) => c.id === activeContactId) || activeContactsList[0];
  const currentMessages = activeChatsMap[activeContact?.id] || [];

  // Mute effect
  useEffect(() => {
    audio.muted = muted;
  }, [muted]);

  // Persist code & PIN
  useEffect(() => {
    localStorage.setItem('blink_user_code', myCode);
  }, [myCode]);

  useEffect(() => {
    localStorage.setItem('blink_recovery_pin', recoveryPin);
  }, [recoveryPin]);

  // Auto-lock when hidden
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden') {
        setIsLocked(true);
        localStorage.setItem('blink_app_lock_active', 'true');
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  // Decay typing pulse
  useEffect(() => {
    if (typingPulse <= 0) return;
    const t = setTimeout(() => setTypingPulse((p) => Math.max(0, p - 15)), 120);
    return () => clearTimeout(t);
  }, [typingPulse]);

  // Recording timer
  useEffect(() => {
    if (!isRecording) {
      setRecordSecs(0);
      return;
    }
    const iv = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [isRecording]);

  // Initial Data Load (Identity, Supabase Sync, Saved Rooms)
  useEffect(() => {
    const prof = StorageService.getProfile();
    if (prof) {
      const clean = prof.handle.replace(/^@/, '');
      setMyHandle(`@${clean}`);
      const pin = handleToPin(clean);
      setMyCode(`${pin.slice(0, 3)}-${pin.slice(3, 6)}`);
      if (prof.pin) setRecoveryPin(prof.pin);

      // Sync user profile to Supabase
      NetworkService.syncProfileToSupabase(prof);

      // Load locally saved rooms
      const savedRooms = StorageService.getRooms(clean);
      if (savedRooms && savedRooms.length > 0) {
        const loaded: ContactItem[] = savedRooms.map((r) => ({
          id: 'c_' + (r.peerHandle || r.code),
          name: r.peerDisplayName || (r.peerHandle ? `@${r.peerHandle}` : `Room #${r.code}`),
          handle: r.peerHandle ? `@${r.peerHandle}` : `@room_${r.code}`,
          code: r.code.length === 6 ? `${r.code.slice(0, 3)}-${r.code.slice(3, 6)}` : r.code,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          online: true,
          unread: r.unreadCount || 0,
          time: 'Recent',
        }));
        setContacts(loaded);
        if (loaded[0]) setActiveContactId(loaded[0].id);
      }

      // Also fetch remote direct messages from Supabase
      NetworkService.fetchUserDirectMessages(clean).then((remoteRooms) => {
        if (remoteRooms && remoteRooms.length > 0) {
          setContacts((prev) => {
            const merged = [...prev];
            remoteRooms.forEach((r) => {
              if (r.peerHandle && !merged.some((m) => m.handle.toLowerCase() === `@${r.peerHandle}`.toLowerCase())) {
                const pin = handleToPin(r.peerHandle);
                merged.push({
                  id: 'c_' + r.peerHandle,
                  name: r.peerDisplayName || `@${r.peerHandle}`,
                  handle: `@${r.peerHandle}`,
                  code: `${pin.slice(0, 3)}-${pin.slice(3, 6)}`,
                  avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                  online: true,
                  unread: 0,
                  time: 'Recent',
                });
              }
            });
            return merged;
          });
        }
      });
    }
  }, []);

  // Master 1-Second Countdown Engine (Only ticks for seen === true)
  useEffect(() => {
    const iv = setInterval(() => {
      setChats((prev) => {
        let updated = false;
        const next = { ...prev };

        Object.keys(next).forEach((cId) => {
          next[cId] = next[cId]
            .map((msg) => {
              if (!msg.seen || msg.disintegrating) return msg;
              if (msg.remainingSeconds > 1) {
                updated = true;
                return { ...msg, remainingSeconds: msg.remainingSeconds - 1 };
              } else if (msg.remainingSeconds === 1) {
                updated = true;
                audio.play('smoke');
                return { ...msg, remainingSeconds: 0, disintegrating: true };
              }
              return msg;
            })
            .filter((msg) => !(msg.disintegrating && msg.remainingSeconds === 0));
        });
        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (screen === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, screen, activeContactId]);

  // Real-Time Inbox Listener (Handshake Requests & Incoming Direct Messages)
  useEffect(() => {
    if (decoyModeActive) return;
    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    if (!cleanMe || cleanMe === 'ghost_cipher') return;

    const inboxChannelName = `inbox_${cleanMe}`;
    let ch = supabase?.channel(inboxChannelName, {
      config: { broadcast: { self: false } },
    });

    if (ch) {
      ch.on('broadcast', { event: 'incoming_message' }, ({ payload }) => {
        if (!payload) return;
        const { message, room } = payload;
        audio.play('receive');
        setInAppBanner({
          name: room.peerDisplayName || `@${room.peerHandle}`,
          code: room.code || 'SECURE',
          text: '🛡️ New Stealth Message received',
        });
        setTimeout(() => setInAppBanner(null), 3500);

        setContacts((prev) => {
          const exists = prev.find((c) => c.handle.toLowerCase() === `@${room.peerHandle}`.toLowerCase());
          if (exists) {
            return prev.map((c) => (c.id === exists.id ? { ...c, unread: (c.unread || 0) + 1, time: 'Now' } : c));
          } else {
            const pin = handleToPin(room.peerHandle);
            const newContact: ContactItem = {
              id: 'c_' + room.peerHandle,
              name: room.peerDisplayName || `@${room.peerHandle}`,
              handle: `@${room.peerHandle}`,
              code: `${pin.slice(0, 3)}-${pin.slice(3, 6)}`,
              avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              online: true,
              unread: 1,
              time: 'Now',
            };
            return [newContact, ...prev];
          }
        });
      });

      ch.on('broadcast', { event: 'peer_connected' }, ({ payload }) => {
        if (!payload) return;
        audio.play('alert');
        const pin = handleToPin(payload.handle);
        const req: HandshakeRequest = {
          id: 'req_' + Date.now(),
          name: payload.displayName || `@${payload.handle}`,
          handle: `@${payload.handle}`,
          code: `${pin.slice(0, 3)}-${pin.slice(3, 6)}`,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          via: 'Direct Stealth Handshake',
          time: 'Just now',
        };
        setPendingRequests((prev) => [req, ...prev.filter((r) => r.handle !== req.handle)]);
        setShowRequestsDrawer(true);
      });

      ch.subscribe();
    }

    return () => {
      if (ch && supabase) {
        supabase.removeChannel(ch);
      }
    };
  }, [myHandle, decoyModeActive]);

  // Real-Time Active Room Subscription
  useEffect(() => {
    if (screen !== 'chat' || !activeContact || decoyModeActive) return;

    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
    const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

    // Broadcast our presence in room
    NetworkService.broadcastPeerJoin(normalizedRoomId, cleanMe, myHandle);

    const unsubscribe = NetworkService.subscribeToRoom(normalizedRoomId, {
      onMessage: (payload: any) => {
        if (payload.senderHandle === cleanMe) return; // avoid duplicate
        audio.play('receive');

        const timerSecs = payload.timerSeconds || 30;
        const newMsg: MessageItem = {
          id: payload.id || 'm_' + Date.now(),
          sender: 'them',
          type: payload.audioUrl ? 'voice' : payload.mediaUrl ? 'photo' : 'text',
          text: payload.ciphertext || payload.text || '',
          timerMode: timerSecs === 10 ? '10s' : timerSecs === 60 ? '60s' : payload.isBurnOnRead ? 'burn' : '30s',
          totalSeconds: timerSecs,
          remainingSeconds: timerSecs,
          seen: true, // Recipient viewing room sees it
          shielded: payload.isHoldToReveal || payload.isBurnOnRead,
          previewUrl: payload.mediaUrl,
          audioUrl: payload.audioUrl,
          duration: payload.audioDuration ? `0:0${payload.audioDuration}` : undefined,
          time: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          disintegrating: false,
        };

        setChats((prev) => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
        }));

        // Send delivery ack so sender's "Waiting for Seen" badge turns into countdown ring
        NetworkService.broadcastDeliveryAck(normalizedRoomId, newMsg.id, 'read');
      },
      onTyping: (senderHandle) => {
        if (senderHandle !== cleanMe) {
          setRemoteTyping(true);
          setTimeout(() => setRemoteTyping(false), 2500);
        }
      },
      onReaction: ({ msgId, reaction }) => {
        if (!msgId || !reaction) return;
        setChats((prev) => {
          const contactMsgs = prev[activeContact.id] || [];
          return {
            ...prev,
            [activeContact.id]: contactMsgs.map((m) =>
              m.id === msgId
                ? { ...m, reactions: [...(m.reactions || []).filter((r) => r !== reaction), reaction] }
                : m
            ),
          };
        });
      },
      onBurnReveal: ({ msgId }) => {
        setChats((prev) => {
          const contactMsgs = prev[activeContact.id] || [];
          return {
            ...prev,
            [activeContact.id]: contactMsgs.map((m) => (m.id === msgId ? { ...m, seen: true } : m)),
          };
        });
      },
      onDeliveryAck: ({ msgId, status }) => {
        if (status === 'read') {
          setChats((prev) => {
            const contactMsgs = prev[activeContact.id] || [];
            return {
              ...prev,
              [activeContact.id]: contactMsgs.map((m) => (m.id === msgId ? { ...m, seen: true } : m)),
            };
          });
        }
      },
      onScreenshotAlert: () => {
        triggerScreenshotBlockedAlert();
      },
    });

    return () => {
      unsubscribe();
    };
  }, [screen, activeContact?.id, decoyModeActive, myHandle]);

  // Connect With Friend (Code or @handle)
  const connectWithTarget = async (rawInput: string) => {
    if (!rawInput.trim()) return;
    setIsConnecting(true);
    const raw = rawInput.trim();
    const clean = raw.toLowerCase().replace(/[@\s-]/g, '');

    let targetHandle = raw.startsWith('@') ? raw.slice(1).toLowerCase() : '';
    let targetDisplayName = raw;
    let targetCode = raw.includes('-') ? raw : `${raw.slice(0, 3)}-${raw.slice(3, 6) || '882'}`;

    try {
      const profile = await NetworkService.findProfileByPin(raw);
      if (profile) {
        targetHandle = profile.handle;
        targetDisplayName = profile.displayName || profile.handle;
        const pPin = handleToPin(profile.handle);
        targetCode = `${pPin.slice(0, 3)}-${pPin.slice(3, 6)}`;
      }
    } catch {
      // ignore
    }

    if (!targetHandle) {
      targetHandle = raw.startsWith('@') ? raw.slice(1) : `peer_${clean.slice(0, 4)}`;
      targetDisplayName = raw.startsWith('@') ? raw : `Partner #${clean.slice(0, 3)}`;
    }

    const newId = 'c_' + targetHandle;
    const newContact: ContactItem = {
      id: newId,
      name: targetDisplayName + ' ✨',
      handle: `@${targetHandle}`,
      code: targetCode,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      color: 'from-violet-500 to-fuchsia-500',
      online: true,
      unread: 0,
      time: 'Now',
    };

    setContacts((prev) => {
      const exists = prev.find((c) => c.handle.toLowerCase() === `@${targetHandle}`.toLowerCase());
      if (exists) return prev;
      const updated = [newContact, ...prev];
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      StorageService.saveRooms(
        updated.map((c) => ({
          id: `dm_${[cleanMe, c.handle.replace(/^@/, '').toLowerCase()].sort().join('__')}`,
          code: c.code.replace(/\D/g, ''),
          participantCount: 2,
          timerSeconds: 30,
          isBurnOnRead: false,
          peerHandle: c.handle.replace(/^@/, ''),
          peerDisplayName: c.name,
        })),
        cleanMe
      );
      return updated;
    });

    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    NetworkService.sendPeerConnectedNotice(targetHandle, {
      id: 'usr_' + cleanMe,
      handle: cleanMe,
      displayName: myHandle,
      avatarId: 1,
      vibe: '⚡ Connected',
      isAvailable: true,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      lastActive: Date.now(),
    });

    audio.play('receive');
    setActiveContactId(newId);
    setScreen('chat');
    setShowConnectSheet(false);
    setConnectCodeInput('');
    setIsConnecting(false);
  };

  // Send Message
  const handleSendMessage = async (effectType?: 'burn' | 'shield' | 'whisper') => {
    if (!messageText.trim() && !effectType) return;
    const isBurn = effectType === 'burn' || timerMode === 'burn';
    const isShielded = effectType === 'shield' || shieldMode || isBurn;
    const seconds = timerMode === '10s' ? 10 : timerMode === '60s' ? 60 : timerMode === 'burn' ? 4 : 30;

    const msgId = 'm_' + Date.now();
    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    const cleanThem = activeContact?.handle.replace(/^@/, '').toLowerCase() || 'peer';
    const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

    const newMsg: MessageItem = {
      id: msgId,
      sender: 'me',
      type: 'text',
      text: messageText.trim(),
      timerMode,
      totalSeconds: seconds,
      remainingSeconds: seconds,
      seen: false, // sender's timer does NOT tick until recipient reads!
      shielded: isShielded,
      whisperEffect: effectType === 'whisper',
      replyTo: replyingTo ? { sender: replyingTo.sender === 'me' ? 'You' : activeContact.name, text: replyingTo.text } : null,
      reactions: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false,
    };

    audio.play('send');
    setMessageText('');
    setReplyingTo(null);
    setShowSendEffectMenu(false);

    setChats((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));

    if (!decoyModeActive) {
      await NetworkService.broadcastMessage(
        normalizedRoomId,
        {
          id: msgId,
          roomId: normalizedRoomId,
          senderId: 'usr_' + cleanMe,
          senderHandle: cleanMe,
          senderDisplayName: myHandle,
          ciphertext: newMsg.text,
          iv: 'direct',
          createdAt: Date.now(),
          timerSeconds: seconds,
          expiresAt: 0,
          isBurnOnRead: isBurn,
          isHoldToReveal: isShielded,
          status: 'sent',
        },
        activeContact.code,
        cleanThem
      );
    }
  };

  // Real Audio Recording with MediaRecorder
  const startRealAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          sendRealVoiceNote(base64Audio, recordSecs || 3);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      audio.play('tap');
    } catch {
      alert('Please enable microphone access in Android settings to send stealth voice notes.');
      setIsRecording(false);
    }
  };

  const stopRealAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const sendRealVoiceNote = async (base64Audio: string, durationSecs: number) => {
    const msgId = 'v_' + Date.now();
    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    const cleanThem = activeContact?.handle.replace(/^@/, '').toLowerCase() || 'peer';
    const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

    const newMsg: MessageItem = {
      id: msgId,
      sender: 'me',
      type: 'voice',
      text: `Voice Note (0:0${durationSecs})`,
      duration: `0:0${durationSecs}`,
      audioUrl: base64Audio,
      timerMode: 'burn',
      totalSeconds: 4,
      remainingSeconds: 4,
      seen: false,
      shielded: false,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false,
    };

    audio.play('send');
    setChats((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));

    if (!decoyModeActive) {
      await NetworkService.broadcastMessage(
        normalizedRoomId,
        {
          id: msgId,
          roomId: normalizedRoomId,
          senderId: 'usr_' + cleanMe,
          senderHandle: cleanMe,
          senderDisplayName: myHandle,
          ciphertext: 'Stealth Voice Note',
          iv: 'direct',
          createdAt: Date.now(),
          timerSeconds: 4,
          expiresAt: 0,
          isBurnOnRead: true,
          isHoldToReveal: false,
          status: 'sent',
          audioUrl: base64Audio,
          audioDuration: durationSecs,
        },
        activeContact.code,
        cleanThem
      );
    }
  };

  // Real Ephemeral Photo Upload (Camera / Gallery)
  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress via canvas to max 800px width/height for fast stealth delivery
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = (h * maxDim) / w;
          w = maxDim;
        } else if (h > maxDim) {
          w = (w * maxDim) / h;
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
        sendRealEphemeralPhoto(compressedDataUrl, 'Stealth Snapshot 📸');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const sendRealEphemeralPhoto = async (dataUrl: string, captionText: string) => {
    const msgId = 'p_' + Date.now();
    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    const cleanThem = activeContact?.handle.replace(/^@/, '').toLowerCase() || 'peer';
    const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

    const newMsg: MessageItem = {
      id: msgId,
      sender: 'me',
      type: 'photo',
      text: 'Ephemeral Photo',
      caption: captionText,
      previewUrl: dataUrl,
      timerMode: timerMode === 'burn' ? 'burn' : '10s',
      totalSeconds: timerMode === 'burn' ? 4 : 10,
      remainingSeconds: timerMode === 'burn' ? 4 : 10,
      seen: false,
      shielded: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false,
    };

    audio.play('send');
    setChats((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));

    if (!decoyModeActive) {
      await NetworkService.broadcastMessage(
        normalizedRoomId,
        {
          id: msgId,
          roomId: normalizedRoomId,
          senderId: 'usr_' + cleanMe,
          senderHandle: cleanMe,
          senderDisplayName: myHandle,
          ciphertext: captionText,
          iv: 'direct',
          createdAt: Date.now(),
          timerSeconds: timerMode === 'burn' ? 4 : 10,
          expiresAt: 0,
          isBurnOnRead: timerMode === 'burn',
          isHoldToReveal: true,
          status: 'sent',
          mediaUrl: dataUrl,
        },
        activeContact.code,
        cleanThem
      );
    }
  };

  // Play Voice Note
  const handlePlayVoice = (msg: MessageItem) => {
    if (playingVoiceId === msg.id) return;
    setPlayingVoiceId(msg.id);
    audio.play('tap');

    if (msg.audioUrl) {
      const snd = new Audio(msg.audioUrl);
      snd.play().catch(() => {});
      snd.onended = () => {
        setPlayingVoiceId(null);
        audio.play('smoke');
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: prev[activeContact.id].map((m) =>
            m.id === msg.id ? { ...m, remainingSeconds: 0, disintegrating: true } : m
          ),
        }));
      };
    } else {
      setTimeout(() => {
        setPlayingVoiceId(null);
        audio.play('smoke');
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: prev[activeContact.id].map((m) =>
            m.id === msg.id ? { ...m, remainingSeconds: 0, disintegrating: true } : m
          ),
        }));
      }, 3500);
    }
  };

  // Emoji Reaction
  const handleReaction = (msgId: string, emoji: string) => {
    audio.play('tap');
    setActiveReactionMsgId(null);
    setChats((prev) => {
      const contactMsgs = prev[activeContact.id] || [];
      return {
        ...prev,
        [activeContact.id]: contactMsgs.map((m) => {
          if (m.id !== msgId) return m;
          const current = m.reactions || [];
          const exists = current.includes(emoji);
          return {
            ...m,
            reactions: exists ? current.filter((e) => e !== emoji) : [...current, emoji],
          };
        }),
      };
    });

    if (!decoyModeActive && activeContact) {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastReaction(normalizedRoomId, msgId, emoji);
    }
  };

  // Mark Message Seen
  const markMessageSeen = (contactId: string, msgId: string) => {
    setChats((prev) => {
      const contactMsgs = prev[contactId] || [];
      return {
        ...prev,
        [contactId]: contactMsgs.map((m) => (m.id === msgId ? { ...m, seen: true } : m)),
      };
    });
    if (!decoyModeActive && activeContact) {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normalizedRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastDeliveryAck(normalizedRoomId, msgId, 'read');
    }
  };

  // Hold-to-Reveal Handlers
  const handleTouchStartReveal = (msgId: string) => {
    audio.play('tap');
    setRevealedIds((prev) => ({ ...prev, [msgId]: true }));
    markMessageSeen(activeContactId, msgId);
  };

  const handleTouchEndReveal = (msgId: string, isBurn: boolean) => {
    setRevealedIds((prev) => ({ ...prev, [msgId]: false }));
    if (isBurn) {
      audio.play('smoke');
      setChats((prev) => ({
        ...prev,
        [activeContactId]: prev[activeContactId].map((m) =>
          m.id === msgId ? { ...m, remainingSeconds: 0, disintegrating: true } : m
        ),
      }));
    }
  };

  // Screenshot Attempt Alert
  const triggerScreenshotBlockedAlert = () => {
    audio.play('alert');
    const alertMsg: MessageItem = {
      id: 'sec_' + Date.now(),
      sender: 'system',
      type: 'screenshot_alert',
      text: '🛡️ Screenshot attempt blocked by Phantom Shield (FLAG_SECURE)',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      seen: true,
      totalSeconds: 0,
      remainingSeconds: 0,
      disintegrating: false,
    };
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), alertMsg],
    }));
  };

  // Panic Burn All Messages
  const handleBurnAll = () => {
    audio.play('smoke');
    setChats((prev) => {
      const current = prev[activeContact.id] || [];
      return {
        ...prev,
        [activeContact.id]: current.map((m) => ({ ...m, remainingSeconds: 0, disintegrating: true })),
      };
    });
    setTimeout(() => {
      setChats((prev) => ({ ...prev, [activeContact.id]: [] }));
    }, 450);
  };

  // Regenerate Code Disclaimer Confirm
  const confirmRegenerateCode = () => {
    const newCode = StorageService.refreshMyRoomCode();
    const formatted = `${newCode.slice(0, 3)}-${newCode.slice(3, 6)}`;
    setMyCode(formatted);
    setShowRegenerateDisclaimer(false);
    setPinSavedToast(true);
    audio.play('receive');
    setTimeout(() => setPinSavedToast(false), 2500);
  };

  // App Lock Keypad Handler (Supports Real PIN 2580 & Decoy PIN 0000)
  const handleKeyPress = (digit: string) => {
    audio.play('tap');
    if (lockInput.length >= 4) return;
    const next = lockInput + digit;
    setLockInput(next);
    if (next.length === 4) {
      if (next === recoveryPin) {
        audio.play('receive');
        setTimeout(() => {
          setDecoyModeActive(false);
          if (contacts[0]) setActiveContactId(contacts[0].id);
          setIsLocked(false);
          setLockInput('');
          localStorage.removeItem('blink_app_lock_active');
        }, 150);
      } else if (next === decoyPin) {
        audio.play('receive');
        setTimeout(() => {
          setDecoyModeActive(true);
          setActiveContactId('d1');
          setIsLocked(false);
          setLockInput('');
          setScreen('list');
          localStorage.removeItem('blink_app_lock_active');
        }, 150);
      } else {
        audio.play('smoke');
        setLockError(true);
        setTimeout(() => {
          setLockInput('');
          setLockError(false);
        }, 500);
      }
    }
  };

  // Onboarding Generate Secret Identity
  const handleSlotGenerateCode = () => {
    setIsGeneratingId(true);
    audio.play('tap');
    let ticks = 0;
    const interval = setInterval(() => {
      const p1 = Math.floor(100 + Math.random() * 899);
      const p2 = Math.floor(100 + Math.random() * 899);
      setMyCode(`${p1}-${p2}`);
      ticks++;
      if (ticks > 8) {
        clearInterval(interval);
        setIsGeneratingId(false);
        audio.play('receive');
      }
    }, 60);
  };

  // Restore Account
  const handleRestoreAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restorePinInput.trim() || restorePinInput.length !== 4) return;
    audio.play('receive');
    const cleanHandle = restoreHandleInput.replace(/^@/, '').toLowerCase().trim();
    const pin = handleToPin(cleanHandle);
    setMyHandle(`@${cleanHandle}`);
    setMyCode(`${pin.slice(0, 3)}-${pin.slice(3, 6)}`);
    setRecoveryPin(restorePinInput);

    StorageService.saveProfile({
      id: 'usr_' + cleanHandle,
      handle: cleanHandle,
      displayName: cleanHandle,
      avatarId: 1,
      vibe: '',
      isAvailable: true,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      lastActive: Date.now(),
      pin: restorePinInput,
    });

    setRestoreSuccess(true);
    setTimeout(() => {
      setShowRestoreSheet(false);
      setScreen('list');
      setRestoreSuccess(false);
    }, 700);
  };

  return (
    <div className="h-[100dvh] w-full bg-[#09090B] text-zinc-100 flex flex-col items-center justify-center font-sans select-none relative overflow-hidden">
      {/* Hidden file input for camera/gallery photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelected}
      />

      {/* Real HTML5 Camera QR Scanner Modal */}
      <QRScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={(decoded) => {
          let target = decoded.trim();
          if (target.includes('code=')) {
            target = target.split('code=')[1].split('&')[0];
          }
          connectWithTarget(target);
        }}
      />

      {/* ==========================================
          CUSTOM ANIMATIONS: SMOKE & AURORA
         ========================================== */}
      <style>{`
        @keyframes smokeDissolve {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: blur(0px);
          }
          40% {
            opacity: 0.75;
            transform: scale(1.04) translateY(-6px);
            filter: blur(5px) brightness(1.4);
          }
          100% {
            opacity: 0;
            transform: scale(1.12) translateY(-22px);
            filter: blur(16px);
          }
        }
        .smoke-exit {
          animation: smokeDissolve 450ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
          pointer-events: none;
        }
        @keyframes auroraFlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .aurora-border {
          background: linear-gradient(270deg, #00F5A0, #10b981, #ec4899, #8b5cf6, #00F5A0);
          background-size: 300% 300%;
          animation: auroraFlow 3.2s ease infinite;
        }
      `}</style>

      {/* AMBIENT GLOW */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-[#00F5A0]/10 rounded-full blur-[160px]" />
      </div>

      {/* =========================================================
          NATIVE FULL-SCREEN APPLICATION CONTAINER
         ========================================================= */}
      <div className="relative z-10 w-full h-[100dvh] sm:max-w-[460px] sm:h-[92vh] sm:rounded-3xl sm:border sm:border-white/10 bg-[#09090B] shadow-2xl flex flex-col overflow-hidden">
        {/* Decoy Mode Banner */}
        {decoyModeActive && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-[11px] text-amber-300 z-30 shrink-0">
            <span className="flex items-center gap-1.5 font-semibold">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              Decoy Safe Mode Active (Chats Hidden)
            </span>
            <button
              onClick={() => {
                setDecoyModeActive(false);
                if (contacts[0]) setActiveContactId(contacts[0].id);
                audio.play('tap');
              }}
              className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded-full font-bold cursor-pointer"
            >
              Exit Decoy
            </button>
          </div>
        )}

        {/* In-App Toast Notification */}
        {inAppBanner && (
          <div
            onClick={() => {
              setScreen('chat');
              setInAppBanner(null);
            }}
            className="absolute top-4 inset-x-4 z-40 bg-zinc-900/95 border border-[#00F5A0]/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between backdrop-blur-xl animate-in slide-in-from-top cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#00F5A0]/20 flex items-center justify-center text-[#00F5A0]">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block">{inAppBanner.name}</span>
                <span className="text-[10px] text-zinc-400 font-medium">{inAppBanner.text}</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-[#00F5A0] bg-[#00F5A0]/10 px-2 py-1 rounded-lg">
              View
            </span>
          </div>
        )}

        {/* =========================================================
            VIEW 0: ZERO-LOGIN ONBOARDING
           ========================================================= */}
        {screen === 'onboarding' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[#09090B] relative overflow-y-auto">
            <div className="pointer-events-none absolute top-10 inset-x-0 flex justify-center">
              <div className="w-56 h-56 bg-[#00F5A0]/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center mt-2">
              <div className="w-16 h-16 rounded-3xl bg-black border border-[#00F5A0]/40 mx-auto flex items-center justify-center shadow-[0_12px_35px_rgba(0,245,160,0.35)] mb-3 overflow-hidden p-1">
                <Ghost className="w-8 h-8 text-[#00F5A0]" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[10px] font-semibold text-[#00F5A0] mb-2">
                <Sparkles className="w-3 h-3" /> NO PHONE • NO EMAIL • ZERO TRACE
              </span>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center space-x-1">
                <span>BlinkMsg</span>
                <span className="text-[#00F5A0]">.</span>
              </h1>
              <p className="text-xs text-zinc-400 max-w-[280px] mx-auto mt-1 leading-relaxed">
                Autonomous Ephemeral Messenger. Messages self-destruct once read. Leave zero digital footprint.
              </p>
            </div>

            {/* Generated Code & Handle Form */}
            <div className="relative z-10 bg-zinc-900/70 border border-white/10 rounded-3xl p-4 backdrop-blur-xl shadow-2xl space-y-3 my-auto">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-[#00F5A0]" />
                  Your 6-Digit Connection Code
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">100% Anonymous</span>
              </div>

              <div className="py-3 rounded-2xl bg-black/60 border border-[#00F5A0]/30 flex items-center justify-center">
                <span
                  className={`font-mono text-3xl font-extrabold tracking-[0.22em] ${
                    isGeneratingId ? 'text-[#00F5A0] blur-[0.5px]' : 'text-white'
                  }`}
                >
                  {myCode}
                </span>
              </div>

              {/* Handle & 4-Digit Recovery PIN Row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                    Unique @Handle
                  </label>
                  <input
                    type="text"
                    value={myHandle}
                    onChange={(e) => setMyHandle(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-white focus:outline-none mt-0.5"
                  />
                </div>
                <div className="bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2">
                  <label className="text-[9px] uppercase tracking-wider text-zinc-500 block">
                    4-Digit Recovery PIN
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent font-mono text-xs font-bold tracking-widest text-[#00F5A0] focus:outline-none mt-0.5"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSlotGenerateCode}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#00F5A0] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingId ? 'animate-spin' : ''}`} />
                <span>1-Tap Generate Secret Identity</span>
              </button>
            </div>

            {/* Primary Action Button */}
            <div className="relative z-10 space-y-2.5">
              <button
                onClick={() => {
                  audio.play('send');
                  const cleanHandle = myHandle.replace(/^@/, '').toLowerCase().trim();
                  StorageService.saveProfile({
                    id: 'usr_' + cleanHandle,
                    handle: cleanHandle,
                    displayName: cleanHandle,
                    avatarId: 1,
                    vibe: '',
                    isAvailable: true,
                    country: 'India',
                    state: 'Delhi',
                    city: 'New Delhi',
                    lastActive: Date.now(),
                    pin: recoveryPin,
                  });
                  setScreen('list');
                }}
                className="w-full py-3.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-black text-xs shadow-[0_10px_30px_rgba(0,245,160,0.35)] transition-all cursor-pointer"
              >
                Enter Stealth Messenger →
              </button>

              <button
                onClick={() => setShowRestoreSheet(true)}
                className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#00F5A0]" />
                <span>Switching Phones? Restore with 4-Digit PIN</span>
              </button>
            </div>

            {/* Restore Account Bottom Sheet Modal */}
            {showRestoreSheet && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-end justify-center p-4">
                <form
                  onSubmit={handleRestoreAccount}
                  className="w-full bg-[#141419] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#00F5A0]" />
                      Restore Zero-Login Vault
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRestoreSheet(false)}
                      className="p-1 rounded-full bg-white/5 text-zinc-400"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Enter your existing @handle and 4-digit PIN. No phone number or email required.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="@your_handle"
                      value={restoreHandleInput}
                      onChange={(e) => setRestoreHandleInput(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#00F5A0]/50"
                    />
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="4-Digit Recovery PIN"
                      value={restorePinInput}
                      onChange={(e) => setRestorePinInput(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono tracking-widest text-[#00F5A0] focus:outline-none focus:border-[#00F5A0]/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-bold text-xs shadow-lg transition-all"
                  >
                    {restoreSuccess ? 'Identity Restored! Opening...' : 'Verify PIN & Restore'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            VIEW 1: CHAT LIST (HOME SCREEN - LOGO REMOVED)
           ========================================================= */}
        {screen === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B]">
            {/* Minimal Top Header - NO LOGO IMAGE */}
            <div className="px-5 pt-3 pb-3 flex items-center justify-between border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-black tracking-tight text-white">BlinkMsg</h1>
                    <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/10 border border-[#00F5A0]/30 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-pulse" />
                      {myHandle}
                    </span>
                    {ghostMode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        👻 Ghost
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">Zero-Login Stealth Messenger</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* My 6-Digit Code & QR Trigger Pill */}
                <button
                  onClick={() => {
                    setPopoverTab('qr');
                    setShowQrPinPopover(true);
                  }}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-2.5 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#00F5A0]" />
                  <span className="text-xs font-mono font-semibold text-zinc-200">{myCode}</span>
                </button>

                {/* Ghost Mode Toggle */}
                <button
                  onClick={() => {
                    setGhostMode(!ghostMode);
                    audio.play('tap');
                  }}
                  className={`p-2 rounded-full border transition-all cursor-pointer ${
                    ghostMode
                      ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                      : 'bg-zinc-900 border-white/10 text-zinc-400 hover:text-white'
                  }`}
                  title="Ghost Mode (Hide Online Status)"
                >
                  <Ghost className="w-4 h-4" />
                </button>

                {/* Connect Friend Button */}
                <button
                  onClick={() => setShowConnectSheet(!showConnectSheet)}
                  className="p-2 rounded-full bg-[#00F5A0] hover:bg-[#00e090] text-black shadow-[0_4px_16px_rgba(0,245,160,0.3)] transition-all cursor-pointer"
                  title="Connect via 6-Digit Code"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Handshake Requests Drawer */}
            {!decoyModeActive && pendingRequests.length > 0 && (
              <div className="px-5 pt-3 pb-2 border-b border-white/5">
                <div
                  onClick={() => setShowRequestsDrawer(!showRequestsDrawer)}
                  className="flex items-center justify-between text-xs font-semibold text-zinc-300 cursor-pointer mb-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-ping" />
                    <span>Connection Handshakes ({pendingRequests.length})</span>
                  </div>
                  <span className="text-[10px] text-[#00F5A0] font-mono">
                    {showRequestsDrawer ? 'Hide ▲' : 'View ▼'}
                  </span>
                </div>

                {showRequestsDrawer && (
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-2.5 rounded-2xl bg-zinc-950/80 border border-[#00F5A0]/25 flex items-center justify-between shadow-lg"
                      >
                        <div className="flex items-center gap-2.5">
                          <img
                            src={req.avatar}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-[#00F5A0]/30"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{req.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {req.code} • {req.via}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              audio.play('smoke');
                              setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            }}
                            className="px-2 py-1 rounded-xl bg-white/5 text-[10px] font-semibold text-zinc-400 hover:text-white"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={() => {
                              audio.play('receive');
                              connectWithTarget(req.code);
                              setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
                            }}
                            className="px-2.5 py-1 rounded-xl bg-[#00F5A0] text-[10px] font-bold text-black shadow-md"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Search Input Bar */}
            <div className="px-5 pt-3 pb-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search cipher contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/5 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F5A0]/40 transition-all"
                />
              </div>
            </div>

            {/* Contacts & Conversations Scroll Area */}
            <div className="flex-1 overflow-y-auto px-5 py-2 space-y-2">
              {activeContactsList.length === 0 ? (
                <div className="py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-950 border border-white/10 flex items-center justify-center text-zinc-600 mb-3 shadow-inner">
                    <Ghost className="w-8 h-8 text-[#00F5A0]/60 animate-pulse" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Secret Chats Yet</h3>
                  <p className="text-xs text-zinc-500 max-w-[240px] mt-1 leading-relaxed">
                    Share your 6-digit code or scan a friend's QR code to start a zero-trace conversation.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        setPopoverTab('qr');
                        setShowQrPinPopover(true);
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#00F5A0]" />
                      <span>My QR Code</span>
                    </button>
                    <button
                      onClick={() => setShowConnectSheet(true)}
                      className="px-3 py-2 rounded-xl bg-[#00F5A0] text-black text-xs font-bold flex items-center gap-1.5 shadow-[0_4px_16px_rgba(0,245,160,0.3)]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Connect Friend</span>
                    </button>
                  </div>
                </div>
              ) : (
                activeContactsList
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      c.code.includes(searchQuery) ||
                      c.handle.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((contact) => {
                    const contactMsgs = activeChatsMap[contact.id] || [];
                    const lastMsg = contactMsgs[contactMsgs.length - 1];

                    return (
                      <div
                        key={contact.id}
                        onClick={() => {
                          setActiveContactId(contact.id);
                          setScreen('chat');
                          audio.play('tap');
                        }}
                        className="p-3.5 rounded-2xl bg-zinc-950/70 hover:bg-zinc-900/90 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              className="w-11 h-11 rounded-2xl object-cover border border-white/10 group-hover:border-[#00F5A0]/40 transition-all"
                            />
                            {contact.online && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00F5A0] border-2 border-black" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white group-hover:text-[#00F5A0] transition-colors">
                                {contact.name}
                              </span>
                              <span className="text-[10px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                                {contact.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1 max-w-[190px]">
                              {lastMsg
                                ? lastMsg.type === 'voice'
                                  ? '🎙️ Stealth Voice Note'
                                  : lastMsg.type === 'photo'
                                  ? '📸 Ephemeral Photo'
                                  : lastMsg.text
                                : 'Connected via zero-trace code'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-[10px] text-zinc-500 font-mono">{contact.time}</span>
                          {contact.unread > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-[#00F5A0] text-black font-extrabold text-[10px]">
                              {contact.unread}
                            </span>
                          ) : (
                            <Flame className="w-3.5 h-3.5 text-zinc-700 group-hover:text-[#00F5A0] transition-colors" />
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Bottom Bar: Lock / Disclaimer / Safety Indicator */}
            <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-400 bg-black/40">
              <button
                onClick={() => setIsLocked(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 text-[11px] font-medium transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5 text-[#00F5A0]" />
                <span>Lock Messenger</span>
              </button>

              <button
                onClick={() => setMuted(!muted)}
                className="p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title={muted ? 'Unmute Sound' : 'Mute Tactile Sound'}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 2: ACTIVE REALTIME CHAT VIEW
           ========================================================= */}
        {screen === 'chat' && activeContact && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B] relative">
            {/* Chat Top Bar */}
            <div className="px-4 pt-3 pb-3 border-b border-white/5 bg-[#09090B]/90 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setScreen('list');
                    audio.play('tap');
                  }}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-9 h-9 rounded-2xl object-cover border border-[#00F5A0]/30"
                    />
                    {activeContact.online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00F5A0] border border-black" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{activeContact.name}</span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {activeContact.code} • {remoteTyping ? '⚡ Typing...' : 'E2E Encrypted'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chat Actions: Timer Selector & Burn All */}
              <div className="flex items-center gap-1.5">
                {/* Timer Dropdown Pill */}
                <div className="relative">
                  <button
                    onClick={() => setShowTimerMenu(!showTimerMenu)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-900 border border-white/10 hover:border-[#00F5A0]/40 text-xs font-mono font-semibold text-zinc-200 transition-all cursor-pointer"
                  >
                    <Clock className="w-3 h-3 text-[#00F5A0]" />
                    <span>{timerMode === 'burn' ? 'Burn 4s' : timerMode}</span>
                  </button>

                  {showTimerMenu && (
                    <div className="absolute right-0 top-9 z-40 bg-[#18181D] border border-white/15 rounded-2xl p-1.5 shadow-2xl space-y-1 w-32">
                      {[
                        { id: '10s', label: '⏱️ 10 Seconds' },
                        { id: '30s', label: '⏱️ 30 Seconds' },
                        { id: '60s', label: '⏱️ 60 Seconds' },
                        { id: 'burn', label: '🔥 Burn on Read' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setTimerMode(item.id as any);
                            setShowTimerMenu(false);
                            audio.play('tap');
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            timerMode === item.id
                              ? 'bg-[#00F5A0] text-black font-bold'
                              : 'text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panic Burn All Messages Button */}
                <button
                  onClick={handleBurnAll}
                  className="p-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 transition-all cursor-pointer"
                  title="Panic: Vaporize All Messages in this Chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Remote Typing Indicator */}
            {remoteTyping && (
              <div className="px-5 py-1.5 bg-[#00F5A0]/10 border-b border-[#00F5A0]/20 flex items-center justify-between text-[11px] text-[#00F5A0] animate-pulse">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-ping" />
                  Partner is crafting cipher...
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider">Live Stream</span>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentMessages.length === 0 ? (
                <div className="py-20 text-center text-zinc-500 space-y-2">
                  <Flame className="w-10 h-10 text-[#00F5A0]/30 mx-auto animate-pulse" />
                  <p className="text-xs">No active messages in this cipher chamber.</p>
                  <p className="text-[10px] text-zinc-600">
                    Send a text, listen-once voice note, or self-destructing photo.
                  </p>
                </div>
              ) : (
                currentMessages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  const isSystem = msg.sender === 'system';
                  const isBlurred = msg.shielded && !revealedIds[msg.id];

                  // Circular Progress Ring calculation
                  const radius = 6.5;
                  const circumference = 2 * Math.PI * radius;
                  const progressRatio = msg.totalSeconds > 0 ? msg.remainingSeconds / msg.totalSeconds : 0;
                  const strokeDashoffset = circumference - progressRatio * circumference;

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center my-2">
                        <div className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>{msg.text}</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'} ${
                        msg.disintegrating ? 'smoke-exit' : ''
                      }`}
                    >
                      {/* Reaction Badges Picker Popup */}
                      {activeReactionMsgId === msg.id && (
                        <div
                          className={`mb-1 p-1 bg-black/90 border border-white/20 rounded-full flex items-center gap-1 shadow-2xl z-30 ${
                            isMe ? 'self-end' : 'self-start'
                          }`}
                        >
                          {['❤️', '🔥', '👀', '⚡'].map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleReaction(msg.id, emoji)}
                              className="hover:scale-125 transition-transform text-xs px-1 cursor-pointer"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 max-w-[85%]">
                        {/* Reply Action Icon */}
                        {isMe && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)}
                              className="p-1 rounded-full bg-zinc-900 border border-white/10 text-[10px] cursor-pointer"
                              title="React"
                            >
                              🔥
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                audio.play('tap');
                              }}
                              className="p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                              title="Reply"
                            >
                              <CornerUpLeft className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        <div
                          onDoubleClick={() =>
                            setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                          }
                          className={`relative rounded-[22px] px-3.5 py-2.5 transition-all cursor-pointer ${
                            isMe
                              ? msg.whisperEffect
                                ? 'bg-gradient-to-r from-fuchsia-600 via-indigo-600 to-cyan-500 text-white rounded-br-md shadow-[0_0_25px_rgba(217,70,239,0.4)]'
                                : 'bg-gradient-to-br from-[#00F5A0] to-[#00B4D8] text-black font-medium rounded-br-md shadow-[0_8px_24px_rgba(0,245,160,0.25)]'
                              : 'bg-[#18181D] border border-white/[0.08] text-zinc-100 rounded-bl-md shadow-md'
                          }`}
                        >
                          {/* Quoted Reply Header */}
                          {msg.replyTo && (
                            <div className="mb-1.5 pl-2 border-l-2 border-emerald-400 bg-black/25 rounded-r-lg py-1 pr-2 text-[10px]">
                              <span className="font-bold text-emerald-300 block">{msg.replyTo.sender}</span>
                              <span className="opacity-80 line-clamp-1">{msg.replyTo.text}</span>
                            </div>
                          )}

                          {/* 1. TEXT CONTENT */}
                          {msg.type === 'text' && (
                            <p
                              className={`text-[13.5px] leading-snug transition-all duration-200 ${
                                isBlurred ? 'blur-md opacity-25 select-none' : 'blur-0 opacity-100'
                              }`}
                            >
                              {msg.text}
                            </p>
                          )}

                          {/* 2. LISTEN-ONCE VOICE NOTE */}
                          {msg.type === 'voice' && (
                            <div className="flex items-center gap-3 py-1 min-w-[190px]">
                              <button
                                onClick={() => handlePlayVoice(msg)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                  playingVoiceId === msg.id
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : isMe
                                    ? 'bg-black text-[#00F5A0]'
                                    : 'bg-white text-zinc-950'
                                }`}
                              >
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                              <div className="flex-1">
                                <div className="flex items-center gap-1 h-4">
                                  {[45, 90, 60, 100, 50, 80, 95, 40, 75, 60, 85, 50].map((h, i) => (
                                    <span
                                      key={i}
                                      style={{ height: `${h}%` }}
                                      className={`w-1 rounded-full ${
                                        playingVoiceId === msg.id
                                          ? 'bg-rose-400 animate-pulse'
                                          : isMe
                                          ? 'bg-black/60'
                                          : 'bg-zinc-500'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-[10px] opacity-75 font-mono mt-0.5 block">
                                  {msg.duration || '0:05'} • Listen Once
                                </span>
                              </div>
                            </div>
                          )}

                          {/* 3. EPHEMERAL PHOTO */}
                          {msg.type === 'photo' && (
                            <div className="space-y-1.5 min-w-[210px]">
                              <div className="relative rounded-xl overflow-hidden max-h-48 bg-black/40">
                                <img
                                  src={msg.previewUrl}
                                  alt="Ephemeral Snapshot"
                                  className={`w-full h-auto object-cover transition-all duration-300 ${
                                    isBlurred ? 'blur-xl scale-110 opacity-30 select-none' : 'blur-0 opacity-100'
                                  }`}
                                />
                                {isBlurred && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-black/30 backdrop-blur-sm">
                                    <Fingerprint className="w-7 h-7 text-[#00F5A0] mb-1 animate-pulse" />
                                    <span className="text-[11px] font-bold text-white">Encrypted Snapshot</span>
                                    <span className="text-[9px] text-zinc-400">Hold button below to unveil</span>
                                  </div>
                                )}
                              </div>
                              {msg.caption && (
                                <p className="text-[12px] opacity-90 font-medium">{msg.caption}</p>
                              )}
                            </div>
                          )}

                          {/* Hold-to-Reveal Fingerprint Shield Button */}
                          {msg.shielded && (
                            <div className="pt-2 border-t border-black/10 mt-1">
                              <button
                                onTouchStart={() => handleTouchStartReveal(msg.id)}
                                onTouchEnd={() => handleTouchEndReveal(msg.id, msg.timerMode === 'burn')}
                                onMouseDown={() => handleTouchStartReveal(msg.id)}
                                onMouseUp={() => handleTouchEndReveal(msg.id, msg.timerMode === 'burn')}
                                className={`w-full py-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer ${
                                  revealedIds[msg.id]
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                                    : isMe
                                    ? 'bg-black/20 border-black/30 text-black'
                                    : 'bg-[#00F5A0]/10 border-[#00F5A0]/30 text-[#00F5A0]'
                                }`}
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                                <span>
                                  {revealedIds[msg.id]
                                    ? msg.timerMode === 'burn'
                                      ? 'Burning... Release to Destroy'
                                      : 'Viewing Decrypted Content'
                                    : 'Hold Finger to Reveal'}
                                </span>
                              </button>
                            </div>
                          )}

                          {/* Message Footer: Time + Circular SVG Countdown Ring or "Waiting for Seen" */}
                          <div className="flex items-center justify-end gap-2 mt-1.5 text-[10px] opacity-85">
                            <span>{msg.time}</span>

                            {!msg.seen ? (
                              <button
                                onClick={() => markMessageSeen(activeContactId, msg.id)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 hover:bg-black/50 text-amber-300 font-medium transition-all cursor-pointer"
                                title="Tap to mark read / start burn countdown"
                              >
                                <Clock className="w-2.5 h-2.5" />
                                <span>Waiting for Seen</span>
                              </button>
                            ) : (
                              <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 text-[#00F5A0] font-mono font-bold">
                                <svg className="w-3.5 h-3.5 -rotate-90" viewBox="0 0 20 20">
                                  <circle
                                    cx="10"
                                    cy="10"
                                    r={radius}
                                    stroke="rgba(255,255,255,0.2)"
                                    strokeWidth="2.2"
                                    fill="none"
                                  />
                                  <circle
                                    cx="10"
                                    cy="10"
                                    r={radius}
                                    stroke="currentColor"
                                    strokeWidth="2.2"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                    strokeLinecap="round"
                                    fill="none"
                                  />
                                </svg>
                                <span>{msg.remainingSeconds}s</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Reply Action Icon (Right side for their messages) */}
                        {!isMe && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={() =>
                                setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                              }
                              className="p-1 rounded-full bg-zinc-900 border border-white/10 text-[10px] cursor-pointer"
                            >
                              🔥
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(msg);
                                audio.play('tap');
                              }}
                              className="p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                            >
                              <CornerUpLeft className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Displayed Emoji Reactions Badge */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div
                          className={`flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-[#18181D] border border-white/15 text-[10px] shadow-sm ${
                            isMe ? 'mr-1' : 'ml-1'
                          }`}
                        >
                          {msg.reactions.map((r, i) => (
                            <span key={i}>{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quoted Reply Banner */}
            {replyingTo && (
              <div className="px-4 py-2 bg-zinc-900 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <CornerUpLeft className="w-3.5 h-3.5 text-[#00F5A0]" />
                  <div>
                    <span className="font-bold text-[#00F5A0]">
                      Replying to {replyingTo.sender === 'me' ? 'You' : activeContact.name}
                    </span>
                    <p className="text-[11px] text-zinc-400 line-clamp-1">{replyingTo.text}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Next-Level Liquid Aurora Composer */}
            <div className="p-3 border-t border-white/5 bg-[#09090B] relative">
              {/* Send Effects Menu */}
              {showSendEffectMenu && (
                <div className="absolute right-4 bottom-16 z-40 bg-[#141419] border border-white/15 rounded-2xl p-2 shadow-2xl space-y-1.5 w-48 animate-in slide-in-from-bottom-2">
                  <span className="text-[10px] font-bold text-zinc-400 px-2 uppercase tracking-wider block">
                    Stealth Send Effects
                  </span>
                  <button
                    onClick={() => handleSendMessage('burn')}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-xs text-rose-300 font-semibold flex items-center gap-2"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>🔥 Burn on Read (4s)</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('shield')}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#00F5A0]/20 text-xs text-[#00F5A0] font-semibold flex items-center gap-2"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-[#00F5A0]" />
                    <span>🛡️ Fingerprint Blur</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('whisper')}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-fuchsia-500/20 text-xs text-fuchsia-300 font-semibold flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>⚡ Whisper Surge</span>
                  </button>
                </div>
              )}

              <div
                className={`relative rounded-3xl p-[1.5px] transition-all duration-300 ${
                  typingPulse > 0 ? 'aurora-border shadow-[0_0_20px_rgba(0,245,160,0.3)]' : 'bg-white/10'
                }`}
              >
                <div className="bg-[#121216] rounded-3xl px-3 py-1.5 flex items-center gap-2">
                  {/* Real Photo Attachment Trigger */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                    title="Send Ephemeral Snapshot (Camera or Gallery)"
                  >
                    <Camera className="w-4 h-4 text-[#00F5A0]" />
                  </button>

                  {/* Text Input */}
                  <input
                    type="text"
                    placeholder={`Whisper to ${activeContact.name}...`}
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setTypingPulse(100);
                      if (activeContact) {
                        const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
                        const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
                        NetworkService.broadcastTyping(`dm_${[cleanMe, cleanThem].sort().join('__')}`, cleanMe);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none py-1.5"
                  />

                  {/* Real Voice Recording Mic Button */}
                  <button
                    onClick={isRecording ? stopRealAudioRecording : startRealAudioRecording}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      isRecording
                        ? 'bg-rose-500 text-white animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.6)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                    title={isRecording ? `Recording (${recordSecs}s) - Tap to Send` : 'Hold/Tap Mic to Record'}
                  >
                    <Mic className="w-4 h-4" />
                  </button>

                  {/* Send Button with Press-and-Hold Send Effects */}
                  <button
                    onClick={() => handleSendMessage()}
                    onMouseDown={() => {
                      sendHoldTimerRef.current = setTimeout(() => setShowSendEffectMenu(true), 400);
                    }}
                    onMouseUp={() => {
                      if (sendHoldTimerRef.current) clearTimeout(sendHoldTimerRef.current);
                    }}
                    onTouchStart={() => {
                      sendHoldTimerRef.current = setTimeout(() => setShowSendEffectMenu(true), 400);
                    }}
                    onTouchEnd={() => {
                      if (sendHoldTimerRef.current) clearTimeout(sendHoldTimerRef.current);
                    }}
                    className="p-2 rounded-full bg-[#00F5A0] hover:bg-[#00e090] text-black shadow-[0_2px_12px_rgba(0,245,160,0.4)] transition-all cursor-pointer"
                    title="Tap to Send, Hold for Stealth Effects"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            POPOVER 1: 6-DIGIT CODE & QR SHARING POPOVER
           ========================================================= */}
        {showQrPinPopover && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-4">
            <div className="w-full bg-[#141419] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-[#00F5A0]" />
                  Zero-Trace Identity Card
                </span>
                <button
                  onClick={() => setShowQrPinPopover(false)}
                  className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Segmented Control */}
              <div className="flex items-center bg-black/50 p-1 rounded-2xl border border-white/10">
                <button
                  onClick={() => setPopoverTab('qr')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    popoverTab === 'qr' ? 'bg-[#00F5A0] text-black' : 'text-zinc-400'
                  }`}
                >
                  My QR Code
                </button>
                <button
                  onClick={() => setPopoverTab('pin')}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    popoverTab === 'pin' ? 'bg-[#00F5A0] text-black' : 'text-zinc-400'
                  }`}
                >
                  6-Digit PIN
                </button>
                <button
                  onClick={() => {
                    setPopoverTab('scan');
                    setShowCameraScanner(true);
                  }}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    popoverTab === 'scan' ? 'bg-[#00F5A0] text-black' : 'text-zinc-400'
                  }`}
                >
                  Scan QR 📸
                </button>
              </div>

              {/* Tab 1: QR Code Card */}
              {popoverTab === 'qr' && (
                <div className="text-center space-y-3 py-2">
                  <div className="w-48 h-48 bg-white rounded-2xl mx-auto p-3 flex items-center justify-center shadow-[0_10px_40px_rgba(0,245,160,0.3)]">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=blinkmsg://connect?code=${myCode}&color=000000`}
                      alt="BlinkMsg QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="font-mono text-lg font-black tracking-widest text-[#00F5A0]">
                      {myCode}
                    </span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Show this to a friend to connect with 0 traces.
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 2: 6-Digit PIN & Regenerate Button */}
              {popoverTab === 'pin' && (
                <div className="space-y-3 py-2">
                  <div className="p-4 rounded-2xl bg-black/60 border border-[#00F5A0]/30 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">
                      Your Stealth PIN
                    </span>
                    <span className="font-mono text-3xl font-extrabold tracking-[0.25em] text-[#00F5A0]">
                      {myCode}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(myCode);
                        setCopied(true);
                        audio.play('tap');
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-[#00F5A0]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied PIN' : 'Copy PIN'}</span>
                    </button>

                    {/* Regenerate Button triggers Disclaimer Modal */}
                    <button
                      onClick={() => setShowRegenerateDisclaimer(true)}
                      className="py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-semibold text-amber-300 flex items-center gap-1.5"
                      title="Regenerate 6-Digit Code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>

                  {pinSavedToast && (
                    <p className="text-center text-[10px] text-[#00F5A0] font-semibold">
                      ✓ Naya 6-digit code activate ho gaya!
                    </p>
                  )}
                </div>
              )}

              {/* Tab 3: Scan QR Launcher */}
              {popoverTab === 'scan' && (
                <div className="text-center space-y-3 py-4">
                  <Camera className="w-10 h-10 text-[#00F5A0] mx-auto animate-pulse" />
                  <p className="text-xs text-zinc-300">
                    Point your camera at a friend's BlinkMsg QR code to start chatting instantly.
                  </p>
                  <button
                    onClick={() => setShowCameraScanner(true)}
                    className="w-full py-3 rounded-xl bg-[#00F5A0] text-black font-bold text-xs shadow-lg cursor-pointer"
                  >
                    Open Live Camera Scanner 📸
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            POPOVER 2: CONNECT FRIEND BY 6-DIGIT CODE OR @HANDLE
           ========================================================= */}
        {showConnectSheet && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end justify-center p-4">
            <div className="w-full bg-[#141419] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[#00F5A0]" />
                  Connect With Friend
                </span>
                <button
                  onClick={() => setShowConnectSheet(false)}
                  className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                Enter your friend's 6-digit PIN (e.g. <span className="text-[#00F5A0] font-mono">904-112</span>) or their anonymous handle (<span className="text-[#00F5A0]">@handle</span>).
              </p>

              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter 6-digit code or @handle"
                  value={connectCodeInput}
                  onChange={(e) => setConnectCodeInput(e.target.value)}
                  className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-3 text-sm font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-[#00F5A0]/50"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowConnectSheet(false);
                      setShowCameraScanner(true);
                    }}
                    className="py-3 px-4 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-[#00F5A0]" />
                    <span>Scan QR</span>
                  </button>

                  <button
                    onClick={() => connectWithTarget(connectCodeInput)}
                    disabled={isConnecting || !connectCodeInput.trim()}
                    className="flex-1 py-3 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-bold text-xs shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isConnecting ? 'Searching Cipher...' : 'Establish Secure Channel →'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            DISCLAIMER MODAL: REGENERATE 6-DIGIT CODE
           ========================================================= */}
        {showRegenerateDisclaimer && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5">
            <div className="w-full max-w-sm bg-[#18181F] border border-amber-500/30 rounded-3xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Regenerate 6-Digit Code?</h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    Naya code banate hi aapka purana connection code expire ho jayega. Naye dost purane code se connect nahi kar payenge. Purani chats bilkul safe rahengi.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={() => setShowRegenerateDisclaimer(false)}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRegenerateCode}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-lg cursor-pointer"
                >
                  Confirm New Code
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEALTH 4-DIGIT APP LOCK OVERLAY
           ========================================================= */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-[#09090B] flex flex-col justify-between p-6">
            <div className="text-center pt-8">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 mx-auto flex items-center justify-center text-[#00F5A0] mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Encrypted Vault Locked</h2>
              <p className="text-xs text-zinc-500 mt-1">Enter your 4-Digit PIN to unlock</p>
            </div>

            {/* PIN Indicators */}
            <div className="flex items-center justify-center gap-3 my-auto">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    lockError
                      ? 'bg-rose-500 animate-bounce'
                      : lockInput.length > idx
                      ? 'bg-[#00F5A0] shadow-[0_0_12px_rgba(0,245,160,0.6)]'
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 max-w-[260px] mx-auto pb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
                <button
                  key={i}
                  disabled={!k}
                  onClick={() => {
                    if (k === '⌫') {
                      setLockInput((p) => p.slice(0, -1));
                      audio.play('tap');
                    } else if (k) {
                      handleKeyPress(k);
                    }
                  }}
                  className={`h-14 rounded-2xl text-lg font-mono font-bold flex items-center justify-center transition-all ${
                    !k
                      ? 'opacity-0'
                      : 'bg-zinc-900/80 hover:bg-zinc-800 border border-white/5 active:scale-95 text-white'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
