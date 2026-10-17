'use client';

import React from 'react';
import { VariantsArena } from '@/components/variants/VariantsArena';
import { useShell } from '@/context/ShellContext';
import { Sparkles } from 'lucide-react';

export default function VariantsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 md:pb-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-[#1f1d1a] border-2 border-[#35322b] shadow-[0_6px_0_0_#141311]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-b from-rose-500 to-rose-600 border-2 border-rose-700 shadow-[0_3px_0_0_#881337] flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg font-black uppercase tracking-wider text-white">
              Chess Variants Arena
            </h1>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
              Fischer Random 960 &bull; King of the Hill &bull; 3-Check &bull; Crazyhouse
            </p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <VariantsArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
