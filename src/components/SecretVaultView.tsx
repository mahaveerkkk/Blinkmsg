import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ArrowRight, Camera, UserCheck } from 'lucide-react';
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
  const myPin = currentUser.pin || localStorage.getItem('blink_user_code') || handleToPin(currentUser.handle).slice(0, 6);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewProfile, setPreviewProfile] = useState<UserProfile | null>(null);

  const inviteUrl = `https://blinkmsg.app/join/${myPin}`;
  const formattedPin = myPin.length === 6 ? `${myPin.slice(0, 3)} ${myPin.slice(3)}` : myPin;

  // Live peer profile lookup when typing 6-digit PIN or handle
  useEffect(() => {
    const clean = joinCode.trim().toLowerCase().replace(/[@\s-]/g, '');
    if (clean.length < 3) {
      setPreviewProfile(null);
      setErrorMsg('');
      return;
    }

    const t = setTimeout(async () => {
      setIsSearching(true);
      try {
        const found = await NetworkService.findProfileByPin(clean);
        if (found) {
          setPreviewProfile(found);
          setErrorMsg('');
        } else {
          setPreviewProfile(null);
        }
      } catch {
        setPreviewProfile(null);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(t);
  }, [joinCode]);

  // Ensure room exists in DB for this user's PIN
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
  }, [mode, myPin]);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(myPin);
    sound.vibrate(12);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleConnectPeer = async (targetProfile?: UserProfile) => {
    const target = targetProfile || previewProfile;
    if (target && onStartChatWithUser) {
      sound.playSend();
      onStartChatWithUser(target);
      return;
    }

    setErrorMsg('');
    const clean = joinCode.trim().toLowerCase().replace(/[@\s-]/g, '');
    if (!clean || clean.length < 3) {
      setErrorMsg('Please enter a valid 6-digit PIN or @handle.');
      sound.playPanic();
      return;
    }

    setIsSearching(true);
    sound.vibrate(12);

    try {
      const foundUser = await NetworkService.findProfileByPin(clean);
      if (foundUser && onStartChatWithUser) {
        sound.playSend();
        setIsSearching(false);
        onStartChatWithUser(foundUser);
        return;
      }

      // Anonymous ephemeral room fallback
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
      setErrorMsg('Could not connect. Please check the code and try again.');
      sound.playPanic();
    }
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* Sleek Top Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
            <span>Connect</span>
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]" />
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Zero-Login Stealth Connection
          </p>
        </div>

        {onOpenScanner && (
          <button
            onClick={() => {
              sound.vibrate(8);
              onOpenScanner();
            }}
            className="p-2.5 rounded-2xl bg-zinc-900 border border-white/10 hover:border-[#00F5A0]/40 text-[#00F5A0] active:scale-95 transition-all shadow-md"
            title="Scan QR Code"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Segmented Mode Switcher */}
      <div className="grid grid-cols-2 rounded-2xl bg-[#12131A] p-1 border border-white/[0.08] mb-6 shadow-inner">
        <button
          onClick={() => {
            sound.vibrate(6);
            setMode('create');
          }}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'create'
              ? 'bg-[#00F5A0] text-zinc-950 shadow-md shadow-[#00F5A0]/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          My QR & PIN
        </button>
        <button
          onClick={() => {
            sound.vibrate(6);
            setMode('join');
          }}
          className={`py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            mode === 'join'
              ? 'bg-[#00F5A0] text-zinc-950 shadow-md shadow-[#00F5A0]/20'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          Enter Friend's Code
        </button>
      </div>

      {/* VIEW A: MY QR & 6-DIGIT CODE */}
      {mode === 'create' && (
        <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-6 flex flex-col items-center text-center shadow-2xl relative overflow-hidden animate-in fade-in">
          {/* 6-Digit PIN Display Box */}
          <div className="w-full bg-black/60 border border-white/[0.08] rounded-2xl p-4 mb-5 flex items-center justify-between">
            <div className="text-left">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
                Your 6-Digit PIN
              </span>
              <span className="font-mono text-3xl font-extrabold text-[#00F5A0] tracking-widest drop-shadow-[0_0_12px_rgba(0,245,160,0.3)]">
                {formattedPin}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-zinc-200 active:scale-95 transition-all border border-white/[0.1] flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode ? <Check className="w-4 h-4 text-[#00F5A0]" /> : <Copy className="w-4 h-4 text-zinc-300" />}
              <span className="text-xs font-bold">{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Crisp QR Code */}
          <div className="p-3.5 bg-white rounded-3xl mb-5 shadow-2xl">
            <QRCodeSVG
              value={inviteUrl}
              size={176}
              bgColor="#ffffff"
              fgColor="#09090b"
              level="M"
            />
          </div>

          <p className="text-xs text-zinc-400 max-w-xs mb-4 leading-relaxed">
            Friend can enter your code <span className="text-[#00F5A0] font-mono font-bold">{myPin}</span> or scan this QR to connect instantly.
          </p>

          <button
            onClick={handleCopyCode}
            className="w-full py-3 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 text-xs font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#00F5A0]/20 cursor-pointer"
          >
            {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedCode ? 'PIN Copied to Clipboard!' : 'Copy My Code'}</span>
          </button>
        </div>
      )}

      {/* VIEW B: ENTER FRIEND'S CODE & LIVE PEER LOOKUP */}
      {mode === 'join' && (
        <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-6 shadow-2xl relative overflow-hidden animate-in fade-in space-y-4">
          <div className="text-center">
            <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider mb-1">
              Enter Friend's 6-Digit PIN or @handle
            </label>
            <p className="text-xs text-zinc-400">
              Type code to automatically find peer and start chat
            </p>
          </div>

          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConnectPeer();
            }}
            placeholder="e.g. 768049 or @handle"
            autoFocus
            className="w-full py-3.5 px-4 rounded-2xl bg-black/60 border border-white/[0.12] text-center font-mono text-xl font-bold tracking-widest text-[#00F5A0] placeholder-zinc-600 outline-none focus:border-[#00F5A0]/60 transition-colors shadow-inner"
          />

          {/* Real-time Found Peer Profile Card */}
          {previewProfile && (
            <div className="p-3.5 rounded-2xl bg-black/70 border border-[#00F5A0]/40 shadow-xl flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-[#00F5A0]/15 border border-[#00F5A0]/40 flex items-center justify-center shrink-0 text-[#00F5A0]">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {previewProfile.displayName || previewProfile.handle}
                  </div>
                  <div className="text-[11px] text-[#00F5A0] font-mono flex items-center gap-1 mt-0.5">
                    <span>@{previewProfile.handle}</span>
                    <span>• Verified 🟢</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleConnectPeer(previewProfile)}
                className="px-3.5 py-2 rounded-xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs shrink-0 cursor-pointer shadow-md shadow-[#00F5A0]/25 flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs text-rose-400 font-medium text-center">
              {errorMsg}
            </p>
          )}

          <button
            onClick={() => handleConnectPeer()}
            disabled={isSearching || joinCode.trim().length < 3}
            className="w-full py-3.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-all shadow-lg shadow-[#00F5A0]/20 cursor-pointer"
          >
            <span>{isSearching ? 'Finding Peer...' : previewProfile ? `Chat with ${previewProfile.displayName || previewProfile.handle}` : 'Connect & Chat'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onOpenScanner && (
            <button
              onClick={() => {
                sound.vibrate(8);
                onOpenScanner();
              }}
              className="w-full py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#00F5A0]" />
              <span>Or Scan Friend's QR Code with Camera</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
