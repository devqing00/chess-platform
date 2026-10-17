'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'blue'
  | 'purple'
  | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const base =
    'inline-flex items-center gap-1.5 rounded-full px-3 py-0.8 text-[11px] font-black uppercase tracking-wider border-2 select-none';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-[#272521] border-[#38352f] text-zinc-300',
    success: 'bg-[#81b64c]/15 border-[#81b64c]/40 text-[#81b64c]',
    warning: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    error: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
    blue: 'bg-blue-500/15 border-blue-500/40 text-blue-300',
    purple: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
    outline: 'bg-transparent border-[#38352f] text-zinc-400',
  };

  return (
    <span className={cn(base, variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
