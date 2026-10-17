'use client';

import React, { useState } from 'react';
import { EndgameArena } from '@/components/endgames/EndgameArena';
import { DuolingoPathView } from '@/components/learning/DuolingoPathView';
import { useShell } from '@/context/ShellContext';
import { LearningPathNode } from '@/lib/learningPathData';
import { Crown, Compass, Route, Flame, Zap, Award, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useXpSystem } from '@/hooks/useXpSystem';

export default function EndgamesPage() {
  const { boardTheme, pieceTheme } = useShell();
  const [viewMode, setViewMode] = useState<'path' | 'arena'>('path');
  const [activeStudyId, setActiveStudyId] = useState<string | undefined>(undefined);
  const { profile } = useXpSystem();

  const handleSelectNode = (node: LearningPathNode) => {
    setActiveStudyId(node.targetId);
    setViewMode('arena');
  };

  return (
    <div className="flex-1 p-3 sm:p-5 pb-24 md:pb-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      {/* Unified Top Header */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 sm:mb-6 pb-3 border-b-2 border-[#282522]">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/training"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#201e1a] hover:bg-[#2c2925] border-2 border-[#332f28] flex items-center justify-center text-zinc-400 hover:text-white transition-all shadow-[0_2px_0_0_#141311] active:translate-y-[1px] shrink-0"
            title="Back to Training Hub"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#ce82ff]/15 border-2 border-[#ce82ff]/40 flex items-center justify-center text-[#ce82ff] shadow-[0_2px_0_0_#8b5cf6] shrink-0">
            <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ce82ff]">
                Endgame Precision Track
              </span>
            </div>
            <h1 className="text-sm sm:text-lg font-black uppercase tracking-wider text-white">
              Endgame Mastery &amp; Path
            </h1>
          </div>
        </div>

        {/* Right Section: Stats & View Mode Switcher */}
        <div className="flex items-center gap-2 sm:gap-2.5 justify-between sm:justify-end w-full sm:w-auto">
          {/* Live User XP & Streak Stats */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#332f28] rounded-xl text-[11px] sm:text-xs font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span className="font-mono">{profile.streak}d</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-[#201e1a] border-2 border-[#332f28] rounded-xl text-[11px] sm:text-xs font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 fill-emerald-400" />
              <span className="font-mono">{profile.totalXp} XP</span>
            </div>

            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-black border-2 shadow-[0_2px_0_0_#141311]"
              style={{
                backgroundColor: profile.league.badgeBg,
                borderColor: profile.league.badgeBorder,
                color: profile.league.color,
              }}
              title={profile.league.name}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{profile.league.name.replace(' League', '')}</span>
            </div>
          </div>

          {/* View Mode Toggle - Snug, balanced p-1.5 padding without bottom void */}
          <div className="flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 bg-[#201e1a] border-2 border-[#332f28] rounded-xl sm:rounded-2xl shadow-[0_2px_0_0_#141311]">
            <button
              onClick={() => setViewMode('path')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'path'
                  ? 'bg-[#81b64c] text-white shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Route className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Path</span>
            </button>
            <button
              onClick={() => setViewMode('arena')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'arena'
                  ? 'bg-[#81b64c] text-white shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Arena</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main View: Path or Arena */}
      <div className="w-full max-w-6xl flex-1 flex flex-col items-center justify-start">
        {viewMode === 'path' ? (
          <DuolingoPathView
            category="endgames"
            onSelectNode={handleSelectNode}
            onOpenFreeArena={() => setViewMode('arena')}
            freeArenaLabel="Free Endgame Arena"
          />
        ) : (
          <EndgameArena
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            initialStudyId={activeStudyId}
            onComplete={() => {
              // optional callback
            }}
          />
        )}
      </div>
    </div>
  );
}
