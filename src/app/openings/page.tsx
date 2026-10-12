'use client';

import React, { useState } from 'react';
import { OpeningExplorer } from '@/components/openings/OpeningExplorer';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function OpeningsPage() {
  const router = useRouter();
  const [boardTheme] = useState<BoardTheme>('green');
  const [pieceTheme] = useState<PieceTheme>('neo');

  return (
    <div className="flex-1 p-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 pb-3 border-b border-[#282522]">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Opening Explorer & Master Theory
        </span>
      </div>
      <div className="w-full max-w-6xl">
        <OpeningExplorer boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
