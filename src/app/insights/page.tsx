'use client';

import React from 'react';
import { InsightsDashboard } from '@/components/insights/InsightsDashboard';
import { useShell } from '@/context/ShellContext';
import { Flame, Sparkles } from 'lucide-react';

export default function InsightsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 pb-24 md:pb-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-400 shrink-0" />
          <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
            Player Insights &amp; Weakness Heatmap
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="truncate sm:whitespace-normal">Interactive 64-Square Blunder Heatmap &bull; Weakness Repair</span>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <InsightsDashboard boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
