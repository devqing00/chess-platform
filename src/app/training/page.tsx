'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useXpSystem } from '@/hooks/useXpSystem';
import {
  Target,
  Puzzle,
  Crown,
  Compass,
  Zap,
  Flame,
  Award,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Trophy,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';

export default function TrainingLandingPage() {
  const router = useRouter();
  const { profile: xpProfile } = useXpSystem();

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-6xl flex flex-col gap-5 sm:gap-6">
        {/* Top Header & Daily Status Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-[#282522]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#58cc02]/15 border-2 border-[#58cc02]/40 flex items-center justify-center text-[#58cc02] shadow-[0_3px_0_0_#388302] shrink-0">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-white">
                Training Academy
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium">
                Master tactics, endgame theory, and opening repertoires with Duolingo-style progression
              </p>
            </div>
          </div>

          {/* User Progression HUD Chips */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#201e1a] border-2 border-[#35322b] rounded-2xl text-[11px] sm:text-xs font-black text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 shrink-0" />
              <span className="font-mono">{xpProfile.streak}d Streak</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#201e1a] border-2 border-[#35322b] rounded-2xl text-[11px] sm:text-xs font-black text-emerald-400 shadow-[0_2px_0_0_#141311]">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-emerald-400 shrink-0" />
              <span className="font-mono">{xpProfile.totalXp} XP</span>
            </div>

            <div
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl text-[11px] sm:text-xs font-black border-2 shadow-[0_2px_0_0_#141311]"
              style={{
                backgroundColor: xpProfile.league.badgeBg,
                borderColor: xpProfile.league.badgeBorder,
                color: xpProfile.league.color,
              }}
            >
              <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>{xpProfile.league.name}</span>
            </div>
          </div>
        </div>

        {/* Sophisticated Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Bento Tile 1: Hero Workout Continuation (Spans 2 columns on lg) */}
          <div className="md:col-span-2 lg:col-span-2 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1e1c19] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col justify-between gap-4 relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#58cc02] border-2 border-[#45a302] flex items-center justify-center text-white shadow-[0_2px_0_0_#2b7300] shrink-0">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#58cc02]">
                    Recommended Today
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white">
                    Continue Learning Journey
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#141311] border border-[#2c2925] text-xs font-mono font-bold text-zinc-300">
                <span>Daily Goal:</span>
                <strong className={xpProfile.dailyGoalAchieved ? 'text-emerald-400' : 'text-amber-400'}>
                  {xpProfile.dailyXp}/{xpProfile.dailyGoal} XP
                </strong>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed z-10 max-w-xl">
              Sharpen your instincts with tactical combinations, theoretical tablebases, and deep opening repertoires. Each completed milestone unlocks higher league standing and rewards bonus XP.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 z-10">
              <Link
                href="/puzzles"
                className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#58cc02] hover:bg-[#4cad02] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#2b7300] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <span>Launch Tactics Path</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Link>
              <Link
                href="/endgames"
                className="px-4 py-2.5 rounded-xl bg-[#262420] hover:bg-[#2d2a25] border-2 border-[#38342c] text-zinc-200 text-xs font-black uppercase tracking-wider shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 text-center"
              >
                <span>Tablebase Endgames</span>
                <Crown className="w-4 h-4 text-purple-400" />
              </Link>
            </div>

            {/* Subtle background graphic */}
            <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none">
              <Target className="w-72 h-72 text-white" />
            </div>
          </div>

          {/* Bento Tile 2: League & Rank Standing */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1e1c19] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-xl border-2 flex items-center justify-center shadow-[0_2px_0_0_#141311]"
                  style={{
                    backgroundColor: xpProfile.league.badgeBg,
                    borderColor: xpProfile.league.badgeBorder,
                    color: xpProfile.league.color,
                  }}
                >
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Tier Progression
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {xpProfile.league.name}
                  </h3>
                </div>
              </div>
              <span className="text-[11px] font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
                {xpProfile.leagueProgressPercent}% Tier
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium text-[11px]">Level {xpProfile.level} &bull; {xpProfile.levelTitle}</span>
                <span className="font-mono font-black text-zinc-200 text-[11px]">{xpProfile.levelProgressPercent}%</span>
              </div>
              <div className="h-2.5 w-full bg-[#141311] rounded-lg overflow-hidden p-0.5 border border-[#2c2925]">
                <div
                  className="h-full rounded-md bg-[#58cc02] transition-all duration-500"
                  style={{ width: `${xpProfile.levelProgressPercent}%` }}
                />
              </div>
              <span className="text-[10px] text-zinc-400 block">
                {xpProfile.xpNeededForNextLevel - xpProfile.xpInCurrentLevel} XP until Level {xpProfile.level + 1}
              </span>
            </div>

            <div className="pt-2.5 border-t border-[#2b2824] flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Next: {xpProfile.nextLeague ? xpProfile.nextLeague.name : 'Max Tier'}</span>
              </span>
              <span className="font-mono font-bold text-[#58cc02]">
                {xpProfile.league.maxXp === Infinity
                  ? 'Mastery Cap'
                  : `${Math.max(0, xpProfile.league.maxXp - xpProfile.totalXp + 1)} XP left`}
              </span>
            </div>
          </div>

          {/* Bento Tile 3: Tactics & Puzzles Arena */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1e1c19] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col justify-between gap-4 group hover:border-[#58cc02]/60 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#58cc02]/20 border-2 border-[#58cc02] flex items-center justify-center text-[#58cc02] shadow-[0_2px_0_0_#388302]">
                <Puzzle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2824] text-zinc-400 font-mono">
                75 Puzzles
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-white group-hover:text-[#58cc02] transition-colors">
                Tactics & Puzzles
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 leading-relaxed">
                5 rich units covering forks, pins, skewers, Greek gift sacrifices, and mating nets.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold text-zinc-300">
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Units</span>
                <span className="text-white text-xs sm:text-sm">5 Units</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Modes</span>
                <span className="text-[#58cc02] text-xs sm:text-sm">Path & Arena</span>
              </div>
            </div>

            <Link
              href="/puzzles"
              className="w-full py-2.5 rounded-xl bg-[#58cc02] hover:bg-[#4ca502] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#2b7300] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Train Tactics</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* Bento Tile 4: Endgame Mastery */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1e1c19] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col justify-between gap-4 group hover:border-[#ce82ff]/60 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#ce82ff]/20 border-2 border-[#ce82ff] flex items-center justify-center text-[#ce82ff] shadow-[0_2px_0_0_#9333ea]">
                <Crown className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2824] text-purple-300 font-mono">
                Syzygy 7-Piece
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-white group-hover:text-[#ce82ff] transition-colors">
                Endgame Mastery
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 leading-relaxed">
                30 classic endgame studies: Lucena Bridge, Philidor 3rd-Rank, Trebuchet zugzwang.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold text-zinc-300">
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Studies</span>
                <span className="text-white text-xs sm:text-sm">30 Tablebases</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Precision</span>
                <span className="text-purple-400 text-xs sm:text-sm">100% Exact</span>
              </div>
            </div>

            <Link
              href="/endgames"
              className="w-full py-2.5 rounded-xl bg-[#ce82ff] hover:bg-[#ba66f5] border-2 border-[#a855f7] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#7e22ce] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Master Endgames</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>

          {/* Bento Tile 5: Opening Repertoire Explorer */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1e1c19] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col justify-between gap-4 group hover:border-[#eab308]/60 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="w-10 h-10 rounded-xl bg-[#eab308]/20 border-2 border-[#eab308] flex items-center justify-center text-[#eab308] shadow-[0_2px_0_0_#ca8a04]">
                <Compass className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2824] text-amber-300 font-mono">
                38 Openings
              </span>
            </div>

            <div>
              <h3 className="text-base font-black text-white group-hover:text-[#eab308] transition-colors">
                Opening Repertoire
              </h3>
              <p className="text-xs text-zinc-400 font-medium mt-0.5 leading-relaxed">
                Explore deep grandmaster lines from 1.e4 and 1.d4, strategic plans, and win-rate stats.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold text-zinc-300">
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Coverage</span>
                <span className="text-white text-xs sm:text-sm">38 Openings</span>
              </div>
              <div className="p-2 rounded-lg bg-[#141311] border border-[#282622]">
                <span className="text-[10px] uppercase text-zinc-400 block font-sans">Depth</span>
                <span className="text-amber-400 text-xs sm:text-sm">Repertoire Hub</span>
              </div>
            </div>

            <Link
              href="/openings"
              className="w-full py-2.5 rounded-xl bg-[#eab308] hover:bg-[#d9a306] border-2 border-[#ca8a04] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#a16207] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Explore Repertoire</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
