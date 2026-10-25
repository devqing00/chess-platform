'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { soundService } from '@/lib/audioService';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'warning'
  | 'destructive'
  | 'blue'
  | 'purple'
  | 'ghost'
  | 'outline'
  | 'subtle';

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm' | 'icon-xs';

export type ButtonRounded = 'full' | '2xl' | 'xl' | 'lg' | 'md' | 'sm' | 'none';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      rounded = 'xl',
      fullWidth = false,
      children,
      disabled,
      onPointerDown,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'tactile-btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold border transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] hover:from-[#9ee055] hover:via-[#88c445] hover:to-[#74ac35] text-zinc-950 font-black tracking-wide drop-shadow-[0_1px_0_rgba(255,255,255,0.25)] border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_4px_0_0_#385a16,0_6px_16px_rgba(0,0,0,0.35)] hover:shadow-[0_5px_0_0_#385a16,0_8px_20px_rgba(110,180,45,0.4)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#385a16]',
      secondary:
        'bg-gradient-to-b from-[#34302a] via-[#272420] to-[#1c1a17] hover:from-[#3e3932] hover:via-[#2f2b26] hover:to-[#22201d] text-zinc-200 font-extrabold border-t border-white/35 border-x-[#3c372f] border-b-[#100f0d] shadow-[0_4px_0_0_#0f0e0c,0_4px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_5px_0_0_#0f0e0c,0_6px_16px_rgba(0,0,0,0.5)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#0f0e0c]',
      warning:
        'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] hover:from-[#fcd34d] hover:via-[#fbbf24] hover:to-[#ea580c] text-zinc-950 font-black border-t border-white/35 border-x-amber-500/20 border-b-amber-950/40 shadow-[0_4px_0_0_#78350f,0_6px_16px_rgba(245,158,11,0.35)] hover:shadow-[0_5px_0_0_#78350f,0_8px_20px_rgba(245,158,11,0.45)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#78350f]',
      destructive:
        'bg-gradient-to-b from-[#f87171] via-[#ef4444] to-[#dc2626] hover:from-[#fca5a5] hover:via-[#f87171] hover:to-[#b91c1c] text-white font-black border-t border-white/35 border-x-red-500/20 border-b-red-950/40 shadow-[0_4px_0_0_#7f1d1d,0_6px_16px_rgba(239,68,68,0.35)] hover:shadow-[0_5px_0_0_#7f1d1d,0_8px_20px_rgba(239,68,68,0.45)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#7f1d1d]',
      blue:
        'bg-gradient-to-b from-[#60a5fa] via-[#3b82f6] to-[#2563eb] hover:from-[#93c5fd] hover:via-[#60a5fa] hover:to-[#1d4ed8] text-white font-black border-t border-white/35 border-x-blue-500/20 border-b-blue-950/40 shadow-[0_4px_0_0_#1e3a8a,0_6px_16px_rgba(59,130,246,0.35)] hover:shadow-[0_5px_0_0_#1e3a8a,0_8px_20px_rgba(59,130,246,0.45)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#1e3a8a]',
      purple:
        'bg-gradient-to-b from-[#c084fc] via-[#a855f7] to-[#9333ea] hover:from-[#d8b4fe] hover:via-[#c084fc] hover:to-[#7e22ce] text-white font-black border-t border-white/35 border-x-purple-500/20 border-b-purple-950/40 shadow-[0_4px_0_0_#4c1d95,0_6px_16px_rgba(168,85,247,0.35)] hover:shadow-[0_5px_0_0_#4c1d95,0_8px_20px_rgba(168,85,247,0.45)] hover:-translate-y-[1px] active:translate-y-[3px] active:shadow-[0_1px_0_0_#4c1d95]',
      ghost:
        'bg-transparent text-zinc-300 border-transparent hover:bg-white/10 hover:text-white active:translate-y-[1px]',
      outline:
        'bg-white/[0.03] text-zinc-200 border-[#38342c] hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 active:translate-y-[1px]',
      subtle:
        'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 active:translate-y-[1px]',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'h-7 px-2.5 py-1 text-[11px]',
      sm: 'h-9 px-3.5 py-1.5 text-xs',
      md: 'h-11 px-5 py-2 text-sm',
      lg: 'h-13 px-6 py-2.5 text-base',
      xl: 'h-14 px-8 py-3.5 text-base font-black',
      icon: 'h-10 w-10 p-0',
      'icon-sm': 'h-8 w-8 p-0 text-xs',
      'icon-xs': 'h-7 w-7 p-0 text-[11px]',
    };

    const roundedStyles: Record<ButtonRounded, string> = {
      full: 'rounded-full',
      '2xl': 'rounded-2xl',
      xl: 'rounded-xl',
      lg: 'rounded-lg',
      md: 'rounded-md',
      sm: 'rounded-sm',
      none: 'rounded-none',
    };

    // If className already specifies a rounded- class, skip applying roundedStyles
    const hasCustomRounded = className && /rounded-(none|sm|md|lg|xl|2xl|3xl|full)/.test(className);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!disabled) {
        soundService.playTactilePop();
      }
      onPointerDown?.(e);
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          !hasCustomRounded && roundedStyles[rounded],
          fullWidth && 'w-full',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
