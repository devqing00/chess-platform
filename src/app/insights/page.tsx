'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InsightsDashboard } from '@/components/insights/InsightsDashboard';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function InsightsPage() {
  const router = useRouter();
  const [boardTheme] = useState<BoardTheme>('green');
  const [pieceTheme] = useState<PieceTheme>('neo');

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto">
      {/* Top Header & Breadcrumb */}
      <div className="w-full max-w-7xl flex items-center justify-between mb-4 pb-3 border-b border-[#282522]">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
            Diamond Insights & Weakness Heatmap Engine
          </span>
        </div>
      </div>

      {/* Main Dashboard */}
      <InsightsDashboard boardTheme={boardTheme} pieceTheme={pieceTheme} />
    </div>
  );
}
