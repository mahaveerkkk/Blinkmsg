import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase } from '../services/network';
import { StorageService } from '../services/storage';
import { sound } from '../services/sound';
import {
  ArrowRight,
  Shield,
  ChevronLeft,
  Camera,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { Avatar } from './Avatar';

interface SplashScreenProps {
  onComplete: (user: UserProfile) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [view, setView] = useState<'welcome' | 'create' | 'login'>('welcome');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-fill username when name is typed if handle is empty
  const handleNameChange = (val: string) => {
    setDisplayName(val);
    if (!handle || handle === displayName.toLowerCase().replace(/[^a-z0-9_]/g, '')) {
      setHandle(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    }
  };

  const handleCreateAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanHandle || cleanHandle.length < 3) {
      setError('Please choose a handle with at least 3 letters.');
      sound.playPanic();
      return;
    }

    if (!displayName.trim()) {
      setError('Please enter your name or alias.');
      sound.playPanic();
      return;
    }

    setLoading(true);
    sound.vibrate(12);

    const newProfile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      handle: cleanHandle,
      displayName: displayName.trim(),
      avatarId,
      vibe: '',
      isAvailable: true,
      country: 'India',
      state: 'Delhi',
      city: 'New Delhi',
      lastActive: Date.now(),
      pin: pin.trim() || undefined,
    };

    if (supabase) {
      try {
        const { error: dbError } = await supabase.from('profiles').upsert({
          handle: newProfile.handle,
          display_name: newProfile.displayName,
          avatar_id: newProfile.avatarId,
          vibe: '',
          is_available: true,
          city: 'New Delhi',
          country: 'India',
        });

        if (dbError && dbError.code === '23505') {
          setError(`@${cleanHandle} is already taken. Try another.`);
          sound.playPanic();
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Supabase save error:', err);
      }
    }

    StorageService.saveProfile(newProfile);
    sound.playSend();
    setLoading(false);
    onComplete(newProfile);
  };

  const handleRestoreAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace(/^@/, '');

    if (!cleanHandle) {
      setError('Please enter your @username.');
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
          setError(`No account found for @${cleanHandle}`);
          sound.playPanic();
          setLoading(false);
          return;
        }

        const restored: UserProfile = {
          id: data.id || 'usr_' + Date.now(),
          handle: data.handle,
          displayName: data.display_name || data.handle,
          avatarId: data.avatar_id || 1,
          vibe: data.vibe || '',
          isAvailable: data.is_available ?? true,
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

  return (
    <div className="fixed inset-0 z-50 bg-[#000000] text-white flex flex-col justify-between select-none font-sans overflow-hidden safe-top safe-bottom">
      {/* Ambient Top Glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-80 h-80 bg-[#00F5A0]/15 rounded-full blur-[120px] pointer-events-none" />

      {/* VIEW 1: Clean, Minimal Luxury Native Splash Screen */}
      {view === 'welcome' && (
        <div className="flex-1 flex flex-col justify-between items-center px-6 py-8 w-full max-w-sm mx-auto animate-fade-in relative z-10">
          {/* Spacer */}
          <div className="h-6" />

          {/* Center Brand Identity */}
          <div className="flex flex-col items-center text-center">
            {/* Glowing Logo */}
            <div className="relative mb-6 group">
              <div className="absolute inset-0 rounded-[32px] bg-gradient-to-tr from-[#00F5A0]/30 to-[#D4FF00]/25 blur-2xl pointer-events-none animate-pulse-glow" />
              <img
                src="/logo.png"
                alt="BlinkMsg"
                className="relative z-10 w-28 h-28 object-contain rounded-[28px] drop-shadow-[0_12px_32px_rgba(0,245,160,0.35)]"
              />
            </div>

            {/* Brand Title */}
            <h1 className="text-3xl font-black tracking-tight text-white flex items-center justify-center space-x-1">
              <span>Blink</span>
              <span className="text-[#00F5A0]">Msg</span>
            </h1>

            {/* Simple, Memorable Tagline */}
            <p className="text-sm font-medium text-zinc-300 mt-2 tracking-wide">
              Speak Freely. Vanish Instantly.
            </p>
            <p className="text-[11px] text-zinc-500 font-mono mt-1">
              Private • Ephemeral • Untraceable
            </p>

            {/* E2EE Trust Pill */}
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 font-mono mt-6">
              <Shield className="w-3.5 h-3.5 text-[#00F5A0]" />
              <span>Zero-Trace Messaging</span>
            </div>
          </div>

          {/* Bottom Native Mobile Controls */}
          <div className="w-full space-y-3 pb-2">
            <button
              onClick={() => {
                sound.vibrate(10);
                setView('create');
                setError('');
              }}
              className="w-full h-14 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-extrabold text-base flex items-center justify-center space-x-2 active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(0,245,160,0.35)] cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <button
              onClick={() => {
                sound.vibrate(6);
                setView('login');
                setError('');
              }}
              className="w-full py-3 text-center text-xs text-zinc-400 hover:text-white font-mono active:scale-95 transition-all cursor-pointer"
            >
              Already have an account? <span className="text-[#00F5A0] font-bold">Log In</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: Native Create Identity Sheet */}
      {view === 'create' && (
        <div className="flex-1 flex flex-col justify-end px-5 pb-6 w-full max-w-sm mx-auto relative z-10 animate-slide-up">
          {/* Card Chassis */}
          <div className="bg-[#0A0D14] border border-white/[0.08] rounded-[32px] p-6 shadow-2xl space-y-5">
            {/* Top Sheet Drag Pill */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-2" />

            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  sound.vibrate(6);
                  setView('welcome');
                  setError('');
                }}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base font-extrabold text-white">Create Identity</h2>
              <div className="w-8" />
            </div>

            {/* Horizontal Native Avatar Bar */}
            <div className="space-y-1.5 text-center">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block">
                Choose Avatar
              </span>
              <div className="flex items-center justify-center space-x-2.5 py-1">
                {[1, 2, 3, 4, 5, 6].map((id) => (
                  <button
                    key={id}
                    onClick={() => {
                      sound.vibrate(6);
                      setAvatarId(id);
                    }}
                    className={`relative rounded-full p-0.5 transition-all duration-200 active:scale-90 ${
                      avatarId === id
                        ? 'ring-2 ring-[#00F5A0] scale-110 shadow-[0_0_12px_rgba(0,245,160,0.5)]'
                        : 'opacity-40 hover:opacity-100'
                    }`}
                  >
                    <Avatar avatarId={id} size="sm" />
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              {/* Display Name */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                  Your Name / Alias
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Mahaveer"
                  autoFocus
                  className="w-full bg-[#121622] border border-white/[0.08] focus:border-[#00F5A0] rounded-xl px-4 py-3 text-base text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                  Unique Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#00F5A0] font-mono text-sm font-bold">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="username"
                    className="w-full bg-[#121622] border border-white/[0.08] focus:border-[#00F5A0] rounded-xl pl-8 pr-4 py-3 text-base font-mono text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* 4-digit PIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                    4-Digit Recovery PIN (Optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="text-zinc-500 hover:text-white"
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
                  className="w-full bg-[#121622] border border-white/[0.08] focus:border-[#00F5A0] rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-white placeholder-zinc-700 outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono text-center">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              onClick={handleCreateAccount}
              disabled={loading || !handle.trim() || !displayName.trim()}
              className="w-full h-13 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-extrabold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-30 shadow-md cursor-pointer"
            >
              <span>{loading ? 'Creating...' : 'Enter BlinkMsg'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}

      {/* VIEW 3: Native Restore Identity Sheet */}
      {view === 'login' && (
        <div className="flex-1 flex flex-col justify-end px-5 pb-6 w-full max-w-sm mx-auto relative z-10 animate-slide-up">
          <div className="bg-[#0A0D14] border border-white/[0.08] rounded-[32px] p-6 shadow-2xl space-y-5">
            {/* Top Sheet Drag Pill */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto -mt-2 mb-2" />

            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  sound.vibrate(6);
                  setView('welcome');
                  setError('');
                }}
                className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <h2 className="text-base font-extrabold text-white">Restore Identity</h2>
              <div className="w-8" />
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                  Your @Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-[#00F5A0] font-mono text-sm font-bold">@</span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[@\s]/g, ''))}
                    placeholder="username"
                    autoFocus
                    className="w-full bg-[#121622] border border-white/[0.08] focus:border-[#00F5A0] rounded-xl pl-8 pr-4 py-3 text-base font-mono text-white placeholder-zinc-600 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-semibold">
                  4-Digit Recovery PIN (If Set)
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="w-full bg-[#121622] border border-white/[0.08] focus:border-[#00F5A0] rounded-xl px-4 py-2.5 text-center font-mono text-lg tracking-[0.4em] text-white placeholder-zinc-700 outline-none transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono text-center">
                {error}
              </p>
            )}

            <button
              onClick={handleRestoreAccount}
              disabled={loading || !handle.trim()}
              className="w-full h-13 rounded-2xl bg-[#00F5A0] hover:bg-[#00e090] text-black font-extrabold text-sm flex items-center justify-center space-x-2 active:scale-[0.98] transition-all disabled:opacity-30 shadow-md cursor-pointer"
            >
              <span>{loading ? 'Restoring...' : 'Log In Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
