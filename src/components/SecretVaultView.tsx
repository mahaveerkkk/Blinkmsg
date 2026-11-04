import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, ArrowRight, ShieldCheck, KeyRound, Radio } from 'lucide-react';
import { ChatRoom, UserProfile } from '../types';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';
import { supabase, NetworkService } from '../services/network';

interface SecretVaultViewProps {
  currentUser: UserProfile;
  onEnterRoom: (room: ChatRoom) => void;
}

export const SecretVaultView: React.FC<SecretVaultViewProps> = ({
  currentUser,
  onEnterRoom,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [myCode, setMyCode] = useState<string>(() => StorageService.getMyRoomCode());
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = `https://blinkmsg.app/join/${myCode}`;

  // Automatically listen to our room code while on this screen!
  // As soon as a peer connects (peer_join) or sends any message (message),
  // automatically pull User A into ChatView without forcing them to click "Enter Room"!
  useEffect(() => {
    if (mode !== 'create' || !myCode) return;

    const roomId = `room_${myCode}`;

    // Ensure room exists in Supabase
    if (supabase) {
      supabase
        .from('chat_rooms')
        .upsert({
          id: roomId,
          code: myCode,
          timer_seconds: 30,
          is_burn_on_read: false,
        })
        .then();
    }

    const unsubscribe = NetworkService.subscribeToRoom(roomId, {
      onPeerJoin: (peer) => {
        sound.playReceive();
        sound.vibrate([20, 50, 30]);

        const room: ChatRoom = {
          id: roomId,
          code: myCode,
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
          code: myCode,
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
  }, [mode, myCode]);

  const handleGenerateNewCode = () => {
    sound.vibrate(10);
    const newCode = StorageService.refreshMyRoomCode();
    setMyCode(newCode);
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(myCode);
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
    const roomId = `room_${myCode}`;

    if (supabase) {
      try {
        await supabase.from('chat_rooms').upsert({
          id: roomId,
          code: myCode,
          timer_seconds: 30,
          is_burn_on_read: false,
        });
      } catch (err) {
        console.warn('Upsert room failed:', err);
      }
    }

    const room: ChatRoom = {
      id: roomId,
      code: myCode,
      participantCount: 1,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: 'Waiting for friend...',
      peerAvatarId: 2,
    };
    onEnterRoom(room);
  };

  const handleJoinByCode = async () => {
    const clean = joinCode.trim().replace(/\D/g, '');
    if (clean.length < 6) return;

    sound.playSend();
    const roomId = `room_${clean}`;

    if (supabase) {
      try {
        await supabase.from('chat_rooms').upsert({
          id: roomId,
          code: clean,
          timer_seconds: 30,
          is_burn_on_read: false,
        });
      } catch (err) {
        console.warn('Upsert room failed:', err);
      }
    }

    // Broadcast our join presence so User A's listening screen immediately triggers auto-entry!
    NetworkService.broadcastPeerJoin(roomId, currentUser.handle, currentUser.displayName, currentUser.avatarId);

    const room: ChatRoom = {
      id: roomId,
      code: clean,
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: `Room #${clean}`,
      peerAvatarId: 5,
    };
    onEnterRoom(room);
  };

  return (
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto select-none font-sans">
      <div className="mb-4">
        <h1 className="font-extrabold text-2xl tracking-tight text-white">
          Secret Room
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Give your 6-digit PIN to a friend. As soon as they enter it, you both connect instantly.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-2xl bg-[#141620] p-1 border border-white/[0.08] mb-5 shadow-inner">
        <button
          onClick={() => { sound.vibrate(6); setMode('create'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'create'
              ? 'bg-[#D4FF00] text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          My Room Code
        </button>
        <button
          onClick={() => { sound.vibrate(6); setMode('join'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'join'
              ? 'bg-[#D4FF00] text-black shadow-md'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Join with Code
        </button>
      </div>

      {mode === 'create' && (
        <div className="rounded-[28px] bg-[#0c0e14]/90 backdrop-blur-2xl border border-white/[0.08] p-5 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
          {/* Top Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/50 to-transparent" />

          {/* Room Code Badge */}
          <div className="flex items-center space-x-2 mb-3 mt-1">
            <span className="text-xs text-zinc-400 font-medium">Your PIN:</span>
            <span className="px-4 py-1.5 rounded-xl bg-black text-[#D4FF00] font-mono text-2xl font-black tracking-widest border border-[#D4FF00]/40 shadow-[0_0_15px_rgba(212,255,0,0.15)]">
              {myCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white active:scale-90 transition-all border border-white/[0.06]"
              title="Copy PIN"
            >
              {copiedCode ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleGenerateNewCode}
              className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 hover:text-white active:scale-90 transition-all border border-white/[0.06]"
              title="Generate New PIN"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Live Auto-Listen Radar Pill */}
          <div className="flex items-center space-x-2 mb-4 py-1 px-3.5 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/25 text-[#D4FF00] text-[11px] font-mono font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-ping shrink-0" />
            <span>Listening for friend... (Auto-connects)</span>
          </div>

          {/* Clean White QR */}
          <div className="p-3.5 bg-white rounded-2xl mb-4 shadow-xl">
            <QRCodeSVG
              value={inviteUrl}
              size={170}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-5 max-w-xs leading-relaxed">
            Scan QR or share the 6-digit PIN. As soon as your friend enters it, your screen will automatically open the chat.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={handleEnterMyRoom}
              className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black text-xs font-black flex items-center justify-center space-x-2 active:scale-95 transition-transform shadow-[0_0_20px_rgba(212,255,0,0.3)] sheen-shimmer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Enter Room Directly & Wait Inside</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#15171F] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center space-x-1.5 active:scale-95 transition-all hover:bg-white/[0.08]"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-[28px] bg-[#0c0e14]/90 backdrop-blur-2xl border border-white/[0.08] p-6 shadow-2xl relative overflow-hidden animate-fade-in">
          {/* Top Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/50 to-transparent" />

          <label className="block text-xs font-bold text-zinc-300 mb-2 uppercase tracking-wider text-center">
            Enter Friend's 6-Digit PIN
          </label>

          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && joinCode.trim().length === 6) {
                handleJoinByCode();
              }
            }}
            placeholder="000000"
            autoFocus
            className="w-full py-4 px-4 rounded-2xl bg-black border border-white/10 text-center font-mono text-3xl tracking-[0.3em] text-[#D4FF00] placeholder-zinc-800 outline-none mb-4 shadow-inner focus:border-[#D4FF00]/60"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.trim().length < 6}
            className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-black text-xs flex items-center justify-center space-x-1.5 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)] sheen-shimmer"
          >
            <span>Connect & Chat Now</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="mt-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center space-x-2 text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#D4FF00] shrink-0" />
            <span>Messages self-destruct. Room is purged once both leave.</span>
          </div>
        </div>
      )}
    </div>
  );
};
