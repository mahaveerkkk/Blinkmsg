import React from 'react';
import {
  Shield,
  Cpu,
  Lock,
  Zap,
  Terminal,
  Eye,
  Satellite,
  Radio,
  Flame,
  Fingerprint,
  Disc,
  Activity,
  Layers,
  Key,
  Atom,
  Code,
  RadioTower,
  BatteryCharging,
  Hexagon,
  Compass,
  Crosshair,
  Wifi,
  Sparkles,
  Anchor,
  Ghost,
} from 'lucide-react';
import { getAvatarById } from '../data/avatars';

interface AvatarProps {
  avatarId: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  name?: string;
  className?: string;
}

const ICON_MAP: Record<string, React.FC<{ className?: string; style?: React.CSSProperties }>> = {
  Shield,
  Cpu,
  Lock,
  Zap,
  Terminal,
  Eye,
  Satellite,
  Radio,
  Flame,
  Fingerprint,
  Disc,
  Activity,
  Layers,
  Key,
  Atom,
  Code,
  RadioTower,
  BatteryCharging,
  Hexagon,
  Compass,
  Crosshair,
  Wifi,
  Sparkles,
  Anchor,
  Ghost,
};

export const Avatar: React.FC<AvatarProps> = ({
  avatarId = 1,
  size = 'md',
  isOnline = false,
  name,
  className = '',
}) => {
  const avatar = getAvatarById(avatarId);

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3 stroke-[2.2]',
    sm: 'w-4 h-4 stroke-[2.2]',
    md: 'w-5 h-5 stroke-[2.2]',
    lg: 'w-6 h-6 stroke-[2.2]',
    xl: 'w-8 h-8 stroke-[2.2]',
  }[size];

  const dotSize = {
    xs: 'w-2 h-2 border-[1.5px]',
    sm: 'w-2.5 h-2.5 border-[2px]',
    md: 'w-3.5 h-3.5 border-[2px]',
    lg: 'w-4 h-4 border-[2.5px]',
    xl: 'w-5 h-5 border-[3px]',
  }[size];

  // Derive initials cleanly or fallback to avatar initials
  const cleanName = (name || '').replace(/^@/, '').trim();
  const initials = cleanName ? cleanName.slice(0, 2).toUpperCase() : avatar.initials;

  const IconComponent = avatar.icon ? ICON_MAP[avatar.icon] : null;

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      {/* Outer ambient glow ring */}
      <div
        className={`rounded-full flex items-center justify-center font-bold tracking-tight bg-gradient-to-br ${avatar.gradient} ${avatar.ring} border ${sizeClasses} relative overflow-hidden transition-all duration-300 shadow-md backdrop-blur-md`}
      >
        {/* Specular glass reflection arc */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/40 pointer-events-none" />

        {/* Diagonal high-tech grid illumination */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.35),transparent_60%)] pointer-events-none" />

        {/* Content: Icon or Initials */}
        {IconComponent ? (
          <div className="relative z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <IconComponent className={iconSizes} style={{ color: avatar.accent }} />
          </div>
        ) : (
          <span
            className="relative z-10 font-mono font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-white"
            style={{ textShadow: `0 0 10px ${avatar.accent}` }}
          >
            {initials}
          </span>
        )}
      </div>

      {isOnline && (
        <span
          className={`absolute bottom-0 right-0 rounded-full bg-[#00F5A0] border-black ${dotSize} shadow-[0_0_10px_rgba(0,245,160,0.9)]`}
        >
          <span className="absolute inset-0 rounded-full bg-[#00F5A0] animate-ping opacity-75" />
        </span>
      )}
    </div>
  );
};
