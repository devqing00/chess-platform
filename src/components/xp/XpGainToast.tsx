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
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1e1c19] border-2 border-[#58cc02] rounded-2xl shadow-[0_6px_0_0_#388302] text-white">
        <div className="w-8 h-8 rounded-xl bg-[#58cc02] flex items-center justify-center text-white shrink-0 shadow-[0_2px_0_0_#388302]">
          <Zap className="w-5 h-5 fill-white stroke-[2.5]" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-black text-[#58cc02] font-mono leading-none">
              +{gain.amount} XP
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
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
