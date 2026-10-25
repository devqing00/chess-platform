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
    sm: { icon: 'w-7 h-7', text: 'text-xs', box: 'w-7 h-7 rounded-lg' },
    md: { icon: 'w-9 h-9', text: 'text-sm', box: 'w-9 h-9 rounded-xl' },
    lg: { icon: 'w-11 h-11', text: 'text-base', box: 'w-11 h-11 rounded-2xl' },
    xl: { icon: 'w-14 h-14', text: 'text-xl', box: 'w-14 h-14 rounded-3xl' },
  }[size];

  const logoSrc =
    variant === 'white'
      ? '/brand/logo-white.png'
      : variant === 'black'
      ? '/brand/logo-black.png'
      : '/brand/logo-colored.png';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer active:scale-95 transition-transform' : ''} ${className}`}
    >
      {/* Modern Compact Rounded Emblem */}
      <div
        className={`relative ${dimensions.box} bg-gradient-to-b from-[#24221d] to-[#171613] border-2 border-[#38342c] shadow-[0_3px_0_0_#141311] flex items-center justify-center shrink-0 overflow-hidden group`}
      >
        {/* Ambient Emerald Radiance */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#22c55e25,transparent_75%)] pointer-events-none" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          alt="Check.mate"
          className="w-[86%] h-[86%] object-contain relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] pointer-events-none select-none"
          draggable={false}
        />
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
