import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Key, Copy, Check, RefreshCw, ArrowRight } from 'lucide-react';
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
  const [createdRoom, setCreatedRoom] = useState<ChatRoom | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const handleGenerateRoom = async () => {
    sound.vibrate(10);
    const code = CryptoService.generateRoomCode();
    const { base64Key } = await CryptoService.generateRoomKey();

    const room: ChatRoom = {
      id: 'room_' + code,
      code,
      participantCount: 1,
      timerSeconds: 30,
      isBurnOnRead: false,
      secretKey: base64Key,
    };
    setCreatedRoom(room);
  };

  React.useEffect(() => {
    handleGenerateRoom();
  }, []);

  const handleCopyLink = () => {
    if (!createdRoom) return;
    const inviteUrl = `${window.location.origin}/#room=${createdRoom.code}&key=${createdRoom.secretKey}`;
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

  const inviteUrl = createdRoom
    ? `${window.location.origin}/#room=${createdRoom.code}&key=${createdRoom.secretKey}`
    : '';

  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto select-none">
      {/* Mode Switcher */}
      <div className="flex rounded-xl bg-[#141416] p-1 border border-[#222226] mb-5">
        <button
          onClick={() => { sound.vibrate(6); setMode('create'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === 'create'
              ? 'bg-[#27272a] text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Create Room
        </button>
        <button
          onClick={() => { sound.vibrate(6); setMode('join'); }}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
            mode === 'join'
              ? 'bg-[#27272a] text-white shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Join with Code
        </button>
      </div>

      {mode === 'create' && createdRoom && (
        <div className="rounded-2xl bg-[#121214] border border-[#1f1f23] p-5 flex flex-col items-center text-center">
          {/* Room Code */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-zinc-400">Code:</span>
            <span className="px-3 py-1 rounded-lg bg-black text-white font-mono text-base font-semibold tracking-wider border border-white/10">
              {createdRoom.code}
            </span>
            <button
              onClick={handleGenerateRoom}
              className="p-1 rounded-md text-zinc-500 hover:text-white"
              title="New code"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Clean White QR */}
          <div className="p-3 bg-white rounded-2xl mb-4">
            <QRCodeSVG
              value={inviteUrl}
              size={160}
              bgColor="#ffffff"
              fgColor="#000000"
              level="M"
            />
          </div>

          <p className="text-xs text-zinc-400 mb-5 max-w-xs">
            Scan to connect. Messages burn automatically and leave zero trace.
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 rounded-xl bg-[#1a1a1e] border border-white/5 text-zinc-200 text-xs font-medium flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
            </button>

            <button
              onClick={() => onEnterRoom(createdRoom)}
              className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-semibold flex items-center justify-center active:scale-95 transition-transform"
            >
              Enter Room
            </button>
          </div>
        </div>
      )}

      {mode === 'join' && (
        <div className="rounded-2xl bg-[#121214] border border-[#1f1f23] p-5">
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Enter 6-digit room code
          </label>

          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full py-3 px-4 rounded-xl bg-black border border-white/10 text-center font-mono text-lg tracking-[0.25em] text-white placeholder-zinc-700 outline-none mb-4"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.length < 6}
            className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center space-x-1 disabled:opacity-30 active:scale-95 transition-all"
          >
            <span>Join Room</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};
