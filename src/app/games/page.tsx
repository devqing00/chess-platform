'use client';

import React from 'react';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { useShell } from '@/context/ShellContext';

export default function MasterGamesPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="w-full h-full max-h-full overflow-hidden flex flex-col bg-[#161512] text-zinc-100 select-none">
      <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
    </div>
  );
}
