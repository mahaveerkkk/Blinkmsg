import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { KeyRound, QrCode, ArrowRight, ShieldCheck, Copy, Check, Sparkles, RefreshCw } from 'lucide-react';
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

  // Generate new secret room on mount or refresh
  const handleGenerateRoom = async () => {
    sound.vibrate(15);
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
    sound.vibrate(20);
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
      peerHandle: 'SecretPeer',
      peerAvatarId: 5,
    };
    onEnterRoom(room);
  };

  const inviteUrl = createdRoom
    ? `${window.location.origin}/#room=${createdRoom.code}&key=${createdRoom.secretKey}`
    : '';

  return (
    <div className="pb-24 pt-3 px-4 max-w-lg mx-auto">
      {/* Vault Header */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-[0_0_15px_rgba(0,255,170,0.2)]">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-black text-slate-100 tracking-wide">
          Secret Vault
        </h2>
        <p className="text-xs text-slate-400">
          Zero-Trace Room • No Accounts • Burns on Exit
        </p>
      </div>

      {/* Mode Selector Tabs */}
      <div className="flex rounded-2xl bg-[#0d111a] p-1 border border-[#1f293d] mb-6">
        <button
          onClick={() => { sound.vibrate(10); setMode('create'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'create'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Create Room (QR)
        </button>
        <button
          onClick={() => { sound.vibrate(10); setMode('join'); }}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            mode === 'join'
              ? 'bg-emerald-500 text-slate-950 shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Join with Code
        </button>
      </div>

      {/* Mode 1: Create Room */}
      {mode === 'create' && createdRoom && (
        <div className="rounded-3xl bg-[#0d111a] border border-[#1f293d] p-5 shadow-2xl flex flex-col items-center text-center">
          {/* 6-Digit Code Badge */}
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs text-slate-400 font-mono">Room Code:</span>
            <div className="px-3.5 py-1.5 rounded-xl bg-[#131824] border border-cyan-500/40 text-cyan-300 font-mono text-base font-black tracking-widest shadow-inner">
              {createdRoom.code}
            </div>
            <button
              onClick={handleGenerateRoom}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 active:rotate-180 transition-all"
              title="Regenerate Code"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Glowing QR Code Card */}
          <div className="p-4 bg-white rounded-3xl shadow-[0_0_25px_rgba(0,255,170,0.3)] mb-4">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              bgColor="#ffffff"
              fgColor="#05070d"
              level="M"
              includeMargin={false}
            />
          </div>

          <p className="text-[12px] text-slate-400 mb-5 max-w-xs">
            Scan with any camera or enter the 6-digit code. Keys never touch our database.
          </p>

          {/* Action Buttons */}
          <div className="w-full space-y-2.5">
            <button
              onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl bg-[#131824] border border-[#1f293d] hover:border-emerald-500/40 text-slate-200 text-xs font-semibold flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
              <span>{copiedLink ? 'Link Copied!' : 'Copy Private Invite Link'}</span>
            </button>

            <button
              onClick={() => onEnterRoom(createdRoom)}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,255,170,0.4)] active:scale-95 transition-transform"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Enter Room Now</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: Join Room */}
      {mode === 'join' && (
        <div className="rounded-3xl bg-[#0d111a] border border-[#1f293d] p-5 shadow-2xl">
          <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
            Enter 6-Digit Room Code
          </label>

          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 749201"
            className="w-full py-3.5 px-4 rounded-2xl bg-[#131824] border border-[#1f293d] focus:border-emerald-500/60 text-center font-mono text-xl tracking-[0.3em] text-slate-100 placeholder-slate-600 outline-none transition-all shadow-inner mb-4"
          />

          <button
            onClick={handleJoinByCode}
            disabled={joinCode.length < 6}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-lg disabled:opacity-40 disabled:scale-100 active:scale-95 transition-all"
          >
            <span>Connect & Decrypt Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="mt-6 p-3.5 rounded-2xl bg-[#131824]/60 border border-[#1f293d] text-slate-400 text-[11px] leading-relaxed flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Rooms self-destruct once both participants exit. No messages are ever archived.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
