'use client';

import React, { Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { PersonalizedAdaptiveHub } from '@/components/training/PersonalizedAdaptiveHub';
import {
  Target,
  Flame,
  Zap,
  Award,
} from 'lucide-react';

function TrainingContent() {
  const { profile: xpProfile } = useXpSystem();
  const { effectiveRating, isSynced, syncedPlatform } = useAuth();

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col gap-3 min-h-0">
        {/* Compact Minimalist Header & Global HUD Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
              <Target className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Cognitive Training Studio
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                Real-match blunder forensics &amp; targeted muscle memory repair
              </p>
            </div>
          </div>

          {/* User Progression & Authentic Rating HUD Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Official Rating */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                isSynced && effectiveRating
                  ? syncedPlatform === 'chesscom'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-700/30 text-white border-zinc-600'
                  : 'bg-[#1c1a17] text-zinc-400 border-white/10'
              }`}
              title={isSynced ? 'Official Synced Platform Rating' : 'Connect account to sync official rating'}
            >
              <span>{syncedPlatform === 'chesscom' ? '♟' : syncedPlatform === 'lichess' ? '♞' : '○'}</span>
              <span>
                {isSynced && effectiveRating
                  ? `${syncedPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} ${effectiveRating}`
                  : 'Unranked'}
              </span>
            </div>

            {/* Daily Streak */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
              <span className="font-mono" suppressHydrationWarning>{xpProfile.streak}d</span>
            </div>

            {/* XP Total */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
              <span className="font-mono" suppressHydrationWarning>{xpProfile.totalXp} XP</span>
            </div>

            {/* League Badge */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
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
        </div>

        {/* VIEW CONTAINER - Clean, non-replicated, 100% viewport locked */}
        <div className="flex-1 w-full min-h-0 flex flex-col">
          <PersonalizedAdaptiveHub />
        </div>
      </div>
    </div>
  );
}

export default function TrainingLandingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#161512] text-zinc-400 text-xs font-mono">
          Loading Training Studio...
        </div>
      }
    >
      <TrainingContent />
    </Suspense>
  );
}
