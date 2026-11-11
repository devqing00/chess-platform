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
      'tactile-btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-bold transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] hover:brightness-110 text-white font-extrabold shadow-[0_2px_8px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)] active:scale-[0.98] active:translate-y-[1px] border border-emerald-400/20',
      secondary:
        'bg-[#24221f] hover:bg-[#2c2925] text-zinc-100 font-bold border border-white/10 hover:border-white/20 shadow-xs active:scale-[0.98] active:translate-y-[1px]',
      warning:
        'bg-gradient-to-b from-[#f59e0b] to-[#d97706] hover:brightness-110 text-zinc-950 font-black shadow-[0_2px_8px_rgba(245,158,11,0.25)] active:scale-[0.98] active:translate-y-[1px] border border-amber-400/20',
      destructive:
        'bg-gradient-to-b from-[#f43f5e] to-[#e11d48] hover:brightness-110 text-white font-bold shadow-[0_2px_8px_rgba(244,63,94,0.3)] active:scale-[0.98] active:translate-y-[1px] border border-rose-400/20',
      blue:
        'bg-gradient-to-b from-[#3b82f6] to-[#2563eb] hover:brightness-110 text-white font-bold shadow-[0_2px_8px_rgba(59,130,246,0.3)] active:scale-[0.98] active:translate-y-[1px] border border-blue-400/20',
      purple:
        'bg-gradient-to-b from-[#8b5cf6] to-[#7c3aed] hover:brightness-110 text-white font-bold shadow-[0_2px_8px_rgba(139,92,246,0.3)] active:scale-[0.98] active:translate-y-[1px] border border-purple-400/20',
      ghost:
        'bg-transparent text-zinc-300 border-transparent hover:bg-white/5 hover:text-white active:scale-[0.98] active:translate-y-[1px]',
      outline:
        'bg-transparent text-zinc-200 border border-white/15 hover:border-emerald-500/60 hover:text-emerald-400 hover:bg-emerald-500/10 active:scale-[0.98] active:translate-y-[1px]',
      subtle:
        'bg-[#1c1a17] hover:bg-[#24221f] text-zinc-300 hover:text-white border border-white/5 hover:border-white/10 active:scale-[0.98] active:translate-y-[1px]',
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
