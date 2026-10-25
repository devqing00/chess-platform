'use client';

import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  variant?: 'colored' | 'white' | 'black';
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  variant = 'colored',
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
      {/* Modern Compact Rounded Emblem: Checkmark + Arched Knight + Crown */}
      <div
        className={`relative ${dimensions.box} bg-gradient-to-b from-[#24221d] to-[#171613] border-2 border-[#38342c] shadow-[0_3px_0_0_#141311] flex items-center justify-center shrink-0 overflow-hidden group`}
      >
        {/* Ambient Emerald Radiance */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#22c55e33,transparent_75%)] pointer-events-none" />

        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[86%] h-[86%] relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
        >
          <defs>
            <linearGradient id="bl-green-grad" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="55%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <linearGradient id="bl-crown-grad" x1="45" y1="8" x2="65" y2="28" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>
          </defs>

          {/* 1. The Crown */}
          <path
            d="M44 26 L42 16 L49 20 L56 12 L63 20 L70 16 L68 26 Z"
            fill={variant === 'colored' ? 'url(#bl-crown-grad)' : variant === 'white' ? '#ffffff' : '#161512'}
            stroke={variant === 'colored' ? 'url(#bl-crown-grad)' : variant === 'white' ? '#ffffff' : '#161512'}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx="42" cy="15" r="2.2" fill={variant === 'colored' ? '#fef08a' : variant === 'white' ? '#ffffff' : '#161512'} />
          <circle cx="56" cy="11" r="2.6" fill={variant === 'colored' ? '#fef08a' : variant === 'white' ? '#ffffff' : '#161512'} />
          <circle cx="70" cy="15" r="2.2" fill={variant === 'colored' ? '#fef08a' : variant === 'white' ? '#ffffff' : '#161512'} />

          {/* 2. Main Checkmark + Knight Head Flow */}
          <path
            d="M18 48 
               L28 62 
               C33 52 41 38 52 28 
               C56 24 64 24 68 28
               C70 30 71 33 72 36
               L66 38
               C65 38 64 39 65 41
               L69 44
               C66 48 61 49 57 48
               C53 47 50 51 52 57
               C54 62 60 64 68 64"
            fill="none"
            stroke={variant === 'colored' ? 'url(#bl-green-grad)' : variant === 'white' ? '#ffffff' : '#161512'}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 3. Knight Eye Accent */}
          <path
            d="M60 32 C61 31 63 31 64 33"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 4. Inner White Chest Contour */}
          <path
            d="M36 66 C36 57 40 46 44 40"
            stroke={variant === 'black' ? '#161512' : '#ffffff'}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* 5. Terminal Base Sphere */}
          <circle cx="73" cy="64" r="4.5" fill={variant === 'colored' ? '#22c55e' : variant === 'white' ? '#ffffff' : '#161512'} />
          {variant === 'colored' && (
            <circle cx="72" cy="63" r="1.5" fill="#bbf7d0" />
          )}
        </svg>
      </div>

      {/* Typography Lockup with distinctive dot */}
      {showText && (
        <div className="flex items-center min-w-0">
          <span className={`${dimensions.text} font-black tracking-tight text-white`}>
            Check<span className="text-emerald-400">.</span>mate
          </span>
        </div>
      )}
    </div>
  );
};
