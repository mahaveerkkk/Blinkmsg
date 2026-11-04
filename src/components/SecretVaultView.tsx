import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { ChatRoom, UserProfile } from '../types';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';
import { supabase } from '../services/network';

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
    <div className="pb-28 pt-4 px-4 max-w-md mx-auto select-none">
      <div className="mb-4">
        <h1 className="font-bold text-2xl tracking-tight text-white">
          Secret Room
        </h1>
        <p className="text-xs text-zinc-400">
          Share your 6-digit code or enter a friend's code to chat instantly.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-[#141416] p-1 border border-white/[0.08] mb-5">
        <button
          onClick={() => { sound.vibrate(6); setMode('create'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'create'
              ? 'bg-[#D4FF00] text-black shadow-sm font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          My Room Code
        </button>
        <button
          onClick={() => { sound.vibrate(6); setMode('join'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'join'
              ? 'bg-[#D4FF00] text-black shadow-sm font-bold'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Join with Code
        </button>
      </div>

      {mode === 'create' && (
        <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-5 flex flex-col items-center text-center shadow-2xl">
          {/* Room Code Badge */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-zinc-400">Your Code:</span>
            <span className="px-4 py-1.5 rounded-xl bg-black text-[#D4FF00] font-mono text-xl font-bold tracking-widest border border-[#D4FF00]/40">
              {myCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-300 hover:text-white active:scale-90"
              title="Copy Code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleGenerateNewCode}
              className="p-1.5 rounded-lg bg-white/[0.05] text-zinc-300 hover:text-white active:scale-90"
              title="Generate New Code"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
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
            Give this 6-digit code to your friend. As soon as they enter it, you both connect instantly.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={handleEnterMyRoom}
              className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black text-xs font-extrabold flex items-center justify-center space-x-1.5 active:scale-95 transition-transform shadow-[0_0_15px_rgba(212,255,0,0.3)]"
            >
              <KeyRound className="w-4 h-4" />
              <span>Enter Room & Start Chat</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs font-medium flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-[#D4FF00]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Shareable Link'}</span>
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-5 shadow-2xl">
          <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider text-center">
            Enter 6-Digit Code
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
            className="w-full py-4 px-4 rounded-2xl bg-black border border-white/10 text-center font-mono text-3xl tracking-[0.3em] text-[#D4FF00] placeholder-zinc-700 outline-none mb-4 shadow-inner focus:border-[#D4FF00]/50"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.trim().length < 6}
            className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-extrabold text-xs flex items-center justify-center space-x-1 disabled:opacity-30 active:scale-95 transition-all shadow-[0_0_15px_rgba(212,255,0,0.3)]"
          >
            <span>Connect & Chat Now</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <div className="mt-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center space-x-2 text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-[#D4FF00] shrink-0" />
            <span>Messages self-destruct. Nothing is permanently stored.</span>
          </div>
        </div>
      )}
    </div>
  );
};
