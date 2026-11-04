import React from 'react';

interface VanishLogoProps {
  size?: number;
  animated?: boolean;
  className?: string;
}

export const VanishLogo: React.FC<VanishLogoProps> = ({
  size = 56,
  animated = true,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 group ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Dynamic ambient backlight bloom */}
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-tr from-[#D4FF00]/25 via-[#00F5A0]/20 to-[#00D4FF]/20 blur-xl pointer-events-none transition-all duration-700 ${
          animated ? 'group-hover:opacity-100 group-hover:scale-125 opacity-70 animate-pulse-glow' : 'opacity-60'
        }`}
      />

      {/* Outer Sleek Glass Chassis */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`relative z-10 transition-transform duration-500 ease-out ${
          animated ? 'group-hover:scale-105 active:scale-95' : ''
        }`}
      >
        <defs>
          {/* Obsidian Plate Gradient */}
          <linearGradient id="plateGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1C1F26" />
            <stop offset="45%" stopColor="#0F1116" />
            <stop offset="100%" stopColor="#08090C" />
          </linearGradient>

          {/* Border Highlight Gradient */}
          <linearGradient id="rimGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.8" />
            <stop offset="35%" stopColor="#00F5A0" stopOpacity="0.4" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#D4FF00" stopOpacity="0.3" />
          </linearGradient>

          {/* Core Accent Glow */}
          <linearGradient id="accentGrad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#D4FF00" />
            <stop offset="50%" stopColor="#00F5A0" />
            <stop offset="100%" stopColor="#00C9FF" />
          </linearGradient>

          {/* Shutter Blade Gradient */}
          <linearGradient id="bladeGrad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#252A36" />
            <stop offset="100%" stopColor="#141720" />
          </linearGradient>

          {/* Inner Glow Filter */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Squircle Chassis with Beveled Inner Edge */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="24"
          fill="url(#plateGrad)"
          stroke="url(#rimGrad)"
          strokeWidth="2"
        />

        {/* Specular Top-Light Arc */}
        <path
          d="M 16 18 Q 50 14 84 18"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.25"
          strokeLinecap="round"
        />

        {/* Stealth Hexagonal Lens Grid (Aperture Iris) */}
        <g className="transition-all duration-700">
          {/* Outer Protective Iris Orbit */}
          <circle
            cx="50"
            cy="50"
            r="31"
            stroke="url(#accentGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeOpacity="0.45"
            className={animated ? 'animate-[spin_24s_linear_infinite]' : ''}
            style={{ transformOrigin: '50px 50px' }}
          />

          {/* Interlocking Stealth Prisms - Representing Ephemeral Blink / Shield */}
          <path
            d="M50 24L74 38V62L50 76L26 62V38L50 24Z"
            fill="url(#bladeGrad)"
            stroke="url(#rimGrad)"
            strokeWidth="1.2"
            strokeOpacity="0.5"
          />

          {/* Cybernetic Geometric V-Lens / Eye Aperture */}
          <path
            d="M32 40L50 64L68 40"
            stroke="url(#accentGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* Top Cloaking Visor Chevron */}
          <path
            d="M38 32L50 26L62 32"
            stroke="url(#accentGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.9"
          />

          {/* Central Quantum Zero-Knowledge Core (The Disappearing Particle) */}
          <circle
            cx="50"
            cy="48"
            r="4.5"
            fill="#D4FF00"
            filter="url(#neonGlow)"
          />
          <circle
            cx="50"
            cy="48"
            r="2"
            fill="#FFFFFF"
          />

          {/* Pulse Nodes at Apexes */}
          <circle cx="50" cy="24" r="2" fill="#00F5A0" />
          <circle cx="74" cy="38" r="1.5" fill="#00D4FF" />
          <circle cx="26" cy="38" r="1.5" fill="#D4FF00" />
          <circle cx="50" cy="76" r="2" fill="#D4FF00" />
        </g>
      </svg>
    </div>
  );
};
