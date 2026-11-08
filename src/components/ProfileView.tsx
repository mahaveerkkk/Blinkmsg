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
  ChevronRight,
  Camera,
  Timer,
  Volume2,
  VolumeX,
  Ghost,
  Sparkles,
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
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [showRecoveryPin, setShowRecoveryPin] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);
  const [defaultTimer, setDefaultTimer] = useState<number>(30);
  const [isGhostMode, setIsGhostMode] = useState<boolean>(!currentUser.isAvailable);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

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
    setShowAvatarModal(false);
  };

  const handleToggleGhost = () => {
    sound.vibrate(10);
    const next = !isGhostMode;
    setIsGhostMode(next);
    onSave({ isAvailable: !next });
  };

  const getTimerLabel = (val: number) => {
    if (val === 0) return '🔥 Burn on Read';
    if (val === 10) return '10 seconds';
    if (val === 30) return '30 seconds';
    if (val === 60) return '1 minute';
    return `${val}s`;
  };

  return (
    <div className="pb-32 pt-2 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* 1. Sleek Profile Header (Telegram / iOS Native Style) */}
      <div className="flex flex-col items-center text-center pt-4 pb-6">
        {/* Avatar with Camera badge */}
        <div className="relative mb-3 group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
          <div className="ring-2 ring-white/[0.1] hover:ring-[#D4FF00]/50 rounded-full p-1 transition-all">
            <Avatar avatarId={avatarId} size="xl" name={currentUser.handle} />
          </div>
          <button
            className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#181C26] border border-white/[0.15] text-[#D4FF00] flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            title="Change Avatar"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Display Name with inline edit */}
        {isEditingName ? (
          <div className="flex items-center justify-center space-x-2 mb-1 max-w-xs w-full">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoFocus
              className="bg-[#141722] border border-[#D4FF00]/50 rounded-xl px-3 py-1.5 text-base text-center text-white outline-none font-bold w-48"
            />
            <button
              onClick={handleSaveName}
              className="p-2 rounded-xl bg-[#D4FF00] text-black font-black active:scale-95 text-xs shadow-md"
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-1.5 mb-1 group cursor-pointer" onClick={() => setIsEditingName(true)}>
            <h2 className="font-extrabold text-xl text-white tracking-tight">
              {displayName || currentUser.displayName}
            </h2>
            <Edit2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          </div>
        )}

        {/* Copyable @handle pill */}
        <button
          onClick={handleCopyHandle}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs font-mono active:scale-95 transition-all border border-white/[0.06] mt-0.5"
        >
          <span className="text-[#D4FF00] font-bold">@{currentUser.handle}</span>
          {copiedHandle ? (
            <Check className="w-3.5 h-3.5 text-[#00F5A0]" />
          ) : (
            <Copy className="w-3 h-3 text-zinc-400" />
          )}
        </button>
      </div>

      {/* 2. Grouped Section: My Connection & Identity (iOS Inset Group Style) */}
      <div className="mb-4">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider px-3 mb-1.5 block font-bold">
          Connection & Identity
        </span>
        <div className="bg-[#0F121C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm divide-y divide-white/[0.05]">
          {/* Row 1: Personal Code */}
          <div
            onClick={handleCopyPin}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center text-[#D4FF00]">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">My Connection Code</span>
                <span className="text-[11px] text-zinc-400 font-mono block">Share with friends to chat</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-[#D4FF00] tracking-wider bg-black/40 px-2 py-0.5 rounded-lg border border-white/[0.06]">
                {formattedPin}
              </span>
              <button
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300"
                title="Copy Code"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5 text-[#00F5A0]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Row 2: QR Code */}
          <div
            onClick={() => {
              sound.vibrate(8);
              setShowQRModal(true);
            }}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-[#00F5A0]/10 border border-[#00F5A0]/20 flex items-center justify-center text-[#00F5A0]">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-white">My QR Code</span>
            </div>

            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>
        </div>
      </div>

      {/* 3. Grouped Section: Privacy & Chat Security */}
      <div className="mb-4">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider px-3 mb-1.5 block font-bold">
          Privacy & Security
        </span>
        <div className="bg-[#0F121C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm divide-y divide-white/[0.05]">
          {/* Row 1: Disappearing Timer */}
          <div
            onClick={() => {
              sound.vibrate(6);
              setShowTimerModal(true);
            }}
            className="px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.02] active:bg-white/[0.05] transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Timer className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-white">Disappearing Messages</span>
            </div>

            <div className="flex items-center space-x-1.5 text-zinc-400">
              <span className="text-xs font-mono font-medium text-[#D4FF00]">
                {getTimerLabel(defaultTimer)}
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
          </div>

          {/* Row 2: Account Recovery PIN */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">Recovery Login PIN</span>
                <span className="text-[11px] text-zinc-400 font-mono block">Required to restore account</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold text-white tracking-widest bg-black/40 px-2 py-0.5 rounded-lg border border-white/[0.06]">
                {showRecoveryPin ? (currentUser.pin || myPin.slice(0, 4)) : '••••'}
              </span>
              <button
                onClick={() => setShowRecoveryPin(!showRecoveryPin)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white"
              >
                {showRecoveryPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#00F5A0]" />}
              </button>
            </div>
          </div>

          {/* Row 3: Ghost Mode (Incognito) */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Ghost className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-semibold text-white block">Ghost Mode</span>
                <span className="text-[11px] text-zinc-400 font-mono block">Hide online presence</span>
              </div>
            </div>

            <button
              onClick={handleToggleGhost}
              className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 cursor-pointer ${
                isGhostMode ? 'bg-[#00F5A0]' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  isGhostMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Row 4: Chat Sounds */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </div>
              <span className="text-sm font-semibold text-white">Audio Chimes</span>
            </div>

            <button
              onClick={() => {
                sound.vibrate(6);
                setSoundEnabled(!soundEnabled);
              }}
              className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 cursor-pointer ${
                soundEnabled ? 'bg-[#D4FF00]' : 'bg-zinc-800'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Grouped Section: Account Actions */}
      <div className="mb-6">
        <div className="bg-[#0F121C] border border-white/[0.08] rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => {
              sound.playPanic();
              if (confirm('Log out from this device? Make sure you have noted your @handle and recovery PIN.')) {
                StorageService.clearAll();
                onResetAccount();
              }
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between text-red-400 hover:bg-red-500/[0.05] active:bg-red-500/[0.1] transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold">Log Out / Switch Identity</span>
            </div>

            <ChevronRight className="w-4 h-4 text-red-400/50" />
          </button>
        </div>
      </div>

      {/* 5. Clean App Branding Footer */}
      <div className="text-center pt-2 pb-6">
        <div className="flex items-center justify-center space-x-1.5 text-zinc-500 text-xs font-mono">
          <Sparkles className="w-3 h-3 text-[#D4FF00]" />
          <span>BlinkMsg v1.2</span>
          <span>•</span>
          <span>Zero-Trace Ephemeral Protocol</span>
        </div>
      </div>

      {/* Modal 1: Avatar Selector Bottom Sheet / Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-[#0F121C] border border-white/[0.1] rounded-3xl p-5 shadow-2xl relative text-center">
            <button
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-base text-white mb-1">
              Choose Avatar
            </h3>
            <p className="text-xs text-zinc-400 mb-5">
              Select your 3D confidential persona
            </p>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3, 4, 5, 6].map((id) => (
                <button
                  key={id}
                  onClick={() => handleSelectAvatar(id)}
                  className={`p-2 rounded-2xl flex flex-col items-center justify-center transition-all active:scale-95 ${
                    avatarId === id
                      ? 'bg-[#D4FF00]/15 ring-2 ring-[#D4FF00] scale-105 shadow-md'
                      : 'bg-white/[0.04] hover:bg-white/[0.08]'
                  }`}
                >
                  <Avatar avatarId={id} size="md" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAvatarModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modal 2: Disappearing Messages Picker Modal */}
      {showTimerModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-[#0F121C] border border-white/[0.1] rounded-3xl p-5 shadow-2xl relative">
            <button
              onClick={() => setShowTimerModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="font-extrabold text-base text-white mb-1">
              Disappearing Messages
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Select how long messages stay before burning
            </p>

            <div className="space-y-2 mb-4">
              {[
                { label: '🔥 Burn on Read', desc: 'Destructs after reading', val: 0 },
                { label: '⏱ 10 seconds', desc: 'Super fast burn', val: 10 },
                { label: '⏱ 30 seconds', desc: 'Standard secret chat', val: 30 },
                { label: '⏱ 1 minute', desc: 'Extended read time', val: 60 },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    sound.vibrate(8);
                    setDefaultTimer(item.val);
                    setShowTimerModal(false);
                  }}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between text-left transition-all ${
                    defaultTimer === item.val
                      ? 'bg-[#D4FF00]/15 border border-[#D4FF00]/40 text-[#D4FF00]'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div>
                    <span className="font-bold text-xs block">{item.label}</span>
                    <span className="text-[10px] text-zinc-400 block">{item.desc}</span>
                  </div>
                  {defaultTimer === item.val && <Check className="w-4 h-4 text-[#D4FF00]" />}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTimerModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 text-xs font-bold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Modal 3: Personal QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-xs bg-[#0F121C] border border-white/[0.1] rounded-3xl p-6 text-center shadow-2xl relative">
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
            <p className="text-xs text-[#D4FF00] font-mono font-bold mb-4">
              Code: {formattedPin}
            </p>

            <div className="p-3.5 bg-white rounded-2xl mb-4 inline-block shadow-lg">
              <QRCodeSVG
                value={`https://blinkmsg.app/join/${myPin}`}
                size={165}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
              Scan this QR with the BlinkMsg camera scanner to connect directly.
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold active:scale-95 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
