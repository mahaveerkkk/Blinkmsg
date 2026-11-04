import React from 'react';

interface VanishLogoProps {
  size?: number;
  animated?: boolean;
}

export const VanishLogo: React.FC<VanishLogoProps> = ({ size = 64, animated = true }) => {
  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Outer ambient glow */}
      <div
        className="absolute inset-0 rounded-2xl bg-[#D4FF00]/15 blur-xl pointer-events-none"
        style={{ transform: 'scale(1.2)' }}
      />

      {/* Futuristic geometric shield / iris lens SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 ${animated ? 'transition-transform duration-500 hover:scale-105' : ''}`}
      >
        {/* Rounded dark background plate */}
        <rect
          x="4"
          y="4"
          width="92"
          height="92"
          rx="24"
          fill="#12151B"
          stroke="#D4FF00"
          strokeWidth="2.5"
          strokeOpacity="0.4"
        />

        {/* Outer diagonal stealth facets */}
        <path
          d="M20 28L50 14L80 28V52C80 69 67 83 50 88C33 83 20 69 20 52V28Z"
          stroke="#D4FF00"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* Dynamic geometric "V" cut */}
        <path
          d="M34 38L50 64L66 38"
          stroke="#D4FF00"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central disappearing keyhole / iris dot */}
        <circle cx="50" cy="46" r="3" fill="#D4FF00" />

        {/* Radial dissolution rays */}
        <line x1="50" y1="24" x2="50" y2="30" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="28" y1="52" x2="34" y2="52" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="66" y1="52" x2="72" y2="52" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
        <line x1="50" y1="74" x2="50" y2="80" stroke="#D4FF00" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.6" />
      </svg>
    </div>
  );
};
