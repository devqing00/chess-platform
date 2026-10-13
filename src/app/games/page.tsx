'use client';

import React from 'react';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { useShell } from '@/context/ShellContext';
import { Trophy, History } from 'lucide-react';

export default function MasterGamesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 pb-3 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <History className="w-5 h-5 text-[#81b64c]" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Historical Master Games Archive
          </h1>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span>Immortal Classics & World Championships</span>
        </div>
      </div>

      <div className="w-full max-w-6xl">
        <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
