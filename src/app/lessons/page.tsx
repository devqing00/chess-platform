'use client';

import React from 'react';
import { LessonArena } from '@/components/lessons/LessonArena';
import { useShell } from '@/context/ShellContext';
import { GraduationCap, Award } from 'lucide-react';

export default function LessonsPage() {
  const { boardTheme, pieceTheme, membershipTier } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 pb-24 md:pb-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b-2 border-[#282522]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
            <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h1 className="text-sm sm:text-lg font-black uppercase tracking-wider text-white truncate">
            Interactive Chess Academy &amp; Curriculum
          </h1>
        </div>
      </div>
      <div className="w-full max-w-6xl flex-1 flex flex-col items-center justify-start">
        <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membershipTier} />
      </div>
    </div>
  );
}
