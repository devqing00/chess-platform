'use client';

import React from 'react';
import { LessonArena } from '@/components/lessons/LessonArena';
import { useShell } from '@/context/ShellContext';
import { GraduationCap, Award } from 'lucide-react';

export default function LessonsPage() {
  const { boardTheme, pieceTheme, membershipTier } = useShell();

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col min-h-0 gap-3">
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white truncate">
              Interactive Chess Academy &amp; Curriculum
            </h1>
          </div>
        </div>
        <div className="w-full flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col items-center justify-start">
          <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membershipTier} />
        </div>
      </div>
    </div>
  );
}
