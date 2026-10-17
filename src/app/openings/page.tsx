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
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-7xl mx-auto h-full flex flex-col min-h-0 gap-3">
        {/* Unified Top Header */}
        <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_2px_0_0_#b45309] shrink-0">
              <Compass className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Opening &amp; Counter-Opening Masterclass
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Deep theory &bull; Recommended counter-systems &bull; Interactive continuation lines
              </p>
            </div>
          </div>

          {/* User Authentic Rating & XP HUD */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border shadow-sm ${
                isSynced && effectiveRating
                  ? syncedPlatform === 'chesscom'
                    ? 'bg-[#81b64c]/15 text-[#81b64c] border-[#81b64c]/40'
                    : 'bg-zinc-700/30 text-white border-zinc-600'
                  : 'bg-[#201e1a] text-zinc-400 border-[#35322b]'
              }`}
            >
              <span>{syncedPlatform === 'chesscom' ? '♟' : syncedPlatform === 'lichess' ? '♞' : '○'}</span>
              <span>
                {isSynced && effectiveRating
                  ? `${syncedPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'} ${effectiveRating}`
                  : 'Unranked'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#332f28] rounded-xl text-[11px] font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-mono">{profile.streak}d</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#332f28] rounded-xl text-[11px] font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span className="font-mono">{profile.totalXp} XP</span>
            </div>

            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-black border-2 shadow-[0_2px_0_0_#141311]"
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

        {/* Viewport-Locked Masterclass View */}
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
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
