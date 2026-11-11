<USER_REQUEST>
ui same banana import React, { useState, useEffect, useRef } from 'react';
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
  Trash2
} from 'lucide-react';

// ==========================================
// SUBTLE TACTILE AUDIO ENGINE
// ==========================================
class TactileSound {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  play(type) {
    if (this.muted) return;
    try {
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
    } catch (e) {}
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
    previewUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ep2',
    title: 'Late Night Espresso',
    caption: 'Secret Cafe Meet ☕🤫',
    gradient: 'from-amber-500/40 via-rose-500/40 to-indigo-600/40',
    previewUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80'
  },
  {
    id: 'ep3',
    title: 'Encrypted Vault Key',
    caption: 'Hardware Seed Snapshot 🔐',
    gradient: 'from-emerald-500/40 via-cyan-500/40 to-blue-600/40',
    previewUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&auto=format&fit=crop&q=80'
  }
];

const INITIAL_REQUESTS = [
  {
    id: 'req1',
    name: 'Zoya • Design',
    handle: '@zoya_ui',
    code: '771-409',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    via: 'Scanned your QR Code',
    time: '1m ago'
  },
  {
    id: 'req2',
    name: 'Dev_Phantom',
    handle: '@phantom_0x',
    code: '512-883',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    via: 'Entered your 6-Digit Code',
    time: '9m ago'
  }
];

const DECOY_CONTACTS = [
  {
    id: 'd1',
    name: 'Mom ❤️',
    handle: '@home_family',
    code: '101-202',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
    online: true,
    unread: 0,
    time: '1h'
  },
  {
    id: 'd2',
    name: 'College Study Notes',
    handle: '@uni_notes',
    code: '304-551',
    avatar: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    online: false,
    unread: 0,
    time: 'Yesterday'
  }
];

const DECOY_CHATS = {
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
      disintegrating: false
    }
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
      disintegrating: false
    }
  ]
};

// ==========================================
// INITIAL CONTACTS & CONVERSATIONS
// ==========================================
const INITIAL_CONTACTS = [
  {
    id: 'c1',
    name: 'Aria ✨',
    handle: '@aria_v',
    code: '904-112',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    color: 'from-indigo-500 to-violet-500',
    online: true,
    unread: 0,
    time: 'Now'
  },
  {
    id: 'c2',
    name: 'Kabir • Bro',
    handle: '@kabir_x',
    code: '318-774',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    color: 'from-emerald-500 to-teal-500',
    online: true,
    unread: 2,
    time: '2m'
  },
  {
    id: 'c3',
    name: 'Riya (Private)',
    handle: '@riya_sec',
    code: '629-401',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    color: 'from-rose-500 to-orange-500',
    online: false,
    unread: 1,
    time: '18m'
  }
];

const INITIAL_CHATS = {
  c1: [
    {
      id: 'm1',
      sender: 'them',
      type: 'text',
      text: 'Hey! Code add kar liya maine. Sabse best baat—na phone number laga na email ✨',
      timerMode: '30s',
      totalSeconds: 30,
      remainingSeconds: 24,
      seen: true,
      shielded: false,
      reactions: ['❤️'],
      time: '10:41 PM',
      disintegrating: false
    },
    {
      id: 'm2',
      sender: 'them',
      type: 'text',
      text: 'Is secret message ko padhne ke liye apni ungli daba kar rakho (Hold to Reveal) 🤫',
      timerMode: 'burn',
      totalSeconds: 4,
      remainingSeconds: 4,
      seen: false,
      shielded: true,
      reactions: ['🔥'],
      time: '10:42 PM',
      disintegrating: false
    },
    {
      id: 'm3',
      sender: 'me',
      type: 'text',
      text: 'Dekho! Jab tak tum message read nahi karogi, mera 10s timer start hi nahi hoga.',
      timerMode: '10s',
      totalSeconds: 10,
      remainingSeconds: 10,
      seen: false,
      shielded: false,
      reactions: [],
      time: '10:42 PM',
      disintegrating: false
    }
  ],
  c2: [
    {
      id: 'm21',
      sender: 'them',
      type: 'text',
      text: 'Bhai 4-digit recovery PIN set kar liya? Naye phone me bas wahi kaam aayega.',
      timerMode: '30s',
      totalSeconds: 30,
      remainingSeconds: 30,
      seen: false,
      shielded: false,
      time: '10:35 PM',
      disintegrating: false
    },
    {
      id: 'm22',
      sender: 'them',
      type: 'voice',
      text: 'Voice Note (0:05)',
      duration: '0:05',
      timerMode: 'burn',
      totalSeconds: 4,
      remainingSeconds: 4,
      seen: false,
      shielded: false,
      time: '10:36 PM',
      disintegrating: false
    }
  ],
  c3: [
    {
      id: 'm31',
      sender: 'them',
      type: 'photo',
      text: 'Ephemeral Photo',
      caption: 'Midnight Coffee Run ☕✨',
      timerMode: '10s',
      totalSeconds: 10,
      remainingSeconds: 10,
      seen: false,
      shielded: true,
      time: '9:50 PM',
      disintegrating: false
    }
  ]
};

