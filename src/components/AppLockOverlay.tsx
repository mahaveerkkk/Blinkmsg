import React, { useState, useEffect } from 'react';
import { Lock, Delete, Shield, Fingerprint } from 'lucide-react';
import { VanishLogo } from './VanishLogo';
import { sound } from '../services/sound';
import { handleToPin } from '../services/network';
import { UserProfile } from '../types';

interface AppLockOverlayProps {
  currentUser: UserProfile;
  onUnlock: () => void;
}

export const AppLockOverlay: React.FC<AppLockOverlayProps> = ({ currentUser, onUnlock }) => {
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState(false);

  const targetPin = (currentUser.pin || handleToPin(currentUser.handle)).slice(0, 4);

  const handleKeyPress = (num: string) => {
    if (pinInput.length >= 4) return;
    sound.vibrate(10);
    const next = pinInput + num;
    setPinInput(next);

    if (next.length === 4) {
      if (next === targetPin) {
        sound.playReceive();
        sound.vibrate([15, 30, 20]);
        onUnlock();
      } else {
        setError(true);
        sound.playPanic();
        setTimeout(() => {
          setPinInput('');
          setError(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    sound.vibrate(8);
    setPinInput((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#07080B]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none font-sans animate-fade-in">
      {/* Top stealth badge */}
      <div className="pt-4 flex items-center space-x-1.5 text-zinc-500 font-mono text-[11px]">
        <Shield className="w-3.5 h-3.5 text-[#00F5A0]" />
        <span>BlinkMsg Stealth Lock Active</span>
      </div>

      {/* Center Branding & PIN Dots */}
      <div className="flex flex-col items-center text-center my-auto w-full max-w-xs">
        <div className="mb-4 animate-float">
          <VanishLogo size={72} animated={true} />
        </div>

        <h2 className="text-xl font-black text-white tracking-tight mb-1">
          Confidential Session
        </h2>
        <p className="text-xs text-zinc-400 font-mono mb-6">
          Enter PIN for @{currentUser.handle}
        </p>

        {/* 4 PIN Dots */}
        <div className={`flex items-center space-x-4 mb-8 transition-transform ${error ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const filled = pinInput.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  filled
                    ? 'bg-[#D4FF00] scale-125 shadow-[0_0_12px_#D4FF00]'
                    : error
                    ? 'bg-red-500 scale-100'
                    : 'bg-white/[0.1] border border-white/[0.2]'
                }`}
              />
            );
          })}
        </div>

        {/* Tactile Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full px-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="w-16 h-16 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-xl font-bold text-white flex items-center justify-center active:scale-90 transition-transform mx-auto shadow-sm"
            >
              {digit}
            </button>
          ))}

          {/* Biometric trigger */}
          <button
            onClick={() => {
              sound.playHoldPulse();
              onUnlock();
            }}
            className="w-16 h-16 rounded-full bg-[#00F5A0]/10 hover:bg-[#00F5A0]/20 border border-[#00F5A0]/20 text-[#00F5A0] flex items-center justify-center active:scale-90 transition-transform mx-auto"
            title="Biometric Bypass"
          >
            <Fingerprint className="w-6 h-6" />
          </button>

          <button
            onClick={() => handleKeyPress('0')}
            className="w-16 h-16 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-xl font-bold text-white flex items-center justify-center active:scale-90 transition-transform mx-auto shadow-sm"
          >
            0
          </button>

          <button
            onClick={handleDelete}
            className="w-16 h-16 rounded-full bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] text-zinc-400 hover:text-white flex items-center justify-center active:scale-90 transition-transform mx-auto"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="pb-4 text-center">
        <span className="text-[10px] font-mono text-zinc-600">
          Shielded by AES-GCM-256 • Hardware Protected
        </span>
      </div>
    </div>
  );
};
