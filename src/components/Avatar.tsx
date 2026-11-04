import React from 'react';

interface AvatarProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  name?: string;
}

const AVATAR_COLORS = [
  { bg: 'from-emerald-500/20 to-emerald-950/40', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  { bg: 'from-blue-500/20 to-blue-950/40', border: 'border-blue-500/30', text: 'text-blue-400' },
  { bg: 'from-purple-500/20 to-purple-950/40', border: 'border-purple-500/30', text: 'text-purple-400' },
  { bg: 'from-amber-500/20 to-amber-950/40', border: 'border-amber-500/30', text: 'text-amber-400' },
  { bg: 'from-rose-500/20 to-rose-950/40', border: 'border-rose-500/30', text: 'text-rose-400' },
  { bg: 'from-cyan-500/20 to-cyan-950/40', border: 'border-cyan-500/30', text: 'text-cyan-400' },
  { bg: 'from-indigo-500/20 to-indigo-950/40', border: 'border-indigo-500/30', text: 'text-indigo-400' },
  { bg: 'from-zinc-600/20 to-zinc-950/40', border: 'border-zinc-500/30', text: 'text-zinc-300' },
];

export const Avatar: React.FC<AvatarProps> = ({
  avatarId,
  size = 'md',
  isOnline = false,
  name,
}) => {
  const index = Math.abs((avatarId - 1) % AVATAR_COLORS.length);
  const color = AVATAR_COLORS[index];

  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  const dotSize = {
    sm: 'w-2.5 h-2.5 border-[2px]',
    md: 'w-3 h-3 border-[2px]',
    lg: 'w-3.5 h-3.5 border-[2.5px]',
    xl: 'w-4 h-4 border-[3px]',
  }[size];

  // Derive initials
  const initials = name
    ? name.replace('@', '').substring(0, 2).toUpperCase()
    : ['BM', 'VK', 'SP', 'NX', 'AL', 'CR', 'ZT', 'GH'][index];

  return (
    <div className="relative inline-flex shrink-0 select-none">
      <div
        className={`rounded-full flex items-center justify-center font-bold tracking-tight bg-gradient-to-b ${color.bg} ${color.text} border ${color.border} ${sizeClasses} shadow-sm backdrop-blur-sm`}
      >
        <span>{initials}</span>
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-emerald-400 border-black ${dotSize} shadow-[0_0_8px_rgba(52,211,153,0.8)]`}
        />
      )}
    </div>
  );
};
