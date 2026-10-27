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
  X,
  LogIn,
  Camera,
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
    user,
    openAuthModal,
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
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && localStorage.getItem('hide_onboarding_nudge') === 'true') {
        setIsBannerDismissed(true);
      }
    } catch {}
  }, []);

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
    <div className="w-full flex-1 flex flex-col xl:justify-between p-3 sm:p-5 lg:p-6 bg-[#161512] text-zinc-100 select-none pb-32 sm:pb-36 lg:pb-36 xl:pb-6 gap-4 xl:h-full xl:max-h-full xl:overflow-hidden">
      {/* ----------------------------------------------------------------------- */}
      {/* 1. PLAYER SHOWCASE CARD (Registered vs Guest)                           */}
      {/* ----------------------------------------------------------------------- */}
      {user ? (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1c1a16] via-[#181613] to-[#141210] border border-white/10 p-3.5 sm:p-4 shadow-xl shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Left: Avatar + Identity + Level Progress */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                onClick={openAuthModal}
                className="relative w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-[#22201c] border-2 border-emerald-500/30 overflow-hidden shrink-0 shadow-md flex items-center justify-center text-2xl group cursor-pointer"
                title="Profile Glance & Avatar"
              >
                {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                ) : (
                  <span>{effectiveAvatar || '♟️'}</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                  <Camera className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                    Welcome back, {effectiveDisplayName || 'Grandmaster'}
                  </h1>
                  {effectiveCountry && (
                    <span className="text-xs shrink-0">{effectiveCountry}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs mt-0.5">
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                    Level {xpProfile?.level || 1} &bull; {xpProfile?.levelTitle || 'Novice'}
                  </span>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {xpProfile?.xpInCurrentLevel || 0} / {xpProfile?.xpNeededForNextLevel || 100} XP
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Rating Badges + External Account Sync Pill */}
            <div className="flex items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t md:border-t-0 border-white/5 shrink-0">
              {/* Rating Trio */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 text-xs font-mono">
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
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  onClick={onOpenSyncModal}
                  title="Sync External Chess Accounts"
                  className="gap-1.5 text-xs font-bold text-zinc-300 shrink-0"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isSyncingExternal ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>{isSynced ? 'Synced' : 'Sync'}</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2517] via-[#161a13] to-[#121310] border border-emerald-500/30 p-4 sm:p-5 shadow-2xl shrink-0">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Knight Emblem + Welcome Copy */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 text-2xl shrink-0 shadow-lg">
                <Swords className="w-7 h-7 text-emerald-400 animate-pulse" />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Welcome to Check.mate
                  </h1>
                  <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                    Guest Pass
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                  Play live games, challenge 20+ master bots, and analyze moves with deep engine evaluation.
                </p>
              </div>
            </div>

            {/* Right: High-Conversion Action Duo */}
            <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
              <Button
                variant="primary"
                size="sm"
                rounded="xl"
                onClick={openAuthModal}
                className="gap-2 text-xs font-black px-4 py-2 flex-1 md:flex-initial shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </Button>

              {onOpenSyncModal && (
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  onClick={onOpenSyncModal}
                  title="Sync external Chess.com or Lichess account"
                  className="gap-1.5 text-xs font-bold text-zinc-300 flex-1 md:flex-initial"
                >
                  <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sync Account</span>
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {user && !isSynced && !isBannerDismissed ? (
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-[#221c13] via-[#1a1712] to-[#14120f] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <RotateCw className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-white">Import Your Real Chess.com or Lichess Games</span>
                <span className="text-[9px] font-mono font-black bg-amber-500/20 text-amber-300 px-2 py-0.2 rounded-full uppercase shrink-0">
                  Instant
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight mt-0.5 truncate sm:whitespace-normal">
                Sync your external profile to import your current rating, match archives, and unlock deep cognitive repertoire scouting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {onOpenSyncModal && (
              <Button
                variant="warning"
                size="xs"
                rounded="xl"
                onClick={onOpenSyncModal}
                className="px-3.5 py-1.5 font-black flex-1 sm:flex-initial"
              >
                <span>Sync Handle Now</span>
              </Button>
            )}
            <button
              type="button"
              onClick={() => {
                setIsBannerDismissed(true);
                try {
                  localStorage.setItem('hide_onboarding_nudge', 'true');
                } catch {}
              }}
              className="p-1 rounded-lg text-zinc-500 hover:text-white transition cursor-pointer shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ----------------------------------------------------------------------- */}
      {/* 2. CORE DESTINATIONS (4 High-Contrast Gateway Cards)                    */}
      {/* ----------------------------------------------------------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 my-2 sm:my-3 shrink-0">
        {/* Gateway 1: Play Hub (P1 Hero Anchor) */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1b2416] via-[#161a13] to-[#121410] border border-emerald-500/30 shadow-lg flex flex-col justify-between gap-3 group hover:border-emerald-500/60 transition-all">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                <Swords className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black uppercase">
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
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#131d27] via-[#11171d] to-[#0f1317] border border-blue-500/25 hover:border-blue-500/50 flex flex-col justify-between gap-3 transition-all group shadow-md">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold uppercase">
                Infinite SRS
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Tactics &amp; Puzzles</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Daily tactical challenges and adaptive puzzle rush with Coach Danny hints.
            </p>
          </div>
          <Button
            variant="blue"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={onOpenPuzzles}
          >
            <span>Solve Daily Puzzle</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Gateway 3: Lessons Academy */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#1f1527] via-[#17111c] to-[#120e16] border border-purple-500/25 hover:border-purple-500/50 flex flex-col justify-between gap-3 transition-all group shadow-md">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold uppercase">
                Curriculum
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Lessons Academy</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Interactive GM roadmaps covering tactical motifs, openings, and endgames.
            </p>
          </div>
          <Button
            variant="purple"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={onOpenLessons}
          >
            <span>Explore Courses</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Gateway 4: Bot Sparring Lab */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-[#241517] via-[#1a1012] to-[#140d0e] border border-rose-500/25 hover:border-rose-500/50 flex flex-col justify-between gap-3 transition-all group shadow-md">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase">
                20+ Personalities
              </span>
            </div>
            <h2 className="text-sm font-black text-white mt-1">Computer Bots</h2>
            <p className="text-xs text-zinc-400 leading-snug font-sans">
              Adaptive sparring against beginner to Grandmaster-tier engine personalities.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={() => onOpenBots()}
          >
            <span>Pick Sparring Bot</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. MINIMALISTIC LOWER SECTION (Recent Activity & Cognitive Focus)       */}
      {/* ----------------------------------------------------------------------- */}
      <section className="w-full shrink-0 xl:flex-1 xl:min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 overflow-visible xl:overflow-hidden">
        {/* Left: Recent Matches & 1-Click Game Review */}
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 h-auto xl:h-full overflow-visible xl:overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <History className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                Recent Matches
              </span>
            </div>
            <button
              onClick={() => onOpenReview()}
              className="text-[11px] font-bold text-emerald-400 hover:underline cursor-pointer shrink-0 whitespace-nowrap"
            >
              Analysis Studio &rarr;
            </button>
          </div>

          <div className="flex flex-col gap-2 pr-1 xl:flex-1 xl:min-h-0 xl:overflow-y-auto">
            {recentThreeGames.length === 0 ? (
              <div className="py-6 xl:h-full flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
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
                        className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${
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
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">({opp.rating})</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono text-zinc-400 hidden sm:inline">
                        {Math.round(g.timeControl / 60)}m &bull; {g.moves.length} plies
                      </span>
                      <Button
                        variant="secondary"
                        size="xs"
                        rounded="lg"
                        onClick={() => onOpenReview(g.id)}
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
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
        <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 h-auto xl:h-full overflow-visible xl:overflow-hidden">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-black uppercase tracking-wider text-white truncate">
                Cognitive Focus &amp; Grandmaster Tools
              </span>
            </div>
            {onOpenInsights && (
              <button
                onClick={onOpenInsights}
                className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer shrink-0 whitespace-nowrap"
              >
                Cognitive Studio &rarr;
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 text-xs xl:flex-1 xl:min-h-0 xl:justify-between">
            <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Primary Training Focus
              </span>
              <p className="text-xs text-zinc-300 leading-snug">
                Maintain piece coordination into the endgame. Strengthen rook activity on the 7th rank and prevent tactical knight forks.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto pt-1">
              <button
                onClick={() => onOpenReview()}
                className="p-2.5 rounded-xl bg-[#141311] border border-white/5 hover:border-white/15 text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Microscope className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">Analysis Studio</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-all shrink-0 ml-1" />
              </button>

              <button
                onClick={() => onOpenBots()}
                className="p-2.5 rounded-xl bg-[#141311] border border-white/5 hover:border-white/15 text-left flex items-center justify-between group cursor-pointer transition-all"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate">Variants Arena</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-500 group-hover:text-white transition-all shrink-0 ml-1" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
