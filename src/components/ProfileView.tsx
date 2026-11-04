import React, { useState } from 'react';
import {
  Check,
  LogOut,
  MapPin,
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
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId);
  const [vibe, setVibe] = useState(currentUser.vibe);
  const [city, setCity] = useState(currentUser.city || 'New Delhi');
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    sound.vibrate(15);
    onSave({
      ...currentUser,
      displayName: displayName.trim() || currentUser.displayName,
      avatarId,
      vibe: vibe.trim() || currentUser.vibe,
      city,
    });

    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  return (
    <div className="pb-28 pt-6 px-4 max-w-sm mx-auto select-none text-white animate-fade-in">
      {/* Profile Header Card */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="relative mb-3">
          <Avatar avatarId={avatarId} size="xl" name={currentUser.handle} />
        </div>

        <h2 className="font-bold text-xl text-white">
          {displayName || currentUser.displayName}
        </h2>
        <p className="text-xs text-[#D4FF00] font-mono mt-0.5 font-bold">
          @{currentUser.handle}
        </p>

        {/* Quick Avatar Strip */}
        <div className="flex items-center space-x-2 mt-4 py-1">
          {[1, 2, 3, 4, 5, 6].map((id) => (
            <button
              key={id}
              onClick={() => {
                sound.vibrate(6);
                setAvatarId(id);
              }}
              className={`p-0.5 rounded-full transition-transform ${
                avatarId === id ? 'ring-2 ring-[#D4FF00] scale-110' : 'opacity-40 hover:opacity-100'
              }`}
            >
              <Avatar avatarId={id} size="sm" />
            </button>
          ))}
        </div>
      </div>

      {/* Simple Form (No Clutter) */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/50 rounded-2xl px-4 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
            Status / Bio
          </label>
          <input
            type="text"
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/50 rounded-2xl px-4 py-3 text-sm text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-[#D4FF00]" />
            Your City (for Nearby)
          </label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/50 rounded-2xl px-4 py-3 text-sm text-white outline-none"
          >
            {INDIAN_CITIES.map((c) => (
              <option key={c} value={c} className="bg-[#12151B] text-white">
                {c}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-extrabold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-transform shadow-[0_0_15px_rgba(212,255,0,0.25)]"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <span>{savedToast ? 'Saved Successfully!' : 'Save Profile'}</span>
        </button>
      </div>

      {/* Logout / Switch Account */}
      <div className="pt-2 text-center">
        <button
          onClick={() => {
            sound.playPanic();
            if (confirm('Do you want to switch or reset this account?')) {
              StorageService.clearAll();
              onResetAccount();
            }
          }}
          className="text-xs text-red-400 hover:text-red-300 font-medium inline-flex items-center space-x-1 py-2 px-3 rounded-xl hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Switch or Create New Account</span>
        </button>
      </div>
    </div>
  );
};