export default function App() {
  // Navigation: 'onboarding' | 'list' | 'chat'
  const [screen, setScreen] = useState('chat');
  const [activeContactId, setActiveContactId] = useState('c1');
  const [contacts, setContacts] = useState(INITIAL_CONTACTS);
  const [chats, setChats] = useState(INITIAL_CHATS);
  const [pendingRequests, setPendingRequests] = useState(INITIAL_REQUESTS);
  const [showRequestsDrawer, setShowRequestsDrawer] = useState(true);

  // User Identity & Privacy Controls
  const [myCode, setMyCode] = useState('482-910');
  const [myHandle, setMyHandle] = useState('@arjun_k');
  const [recoveryPin, setRecoveryPin] = useState('2580');
  const [decoyPin] = useState('0000');
  const [decoyModeActive, setDecoyModeActive] = useState(false);
  const [ghostMode, setGhostMode] = useState(false);
  const [muted, setMuted] = useState(false);
  const [autoSeenSim, setAutoSeenSim] = useState(true);

  // Onboarding & Account Restore State
  const [isGeneratingId, setIsGeneratingId] = useState(false);
  const [showRestoreSheet, setShowRestoreSheet] = useState(false);
  const [restoreHandleInput, setRestoreHandleInput] = useState('@arjun_k');
  const [restorePinInput, setRestorePinInput] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  // Sleek Popovers & Overlays
  const [showQrPinPopover, setShowQrPinPopover] = useState(false);
  const [popoverTab, setPopoverTab] = useState('qr'); // 'qr' | 'pin' | 'scan'
  const [copied, setCopied] = useState(false);
  const [pinSavedToast, setPinSavedToast] = useState(false);
  const [showConnectSheet, setShowConnectSheet] = useState(false);
  const [connectCodeInput, setConnectCodeInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Panic Burn Popover State
  const [showPanicPopover, setShowPanicPopover] = useState(false);
  const [isBurningAll, setIsBurningAll] = useState(false);

  // Stealth 4-Digit App Lock Screen
  const [isLocked, setIsLocked] = useState(false);
  const [lockInput, setLockInput] = useState('');
  const [lockError, setLockError] = useState(false);

  // Next-Level Liquid Aurora Composer State
  const [messageText, setMessageText] = useState('');
  const [timerMode, setTimerMode] = useState('30s'); // '10s' | '30s' | '60s' | 'burn'
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [shieldMode, setShieldMode] = useState(false);
  const [typingPulse, setTypingPulse] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);

  // Advanced Chat Features: Remote Typing, Reply, Reactions, Send Effects, Photo Drawer
  const [remoteTyping, setRemoteTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
  const [showSendEffectMenu, setShowSendEffectMenu] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const [customPhotoCaption, setCustomPhotoCaption] = useState('');

  // Interactive Bubble States
  const [revealedIds, setRevealedIds] = useState({});
  const [playingVoiceId, setPlayingVoiceId] = useState(null);
  const [inAppBanner, setInAppBanner] = useState(null);

  const messagesEndRef = useRef(null);
  const sendHoldTimerRef = useRef(null);

  const activeContactsList = decoyModeActive ? DECOY_CONTACTS : contacts;
  const activeChatsMap = decoyModeActive ? DECOY_CHATS : chats;
  const activeContact =
    activeContactsList.find((c) => c.id === activeContactId) || activeContactsList[0];
  const currentMessages = activeChatsMap[activeContact?.id] || [];

  useEffect(() => {
    audio.muted = muted;
  }, [muted]);

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
                  [cId]: (latest[cId] || []).filter((m) => m.id !== msg.id)
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

  const getSeconds = (mode) => {
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
    const iv = setInterval(() => {
      ticks++;
      const r1 = Math.floor(100 + Math.random() * 899);
      const r2 = Math.floor(100 + Math.random() * 899);
      setMyCode(`${r1}-${r2}`);
      audio.play('tap');
      if (ticks >= 10) {
        clearInterval(iv);
        setIsGeneratingId(false);
        audio.play('receive');
      }
    }, 65);
  };

  // Restore Account with @handle + 4-Digit Recovery PIN
  const handleRestoreAccount = (e) => {
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
  const handleAcceptRequest = (req) => {
    audio.play('receive');
    setPendingRequests((prev) => prev.filter((r) => r.id !== req.id));
    const newContact = {
      id: req.id,
      name: req.name,
      handle: req.handle,
      code: req.code,
      avatar: req.avatar,
      color: 'from-emerald-500 to-teal-500',
      online: true,
      unread: 1,
      time: 'Just now'
    };
    setContacts((prev) => [newContact, ...prev]);
    setChats((prev) => ({
      ...prev,
      [req.id]: [
        {
          id: 'req_msg_' + Date.now(),
          sender: 'them',
          type: 'text',
          text: `Hey! Handshake accepted via ${req.code}. Zero-login stealth tunnel is live 🔒✨`,
          timerMode: '30s',
          totalSeconds: 30,
          remainingSeconds: 30,
          seen: false,
          shielded: false,
          reactions: [],
          time: 'Just now',
          disintegrating: false
        }
      ]
    }));
  };

  const handleIgnoreRequest = (reqId) => {
    audio.play('smoke');
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
  };

  // Send Text Message (Supports Special Effects: normal, burn, shield, whisper)
  const handleSend = (e, forcedEffect = null) => {
    if (e) e.preventDefault();
    if (!messageText.trim()) return;

    const chosenTimer = forcedEffect === 'burn' ? 'burn' : timerMode;
    const chosenShield =
      forcedEffect === 'shield' || forcedEffect === 'burn' ? true : shieldMode;
    const isWhisper = forcedEffect === 'whisper';

    const total = getSeconds(chosenTimer);
    const newId = 'msg_' + Date.now();
    const newMsg = {
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
            text: replyingTo.text
          }
        : null,
      reactions: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false
    };

    audio.play('send');
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));
    setMessageText('');
    setReplyingTo(null);
    setShowTimerMenu(false);
    setShowSendEffectMenu(false);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    // If Auto-Seen simulation is ON, partner reads the message after 2.2 seconds
    if (autoSeenSim && !chosenShield) {
      setTimeout(() => {
        markMessageSeen(activeContactId, newId);
      }, 2200);
    }
  };

  // Toggle Emoji Reaction on Message
  const handleReaction = (msgId, emoji) => {
    audio.play('tap');
    setChats((prev) => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map((m) => {
        if (m.id !== msgId) return m;
        const existing = m.reactions || [];
        const has = existing.includes(emoji);
        return {
          ...m,
          reactions: has ? existing.filter((r) => r !== emoji) : [...existing, emoji]
        };
      })
    }));
    setActiveReactionMsgId(null);
  };

  // Inject Screenshot Blocked Security Event Pill
  const triggerScreenshotBlockedAlert = () => {
    audio.play('alert');
    const alertMsg = {
      id: 'sys_' + Date.now(),
      sender: 'system',
      type: 'screenshot_alert',
      text: `🛡️ Screenshot attempt by ${activeContact.name.split(' ')[0]} blocked by Phantom Shield`,
      seen: false,
      totalSeconds: 60,
      remainingSeconds: 60,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), alertMsg]
    }));
    setScreen('chat');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  };

  // Send Listen-Once Voice Note
  const handleSendVoice = () => {
    const dur = Math.max(2, recordSecs);
    const newId = 'v_' + Date.now();
    const newMsg = {
      id: newId,
      sender: 'me',
      type: 'voice',
      text: `Voice Note (0:0${Math.min(9, dur)})`,
      duration: `0:0${Math.min(9, dur)}`,
      timerMode: 'burn',
      totalSeconds: 4,
      remainingSeconds: 4,
      seen: false,
      shielded: false,
      reactions: [],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      disintegrating: false
    };
    audio.play('send');
    setIsRecording(false);
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  // Send Selected Secret Ephemeral Photo from Picker Drawer
  const handleSendPhoto = (preset = EPHEMERAL_PHOTO_PRESETS[0]) => {
    const total = getSeconds(timerMode);
    const newId = 'p_' + Date.now();
    const newMsg = {
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
      disintegrating: false
    };
    audio.play('send');
    setShowPhotoPicker(false);
    setCustomPhotoCaption('');
    setChats((prev) => ({
      ...prev,
      [activeContactId]: [...(prev[activeContactId] || []), newMsg]
    }));
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const markMessageSeen = (chatId, msgId) => {
    audio.play('tap');
    setChats((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.id === msgId ? { ...m, seen: true } : m
      )
    }));
  };

  const vaporizeNow = (chatId, msgId) => {
    audio.play('smoke');
    setChats((prev) => ({
      ...prev,
      [chatId]: (prev[chatId] || []).map((m) =>
        m.id === msgId ? { ...m, disintegrating: true } : m
      )
    }));
    setTimeout(() => {
      setChats((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter((m) => m.id !== msgId)
      }));
    }, 450);
  };

  // Hold-to-Reveal Shield Handlers
  const handleHoldStart = (msg) => {
    audio.play('tap');
    setRevealedIds((prev) => ({ ...prev, [msg.id]: true }));
    setChats((prev) => ({
      ...prev,
      [activeContactId]: (prev[activeContactId] || []).map((m) =>
        m.id === msg.id ? { ...m, seen: true, everRevealed: true } : m
      )
    }));
  };

  const handleHoldEnd = (msg) => {
    setRevealedIds((prev) => ({ ...prev, [msg.id]: false }));
    if (msg.timerMode === 'burn' && msg.everRevealed) {
      vaporizeNow(activeContactId, msg.id);
    }
  };

  // Listen-Once Voice Note Playback
  const handlePlayVoice = (msg) => {
    if (playingVoiceId === msg.id || msg.disintegrating) return;
    audio.play('tap');
    setPlayingVoiceId(msg.id);
    setTimeout(() => {
      setPlayingVoiceId(null);
      vaporizeNow(activeContactId, msg.id);
    }, 2400);
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
        disintegrating: true
      }))
    }));
    setTimeout(() => {
      setChats((prev) => ({ ...prev, [activeContactId]: [] }));
      setIsBurningAll(false);
    }, 450);
  };

  // Simulate Incoming Message (No Screen Hijack)
  const triggerIncomingDemo = () => {
    const target = contacts.find((c) => c.id !== activeContactId) || contacts[1];
    const incomingMsg = {
      id: 'in_' + Date.now(),
      sender: 'them',
      type: 'text',
      text: 'Code lock checked! Yeh message padhte hi 10s me smoke ban jayega 🔥',
      timerMode: '10s',
      totalSeconds: 10,
      remainingSeconds: 10,
      seen: false,
      shielded: true,
      time: 'Just now',
      disintegrating: false
    };

    audio.play('receive');
    setChats((prev) => ({
      ...prev,
      [target.id]: [...(prev[target.id] || []), incomingMsg]
    }));
    setContacts((prev) =>
      prev.map((c) =>
        c.id === target.id ? { ...c, unread: (c.unread || 0) + 1, time: 'Now' } : c
      )
    );
    setInAppBanner({
      name: target.name,
      code: target.code,
      text: '🛡️ Encrypted Stealth Message'
    });
    setTimeout(() => setInAppBanner(null), 3000);
  };

  // Connect New Friend by 6-Digit Code or @handle
  const handleConnectFriend = (e) => {
    e.preventDefault();
    if (!connectCodeInput.trim()) return;
    const raw = connectCodeInput.trim();
    const isHandle = raw.startsWith('@');
    const cleanCode = isHandle
      ? `${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}`
      : raw.includes('-')
      ? raw
      : `${raw.slice(0, 3)}-${raw.slice(3, 6) || '882'}`;

    const newId = 'c_' + Date.now();
    const newContact = {
      id: newId,
      name: isHandle ? raw.slice(1) + ' ✨' : `Partner #${cleanCode.slice(0, 3)}`,
      handle: isHandle ? raw : `@user_${cleanCode.slice(0, 3)}`,
      code: cleanCode,
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      color: 'from-violet-500 to-fuchsia-500',
      online: true,
      unread: 0,
      time: 'Now'
    };

    audio.play('receive');
    setContacts((prev) => [newContact, ...prev]);
    setChats((prev) => ({
      ...prev,
      [newId]: [
        {
          id: 'w_' + Date.now(),
          sender: 'them',
          type: 'text',
          text: `Connected via zero-login code ${cleanCode}. No phone or email shared!`,
          timerMode: '30s',
          totalSeconds: 30,
          remainingSeconds: 30,
          seen: false,
          shielded: false,
          time: 'Just now',
          disintegrating: false
        }
      ]
    }));
    setConnectCodeInput('');
    setShowConnectSheet(false);
    setActiveContactId(newId);
    setScreen('chat');
  };

  // App Lock Keypad Handler (Supports Real PIN 2580 & Decoy PIN 0000)
  const handleKeyPress = (digit) => {
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
        }, 150);
      } else if (next === decoyPin) {
        audio.play('receive');
        setTimeout(() => {
          setDecoyModeActive(true);
          setActiveContactId('d1');
          setIsLocked(false);
          setLockInput('');
          setScreen('list');
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
    <div className="min-h-screen w-full bg-[#050507] text-zinc-100 flex flex-col items-center justify-center p-2 sm:p-4 font-sans select-none relative overflow-hidden">
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
          background: linear-gradient(270deg, #6366f1, #10b981, #ec4899, #8b5cf6, #06b6d4);
          background-size: 300% 300%;
          animation: auroraFlow 3.2s ease infinite;
        }
      `}</style>

      {/* SOFT STUDIO AMBIENT GLOW */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px]" />
        <div className="w-[400px] h-[400px] bg-emerald-500/8 rounded-full blur-[140px] -ml-40" />
      </div>

      {/* ==========================================
          EXTERNAL FLOATING STUDIO CONTROLS (OUTSIDE PHONE)
          Lets you test Onboarding, Chats, Typing Wave, Screenshot Block & Decoy PIN
         ========================================== */}
      <div className="relative z-20 mb-2.5 flex flex-wrap items-center justify-center gap-1.5 bg-zinc-900/85 border border-white/10 backdrop-blur-xl px-3 py-1.5 rounded-full shadow-2xl max-w-[96vw]">
        {/* Screen Switcher Segmented Pill */}
        <div className="flex items-center bg-black/50 p-0.5 rounded-full border border-white/5 mr-1">
          {[
            { id: 'onboarding', label: '✨ Onboarding' },
            { id: 'list', label: `📱 Chats (${pendingRequests.length})` },
            { id: 'chat', label: '💬 Active Chat' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setScreen(tab.id);
                audio.play('tap');
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                screen === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setRemoteTyping((v) => !v);
            setScreen('chat');
            audio.play('tap');
          }}
          className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all flex items-center gap-1 ${
            remoteTyping
              ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-300'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-300'
          }`}
        >
          <span>🌊 {remoteTyping ? 'Aria Typing: ON' : 'Aria Typing Wave'}</span>
        </button>

        <button
          onClick={triggerScreenshotBlockedAlert}
          className="px-2.5 py-1 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-[11px] font-medium text-rose-300 transition-all flex items-center gap-1"
        >
          <ShieldAlert className="w-3 h-3" />
          <span>📸 Test Screenshot Block</span>
        </button>

        <button
          onClick={triggerIncomingDemo}
          className="px-2.5 py-1 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-medium text-emerald-300 transition-all flex items-center gap-1"
        >
          <Bell className="w-3 h-3" />
          <span>Incoming (1)</span>
        </button>

        <button
          onClick={() => setIsLocked(true)}
          className="px-2.5 py-1 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-medium text-amber-300 transition-all flex items-center gap-1"
        >
          <Lock className="w-3 h-3" />
          <span>Lock ({recoveryPin} / Decoy 0000)</span>
        </button>
      </div>

      {/* =========================================================
          REALISTIC FLAGSHIP MOBILE FRAME (iPhone 16 Pro Dimensions)
         ========================================================= */}
      <div className="relative z-10 w-full max-w-[400px] h-[815px] max-h-[88vh] bg-[#09090B] rounded-[48px] border-[8px] border-[#1F1F24] shadow-[0_25px_90px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] flex flex-col overflow-hidden">
        {/* iOS STATUS BAR & DYNAMIC ISLAND */}
        <div className="pt-3 pb-2 px-7 flex items-center justify-between text-[12px] font-semibold text-zinc-200 bg-[#09090B]/90 backdrop-blur-md z-30 shrink-0">
          <span>9:41</span>
          <div className="w-28 h-5 bg-black rounded-full border border-white/5 flex items-center justify-between px-2.5">
            <span className="text-[9px] font-mono text-zinc-500">
              {decoyModeActive ? 'SAFE' : 'PHANTOM'}
            </span>
            <span
              className={`w-2 h-2 rounded-full ${
                decoyModeActive
                  ? 'bg-amber-400'
                  : ghostMode
                  ? 'bg-violet-400'
                  : 'bg-emerald-400 animate-pulse'
              }`}
            />
          </div>
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] font-mono">E2EE</span>
          </div>
        </div>

        {/* DECOY SAFE MODE ACTIVE BANNER */}
        {decoyModeActive && (
          <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-1.5 flex items-center justify-between text-[11px] text-amber-300 z-30">
            <span>🎭 Decoy PIN (0000) Active — Real Chats Hidden</span>
            <button
              onClick={() => {
                setDecoyModeActive(false);
                setActiveContactId('c1');
                audio.play('receive');
              }}
              className="underline font-bold text-amber-200"
            >
              Exit Decoy
            </button>
          </div>
        )}

        {/* NON-HIJACKING IN-APP NOTIFICATION PILL */}
        {inAppBanner && (
          <div
            onClick={() => {
              setScreen('list');
              setInAppBanner(null);
            }}
            className="absolute top-12 inset-x-4 z-50 bg-zinc-900/95 border border-emerald-500/40 backdrop-blur-2xl p-3 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer animate-bounce"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                +1
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{inAppBanner.name}</span>
                  <span className="text-[10px] font-mono text-zinc-400">#{inAppBanner.code}</span>
                </div>
                <div className="text-[11px] text-emerald-300">{inAppBanner.text}</div>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-zinc-400 bg-white/5 px-2 py-1 rounded-lg">
              View
            </span>
          </div>
        )}

        {/* =========================================================
            VIEW 0: ZERO-LOGIN ONBOARDING & ACCOUNT RESTORE SCREEN
           ========================================================= */}
        {screen === 'onboarding' && (
          <div className="flex-1 flex flex-col justify-between p-6 bg-[#09090B] relative overflow-y-auto">
            {/* Ambient Hero Glow */}
            <div className="pointer-events-none absolute top-10 inset-x-0 flex justify-center">
              <div className="w-56 h-56 bg-indigo-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center mt-2">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-indigo-600 to-violet-500 mx-auto flex items-center justify-center shadow-[0_12px_35px_rgba(99,102,241,0.45)] border border-white/20 mb-3">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-300 mb-2">
                <Sparkles className="w-3 h-3" /> NO PHONE • NO EMAIL • ZERO TRACE
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                PHANTOM // Velo
              </h1>
              <p className="text-xs text-zinc-400 mt-1 px-2 leading-relaxed">
                Generate your cryptographic 6-digit connection code in one tap. Share with your
                partner or friend—timers start only on Seen.
              </p>
            </div>

            {/* Slot-Machine 6-Digit Personal Code Card */}
            <div className="relative z-10 my-4 p-4 rounded-3xl bg-zinc-900/90 border border-white/10 shadow-2xl space-y-3">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>YOUR PERMANENT 6-DIGIT ID</span>
                <span className="text-emerald-400 font-mono">● E2EE Ready</span>
              </div>

              <div className="py-3 rounded-2xl bg-black/60 border border-indigo-500/30 flex items-center justify-center">
                <span
                  className={`font-mono text-3xl font-extrabold tracking-[0.22em] ${
                    isGeneratingId ? 'text-indigo-400 blur-[0.5px]' : 'text-white'
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
                    className="w-full bg-transparent font-mono text-xs font-bold tracking-widest text-emerald-300 focus:outline-none mt-0.5"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleSlotGenerateCode}
                className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-indigo-300 flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingId ? 'animate-spin' : ''}`} />
                <span>1-Tap Generate Secret Identity</span>
              </button>
            </div>

            {/* Primary CTA & Restore Account Trigger */}
            <div className="relative z-10 space-y-2.5">
              <button
                onClick={() => {
                  audio.play('send');
                  setScreen('list');
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-[0_10px_30px_rgba(99,102,241,0.4)] transition-all"
              >
                Enter Stealth Messenger →
              </button>

              <button
                onClick={() => setShowRestoreSheet(true)}
                className="w-full py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
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
                      <KeyRound className="w-4 h-4 text-emerald-400" />
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
                    Enter your <strong className="text-white">@handle</strong> and{' '}
                    <strong className="text-white">4-Digit Recovery PIN</strong> to pull your
                    encrypted identity onto this device.
                  </p>
                  <input
                    type="text"
                    value={restoreHandleInput}
                    onChange={(e) => setRestoreHandleInput(e.target.value)}
                    placeholder="@your_handle"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                  <input
                    type="text"
                    maxLength={4}
                    value={restorePinInput}
                    onChange={(e) => setRestorePinInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="4-Digit Recovery PIN (e.g. 2580)"
                    className="w-full bg-zinc-900 border border-emerald-500/40 rounded-xl px-3.5 py-2.5 text-center font-mono text-base font-bold tracking-[0.5em] text-emerald-300 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs"
                  >
                    {restoreSuccess ? '✓ Vault Restored!' : 'Unlock & Sync Chats'}
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
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B]">
            {/* Minimal Top Header */}
            <div className="px-5 pt-2 pb-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight text-white">Velo</h1>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                    {myHandle}
                  </span>
                  {ghostMode && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      👻 Ghost
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-zinc-500">Zero-Login Stealth Messenger</p>
              </div>

              <div className="flex items-center gap-1.5">
                {/* My 6-Digit Code & QR Trigger Pill */}
                <button
                  onClick={() => {
                    setPopoverTab('qr');
                    setShowQrPinPopover(true);
                  }}
                  className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 px-2.5 py-1.5 rounded-full transition-all"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-xs font-mono font-semibold text-zinc-200">{myCode}</span>
                </button>

                {/* Ghost Mode Toggle */}
                <button
                  onClick={() => {
                    setGhostMode(!ghostMode);
                    audio.play('tap');
                  }}
                  className={`p-2 rounded-full border transition-all ${
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
                  className="p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all"
                  title="Add Friend via 6-Digit Code"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Connect Slide-Down Bar */}
            {showConnectSheet && (
              <form
                onSubmit={handleConnectFriend}
                className="mx-5 mb-3 p-3 rounded-2xl bg-zinc-900/90 border border-indigo-500/30 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={connectCodeInput}
                  onChange={(e) => setConnectCodeInput(e.target.value)}
                  placeholder="Enter 6-digit code (e.g. 742-109) or @handle"
                  className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-xs"
                >
                  Connect
                </button>
              </form>
            )}

            {/* Search Bar */}
            <div className="px-5 mb-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search @handle or 6-digit code..."
                  className="w-full bg-zinc-900/90 border border-white/[0.06] rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/40"
                />
              </div>
            </div>

            {/* =========================================================
                CONNECTION REQUEST HANDSHAKE SECTION (PENDING REQUESTS)
               ========================================================= */}
            {!decoyModeActive && pendingRequests.length > 0 && (
              <div className="px-5 mb-2">
                <button
                  onClick={() => setShowRequestsDrawer(!showRequestsDrawer)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-xs font-semibold text-indigo-300"
                >
                  <span className="flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Connection Requests ({pendingRequests.length})</span>
                  </span>
                  <span className="text-[10px] text-indigo-400">
                    {showRequestsDrawer ? 'Hide' : 'Review'}
                  </span>
                </button>

                {showRequestsDrawer && (
                  <div className="mt-2 space-y-1.5">
                    {pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-2.5 rounded-2xl bg-zinc-900/95 border border-white/10 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={req.avatar}
                            alt={req.name}
                            className="w-9 h-9 rounded-full object-cover border border-indigo-500/40 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-white truncate">
                                {req.name}
                              </span>
                              <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded">
                                #{req.code}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 truncate">{req.via}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleAcceptRequest(req)}
                            className="px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px]"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleIgnoreRequest(req.id)}
                            className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 text-[10px]"
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
            <div className="flex-1 overflow-y-auto px-3 space-y-1">
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

                  return (
                    <button
                      key={contact.id}
                      onClick={() => {
                        setActiveContactId(contact.id);
                        setContacts((prev) =>
                          prev.map((c) => (c.id === contact.id ? { ...c, unread: 0 } : c))
                        );
                        setScreen('chat');
                      }}
                      className="w-full p-3 rounded-2xl hover:bg-zinc-900/80 transition-all flex items-center gap-3.5 text-left group"
                    >
                      <div className="relative shrink-0">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-12 h-12 rounded-full object-cover border border-white/10"
                        />
                        {contact.online && !ghostMode && (
                          <span className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#09090B] absolute bottom-0 right-0" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-sm text-white truncate">
                              {contact.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded-md">
                              #{contact.code}
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500">{contact.time}</span>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-zinc-400 truncate pr-2">
                            {last
                              ? last.shielded
                                ? '🛡️ Hold-to-Reveal Secret'
                                : last.text
                              : 'Tap to start disappearing chat'}
                          </p>

                          {/* WhatsApp-Style Green Unread Counter */}
                          {contact.unread > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px] shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                              {contact.unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* =========================================================
            VIEW 2: INSIDE A CHAT ROOM (ULTRA-CLEAN NEXT-LEVEL UI)
           ========================================================= */}
        {screen === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-[#09090B] relative">
            {/* Sleek Glass Header */}
            <div className="px-3 py-2.5 border-b border-white/[0.07] bg-[#09090B]/85 backdrop-blur-xl flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setScreen('list')}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-300 transition-colors flex items-center"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {contacts.reduce((sum, c) => sum + (c.unread || 0), 0) > 0 && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 -ml-1" />
                  )}
                </button>

                <div className="relative">
                  <img
                    src={activeContact.avatar}
                    alt={activeContact.name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10"
                  />
                  {activeContact.online && !ghostMode && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#09090B] absolute bottom-0 right-0" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-white leading-none">
                      {activeContact.name}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded">
                      #{activeContact.code}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                    {remoteTyping ? (
                      <span className="text-fuchsia-400 font-semibold animate-pulse">
                        ⚡ Streaming encrypted wave...
                      </span>
                    ) : ghostMode ? (
                      <span className="text-violet-300">👻 Ghost Mode Cloaked</span>
                    ) : (
                      <span className="text-emerald-400">● Timer starts on Seen</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Header Icons: Screenshot Test, QR/PIN Modal & Panic Burn */}
              <div className="flex items-center gap-1">
                <button
                  onClick={triggerScreenshotBlockedAlert}
                  className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-amber-300 transition-all"
                  title="Simulate Screenshot Attempt Blocked"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setPopoverTab('qr');
                    setShowQrPinPopover(true);
                  }}
                  className="p-2 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 transition-all"
                  title="My Code, QR & 4-Digit PIN"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowPanicPopover(!showPanicPopover)}
                  className="p-2 rounded-full bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 transition-all"
                  title="Panic Button: Burn Chat"
                >
                  <Flame className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sleek Panic Confirmation Popover */}
            {showPanicPopover && (
              <div className="absolute top-14 right-4 z-40 w-60 bg-zinc-900/95 border border-rose-500/40 backdrop-blur-2xl p-3.5 rounded-2xl shadow-2xl">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 mb-1">
                  <Flame className="w-4 h-4 text-rose-400" />
                  <span>Burn Entire Conversation?</span>
                </div>
                <p className="text-[11px] text-zinc-400 mb-3">
                  Wipes all messages on both phones in 450ms smoke with zero recovery.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handlePanicBurn}
                    className="flex-1 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30"
                  >
                    Burn Now
                  </button>
                  <button
                    onClick={() => setShowPanicPopover(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/5 text-zinc-300 text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================
                MESSAGE STREAM (SLEEK GLASS BUBBLES + SVG RINGS)
               ========================================================= */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* Subtle Encryption Pill */}
              <div className="text-center my-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-white/[0.06] text-[10px] text-zinc-400">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Zero-Login Tunnel • Double-tap message to React</span>
                </span>
              </div>

              {currentMessages.length === 0 && (
                <div className="h-60 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-500 mb-2">
                    <Flame className="w-5 h-5 text-rose-400/60" />
                  </div>
                  <p className="text-xs font-medium text-zinc-300">No trace left behind</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Messages vaporize automatically after your partner reads them.
                  </p>
                </div>
              )}

              {currentMessages.map((msg) => {
                // SYSTEM SCREENSHOT BLOCKED EVENT PILL
                if (msg.type === 'screenshot_alert') {
                  return (
                    <div key={msg.id} className="flex justify-center my-1.5">
                      <div className="px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-[10.5px] text-rose-300 font-medium flex items-center gap-1.5 shadow-lg">
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                const isMe = msg.sender === 'me';
                const isRevealed = !!revealedIds[msg.id];
                const isBlurred = msg.shielded && !isRevealed;
                const radius = 8;
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
                        className={`mb-1 z-30 flex items-center gap-1 bg-zinc-900/95 border border-white/15 px-2 py-1 rounded-full shadow-xl ${
                          isMe ? ' self-end' : 'self-start'
                        }`}
                      >
                        {['❤️', '🔥', '👀', '⚡'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(msg.id, emoji)}
                            className="hover:scale-125 transition-transform text-xs px-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 max-w-[85%]">
                      {/* Reply & React Quick Action Icons (Left side for my messages) */}
                      {isMe && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          <button
                            onClick={() =>
                              setActiveReactionMsgId(
                                activeReactionMsgId === msg.id ? null : msg.id
                              )
                            }
                            className="p-1 rounded-full bg-zinc-900 border border-white/10 text-[10px]"
                            title="React"
                          >
                            🔥
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(msg);
                              audio.play('tap');
                            }}
                            className="p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
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
                              : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-br-md shadow-[0_8px_24px_rgba(99,102,241,0.25)]'
                            : 'bg-[#18181D] border border-white/[0.08] text-zinc-100 rounded-bl-md shadow-md'
                        }`}
                      >
                        {/* Quoted Reply Header */}
                        {msg.replyTo && (
                          <div className="mb-1.5 pl-2 border-l-2 border-emerald-400 bg-black/25 rounded-r-lg py-1 pr-2 text-[10px]">
                            <span className="font-bold text-emerald-300 block">
                              {msg.replyTo.sender}
                            </span>
                            <span className="opacity-80 line-clamp-1">{msg.replyTo.text}</span>
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
                              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                                playingVoiceId === msg.id
                                  ? 'bg-rose-500 text-white animate-pulse'
                                  : 'bg-white text-indigo-950 hover:scale-105'
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
                                        ? 'bg-emerald-300 animate-bounce'
                                        : 'bg-white/40'
                                    }`}
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between text-[10px] opacity-80 mt-1">
                                <span>
                                  {playingVoiceId === msg.id ? 'Playing 1x...' : 'Listen-Once Audio'}
                                </span>
                                <span>{msg.duration || '0:04'}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* 3. EPHEMERAL SECRET PHOTO */}
                        {msg.type === 'photo' && (
                          <div
                            className={`rounded-2xl overflow-hidden border border-white/15 bg-zinc-950/60 p-2 min-w-[205px] transition-all duration-200 ${
                              isBlurred ? 'blur-lg opacity-25' : 'blur-0 opacity-100'
                            }`}
                          >
                            {msg.previewUrl ? (
                              <div className="relative h-32 rounded-xl overflow-hidden">
                                <img
                                  src={msg.previewUrl}
                                  alt={msg.caption}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                                  <span className="text-xs font-bold text-white">{msg.caption}</span>
                                  <span className="text-[9px] text-emerald-300">
                                    Zero Gallery Trace • Vaporizes on Seen
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="h-28 rounded-xl bg-gradient-to-tr from-indigo-500/30 via-fuchsia-500/20 to-emerald-400/20 flex flex-col items-center justify-center p-2 text-center">
                                <Sparkles className="w-6 h-6 text-indigo-300 mb-1" />
                                <span className="text-xs font-bold text-white">{msg.caption}</span>
                                <span className="text-[10px] text-zinc-300 mt-0.5">
                                  Zero Gallery Trace • Vaporizes on Timer
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* HOLD-TO-REVEAL FROSTED FINGERPRINT OVERLAY */}
                        {msg.shielded && (
                          <button
                            onMouseDown={() => handleHoldStart(msg)}
                            onMouseUp={() => handleHoldEnd(msg)}
                            onMouseLeave={() => isRevealed && handleHoldEnd(msg)}
                            onTouchStart={() => handleHoldStart(msg)}
                            onTouchEnd={() => handleHoldEnd(msg)}
                            className={`mt-2 w-full py-1.5 px-3 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all ${
                              isRevealed
                                ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40'
                                : 'bg-black/35 hover:bg-black/50 text-white border border-white/15 backdrop-blur-md'
                            }`}
                          >
                            <Fingerprint className="w-3.5 h-3.5 text-emerald-300" />
                            <span>
                              {isRevealed ? 'Release to Lock' : 'Hold Finger to Reveal'}
                            </span>
                          </button>
                        )}

                        {/* BOTTOM META ROW: TIME + SEEN-TRIGGERED CIRCULAR RING */}
                        <div className="flex items-center justify-end gap-2 mt-1.5 text-[10px] opacity-85">
                          <span>{msg.time}</span>

                          {!msg.seen ? (
                            <button
                              onClick={() => markMessageSeen(activeContactId, msg.id)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/25 hover:bg-black/40 text-amber-200 font-medium transition-all"
                              title="Tap to simulate Receiver reading this message"
                            >
                              <Clock className="w-2.5 h-2.5" />
                              <span>Waiting for Seen</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/30 text-emerald-300 font-mono font-bold">
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
                                  stroke="#10B981"
                                  strokeWidth="2.2"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={dashOffset}
                                  strokeLinecap="round"
                                  fill="none"
                                />
                              </svg>
                              <span>
                                {msg.timerMode === 'burn' ? '🔥' : `${msg.remainingSeconds}s`}
                              </span>
                            </div>
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
                            className="p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
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
                            className="p-1 rounded-full bg-zinc-900 border border-white/10 text-[10px]"
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
                  LIQUID WAVE REMOTE TYPING BUBBLE (WHEN ARIA IS TYPING)
                 ========================================================= */}
              {remoteTyping && (
                <div className="flex items-start gap-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="px-3.5 py-2.5 rounded-[22px] rounded-bl-md bg-[#18181D] border border-fuchsia-500/30 shadow-[0_0_20px_rgba(217,70,239,0.18)] flex items-center gap-2.5">
                    <div className="flex items-center gap-1 h-3.5">
                      {[45, 95, 60, 100, 50, 85].map((h, idx) => (
                        <span
                          key={idx}
                          style={{ height: `${h}%`, animationDelay: `${idx * 110}ms` }}
                          className="w-1 rounded-full bg-gradient-to-t from-indigo-400 via-fuchsia-400 to-emerald-300 animate-bounce"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-fuchsia-300">
                      {activeContact.name.split(' ')[0]} crafting cipher...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* =========================================================
                NEXT-LEVEL FLOATING LIQUID-GLASS AURORA COMPOSER
               ========================================================= */}
            <div className="p-3 pt-1 bg-gradient-to-t from-[#09090B] via-[#09090B] to-transparent relative z-20">
              {/* 1. EPHEMERAL SECRET PHOTO PICKER DRAWER */}
              {showPhotoPicker && (
                <div className="mb-2 p-3 rounded-3xl bg-zinc-900/95 border border-white/15 backdrop-blur-2xl shadow-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Send Ephemeral Secret Photo (Zero Gallery Trace)</span>
                    </span>
                    <button
                      onClick={() => setShowPhotoPicker(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {EPHEMERAL_PHOTO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSendPhoto(preset)}
                        className="group relative h-20 rounded-2xl overflow-hidden border border-white/15 text-left"
                      >
                        <img
                          src={preset.previewUrl}
                          alt={preset.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/50 flex flex-col justify-end p-1.5">
                          <span className="text-[9px] font-bold text-white leading-tight">
                            {preset.title}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={customPhotoCaption}
                    onChange={(e) => setCustomPhotoCaption(e.target.value)}
                    placeholder="Add optional secret caption..."
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
              )}

              {/* 2. REPLY-TO-MESSAGE PREVIEW BAR */}
              {replyingTo && (
                <div className="mb-1.5 px-3 py-1.5 rounded-2xl bg-zinc-900/95 border border-indigo-500/30 flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="text-[10px] font-bold text-indigo-400 block">
                      Replying to {replyingTo.sender === 'me' ? 'Yourself' : activeContact.name}
                    </span>
                    <span className="text-[11px] text-zinc-300 truncate block">
                      {replyingTo.shielded ? '🛡️ Blurred Secret Message' : replyingTo.text}
                    </span>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-full hover:bg-white/10 text-zinc-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 3. FLOATING SPEED-DIAL TIMER MENU */}
              {showTimerMenu && (
                <div className="absolute bottom-16 left-4 z-30 bg-zinc-900/95 border border-white/15 backdrop-blur-2xl p-1.5 rounded-2xl shadow-2xl flex items-center gap-1">
                  {[
                    { id: '10s', label: '10s' },
                    { id: '30s', label: '30s' },
                    { id: '60s', label: '60s' },
                    { id: 'burn', label: '🔥 Burn on Read' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTimerMode(t.id);
                        setShowTimerMenu(false);
                        audio.play('tap');
                      }}
                      className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                        timerMode === t.id
                          ? t.id === 'burn'
                            ? 'bg-rose-500 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {/* 4. HOLD-TO-SEND / SEND EFFECT POPUP (iMessage Invisible Ink Style) */}
              {showSendEffectMenu && (
                <div className="absolute bottom-16 right-4 z-30 w-52 bg-zinc-900/95 border border-indigo-500/40 backdrop-blur-2xl p-2 rounded-2xl shadow-2xl space-y-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-0.5 flex items-center justify-between">
                    <span>Send with Effect</span>
                    <button onClick={() => setShowSendEffectMenu(false)}>
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'burn')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-left text-xs font-semibold text-rose-300 flex items-center justify-between"
                  >
                    <span>🔥 Burn on Read</span>
                    <span className="text-[10px] font-mono opacity-75">3s + Shield</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'shield')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-indigo-500/20 text-left text-xs font-semibold text-indigo-300 flex items-center justify-between"
                  >
                    <span>🛡️ Fingerprint Shield</span>
                    <span className="text-[10px] font-mono opacity-75">Hold Blur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSend(null, 'whisper')}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-fuchsia-500/20 text-left text-xs font-semibold text-fuchsia-300 flex items-center justify-between"
                  >
                    <span>⚡ Whisper Surge</span>
                    <span className="text-[10px] font-mono opacity-75">Neon Pulse</span>
                  </button>
                </div>
              )}

              {/* Live Token / Physics Indicator While Typing */}
              {messageText.length > 0 && (
                <div className="flex items-center justify-between px-3 pb-1 text-[10px] font-mono text-indigo-300/90">
                  <span className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3 text-emerald-400" />
                    <span>AES-256 Stream • Hold ↑ for Send Effects</span>
                  </span>
                  <span>
                    {messageText.length} chars • {timerMode === 'burn' ? '🔥 Instant' : timerMode}
                  </span>
                </div>
              )}

              {/* Aurora Halo Wrapper */}
              <div
                className={`p-[1.5px] rounded-[26px] transition-all duration-300 ${
                  typingPulse > 0 || isRecording
                    ? 'aurora-border shadow-[0_0_28px_rgba(99,102,241,0.4)]'
                    : 'bg-white/10'
                }`}
              >
                <form
                  onSubmit={(e) => handleSend(e)}
                  className="bg-[#121216] rounded-[25px] px-2.5 py-1.5 flex items-center gap-1.5"
                >
                  {/* Compact Timer Speed-Dial Pill */}
                  <button
                    type="button"
                    onClick={() => setShowTimerMenu(!showTimerMenu)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1 shrink-0 transition-all ${
                      timerMode === 'burn'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-indigo-300 border border-white/5'
                    }`}
                    title="Auto-Delete Timer (Starts on Seen)"
                  >
                    <Clock className="w-3 h-3" />
                    <span>{timerMode === 'burn' ? 'Burn' : timerMode}</span>
                  </button>

                  {/* Hold-to-Reveal Fingerprint Shield Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      setShieldMode(!shieldMode);
                      audio.play('tap');
                    }}
                    className={`p-2 rounded-full transition-all shrink-0 ${
                      shieldMode
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                    title="Hold-to-Reveal Fingerprint Shield"
                  >
                    <Fingerprint className="w-4 h-4" />
                  </button>

                  {/* Text Input OR Live Red/Violet Waveform Voice Studio */}
                  {!isRecording ? (
                    <input
                      type="text"
                      value={messageText}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        setTypingPulse(100);
                        audio.play('tap');
                      }}
                      placeholder={
                        shieldMode ? 'Shielded secret message...' : 'Stealth message...'
                      }
                      className="flex-1 bg-transparent text-[13px] text-white placeholder-zinc-500 focus:outline-none px-1 min-w-0"
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
                              className="w-0.5 rounded-full bg-gradient-to-t from-rose-500 to-violet-400 animate-pulse"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsRecording(false)}
                          className="p-1 text-zinc-400 hover:text-rose-400"
                          title="Cancel Recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={handleSendVoice}
                          className="px-2.5 py-1 rounded-full bg-emerald-500 text-zinc-950 font-bold text-[10px]"
                        >
                          Send 1x
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Secret Photo & Mic Buttons (when input is empty) */}
                  {!messageText.trim() && !isRecording && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPhotoPicker(!showPhotoPicker);
                          audio.play('tap');
                        }}
                        className={`p-2 rounded-full transition-colors shrink-0 ${
                          showPhotoPicker
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                        title="Open Secret Ephemeral Photo Picker"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRecording(true);
                          audio.play('tap');
                        }}
                        className="p-2 rounded-full text-zinc-400 hover:text-rose-400 transition-colors shrink-0"
                        title="Record Listen-Once Voice Note"
                      >
                        <Mic className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Crisp Send Button (Tap to send, Right-Click or Hold for Send Effect Menu) */}
                  {messageText.trim() && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSendEffectMenu(!showSendEffectMenu);
                          audio.play('tap');
                        }}
                        className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-indigo-300"
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
                        onMouseUp={() => clearTimeout(sendHoldTimerRef.current)}
                        className="w-8 h-8 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/40 transition-transform active:scale-90"
                        title="Tap to Send • Hold for Effects"
                      >
                        <ArrowUp className="w-4 h-4 stroke-[2.5]" />
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
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-5">
            <div className="w-full max-w-[320px] bg-[#141419] border border-white/15 rounded-3xl p-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => setShowQrPinPopover(false)}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-xs font-bold text-white mb-3 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>Stealth Identity & 4-Digit PIN</span>
              </div>

              {/* Sleek Segmented Control */}
              <div className="grid grid-cols-3 gap-1 bg-zinc-900 p-1 rounded-xl mb-4 text-[11px] font-semibold">
                <button
                  onClick={() => setPopoverTab('qr')}
                  className={`py-1.5 rounded-lg transition-all ${
                    popoverTab === 'qr' ? 'bg-indigo-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  My Code
                </button>
                <button
                  onClick={() => setPopoverTab('scan')}
                  className={`py-1.5 rounded-lg transition-all ${
                    popoverTab === 'scan' ? 'bg-indigo-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  Scan QR
                </button>
                <button
                  onClick={() => setPopoverTab('pin')}
                  className={`py-1.5 rounded-lg transition-all ${
                    popoverTab === 'pin' ? 'bg-indigo-600 text-white' : 'text-zinc-400'
                  }`}
                >
                  4-Digit PIN
                </button>
              </div>

              {/* TAB 1: MY 6-DIGIT CODE & QR */}
              {popoverTab === 'qr' && (
                <div className="text-center space-y-3">
                  <div className="w-36 h-36 mx-auto p-3 rounded-2xl bg-white flex items-center justify-center shadow-inner">
                    <div className="grid grid-cols-6 gap-1 w-full h-full">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-[2px] ${
                            (i + parseInt(myCode)) % 2 === 0 || i === 0 || i === 5 || i === 30
                              ? 'bg-zinc-950'
                              : 'bg-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                      Your Zero-Login 6-Digit Code
                    </span>
                    <div className="text-xl font-mono font-bold text-white tracking-wider mt-0.5">
                      {myCode}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(myCode);
                        setCopied(true);
                        audio.play('tap');
                        setTimeout(() => setCopied(false), 1500);
                      }}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const next = `${Math.floor(100 + Math.random() * 899)}-${Math.floor(
                          100 + Math.random() * 899
                        )}`;
                        setMyCode(next);
                        audio.play('tap');
                      }}
                      className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs flex items-center gap-1"
                      title="Change 6-Digit Code"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>New</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: QR SCANNER */}
              {popoverTab === 'scan' && (
                <div className="text-center space-y-3">
                  <div className="h-36 rounded-2xl bg-black border border-indigo-500/40 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-24 h-24 border-2 border-emerald-400 rounded-xl flex items-center justify-center">
                      <div className="w-full h-0.5 bg-emerald-400 animate-bounce" />
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-2">
                      Align friend's QR code inside frame
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setShowQrPinPopover(false);
                      setConnectCodeInput('840-291');
                      setShowConnectSheet(true);
                      setScreen('list');
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs"
                  >
                    Simulate Instant QR Scan
                  </button>
                </div>
              )}

              {/* TAB 3: 4-DIGIT RECOVERY & LOCK PIN */}
              {popoverTab === 'pin' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Set your <strong>4-Digit Recovery & App Lock PIN</strong>. Use this with your
                    code (<span className="text-zinc-200 font-mono">{myCode}</span>) to restore
                    chats or unlock stealth mode.
                  </p>

                  <input
                    type="text"
                    maxLength={4}
                    value={recoveryPin}
                    onChange={(e) => setRecoveryPin(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-zinc-900 border border-indigo-500/40 rounded-xl py-2.5 text-center font-mono text-xl font-bold tracking-[0.6em] text-white focus:outline-none"
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
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs"
                  >
                    {pinSavedToast ? '✓ 4-Digit PIN Updated!' : 'Save 4-Digit PIN'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================
            STEALTH 4-DIGIT PIN LOCK OVERLAY (REAL PIN + DECOY PIN)
           ========================================================= */}
        {isLocked && (
          <div className="absolute inset-0 z-50 bg-[#09090B]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Phantom Vault Locked</h3>
            <p className="text-xs text-zinc-400 mt-1 text-center">
              Real PIN: <span className="font-mono text-indigo-300 font-bold">{recoveryPin}</span> •
              Decoy Safe PIN: <span className="font-mono text-amber-300 font-bold">0000</span>
            </p>

            <div className="flex gap-3.5 my-6">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all ${
                    lockError
                      ? 'bg-rose-500 scale-110'
                      : lockInput.length > i
                      ? 'bg-indigo-400 scale-110 shadow-[0_0_10px_#818cf8]'
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
                  className="h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-lg font-semibold text-white active:scale-95 transition-all"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => {
                  audio.play('receive');
                  setIsLocked(false);
                  setLockInput('');
                }}
                className="h-14 rounded-full bg-indigo-500/15 text-indigo-300 flex items-center justify-center"
                title="Biometric Unlock"
              >
                <Fingerprint className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-lg font-semibold text-white"
              >
                0
              </button>
              <button
                onClick={() => setLockInput((p) => p.slice(0, -1))}
                className="h-14 rounded-full text-xs font-semibold text-zinc-400 hover:text-white"
              >
                DEL
              </button>
            </div>
          </div>
        )}

        {/* iOS Home Indicator */}
        <div className="py-2 bg-[#09090B] flex justify-center shrink-0">
          <div className="w-32 h-1 rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  );
} ,,isme bhi bahut feature add kiye hai bana do ye sab achhe wale theek hai  
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-11T10:08:52+05:30.
</ADDITIONAL_METADATA>