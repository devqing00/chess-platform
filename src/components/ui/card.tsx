'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-2xl border-2 border-[#35322b] bg-[#211f1c] text-zinc-100 overflow-hidden p-5 shadow-[0_4px_0_0_#141311]',
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
        'rounded-2xl border-2 border-[#35322b] bg-[#211f1c] text-zinc-100 cursor-pointer overflow-hidden p-5 shadow-[0_4px_0_0_#141311]',
        'transition-all duration-200 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]',
        'hover:shadow-[0_6px_0_0_#141311] hover:border-[#4c463b] hover:-translate-y-[2px]',
        'active:shadow-[0_1px_0_0_#141311] active:translate-y-[2px]',
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
