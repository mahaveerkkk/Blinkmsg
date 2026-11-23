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
  User,
  AtSign,
  X,
  ShieldCheck,
  Fingerprint,
  Radio,
  Sliders,
  AlertTriangle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { Avatar, SUPABASE_AVATARS } from './Avatar';
import { sound } from '../services/sound';

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
  const [tempAvatarId, setTempAvatarId] = useState(avatarId);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [showPinMasked, setShowPinMasked] = useState(true);
  const [editingRecoveryPin, setEditingRecoveryPin] = useState(recoveryPin);
  const [copiedPin, setCopiedPin] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pinUpdateSuccess, setPinUpdateSuccess] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
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
  const formattedPinPart1 = myPin.slice(0, 3);
  const formattedPinPart2 = myPin.slice(3, 6);

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

  const selectedAvatarMeta = SUPABASE_AVATARS[avatarId - 1] || SUPABASE_AVATARS[0];

  return (
    <div className="pb-36 pt-4 px-4 max-w-md mx-auto select-none font-sans min-h-screen bg-[#07080B] text-white">
      {/* Top Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-extrabold text-2xl tracking-tight text-white">
              Settings & Vault
            </h1>
            <span className="w-2 h-2 rounded-full bg-[#00F5A0] shadow-[0_0_10px_#00F5A0] animate-pulse" />
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Stealth Identity & Device Encryption
          </p>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-[#00F5A0] font-bold flex items-center gap-1.5 shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00F5A0]" />
          <span>AES-256</span>
        </div>
      </div>

      {/* 1. Hero Identity & Persona Card */}
      <div className="rounded-3xl bg-gradient-to-b from-[#13151F] to-[#0E1017] border border-white/[0.08] p-5 shadow-2xl mb-4 relative overflow-hidden">
        {/* Subtle glow orb */}
        <div className="absolute top-0 right-1/2 translate-x-1/2 w-48 h-32 bg-[#00F5A0]/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col items-center text-center">
          {/* Avatar with Interactive Glow & Edit Pill */}
          <div
            className="relative mb-3 cursor-pointer group"
            onClick={() => {
              sound.vibrate(6);
              setTempAvatarId(avatarId);
              setShowAvatarModal(true);
            }}
          >
            <div className="p-1 rounded-full bg-gradient-to-tr from-[#00F5A0]/40 via-purple-500/30 to-sky-400/30 ring-2 ring-white/10 group-hover:ring-[#00F5A0]/60 transition-all shadow-xl">
              <Avatar avatarId={avatarId} size="xl" name={displayName || handle} />
            </div>

            <button
              type="button"
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#00F5A0] text-zinc-950 flex items-center justify-center shadow-lg active:scale-90 transition-transform cursor-pointer border-2 border-[#0E1017]"
              title="Change 3D Avatar"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-semibold text-zinc-300 mb-2">
            <span>Persona:</span>
            <span className="text-[#00F5A0] font-bold">{selectedAvatarMeta.name}</span>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight">
            {displayName || 'Stealth User'}
          </h2>
          <span className="font-mono text-xs text-[#00F5A0] font-bold">
            @{handle}
          </span>
        </div>

        {/* Inputs Section */}
        <div className="space-y-3 mt-4 pt-4 border-t border-white/[0.06]">
          {/* Display Name */}
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

          {/* Anonymous Handle */}
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

          {/* Save Profile Button */}
          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 font-extrabold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-[#00F5A0]/20 cursor-pointer"
          >
            {saveSuccess ? <Check className="w-4 h-4 stroke-[3]" /> : <Sparkles className="w-4 h-4" />}
            <span>{saveSuccess ? 'Profile Saved Successfully!' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </div>

      {/* 2. Permanent 6-Digit Stealth PIN Card */}
      <div className="rounded-3xl bg-gradient-to-b from-[#13151F] to-[#0E1017] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#00F5A0]" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
              Connection PIN
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#00F5A0] bg-[#00F5A0]/10 border border-[#00F5A0]/25 px-2 py-0.5 rounded-full font-bold">
            Zero-Login ID
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-black/60 border border-white/10 flex items-center justify-between shadow-inner">
          <div>
            <div className="flex items-center gap-2 font-mono text-2xl font-black text-[#00F5A0] tracking-widest">
              <span>{formattedPinPart1}</span>
              <span className="text-zinc-600 text-lg">•</span>
              <span>{formattedPinPart2}</span>
            </div>
            <span className="text-[11px] text-zinc-400 block mt-1">
              Give this 6-digit code to friends to connect & chat
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyPin}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer ${
                copiedPin
                  ? 'bg-[#00F5A0] text-zinc-950 shadow-md shadow-[#00F5A0]/30'
                  : 'bg-white/10 hover:bg-white/15 text-white'
              }`}
            >
              {copiedPin ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPin ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => {
                sound.vibrate(8);
                setShowRegenConfirm(true);
              }}
              className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 active:scale-95 transition-all cursor-pointer"
              title="Regenerate PIN"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showRegenConfirm && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-200 leading-snug">
                Regenerating will disconnect previous invite links and assign you a new 6-digit code.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  onRegenerateCode();
                  setShowRegenConfirm(false);
                }}
                className="py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-xs cursor-pointer active:scale-95 transition-all"
              >
                Yes, Regenerate
              </button>
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-xs cursor-pointer active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. 4-Digit Master Lock PIN */}
      <div className="rounded-3xl bg-gradient-to-b from-[#13151F] to-[#0E1017] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#00F5A0]" />
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
              4-Digit Master App Lock
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Recovery & Lock</span>
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

        <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
          <span>Decoy PIN Protection:</span>
          <span className="font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-lg">
            0000 (Safe decoy chats)
          </span>
        </div>
      </div>

      {/* 4. Stealth & System Preferences */}
      <div className="rounded-3xl bg-gradient-to-b from-[#13151F] to-[#0E1017] border border-white/[0.08] p-5 shadow-2xl mb-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#00F5A0]" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">
            Stealth & System Preferences
          </span>
        </div>

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
              <Fingerprint className="w-4 h-4" />
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
              <span className="text-[11px] text-zinc-400 block">{blockedUsers.length} contact{blockedUsers.length === 1 ? '' : 's'} blocked</span>
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
      <div className="rounded-3xl bg-rose-500/10 border border-rose-500/20 p-5 shadow-2xl space-y-3 mb-6">
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

      {/* Build & Protocol Info Badge */}
      <div className="text-center pb-8 space-y-1 text-zinc-500 text-[11px]">
        <div className="flex items-center justify-center gap-1.5 font-mono">
          <span className="text-zinc-400 font-bold">BlinkMsg</span>
          <span>v1.0.0</span>
          <span>•</span>
          <span className="text-[#00F5A0] font-semibold">Zero-Log Protocol</span>
        </div>
        <p className="text-[10px] text-zinc-600">
          Hardware AES-256-GCM • E2EE WebRTC • AMOLED Stealth
        </p>
      </div>

      {/* 3D Cyberpunk Avatar Picker Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-[#12131C] border border-white/15 rounded-3xl p-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-black text-base text-white">
                  Choose Stealth Persona
                </h3>
                <p className="text-xs text-zinc-400">
                  Select your 3D cyberpunk avatar
                </p>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Preview Card */}
            {(() => {
              const previewMeta = SUPABASE_AVATARS[tempAvatarId - 1] || SUPABASE_AVATARS[0];
              return (
                <div className="p-3 my-3 rounded-2xl bg-black/60 border border-white/10 flex items-center gap-3 shadow-inner">
                  <div className="p-0.5 rounded-full ring-2 ring-[#00F5A0]/50">
                    <Avatar avatarId={tempAvatarId} size="lg" />
                  </div>
                  <div>
                    <span className="text-xs font-mono font-bold text-[#00F5A0] block">
                      #{tempAvatarId} • {previewMeta.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      Cloud synced & visible to peers
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* 4x2 Grid of Avatars */}
            <div className="overflow-y-auto flex-1 py-1 pr-1">
              <div className="grid grid-cols-4 gap-2.5">
                {SUPABASE_AVATARS.map((av) => {
                  const isSelected = tempAvatarId === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        sound.vibrate(8);
                        setTempAvatarId(av.id);
                      }}
                      className={`relative p-2 rounded-2xl flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#00F5A0]/20 ring-2 ring-[#00F5A0] scale-105 shadow-lg shadow-[#00F5A0]/20'
                          : 'bg-white/5 hover:bg-white/10 active:scale-95'
                      }`}
                      title={av.name}
                    >
                      <Avatar avatarId={av.id} size="md" />
                      <span className="text-[9px] font-mono text-zinc-300 mt-1 font-bold text-center line-clamp-1">
                        {av.name.split(' ')[1] || av.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAvatarModal(false)}
                className="py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  sound.vibrate(12);
                  sound.playReceive();
                  setAvatarId(tempAvatarId);
                  setShowAvatarModal(false);
                }}
                className="py-2.5 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-zinc-950 text-xs font-black shadow-lg shadow-[#00F5A0]/20 active:scale-95 transition-all cursor-pointer"
              >
                Use Persona #{tempAvatarId}
              </button>
            </div>
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
