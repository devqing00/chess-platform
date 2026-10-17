'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  variant?: 'green' | 'amber' | 'blue' | 'purple' | 'red';
}

export function Progress({
  className,
  value = 0,
  max = 100,
  variant = 'green',
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const variantFills: Record<string, string> = {
    green: 'bg-[#81b64c] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]',
    amber: 'bg-[#f59e0b] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]',
    blue: 'bg-[#3b82f6] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]',
    purple: 'bg-[#a855f7] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]',
    red: 'bg-[#ef4444] shadow-[inset_0_2px_0_0_rgba(255,255,255,0.35)]',
  };

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(
        'w-full h-3.5 bg-[#171513] border-2 border-[#332f28] rounded-full overflow-hidden p-0.5 shadow-inner',
        className
      )}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-300 ease-out', variantFills[variant])}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
