import React from 'react';

interface AvatarProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}

const AVATAR_PALETTES = [
  { bg: 'from-emerald-500 to-teal-800', border: 'border-emerald-400', icon: '🥷' },
  { bg: 'from-cyan-500 to-blue-800', border: 'border-cyan-400', icon: '⚡' },
  { bg: 'from-purple-500 to-indigo-900', border: 'border-purple-400', icon: '👁️' },
  { bg: 'from-pink-500 to-rose-900', border: 'border-pink-400', icon: '💀' },
  { bg: 'from-amber-500 to-orange-900', border: 'border-amber-400', icon: '🦊' },
  { bg: 'from-violet-600 to-fuchsia-900', border: 'border-violet-400', icon: '🚀' },
  { bg: 'from-sky-500 to-slate-900', border: 'border-sky-400', icon: '❄️' },
  { bg: 'from-rose-600 to-zinc-900', border: 'border-rose-400', icon: '🔥' },
];

export const Avatar: React.FC<AvatarProps> = ({ avatarId, size = 'md', glow = false }) => {
  const index = Math.abs((avatarId - 1) % AVATAR_PALETTES.length);
  const palette = AVATAR_PALETTES[index];

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-11 h-11 text-lg',
    lg: 'w-16 h-16 text-2xl',
    xl: 'w-20 h-20 text-3xl',
  }[size];

  return (
    <div
      className={`relative rounded-full flex items-center justify-center bg-gradient-to-br ${palette.bg} border ${palette.border} ${sizeClasses} shadow-md select-none ${
        glow ? 'shadow-[0_0_15px_rgba(0,255,170,0.4)]' : ''
      }`}
    >
      <span className="drop-shadow">{palette.icon}</span>
    </div>
  );
};
