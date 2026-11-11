'use client';

import React, { Suspense } from 'react';
import { OpeningExplorer } from '@/components/openings/OpeningExplorer';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { Compass, Flame, Zap, Award } from 'lucide-react';

function OpeningsContent() {
  const { boardTheme, pieceTheme } = useShell();
  const { effectiveRating, isSynced, syncedPlatform } = useAuth();
  const { profile } = useXpSystem();

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col min-h-0 gap-3">
        {/* Unified Top Header */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                Opening &amp; Counter-Opening Masterclass
              </h1>
              <p className="text-[10px] sm:text-xs text-zinc-400 font-medium">
                Deep theory &bull; Recommended counter-systems &bull; Interactive continuation lines
              </p>
            </div>
          </div>

          {/* User Authentic Rating & XP HUD */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                isSynced && effectiveRating
                  ? syncedPlatform === 'chesscom'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-700/30 text-white border-zinc-600'
                  : 'bg-[#1c1a17] text-zinc-400 border-white/10'
              }`}
            >
              <span>{syncedPlatform === 'chesscom' ? '♟' : syncedPlatform === 'lichess' ? '♞' : '○'}</span>
              <span>
                {isSynced && effectiveRating
                  ? `${syncedPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} ${effectiveRating}`
                  : 'Unranked'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-amber-400">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-mono">{profile.streak}d</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1c1a17] border border-white/10 rounded-lg text-[11px] font-bold text-emerald-400">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span className="font-mono">{profile.totalXp} XP</span>
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border"
              style={{
                backgroundColor: profile.league.badgeBg,
                borderColor: profile.league.badgeBorder,
                color: profile.league.color,
              }}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{profile.league.name.replace(' League', '')}</span>
            </div>
          </div>
        </div>

        {/* Masterclass View */}
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-visible xl:overflow-hidden">
          <OpeningExplorer boardTheme={boardTheme} pieceTheme={pieceTheme} />
        </div>
      </div>
    </div>
  );
}

export default function OpeningsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center bg-[#161512] text-zinc-400 text-xs font-mono">
          Loading Counter-Opening Masterclass...
        </div>
      }
    >
      <OpeningsContent />
    </Suspense>
  );
}
