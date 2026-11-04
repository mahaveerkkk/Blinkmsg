import React, { useState } from 'react';
import {
  Check,
  LogOut,
  MapPin,
  QrCode,
  Copy,
  Clock,
  X,
  User,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';

interface ProfileViewProps {
  currentUser: UserProfile;
  onSave: (updated: Partial<UserProfile>) => void;
  onResetAccount: () => void;
}

const INDIAN_CITIES = [
  'New Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Kolkata', 'Chandigarh', 'Lucknow'
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onSave,
  onResetAccount,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId);
  const [vibe, setVibe] = useState(currentUser.vibe);
  const [city, setCity] = useState(currentUser.city || 'New Delhi');
  const [isAvailable, setIsAvailable] = useState(currentUser.isAvailable);
  const [defaultTimer, setDefaultTimer] = useState<number>(30);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const handleToggleOnline = () => {
    sound.vibrate(10);
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    onSave({ isAvailable: nextState });
  };

  const handleSaveProfile = () => {
    sound.vibrate(15);
    onSave({
      displayName: displayName.trim() || currentUser.displayName,
      avatarId,
      vibe: vibe.trim() || currentUser.vibe,
      city,
      isAvailable,
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleCopyHandle = () => {
    navigator.clipboard?.writeText('@' + currentUser.handle);
    sound.vibrate(10);
    setCopiedHandle(true);
    setTimeout(() => setCopiedHandle(false), 2000);
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-md mx-auto select-none text-white animate-fade-in font-sans min-h-screen bg-[#07080B]">
      {/* 1. Header Card (Telegram / iOS Style) */}
      <div className="rounded-3xl bg-[#0F121C] border border-white/[0.08] p-5 shadow-xl mb-4 text-center relative overflow-hidden">
        <div className="relative inline-block mb-2">
          <Avatar avatarId={avatarId} size="xl" name={currentUser.handle} />
          {isAvailable && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#00F5A0] border-2 border-[#07080B]" />
          )}
        </div>

        <h2 className="font-extrabold text-xl text-white">
          {displayName || currentUser.displayName}
        </h2>

        {/* Copyable Handle & QR Passport */}
        <div className="flex items-center justify-center space-x-2 mt-1.5">
          <button
            onClick={handleCopyHandle}
            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono active:scale-95 transition-all"
          >
            <span className="text-[#D4FF00] font-bold">@{currentUser.handle}</span>
            {copiedHandle ? (
              <Check className="w-3.5 h-3.5 text-[#00F5A0]" />
            ) : (
              <Copy className="w-3 h-3 text-zinc-400" />
            )}
          </button>

          <button
            onClick={() => {
              sound.vibrate(8);
              setShowQRModal(true);
            }}
            className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-[#D4FF00] active:scale-90 transition-all"
            title="My QR Code"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>

        {/* Persona Selector Strip */}
        <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-center space-x-2">
          {[1, 2, 3, 4, 5, 6].map((id) => (
            <button
              key={id}
              onClick={() => {
                sound.vibrate(6);
                setAvatarId(id);
              }}
              className={`p-0.5 rounded-full transition-transform active:scale-95 ${
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

      {/* 2. Privacy & Presence (Clean Grouped Settings Card) */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-4 mb-4 shadow-sm space-y-4">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
          <Shield className="w-3.5 h-3.5 text-[#00F5A0]" />
          <span>Privacy & Online Status</span>
        </h3>

        {/* Show Online Status Switch */}
        <div className="flex items-center justify-between pt-1">
          <div className="pr-3">
            <span className="text-sm font-bold text-white block">
              Show Online Status
            </span>
            <span className="text-xs text-zinc-400 mt-0.5 block leading-relaxed">
              {isAvailable
                ? 'Visible to contacts. Green dot shown when active.'
                : 'Ghost Mode is on. You are hidden from others.'}
            </span>
          </div>

          <button
            onClick={handleToggleOnline}
            className={`w-12 h-6 rounded-full transition-colors duration-200 p-0.5 flex items-center shrink-0 cursor-pointer ${
              isAvailable ? 'bg-[#00F5A0]' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
                isAvailable ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Default Disappearing Timer */}
        <div className="pt-2 border-t border-white/[0.06]">
          <span className="text-xs font-bold text-zinc-300 block mb-2">
            Default Message Timer
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '🔥 Burn on Read', val: 0 },
              { label: '⏱ 30s', val: 30 },
              { label: '⏱ 1 min', val: 60 },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => {
                  sound.vibrate(6);
                  setDefaultTimer(item.val);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                  defaultTimer === item.val
                    ? 'bg-[#D4FF00]/15 text-[#D4FF00] border-[#D4FF00]/40'
                    : 'bg-[#141722] text-zinc-400 border-white/[0.06] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Identity Details (Clean Form) */}
      <div className="rounded-2xl bg-[#0F121C] border border-white/[0.08] p-4 mb-4 shadow-sm space-y-3.5">
        <h3 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-1.5">
          <User className="w-3.5 h-3.5 text-[#D4FF00]" />
          <span>Identity Details</span>
        </h3>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 font-bold">
            Display Alias
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#141722] border border-white/[0.08] focus:border-[#D4FF00]/60 rounded-xl px-3 py-2 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 font-bold">
            Bio / Status
          </label>
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="w-full bg-[#141722] border border-white/[0.08] focus:border-[#D4FF00]/60 rounded-xl px-3 py-2 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 font-bold flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-[#00F5A0]" />
            City (Radar Region)
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-[#141722] border border-white/[0.08] focus:border-[#D4FF00]/60 rounded-xl px-3 py-2 text-sm text-white outline-none cursor-pointer"
          >
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c} className="bg-[#141722] text-white">
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSaveProfile}
          className="w-full py-2.5 rounded-xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all shadow-md"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>{savedToast ? 'Saved' : 'Save Changes'}</span>
        </button>
      </div>

      {/* 4. Danger Zone */}
      <div className="pt-2 text-center border-t border-white/[0.06] mb-6">
        <button
          onClick={() => {
            sound.playPanic();
            if (confirm('Switch or reset this account? All local caches will be wiped.')) {
              StorageService.clearAll();
              onResetAccount();
            }
          }}
          className="text-xs text-red-400 hover:text-red-300 font-mono inline-flex items-center space-x-1.5 py-2 px-3 rounded-xl hover:bg-red-500/10 active:scale-95 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch or Reset Account</span>
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
              My QR Passport
            </h3>
            <p className="text-xs text-zinc-400 mb-3 font-mono">
              @{currentUser.handle}
            </p>

            <div className="p-3 bg-white rounded-2xl mb-3 inline-block shadow-lg">
              <QRCodeSVG
                value={`https://blinkmsg.app/join/@${currentUser.handle}`}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
              />
            </div>

            <p className="text-[11px] text-zinc-400 mb-3">
              Friends can scan this with their camera scanner to message you directly.
            </p>

            <button
              onClick={() => setShowQRModal(false)}
              className="w-full py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
