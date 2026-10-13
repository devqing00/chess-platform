'use client';

import React from 'react';
import { LessonArena } from '@/components/lessons/LessonArena';
import { useShell } from '@/context/ShellContext';
import { GraduationCap, Award } from 'lucide-react';

export default function LessonsPage() {
  const { boardTheme, pieceTheme, membershipTier } = useShell();

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex items-center justify-between mb-2 pb-2.5 border-b border-[#282522]">
        <div className="flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-[#81b64c]" />
          <h1 className="text-base font-black uppercase tracking-wider text-white">
            Interactive Chess Academy & Curriculum
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Award className="w-4 h-4 text-emerald-400" />
          <span>Interactive Coach Explanations &bull; Guided Solving</span>
        </div>
      </div>
      <div className="w-full max-w-6xl flex-1 flex items-center justify-center">
        <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membershipTier} />
      </div>
    </div>
  );
}
