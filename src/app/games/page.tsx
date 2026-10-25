'use client';

import React from 'react';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { useShell } from '@/context/ShellContext';

export default function MasterGamesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden flex flex-col bg-[#161512] text-zinc-100 select-none">
      <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
    </div>
  );
}
