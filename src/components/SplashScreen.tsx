import React, { useState } from 'react';
import { VanishLogo } from './VanishLogo';
import { UserProfile } from '../types';
import { supabase, handleToPin } from '../services/network';
import { StorageService } from '../services/storage';
import { sound } from '../services/sound';
import {
  ArrowRight,
  Shield,
  Lock,
  Flame,
  Check,
  Eye,
  EyeOff,
  ChevronLeft,
  Camera,
  Sparkles,
  KeyRound,
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
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanHandle || cleanHandle.length < 3) {
      setError('Please choose a handle with at least 3 characters.');
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

    // Save to Supabase profiles
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
          setError('This @' + cleanHandle + ' is already taken. Try another.');
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
          setError('No account found for @' + cleanHandle);
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
    <div className="fixed inset-0 z-50 bg-[#07080B] text-white flex flex-col justify-between p-6 select-none font-sans overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4FF00]/[0.03] rounded-full blur-[140px] pointer-events-none" />

      {/* STATE 1: Clean Telegram/Signal Style Welcome View */}
      {view === 'welcome' && (
        <div className="my-auto max-w-sm mx-auto w-full flex flex-col items-center text-center animate-fade-in z-10 py-6">
          <div className="mb-6 animate-float">
            <VanishLogo size={88} animated={true} />
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            BlinkMsg
          </h1>
          <p className="text-xs text-zinc-400 max-w-xs mb-8 leading-relaxed font-mono">
            Zero-Trace Ephemeral Messenger. Messages burn after reading.
          </p>

          {/* 3 Value Proposition Bullets */}
          <div className="w-full bg-[#0F121C] border border-white/[0.08] rounded-3xl p-5 space-y-4 mb-8 text-left shadow-lg">
            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#00F5A0]/10 border border-[#00F5A0]/20 flex items-center justify-center text-[#00F5A0] shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">End-to-End Encrypted</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Direct confidential messaging with zero metadata stored.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Auto-Burn on Read</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Self-destruct timer starts only after the recipient opens & reads.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3.5">
              <div className="w-8 h-8 rounded-xl bg-[#D4FF00]/10 border border-[#D4FF00]/20 flex items-center justify-center text-[#D4FF00] shrink-0 mt-0.5">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">No Phone Number Needed</h4>
                <p className="text-[11px] text-zinc-400 mt-0.5">Connect instantly using your permanent 6-digit personal PIN.</p>
              </div>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => {
              sound.vibrate(8);
              setView('create');
              setError('');
            }}
            className="w-full py-4 rounded-2xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-sm flex items-center justify-center space-x-2 active:scale-95 transition-all shadow-[0_0_25px_rgba(212,255,0,0.3)] mb-3"
          >
            <span>Create Profile</span>
            <ArrowRight className="w-4 h-4 stroke-[3]" />
          </button>

          {/* Secondary Action */}
          <button
            onClick={() => {
              sound.vibrate(6);
              setView('login');
              setError('');
            }}
            className="text-xs text-zinc-400 hover:text-white font-mono py-2 transition-colors"
          >
            Already have an account? <span className="text-[#D4FF00] font-bold underline">Log In</span>
          </button>
        </div>
      )}

      {/* STATE 2: Clean Profile Creation Flow */}
      {view === 'create' && (
        <div className="my-auto max-w-sm mx-auto w-full animate-fade-in z-10 py-4">
          {/* Back button */}
          <button
            onClick={() => {
              sound.vibrate(6);
              setView('welcome');
              setError('');
            }}
            className="inline-flex items-center space-x-1 text-xs text-zinc-400 hover:text-white mb-4 -ml-1 py-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Create Your Profile
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Pick an avatar and choose your personal handle
            </p>
          </div>

          <div className="bg-[#0F121C] border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-4">
            {/* Avatar Picker Icon */}
            <div className="flex flex-col items-center">
              <div
                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                className="relative cursor-pointer group"
              >
                <div className="ring-2 ring-white/[0.1] hover:ring-[#D4FF00]/60 rounded-full p-1 transition-all">
                  <Avatar avatarId={avatarId} size="lg" />
                </div>
                <span className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#181C26] border border-white/[0.15] text-[#D4FF00] flex items-center justify-center text-xs shadow-md">
                  <Camera className="w-3 h-3" />
                </span>
              </div>
              <span className="text-[11px] text-zinc-400 mt-2 font-mono">Tap to change avatar</span>

              {/* Collapsible Avatar Strip */}
              {showAvatarPicker && (
                <div className="flex items-center justify-center space-x-2 mt-3 p-2 bg-[#07080B] rounded-2xl border border-white/[0.06] w-full">
                  {[1, 2, 3, 4, 5, 6].map((id) => (
                    <button
                      key={id}
                      onClick={() => {
                        sound.vibrate(6);
                        setAvatarId(id);
                        setShowAvatarPicker(false);
                      }}
                      className={`p-1 rounded-full transition-transform active:scale-90 ${
                        avatarId === id ? 'ring-2 ring-[#D4FF00] scale-110' : 'opacity-40 hover:opacity-100'
                      }`}
                    >
                      <Avatar avatarId={id} size="sm" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-bold">
                Your Name / Alias *
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Mahaveer"
                autoFocus
                className="w-full bg-[#07080B] border border-white/[0.08] focus:border-[#D4FF00] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-colors"
              />
            </div>

            {/* Unique Username / Handle */}
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1 font-bold">
                Unique @Username *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#D4FF00] font-mono text-sm font-bold">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="username"
                  className="w-full bg-[#07080B] border border-white/[0.08] focus:border-[#D4FF00] rounded-xl pl-8 pr-3.5 py-2.5 text-sm font-mono text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            {/* 4-Digit Recovery PIN */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
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
                className="w-full bg-[#07080B] border border-white/[0.08] focus:border-[#D4FF00] rounded-xl px-3.5 py-2.5 text-center font-mono text-base tracking-[0.3em] text-white placeholder-zinc-700 outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono text-center pt-1">
                {error}
              </p>
            )}

            <button
              onClick={handleCreateAccount}
              disabled={loading || !handle.trim() || !displayName.trim()}
              className="w-full py-3.5 rounded-xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-30 shadow-md pt-3"
            >
              <span>{loading ? 'Creating Profile...' : 'Enter BlinkMsg'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: Clean Login / Restore Flow */}
      {view === 'login' && (
        <div className="my-auto max-w-sm mx-auto w-full animate-fade-in z-10 py-4">
          {/* Back button */}
          <button
            onClick={() => {
              sound.vibrate(6);
              setView('welcome');
              setError('');
            }}
            className="inline-flex items-center space-x-1 text-xs text-zinc-400 hover:text-white mb-4 -ml-1 py-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Restore Identity
            </h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              Enter your existing @username to log back in
            </p>
          </div>

          <div className="bg-[#0F121C] border border-white/[0.08] rounded-3xl p-5 shadow-xl space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5 font-bold">
                Your @Username *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[#D4FF00] font-mono text-sm font-bold">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[@\s]/g, ''))}
                  placeholder="username"
                  autoFocus
                  className="w-full bg-[#07080B] border border-white/[0.08] focus:border-[#D4FF00] rounded-xl pl-8 pr-3.5 py-3 text-sm font-mono text-white placeholder-zinc-600 outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5 font-bold">
                4-Digit Recovery PIN (If Set)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#07080B] border border-white/[0.08] focus:border-[#D4FF00] rounded-xl px-3.5 py-3 text-center font-mono text-base tracking-[0.3em] text-white placeholder-zinc-700 outline-none transition-colors"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 font-mono text-center pt-1">
                {error}
              </p>
            )}

            <button
              onClick={handleRestoreAccount}
              disabled={loading || !handle.trim()}
              className="w-full py-3.5 rounded-xl bg-[#D4FF00] hover:bg-[#c4ed00] text-black font-black text-xs flex items-center justify-center space-x-2 active:scale-95 transition-all disabled:opacity-30 shadow-md mt-2"
            >
              <span>{loading ? 'Restoring Profile...' : 'Log In Now'}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      )}

      {/* Footer Branding */}
      <div className="text-center pt-4 pb-2 z-10">
        <p className="text-[10px] font-mono text-zinc-600">
          BlinkMsg • Zero-Knowledge Architecture
        </p>
      </div>
    </div>
  );
};
