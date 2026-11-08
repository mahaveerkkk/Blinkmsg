import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, KeyRound, QrCode, ArrowRight, ShieldCheck, Sparkles, Camera } from 'lucide-react';
import { ChatRoom, UserProfile } from '../types';
import { sound } from '../services/sound';
import { supabase, NetworkService, handleToPin } from '../services/network';

interface SecretVaultViewProps {
  currentUser: UserProfile;
  onEnterRoom: (room: ChatRoom) => void;
  onStartChatWithUser?: (user: UserProfile) => void;
  onOpenScanner?: () => void;
}

export const SecretVaultView: React.FC<SecretVaultViewProps> = ({
  currentUser,
  onEnterRoom,
  onStartChatWithUser,
  onOpenScanner,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const myPin = handleToPin(currentUser.handle);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const inviteUrl = `https://blinkmsg.app/join/${myPin}`;

  const formattedPin = myPin.length === 6 ? `${myPin.slice(0, 3)} - ${myPin.slice(3)}` : myPin;

  // Listen live to user's personal room or inbox
  useEffect(() => {
    if (mode !== 'create') return;

    const roomId = `room_${myPin}`;

    if (supabase) {
      supabase
        .from('chat_rooms')
        .upsert({
          id: roomId,
          code: myPin,
          timer_seconds: 30,
          is_burn_on_read: false,
        })
        .then();
    }

    const unsubscribe = NetworkService.subscribeToRoom(roomId, {
      onPeerJoin: (peer) => {
        sound.playReceive();
        sound.vibrate([25, 50, 25]);

        const room: ChatRoom = {
          id: roomId,
          code: myPin,
          participantCount: 2,
          timerSeconds: 30,
          isBurnOnRead: false,
          peerHandle: peer.handle,
          peerDisplayName: peer.displayName || peer.handle,
          peerAvatarId: peer.avatarId || 3,
        };
        onEnterRoom(room);
      },
      onMessage: (msg: any) => {
        sound.playReceive();

        const room: ChatRoom = {
          id: roomId,
          code: myPin,
          participantCount: 2,
          timerSeconds: 30,
          isBurnOnRead: false,
          peerHandle: msg.senderHandle || 'Friend',
          peerDisplayName: msg.senderDisplayName || msg.senderHandle || 'Friend',
          peerAvatarId: 3,
        };
        onEnterRoom(room);
      },
    });

    return () => unsubscribe();
  }, [mode, myPin]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(myPin);
    sound.vibrate(15);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteUrl);
    sound.vibrate(15);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEnterMyRoom = async () => {
    sound.playSend();
    const roomId = `room_${myPin}`;

    if (supabase) {
      try {
        await supabase.from('chat_rooms').upsert({
          id: roomId,
          code: myPin,
          timer_seconds: 30,
          is_burn_on_read: false,
        });
      } catch (err) {
        console.warn('Upsert room failed:', err);
      }
    }

    const room: ChatRoom = {
      id: roomId,
      code: myPin,
      participantCount: 1,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: 'Waiting for friend...',
      peerAvatarId: 2,
    };
    onEnterRoom(room);
  };

  const handleJoinByCode = async () => {
    setErrorMsg('');
    const clean = joinCode.trim().toLowerCase().replace(/[@\s-]/g, '');
    if (!clean || clean.length < 3) {
      setErrorMsg('Please enter a 6-digit PIN or @handle.');
      sound.playPanic();
      return;
    }

    setIsSearching(true);
    sound.vibrate(12);

    try {
      // 1. Try finding friend by 6-digit PIN or handle
      const foundUser = await NetworkService.findProfileByPin(clean);

      if (foundUser && onStartChatWithUser) {
        sound.playSend();
        setIsSearching(false);
        onStartChatWithUser(foundUser);
        return;
      }

      // 2. If not a registered profile, treat as secret anonymous room code
      sound.playSend();
      const roomId = `room_${clean}`;

      if (supabase) {
        await supabase.from('chat_rooms').upsert({
          id: roomId,
          code: clean.slice(0, 6),
          timer_seconds: 30,
          is_burn_on_read: false,
        });
      }

      NetworkService.broadcastPeerJoin(roomId, currentUser.handle, currentUser.displayName, currentUser.avatarId);

      const room: ChatRoom = {
        id: roomId,
        code: clean.slice(0, 6),
        participantCount: 2,
        timerSeconds: 30,
        isBurnOnRead: false,
        peerHandle: `Room #${clean}`,
        peerAvatarId: 5,
      };
      setIsSearching(false);
      onEnterRoom(room);
    } catch {
      setIsSearching(false);
      setErrorMsg('Could not connect. Please try again.');
      sound.playPanic();
    }
  };

  return (
    <div className="pb-32 pt-3 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* Top Header */}
      <div className="mb-4">
        <div className="flex items-center space-x-2">
          <h1 className="font-extrabold text-2xl tracking-tight text-white">
            Connect
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/10 text-[#D4FF00] text-[10px] font-mono font-bold border border-[#D4FF00]/25">
            PERSONAL PIN & QR
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Share your permanent 6-digit PIN or QR code to connect directly with zero tracking.
        </p>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex rounded-2xl bg-[#0E1017] p-1 border border-white/[0.08] mb-5 shadow-inner">
        <button
          onClick={() => {
            sound.vibrate(6);
            setMode('create');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            mode === 'create'
              ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          My Personal PIN
        </button>
        <button
          onClick={() => {
            sound.vibrate(6);
            setMode('join');
          }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
            mode === 'join'
              ? 'bg-[#D4FF00] text-black shadow-lg shadow-[#D4FF00]/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Connect with Friend
        </button>
      </div>

      {mode === 'create' && (
        <div className="rounded-[28px] bg-gradient-to-b from-[#0F121C] via-[#0B0D14] to-[#07080B] border border-white/[0.1] p-5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden animate-fade-in">
          {/* Subtle Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/60 to-transparent" />

          {/* 6-Digit Personal PIN Display Box */}
          <div className="w-full bg-[#07080B] border border-white/[0.08] rounded-2xl p-4 mb-4 shadow-inner flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-bold">
                My Connection PIN
              </span>
              <span className="font-mono text-3xl font-black text-[#D4FF00] tracking-wider drop-shadow-[0_0_15px_rgba(212,255,0,0.3)]">
                {formattedPin}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                @{currentUser.handle}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 active:scale-90 transition-all border border-white/[0.08] flex items-center space-x-1"
                title="Copy PIN"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#00F5A0]" /> : <Copy className="w-4 h-4" />}
                <span className="text-[11px] font-bold">{copiedCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Live Listening Badge */}
          <div className="flex items-center space-x-2 mb-4 py-1.5 px-3.5 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-ping shrink-0" />
            <span>Ready • Connects automatically when friend types PIN</span>
          </div>

          {/* High-Contrast Crisp QR Code Card */}
          <div className="p-3.5 bg-white rounded-2xl mb-4 shadow-2xl relative group">
            <QRCodeSVG
              value={inviteUrl}
              size={170}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-5 max-w-xs leading-relaxed">
            Your friend can scan this QR with their camera scanner or enter your PIN <span className="text-white font-mono font-bold">{myPin}</span> to chat directly.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={handleEnterMyRoom}
              className="w-full py-3 rounded-2xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black text-xs font-black flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-md"
            >
              <KeyRound className="w-4 h-4" />
              <span>Enter Room & Wait Inside</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#00F5A0]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-[28px] bg-gradient-to-b from-[#0F121C] via-[#0B0D14] to-[#07080B] border border-white/[0.1] p-5 shadow-2xl relative overflow-hidden animate-fade-in text-center">
          {/* Subtle Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/60 to-transparent" />

          <label className="block text-xs font-black text-zinc-300 mb-1.5 uppercase tracking-wider">
            Enter Friend's 6-Digit PIN or @handle
          </label>
          <p className="text-xs text-zinc-400 mb-4">
            Type their code below to start a private encrypted chat instantly.
          </p>

          <input
            type="text"
            inputMode="numeric"
            maxLength={12}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && joinCode.trim().length >= 3) {
                handleJoinByCode();
              }
            }}
            placeholder="000 000"
            autoFocus
            className="w-full py-3.5 px-4 rounded-2xl bg-[#07080B] border border-white/[0.12] text-center font-mono text-2xl font-black tracking-[0.25em] text-[#D4FF00] placeholder-zinc-700 outline-none mb-3 shadow-inner focus:border-[#D4FF00]/80 transition-colors"
          />

          {errorMsg && (
            <p className="text-xs text-red-400 font-mono mb-3">
              {errorMsg}
            </p>
          )}

          <button
            onClick={handleJoinByCode}
            disabled={isSearching || joinCode.trim().length < 3}
            className="w-full py-3.5 rounded-2xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-xs flex items-center justify-center space-x-2 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.25)] mb-3"
          >
            <span>{isSearching ? 'Connecting...' : 'Connect & Chat Now'}</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          {onOpenScanner && (
            <button
              onClick={() => {
                sound.vibrate(8);
                onOpenScanner();
              }}
              className="w-full py-2.5 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-200 text-xs font-bold flex items-center justify-center space-x-2 active:scale-95 transition-all"
            >
              <Camera className="w-4 h-4 text-[#D4FF00]" />
              <span>Or Scan Friend's QR Code</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
