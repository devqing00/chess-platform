'use client';

import React from 'react';
import { OpeningExplorer } from '@/components/openings/OpeningExplorer';
import { useShell } from '@/context/ShellContext';
import { Compass, BookOpen } from 'lucide-react';

export default function OpeningsPage() {
  const { boardTheme, pieceTheme, membershipTier } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-7xl flex items-center justify-between mb-3 pb-3 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <Compass className="w-5 h-5 text-[#81b64c]" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Opening Explorer & Master Database
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <BookOpen className="w-4 h-4 text-amber-400" />
          <span>ECO Encyclopedia &bull; Master Move Statistics</span>
        </div>
      </div>
      <div className="w-full max-w-7xl">
        <OpeningExplorer boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membershipTier} />
      </div>
    </div>
  );
}
