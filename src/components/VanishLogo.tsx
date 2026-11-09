import React from 'react';

interface VanishLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
  showGlow?: boolean;
}

export const VanishLogo: React.FC<VanishLogoProps> = ({
  size = 56,
  animated = true,
  className = '',
  showGlow = true,
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {/* High-fidelity Neon Lime Radial Bloom */}
      {showGlow && (
        <div
          className={`absolute inset-0 rounded-[26%] bg-[#00F5A0]/25 blur-xl pointer-events-none transition-all duration-700 ${
            animated ? 'animate-pulse-glow opacity-80' : 'opacity-60'
          }`}
          style={{ transform: 'scale(1.15)' }}
        />
      )}

      {/* Official App Logo */}
      <img
        src="/logo.png"
        alt="BlinkMsg"
        className={`relative z-10 w-full h-full object-contain rounded-[24%] drop-shadow-[0_8px_20px_rgba(0,245,160,0.35)] transition-transform duration-300 ${
          animated ? 'hover:scale-105 active:scale-95' : ''
        }`}
        style={{ width: size, height: size }}
      />
    </div>
  );
};
