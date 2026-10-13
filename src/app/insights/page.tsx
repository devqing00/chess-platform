'use client';

import React from 'react';
import { InsightsDashboard } from '@/components/insights/InsightsDashboard';
import { useShell } from '@/context/ShellContext';
import { Flame, Sparkles } from 'lucide-react';

export default function InsightsPage() {
  const { boardTheme, pieceTheme } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-7xl flex items-center justify-between mb-3 pb-3 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <Flame className="w-5 h-5 text-amber-400" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Diamond Insights & Weakness Heatmap
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Interactive 64-Square Blunder Heatmap &bull; Time vs Accuracy Analysis</span>
        </div>
      </div>

      <div className="w-full max-w-7xl">
        <InsightsDashboard boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
