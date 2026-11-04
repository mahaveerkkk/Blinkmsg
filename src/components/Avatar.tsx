import React from 'react';

interface AvatarProps {
  avatarId: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  hasStory?: boolean;
  isOnline?: boolean;
}

const IG_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
];

export const Avatar: React.FC<AvatarProps> = ({
  avatarId,
  size = 'md',
  hasStory = false,
  isOnline = false,
}) => {
  const index = Math.abs((avatarId - 1) % IG_AVATARS.length);
  const src = IG_AVATARS[index];

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-13 h-13',
    lg: 'w-16 h-16',
    xl: 'w-22 h-22',
  }[size];

  const innerSize = {
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-15 h-15',
    xl: 'w-20 h-20',
  }[size];

  return (
    <div className="relative inline-flex shrink-0 select-none">
      {/* Instagram Story Gradient Ring */}
      <div
        className={`rounded-full flex items-center justify-center ${
          hasStory
            ? 'p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]'
            : ''
        }`}
      >
        <img
          src={src}
          alt="Avatar"
          className={`rounded-full object-cover border-2 border-black ${innerSize} bg-[#1a1a1a]`}
        />
      </div>

      {/* Instagram Active Now Green Dot */}
      {isOnline && (
        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#10b981] border-[2.5px] border-black" />
      )}
    </div>
  );
};
