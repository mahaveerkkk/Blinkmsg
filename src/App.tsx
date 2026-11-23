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
  Settings,
  MoreVertical,
  Ban,
  UserMinus,
} from 'lucide-react';
import { StorageService } from './services/storage';
import { NetworkService, supabase, handleToPin } from './services/network';
import { CryptoService } from './services/crypto';
import { QRScannerModal } from './components/QRScannerModal';
import { BottomNav } from './components/BottomNav';
import { SecretVaultView } from './components/SecretVaultView';
import { ProfileView } from './components/ProfileView';
import { Avatar } from './components/Avatar';
import { UserProfile, ActiveTab, ChatRoom } from './types';
import { QRCodeSVG } from 'qrcode.react';
import { App as CapApp } from '@capacitor/app';

// ==========================================
// SUBTLE TACTILE AUDIO ENGINE
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

  play(type: 'send' | 'receive' | 'smoke' | 'tap' | 'alert') {
    if (this.muted) return;
    try {
      // Hardware tactile haptic feedback on real devices
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          if (type === 'send') navigator.vibrate(12);
          else if (type === 'receive') navigator.vibrate([15, 30, 20]);
          else if (type === 'smoke') navigator.vibrate([25, 40, 35]);
          else if (type === 'tap') navigator.vibrate(8);
          else if (type === 'alert') navigator.vibrate([60, 40, 60]);
        } catch {
          // Ignore if vibration is restricted by user agent
        }
      }

      this.init();
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
// PRESET EPHEMERAL PHOTOS & REQUESTS
// ==========================================
const EPHEMERAL_PHOTO_PRESETS = [
  {
    id: 'ep1',
    title: 'Neon Shibuya Rain',
    caption: 'Midnight Cyber Walk 🌧️⚡',
    gradient: 'from-indigo-600/50 via-purple-600/40 to-emerald-500/40',
    previewUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'ep2',
    title: 'Late Night Espresso',
    caption: 'Secret Cafe Meet ☕🤫',
    gradient: 'from-amber-500/40 via-rose-500/40 to-indigo-600/40',
    previewUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'ep3',
    title: 'Encrypted Vault Key',
    caption: 'Hardware Seed Snapshot 🔐',
    gradient: 'from-emerald-500/40 via-cyan-500/40 to-blue-600/40',
    previewUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80',
  },
];

interface ContactItem {
  id: string;
  name: string;
  handle: string;
  code: string;
  avatar: string;
  avatarId?: number;
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
  duration?: string;
  time: string;
  disintegrating?: boolean;
  everRevealed?: boolean;
  status?: 'sent' | 'delivered' | 'read';
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

const INITIAL_REQUESTS: HandshakeRequest[] = [];

const DECOY_CONTACTS: ContactItem[] = [
  {
    id: 'd1',
    name: 'Mom ❤️',
    handle: '@home_family',
    code: '101202',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    online: true,
    unread: 0,
    time: '1h',
  },
  {
    id: 'd2',
    name: 'College Study Notes',
    handle: '@uni_notes',
    code: '304551',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
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
      text: 'Beta dhaniya aur doodh lete aana shaam ko 🥛🌿',
      timerMode: '60s',
      totalSeconds: 60,
      remainingSeconds: 60,
      seen: false,
      shielded: false,
      time: '4:15 PM',
      disintegrating: false,
    },
  ],
  d2: [
    {
      id: 'dm2',
      sender: 'me',
      type: 'text',
      text: 'DBMS assignment PDF kal subah submit karni hai.',
      timerMode: '60s',
      totalSeconds: 60,
      remainingSeconds: 60,
      seen: false,
      shielded: false,
      time: 'Yesterday',
      disintegrating: false,
    },
  ],
};

const DEFAULT_CONTACTS: ContactItem[] = [];
const DEFAULT_CHATS: Record<string, MessageItem[]> = {};

const INITIAL_CONTACTS: ContactItem[] = DEFAULT_CONTACTS;
const INITIAL_CHATS: Record<string, MessageItem[]> = DEFAULT_CHATS;

