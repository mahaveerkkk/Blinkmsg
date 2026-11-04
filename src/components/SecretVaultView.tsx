import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, RefreshCw, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { ChatRoom, UserProfile } from '../types';
import { CryptoService } from '../services/crypto';
import { sound } from '../services/sound';

interface SecretVaultViewProps {
  currentUser: UserProfile;
  onEnterRoom: (room: ChatRoom) => void;
}

export const SecretVaultView: React.FC<SecretVaultViewProps> = ({
  currentUser,
  onEnterRoom,
}) => {
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const initialCode = CryptoService.generateRoomCode();
  const [createdRoom, setCreatedRoom] = useState<ChatRoom>({
    id: 'room_' + initialCode,
    code: initialCode,
    participantCount: 1,
    timerSeconds: 30,
    isBurnOnRead: false,
    secretKey: 'blink_secure_key_' + Math.random().toString(36).substring(2),
  });
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleGenerateRoom = async () => {
    sound.vibrate(10);
    const code = CryptoService.generateRoomCode();
    try {
      const { base64Key } = await CryptoService.generateRoomKey();
      setCreatedRoom({
        id: 'room_' + code,
        code,
        participantCount: 1,
        timerSeconds: 30,
        isBurnOnRead: false,
        secretKey: base64Key,
      });
    } catch {
      setCreatedRoom({
        id: 'room_' + code,
        code,
        participantCount: 1,
        timerSeconds: 30,
        isBurnOnRead: false,
        secretKey: 'key_' + Math.random().toString(36).substring(2),
      });
    }
  };

  const inviteUrl = `https://blinkmsg.app/join/${createdRoom.code}#key=${createdRoom.secretKey || 'e2ee'}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteUrl);
    sound.vibrate(15);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleJoinByCode = async () => {
    const clean = joinCode.trim().replace(/\D/g, '');
    if (clean.length < 6) return;

    sound.playSend();
    const room: ChatRoom = {
      id: 'room_' + clean,
      code: clean,
      participantCount: 2,
      timerSeconds: 30,
      isBurnOnRead: false,
      peerHandle: 'Peer',
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
          Temporary E2E encrypted room. No accounts needed.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-[#141416] p-1 border border-white/[0.08] mb-5">
        <button
          onClick={() => { sound.vibrate(6); setMode('create'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'create'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Create Room (QR)
        </button>
        <button
          onClick={() => { sound.vibrate(6); setMode('join'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            mode === 'join'
              ? 'bg-emerald-500 text-black shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Join with Code
        </button>
      </div>

      {mode === 'create' && createdRoom && (
        <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-5 flex flex-col items-center text-center shadow-2xl">
          {/* Room Code Badge */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-zinc-400">Room Code:</span>
            <span className="px-3 py-1 rounded-xl bg-black text-emerald-400 font-mono text-base font-bold tracking-widest border border-emerald-500/30">
              {createdRoom.code}
            </span>
            <button
              onClick={handleGenerateRoom}
              className="p-1 rounded-md text-zinc-400 hover:text-white"
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
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
            Scan to join instantly. Decryption keys stay inside the QR code and are never sent to any server.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#1c1c20] border border-white/[0.08] text-white text-xs font-medium flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Private Invite Link'}</span>
            </button>

            <button
              onClick={() => onEnterRoom(createdRoom)}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-black text-xs font-bold flex items-center justify-center active:scale-95 transition-transform shadow-md"
            >
              Enter Room Now
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-5 shadow-2xl">
          <label className="block text-xs font-semibold text-zinc-300 mb-2 uppercase tracking-wider">
            Enter 6-Digit Room Code
          </label>

          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full py-3.5 px-4 rounded-2xl bg-black border border-white/10 text-center font-mono text-2xl tracking-[0.3em] text-emerald-400 placeholder-zinc-700 outline-none mb-4 shadow-inner"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.length < 6}
            className="w-full py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs flex items-center justify-center space-x-1 disabled:opacity-30 active:scale-95 transition-all shadow-md"
          >
            <span>Connect & Decrypt Room</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <div className="mt-5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center space-x-2 text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Rooms are purged immediately once both participants leave.</span>
          </div>
        </div>
      )}
    </div>
  );
};
