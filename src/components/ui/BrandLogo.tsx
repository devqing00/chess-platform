'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  onClick,
}) => {
  const dimensions = {
    sm: { icon: 'w-7 h-7', text: 'text-xs', sub: 'text-[8px]', box: 'w-7 h-7 rounded-lg' },
    md: { icon: 'w-9 h-9', text: 'text-sm', sub: 'text-[9px]', box: 'w-9 h-9 rounded-xl' },
    lg: { icon: 'w-11 h-11', text: 'text-base', sub: 'text-[10px]', box: 'w-11 h-11 rounded-2xl' },
    xl: { icon: 'w-14 h-14', text: 'text-xl', sub: 'text-[11px]', box: 'w-14 h-14 rounded-3xl' },
  }[size];

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''} ${className}`}
    >
      {/* Solid Geometric Emblem: Crown + Knight Silhouette with Tactile Bevel */}
      <div
        className={`relative ${dimensions.box} bg-gradient-to-b from-[#24221d] to-[#171613] border-2 border-[#38342c] shadow-[0_3px_0_0_#141311] flex items-center justify-center shrink-0 overflow-hidden group`}
      >
        {/* Subtle Ambient Light Cone */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#22c55e33,transparent_70%)] pointer-events-none" />

        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-5/6 h-5/6 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        >
          {/* Base Platform / Pedestal */}
          <path
            d="M6 25C6 24.4477 6.44772 24 7 24H25C25.5523 24 26 24.4477 26 25V26C26 26.5523 25.5523 27 25 27H7C6.44772 27 6 26.5523 6 26V25Z"
            fill="#5b8630"
          />

          {/* Solid Crown/Knight Main Body */}
          <path
            d="M7 23L9 11L13 15L16 6L19 15L23 11L25 23H7Z"
            fill="url(#checkmate-crown-grad)"
          />

          {/* Left Wing Facet for 3D depth */}
          <path
            d="M7 23L9 11L13 15L16 23H7Z"
            fill="#6fa33e"
            fillOpacity="0.4"
          />

          {/* Right Wing Facet for 3D depth */}
          <path
            d="M25 23L23 11L19 15L16 23H25Z"
            fill="#456c20"
            fillOpacity="0.45"
          />

          {/* Center Pinnacle Diamond */}
          <polygon
            points="16,8 18,13 16,18 14,13"
            fill="#ffffff"
            fillOpacity="0.9"
          />

          {/* Sharp Modern Checkmark Notch Cut */}
          <path
            d="M11 18.5L14.5 22L21 14"
            stroke="#171613"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Apex Pearls */}
          <circle cx="16" cy="5" r="1.5" fill="#facc15" />
          <circle cx="9" cy="10" r="1.1" fill="#e4e4e7" />
          <circle cx="23" cy="10" r="1.1" fill="#e4e4e7" />

          {/* Gradients */}
          <defs>
            <linearGradient
              id="checkmate-crown-grad"
              x1="16"
              y1="6"
              x2="16"
              y2="23"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#4ade80" />
              <stop offset="0.6" stopColor="#22c55e" />
              <stop offset="1" stopColor="#15803d" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex items-center min-w-0">
          <span className={`${dimensions.text} font-black tracking-tight text-white uppercase`}>
            Check<span className="text-emerald-400">mate</span>
          </span>
        </div>
      )}
    </div>
  );
};
