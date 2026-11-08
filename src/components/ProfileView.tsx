import React, { useState } from 'react';
import {
  Check,
  Copy,
  QrCode,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  LogOut,
  X,
  Edit2,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';
import { handleToPin } from '../services/network';

interface ProfileViewProps {
  currentUser: UserProfile;
  onSave: (updated: Partial<UserProfile>) => void;
  onResetAccount: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onSave,
  onResetAccount,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId || 1);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showRecoveryPin, setShowRecoveryPin] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [defaultTimer, setDefaultTimer] = useState<number>(30);

  const myPin = handleToPin(currentUser.handle);
  const formattedPin = myPin.length === 6 ? `${myPin.slice(0, 3)} - ${myPin.slice(3)}` : myPin;

  const handleCopyHandle = () => {
    navigator.clipboard?.writeText('@' + currentUser.handle);
    sound.vibrate(10);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(myPin);
    sound.vibrate(10);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleSaveName = () => {
    sound.vibrate(10);
    setIsEditingName(false);
    onSave({ displayName: displayName.trim() || currentUser.displayName });
  };

  const handleSelectAvatar = (id: number) => {
    sound.vibrate(8);
    setAvatarId(id);
    onSave({ avatarId: id });
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* 1. Ultra-Clean Profile Header (WhatsApp / Telegram Native Style) */}
      <div className="rounded-3xl bg-[#0F121C] border border-white/[0.08] p-6 text-center shadow-lg mb-4 relative overflow-hidden">
        {/* User 3D Avatar */}
        <div className="relative inline-block mb-3">
          <Avatar avatarId={avatarId} size="xl" name={currentUser.handle} />
          <span className="w-4 h-4 rounded-full bg-[#00F5A0] border-2 border-[#07080B] absolute bottom-1 right-1" />
        </div>

        {/* Display Name with Quick Edit */}
        {isEditingName ? (
          <div className="flex items-center justify-center space-x-2 mb-2 max-w-xs mx-auto">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              className="bg-[#141722] border border-[#D4FF00]/50 rounded-xl px-3 py-1.5 text-sm text-center text-white outline-none font-bold"
            />
            <button
              onClick={handleSaveName}
              className="p-2 rounded-xl bg-[#D4FF00] text-black font-black active:scale-95 text-xs"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-1.5 mb-1">
            <h2 className="font-extrabold text-xl text-white">
              {displayName || currentUser.displayName}
            </h2>
            <button
              onClick={() => setIsEditingName(true)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Copyable @handle */}
        <div className="flex items-center justify-center space-x-2 mt-1">
          <button
            onClick={handleCopyHandle}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-xs font-mono active:scale-95 transition-all border border-white/[0.06]"
          >
            <span className="text-[#D4FF00] font-bold">@{currentUser.handle}</span>
            {copiedHandle ? (
              <Check className="w-3.5 h-3.5 text-[#00F5A0]" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>
        </div>

        {/* 6 Quick Avatar Switcher Icons */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center space-x-3">
          {[1, 2, 3, 4, 5, 6].map((id) => (
            <button
              key={id}
              onClick={() => handleSelectAvatar(id)}
              className={`p-0.5 rounded-full transition-all active:scale-90 ${
                avatarId === id
                  ? 'ring-2 ring-[#D4FF00] scale-110 shadow-md'
                  : 'opacity-40 hover:opacity-100'
              }`}
            >
              <Avatar avatarId={id} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* 2. My Connection Code (The Most Important Card) */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-4 mb-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
            <KeyRound className="w-3.5 h-3.5 text-[#D4FF00]" />
            <span>My Personal Code</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-[#D4FF00]/10 text-[#D4FF00] text-[9px] font-mono font-bold">
            SHARE TO CONNECT
          </span>
        </div>

        <div className="bg-[#07080B] rounded-xl p-3.5 border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="font-mono text-2xl font-black text-[#D4FF00] tracking-wider block">
              {formattedPin}
            </span>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              Give this code to your friend to chat directly
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyPin}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 active:scale-90 transition-all border border-white/[0.06] flex items-center space-x-1"
              title="Copy Code"
            >
              {copiedPin ? <Check className="w-4 h-4 text-[#00F5A0]" /> : <Copy className="w-4 h-4" />}
              <span className="text-[11px] font-bold">{copiedPin ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => {
                sound.vibrate(8);
                setShowQRModal(true);
              }}
              className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#D4FF00] active:scale-90 transition-all border border-white/[0.06]"
              title="QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Account Recovery PIN */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-4 mb-4 shadow-sm">
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-[#00F5A0]" />
          <span>Account Recovery PIN</span>
        </span>

        <div className="bg-[#07080B] rounded-xl p-3 border border-white/[0.06] flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] text-zinc-400 font-mono block">Your 4-Digit Login PIN</span>
            <span className="font-mono text-lg font-bold text-white tracking-widest">
              {showRecoveryPin ? (currentUser.pin || myPin.slice(0, 4)) : '••••'}
            </span>
          </div>

          <button
            onClick={() => setShowRecoveryPin(!showRecoveryPin)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            {showRecoveryPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#00F5A0]" />}
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Note this PIN down. If you switch phones or reinstall BlinkMsg, log back in using your <strong className="text-zinc-300">@{currentUser.handle}</strong> and this PIN.
        </p>
      </div>

      {/* 4. Default Disappearing Timer */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-4 mb-4 shadow-sm">
        <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-2.5">
          Default Message Auto-Delete
        </span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '🔥 Burn on Read', val: 0 },
            { label: '⏱ 30 seconds', val: 30 },
            { label: '⏱ 1 minute', val: 60 },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                sound.vibrate(6);
                setDefaultTimer(item.val);
              }}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border text-center ${
                defaultTimer === item.val
                  ? 'bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/40 shadow-sm'
                  : 'bg-[#141722] text-zinc-400 border-white/[0.06] hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Minimal Log Out Button */}
      <div className="pt-2 text-center">
        <button
          onClick={() => {
            sound.playPanic();
            if (confirm('Are you sure you want to log out / switch account?')) {
              StorageService.clearAll();
              onResetAccount();
            }
          }}
          className="text-xs text-red-400 hover:text-red-300 font-mono inline-flex items-center space-x-1.5 py-2 px-3 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch or Log Out Account</span>
        </button>
      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-[#0E111A] border border-white/[0.1] rounded-3xl p-5 text-center shadow-2xl relative">
            <button
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-base text-white mb-0.5">
              Personal QR Code
            </h3>
            <p className="text-xs text-zinc-400 mb-1 font-mono">
              @{currentUser.handle}
            </p>
            <p className="text-xs text-[#D4FF00] font-mono font-bold mb-3">
              Code: {formattedPin}
            </p>

            <div className="p-3.5 bg-white rounded-2xl mb-3 inline-block shadow-lg">
              <QRCodeSVG
                value={`https://blinkmsg.app/join/${myPin}`}
                size={165}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <p className="text-[11px] text-zinc-400 mb-3">
              Your friend can scan this with their camera scanner to message you directly.
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
