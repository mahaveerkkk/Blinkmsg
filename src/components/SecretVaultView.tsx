import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, KeyRound, Radio, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    if (mode !== 'create' || !myCode) return;

    const roomId = `room_${myCode}`;

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
    <div className="pb-32 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center space-x-2">
          <h1 className="font-black text-2xl tracking-tight text-white">
            Secret PIN Room
          </h1>
          <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/10 text-[#D4FF00] text-[10px] font-mono font-bold border border-[#D4FF00]/25">
            P2P DISCOVERY
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
          Share your 6-digit PIN or scan QR. You connect together instantly with zero metadata saved.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-2xl bg-[#0E1017] p-1 border border-white/[0.08] mb-6 shadow-inner">
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
          My Secret Code
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
          Enter Friend's PIN
        </button>
      </div>

      {mode === 'create' && (
        <div className="rounded-[32px] bg-gradient-to-b from-[#0F121C] via-[#0B0D14] to-[#07080B] border border-white/[0.1] p-6 flex flex-col items-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative overflow-hidden animate-fade-in">
          {/* Top Sheen Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/60 to-transparent" />

          {/* 6-Digit PIN Display Card */}
          <div className="w-full bg-[#07080B] border border-white/[0.08] rounded-2xl p-4 mb-4 shadow-inner flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
                Session Room PIN
              </span>
              <span className="font-mono text-3xl font-black text-[#D4FF00] tracking-widest drop-shadow-[0_0_15px_rgba(212,255,0,0.3)]">
                {myCode}
              </span>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                onClick={handleCopyCode}
                className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 active:scale-90 transition-all border border-white/[0.08]"
                title="Copy PIN"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleGenerateNewCode}
                className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 active:scale-90 transition-all border border-white/[0.08]"
                title="Generate New PIN"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Radar Listening Badge */}
          <div className="flex items-center space-x-2 mb-5 py-1.5 px-4 rounded-full bg-[#00F5A0]/10 border border-[#00F5A0]/30 text-[#00F5A0] text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] animate-ping shrink-0" />
            <span>Listening live • Auto-connects when friend joins</span>
          </div>

          {/* High-Contrast QR Code Card */}
          <div className="p-4 bg-white rounded-3xl mb-4 shadow-2xl relative group">
            <QRCodeSVG
              value={inviteUrl}
              size={175}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-6 max-w-xs leading-relaxed">
            Your friend can scan this QR or type your 6-digit PIN. As soon as they type it, both of your screens open the chat simultaneously.
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={handleEnterMyRoom}
              className="w-full py-3.5 rounded-2xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black text-xs font-black flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)]"
            >
              <KeyRound className="w-4 h-4" />
              <span>Enter Room & Wait Inside</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-white text-xs font-bold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Invite Link Copied!' : 'Copy Direct Link'}</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-[32px] bg-gradient-to-b from-[#0F121C] via-[#0B0D14] to-[#07080B] border border-white/[0.1] p-6 shadow-2xl relative overflow-hidden animate-fade-in text-center">
          {/* Top Sheen */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/60 to-transparent" />

          <label className="block text-xs font-black text-zinc-300 mb-2 uppercase tracking-wider">
            Enter Friend's 6-Digit PIN
          </label>
          <p className="text-xs text-zinc-500 mb-5">
            Both parties will enter the encrypted room instantly.
          </p>

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
            className="w-full py-4 px-4 rounded-2xl bg-[#07080B] border border-white/[0.12] text-center font-mono text-3xl font-black tracking-[0.35em] text-[#D4FF00] placeholder-zinc-800 outline-none mb-5 shadow-inner focus:border-[#D4FF00]/80 transition-colors"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.trim().length < 6}
            className="w-full py-3.5 rounded-2xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-xs flex items-center justify-center space-x-2 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,255,0,0.3)]"
          >
            <span>Connect & Chat Now</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>
        </div>
      )}
    </div>
  );
};
