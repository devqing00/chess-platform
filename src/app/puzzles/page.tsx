'use client';

import React from 'react';
import { PuzzleArena } from '@/components/puzzles/PuzzleArena';
import { useShell } from '@/context/ShellContext';
import { Puzzle, Flame } from 'lucide-react';

export default function PuzzlesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex items-center justify-between mb-2 pb-2.5 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <Puzzle className="w-5 h-5 text-[#81b64c]" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Tactical Puzzles & Puzzle Rush
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Glicko-2 Rated &bull; Daily Tactics &bull; 3-Minute Rush</span>
        </div>
      </div>
      <div className="w-full max-w-6xl flex-1 flex items-center justify-center">
        <PuzzleArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
