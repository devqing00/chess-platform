'use client';

import React, { useState } from 'react';
import { LessonArena } from '@/components/lessons/LessonArena';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap } from 'lucide-react';

export default function LessonsPage() {
  const router = useRouter();
  const [boardTheme] = useState<BoardTheme>('green');
  const [pieceTheme] = useState<PieceTheme>('neo');

  return (
    <div className="flex-1 p-4 sm:p-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto">
      <div className="w-full max-w-6xl flex items-center justify-between mb-4 pb-3 border-b border-[#282522]">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-[#81b64c]" />
          <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
            Interactive Chess Academy & Curriculum
          </span>
        </div>
      </div>
      <div className="w-full max-w-6xl">
        <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
      </div>
    </div>
  );
}
