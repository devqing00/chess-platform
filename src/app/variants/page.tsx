'use client';

import React from 'react';
import { VariantsArena } from '@/components/variants/VariantsArena';
import { useShell } from '@/context/ShellContext';
import { Sparkles } from 'lucide-react';

export default function VariantsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-7xl mx-auto h-full flex flex-col min-h-0 gap-3">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/15 border-2 border-rose-500/40 shadow-sm flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Chess Variants Arena
              </h1>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                Fischer Random 960 &bull; King of the Hill &bull; 3-Check &bull; Crazyhouse
              </p>
            </div>
          </div>
        </div>

        <div className="w-full flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col items-center justify-start">
          <VariantsArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
        </div>
      </div>
    </div>
  );
}
