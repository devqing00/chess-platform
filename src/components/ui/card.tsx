'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#1c1a17] text-zinc-100 overflow-hidden p-5 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardInteractive({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/10 bg-[#1c1a17] text-zinc-100 cursor-pointer overflow-hidden p-5 shadow-sm',
        'transition-all duration-150 ease-out',
        'hover:border-white/20 hover:bg-[#201e1b]',
        'active:scale-[0.98]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1 pb-3', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      className={cn(
        'text-base font-black text-white leading-tight tracking-tight',
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-xs text-zinc-400', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center gap-3 pt-3', className)} {...props} />;
}
