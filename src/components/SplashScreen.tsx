import React, { useState, useEffect } from 'react';
import { VanishLogo } from './VanishLogo';
import { UserProfile } from '../types';
import { supabase } from '../services/network';
import { StorageService } from '../services/storage';
import { sound } from '../services/sound';
import {
  ArrowRight,
  AlertCircle,
  Shield,
  Lock,
  Zap,
  Sparkles,
  KeyRound,
  Check,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Avatar } from './Avatar';

interface SplashScreenProps {
  onComplete: (user: UserProfile) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [isIntroLoading, setIsIntroLoading] = useState(true);
  const [mode, setMode] = useState<'create' | 'restore'>('create');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Initial cinematic boot sequence
  useEffect(() => {
    sound.vibrate(20);
    const timer = setTimeout(() => {
      setIsIntroLoading(false);
    }, 1100);
    return () => clearTimeout(timer);
  }, []);

  const handleCreateAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanHandle || cleanHandle.length < 3) {
      setError('Handle must be at least 3 characters (letters, numbers, _).');
      sound.playPanic();
      return;
    }

    setLoading(true);
    sound.vibrate(12);

    const newProfile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      handle: cleanHandle,
      displayName: displayName.trim() || cleanHandle,
      avatarId,
      vibe: '⚡ Stealth mode active',
      isAvailable: false,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      lastActive: Date.now(),
      pin: pin.trim() || undefined,
    };

    // Save to Supabase profiles
    if (supabase) {
      try {
        const { error: dbError } = await supabase.from('profiles').upsert({
          handle: newProfile.handle,
          display_name: newProfile.displayName,
          avatar_id: newProfile.avatarId,
          vibe: newProfile.vibe,
          is_available: false,
          city: newProfile.city,
          country: newProfile.country,
        });

        if (dbError && dbError.code === '23505') {
          setError('This @handle is already taken. Try another.');
          sound.playPanic();
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Supabase save error:', err);
      }
    }

    StorageService.saveProfile(newProfile);
    sound.playSend();
    setLoading(false);
    onComplete(newProfile);
  };

  const handleRestoreAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace('@', '');

    if (!cleanHandle) {
      setError('Please enter your @handle.');
      sound.playPanic();
      return;
    }

    setLoading(true);
    sound.vibrate(12);

    if (supabase) {
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', cleanHandle)
          .single();

        if (dbError || !data) {
          setError('No identity found with @' + cleanHandle);
          sound.playPanic();
          setLoading(false);
          return;
        }

        const restored: UserProfile = {
          id: data.id || 'usr_' + Date.now(),
          handle: data.handle,
          displayName: data.display_name || data.handle,
          avatarId: data.avatar_id || 1,
          vibe: data.vibe || '⚡ Stealth mode active',
          isAvailable: data.is_available || false,
          country: data.country || 'India',
          state: 'Delhi',
          city: data.city || 'New Delhi',
          lastActive: Date.now(),
          pin,
        };

        StorageService.saveProfile(restored);
        sound.playSend();
        setLoading(false);
        onComplete(restored);
        return;
      } catch {
        setError('Connection error. Please try again.');
        sound.playPanic();
      }
    }

    setLoading(false);
  };

  // Cinematic Intro Screen
  if (isIntroLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#06070A] text-white flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
        {/* Pulsing ambient orbs */}
        <div className="absolute w-96 h-96 bg-[#D4FF00]/10 rounded-full blur-[140px] pointer-events-none animate-pulse-glow" />
        <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none -bottom-10" />

        <div className="relative z-10 flex flex-col items-center text-center animate-pop-in">
          <div className="animate-float mb-6">
            <VanishLogo size={96} animated={true} />
          </div>

          <h1 className="text-3xl font-black tracking-[0.25em] text-white uppercase mb-2">
            BLINKMSG
          </h1>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-[#D4FF00] tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-[#D4FF00] animate-ping" />
            <span>Zero-Knowledge Ephemeral Protocol</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#06070A] text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-y-auto relative font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[420px] h-96 bg-[#D4FF00]/[0.035] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-10 right-0 w-80 h-80 bg-emerald-600/[0.04] rounded-full blur-[120px] pointer-events-none" />

      {/* Top subtle badge */}
      <div className="pt-2 flex items-center justify-between max-w-sm mx-auto w-full z-10">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_#D4FF00]" />
          <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-400">
            Node: Secure Encrypted
          </span>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-zinc-400 flex items-center space-x-1">
          <Lock className="w-3 h-3 text-[#D4FF00]" />
          <span>AES-256</span>
        </div>
      </div>

      {/* VIP Glassmorphism Auth Card */}
      <div className="my-auto max-w-sm mx-auto w-full z-10 py-4 animate-fade-in">
        <div className="rounded-[28px] bg-[#0c0e14]/90 backdrop-blur-2xl border border-white/[0.1] p-6 shadow-2xl shadow-black/90 ring-1 ring-white/[0.05] relative overflow-hidden">
          {/* Top Sheen Line */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D4FF00]/60 to-transparent" />

          {/* Logo & Headline */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 animate-float">
              <VanishLogo size={76} animated={true} />
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white flex items-center space-x-1.5">
              <span>BlinkMsg</span>
              <Sparkles className="w-4 h-4 text-[#D4FF00]" />
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono tracking-wider uppercase mt-1">
              Burn after reading • Leave zero traces
            </p>
          </div>

          {/* Segmented Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-2xl bg-[#141620] border border-white/[0.08] mb-5 shadow-inner">
            <button
              onClick={() => {
                sound.vibrate(6);
                setMode('create');
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'create'
                  ? 'bg-[#D4FF00] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              New Identity
            </button>
            <button
              onClick={() => {
                sound.vibrate(6);
                setMode('restore');
                setError('');
              }}
              className={`py-2 rounded-xl text-xs font-bold transition-all ${
                mode === 'restore'
                  ? 'bg-[#D4FF00] text-black shadow-md'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Restore / Login
            </button>
          </div>

          {/* Mode 1: Create Identity */}
          {mode === 'create' && (
            <div className="space-y-4 animate-fade-in">
              {/* Avatar Strip */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-2 uppercase tracking-wider font-semibold">
                  Choose Stealth Persona
                </label>
                <div className="flex items-center justify-between px-1">
                  {[1, 2, 3, 4, 5, 6].map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        sound.vibrate(6);
                        setAvatarId(id);
                      }}
                      className={`relative p-0.5 rounded-full transition-all ${
                        avatarId === id
                          ? 'ring-2 ring-[#D4FF00] scale-110 shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                          : 'opacity-40 hover:opacity-100 hover:scale-105'
                      }`}
                    >
                      <Avatar avatarId={id} size="sm" />
                      {avatarId === id && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#D4FF00] text-black flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Handle Field */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">
                  Claim Your Unique @Handle *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#D4FF00] font-mono text-sm font-black">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) =>
                      setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))
                    }
                    placeholder="e.g. shadow_ghost"
                    autoFocus
                    className="w-full bg-[#13151D] border border-white/10 focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00]/40 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Display Name Field */}
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">
                  Display Alias (Optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Shadow"
                  className="w-full bg-[#13151D] border border-white/10 focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00]/40 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                />
              </div>

              {/* PIN Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    4-Digit Recovery PIN (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[#13151D] border border-white/10 focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00]/40 rounded-2xl px-4 py-2.5 text-center text-sm font-mono tracking-[0.3em] text-white placeholder-zinc-700 outline-none transition-all shadow-inner"
                />
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* VIP Create Button with Shimmer */}
              <button
                onClick={handleCreateAccount}
                disabled={loading || handle.trim().length < 3}
                className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all duration-200 disabled:opacity-40 shadow-[0_0_25px_rgba(212,255,0,0.35)] hover:shadow-[0_0_35px_rgba(212,255,0,0.5)] mt-3 cursor-pointer sheen-shimmer"
              >
                <span>{loading ? 'Initializing Keys...' : 'Claim Identity & Enter'}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
          )}

          {/* Mode 2: Restore Identity / Login */}
          {mode === 'restore' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1.5 uppercase tracking-wider font-semibold">
                  Enter Your Registered @Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-[#D4FF00] font-mono text-sm font-black">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace('@', ''))}
                    placeholder="e.g. shadow_ghost"
                    autoFocus
                    className="w-full bg-[#13151D] border border-white/10 focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00]/40 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-zinc-600 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    4-Digit Recovery PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-zinc-500 hover:text-zinc-300"
                  >
                    {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[#13151D] border border-white/10 focus:border-[#D4FF00] focus:ring-1 focus:ring-[#D4FF00]/40 rounded-2xl px-4 py-2.5 text-center text-sm font-mono tracking-[0.3em] text-white placeholder-zinc-700 outline-none transition-all shadow-inner"
                />
              </div>

              {error && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center space-x-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleRestoreAccount}
                disabled={loading || !handle.trim()}
                className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all duration-200 disabled:opacity-40 shadow-[0_0_25px_rgba(212,255,0,0.35)] hover:shadow-[0_0_35px_rgba(212,255,0,0.5)] mt-3 cursor-pointer sheen-shimmer"
              >
                <span>{loading ? 'Decrypting Session...' : 'Restore & Decrypt'}</span>
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIP Bottom Trust Badges */}
      <div className="pb-2 max-w-sm mx-auto w-full z-10">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center">
            <Shield className="w-3.5 h-3.5 text-[#D4FF00] mb-1" />
            <span className="text-[10px] font-bold text-zinc-300">Zero Logs</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center">
            <Lock className="w-3.5 h-3.5 text-[#D4FF00] mb-1" />
            <span className="text-[10px] font-bold text-zinc-300">E2E Ciphers</span>
          </div>
          <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.05] flex flex-col items-center">
            <Zap className="w-3.5 h-3.5 text-[#D4FF00] mb-1" />
            <span className="text-[10px] font-bold text-zinc-300">Auto Burn</span>
          </div>
        </div>

        <p className="text-[10px] text-zinc-600 font-mono text-center mt-3">
          Hardware AES-256-GCM • Zero Server Persistence
        </p>
      </div>
    </div>
  );
};
