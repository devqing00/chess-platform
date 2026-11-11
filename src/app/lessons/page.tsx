'use client';

import React, { Suspense } from 'react';
import { LessonArena } from '@/components/lessons/LessonArena';
import { useShell } from '@/context/ShellContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { useAuth } from '@/context/AuthContext';
import { GraduationCap, Flame, Zap, Award } from 'lucide-react';

function LessonsContent() {
  const { boardTheme, pieceTheme, membershipTier } = useShell();
  const { profile: xpProfile } = useXpSystem();
  const { effectiveRating, isSynced, syncedPlatform } = useAuth();

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden p-2.5 sm:p-4 lg:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0 gap-2.5">
        {/* Top Header & Progression HUD Bar */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate [text-wrap:balance]">
                Interactive Chess Academy
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-medium [text-wrap:pretty]">
                Structured grandmaster curriculum from fundamentals to master level
              </p>
            </div>
          </div>

          {/* User Progression HUD Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap self-end sm:self-auto">
            {/* Daily Streak */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
              <span className="font-mono tabular-nums" suppressHydrationWarning>
                {xpProfile.streak}d
              </span>
            </div>

            {/* Total XP */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
              <span className="font-mono tabular-nums" suppressHydrationWarning>
                {xpProfile.totalXp} XP
              </span>
            </div>

            {/* League Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
              style={{
                backgroundColor: xpProfile.league.badgeBg,
                borderColor: xpProfile.league.badgeBorder,
                color: xpProfile.league.color,
              }}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span suppressHydrationWarning>{xpProfile.league.name}</span>
            </div>
          </div>
        </header>

        {/* Viewport Locked Content Area */}
        <div className="flex-1 w-full min-h-0 flex flex-col">
          <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membershipTier} />
        </div>
      </div>
    </div>
  );
}

export default function LessonsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#161512] text-zinc-400 text-xs font-mono">
          Loading Lessons Academy...
        </div>
      }
    >
      <LessonsContent />
    </Suspense>
  );
}
