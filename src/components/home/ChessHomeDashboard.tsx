'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Swords,
  Bot,
  Zap,
  Flame,
  Clock,
  Trophy,
  ExternalLink,
  ChevronRight,
  Shield,
  Sparkles,
  ArrowRight,
  History,
  RotateCw,
  BookOpen,
  Microscope,
  Target,
  Award,
} from 'lucide-react';
import { GameSessionStore, getSessionUserOutcome, isSessionUserWhite } from '@/lib/gameSessionStore';
import { syncExternalAccountGames } from '@/lib/syncService';
import { GameSession } from '@/types/chess';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { Button } from '@/components/ui/button';

interface ChessHomeDashboardProps {
  onStartGame: (timeControl: number) => void;
  onOpenBots: (botId?: string) => void;
  onOpenLessons: () => void;
  onOpenPuzzles: () => void;
  onOpenReview: (gameId?: string) => void;
  onOpenInsights?: () => void;
  onOpenSyncModal?: () => void;
}

export const ChessHomeDashboard: React.FC<ChessHomeDashboardProps> = ({
  onStartGame,
  onOpenBots,
  onOpenLessons,
  onOpenPuzzles,
  onOpenReview,
  onOpenInsights,
  onOpenSyncModal,
}) => {
  const {
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    syncedChessCom,
    syncedLichess,
    isSynced,
  } = useAuth();
  const { profile: xpProfile } = useXpSystem();

  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [isSyncingExternal, setIsSyncingExternal] = useState(false);

  const handleRefreshExternalGames = useCallback(async (force = true) => {
    setIsSyncingExternal(true);

    let ccUser = syncedChessCom?.username;
    let liUser = syncedLichess?.username;

    if (!ccUser && typeof window !== 'undefined') {
      try {
        const storedCC = localStorage.getItem('chess_com_profile');
        if (storedCC) ccUser = JSON.parse(storedCC)?.username;
      } catch {}
    }
    if (!liUser && typeof window !== 'undefined') {
      try {
        const storedLI = localStorage.getItem('lichess_profile');
        if (storedLI) liUser = JSON.parse(storedLI)?.username;
      } catch {}
    }

    if (ccUser) {
      await syncExternalAccountGames('chesscom', ccUser, force);
    }
    if (liUser) {
      await syncExternalAccountGames('lichess', liUser, force);
    }

    setRecentSessions(GameSessionStore.listRecentSessions());
    setIsSyncingExternal(false);
  }, [syncedChessCom?.username, syncedLichess?.username]);

  useEffect(() => {
    setRecentSessions(GameSessionStore.listRecentSessions());
    handleRefreshExternalGames(false);
  }, [handleRefreshExternalGames]);

  const recentThreeGames = useMemo(() => {
    return recentSessions.slice(0, 3);
  }, [recentSessions]);

  return (
    <div className="w-full min-h-full lg:h-full lg:max-h-full overflow-y-auto lg:overflow-hidden flex flex-col justify-between p-3 sm:p-5 lg:p-6 bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6 gap-4">
      {/* ----------------------------------------------------------------------- */}
      {/* 1. TOP HEADER & IDENTITY STRIP                                          */}
      {/* ----------------------------------------------------------------------- */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#1c1a17] border border-white/10 flex items-center justify-center text-xl shrink-0 shadow-sm">
            {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={effectiveAvatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
            ) : (
              <span>{effectiveAvatar || '♟️'}</span>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                Welcome back, {effectiveDisplayName || 'Grandmaster'}
              </h1>
              {effectiveCountry && (
                <span className="text-xs">{effectiveCountry}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-mono text-[#81b64c] font-black">
                Level {xpProfile?.level || 1} &bull; {xpProfile?.levelTitle || 'Novice'}
              </span>
              <span>&bull;</span>
              <span className="font-mono text-zinc-300">
                {effectiveRating || 1200} Rapid
              </span>
            </div>
          </div>
        </div>

        {/* Rating Quad & Sync Badge */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#1c1a17] border border-white/5 text-xs font-mono">
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-zinc-500">Rapid</span>
              <span className="font-black text-white">{syncedChessCom?.ratings?.rapid || effectiveRating || 1200}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-zinc-500">Blitz</span>
              <span className="font-black text-amber-400">{syncedChessCom?.ratings?.blitz || (effectiveRating ? effectiveRating - 50 : 1150)}</span>
            </div>
            <span className="text-zinc-700">|</span>
            <div className="flex flex-col items-center">
              <span className="text-[9px] uppercase font-bold text-zinc-500">Bullet</span>
              <span className="font-black text-cyan-400">{syncedChessCom?.ratings?.bullet || (effectiveRating ? effectiveRating - 100 : 1100)}</span>
            </div>
          </div>

          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer"
              title="Sync External Chess Accounts"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isSyncingExternal ? 'animate-spin text-[#81b64c]' : ''}`} />
              <span className="hidden sm:inline">{isSynced ? 'Synced' : 'Sync Chess.com'}</span>
            </button>
          )}
        </div>
      </header>

      {/* ----------------------------------------------------------------------- */}
      {/* 2. CORE DESTINATIONS (4 High-Contrast Gateway Cards)                    */}
      {/* ----------------------------------------------------------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-2 sm:my-3 shrink-0">
        {/* Gateway 1: Play Hub (P1 Hero Anchor) */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1f231b] to-[#181916] border border-[#81b64c]/30 shadow-lg flex flex-col justify-between gap-3 group hover:border-[#81b64c]/60 transition-all">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-[#81b64c]/20 border border-[#81b64c]/40 flex items-center justify-center text-[#81b64c]">
                <Swords className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#81b64c]/20 text-[#81b64c] font-black uppercase">
                Live &amp; Bots
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Play Arena</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Live matchmaking, custom friend challenge links, and 20+ computer bots.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={() => onStartGame(600)}
          >
            <span>Enter Play Arena</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Gateway 2: Tactics & Puzzles */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 hover:border-white/15 flex flex-col justify-between gap-3 transition-all group">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-bold uppercase">
                Infinite SRS
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Tactics &amp; Puzzles</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Daily tactical challenges and adaptive puzzle rush with Coach Danny hints.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={onOpenPuzzles}
          >
            <span>Solve Daily Puzzle</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </div>

        {/* Gateway 3: Lessons Academy */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 hover:border-white/15 flex flex-col justify-between gap-3 transition-all group">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 font-bold uppercase">
                Curriculum
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Lessons Academy</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Interactive GM roadmaps covering tactical motifs, openings, and endgames.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={onOpenLessons}
          >
            <span>Explore Courses</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </div>

        {/* Gateway 4: Bot Sparring Lab */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 hover:border-white/15 flex flex-col justify-between gap-3 transition-all group">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 font-bold uppercase">
                20+ Personalities
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Computer Bots</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Adaptive sparring against beginner to Grandmaster-tier engine personalities.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={() => onOpenBots()}
          >
            <span>Pick Sparring Bot</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. MINIMALISTIC LOWER SECTION (Recent Activity & Cognitive Focus)       */}
      {/* ----------------------------------------------------------------------- */}
      <section className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 overflow-visible lg:overflow-hidden">
        {/* Left: Recent Matches & 1-Click Game Review */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0 overflow-visible lg:overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#81b64c]" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Recent Matches &bull; Game Review
              </span>
            </div>
            <button
              onClick={() => onOpenReview()}
              className="text-[11px] font-bold text-[#81b64c] hover:underline cursor-pointer"
            >
              Analysis Studio &rarr;
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 pr-1">
            {recentThreeGames.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
                <span>No recent games yet. Play your first match in the Play Arena!</span>
              </div>
            ) : (
              recentThreeGames.map((g) => {
                const outcome = getSessionUserOutcome(g, effectiveDisplayName);
                const isUserWhite = isSessionUserWhite(g, effectiveDisplayName);
                const opp = isUserWhite ? g.blackPlayer : g.whitePlayer;

                return (
                  <div
                    key={g.id}
                    className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase font-mono ${
                          outcome === 'win'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : outcome === 'loss'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-zinc-700/40 text-zinc-300'
                        }`}
                      >
                        {outcome}
                      </span>
                      <span className="font-bold text-white truncate">vs {opp.name}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({opp.rating})</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400">
                        {Math.round(g.timeControl / 60)}m &bull; {g.moves.length} plies
                      </span>
                      <Button
                        variant="secondary"
                        size="xs"
                        rounded="lg"
                        onClick={() => onOpenReview(g.id)}
                      >
                        <Sparkles className="w-3 h-3 text-[#81b64c]" />
                        <span>Review</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Cognitive Focus & Quick Tools */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0 overflow-visible lg:overflow-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Cognitive Focus &amp; Grandmaster Tools
              </span>
            </div>
            {onOpenInsights && (
              <button
                onClick={onOpenInsights}
                className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer"
              >
                Cognitive Studio &rarr;
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 text-xs">
            <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Primary Training Focus
              </span>
              <p className="text-xs text-zinc-300 leading-snug">
                Maintain piece coordination into the endgame. Strengthen rook activity on the 7th rank and prevent tactical knight forks.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onOpenReview()}
                className="p-2.5 rounded-xl bg-[#141311] border border-white/5 hover:border-white/15 text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <Microscope className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span className="text-xs font-bold text-white">Analysis Studio</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-all" />
              </button>

              <button
                onClick={() => onOpenBots()}
                className="p-2.5 rounded-xl bg-[#141311] border border-white/5 hover:border-white/15 text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs font-bold text-white">Variants Arena</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-all" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
