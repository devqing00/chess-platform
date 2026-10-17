'use client';

import React from 'react';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { useShell } from '@/context/ShellContext';
import { Trophy, History } from 'lucide-react';

export default function MasterGamesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6 p-3.5 sm:p-4 rounded-3xl bg-[#1f1d1a] border-2 border-[#35322b] shadow-[0_6px_0_0_#141311]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#81b64c] border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] flex items-center justify-center shrink-0">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
              Historical Master Games
            </h1>
            <p className="text-xs text-zinc-400 font-medium">
              Relive immortal masterpieces, tactical brilliancies, and World Championships.
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full bg-[#262420] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] text-xs text-amber-300 font-mono font-bold">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Immortal Classics &amp; Title Matches</span>
        </div>
      </div>

      <div className="w-full max-w-6xl">
        <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
