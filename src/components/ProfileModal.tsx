import React, { useState } from 'react';
import { User, X, Check, MapPin, Sparkles, Shield, Key } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#090d16] border border-[#1f293d] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-sm">
              Ghost Identity
            </h3>
          </div>
          <button
            onClick={() => {
              sound.vibrate(10);
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-100 bg-[#131824] active:scale-90 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Avatar & Picker */}
        <div className="flex flex-col items-center mb-5">
          <div className="mb-3">
            <Avatar avatarId={avatarId} size="xl" hasStory={true} />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto py-1 px-2 max-w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
              <button
                key={id}
                onClick={() => {
                  sound.vibrate(8);
                  setAvatarId(id);
                }}
                className={`p-0.5 rounded-full transition-transform ${
                  avatarId === id ? 'ring-2 ring-emerald-400 scale-110' : 'opacity-70 hover:opacity-100'
                }`}
              >
                <Avatar avatarId={id} size="sm" />
              </button>
            ))}
          </div>
        </div>

        {/* Handle & Name Fields */}
        <div className="space-y-3.5 mb-5">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Your Unique @Handle
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-cyan-400 font-mono text-sm">@</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="username"
                className="w-full bg-[#131824] border border-[#1f293d] focus:border-emerald-500/50 rounded-2xl pl-8 pr-4 py-2.5 text-sm text-slate-100 font-mono outline-none shadow-inner"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              People can search and send secret chat requests to this handle.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Neon Falcon"
              className="w-full bg-[#131824] border border-[#1f293d] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-slate-100 outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider">
              Vibe / Bio Tag
            </label>
            <input
              type="text"
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="e.g. ⚡ Late night deep talks"
              className="w-full bg-[#131824] border border-[#1f293d] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-slate-100 outline-none shadow-inner"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider flex items-center">
              <MapPin className="w-3 h-3 mr-1 text-emerald-400" />
              Radar City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-[#131824] border border-[#1f293d] focus:border-emerald-500/50 rounded-2xl px-4 py-2.5 text-sm text-slate-100 outline-none shadow-inner"
            >
              {INDIAN_CITIES.map((c) => (
                <option key={c} value={c} className="bg-[#090d16] text-slate-100">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1 uppercase tracking-wider flex items-center">
              <Key className="w-3 h-3 mr-1 text-cyan-400" />
              Optional 4-Digit Recovery PIN
            </label>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-[#131824] border border-[#1f293d] focus:border-cyan-500/50 rounded-2xl px-4 py-2 text-center text-sm font-mono tracking-widest text-slate-100 outline-none shadow-inner"
            />
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-bold text-xs flex items-center justify-center space-x-2 shadow-[0_0_15px_rgba(0,255,170,0.3)] active:scale-95 transition-transform"
        >
          <Check className="w-4 h-4" />
          <span>Save Ghost Identity</span>
        </button>
      </div>
    </div>
  );
};
