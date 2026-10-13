'use client';

import React from 'react';
import { VariantsArena } from '@/components/variants/VariantsArena';
import { useShell } from '@/context/ShellContext';
import { Sparkles, Dices } from 'lucide-react';

export default function VariantsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-7xl flex items-center justify-between mb-3 pb-3 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-rose-400" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Chess Variants Arena
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Dices className="w-4 h-4 text-cyan-400" />
          <span>Fischer Random 960 &bull; King of the Hill &bull; 3-Check &bull; Crazyhouse</span>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <VariantsArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
