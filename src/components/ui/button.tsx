'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

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

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon' | 'icon-sm';

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
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold border transition-all duration-150 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] select-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#81b64c] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none';

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-[#81b64c] hover:bg-[#92cb56] text-black font-black border-transparent shadow-[0_4px_0_0_#4d7a24] hover:shadow-[0_5px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24]',
      secondary:
        'bg-[#211f1c] hover:bg-[#2c2924] text-zinc-200 border-[#38342c] hover:border-[#4d473d] shadow-[0_4px_0_0_#141311] hover:shadow-[0_5px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311]',
      warning:
        'bg-[#f59e0b] hover:bg-[#fbbf24] text-black font-black border-transparent shadow-[0_4px_0_0_#92400e] hover:shadow-[0_5px_0_0_#92400e] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#92400e]',
      destructive:
        'bg-[#ef4444] hover:bg-[#f87171] text-white border-transparent shadow-[0_4px_0_0_#7f1d1d] hover:shadow-[0_5px_0_0_#7f1d1d] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#7f1d1d]',
      blue:
        'bg-[#3b82f6] hover:bg-[#60a5fa] text-white border-transparent shadow-[0_4px_0_0_#1e3a8a] hover:shadow-[0_5px_0_0_#1e3a8a] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#1e3a8a]',
      purple:
        'bg-[#a855f7] hover:bg-[#c084fc] text-white border-transparent shadow-[0_4px_0_0_#581c87] hover:shadow-[0_5px_0_0_#581c87] hover:-translate-y-[1px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#581c87]',
      ghost:
        'bg-transparent text-zinc-300 border-transparent hover:bg-white/10 hover:text-white active:translate-y-[1px]',
      outline:
        'bg-transparent text-zinc-200 border-[#38342c] hover:border-[#81b64c] hover:text-[#81b64c] hover:bg-[#81b64c]/10 active:translate-y-[1px]',
      subtle:
        'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border-white/5 hover:border-white/10 active:translate-y-[1px]',
    };

    const sizeStyles: Record<ButtonSize, string> = {
      xs: 'h-7 px-2.5 py-1 text-[11px]',
      sm: 'h-9 px-3.5 py-1.5 text-xs',
      md: 'h-11 px-5 py-2 text-sm',
      lg: 'h-13 px-6 py-2.5 text-base',
      xl: 'h-14 px-8 py-3.5 text-base font-black',
      icon: 'h-10 w-10 p-0',
      'icon-sm': 'h-8 w-8 p-0 text-xs',
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

    return (
      <button
        ref={ref}
        disabled={disabled}
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
