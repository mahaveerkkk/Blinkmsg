import React, { useState } from 'react';
import {
  User,
  Shield,
  Key,
  MapPin,
  Check,
  Trash2,
  Lock,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';

interface ProfileViewProps {
  currentUser: UserProfile;
  onSave: (updated: UserProfile) => void;
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
  const [handle, setHandle] = useState(currentUser.handle);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId);
  const [vibe, setVibe] = useState(currentUser.vibe);
  const [city, setCity] = useState(currentUser.city || 'New Delhi');
  const [pin, setPin] = useState(currentUser.pin || '');
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    sound.vibrate(15);
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    onSave({
      ...currentUser,
      handle: cleanHandle || currentUser.handle,
      displayName: displayName.trim() || currentUser.displayName,
      avatarId,
      vibe: vibe.trim() || currentUser.vibe,
      city,
      pin,
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="pb-32 pt-4 px-4 max-w-md mx-auto select-none text-white">
      {/* Title */}
      <div className="mb-5">
        <h1 className="font-bold text-2xl tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs text-zinc-400">
          Manage your anonymous identity and encryption keys.
        </p>
      </div>

      {/* User Hero Card */}
      <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-5 mb-5 flex flex-col items-center text-center shadow-xl">
        <div className="relative mb-3">
          <Avatar avatarId={avatarId} size="xl" name={handle} />
        </div>

        <h2 className="font-bold text-xl text-white">
          {displayName || currentUser.displayName}
        </h2>
        <p className="text-xs text-[#D4FF00] font-mono mt-0.5 font-semibold">
          @{handle}
        </p>
        <p className="text-xs text-zinc-400 mt-2 max-w-xs px-2">
          "{vibe}"
        </p>

        {/* Avatar Selector Strip */}
        <div className="flex items-center space-x-2.5 mt-4 py-1.5 px-2 overflow-x-auto max-w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
            <button
              key={id}
              onClick={() => {
                sound.vibrate(6);
                setAvatarId(id);
              }}
              className={`p-0.5 rounded-full transition-transform ${
                avatarId === id ? 'ring-2 ring-[#D4FF00] scale-110' : 'opacity-50'
              }`}
            >
              <Avatar avatarId={id} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* Identity Details Section */}
      <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-4 mb-4 space-y-3.5 shadow-lg">
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
            Unique @Handle
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-[#D4FF00] font-mono text-sm">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="w-full bg-black border border-white/[0.08] focus:border-[#D4FF00]/50 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono text-white outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-black border border-white/[0.08] focus:border-[#D4FF00]/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
            Status Vibe
          </label>
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="w-full bg-black border border-white/[0.08] focus:border-[#D4FF00]/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold flex items-center">
            <MapPin className="w-3 h-3 mr-1 text-[#D4FF00]" />
            Radar City
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-black border border-white/[0.08] focus:border-[#D4FF00]/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none"
          >
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c} className="bg-[#121214] text-white">
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold flex items-center">
            <Key className="w-3 h-3 mr-1 text-[#D4FF00]" />
            4-Digit Session PIN
          </label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="••••"
            className="w-full bg-black border border-white/[0.08] focus:border-[#D4FF00]/50 rounded-2xl px-4 py-2 text-center text-sm font-mono tracking-widest text-white outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl bg-[#D4FF00] text-black font-extrabold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-transform shadow-[0_0_15px_rgba(212,255,0,0.25)]"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{savedToast ? 'Changes Saved!' : 'Save Identity'}</span>
        </button>
      </div>

      {/* Security Status Card */}
      <div className="rounded-3xl bg-[#121214] border border-white/[0.08] p-4 mb-5 shadow-lg">
        <p className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2.5 font-semibold">
          Active Security Protocol
        </p>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400">Encryption Standard</span>
            <span className="text-emerald-400 font-mono font-medium">AES-256-GCM Hardware</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400">Screenshot Blocker</span>
            <span className="text-emerald-400 font-mono font-medium">FLAG_SECURE Active</span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-zinc-400">Server Logs</span>
            <span className="text-zinc-500 font-mono">Zero Knowledge</span>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset / Logout */}
      <button
        onClick={() => {
          sound.playPanic();
          if (confirm('Are you sure you want to nuke all keys and reset this identity?')) {
            StorageService.clearAll();
            onResetAccount();
          }
        }}
        className="w-full py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span>Nuke Identity & Reset App</span>
      </button>
    </div>
  );
};
