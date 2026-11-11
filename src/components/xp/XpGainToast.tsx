'use client';

import React from 'react';
import { Zap, Flame, Award, Sparkles } from 'lucide-react';

interface XpGainToastProps {
  gain: { amount: number; reason: string } | null;
}

export const XpGainToast: React.FC<XpGainToastProps> = ({ gain }) => {
  if (!gain) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 pointer-events-none select-none animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1c1a17] border border-emerald-500/40 rounded-xl shadow-2xl text-white">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 fill-emerald-400 stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-emerald-400 font-mono leading-none">
              +{gain.amount} XP
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Earned!
            </span>
          </div>
          <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">
            {gain.reason}
          </span>
        </div>
      </div>
    </div>
  );
};
