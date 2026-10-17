'use client';

import React from 'react';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { useShell } from '@/context/ShellContext';
import { Trophy, History } from 'lucide-react';

export default function MasterGamesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col min-h-0 gap-3">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 shadow-sm flex items-center justify-center shrink-0">
              <History className="w-4 h-4 text-[#81b64c]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Historical Master Games
              </h1>
              <p className="text-[10px] sm:text-[11px] text-zinc-400 font-medium">
                Relive immortal masterpieces, tactical brilliancies, and World Championships.
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 self-start sm:self-center px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-[11px] text-amber-300 font-mono font-bold">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Immortal Classics &amp; Title Matches</span>
          </div>
        </div>

        <div className="w-full flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col items-center justify-start">
          <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
        </div>
      </div>
    </div>
  );
}
