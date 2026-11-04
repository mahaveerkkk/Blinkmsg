import React, { useState } from 'react';
import { VanishLogo } from './VanishLogo';
import { UserProfile } from '../types';
import { supabase } from '../services/network';
import { StorageService } from '../services/storage';
import { sound } from '../services/sound';
import { ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';

interface SplashScreenProps {
  onComplete: (user: UserProfile) => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [mode, setMode] = useState<'create' | 'restore'>('create');
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState(1);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async () => {
    setError('');
    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');

    if (!cleanHandle || cleanHandle.length < 3) {
      setError('Handle must be at least 3 characters (letters, numbers, underscores).');
      return;
    }

    setLoading(true);
    sound.vibrate(10);

    const newProfile: UserProfile = {
      id: 'usr_' + Math.random().toString(36).substring(2, 11),
      handle: cleanHandle,
      displayName: displayName.trim() || cleanHandle,
      avatarId,
      vibe: 'Hey there, I am using BlinkMsg',
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
          setError('This @handle is already taken. Please pick another one.');
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
      return;
    }

    setLoading(true);
    sound.vibrate(10);

    if (supabase) {
      try {
        const { data, error: dbError } = await supabase
          .from('profiles')
          .select('*')
          .eq('handle', cleanHandle)
          .single();

        if (dbError || !data) {
          setError('No account found with this @handle.');
          setLoading(false);
          return;
        }

        const restored: UserProfile = {
          id: data.id || 'usr_' + Date.now(),
          handle: data.handle,
          displayName: data.display_name || data.handle,
          avatarId: data.avatar_id || 1,
          vibe: data.vibe || 'Hey there, I am using BlinkMsg',
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
        setError('Error connecting to Supabase.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05070d] text-white flex flex-col justify-between p-6 select-none overflow-y-auto">
      <div />

      {/* Center Setup Box */}
      <div className="flex flex-col items-center text-center my-auto max-w-sm mx-auto w-full">
        {/* Animated VanishLogo */}
        <div className="mb-4 animate-pop-in">
          <VanishLogo size={84} animated={true} />
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white mb-1">
          BlinkMsg
        </h1>
        <p className="text-xs text-[#D4FF00] font-mono tracking-wider uppercase mb-6 font-bold">
          No Number • No Account • No History
        </p>

        {/* Mode: Create Account Form */}
        {mode === 'create' && (
          <div className="w-full space-y-3.5 text-left animate-fade-in">
            {/* Avatar Picker */}
            <div className="flex items-center justify-center space-x-2 mb-2">
              {[1, 2, 3, 4, 5, 6].map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    sound.vibrate(6);
                    setAvatarId(id);
                  }}
                  className={`p-0.5 rounded-full transition-transform ${
                    avatarId === id ? 'ring-2 ring-[#D4FF00] scale-110' : 'opacity-40'
                  }`}
                >
                  <Avatar avatarId={id} size="sm" />
                </button>
              ))}
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                Pick Your Unique @Handle *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[#D4FF00] font-mono text-sm font-bold">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="e.g. veer"
                  autoFocus
                  className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/60 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-zinc-600 outline-none shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                Display Name (Optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Veer"
                className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/60 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none shadow-inner"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                Optional 4-Digit Recovery PIN
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/60 rounded-2xl px-4 py-2 text-center text-sm font-mono tracking-widest text-white outline-none shadow-inner"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleCreateAccount}
              disabled={loading || !handle.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-extrabold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform disabled:opacity-40 shadow-[0_0_20px_rgba(212,255,0,0.3)] mt-2"
            >
              <span>{loading ? 'Creating...' : 'Create Handle & Enter'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => setMode('restore')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Already have an account? <span className="text-[#D4FF00] font-semibold">Login</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode: Restore Account Form */}
        {mode === 'restore' && (
          <div className="w-full space-y-3.5 text-left animate-fade-in">
            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                Your Existing @Handle
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-[#D4FF00] font-mono text-sm font-bold">@</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.toLowerCase().replace('@', ''))}
                  placeholder="e.g. veer"
                  autoFocus
                  className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/60 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-mono text-white placeholder-zinc-600 outline-none shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1 uppercase font-semibold">
                4-Digit PIN (If you set one)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#12151B] border border-white/10 focus:border-[#D4FF00]/60 rounded-2xl px-4 py-2 text-center text-sm font-mono tracking-widest text-white outline-none shadow-inner"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center space-x-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleRestoreAccount}
              disabled={loading || !handle.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#D4FF00] text-black font-extrabold text-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform disabled:opacity-40 shadow-[0_0_20px_rgba(212,255,0,0.3)] mt-2"
            >
              <span>{loading ? 'Searching...' : 'Restore Identity'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="text-center pt-2">
              <button
                onClick={() => setMode('create')}
                className="text-xs text-zinc-400 hover:text-white"
              >
                Want a new identity? <span className="text-[#D4FF00] font-semibold">Sign Up</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-zinc-600 font-mono">
        BlinkMsg • E2E Encrypted Ephemeral Chat
      </div>
    </div>
  );
};
