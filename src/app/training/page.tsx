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
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col gap-3 min-h-0">
        {/* Compact Minimalist Header & Global HUD Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <Target className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Cognitive Training Studio
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Real-match blunder forensics &amp; targeted muscle memory repair
              </p>
            </div>
          </div>

          {/* User Progression & Authentic Rating HUD Chips */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Official Rating */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border shadow-sm ${
                isSynced && effectiveRating
                  ? syncedPlatform === 'chesscom'
                    ? 'bg-[#81b64c]/15 text-[#81b64c] border-[#81b64c]/40'
                    : 'bg-zinc-700/30 text-white border-zinc-600'
                  : 'bg-[#201e1a] text-zinc-400 border-[#35322b]'
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
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#35322b] rounded-xl text-[11px] font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 fill-amber-400 shrink-0" />
              <span className="font-mono">{xpProfile.streak}d</span>
            </div>

            {/* XP Total */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#35322b] rounded-xl text-[11px] font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 fill-emerald-400 shrink-0" />
              <span className="font-mono">{xpProfile.totalXp} XP</span>
            </div>

            {/* League Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 shadow-[0_2px_0_0_#141311]"
              style={{
                backgroundColor: xpProfile.league.badgeBg,
                borderColor: xpProfile.league.badgeBorder,
                color: xpProfile.league.color,
              }}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>{xpProfile.league.name}</span>
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
