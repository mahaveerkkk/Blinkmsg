import React from 'react';

interface AvatarProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}

const CLEAN_AVATARS = [
  { bg: 'bg-[#27272a]', text: 'text-zinc-200', symbol: 'BM' },
  { bg: 'bg-[#1e293b]', text: 'text-sky-300', symbol: 'VK' },
  { bg: 'bg-[#142e20]', text: 'text-emerald-300', symbol: 'GH' },
  { bg: 'bg-[#2d1f3d]', text: 'text-purple-300', symbol: 'NX' },
  { bg: 'bg-[#332014]', text: 'text-amber-300', symbol: 'SP' },
  { bg: 'bg-[#1f2937]', text: 'text-slate-300', symbol: 'CY' },
  { bg: 'bg-[#3b1219]', text: 'text-rose-300', symbol: 'RD' },
  { bg: 'bg-[#18181b]', text: 'text-zinc-400', symbol: 'SH' },
];

export const Avatar: React.FC<AvatarProps> = ({ avatarId, size = 'md' }) => {
  const index = Math.abs((avatarId - 1) % CLEAN_AVATARS.length);
  const item = CLEAN_AVATARS[index];

  const sizeClasses = {
    sm: 'w-8 h-8 text-[11px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-sm',
    xl: 'w-20 h-20 text-lg',
  }[size];

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold tracking-wider ${item.bg} ${item.text} ${sizeClasses} border border-white/5 select-none shrink-0`}
    >
      {item.symbol}
    </div>
  );
};
