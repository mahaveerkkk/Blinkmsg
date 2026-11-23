import React, { useState } from 'react';

export interface AvatarProps {
  avatarId?: number;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  name?: string;
  className?: string;
}

// 18 High-Aesthetic Cyberpunk Avatars in public bucket "Blink msg"
export const SUPABASE_AVATARS: { id: number; name: string; url: string }[] = [
  {
    id: 1,
    name: 'Cyber Wolf',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_1_cyber_wolf.png',
  },
  {
    id: 2,
    name: 'Cyber Panther',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_2_cyber_panther.png',
  },
  {
    id: 3,
    name: 'Cyber Raven',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_3_cyber_raven.png',
  },
  {
    id: 4,
    name: 'Cyber Oni',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_4_cyber_oni_mask.png',
  },
  {
    id: 5,
    name: 'Cyber Tiger',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_5_cyber_tiger.png',
  },
  {
    id: 6,
    name: 'Emerald Orb',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_6_emerald_orb.jpg',
  },
  {
    id: 7,
    name: 'Violet Plasma',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_7_violet_plasma.jpg',
  },
  {
    id: 8,
    name: 'Quantum Core',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_8_quantum_core.jpg',
  },
  {
    id: 9,
    name: 'Cyber Dragon',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_9_cyber_dragon.png',
  },
  {
    id: 10,
    name: 'Cyber Falcon',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_10_cyber_falcon.png',
  },
  {
    id: 11,
    name: 'Cyber Samurai',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_11_cyber_samurai.png',
  },
  {
    id: 12,
    name: 'Cyber Cobra',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_12_cyber_cobra.png',
  },
  {
    id: 13,
    name: 'Cyber Phoenix',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_13_cyber_phoenix.png',
  },
  {
    id: 14,
    name: 'Cyber Kitsune',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_14_cyber_kitsune.png',
  },
  {
    id: 15,
    name: 'Cyber Lion',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_15_cyber_lion.png',
  },
  {
    id: 16,
    name: 'Cyber Phantom',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_16_cyber_phantom.png',
  },
  {
    id: 17,
    name: 'Cyber Bear',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_17_cyber_bear.png',
  },
  {
    id: 18,
    name: 'Cyber Owl',
    url: 'https://oiqlbczaognjppzetsui.supabase.co/storage/v1/object/public/Blink%20msg/avatar_18_cyber_owl.png',
  },
];

// Fallback high-aesthetic cyberpunk gradients if image is loading or fails
const AVATAR_PALETTES = [
  {
    gradient: 'from-[#00F5A0] via-[#00B4D8] to-[#0A2540]',
    ring: 'border-emerald-400/30 shadow-[0_0_15px_rgba(0,245,160,0.25)]',
    text: 'text-emerald-100',
    accent: '#00F5A0',
  },
  {
    gradient: 'from-[#8B5CF6] via-[#EC4899] to-[#3B0764]',
    ring: 'border-purple-400/30 shadow-[0_0_15px_rgba(139,92,246,0.25)]',
    text: 'text-purple-100',
    accent: '#8B5CF6',
  },
  {
    gradient: 'from-[#D4FF00] via-[#10B981] to-[#064E3B]',
    ring: 'border-[#D4FF00]/40 shadow-[0_0_15px_rgba(212,255,0,0.25)]',
    text: 'text-[#D4FF00]',
    accent: '#D4FF00',
  },
  {
    gradient: 'from-[#38BDF8] via-[#2563EB] to-[#0F172A]',
    ring: 'border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)]',
    text: 'text-sky-100',
    accent: '#38BDF8',
  },
  {
    gradient: 'from-[#F43F5E] via-[#FB7185] to-[#4C0519]',
    ring: 'border-rose-400/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]',
    text: 'text-rose-100',
    accent: '#F43F5E',
  },
  {
    gradient: 'from-[#F59E0B] via-[#D97706] to-[#451A03]',
    ring: 'border-amber-400/30 shadow-[0_0_15px_rgba(245,158,11,0.25)]',
    text: 'text-amber-100',
    accent: '#F59E0B',
  },
  {
    gradient: 'from-[#06B6D4] via-[#0284C7] to-[#082F49]',
    ring: 'border-cyan-400/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]',
    text: 'text-cyan-100',
    accent: '#06B6D4',
  },
  {
    gradient: 'from-[#A855F7] via-[#6366F1] to-[#1E1B4B]',
    ring: 'border-violet-400/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]',
    text: 'text-violet-100',
    accent: '#A855F7',
  },
];

export const Avatar: React.FC<AvatarProps> = ({
  avatarId,
  avatarUrl,
  size = 'md',
  isOnline = false,
  name,
  className = '',
}) => {
  const [imageError, setImageError] = useState(false);
  const index = Math.abs((Number(avatarId) - 1 || 0) % AVATAR_PALETTES.length);
  const palette = AVATAR_PALETTES[index];

  // Check if we have a direct image URL or a matching Supabase avatar
  const targetImageUrl =
    avatarUrl ||
    (avatarId && avatarId >= 1 && avatarId <= SUPABASE_AVATARS.length
      ? SUPABASE_AVATARS[avatarId - 1].url
      : null);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2 border-[1.5px]',
    sm: 'w-2.5 h-2.5 border-[2px]',
    md: 'w-3.5 h-3.5 border-[2px]',
    lg: 'w-4 h-4 border-[2.5px]',
    xl: 'w-5 h-5 border-[3px]',
  }[size];

  // Derive initials cleanly
  const cleanName = (name || '').replace(/^@/, '').trim();
  const initials = cleanName
    ? cleanName.slice(0, 2).toUpperCase()
    : ['CW', 'CP', 'CR', 'OM', 'CT', 'EO', 'VP', 'QC'][index];

  const hasImage = !!targetImageUrl && !imageError;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {/* Outer ambient glow ring */}
      <div
        className={`rounded-full flex items-center justify-center font-bold tracking-tight bg-gradient-to-br ${palette.gradient} ${palette.text} ${palette.ring} border ${sizeClasses} relative overflow-hidden transition-all duration-300 shadow-md backdrop-blur-md`}
      >
        {hasImage ? (
          <img
            src={targetImageUrl}
            alt={name || 'Avatar'}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <>
            {/* Specular glass reflection arc */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/40 pointer-events-none" />

            {/* Diagonal high-tech grid line */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />

            <span className="relative z-10 font-mono font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              {initials}
            </span>
          </>
        )}
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-[#00F5A0] border-black ${dotSize} shadow-[0_0_10px_rgba(0,245,160,0.9)] z-20`}
        >
          <span className="absolute inset-0 rounded-full bg-[#00F5A0] animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
};
