import React, { useState } from 'react';
import { User, X, Check, MapPin, Key, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSave: (updated: UserProfile) => void;
}

const INDIAN_CITIES = [
  'New Delhi', 'Mumbai', 'Bengaluru', 'Jaipur', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Kolkata', 'Chandigarh', 'Lucknow'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) => {
  const [handle, setHandle] = useState(currentUser.handle);
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId);
  const [vibe, setVibe] = useState(currentUser.vibe);
  const [city, setCity] = useState(currentUser.city || 'New Delhi');
  const [pin, setPin] = useState(currentUser.pin || '');

  if (!isOpen) return null;

  const handleSave = () => {
    sound.vibrate(20);
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in">
      <div className="w-full max-w-md bg-[#121214] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl p-5 flex flex-col max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white text-base">
            Ghost Profile
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white bg-white/[0.06] active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar Picker */}
        <div className="flex flex-col items-center mb-5">
          <div className="mb-3">
            <Avatar avatarId={avatarId} size="xl" name={handle} />
          </div>

          <div className="flex items-center space-x-2 py-1 overflow-x-auto max-w-full px-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
              <button
                key={id}
                onClick={() => {
                  sound.vibrate(6);
                  setAvatarId(id);
                }}
                className={`p-0.5 rounded-full transition-transform ${
                  avatarId === id ? 'ring-2 ring-emerald-400 scale-105' : 'opacity-60 hover:opacity-100'
                }`}
              >
                <Avatar avatarId={id} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {/* Input Fields */}
        <div className="space-y-3.5 mb-6">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Your @Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-emerald-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl pl-8 pr-4 py-2.5 text-sm text-white font-mono outline-none shadow-inner"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Veer"
              className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Status / Vibe
            </label>
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="e.g. Disappearing messages only"
              className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-emerald-400" />
              Radar City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-white outline-none shadow-inner"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c} className="bg-[#121214] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider flex items-center">
              <Key className="w-3 h-3 mr-1 text-emerald-400" />
              Optional 4-Digit Recovery PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-black border border-white/[0.08] focus:border-emerald-500/50 rounded-2xl px-4 py-2 text-center text-sm font-mono tracking-widest text-white outline-none shadow-inner"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl bg-emerald-500 text-black font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-transform shadow-md"
        >
          <Check className="w-4 h-4" />
          <span>Save Profile</span>
        </button>
      </div>
    </div>
  );
};