export const App: React.FC = () => {
  // Navigation: 'onboarding' | 'list' | 'chat'
  const [screen, setScreen] = useState<'onboarding' | 'list' | 'chat'>(() => {
    return StorageService.getProfile() ? 'list' : 'onboarding';
  });

  // Active Tab for Main Navigation: 'chats' (Messages) | 'vault' (Connect) | 'profile' (Settings)
  const [activeTab, setActiveTab] = useState<ActiveTab>('chats');

  const [activeContactId, setActiveContactId] = useState<string>(() => {
    const saved = localStorage.getItem('blink_active_contact_id');
    return (saved && saved !== 'c1') ? saved : '';
  });
  const [contacts, setContacts] = useState<ContactItem[]>(() => {
    const saved = localStorage.getItem('blink_contacts_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out any legacy dummy mock contacts
          return parsed.filter((c: any) => c && c.id !== 'c1' && c.id !== 'c2' && c.id !== 'c3');
        }
      } catch {}
    }
    return DEFAULT_CONTACTS;
  });
  const [chats, setChats] = useState<Record<string, MessageItem[]>>(() => {
    const saved = localStorage.getItem('blink_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) return parsed;
      } catch {}
    }
    return DEFAULT_CHATS;
  });
  const [pendingRequests, setPendingRequests] = useState<HandshakeRequest[]>(() => {
    const saved = localStorage.getItem('blink_pending_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    return [];
  });
  const [showRequestsDrawer, setShowRequestsDrawer] = useState<boolean>(true);

  // User Identity & Privacy Controls
  const [myCode, setMyCode] = useState<string>(() => {
    const saved = localStorage.getItem('blink_user_code');
    if (saved && /^\d{6}$/.test(saved.trim())) {
      return saved.trim();
    }
    const p = StorageService.getProfile();
    if (p?.pin && /^\d{6}$/.test(p.pin.trim())) {
      localStorage.setItem('blink_user_code', p.pin.trim());
      return p.pin.trim();
    }
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem('blink_user_code', newCode);
    return newCode;
  });
  const [myHandle, setMyHandle] = useState<string>(() => {
    const p = StorageService.getProfile();
    return p ? `@${p.handle}` : '@vanish_857';
  });
  const [recoveryPin, setRecoveryPin] = useState<string>(() => {
    return localStorage.getItem('blink_recovery_pin') || '2580';
  });
  const [decoyPin] = useState<string>('0000');
  const [decoyModeActive, setDecoyModeActive] = useState<boolean>(false);
  const [ghostMode, setGhostMode] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [autoSeenSim, setAutoSeenSim] = useState<boolean>(false);
  const [screenshotToast, setScreenshotToast] = useState<string | null>(null);

  // Blocked Users & Contact Actions State
  const [blockedUsers, setBlockedUsers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('blink_blocked_users');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [actionContact, setActionContact] = useState<ContactItem | null>(null);
  const [showChatOptions, setShowChatOptions] = useState<boolean>(false);

  // Onboarding & Account Restore State
  const [isGeneratingId, setIsGeneratingId] = useState<boolean>(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState<boolean>(false);
  const [restoreHandleInput, setRestoreHandleInput] = useState<string>('@vanish_857');
  const [restorePinInput, setRestorePinInput] = useState<string>('');
  const [restoreSuccess, setRestoreSuccess] = useState<boolean>(false);

  // Dedicated Onboarding Setup Form State (Unique Handle & Real Name)
  const [setupDisplayName, setSetupDisplayName] = useState<string>(() => {
    return StorageService.getProfile()?.displayName || '';
  });
  const [setupHandle, setSetupHandle] = useState<string>(() => {
    return (StorageService.getProfile()?.handle || '').replace(/^@/, '');
  });
  const [handleCheckStatus, setHandleCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');

  // Sleek Popovers & Overlays
  const [showQrPinPopover, setShowQrPinPopover] = useState<boolean>(false);
  const [popoverTab, setPopoverTab] = useState<'qr' | 'pin' | 'connect'>('qr');
  const [copied, setCopied] = useState<boolean>(false);
  const [pinSavedToast, setPinSavedToast] = useState<boolean>(false);
  const [showConnectSheet, setShowConnectSheet] = useState<boolean>(false);
  const [connectCodeInput, setConnectCodeInput] = useState<string>('');
  const [searchTargetProfile, setSearchTargetProfile] = useState<UserProfile | null>(null);
  const [isSearchingTarget, setIsSearchingTarget] = useState<boolean>(false);
  const [targetSearchError, setTargetSearchError] = useState<string | null>(null);
  const [handshakeSentToast, setHandshakeSentToast] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCameraModal, setShowCameraModal] = useState<boolean>(false);

  // Disclaimer Popup on Regenerating Code
  const [showRegenerateDisclaimer, setShowRegenerateDisclaimer] = useState<boolean>(false);

  // Full User Profile memoized for Connect & Vault features
  const myFullProfile: UserProfile = useMemo(() => {
    const myClean = myHandle.replace(/^@/, '').toLowerCase();
    const stored = StorageService.getProfile();
    return {
      id: stored?.id || ('usr_' + myClean),
      handle: myClean,
      displayName: stored?.displayName || myHandle.replace(/^@/, ''),
      avatarId: stored?.avatarId || 1,
      vibe: stored?.vibe || '⚡ Stealth Tunnel',
      isAvailable: stored?.isAvailable ?? true,
      country: stored?.country || '',
      state: stored?.state || '',
      city: stored?.city || '',
      lastActive: Date.now(),
      pin: myCode.replace(/\D/g, '') || handleToPin(myClean),
    };
  }, [myHandle, myCode]);

  // Panic Burn Popover State
  const [showPanicPopover, setShowPanicPopover] = useState<boolean>(false);
  const [isBurningAll, setIsBurningAll] = useState<boolean>(false);

  // Stealth 4-Digit App Lock Screen
  const [isLocked, setIsLocked] = useState<boolean>(() => {
    return localStorage.getItem('blink_app_lock_active') === 'true';
  });
  const [lockInput, setLockInput] = useState<string>('');
  const [lockError, setLockError] = useState<boolean>(false);

  // Next-Level Liquid Aurora Composer State
  const [messageText, setMessageText] = useState<string>('');
  const [timerMode, setTimerMode] = useState<'10s' | '30s' | '60s' | 'burn'>('30s');
  const [showTimerMenu, setShowTimerMenu] = useState<boolean>(false);
  const [shieldMode, setShieldMode] = useState<boolean>(false);
  const [typingPulse, setTypingPulse] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordSecs, setRecordSecs] = useState<number>(0);

  // Advanced Chat Features: Remote Typing, Reply, Reactions, Send Effects, Photo Drawer
  const [remoteTyping, setRemoteTyping] = useState<boolean>(false);
  const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showSendEffectMenu, setShowSendEffectMenu] = useState<boolean>(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState<boolean>(false);
  const [customPhotoCaption, setCustomPhotoCaption] = useState<string>('');

  // Interactive Bubble States
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [inAppBanner, setInAppBanner] = useState<{ name: string; code: string; text: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const sendHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const activeAudioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const activeContactIdRef = useRef(activeContactId);
  activeContactIdRef.current = activeContactId;
  const decoyModeActiveRef = useRef(decoyModeActive);
  decoyModeActiveRef.current = decoyModeActive;

  const activeContactsList = decoyModeActive ? DECOY_CONTACTS : contacts;
  const activeChatsMap = decoyModeActive ? DECOY_CHATS : chats;
  const fallbackContact: ContactItem = {
    id: 'placeholder',
    name: 'Stealth Chat',
    handle: '@peer',
    code: '000000',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    online: false,
    unread: 0,
    time: 'Now',
  };
  const activeContact = activeContactsList.find((c) => c.id === activeContactId) || activeContactsList[0] || fallbackContact;
  const currentMessages = activeChatsMap[activeContact?.id] || [];

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

  useEffect(() => {
    localStorage.setItem('blink_blocked_users', JSON.stringify(blockedUsers));
  }, [blockedUsers]);

  const handleToggleBlock = (targetHandle: string) => {
    const clean = targetHandle.replace(/^@/, '').toLowerCase().trim();
    if (!clean) return;
    setBlockedUsers((prev) => {
      const isBlocked = prev.includes(clean);
      const next = isBlocked ? prev.filter((h) => h !== clean) : [...prev, clean];
      audio.play(isBlocked ? 'receive' : 'alert');
      return next;
    });
  };

  const handleClearChatHistory = (contactId: string) => {
    audio.play('smoke');
    setChats((prev) => ({
      ...prev,
      [contactId]: [],
    }));
  };

  const handleRemoveContact = (contactId: string) => {
    audio.play('smoke');
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    setChats((prev) => {
      const next = { ...prev };
      delete next[contactId];
      return next;
    });
    if (activeContactId === contactId) {
      setScreen('list');
      setActiveContactId('');
    }
  };

  useEffect(() => {
    if (activeContactId) {
      localStorage.setItem('blink_active_contact_id', activeContactId);
    }
  }, [activeContactId]);

  // Persist contacts, chats, and requests
  useEffect(() => {
    localStorage.setItem('blink_contacts_list', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('blink_chat_history', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('blink_pending_requests', JSON.stringify(pendingRequests));
  }, [pendingRequests]);

  // Live Debounced @Handle Availability Check for Setup / Onboarding
  useEffect(() => {
    const clean = setupHandle.trim().toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_]/g, '');
    if (!clean) {
      setHandleCheckStatus('idle');
      return;
    }
    if (clean.length < 3) {
      setHandleCheckStatus('invalid');
      return;
    }
    const currentMy = (StorageService.getProfile()?.handle || '').replace(/^@/, '').toLowerCase();
    if (clean === currentMy && currentMy) {
      setHandleCheckStatus('available');
      return;
    }
    setHandleCheckStatus('checking');
    const timer = setTimeout(async () => {
      const isFree = await NetworkService.checkHandleAvailability(clean);
      setHandleCheckStatus(isFree ? 'available' : 'taken');
    }, 350);
    return () => clearTimeout(timer);
  }, [setupHandle]);

  // Real-Time Heartbeat: Keep current user's last_seen fresh while app is open
  useEffect(() => {
    if (ghostMode) return;
    const sendHeartbeat = () => {
      const p = StorageService.getProfile();
      if (p) {
        NetworkService.syncProfileToSupabase(p).catch(() => {});
      }
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 45000);
    return () => clearInterval(interval);
  }, [ghostMode]);

  // Periodic Real-Time Peer Online Status Sync (every 15s)
  useEffect(() => {
    if (contacts.length === 0) return;
    const checkPeerStatus = async () => {
      let changed = false;
      const updated = await Promise.all(
        contacts.map(async (c) => {
          const cleanH = c.handle.replace(/^@/, '').toLowerCase();
          const { isOnline } = await NetworkService.checkPeerOnlineStatus(cleanH);
          if (c.online !== isOnline) {
            changed = true;
            return { ...c, online: isOnline };
          }
          return c;
        })
      );
      if (changed) {
        setContacts(updated);
      }
    };
    checkPeerStatus();
    const interval = setInterval(checkPeerStatus, 15000);
    return () => clearInterval(interval);
  }, [contacts.length, screen, activeContactId]);

  // Sync profile to Supabase
  useEffect(() => {
    const clean = myHandle.replace(/^@/, '');
    const p: UserProfile = {
      id: 'usr_' + clean,
      handle: clean,
      displayName: myHandle,
      avatarId: 1,
      vibe: '⚡ Stealth Tunnel',
      isAvailable: !ghostMode,
      country: 'India',
      state: '',
      city: '',
      lastActive: Date.now(),
      pin: myCode.replace(/\D/g, ''),
    };
    NetworkService.syncProfileToSupabase(p).catch(() => {});
  }, [myHandle, myCode, ghostMode]);

  // Realtime Screenshot Detection (Detects PrintScreen & Win/Mac Snip Shortcuts & Native Android Captures)
  useEffect(() => {
    if (screen !== 'chat' || !activeContact || activeContact.id === 'placeholder') return;

    const handleScreenshotEvent = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen';
      const isWinSnip = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's');
      const isMacSnip = e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5');
      const isAltPrintScreen = e.altKey && e.key === 'PrintScreen';

      if (isPrintScreen || isWinSnip || isMacSnip || isAltPrintScreen) {
        // Silent Stealth: The taker sees NOTHING, but the peer receives encrypted alert!
        const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
        const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
        const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
        NetworkService.broadcastScreenshotAlert(normRoomId, cleanMe, cleanThem);
      }
    };

    const handleNativeScreenshot = () => {
      // Silent Stealth: The taker sees NOTHING, but the peer receives encrypted alert!
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastScreenshotAlert(normRoomId, cleanMe, cleanThem);
    };

    window.addEventListener('keyup', handleScreenshotEvent);
    window.addEventListener('nativeScreenshotTaken', handleNativeScreenshot);
    return () => {
      window.removeEventListener('keyup', handleScreenshotEvent);
      window.removeEventListener('nativeScreenshotTaken', handleNativeScreenshot);
    };
  }, [screen, activeContact, myHandle]);

  // Live Supabase Global Inbox Subscription (Realtime Pushes for Incoming Messages & Handshakes)
  useEffect(() => {
    if (!myHandle) return;
    const cleanHandle = myHandle.replace(/^@/, '').toLowerCase().trim();

    const unsubscribe = NetworkService.subscribeToInbox(cleanHandle, {
      onIncomingMessage: async (payload: any) => {
        const { message, room } = payload || {};
        if (!message) return;

        const peerHandleRaw = room?.peerHandle || message.senderHandle;
        const peerClean = (peerHandleRaw || '').replace(/^@/, '').toLowerCase();
        if (!peerClean || peerClean === cleanHandle) return;

        // Silently drop messages from blocked users
        if (blockedUsers.includes(peerClean)) return;

        const peerDisplayName = room?.peerDisplayName || message.senderDisplayName || peerClean;
        const contactId = 'c_' + peerClean;
        const isCurrentChat = activeContactIdRef.current === contactId && screenRef.current === 'chat';

        // Ensure contact exists in contacts list
        setContacts((prev) => {
          const exists = prev.find((c) => c.handle.replace(/^@/, '').toLowerCase() === peerClean);
          const updatedContact: ContactItem = exists
            ? {
                ...exists,
                name: peerDisplayName || exists.name,
                unread: isCurrentChat ? 0 : (exists.unread || 0) + 1,
                time: 'Just now',
                online: true,
              }
            : {
                id: contactId,
                name: peerDisplayName,
                handle: `@${peerClean}`,
                code: handleToPin(peerClean).slice(0, 6),
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                color: 'from-emerald-500 to-teal-500',
                online: true,
                unread: isCurrentChat ? 0 : 1,
                time: 'Just now',
              };
          return [updatedContact, ...prev.filter((c) => c.handle.replace(/^@/, '').toLowerCase() !== peerClean)];
        });

        // Add message to chats with decryption & media support
        const normRoomId = room?.id || `dm_${[cleanHandle, peerClean].sort().join('__')}`;
        const totalSecs = message.timerSeconds || 30;
        const isBurn = message.isBurnOnRead || false;
        const mediaPayload = message.mediaUrl || message.previewUrl || (message.ciphertext?.startsWith('data:') ? message.ciphertext : undefined);
        const isPhoto = Boolean(mediaPayload?.startsWith('data:image') || message.type === 'photo');
        const isVoice = message.type === 'voice' || message.iv === 'voice' || Boolean(mediaPayload?.startsWith('data:audio'));

        let plainText = message.text || '';
        if (!isPhoto && !isVoice) {
          if (message.ciphertext && message.iv && message.iv !== 'direct') {
            try {
              const roomKey = await CryptoService.deriveKeyFromCode(normRoomId);
              plainText = await CryptoService.decrypt(message.ciphertext, message.iv, roomKey);
            } catch {
              plainText = message.text || message.ciphertext || '';
            }
          } else if (message.ciphertext) {
            plainText = message.ciphertext;
          }
        } else {
          plainText = isPhoto ? '📷 Ephemeral Photo' : (message.text || '🎤 Voice Note');
        }

        const msgItem: MessageItem = {
          id: message.id || 'msg_' + Date.now(),
          sender: 'them',
          type: isPhoto ? 'photo' : (isVoice ? 'voice' : 'text'),
          text: plainText,
          previewUrl: mediaPayload,
          caption: message.caption,
          duration: message.duration || '0:04',
          timerMode: isBurn ? 'burn' : (`${totalSecs}s` as any),
          totalSeconds: totalSecs,
          remainingSeconds: totalSecs,
          seen: isCurrentChat,
          shielded: message.isHoldToReveal ?? true,
          reactions: [],
          time: new Date(message.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          disintegrating: false,
        };

        setChats((prev) => {
          const existing = prev[contactId] || [];
          if (existing.some((m) => m.id === msgItem.id)) return prev;
          return {
            ...prev,
            [contactId]: [...existing, msgItem],
          };
        });

        if (!decoyModeActiveRef.current) {
          audio.play('receive');
        }

        // Immediately send delivery or read acknowledgement back to sender
        const ackStatus = isCurrentChat && !msgItem.shielded ? 'read' : 'delivered';
        NetworkService.broadcastDeliveryAck(normRoomId, msgItem.id, ackStatus, peerClean).catch(() => {});

        // Top alert banner if not actively viewing this chat and NOT in decoy mode
        if (!decoyModeActiveRef.current && !isCurrentChat) {
          setInAppBanner({
            name: peerDisplayName,
            code: handleToPin(peerClean).slice(0, 6),
            text: isPhoto ? '📷 Sent a secret photo' : (isVoice ? '🎤 Sent a voice note' : plainText.slice(0, 45)),
          });
          setTimeout(() => setInAppBanner(null), 5000);
        }
      },

      onDeliveryAck: (data: any) => {
        if (!data?.msgId || !data?.status) return;
        setChats((prev) => {
          let changed = false;
          const next = { ...prev };
          Object.keys(next).forEach((cId) => {
            next[cId] = (next[cId] || []).map((m) => {
              if (data.msgId === 'all' || m.id === data.msgId) {
                changed = true;
                return {
                  ...m,
                  status: data.status,
                  seen: data.status === 'read' ? true : m.seen,
                };
              }
              return m;
            });
          });
          return changed ? next : prev;
        });
      },

      onHandshakeRequest: (payload: any) => {
        const { fromUser } = payload || {};
        if (!fromUser) return;
        const reqHandle = (fromUser.handle || '').replace(/^@/, '').toLowerCase();
        if (reqHandle === cleanHandle) return;

        const req: HandshakeRequest = {
          id: 'req_' + reqHandle,
          name: fromUser.displayName || reqHandle,
          handle: `@${reqHandle}`,
          code: fromUser.code || handleToPin(reqHandle).slice(0, 6),
          avatar: fromUser.avatar || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
          via: 'Entered your 6-Digit Code',
          time: 'Just now',
        };

        setPendingRequests((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
        audio.play('alert');
        setInAppBanner({
          name: req.name,
          code: req.code,
          text: `Connection Request from ${req.name}!`,
        });
        setTimeout(() => setInAppBanner(null), 5000);
      },

      onHandshakeAccepted: (payload: any) => {
        const { fromUser } = payload || {};
        if (!fromUser) return;
        const pHandle = (fromUser.handle || '').replace(/^@/, '').toLowerCase();
        const cId = 'c_' + pHandle;
        const newContact: ContactItem = {
          id: cId,
          name: fromUser.displayName || pHandle,
          handle: `@${pHandle}`,
          code: fromUser.code || handleToPin(pHandle).slice(0, 6),
          avatar: fromUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
          color: 'from-emerald-500 to-teal-500',
          online: true,
          unread: 0,
          time: 'Just now',
        };
        setContacts((prev) => [newContact, ...prev.filter((c) => c.handle.toLowerCase() !== `@${pHandle}`)]);
        audio.play('receive');
        setInAppBanner({
          name: newContact.name,
          code: newContact.code,
          text: `${newContact.name} accepted your handshake request!`,
        });
        setTimeout(() => setInAppBanner(null), 5000);
      },

      onPeerConnected: (payload: any) => {
        if (!payload?.handle) return;
        const pHandle = payload.handle.replace(/^@/, '').toLowerCase();
        if (pHandle === cleanHandle) return;
        const cId = 'c_' + pHandle;
        setContacts((prev) => {
          const exists = prev.find((c) => c.handle.replace(/^@/, '').toLowerCase() === pHandle);
          if (exists) return prev;
          const newC: ContactItem = {
            id: cId,
            name: payload.displayName || pHandle,
            handle: `@${pHandle}`,
            code: handleToPin(pHandle).slice(0, 6),
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            color: 'from-emerald-500 to-teal-500',
            online: true,
            unread: 0,
            time: 'Just now',
          };
          return [newC, ...prev];
        });
        audio.play('receive');
      },

      onScreenshotAlert: (payload: any) => {
        const peerHandleRaw = payload?.handle;
        if (!peerHandleRaw) return;
        const peerClean = peerHandleRaw.replace(/^@/, '').toLowerCase().trim();
        if (peerClean === cleanHandle) return; // Stealth mode: zero feedback for taker!

        audio.play('alert');
        setScreenshotToast(`🛡️ @${peerClean} attempted to take a screenshot!`);
        setTimeout(() => setScreenshotToast(null), 5000);

        const contactId = 'c_' + peerClean;
        const alertMsg: MessageItem = {
          id: 'sys_' + Date.now(),
          sender: 'system',
          type: 'screenshot_alert',
          text: `🛡️ Screenshot attempt by @${peerClean} detected and blocked by Phantom Shield`,
          seen: true,
          totalSeconds: 60,
          remainingSeconds: 60,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setChats((prev) => ({
          ...prev,
          [contactId]: [...(prev[contactId] || []), alertMsg],
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [myHandle, screen, activeContactId]);

  // Auto-start countdown on incoming unshielded messages when viewing chat
  useEffect(() => {
    if (screen === 'chat' && activeContact?.id && activeContact.id !== 'placeholder') {
      setChats((prev) => {
        const list = prev[activeContact.id] || [];
        let changed = false;
        const updated = list.map((m) => {
          // ONLY incoming messages from partner ('them') are marked seen upon receiver viewing
          // Outgoing messages ('me') remain seen: false until receiver sends 'read' ACK
          if (m.sender === 'them' && !m.seen && !m.shielded) {
            changed = true;
            return { ...m, seen: true };
          }
          return m;
        });
        return changed ? { ...prev, [activeContact.id]: updated } : prev;
      });

      // Clear unread counter on contact
      setContacts((prev) =>
        prev.map((c) => (c.id === activeContact.id ? { ...c, unread: 0 } : c))
      );

      // Broadcast read receipt directly to partner
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastDeliveryAck(normRoomId, 'all', 'read', cleanThem).catch(() => {});
    }
  }, [screen, activeContact?.id]);

  // Live Peer Lookup when typing in Connect Sheet
  useEffect(() => {
    if (!showConnectSheet) {
      setSearchTargetProfile(null);
      setTargetSearchError(null);
      return;
    }

    const raw = connectCodeInput.trim();
    const cleanDigits = raw.replace(/\D/g, '');
    const cleanHandle = raw.replace(/^@/, '').trim();

    if (cleanDigits.length < 6 && cleanHandle.length < 3) {
      setSearchTargetProfile(null);
      setTargetSearchError(null);
      setIsSearchingTarget(false);
      return;
    }

    setIsSearchingTarget(true);
    setTargetSearchError(null);

    const timer = setTimeout(async () => {
      try {
        const found = await NetworkService.findProfileByPin(raw);
        if (found) {
          if (found.handle.toLowerCase() === myHandle.replace(/^@/, '').toLowerCase()) {
            setTargetSearchError('This is your own code / handle!');
            setSearchTargetProfile(null);
          } else {
            setSearchTargetProfile(found);
            setTargetSearchError(null);
          }
        } else {
          setSearchTargetProfile(null);
          if (cleanDigits.length === 6) {
            setTargetSearchError(`No online peer found with PIN ${cleanDigits}.`);
          }
        }
      } catch {
        setTargetSearchError('Failed to query stealth network.');
      } finally {
        setIsSearchingTarget(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [connectCodeInput, showConnectSheet, myHandle]);

  // Live Supabase Room Subscription (Messages, Typing, Delivery ACK, Screenshot Alerts)
  useEffect(() => {
    if (screen !== 'chat' || !activeContact || decoyModeActive || activeContact.id === 'placeholder') {
      return;
    }

    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
    const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

    const unsubscribe = NetworkService.subscribeToRoom(normRoomId, {
      onMessage: async (payload: any) => {
        if (!payload) return;
        const senderHandle = (payload.senderHandle || '').toLowerCase();
        if (senderHandle === cleanMe) return;

        const total = payload.timerSeconds || 30;
        const isVoice = payload.iv === 'voice' || payload.ciphertext?.startsWith('🎤');
        const isPhoto = Boolean(payload.mediaUrl);

        let plainText = payload.ciphertext || payload.text || '';
        if (payload.iv && payload.iv !== 'direct' && payload.iv !== 'voice' && payload.iv !== 'photo') {
          try {
            const roomKey = await CryptoService.deriveKeyFromCode(normRoomId);
            plainText = await CryptoService.decrypt(payload.ciphertext, payload.iv, roomKey);
          } catch {
            plainText = payload.ciphertext || payload.text || '';
          }
        }

        const incomingMsg: MessageItem = {
          id: payload.id || 'msg_' + Date.now(),
          sender: 'them',
          type: isPhoto ? 'photo' : (isVoice ? 'voice' : 'text'),
          text: plainText,
          previewUrl: payload.mediaUrl,
          caption: payload.caption,
          duration: payload.audioDuration ? `0:0${payload.audioDuration}` : '0:04',
          timerMode: payload.isBurnOnRead ? 'burn' : (`${total}s` as any),
          totalSeconds: total,
          remainingSeconds: total,
          seen: !payload.isHoldToReveal,
          shielded: payload.isHoldToReveal ?? false,
          reactions: [],
          status: 'delivered',
          time: new Date(payload.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          disintegrating: false,
        };

        audio.play('receive');
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: [
            ...(prev[activeContact.id] || []).filter((m) => m.id !== incomingMsg.id),
            incomingMsg,
          ],
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);

        // Broadcast read ACK immediately because receiver is actively viewing the chat screen!
        NetworkService.broadcastDeliveryAck(normRoomId, incomingMsg.id, 'read', cleanThem);
      },

      onTyping: (handle: string) => {
        if (handle && handle.toLowerCase() !== cleanMe) {
          setRemoteTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setRemoteTyping(false), 2500);
        }
      },

      onReaction: (data: { msgId: string; reaction?: string }) => {
        if (!data?.msgId || !data?.reaction) return;
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: (prev[activeContact.id] || []).map((m) => {
            if (m.id !== data.msgId) return m;
            const existing = m.reactions || [];
            return existing.includes(data.reaction!)
              ? m
              : { ...m, reactions: [...existing, data.reaction!] };
          }),
        }));
      },

      onScreenshotAlert: (data: { handle: string }) => {
        const cleanAlertHandle = (data?.handle || '').replace(/^@/, '').toLowerCase().trim();
        if (cleanAlertHandle === cleanMe) {
          // Stealth mode: The screenshot taker gets ZERO feedback (no sound, no alert banner)
          return;
        }

        audio.play('alert');
        const peerHandle = data?.handle
          ? data.handle.startsWith('@')
            ? data.handle
            : `@${data.handle}`
          : activeContact.handle;
        setScreenshotToast(`🛡️ ${peerHandle} attempted to take a screenshot!`);
        setTimeout(() => setScreenshotToast(null), 4500);

        const alertMsg: MessageItem = {
          id: 'sys_' + Date.now(),
          sender: 'system',
          type: 'screenshot_alert',
          text: `🛡️ Screenshot attempt by ${peerHandle} detected and blocked by Phantom Shield`,
          seen: true,
          totalSeconds: 60,
          remainingSeconds: 60,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setChats((prev) => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), alertMsg],
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      },

      onDeliveryAck: (data: { msgId: string; status: 'delivered' | 'read' }) => {
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: (prev[activeContact.id] || []).map((m) => {
            if (data.msgId === 'all' || m.id === data.msgId) {
              return {
                ...m,
                status: data.status,
                seen: data.status === 'read' ? true : m.seen,
              };
            }
            return m;
          }),
        }));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [screen, activeContactId, activeContact, myHandle, decoyModeActive]);

  // Auto-lock when minimized/hidden only if explicitly enabled by user
  useEffect(() => {
    const handleVis = () => {
      if (document.visibilityState === 'hidden' && localStorage.getItem('blink_app_lock_enabled') === 'true') {
        setIsLocked(true);
        localStorage.setItem('blink_app_lock_active', 'true');
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => document.removeEventListener('visibilitychange', handleVis);
  }, []);

  // Native Android Hardware Back Button Handling
  useEffect(() => {
    let backSub: any = null;
    try {
      CapApp.addListener('backButton', () => {
        if (showCameraModal) {
          setShowCameraModal(false);
        } else if (showQrPinPopover) {
          setShowQrPinPopover(false);
        } else if (showConnectSheet) {
          setShowConnectSheet(false);
        } else if (showRequestsDrawer) {
          setShowRequestsDrawer(false);
        } else if (screen === 'chat') {
          setScreen('list');
        } else {
          CapApp.exitApp();
        }
      }).then((sub) => {
        backSub = sub;
      });
    } catch {}

    return () => {
      if (backSub && backSub.remove) backSub.remove();
    };
  }, [showCameraModal, showQrPinPopover, showConnectSheet, showRequestsDrawer, screen]);

  // Smoothly decay typing aurora pulse
  useEffect(() => {
    if (typingPulse <= 0) return;
    const t = setTimeout(() => setTypingPulse((p) => Math.max(0, p - 15)), 120);
    return () => clearTimeout(t);
  }, [typingPulse]);

  // Voice recording counter
  useEffect(() => {
    if (!isRecording) {
      setRecordSecs(0);
      return;
    }
    const iv = setInterval(() => setRecordSecs((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [isRecording]);

  // Master 1-Second Countdown Engine (Only ticks for seen === true)
  useEffect(() => {
    const iv = setInterval(() => {
      setChats((prev) => {
        let updated = false;
        const next = { ...prev };

        Object.keys(next).forEach((cId) => {
          next[cId] = next[cId].map((msg) => {
            if (!msg.seen || msg.disintegrating) return msg;
            // If shielded + burn-on-read, wait until held at least once
            if (msg.shielded && msg.timerMode === 'burn' && !msg.everRevealed) {
              return msg;
            }

            if (msg.remainingSeconds > 1) {
              updated = true;
              return { ...msg, remainingSeconds: msg.remainingSeconds - 1 };
            } else {
              updated = true;
              audio.play('smoke');
              setTimeout(() => {
                setChats((latest) => ({
                  ...latest,
                  [cId]: (latest[cId] || []).filter((m) => m.id !== msg.id),
                }));
              }, 450);
              return { ...msg, remainingSeconds: 0, disintegrating: true };
            }
          });
        });

        return updated ? next : prev;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  const getSeconds = (mode: string) => {
    if (mode === '10s') return 10;
    if (mode === '30s') return 30;
    if (mode === '60s') return 60;
    if (mode === 'burn') return 3;
    return 30;
  };

  // Slot-Machine 6-Digit Secret Code Generator (Onboarding)
  const handleSlotGenerateCode = () => {
    audio.play('tap');
    setIsGeneratingId(true);
    let ticks = 0;
    const GHOST_NAMES = ['phantom', 'falcon', 'specter', 'shadow', 'cipher', 'pulsar', 'vortex'];
    const iv = setInterval(() => {
      ticks++;
      const randomName = GHOST_NAMES[Math.floor(Math.random() * GHOST_NAMES.length)];
      const randomNum = Math.floor(100 + Math.random() * 899);
      const newHandle = `@${randomName}_${randomNum}`;
      setMyHandle(newHandle);
      const pin = handleToPin(`${randomName}_${randomNum}`).slice(0, 6);
      setMyCode(pin);
      audio.play('tap');
      if (ticks >= 8) {
        clearInterval(iv);
        setIsGeneratingId(false);
        audio.play('receive');
      }
    }, 65);
  };

  // Confirm Regenerate Code from Disclaimer Popup
  const confirmRegenerateCode = () => {
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    setMyCode(newPin);
    localStorage.setItem('blink_user_code', newPin);
    setShowRegenerateDisclaimer(false);
    audio.play('receive');
  };

  const handleResetAccount = () => {
    StorageService.clearAll();
    localStorage.clear();
    window.location.reload();
  };

  // Restore Account with @handle + 4-Digit Recovery PIN
  const handleRestoreAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (restorePinInput.length < 4) return;
    audio.play('receive');
    setMyHandle(restoreHandleInput.startsWith('@') ? restoreHandleInput : `@${restoreHandleInput}`);
    setRecoveryPin(restorePinInput);
    setRestoreSuccess(true);
    setTimeout(() => {
      setRestoreSuccess(false);
      setShowRestoreSheet(false);
      setScreen('list');
    }, 900);
  };

  // Accept or Ignore Pending Handshake Request
  const handleAcceptRequest = (req: HandshakeRequest) => {
    audio.play('receive');
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    const cleanReqHandle = req.handle.replace(/^@/, '').toLowerCase();
    const contactId = 'c_' + cleanReqHandle;
    const newContact: ContactItem = {
      id: contactId,
      name: req.name,
      handle: req.handle.startsWith('@') ? req.handle : `@${req.handle}`,
      code: req.code,
      avatar: req.avatar,
      color: 'from-emerald-500 to-teal-500',
      online: true,
      unread: 0,
      time: 'Just now',
    };
    setContacts((prev) => [newContact, ...prev.filter((c) => c.handle.toLowerCase() !== req.handle.toLowerCase())]);
    setChats((prev) => ({
      ...prev,
      [contactId]: prev[contactId] || [
        {
          id: 'req_msg_' + Date.now(),
          sender: 'them',
          type: 'text',
          text: `Hey! Handshake accepted via code ${req.code}. Zero-login stealth tunnel is live 🔒✨`,
          timerMode: '30s',
          totalSeconds: 30,
          remainingSeconds: 30,
          seen: true,
          shielded: false,
          reactions: ['⚡'],
          time: 'Just now',
          disintegrating: false,
        },
      ],
    }));
    setActiveContactId(contactId);
    setScreen('chat');

    // Notify partner that request was accepted
    const myClean = myHandle.replace(/^@/, '').toLowerCase();
    const myFullProfile: UserProfile = {
      id: 'usr_' + myClean,
      handle: myClean,
      displayName: myHandle.replace(/^@/, ''),
      avatarId: 1,
      vibe: '⚡ Stealth Tunnel',
      isAvailable: true,
      country: 'India',
      state: '',
      city: '',
      lastActive: Date.now(),
      pin: myCode.replace(/\D/g, ''),
    };
    NetworkService.sendHandshakeAccept(cleanReqHandle, myFullProfile).catch(() => {});
  };

  const handleIgnoreRequest = (reqId: string) => {
    audio.play('smoke');
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  // Send Text Message (Supports Special Effects: normal, burn, shield, whisper)
  const handleSend = (e?: React.FormEvent | null, forcedEffect: string | null = null) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    const chosenTimer = (forcedEffect === 'burn' ? 'burn' : timerMode) as '10s' | '30s' | '60s' | 'burn';
    const chosenShield = forcedEffect === 'shield' || forcedEffect === 'burn' ? true : shieldMode;
    const isWhisper = forcedEffect === 'whisper';

    const total = getSeconds(chosenTimer);
    const newId = 'msg_' + Date.now();
    const newMsg: MessageItem = {
      id: newId,
      sender: 'me',
      type: 'text',
      text: messageText.trim(),
      timerMode: chosenTimer,
      totalSeconds: total,
      remainingSeconds: total,
      seen: false,
      shielded: chosenShield,
      whisperEffect: isWhisper,
      replyTo: replyingTo
        ? {
            sender: replyingTo.sender === 'me' ? 'You' : activeContact.name,
            text: replyingTo.text,
          }
        : null,
      reactions: [],
      status: 'sent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false,
    };

    audio.play('send');
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg],
    }));
    setMessageText('');
    setReplyingTo(null);
    setShowTimerMenu(false);
    setShowSendEffectMenu(false);
    setShieldMode(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // Broadcast to Supabase Realtime with Hardware AES-256-GCM Encryption
    if (activeContact && !decoyModeActive) {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;

      (async () => {
        let wireCipher = newMsg.text;
        let wireIv = 'direct';
        try {
          const roomKey = await CryptoService.deriveKeyFromCode(normRoomId);
          const encrypted = await CryptoService.encrypt(newMsg.text, roomKey);
          wireCipher = encrypted.ciphertext;
          wireIv = encrypted.iv;
        } catch {
          wireCipher = newMsg.text;
          wireIv = 'direct';
        }

        const myRealName = StorageService.getProfile()?.displayName || myHandle.replace(/^@/, '');
        await NetworkService.broadcastMessage(
          normRoomId,
          {
            id: newId,
            roomId: normRoomId,
            senderId: 'usr_' + cleanMe,
            senderHandle: cleanMe,
            senderDisplayName: myRealName,
            ciphertext: wireCipher,
            iv: wireIv,
            createdAt: Date.now(),
            timerSeconds: total,
            expiresAt: 0,
            isBurnOnRead: chosenTimer === 'burn',
            isHoldToReveal: chosenShield,
            status: 'sent',
          },
          activeContact.code,
          cleanThem
        );
      })().catch(() => {});
    }

    // If Auto-Seen simulation is ON, partner reads the message after 2.0 seconds
    if (autoSeenSim && !chosenShield) {
      setTimeout(() => {
        markMessageSeen(activeContact.id, newId);
      }, 2000);
    }

  };

  // Toggle Emoji Reaction on Message
  const handleReaction = (msgId: string, emoji: string) => {
    audio.play('tap');
    setChats((prev) => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions || [];
        const has = existing.includes(emoji);
        return {
          ...m,
          reactions: has ? existing.filter((r) => r !== emoji) : [...existing, emoji],
        };
      }),
    }));
    setActiveReactionMsgId(null);

    // Broadcast reaction across Supabase Realtime so partner sees it immediately
    if (activeContact && !decoyModeActive && activeContact.id !== 'placeholder') {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastReaction(normRoomId, msgId, emoji).catch(() => {});
    }
  };

  // Inject Screenshot Blocked Security Event Pill
  const triggerScreenshotBlockedAlert = () => {
    audio.play('alert');
    const contactName = activeContact?.name || 'Peer';
    const alertMsg: MessageItem = {
      id: 'sys_' + Date.now(),
      sender: 'system',
      type: 'screenshot_alert',
      text: `🛡️ Screenshot attempt by ${contactName.split(' ')[0]} blocked by Phantom Shield`,
      seen: false,
      totalSeconds: 60,
      remainingSeconds: 60,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), alertMsg],
    }));
    setScreen('chat');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  // Hardware MediaRecorder Voice Note Studio
  const handleStartVoiceRecord = async () => {
    try {
      audio.play('tap');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordSecs(0);
    } catch {
      alert('Microphone permission required for Voice Notes.');
    }
  };

  const handleCancelVoiceRecord = () => {
    audio.play('tap');
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      audioChunksRef.current = [];
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const handleSendVoice = () => {
    const dur = Math.max(1, recordSecs);
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
      setIsRecording(false);
      return;
    }

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Audio = reader.result as string;
        const newId = 'v_' + Date.now();
        const newMsg: MessageItem = {
          id: newId,
          sender: 'me',
          type: 'voice',
          text: `Voice Note (0:0${Math.min(9, dur)})`,
          previewUrl: base64Audio,
          duration: `0:0${Math.min(9, dur)}`,
          timerMode: 'burn',
          totalSeconds: dur + 2,
          remainingSeconds: dur + 2,
          seen: false,
          shielded: false,
          reactions: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          disintegrating: false,
        };

        audio.play('send');
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // Broadcast over Realtime
        if (activeContact && !decoyModeActive && activeContact.id !== 'placeholder') {
          const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
          const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
          const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
          NetworkService.broadcastMessage(
            normRoomId,
            {
              id: newId,
              roomId: normRoomId,
              senderId: 'usr_' + cleanMe,
              senderHandle: cleanMe,
              senderDisplayName: myHandle,
              ciphertext: '🎤 Voice Note',
              iv: 'voice',
              mediaUrl: base64Audio,
              audioDuration: dur,
              createdAt: Date.now(),
              timerSeconds: dur + 2,
              expiresAt: 0,
              isBurnOnRead: true,
              isHoldToReveal: false,
              status: 'sent',
            },
            activeContact.code,
            cleanThem
          ).catch(() => {});
        }
      };
      reader.readAsDataURL(audioBlob);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  // Real Gallery & Camera Photo Handler
  const handleGalleryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else if (height > MAX_DIM) {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const total = getSeconds(timerMode);
        const newId = 'p_' + Date.now();
        const newMsg: MessageItem = {
          id: newId,
          sender: 'me',
          type: 'photo',
          text: 'Secret Ephemeral Photo',
          previewUrl: compressedDataUrl,
          timerMode,
          totalSeconds: total,
          remainingSeconds: total,
          seen: false,
          shielded: true,
          reactions: [],
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          disintegrating: false,
        };

        audio.play('send');
        setChats((prev) => ({
          ...prev,
          [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
        }));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        // Broadcast to Supabase Realtime
        if (activeContact && !decoyModeActive && activeContact.id !== 'placeholder') {
          const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
          const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
          const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
          NetworkService.broadcastMessage(
            normRoomId,
            {
              id: newId,
              roomId: normRoomId,
              senderId: 'usr_' + cleanMe,
              senderHandle: cleanMe,
              senderDisplayName: myHandle,
              ciphertext: '📷 Ephemeral Photo',
              iv: 'photo',
              mediaUrl: compressedDataUrl,
              createdAt: Date.now(),
              timerSeconds: total,
              expiresAt: 0,
              isBurnOnRead: timerMode === 'burn',
              isHoldToReveal: true,
              status: 'sent',
            },
            activeContact.code,
            cleanThem
          ).catch(() => {});
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Send Selected Secret Ephemeral Photo
  const handleSendPhoto = (preset = EPHEMERAL_PHOTO_PRESETS[0]) => {
    const total = getSeconds(timerMode);
    const newId = 'p_' + Date.now();
    const newMsg: MessageItem = {
      id: newId,
      sender: 'me',
      type: 'photo',
      text: 'Secret Ephemeral Photo',
      caption: customPhotoCaption.trim() || preset.caption,
      previewUrl: preset.previewUrl,
      timerMode,
      totalSeconds: total,
      remainingSeconds: total,
      seen: false,
      shielded: true,
      reactions: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false,
    };
    audio.play('send');
    setShowPhotoPicker(false);
    setCustomPhotoCaption('');
    setChats((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
    }));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // Broadcast to Supabase Realtime
    if (activeContact && !decoyModeActive && activeContact.id !== 'placeholder') {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastMessage(
        normRoomId,
        {
          id: newId,
          roomId: normRoomId,
          senderId: 'usr_' + cleanMe,
          senderHandle: cleanMe,
          senderDisplayName: myHandle,
          ciphertext: customPhotoCaption.trim() ? `📷 ${customPhotoCaption.trim()}` : '📷 Ephemeral Photo',
          iv: 'photo',
          mediaUrl: preset.previewUrl,
          createdAt: Date.now(),
          timerSeconds: total,
          expiresAt: 0,
          isBurnOnRead: timerMode === 'burn',
          isHoldToReveal: true,
          status: 'sent',
        },
        activeContact.code,
        cleanThem
      ).catch(() => {});
    }
  };

  const markMessageSeen = (chatId: string, msgId: string) => {
    audio.play('tap');
    setChats((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.id === msgId ? { ...m, seen: true } : m
      ),
    }));
  };

  const vaporizeNow = (chatId: string, msgId: string) => {
    audio.play('smoke');
    setChats((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.id === msgId ? { ...m, disintegrating: true } : m
      ),
    }));
    setTimeout(() => {
      setChats((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter((m) => m.id !== msgId),
      }));
    }, 450);
  };

  // Hold-to-Reveal Shield Handlers
  const handleHoldStart = (msg: MessageItem) => {
    audio.play('tap');
    setRevealedIds((prev) => ({ ...prev, [msg.id]: true }));
    setChats((prev) => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map((m) =>
        m.id === msg.id ? { ...m, seen: true, everRevealed: true } : m
      ),
    }));

    if (activeContact && msg.sender === 'them') {
      const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
      const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
      const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
      NetworkService.broadcastDeliveryAck(normRoomId, msg.id, 'read', cleanThem).catch(() => {});
    }
  };

  const handleHoldEnd = (msg: MessageItem) => {
    setRevealedIds((prev) => ({ ...prev, [msg.id]: false }));
    if (msg.timerMode === 'burn' && msg.everRevealed) {
      vaporizeNow(activeContactId, msg.id);
    }
  };

  // Listen-Once Voice Note Playback (Real Audio + Auto-Vaporize)
  const handlePlayVoice = (msg: MessageItem) => {
    if (playingVoiceId === msg.id || msg.disintegrating) {
      if (activeAudioPlayerRef.current) {
        activeAudioPlayerRef.current.pause();
      }
      setPlayingVoiceId(null);
      return;
    }

    if (activeAudioPlayerRef.current) {
      activeAudioPlayerRef.current.pause();
    }

    audio.play('tap');
    setPlayingVoiceId(msg.id);

    if (msg.previewUrl) {
      const audioObj = new Audio(msg.previewUrl);
      activeAudioPlayerRef.current = audioObj;
      audioObj.play().catch(() => {});
      audioObj.onended = () => {
        setPlayingVoiceId(null);
        vaporizeNow(activeContactId, msg.id);
      };
    } else {
      setTimeout(() => {
        setPlayingVoiceId(null);
        vaporizeNow(activeContactId, msg.id);
      }, 2500);
    }
  };

  // Panic Burn Entire Chat
  const handlePanicBurn = () => {
    audio.play('smoke');
    setIsBurningAll(true);
    setShowPanicPopover(false);
    setChats((prev) => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map((m) => ({
        ...m,
        disintegrating: true,
      })),
    }));
    setTimeout(() => {
      setChats((prev) => ({ ...prev, [activeContactId]: [] }));
      setIsBurningAll(false);
    }, 450);
  };

  // Universal QR / Deep-link / PIN String Parser
  const parseScannedQR = (raw: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();

    // Reject foreign external URLs (e.g. Telegram t.me, WhatsApp, random web addresses)
    if (/^https?:\/\//i.test(trimmed)) {
      if (!trimmed.includes('blinkmsg.app') && !trimmed.includes('code=')) {
        return '';
      }
    }

    // 1. Check for URL query param code=... or handle=...
    if (trimmed.includes('code=')) {
      const extracted = trimmed.split('code=')[1].split('&')[0].split('#')[0].replace(/\D/g, '');
      if (extracted.length === 6) return extracted;
    }
    if (trimmed.includes('handle=')) {
      const extracted = trimmed.split('handle=')[1].split('&')[0].split('#')[0].replace(/[^a-zA-Z0-9_]/g, '');
      if (extracted) return `@${extracted}`;
    }

    // 2. Check for URL path format: /join/768049 or /join/@alex
    const joinMatch = trimmed.match(/\/join\/(@?[a-zA-Z0-9_]+)/i);
    if (joinMatch && joinMatch[1]) {
      const target = joinMatch[1];
      const digitsOnly = target.replace(/\D/g, '');
      if (digitsOnly.length === 6) return digitsOnly;
      return target.startsWith('@') ? target : `@${target}`;
    }

    // 3. Check for JSON format { "code": "..." } or { "handle": "..." }
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.code) return String(parsed.code).replace(/\D/g, '');
        if (parsed.handle) return parsed.handle.startsWith('@') ? parsed.handle : `@${parsed.handle}`;
      } catch {}
    }

    // 4. Check for clean 6-digit PIN anywhere in string
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length === 6) {
      return digitsOnly;
    }

    // 5. Check for @handle pattern (e.g. @rahul_007)
    const handleMatch = trimmed.match(/^@?([a-zA-Z0-9_]{3,})$/);
    if (handleMatch && handleMatch[1]) {
      return `@${handleMatch[1]}`;
    }

    return '';
  };

  // Connect directly by code or handle and open chat immediately
  const connectDirectly = async (rawInput: string, customName?: string) => {
    if (!rawInput) return;
    const rawTarget = parseScannedQR(rawInput);
    if (!rawTarget) return;
    const cleanDigits = rawTarget.replace(/\D/g, '');
    const cleanHandle = rawTarget.toLowerCase().replace(/^@/, '').trim();

    // 1. Check if matches pending request
    const matchedReq = pendingRequests.find(
      (r) =>
        r.code.replace(/\D/g, '') === cleanDigits ||
        r.handle.toLowerCase().replace(/^@/, '') === cleanHandle ||
        r.name.toLowerCase().includes(rawTarget.toLowerCase())
    );
    if (matchedReq) {
      handleAcceptRequest(matchedReq);
      setShowQrPinPopover(false);
      setShowConnectSheet(false);
      return;
    }

    // 2. Check existing contact
    const existing = contacts.find(
      (c) =>
        c.code.replace(/\D/g, '') === cleanDigits ||
        c.handle.toLowerCase().replace(/^@/, '') === cleanHandle
    );
    if (existing) {
      setActiveContactId(existing.id);
      setScreen('chat');
      setShowQrPinPopover(false);
      setShowConnectSheet(false);
      audio.play('tap');
      return;
    }

    // 3. Instant Connect: Check real database registration
    let foundProfile: UserProfile | null = null;
    try {
      foundProfile = await NetworkService.findProfileByPin(rawTarget);
    } catch {}

    const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
    if (foundProfile && foundProfile.handle.toLowerCase() === cleanMe) {
      audio.play('alert');
      setInAppBanner({
        name: 'Invalid Connect',
        code: myCode,
        text: 'You cannot connect with your own code or handle!',
      });
      setTimeout(() => setInAppBanner(null), 3500);
      return;
    }

    // STRICT DB VALIDATION: If user is not found in database, do NOT create fake chat!
    if (!foundProfile) {
      audio.play('alert');
      setInAppBanner({
        name: 'User Not Found',
        code: rawTarget,
        text: `No registered user found with "${rawTarget}". Please verify the 6-digit code or @handle with your friend.`,
      });
      setTimeout(() => setInAppBanner(null), 4000);
      return;
    }

    const pCode = foundProfile.pin || (cleanDigits.length === 6 ? cleanDigits : '768049');
    const partnerName = customName || foundProfile.displayName || foundProfile.handle;
    const partnerHandle = `@${foundProfile.handle.replace(/^@/, '')}`;
    const cleanPHandle = partnerHandle.replace(/^@/, '').toLowerCase();
    const newId = 'c_' + cleanPHandle;

    // Check real-time online status from Supabase
    let isPeerOnline = false;
    try {
      const statusRes = await NetworkService.checkPeerOnlineStatus(cleanPHandle);
      isPeerOnline = statusRes.isOnline;
    } catch {}

    const newContact: ContactItem = {
      id: newId,
      name: partnerName,
      handle: partnerHandle,
      code: pCode,
      avatar: '',
      avatarId: foundProfile.avatarId || 1,
      color: 'from-emerald-500 to-teal-500',
      online: isPeerOnline,
      unread: 0,
      time: 'Now',
    };

    // Broadcast notice to peer's inbox so peer adds me to their contacts too!
    const myRealName = StorageService.getProfile()?.displayName || myHandle.replace(/^@/, '');
    NetworkService.sendPeerConnectedNotice(cleanPHandle, {
      id: 'usr_' + cleanMe,
      handle: cleanMe,
      displayName: myRealName,
      pin: myCode.replace(/\D/g, ''),
    }).catch(() => {});

    audio.play('receive');
    setContacts((prev) => [newContact, ...prev.filter((c) => c.id !== newId)]);
    setChats((prev) => ({
      ...prev,
      [newId]: prev[newId] || [],
    }));
    setShowQrPinPopover(false);
    setShowConnectSheet(false);
    setActiveContactId(newId);
    setScreen('chat');

    // Async Supabase profile enrichment in background (never blocks UI)
    NetworkService.findProfileByPin(rawTarget).then((found) => {
      if (found) {
        setContacts((prev) =>
          prev.map((c) =>
            c.id === newId
              ? {
                  ...c,
                  name: found.displayName || found.handle,
                  handle: `@${found.handle}`,
                  code: found.pin || c.code,
                }
              : c
          )
        );
      }
    }).catch(() => {});

    // Notify partner over Supabase Realtime
    const myClean = myHandle.replace(/^@/, '').toLowerCase();
    const myFullProfile: UserProfile = {
      id: 'usr_' + myClean,
      handle: myClean,
      displayName: myHandle.replace(/^@/, ''),
      avatarId: 1,
      vibe: '⚡ Stealth Tunnel',
      isAvailable: true,
      country: 'India',
      state: '',
      city: '',
      lastActive: Date.now(),
      pin: myCode.replace(/\D/g, ''),
    };
    NetworkService.sendPeerConnectedNotice(cleanPHandle, myFullProfile).catch(() => {});
  };

  // Send real-time Handshake Request
  const handleSendHandshake = async (targetProf: UserProfile) => {
    audio.play('tap');
    const myClean = myHandle.replace(/^@/, '').toLowerCase();
    const myFullProfile: UserProfile = {
      id: 'usr_' + myClean,
      handle: myClean,
      displayName: myHandle.replace(/^@/, ''),
      avatarId: 1,
      vibe: '⚡ Stealth Tunnel',
      isAvailable: true,
      country: 'India',
      state: '',
      city: '',
      lastActive: Date.now(),
      pin: myCode.replace(/\D/g, ''),
    };
    await NetworkService.sendHandshakeRequest(targetProf.handle, myFullProfile);
    setHandshakeSentToast(true);
    setInAppBanner({
      name: targetProf.displayName || targetProf.handle,
      code: handleToPin(targetProf.handle).slice(0, 6),
      text: `Handshake request sent to ${targetProf.displayName || targetProf.handle}! Waiting for them to accept.`,
    });
    setShowConnectSheet(false);
    setConnectCodeInput('');
    setSearchTargetProfile(null);
    setTimeout(() => {
      setHandshakeSentToast(false);
      setInAppBanner(null);
    }, 4500);
  };

  // Connect New Friend by 6-Digit Code or @handle
  const handleConnectFriend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!connectCodeInput.trim()) return;

    if (searchTargetProfile) {
      await connectDirectly(searchTargetProfile.handle, searchTargetProfile.displayName);
      setConnectCodeInput('');
      setShowConnectSheet(false);
      setSearchTargetProfile(null);
      return;
    }

    await connectDirectly(connectCodeInput.trim());
    setConnectCodeInput('');
    setShowConnectSheet(false);
    setSearchTargetProfile(null);
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
          setActiveContactId('c1');
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

  return (
    <div className="min-h-screen w-full bg-[#000000] text-zinc-100 flex flex-col items-center justify-center p-0 sm:p-4 font-sans select-none relative overflow-hidden">
      {/* ==========================================
          CUSTOM ANIMATIONS: SMOKE & AURORA HALO
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

      {/* SOFT STUDIO AMBIENT GLOW (Desktop/Tablet) */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-[#00F5A0]/10 rounded-full blur-[150px]" />
        <div className="w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[140px] -ml-40" />
      </div>

      {/* NATIVE APP CONTAINER (FULL SCREEN MOBILE / SLEEK DESKTOP) */}
      <div className="relative z-10 w-full sm:max-w-[420px] h-[100dvh] sm:h-[880px] sm:max-h-[94vh] bg-[#09090B] sm:rounded-3xl sm:border sm:border-white/10 shadow-[0_25px_90px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* =========================================================
            VIEW 0: ZERO-LOGIN ONBOARDING & ACCOUNT RESTORE SCREEN
           ========================================================= */}
        {screen === 'onboarding' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[#07080B] relative overflow-y-auto">
            {/* Ambient Hero Radial Glow */}
            <div className="pointer-events-none absolute top-8 inset-x-0 flex justify-center">
              <div className="w-64 h-64 bg-[#00F5A0]/15 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 text-center mt-3">
              <div className="w-20 h-20 rounded-3xl bg-black border border-[#00F5A0]/35 mx-auto flex items-center justify-center shadow-[0_12px_40px_rgba(0,245,160,0.25)] mb-3.5 overflow-hidden p-1.5 transition-transform hover:scale-105">
                <img src="/logo.png" alt="BlinkMsg" className="w-full h-full object-contain rounded-2xl" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-[11px] font-bold text-[#00F5A0] mb-2 tracking-wide">
                <Sparkles className="w-3.5 h-3.5" /> ZERO SIGN-UP • ZERO CLOUD TRACES
              </span>
              <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center space-x-1">
                <span>Blink</span>
                <span className="text-[#00F5A0]">Msg</span>
              </h1>
              <p className="text-xs text-zinc-400 mt-1.5 px-3 leading-relaxed max-w-xs mx-auto">
                No phone number or email required. Share your 6-digit code with your partner—timers start only once seen.
              </p>
            </div>

            {/* Slot-Machine 6-Digit Personal Code Card */}
            <div className="relative z-10 my-4 p-5 rounded-3xl bg-[#121217]/95 border border-white/10 shadow-2xl backdrop-blur-xl space-y-3.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                <span className="tracking-wide">YOUR 6-DIGIT STEALTH ID</span>
                <span className="text-[#00F5A0] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] inline-block animate-pulse" />
                  E2EE Ready
                </span>
              </div>

              <div className="py-4 rounded-2xl bg-black/70 border border-[#00F5A0]/30 flex items-center justify-center shadow-inner">
                <span
                  className={`font-mono text-3xl sm:text-4xl font-extrabold tracking-[0.25em] ${
                    isGeneratingId ? 'text-[#00F5A0] blur-[0.5px]' : 'text-white'
                  } transition-all`}
                >
                  {myCode.replace(/\D/g, '')}
                </span>
              </div>

              {/* Display Name & Handle Inputs */}
              <div className="space-y-2.5 pt-0.5">
                {/* 1. Real / Display Name */}
                <div className="bg-black/50 border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#00F5A0]/50 transition-colors">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Your Name / Display Alias
                  </label>
                  <input
                    type="text"
                    value={setupDisplayName}
                    onChange={(e) => setSetupDisplayName(e.target.value)}
                    placeholder="e.g. Alex or Vikram"
                    className="w-full bg-transparent text-[13px] font-semibold text-white focus:outline-none mt-0.5"
                  />
                </div>

                {/* 2. Unique @Handle with Live Uniqueness Check */}
                <div className={`bg-black/50 border rounded-2xl px-3.5 py-2.5 transition-colors ${
                  handleCheckStatus === 'available' ? 'border-[#00F5A0]/60' :
                  handleCheckStatus === 'taken' ? 'border-rose-500/60' :
                  handleCheckStatus === 'invalid' ? 'border-amber-500/50' : 'border-white/10 focus-within:border-[#00F5A0]/50'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Unique Anonymous @Handle
                    </label>
                    {handleCheckStatus === 'checking' && (
                      <span className="text-[10px] text-amber-400 font-medium">Checking DB...</span>
                    )}
                    {handleCheckStatus === 'available' && (
                      <span className="text-[10px] text-[#00F5A0] font-bold">✓ Unique & Available</span>
                    )}
                    {handleCheckStatus === 'taken' && (
                      <span className="text-[10px] text-rose-400 font-bold">❌ Already Taken!</span>
                    )}
                    {handleCheckStatus === 'invalid' && (
                      <span className="text-[10px] text-amber-400 font-medium">Min 3 chars</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-zinc-500 font-bold text-sm">@</span>
                    <input
                      type="text"
                      value={setupHandle}
                      onChange={(e) => setSetupHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="choose_handle"
                      className="w-full bg-transparent text-[13px] font-semibold text-white focus:outline-none"
                    />
                  </div>
                </div>

                {/* 3. 4-Digit Recovery PIN */}
                <div className="bg-black/50 border border-white/10 rounded-2xl px-3.5 py-2.5 focus-within:border-[#00F5A0]/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                      4-Digit App Lock & Recovery PIN
                    </label>
                    <span className="text-[9px] text-zinc-500">Decoy PIN: 0000</span>
                  </div>
                  <input
                    type="password"
                    maxLength={4}
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-transparent font-mono text-[14px] font-bold tracking-widest text-[#00F5A0] focus:outline-none mt-0.5"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSlotGenerateCode}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#00F5A0] flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingId ? 'animate-spin' : ''}`} />
                <span>Reroll 6-Digit PIN</span>
              </button>
            </div>

            {/* Primary CTA & Restore Account Trigger */}
            <div className="relative z-10 space-y-3 pb-2">
              <button
                disabled={!setupDisplayName.trim() || handleCheckStatus !== 'available' || recoveryPin.length !== 4}
                onClick={() => {
                  audio.play('send');
                  const cleanHandle = setupHandle.replace(/^@/, '').toLowerCase().trim();
                  const cleanName = setupDisplayName.trim();
                  setMyHandle(`@${cleanHandle}`);
                  const currentCode = myCode.replace(/\D/g, '');
                  const prof = {
                    id: 'usr_' + cleanHandle,
                    handle: cleanHandle,
                    displayName: cleanName,
                    avatarId: 1,
                    vibe: '⚡ Stealth Active',
                    isAvailable: true,
                    country: 'India',
                    state: 'Delhi',
                    city: 'New Delhi',
                    lastActive: Date.now(),
                    pin: currentCode,
                  };
                  StorageService.saveProfile(prof);
                  localStorage.setItem('blink_recovery_pin', recoveryPin);
                  localStorage.setItem('blink_user_code', currentCode);
                  NetworkService.syncProfileToSupabase(prof).catch(() => {});
                  setScreen('list');
                }}
                className="w-full py-3.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] disabled:opacity-40 disabled:cursor-not-allowed text-black font-extrabold text-[13px] shadow-[0_10px_30px_rgba(0,245,160,0.3)] transition-all cursor-pointer active:scale-95"
              >
                Enter Stealth Messenger →
              </button>

              <button
                onClick={() => setShowRestoreSheet(true)}
                className="w-full py-2 text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5 text-[#00F5A0]" />
                <span>Switching phones? Restore with PIN</span>
              </button>
            </div>

            {/* Restore Account Bottom Sheet Modal */}
            {showRestoreSheet && (
              <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-end justify-center p-4">
                <form
                  onSubmit={handleRestoreAccount}
                  className="w-full bg-[#14151B] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-3.5 animate-in slide-in-from-bottom-3 duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#00F5A0]" />
                      Restore Stealth Vault
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowRestoreSheet(false)}
                      className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Enter your <strong className="text-white">@handle</strong> and{' '}
                    <strong className="text-white">4-Digit PIN</strong> to pull your encrypted profile onto this phone.
                  </p>
                  <input
                    type="text"
                    value={restoreHandleInput}
                    onChange={(e) => setRestoreHandleInput(e.target.value)}
                    placeholder="@your_handle"
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F5A0]/50"
                  />
                  <input
                    type="text"
                    maxLength={4}
                    value={restorePinInput}
                    onChange={(e) => setRestorePinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-Digit PIN"
                    className="w-full bg-black/50 border border-[#00F5A0]/40 rounded-2xl px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.5em] text-[#00F5A0] placeholder-zinc-600 focus:outline-none shadow-inner"
                  />
                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-extrabold text-xs cursor-pointer shadow-lg shadow-[#00F5A0]/25 active:scale-95 transition-all"
                  >
                    {restoreSuccess ? '✓ Identity Restored!' : 'Unlock & Sync Identity'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            VIEW 1: SLEEK CHAT LIST (HOME SCREEN + HANDSHAKE REQUESTS)
           ========================================================= */}
        {screen === 'list' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07080B] relative">
            {activeTab === 'chats' ? (
              <>
                {/* Minimal Top Header */}
            <div className="px-5 pt-3.5 pb-3 flex items-center justify-between border-b border-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
                      <span>BlinkMsg</span>
                      <span className="w-2 h-2 rounded-full bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]" />
                    </h1>
                    <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/10 border border-[#00F5A0]/25 px-2 py-0.5 rounded-full font-semibold">
                      {myHandle}
                    </span>
                    {ghostMode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        👻 Ghost
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Disappearing Stealth Messenger</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Camera Scanner Button */}
                <button
                  onClick={() => setShowCameraModal(true)}
                  className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-[#00F5A0] transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Scan Friend's QR Code"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Settings Tab Button */}
                <button
                  onClick={() => setActiveTab('profile')}
                  className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Settings & Security"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Connect Slide-Down Bar with Live Peer Lookup */}
            {showConnectSheet && (
              <div className="mx-4 mt-3 mb-2 p-4 rounded-3xl bg-[#14151B]/95 border border-[#00F5A0]/35 shadow-2xl backdrop-blur-2xl space-y-3 animate-in fade-in slide-in-from-top-2">
                <form
                  onSubmit={handleConnectFriend}
                  className="flex items-center gap-2.5 bg-black/50 border border-white/10 rounded-2xl px-3.5 py-2.5"
                >
                  <KeyRound className="w-4 h-4 text-[#00F5A0] shrink-0" />
                  <input
                    type="text"
                    value={connectCodeInput}
                    onChange={(e) => setConnectCodeInput(e.target.value)}
                    placeholder="Enter 6-digit PIN (e.g. 768049) or @handle"
                    className="flex-1 bg-transparent text-[13px] text-white placeholder-zinc-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectSheet(false);
                      setShowCameraModal(true);
                    }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[#00F5A0] cursor-pointer"
                    title="Scan QR with Camera"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowConnectSheet(false);
                      setConnectCodeInput('');
                      setSearchTargetProfile(null);
                      setTargetSearchError(null);
                    }}
                    className="p-1 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>

                {/* Searching Indicator */}
                {isSearchingTarget && (
                  <div className="flex items-center gap-2 px-2 py-1 text-xs text-emerald-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching stealth network for peer...</span>
                  </div>
                )}

                {/* Found Verified User Card */}
                {searchTargetProfile && (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-[#00F5A0]/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar
                          avatarId={searchTargetProfile.avatarId || 1}
                          size="md"
                          name={searchTargetProfile.displayName || searchTargetProfile.handle}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">
                              {searchTargetProfile.displayName || searchTargetProfile.handle}
                            </span>
                            <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/15 px-2 py-0.5 rounded-md font-bold">
                              PIN #{searchTargetProfile.pin || handleToPin(searchTargetProfile.handle).slice(0, 6)}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            @{searchTargetProfile.handle} • <span className="text-[#00F5A0] font-medium">Verified Peer 🟢</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          connectDirectly(searchTargetProfile.handle, searchTargetProfile.displayName);
                          setConnectCodeInput('');
                          setShowConnectSheet(false);
                          setSearchTargetProfile(null);
                        }}
                        className="py-2 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-[#00F5A0]/25 active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Direct Chat</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendHandshake(searchTargetProfile)}
                        className="py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-white/10 active:scale-95 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-[#00F5A0]" />
                        <span>Send Request</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Error / Not Found Status */}
                {targetSearchError && !searchTargetProfile && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-rose-300 leading-snug">{targetSearchError}</p>
                      <p className="text-[11px] text-zinc-400 mt-1">Make sure your friend has opened BlinkMsg and shared their verified 6-digit PIN.</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Search Bar */}
            <div className="px-4 my-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search contacts, @handle or 6-digit code..."
                  className="w-full bg-[#13141B] border border-white/[0.07] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#00F5A0]/40 transition-colors shadow-inner"
                />
              </div>
            </div>

            {/* =========================================================
                CONNECTION REQUEST HANDSHAKE SECTION (PENDING REQUESTS)
               ========================================================= */}
            {!decoyModeActive && pendingRequests.length > 0 && (
              <div className="px-4 mb-2">
                <button
                  onClick={() => setShowRequestsDrawer(!showRequestsDrawer)}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#00F5A0]/10 border border-[#00F5A0]/25 text-xs font-semibold text-[#00F5A0] cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    <span>Connection Requests ({pendingRequests.length})</span>
                  </span>
                  <span className="text-[11px] text-[#00F5A0] font-mono font-bold">
                    {showRequestsDrawer ? 'Hide' : 'Review'}
                  </span>
                </button>

                {showRequestsDrawer && (
                  <div className="mt-2 space-y-2">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-[#14151B] border border-white/10 flex items-center justify-between gap-2 shadow-lg"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={req.avatar}
                            alt={req.name}
                            className="w-10 h-10 rounded-full object-cover border border-[#00F5A0]/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {req.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/15 px-1.5 py-0.5 rounded">
                                #{req.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate mt-0.5">{req.via}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="px-3 py-1.5 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-sm"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleIgnoreRequest(req.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-xs cursor-pointer active:scale-95 transition-all"
                          >
                            Ignore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-3 space-y-1 relative pb-24">
              {/* Network Discovery: Connect with PIN or Handle directly from search bar */}
              {searchQuery.trim().length >= 3 && (
                <div className="p-3.5 my-2 rounded-2xl bg-[#14151B] border border-[#00F5A0]/40 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#00F5A0]/15 border border-[#00F5A0]/40 flex items-center justify-center shrink-0 text-[#00F5A0]">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        Connect with {searchQuery.startsWith('@') ? searchQuery : (searchQuery.replace(/\D/g, '').length === 6 ? `PIN #${searchQuery.replace(/\D/g, '')}` : `@${searchQuery}`)}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                        Direct zero-login stealth tunnel
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      connectDirectly(searchQuery);
                      setSearchQuery('');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs shrink-0 cursor-pointer shadow-md shadow-[#00F5A0]/25 flex items-center gap-1 active:scale-95 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Connect</span>
                  </button>
                </div>
              )}

              {activeContactsList
                .filter(
                  (c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.code.includes(searchQuery) ||
                    c.handle.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((contact) => {
                  const list = activeChatsMap[contact.id] || [];
                  const last = list[list.length - 1];
                  const isContactBlocked = blockedUsers.includes(contact.handle.replace(/^@/, '').toLowerCase());

                  return (
                    <div
                      key={contact.id}
                      className="w-full relative group flex items-center"
                    >
                      <button
                        onClick={() => {
                          setActiveContactId(contact.id);
                          setContacts((prev) =>
                            prev.map((c) => (c.id === contact.id ? { ...c, unread: 0 } : c))
                          );
                          setScreen('chat');
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActionContact(contact);
                        }}
                        className="flex-1 p-3.5 rounded-2xl hover:bg-zinc-900/70 active:scale-[0.99] transition-all flex items-center gap-3.5 text-left cursor-pointer border border-transparent hover:border-white/[0.04]"
                      >
                        <div className="relative shrink-0">
                          {contact.avatar && !contact.avatar.includes('unsplash') ? (
                            <img
                              src={contact.avatar}
                              alt={contact.name}
                              className="w-12 h-12 rounded-full object-cover border border-white/10 shadow-md"
                            />
                          ) : (
                            <Avatar
                              avatarId={contact.avatarId || 1}
                              size="lg"
                              name={contact.name}
                              isOnline={contact.online && !ghostMode}
                            />
                          )}
                          {contact.online && !ghostMode && contact.avatar && !contact.avatar.includes('unsplash') && (
                            <span className="w-3 h-3 rounded-full bg-[#00F5A0] border-2 border-[#07080B] absolute bottom-0 right-0 shadow-[0_0_8px_rgba(0,245,160,0.7)]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="font-bold text-[15px] text-white truncate tracking-tight">
                                {contact.name}
                              </span>
                              {isContactBlocked && (
                                <span className="text-[10px] font-mono text-rose-400 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded font-bold">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-500 font-medium">{contact.time}</span>
                          </div>

                          <div className="flex items-center justify-between mt-1">
                            <p className="text-[13px] text-zinc-400 truncate pr-2">
                              {last
                                ? last.shielded
                                  ? '🛡️ Hold-to-Reveal Secret'
                                  : last.text
                                : 'Tap to start disappearing chat'}
                            </p>

                            {/* WhatsApp-Style Green Unread Counter */}
                            {contact.unread > 0 && (
                              <span className="px-2 py-0.5 rounded-full bg-[#00F5A0] text-zinc-950 font-extrabold text-[11px] shadow-[0_0_10px_rgba(0,245,160,0.45)]">
                                {contact.unread}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* 3-Dot Options Action Trigger */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionContact(contact);
                        }}
                        className="p-2 mr-1 rounded-xl text-zinc-500 hover:text-white hover:bg-white/5 active:scale-90 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                        title="Contact Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

              {/* Empty State when no active contacts */}
              {activeContactsList.length === 0 && (
                <div className="py-20 px-4 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-[#14151B] border border-white/10 flex items-center justify-center text-[#00F5A0] mb-4 shadow-[0_0_30px_rgba(0,245,160,0.15)]">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5">No Active Chats</h3>
                  <p className="text-xs text-zinc-400 max-w-xs mb-6 leading-relaxed">
                    All messages vanish automatically on read. Connect with a partner using their 6-digit PIN or scan their QR.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2.5">
                    <button
                      onClick={() => setShowCameraModal(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-bold text-xs transition-all shadow-lg shadow-[#00F5A0]/25 cursor-pointer active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Scan Friend's QR</span>
                    </button>
                    <button
                      onClick={() => {
                        setPopoverTab('qr');
                        setShowQrPinPopover(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white font-semibold text-xs transition-all cursor-pointer active:scale-95"
                    >
                      <QrCode className="w-4 h-4 text-[#00F5A0]" />
                      <span>My 6-Digit Code</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Floating Action Button (WhatsApp Style) to Connect Friend */}
            <button
              onClick={() => setShowConnectSheet(true)}
              className="absolute bottom-20 right-5 z-20 w-13 h-13 rounded-full bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 flex items-center justify-center shadow-xl shadow-[#00F5A0]/30 transition-all active:scale-90 cursor-pointer"
              title="Add Contact / Connect"
            >
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </button>
          </>
        ) : activeTab === 'vault' ? (
          <div className="flex-1 overflow-y-auto">
            <SecretVaultView
              currentUser={myFullProfile}
              onEnterRoom={(room) => {
                connectDirectly(room.code);
                setActiveTab('chats');
              }}
              onStartChatWithUser={(user) => {
                connectDirectly(user.handle, user.displayName);
                setActiveTab('chats');
              }}
              onOpenScanner={() => setShowCameraModal(true)}
            />
          </div>
        ) : activeTab === 'profile' ? (
          <div className="flex-1 overflow-y-auto">
            <ProfileView
              currentUser={myFullProfile}
              recoveryPin={recoveryPin}
              onUpdateRecoveryPin={(newPin) => {
                setRecoveryPin(newPin);
                localStorage.setItem('blink_recovery_pin', newPin);
              }}
              onSave={(updated) => {
                if (updated.handle) setMyHandle('@' + updated.handle.replace(/^@/, ''));
                const clean = (updated.handle || myHandle).replace(/^@/, '').toLowerCase();
                const cleanName = updated.displayName || clean;
                const p: UserProfile = {
                  id: myFullProfile.id || ('usr_' + clean),
                  handle: clean,
                  displayName: cleanName,
                  avatarId: updated.avatarId || myFullProfile.avatarId || 1,
                  vibe: myFullProfile.vibe || '⚡ Stealth mode active',
                  isAvailable: !ghostMode,
                  country: 'India',
                  state: '',
                  city: 'New Delhi',
                  lastActive: Date.now(),
                  pin: myCode.replace(/\D/g, ''),
                };
                StorageService.saveProfile(p);
                NetworkService.syncProfileToSupabase(p).catch(() => {});
              }}
              onRegenerateCode={confirmRegenerateCode}
              onResetAccount={handleResetAccount}
              ghostMode={ghostMode}
              onToggleGhost={() => setGhostMode(!ghostMode)}
              soundMuted={muted}
              onToggleSound={() => setMuted(!muted)}
              blockedUsers={blockedUsers}
              onUnblockUser={handleToggleBlock}
              onLockApp={() => setIsLocked(true)}
            />
          </div>
        ) : null}

        {/* Bottom Floating Navigation Dock */}
        <BottomNav
          activeTab={activeTab}
          onTabChange={(t) => setActiveTab(t)}
          unreadCount={contacts.reduce((a, c) => a + (c.unread || 0), 0)}
        />
      </div>
    )}

        {/* =========================================================
            VIEW 2: INSIDE A CHAT ROOM (ULTRA-CLEAN NEXT-LEVEL UI)
           ========================================================= */}
        {screen === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#07080B] relative">
            {/* Sleek Glass Header */}
            <div className="px-3.5 py-3 border-b border-white/[0.06] bg-[#09090B]/90 backdrop-blur-2xl flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => setScreen('list')}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 transition-colors flex items-center cursor-pointer shrink-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {contacts.reduce((sum, c) => sum + (c.unread || 0), 0) > 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#00F5A0] -ml-1" />
                  )}
                </button>

                <div className="relative shrink-0">
                  {activeContact.avatar && !activeContact.avatar.includes('unsplash') ? (
                    <img
                      src={activeContact.avatar}
                      alt={activeContact.name}
                      className="w-10 h-10 rounded-full object-cover border border-white/10 shadow-sm"
                    />
                  ) : (
                    <Avatar
                      avatarId={activeContact.avatarId || 1}
                      size="md"
                      name={activeContact.name}
                      isOnline={activeContact.online && !ghostMode}
                    />
                  )}
                  {activeContact.online && !ghostMode && activeContact.avatar && !activeContact.avatar.includes('unsplash') && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#00F5A0] border-2 border-[#09090B] absolute bottom-0 right-0 shadow-[0_0_8px_rgba(0,245,160,0.6)]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[15px] text-white tracking-tight truncate">
                      {activeContact.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    {remoteTyping ? (
                      <span className="text-[#00F5A0] font-semibold flex items-center gap-1">
                        typing<span className="animate-pulse">...</span>
                      </span>
                    ) : ghostMode ? (
                      <span className="text-violet-300 font-medium">👻 Ghost Cloaked</span>
                    ) : (
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeContact.online && !ghostMode ? 'bg-[#00F5A0] shadow-[0_0_8px_rgba(0,245,160,0.8)]' : 'bg-zinc-600'}`} />
                        <span className={activeContact.online && !ghostMode ? 'text-[#00F5A0] font-medium' : 'text-zinc-400'}>
                          {activeContact.online && !ghostMode ? 'Online' : 'Offline'}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Header Icons: Disappearing Timer with Dropdown, Panic Burn */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Original Disappearing Timer Selector with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowTimerMenu(!showTimerMenu);
                      audio.play('tap');
                    }}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer active:scale-95 ${
                      timerMode === 'burn'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                        : 'bg-zinc-900/90 hover:bg-zinc-800 text-[#00F5A0] border border-white/10 shadow-sm'
                    }`}
                    title="Self-Destruct Disappearing Timer"
                  >
                    {timerMode === 'burn' ? (
                      <Flame className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-[#00F5A0]" />
                    )}
                    <span className="font-mono">{timerMode === 'burn' ? 'Burn' : timerMode}</span>
                  </button>

                  {/* Header Timer Dropdown */}
                  {showTimerMenu && (
                    <div className="absolute right-0 top-11 w-44 rounded-2xl bg-[#14151B] border border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                      {[
                        { id: 'burn', label: '🔥 Burn on Read' },
                        { id: '10s', label: '10 seconds' },
                        { id: '30s', label: '30 seconds' },
                        { id: '60s', label: '1 minute' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setTimerMode(opt.id as any);
                            setShowTimerMenu(false);
                            audio.play('tap');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            timerMode === opt.id
                              ? 'bg-white/10 text-[#00F5A0] font-bold'
                              : 'text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {timerMode === opt.id && (
                            <Check className="w-3.5 h-3.5 text-[#00F5A0]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    setShowPanicPopover(!showPanicPopover);
                    audio.play('tap');
                  }}
                  className="p-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-all cursor-pointer active:scale-95 shadow-sm"
                  title="Panic Button: Burn Chat"
                >
                  <Flame className="w-4 h-4" />
                </button>

                {/* 3-Dot Options Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowChatOptions(!showChatOptions);
                      audio.play('tap');
                    }}
                    className="p-2 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95 shadow-sm"
                    title="Chat Options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>

                  {showChatOptions && (
                    <div className="absolute right-0 top-11 w-48 rounded-2xl bg-[#14151B] border border-white/15 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl space-y-1">
                      <button
                        onClick={() => {
                          handleClearChatHistory(activeContact.id);
                          setShowChatOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Clear Messages</span>
                      </button>

                      <button
                        onClick={() => {
                          handleToggleBlock(activeContact.handle);
                          setShowChatOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-zinc-300 hover:bg-white/5 cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5 text-rose-400" />
                        <span>
                          {blockedUsers.includes(activeContact.handle.replace(/^@/, '').toLowerCase())
                            ? 'Unblock User'
                            : 'Block User'}
                        </span>
                      </button>

                      <button
                        onClick={() => {
                          handleRemoveContact(activeContact.id);
                          setShowChatOptions(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-rose-300 hover:bg-rose-500/10 cursor-pointer"
                      >
                        <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete Contact</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Blocked Contact Warning Banner */}
            {blockedUsers.includes(activeContact.handle.replace(/^@/, '').toLowerCase()) && (
              <div className="mx-4 mt-2 p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between shadow-lg">
                <span className="flex items-center gap-2">
                  <Ban className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>You have blocked this contact.</span>
                </span>
                <button
                  onClick={() => handleToggleBlock(activeContact.handle)}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/30 hover:bg-rose-500/40 text-rose-100 font-bold text-[11px] cursor-pointer"
                >
                  Unblock
                </button>
              </div>
            )}

            {/* Realtime Screenshot Detection Warning Banner */}
            {screenshotToast && (
              <div className="absolute top-16 left-4 right-4 z-40 p-2.5 rounded-2xl bg-rose-950/95 border border-rose-500/50 backdrop-blur-2xl text-rose-200 text-xs font-mono text-center shadow-2xl flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{screenshotToast}</span>
              </div>
            )}

            {/* Sleek Panic Confirmation Popover */}
            {showPanicPopover && (
              <div className="absolute top-16 right-4 z-40 w-64 bg-[#14151B]/95 border border-rose-500/40 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Burn Entire Conversation?</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Permanently vaporizes all messages on both devices in a 450ms smoke wave with zero cloud traces.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handlePanicBurn}
                    className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 cursor-pointer active:scale-95 transition-all"
                  >
                    Burn Now
                  </button>
                  <button
                    onClick={() => setShowPanicPopover(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                MESSAGE STREAM (SLEEK GLASS BUBBLES + SVG RINGS)
               ========================================================= */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Subtle Encryption Pill */}
              <div className="text-center my-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/80 border border-white/[0.07] text-[11px] text-zinc-400 shadow-sm">
                  <Shield className="w-3 h-3 text-[#00F5A0]" />
                  <span>End-to-End Encrypted • Zero Cloud Traces</span>
                </span>
              </div>

              {currentMessages.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-14 h-14 rounded-3xl bg-zinc-900/80 border border-white/10 flex items-center justify-center text-zinc-500 mb-3 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                    <Flame className="w-6 h-6 text-[#00F5A0]/80" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-200">No trace left behind</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-[220px] leading-relaxed">
                    Messages self-destruct automatically after your partner reads them.
                  </p>
                </div>
              )}

              {currentMessages.map((msg) => {
                // SYSTEM SCREENSHOT BLOCKED EVENT PILL
                if (msg.type === 'screenshot_alert') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="px-3.5 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-[11px] text-rose-300 font-medium flex items-center gap-1.5 shadow-lg">
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.sender === 'me';
                const isRevealed = !!revealedIds[msg.id];
                const isBlurred = msg.shielded && !isRevealed;
                const radius = 9;
                const circumference = 2 * Math.PI * radius;
                const dashOffset =
                  circumference -
                  (msg.remainingSeconds / Math.max(1, msg.totalSeconds)) * circumference;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${
                      msg.disintegrating ? 'smoke-exit' : ''
                    } transition-all group relative`}
                  >
                    {/* Quick Reaction Picker Bar (Appears on Double-Click or React Button) */}
                    {activeReactionMsgId === msg.id && (
                      <div
                        className={`mb-1.5 z-30 flex items-center gap-1.5 bg-[#14151B]/95 border border-white/15 px-2.5 py-1 rounded-full shadow-2xl backdrop-blur-xl animate-in zoom-in-95 ${
                          isMe ? ' self-end' : 'self-start'
                        }`}
                      >
                        {['❤️', '🔥', '👀', '⚡', '🤫'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-sm px-1 cursor-pointer active:scale-95"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 max-w-[85%]">
                      {/* Reply & React Quick Action Icons (Left side for my messages) */}
                      {isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() =>
                              setActiveReactionMsgId(
                                activeReactionMsgId === msg.id ? null : msg.id
                              )
                            }
                            className="p-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white text-[11px] cursor-pointer"
                            title="React"
                          >
                            🔥
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              audio.play('tap');
                            }}
                            className="p-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white cursor-pointer"
                            title="Reply"
                          >
                            <CornerUpLeft className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div
                        onDoubleClick={() =>
                          setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)
                        }
                        onMouseDown={() => msg.shielded && handleHoldStart(msg)}
                        onMouseUp={() => msg.shielded && handleHoldEnd(msg)}
                        onTouchStart={() => msg.shielded && handleHoldStart(msg)}
                        onTouchEnd={() => msg.shielded && handleHoldEnd(msg)}
                        className={`relative rounded-[18px] ${
                          isMe ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'
                        } px-3.5 py-2 transition-all cursor-pointer ${
                          isMe
                            ? msg.whisperEffect
                              ? 'bg-gradient-to-r from-fuchsia-700 via-purple-700 to-indigo-700 text-white shadow-md border border-fuchsia-500/30'
                              : 'bg-[#0B3A27] border border-[#00F5A0]/35 text-white shadow-md shadow-emerald-950/40'
                            : 'bg-[#181920] border border-white/[0.09] text-zinc-100 shadow-md shadow-black/50'
                        }`}
                      >
                        {/* Quoted Reply Header */}
                        {msg.replyTo && (
                          <div className="mb-1.5 pl-2 border-l-2 border-[#00F5A0] bg-black/30 rounded-r-lg py-1 pr-2 text-[10px]">
                            <span className="font-bold text-[#00F5A0] block">
                              {msg.replyTo.sender}
                            </span>
                            <span className="opacity-80 line-clamp-1 text-white">{msg.replyTo.text}</span>
                          </div>
                        )}

                        {/* Whisper Surge Badge */}
                        {msg.whisperEffect && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-fuchsia-200 mb-0.5">
                            <Zap className="w-2.5 h-2.5" /> Whisper Surge
                          </span>
                        )}

                        {/* 1. TEXT CONTENT */}
                        {msg.type === 'text' && (
                          <div className="relative">
                            <p
                              className={`text-[14px] leading-snug transition-all duration-200 ${
                                isBlurred ? 'filter blur-[6px] opacity-25 select-none' : 'filter-none opacity-100'
                              }`}
                            >
                              {msg.text}
                            </p>
                            {isBlurred && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="text-[11px] font-semibold text-emerald-200 bg-black/75 px-2.5 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md border border-emerald-500/30 shadow-lg">
                                  <Fingerprint className="w-3.5 h-3.5 text-[#00F5A0]" />
                                  Hold to Reveal
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 2. LISTEN-ONCE VOICE NOTE */}
                        {msg.type === 'voice' && (
                          <div className="flex items-center gap-2.5 py-0.5 min-w-[170px]">
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePlayVoice(msg); }}
                              className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                playingVoiceId === msg.id
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : isMe ? 'bg-white text-zinc-950' : 'bg-[#00F5A0] text-zinc-950'
                              }`}
                            >
                              <Play className="w-3 h-3 fill-current ml-0.5" />
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-0.5 h-3.5">
                                {[45, 90, 60, 100, 50, 80, 95, 40, 75, 60, 85, 50].map((h, i) => (
                                  <span
                                    key={i}
                                    style={{ height: `${h}%` }}
                                    className={`w-0.5 rounded-full ${
                                      playingVoiceId === msg.id
                                        ? 'bg-emerald-300 animate-pulse'
                                        : isMe ? 'bg-white/70' : 'bg-white/40'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between text-[9px] opacity-80 mt-0.5">
                                <span>
                                  {playingVoiceId === msg.id ? 'Playing 1x...' : 'Listen-Once'}
                                </span>
                                <span>{msg.duration || '0:04'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. EPHEMERAL SECRET PHOTO */}
                        {msg.type === 'photo' && (
                          <div className="rounded-xl overflow-hidden max-w-[210px] bg-black/40">
                            <div className={`relative transition-all duration-200 ${isBlurred ? 'filter blur-[7px] opacity-40' : ''}`}>
                              {msg.previewUrl ? (
                                <img
                                  src={msg.previewUrl}
                                  alt={msg.caption}
                                  className="w-full h-28 object-cover rounded-xl"
                                />
                              ) : (
                                <div className="w-48 h-24 bg-gradient-to-tr from-emerald-950 to-black flex flex-col items-center justify-center p-2 text-center rounded-xl">
                                  <Sparkles className="w-5 h-5 text-[#00F5A0] mb-1" />
                                  <span className="text-[11px] font-bold text-white">{msg.caption || 'Ephemeral Snapshot'}</span>
                                </div>
                              )}
                              {isBlurred && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                                  <span className="text-[10px] font-semibold text-white bg-black/75 px-2.5 py-1 rounded-full flex items-center gap-1 border border-white/20">
                                    <Fingerprint className="w-3 h-3 text-[#00F5A0]" /> Hold to Reveal
                                  </span>
                                </div>
                              )}
                            </div>
                            {msg.caption && (
                              <p className="text-[11px] font-medium text-white/90 px-2 py-1 bg-black/40">{msg.caption}</p>
                            )}
                          </div>
                        )}

                        {/* HOLD-TO-REVEAL COMPACT FOOTER PILL */}
                        {msg.shielded && (
                          <button
                            onMouseDown={(e) => { e.stopPropagation(); handleHoldStart(msg); }}
                            onMouseUp={(e) => { e.stopPropagation(); handleHoldEnd(msg); }}
                            onMouseLeave={(e) => { e.stopPropagation(); isRevealed && handleHoldEnd(msg); }}
                            onTouchStart={(e) => { e.stopPropagation(); handleHoldStart(msg); }}
                            onTouchEnd={(e) => { e.stopPropagation(); handleHoldEnd(msg); }}
                            className={`mt-1.5 w-full py-1 px-2.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              isRevealed
                                ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                : 'bg-black/35 hover:bg-black/55 text-white/90 border border-white/10'
                            }`}
                          >
                            <Fingerprint className="w-3 h-3 text-[#00F5A0]" />
                            <span>
                              {isRevealed ? 'Release to Lock' : 'Hold Finger to Reveal'}
                            </span>
                          </button>
                        )}

                        {/* BOTTOM META ROW: COMPACT TIME + WHATSAPP-STYLE TICKS & SLEEK COUNTDOWN */}
                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-zinc-400 font-medium select-none">
                          <span>{msg.time}</span>

                          {isMe && (
                            msg.status === 'read' ? (
                              <span title="Read by peer" className="inline-flex items-center text-[#00F5A0]">
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span title="Delivered to device" className="inline-flex items-center text-zinc-400">
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span title="Sent" className="inline-flex items-center text-zinc-500">
                                <Check className="w-3 h-3" />
                              </span>
                            )
                          )}

                          {msg.seen && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/50 text-[#00F5A0] font-mono text-[9.5px] font-bold border border-[#00F5A0]/25 shadow-sm">
                              ⏱ {msg.remainingSeconds}s
                            </span>
                          )}
                        </div>

                        {/* Floating Emoji Reactions Badge */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div
                            className={`absolute -bottom-2.5 ${
                              isMe ? 'left-2' : 'right-2'
                            } bg-zinc-900 border border-white/15 rounded-full px-1.5 py-0.5 text-[10px] flex items-center gap-0.5 shadow-lg`}
                          >
                            {msg.reactions.map((r, idx) => (
                              <span key={idx}>{r}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reply & React Quick Action Icons (Right side for partner messages) */}
                      {!isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
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
                          <button
                            onClick={() =>
                              setActiveReactionMsgId(
                                activeReactionMsgId === msg.id ? null : msg.id
                              )
                            }
                            className="p-1 rounded-full bg-zinc-900 border border-white/10 text-[10px] cursor-pointer"
                            title="React"
                          >
                            ❤️
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* =========================================================
                  CLEAN CLASSIC REMOTE TYPING BUBBLE
                 ========================================================= */}
              {remoteTyping && (
                <div className="flex items-center gap-2 pl-1 py-1 animate-in fade-in slide-in-from-bottom-1">
                  <div className="px-3.5 py-2 rounded-2xl rounded-bl-xs bg-[#1a1c24] border border-white/10 flex items-center gap-1.5 shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00F5A0] animate-bounce" />
                    <span className="text-[12px] text-zinc-300 font-medium ml-1">
                      {activeContact.name.split(' ')[0]} is typing...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* =========================================================
                NEXT-LEVEL FLOATING LIQUID-GLASS AURORA COMPOSER
               ========================================================= */}
            <div className="p-3 pt-1.5 bg-gradient-to-t from-[#07080B] via-[#07080B] to-transparent relative z-20">
              {/* 2. REPLY-TO-MESSAGE PREVIEW BAR */}
              {replyingTo && (
                <div className="mb-2 px-3.5 py-2 rounded-2xl bg-[#14151B]/95 border border-[#00F5A0]/30 flex items-center justify-between text-xs backdrop-blur-xl shadow-xl">
                  <div className="truncate pr-2">
                    <span className="text-[10px] font-bold text-[#00F5A0] block">
                      Replying to {replyingTo.sender === 'me' ? 'Yourself' : activeContact.name}
                    </span>
                    <span className="text-[12px] text-zinc-300 truncate block">
                      {replyingTo.shielded ? '🛡️ Blurred Secret Message' : replyingTo.text}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-full hover:bg-white/10 text-zinc-400 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 4. HOLD-TO-SEND / SEND EFFECT POPUP */}
              {showSendEffectMenu && (
                <div className="absolute bottom-16 right-4 z-30 w-52 bg-[#14151B]/95 border border-[#00F5A0]/40 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-0.5 flex items-center justify-between">
                    <span>Send with Effect</span>
                    <button onClick={() => setShowSendEffectMenu(false)} className="cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'burn')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-left text-xs font-semibold text-rose-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>🔥 Burn on Read</span>
                    <span className="text-[10px] font-mono opacity-75">3s + Shield</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'shield')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-[#00F5A0]/20 text-left text-xs font-semibold text-[#00F5A0] flex items-center justify-between cursor-pointer"
                  >
                    <span>🛡️ Fingerprint Shield</span>
                    <span className="text-[10px] font-mono opacity-75">Hold Blur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'whisper')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-fuchsia-500/20 text-left text-xs font-semibold text-fuchsia-300 flex items-center justify-between cursor-pointer"
                  >
                    <span>⚡ Whisper Surge</span>
                    <span className="text-[10px] font-mono opacity-75">Neon Pulse</span>
                  </button>
                </div>
              )}

              {/* Aurora Halo Wrapper */}
              <div
                className={`p-[1.5px] rounded-[28px] transition-all duration-300 ${
                  typingPulse > 0 || isRecording
                    ? 'aurora-border shadow-[0_0_28px_rgba(0,245,160,0.4)]'
                    : 'bg-white/10'
                }`}
              >
                <form
                  onSubmit={(e) => handleSend(e)}
                  className="bg-[#121217] rounded-[27px] px-3 py-1.5 flex items-center gap-2 shadow-xl"
                >
                  {/* Hold-to-Reveal Fingerprint Shield Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setShieldMode(!shieldMode);
                      audio.play('tap');
                    }}
                    className={`p-2 rounded-full transition-all shrink-0 cursor-pointer active:scale-95 ${
                      shieldMode
                        ? 'bg-[#00F5A0]/25 text-[#00F5A0] border border-[#00F5A0]/40 shadow-[0_0_10px_rgba(0,245,160,0.3)]'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                    }`}
                    title="Hold-to-Reveal Fingerprint Shield"
                  >
                    <Fingerprint className="w-4 h-4" />
                  </button>

                  {/* Text Input OR Live Waveform Voice Studio */}
                  {!isRecording ? (
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMessageText(val);
                        setTypingPulse(100);
                        audio.play('tap');
                        if (activeContact && activeContact.id !== 'placeholder') {
                          const cleanMe = myHandle.replace(/^@/, '').toLowerCase();
                          const cleanThem = activeContact.handle.replace(/^@/, '').toLowerCase();
                          const normRoomId = `dm_${[cleanMe, cleanThem].sort().join('__')}`;
                          NetworkService.broadcastTyping(normRoomId, cleanMe);
                        }
                      }}
                      placeholder={
                        shieldMode ? 'Shielded secret message...' : 'Stealth message...'
                      }
                      className="flex-1 bg-transparent text-[14px] text-white placeholder-zinc-500 focus:outline-none px-1 min-w-0"
                    />
                  ) : (
                    <div className="flex-1 flex items-center justify-between px-2 py-0.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                        <span className="font-mono font-bold text-rose-300">
                          0:0{recordSecs}
                        </span>
                        <div className="flex items-center gap-0.5 h-3.5">
                          {[40, 95, 55, 100, 65, 90, 50, 85, 70].map((h, i) => (
                            <span
                              key={i}
                              style={{ height: `${h}%` }}
                              className="w-0.5 rounded-full bg-gradient-to-t from-rose-500 to-[#00F5A0] animate-pulse"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleCancelVoiceRecord}
                          className="p-1 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          title="Cancel Recording"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSendVoice}
                          className="px-3 py-1 rounded-full bg-[#00F5A0] text-zinc-950 font-bold text-[11px] cursor-pointer active:scale-95 transition-all shadow-md"
                        >
                          Send 1x
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Secret Photo (Camera & Gallery) & Voice Recording Buttons */}
                  {!messageText.trim() && !isRecording && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <input
                        type="file"
                        ref={cameraInputRef}
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleGalleryPhotoSelect}
                      />
                      <input
                        type="file"
                        ref={galleryInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleGalleryPhotoSelect}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          cameraInputRef.current?.click();
                          audio.play('tap');
                        }}
                        className="p-2 rounded-full text-zinc-400 hover:text-[#00F5A0] hover:bg-white/5 transition-all cursor-pointer active:scale-95"
                        title="Take Snap with Camera"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          galleryInputRef.current?.click();
                          audio.play('tap');
                        }}
                        className="p-2 rounded-full text-zinc-400 hover:text-[#00F5A0] hover:bg-white/5 transition-all cursor-pointer active:scale-95"
                        title="Send Photo from Gallery"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleStartVoiceRecord}
                        className="p-2 rounded-full text-zinc-400 hover:text-rose-400 hover:bg-white/5 transition-all cursor-pointer active:scale-95"
                        title="Record Listen-Once Voice Note"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Crisp Send Button */}
                  {messageText.trim() && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSendEffectMenu(!showSendEffectMenu);
                          audio.play('tap');
                        }}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-[#00F5A0] cursor-pointer"
                        title="Choose Send Effect (Burn / Shield / Whisper)"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="submit"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setShowSendEffectMenu(true);
                        }}
                        onMouseDown={() => {
                          sendHoldTimerRef.current = setTimeout(() => {
                            setShowSendEffectMenu(true);
                            audio.play('tap');
                          }, 420);
                        }}
                        onMouseUp={() => {
                          if (sendHoldTimerRef.current) clearTimeout(sendHoldTimerRef.current);
                        }}
                        className="w-8 h-8 rounded-full bg-[#00F5A0] hover:bg-[#00e090] text-black flex items-center justify-center shrink-0 shadow-md shadow-[#00F5A0]/40 transition-transform active:scale-90 cursor-pointer"
                        title="Tap to Send • Hold for Effects"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[3]" />
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            COMPACT QR & 4-DIGIT RECOVERY PIN POPOVER MODAL
           ========================================================= */}
        {showQrPinPopover && (
          <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-[340px] bg-[#14151B]/95 border border-white/15 rounded-3xl p-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
              <button
                onClick={() => setShowQrPinPopover(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer active:scale-90 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold text-white mb-3.5 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-[#00F5A0]" />
                <span>Stealth Identity & App PIN</span>
              </div>

              {/* Sleek Segmented Control */}
              <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-2xl mb-4 text-[11px] font-semibold border border-white/10">
                <button
                  onClick={() => setPopoverTab('qr')}
                  className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                    popoverTab === 'qr' ? 'bg-[#00F5A0] text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  My Code
                </button>
                <button
                  onClick={() => setPopoverTab('connect')}
                  className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                    popoverTab === 'connect' ? 'bg-[#00F5A0] text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Connect
                </button>
                <button
                  onClick={() => setPopoverTab('pin')}
                  className={`py-1.5 rounded-xl transition-all cursor-pointer ${
                    popoverTab === 'pin' ? 'bg-[#00F5A0] text-black font-extrabold shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  App PIN
                </button>
              </div>

              {/* TAB 1: MY 6-DIGIT CODE & QR */}
              {popoverTab === 'qr' && (
                <div className="text-center space-y-3">
                  <div className="w-44 h-44 mx-auto p-3.5 rounded-3xl bg-white flex items-center justify-center shadow-2xl shadow-[#00F5A0]/20 relative">
                    <QRCodeSVG
                      value={`blinkmsg://connect?code=${myCode.replace(/\D/g, '')}`}
                      size={148}
                      bgColor="#ffffff"
                      fgColor="#09090b"
                      level="Q"
                    />
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                      Your Zero-Login 6-Digit Code
                    </span>
                    <div className="text-2xl font-mono font-black text-[#00F5A0] tracking-widest mt-0.5">
                      {myCode.replace(/\D/g, '')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(myCode.replace(/\D/g, ''));
                        setCopied(true);
                        audio.play('tap');
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="flex-1 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={() => setShowRegenerateDisclaimer(true)}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1 cursor-pointer"
                      title="Change 6-Digit Code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CONNECT BY PIN OR SCAN FRIEND'S QR */}
              {popoverTab === 'connect' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block mb-1.5">
                      Enter Friend's 6-Digit PIN or @Handle
                    </label>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (connectCodeInput.trim()) {
                          setShowQrPinPopover(false);
                          handleConnectFriend(e);
                        }
                      }}
                      className="space-y-2.5"
                    >
                      <div className="flex items-center gap-2 bg-black/60 border border-white/15 focus-within:border-[#00F5A0] rounded-xl px-3 py-2.5 transition-colors">
                        <KeyRound className="w-4 h-4 text-[#00F5A0] shrink-0" />
                        <input
                          type="text"
                          value={connectCodeInput}
                          onChange={(e) => setConnectCodeInput(e.target.value)}
                          placeholder="e.g. 768049 or @alex"
                          className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 font-mono tracking-wider focus:outline-none"
                          autoFocus
                        />
                      </div>

                      {searchTargetProfile && (
                        <div className="p-2 rounded-xl bg-[#00F5A0]/10 border border-[#00F5A0]/30 flex items-center justify-between text-xs">
                          <span className="font-bold text-[#00F5A0]">
                            Found: {searchTargetProfile.displayName || searchTargetProfile.handle}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">Verified</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={!connectCodeInput.trim()}
                        className="w-full py-2.5 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs cursor-pointer shadow-lg shadow-[#00F5A0]/20 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Connect to Chat</span>
                      </button>
                    </form>
                  </div>

                  <div className="relative flex items-center justify-center py-1">
                    <div className="border-t border-white/10 w-full" />
                    <span className="bg-[#141419] px-2 text-[10px] text-zinc-500 uppercase font-mono absolute">
                      or
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowQrPinPopover(false);
                      setShowCameraModal(true);
                      audio.play('tap');
                    }}
                    className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-2 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-[#00F5A0]" />
                    <span>Scan Friend's QR with Camera</span>
                  </button>
                </div>
              )}

              {/* TAB 3: 4-DIGIT RECOVERY & LOCK PIN */}
              {popoverTab === 'pin' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Set your <strong>4-Digit Recovery & App Lock PIN</strong>. Use this with your
                    code (<span className="text-zinc-200 font-mono">{myCode}</span>) to restore chats or unlock stealth mode.
                  </p>

                  <input
                    type="text"
                    maxLength={4}
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-900 border border-[#00F5A0]/40 rounded-xl py-2.5 text-center font-mono text-xl font-bold tracking-[0.6em] text-white focus:outline-none"
                  />

                  <button
                    onClick={() => {
                      audio.play('receive');
                      setPinSavedToast(true);
                      setTimeout(() => {
                        setPinSavedToast(false);
                        setShowQrPinPopover(false);
                      }, 900);
                    }}
                    className="w-full py-2 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-bold text-xs cursor-pointer"
                  >
                    {pinSavedToast ? '✓ 4-Digit PIN Updated!' : 'Save 4-Digit PIN'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            DISCLAIMER POPUP ON REGENERATING 6-DIGIT CODE
           ========================================================= */}
        {showRegenerateDisclaimer && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-5">
            <div className="w-full max-w-[310px] bg-[#141419] border border-amber-500/40 rounded-3xl p-5 shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-bold text-white">Regenerate 6-Digit Code?</h4>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  Naya code banate hi aapka purana connection code expire ho jayega. Naye dost purane code se connect nahi kar payenge.
                </p>
                <p className="text-[10px] text-emerald-400 mt-1.5 font-mono">
                  ✓ Purani chats bilkul safe rahengi.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={confirmRegenerateCode}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs cursor-pointer"
                >
                  Confirm New Code
                </button>
                <button
                  onClick={() => setShowRegenerateDisclaimer(false)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            STEALTH 4-DIGIT PIN LOCK OVERLAY (REAL PIN + DECOY PIN)
           ========================================================= */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-[#09090B]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-[#00F5A0]/15 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0] mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">BlinkMsg Vault Locked</h3>
            <p className="text-xs text-zinc-400 mt-1 text-center font-mono">
              Enter 4-Digit Security PIN
            </p>

            <div className="flex gap-3.5 my-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    lockError
                      ? 'bg-rose-500 scale-110'
                      : lockInput.length > i
                      ? 'bg-[#00F5A0] scale-110 shadow-[0_0_10px_#00F5A0]'
                      : 'bg-zinc-800 border border-white/15'
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleKeyPress(d)}
                  className="h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-lg font-semibold text-white active:scale-95 transition-all cursor-pointer"
                >
                  {d}
                </button>
              ))}
              <div className="h-14 rounded-full flex items-center justify-center text-zinc-600">
                <Shield className="w-5 h-5" />
              </div>
              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-lg font-semibold text-white cursor-pointer"
              >
                0
              </button>
              <button
                onClick={() => setLockInput((p) => p.slice(0, -1))}
                className="h-14 rounded-full bg-zinc-900/60 hover:bg-zinc-800 border border-white/5 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer active:scale-95"
                title="Backspace"
              >
                <CornerUpLeft className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Contact Management Action Sheet (Delete / Clear / Block) */}
        {actionContact && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#12131A] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={actionContact.avatar}
                    alt={actionContact.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white block truncate">
                      {actionContact.name}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono block">
                      {actionContact.handle}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActionContact(null)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5">
                {/* 1. Clear Chat History */}
                <button
                  onClick={() => {
                    handleClearChatHistory(actionContact.id);
                    setActionContact(null);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-left flex items-center gap-3 text-xs font-semibold text-zinc-200 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="block font-bold text-white">Clear Chat History</span>
                    <span className="text-[10px] text-zinc-400 font-normal">Wipe messages on this device</span>
                  </div>
                </button>

                {/* 2. Block / Unblock User */}
                <button
                  onClick={() => {
                    handleToggleBlock(actionContact.handle);
                    setActionContact(null);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-left flex items-center gap-3 text-xs font-semibold text-zinc-200 active:scale-95 transition-all cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="block font-bold text-white">
                      {blockedUsers.includes(actionContact.handle.replace(/^@/, '').toLowerCase())
                        ? 'Unblock User'
                        : 'Block User'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-normal">
                      {blockedUsers.includes(actionContact.handle.replace(/^@/, '').toLowerCase())
                        ? 'Allow incoming messages from this user'
                        : 'Prevent this user from messaging you'}
                    </span>
                  </div>
                </button>

                {/* 3. Delete Contact Permanently */}
                <button
                  onClick={() => {
                    handleRemoveContact(actionContact.id);
                    setActionContact(null);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-left flex items-center gap-3 text-xs font-semibold text-rose-300 active:scale-95 transition-all cursor-pointer"
                >
                  <UserMinus className="w-4 h-4 text-rose-400" />
                  <div>
                    <span className="block font-bold text-rose-200">Remove Contact</span>
                    <span className="text-[10px] text-rose-300/80 font-normal">Delete contact and all chat data</span>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setActionContact(null)}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Real Live Camera QR Scanner Modal */}
        <QRScannerModal
          isOpen={showCameraModal}
          onClose={() => setShowCameraModal(false)}
          onScanSuccess={(decodedText) => {
            setShowCameraModal(false);
            connectDirectly(decodedText);
          }}
        />
      </div>
    </div>
  );
};
export default App;
