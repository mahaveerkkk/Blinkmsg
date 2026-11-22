import React, { useState } from 'react';
import {
  Check,
  Copy,
  Shield,
  Eye,
  EyeOff,
  Camera,
  Volume2,
  VolumeX,
  Ghost,
  Sparkles,
  Lock,
  RefreshCw,
  Trash2,
  KeyRound,
  User,
  AtSign,
  X,
} from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { sound } from '../services/sound';
import { StorageService } from '../services/storage';

interface ProfileViewProps {
  currentUser: UserProfile;
  recoveryPin: string;
  onUpdateRecoveryPin: (pin: string) => void;
  onSave: (updated: Partial<UserProfile>) => void;
  onRegenerateCode: () => void;
  onResetAccount: () => void;
  ghostMode: boolean;
  onToggleGhost: () => void;
  soundMuted: boolean;
  onToggleSound: () => void;
  blockedUsers?: string[];
  onUnblockUser?: (handle: string) => void;
  onLockApp?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  recoveryPin,
  onUpdateRecoveryPin,
  onSave,
  onRegenerateCode,
  onResetAccount,
  ghostMode,
  onToggleGhost,
  soundMuted,
  onToggleSound,
  blockedUsers = [],
  onUnblockUser,
  onLockApp,
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || currentUser.handle);
  const [handle, setHandle] = useState(currentUser.handle);
  const [avatarId, setAvatarId] = useState(currentUser.avatarId || 1);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showPinMasked, setShowPinMasked] = useState(true);
  const [editingRecoveryPin, setEditingRecoveryPin] = useState(recoveryPin);
  const [copiedPin, setCopiedPin] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pinUpdateSuccess, setPinUpdateSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState<boolean>(() => {
    return localStorage.getItem('blink_app_lock_enabled') === 'true';
  });

  const toggleAutoLock = () => {
    const next = !autoLockEnabled;
    setAutoLockEnabled(next);
    localStorage.setItem('blink_app_lock_enabled', next ? 'true' : 'false');
    sound.vibrate(8);
  };

  const myPin = currentUser.pin || localStorage.getItem('blink_user_code') || '768049';
  const formattedPin = myPin.length === 6 ? `${myPin.slice(0, 3)} ${myPin.slice(3)}` : myPin;

  const handleCopyPin = () => {
    navigator.clipboard?.writeText(myPin);
    sound.vibrate(10);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleSaveProfile = () => {
    sound.vibrate(12);
    sound.playReceive();
    const cleanHandle = handle.trim().replace(/^@/, '').toLowerCase();
    const cleanName = displayName.trim() || cleanHandle;

    onSave({
      displayName: cleanName,
      handle: cleanHandle,
      avatarId,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSaveRecoveryPin = () => {
    const clean = editingRecoveryPin.replace(/\D/g, '').slice(0, 4);
    if (clean.length === 4) {
      sound.vibrate(10);
      onUpdateRecoveryPin(clean);
      setPinUpdateSuccess(true);
      setTimeout(() => setPinUpdateSuccess(false), 2000);
    }
  };

  return (
    <div className="pb-36 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* Top Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-2xl tracking-tight text-white flex items-center gap-2">
            <span>Settings</span>
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] shadow-[0_0_8px_#00F5A0]" />
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Identity, Stealth & Security Controls
          </p>
        </div>
      </div>

      {/* 1. Profile Avatar & Name Card */}
      <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-5 shadow-2xl mb-4 text-center relative">
        <div
          className="relative inline-block mx-auto mb-3 cursor-pointer group"
          onClick={() => setShowAvatarModal(true)}
        >
          <div className="ring-2 ring-white/10 group-hover:ring-[#00F5A0]/50 rounded-full p-1 transition-all">
            <Avatar avatarId={avatarId} size="xl" name={currentUser.handle} />
          </div>
          <button
            type="button"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00F5A0] text-zinc-950 flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer"
            title="Change Avatar"
          >
            <Camera className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        <div className="space-y-3 max-w-xs mx-auto text-left">
          {/* Display Name Input */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
              Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Display Name"
                className="w-full bg-black/60 border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white font-bold placeholder-zinc-500 focus:outline-none focus:border-[#00F5A0]/50 transition-colors shadow-inner"
              />
            </div>
          </div>

          {/* Anonymous @Handle Input */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block mb-1">
              Anonymous @Handle
            </label>
            <div className="relative">
              <AtSign className="w-4 h-4 text-[#00F5A0] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/^@/, ''))}
                placeholder="handle_name"
                className="w-full bg-black/60 border border-white/10 rounded-2xl pl-9 pr-3 py-2.5 text-xs text-white font-mono font-bold placeholder-zinc-500 focus:outline-none focus:border-[#00F5A0]/50 transition-colors shadow-inner"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#00F5A0]/20 cursor-pointer"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{saveSuccess ? 'Profile Saved Successfully!' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Permanent 6-Digit Stealth PIN Card */}
      <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
            Permanent 6-Digit Connection PIN
          </span>
          <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/10 border border-[#00F5A0]/25 px-2 py-0.5 rounded-full font-bold">
            Zero-Login
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between shadow-inner">
          <div>
            <span className="font-mono text-2xl font-black text-[#00F5A0] tracking-widest">
              {formattedPin}
            </span>
            <span className="text-[11px] text-zinc-400 block mt-0.5">
              Friends can use this code to connect & chat
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyPin}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              {copiedPin ? <Check className="w-3.5 h-3.5 text-[#00F5A0]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPin ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Regenerate your 6-digit connection PIN? Past invite codes will no longer connect.')) {
                  onRegenerateCode();
                }
              }}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 active:scale-95 transition-all cursor-pointer"
              title="Regenerate PIN"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. 4-Digit Security & App Lock PIN */}
      <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
            4-Digit Master Lock & Recovery PIN
          </span>
          <span className="text-[10px] font-mono text-zinc-400">Security</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showPinMasked ? 'password' : 'text'}
              maxLength={4}
              value={editingRecoveryPin}
              onChange={(e) => setEditingRecoveryPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-center font-mono text-lg font-bold tracking-[0.5em] text-[#00F5A0] focus:outline-none focus:border-[#00F5A0]/50 transition-colors shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPinMasked(!showPinMasked)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
            >
              {showPinMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleSaveRecoveryPin}
            disabled={editingRecoveryPin.length !== 4}
            className="px-4 py-3 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-bold text-xs disabled:opacity-30 active:scale-95 transition-all cursor-pointer shadow-md"
          >
            {pinUpdateSuccess ? 'Updated!' : 'Update'}
          </button>
        </div>

        <p className="text-[11px] text-zinc-500 leading-relaxed">
          Decoy PIN: <span className="text-amber-400 font-mono font-bold">0000</span> (Entering 0000 on lock screen opens safe decoy chats).
        </p>
      </div>

      {/* 4. Privacy & Stealth Toggles */}
      <div className="rounded-3xl bg-[#12131A] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-4">
        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">
          Stealth & System Preferences
        </span>

        {/* Ghost Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Ghost className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Ghost Cloak Mode</span>
              <span className="text-[11px] text-zinc-400 block">Hide online status & green dot</span>
            </div>
          </div>

          <button
            onClick={onToggleGhost}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              ghostMode ? 'bg-violet-600' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                ghostMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Tactile Audio Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#00F5A0]/15 border border-[#00F5A0]/30 flex items-center justify-center text-[#00F5A0]">
              {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Tactile Sound FX</span>
              <span className="text-[11px] text-zinc-400 block">Haptic clicks & burning audio</span>
            </div>
          </div>

          <button
            onClick={onToggleSound}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              !soundMuted ? 'bg-[#00F5A0]' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-zinc-950 transition-transform ${
                !soundMuted ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Auto-Lock when Minimized Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Auto-Lock When Hidden</span>
              <span className="text-[11px] text-zinc-400 block">Require PIN when app is minimized</span>
            </div>
          </div>

          <button
            onClick={toggleAutoLock}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
              autoLockEnabled ? 'bg-amber-400' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-zinc-950 transition-transform ${
                autoLockEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Lock Vault Now Button */}
        {onLockApp && (
          <div className="pt-2">
            <button
              onClick={() => {
                sound.vibrate(15);
                onLockApp();
              }}
              className="w-full py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-zinc-200 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4 text-[#00F5A0]" />
              <span>Lock Vault Now</span>
            </button>
          </div>
        )}

        {/* Blocked Contacts Management */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Blocked Contacts</span>
              <span className="text-[11px] text-zinc-400 block">{blockedUsers.length} user{blockedUsers.length === 1 ? '' : 's'} blocked</span>
            </div>
          </div>

          <button
            onClick={() => setShowBlockedModal(true)}
            disabled={blockedUsers.length === 0}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-semibold text-zinc-200 cursor-pointer active:scale-95 transition-all"
          >
            Manage
          </button>
        </div>
      </div>

      {/* 5. Danger Zone */}
      <div className="rounded-3xl bg-rose-500/10 border border-rose-500/20 p-5 shadow-2xl space-y-3">
        <span className="text-[10px] uppercase tracking-wider font-bold text-rose-300 block">
          Danger Zone
        </span>

        {showResetConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-rose-200 leading-relaxed font-semibold">
              Are you sure? This will permanently wipe all local chats, contacts, and encryption keys from this device.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onResetAccount}
                className="py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Yes, Wipe Everything
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs active:scale-95 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Wipe All Local Data & Reset Session</span>
          </button>
        )}
      </div>

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-[#12131A] border border-white/15 rounded-3xl p-5 shadow-2xl">
            <h3 className="font-extrabold text-base text-white mb-1 text-center">
              Choose Stealth Avatar
            </h3>
            <p className="text-xs text-zinc-400 mb-4 text-center">
              Select your persona icon
            </p>

            <div className="grid grid-cols-4 gap-3 mb-5">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    setAvatarId(id);
                    setShowAvatarModal(false);
                  }}
                  className={`p-2 rounded-2xl transition-all cursor-pointer ${
                    avatarId === id
                      ? 'bg-[#00F5A0]/20 ring-2 ring-[#00F5A0]'
                      : 'bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <Avatar avatarId={id} size="md" />
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAvatarModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Blocked Users Modal */}
      {showBlockedModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-[#12131A] border border-white/15 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" />
                <span>Blocked Contacts</span>
              </h3>
              <button
                onClick={() => setShowBlockedModal(false)}
                className="p-1 rounded-full bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {blockedUsers.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No blocked contacts</p>
              ) : (
                blockedUsers.map((handle) => (
                  <div
                    key={handle}
                    className="p-3 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-between"
                  >
                    <span className="font-mono text-xs text-white">@{handle}</span>
                    <button
                      onClick={() => {
                        if (onUnblockUser) onUnblockUser(handle);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold active:scale-95 transition-all cursor-pointer"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setShowBlockedModal(false)}
              className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
