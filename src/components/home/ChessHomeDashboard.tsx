'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Swords,
  Bot,
  Zap,
  Flame,
  Clock,
  Trophy,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  History,
  CheckCircle2,
  XCircle,
  Sliders,
  Globe,
  Share2,
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';
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

export interface DetailedTimeControl {
  sec: number;
  inc: number;
  label: string;
  sub: string;
  category: 'Bullet' | 'Blitz' | 'Rapid' | 'Classical';
  popular?: boolean;
}

export const ALL_TIME_CONTROLS: DetailedTimeControl[] = [
  // Bullet
  { sec: 60, inc: 0, label: '1 min', sub: 'Bullet', category: 'Bullet', popular: true },
  { sec: 60, inc: 1, label: '1 | 1', sub: 'Bullet', category: 'Bullet' },
  { sec: 120, inc: 1, label: '2 | 1', sub: 'Bullet', category: 'Bullet' },
  // Blitz
  { sec: 180, inc: 0, label: '3 min', sub: 'Blitz', category: 'Blitz', popular: true },
  { sec: 180, inc: 2, label: '3 | 2', sub: 'Blitz', category: 'Blitz' },
  { sec: 300, inc: 0, label: '5 min', sub: 'Blitz', category: 'Blitz', popular: true },
  { sec: 300, inc: 5, label: '5 | 5', sub: 'Blitz', category: 'Blitz' },
  // Rapid
  { sec: 600, inc: 0, label: '10 min', sub: 'Rapid', category: 'Rapid', popular: true },
  { sec: 900, inc: 10, label: '15 | 10', sub: 'Rapid', category: 'Rapid' },
  { sec: 1800, inc: 0, label: '30 min', sub: 'Rapid', category: 'Rapid' },
  // Classical
  { sec: 1800, inc: 20, label: '30 | 20', sub: 'Classical', category: 'Classical' },
  { sec: 3600, inc: 0, label: '60 min', sub: 'Classical', category: 'Classical' },
];

export const POPULAR_TIME_CONTROLS = ALL_TIME_CONTROLS.filter((tc) => tc.popular);

type HomeScreen = 'play' | 'clocks' | 'reviews' | 'leagues';

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

  // Active Screen within Homepage ("Screens, Not Pages" architecture)
  const [activeScreen, setActiveScreen] = useState<HomeScreen>('play');

  // Match setup state
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600); // 10m Rapid default
  const [selectedIncrement, setSelectedIncrement] = useState<number>(0);
  const [activeMode, setActiveMode] = useState<'online' | 'bots' | 'puzzles'>('online');

  // Custom clock builder state
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncSeconds, setCustomIncSeconds] = useState<number>(0);

  // Recent match sessions
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [activeReviewSource, setActiveReviewSource] = useState<'all' | 'checkmate' | 'chesscom' | 'lichess'>('all');
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
    // Auto sync on mount
    handleRefreshExternalGames(true);
  }, [handleRefreshExternalGames]);

  // Compute selected clock object
  const selectedTcObj = useMemo(() => {
    const found = ALL_TIME_CONTROLS.find(
      (tc) => tc.sec === selectedTimeControl && tc.inc === selectedIncrement
    );
    if (found) return found;
    return {
      sec: selectedTimeControl,
      inc: selectedIncrement,
      label: `${Math.round(selectedTimeControl / 60)}${selectedIncrement > 0 ? ` | ${selectedIncrement}` : ' min'}`,
      sub: selectedTimeControl < 180 ? 'Bullet' : selectedTimeControl < 600 ? 'Blitz' : selectedTimeControl < 3600 ? 'Rapid' : 'Classical',
      category: (selectedTimeControl < 180 ? 'Bullet' : selectedTimeControl < 600 ? 'Blitz' : selectedTimeControl < 3600 ? 'Rapid' : 'Classical') as DetailedTimeControl['category'],
    };
  }, [selectedTimeControl, selectedIncrement]);

  // Mini board preview for daily tactical puzzle
  const puzzleMiniBoard = useMemo(
    () => new Chess('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5'),
    []
  );

  const handleLaunchPrimary = () => {
    if (activeMode === 'online') {
      onStartGame(selectedTimeControl);
    } else if (activeMode === 'bots') {
      onOpenBots();
    } else {
      onOpenPuzzles();
    }
  };

  const handleApplyCustomClock = () => {
    const totalSec = Math.max(60, customMinutes * 60);
    setSelectedTimeControl(totalSec);
    setSelectedIncrement(customIncSeconds);
    setActiveScreen('play');
  };

  const handleSelectPresetClock = (tc: DetailedTimeControl) => {
    setSelectedTimeControl(tc.sec);
    setSelectedIncrement(tc.inc);
    setActiveScreen('play');
  };

  // Filter games by platform source
  const filteredReviewSessions = useMemo(() => {
    if (activeReviewSource === 'checkmate') {
      return recentSessions.filter(
        (s) =>
          s.source !== 'chesscom' &&
          s.source !== 'lichess' &&
          !s.id.startsWith('chesscom-') &&
          !s.id.startsWith('lichess-')
      );
    }
    if (activeReviewSource === 'chesscom') {
      return recentSessions.filter((s) => s.source === 'chesscom' || s.id.startsWith('chesscom-'));
    }
    if (activeReviewSource === 'lichess') {
      return recentSessions.filter((s) => s.source === 'lichess' || s.id.startsWith('lichess-'));
    }
    return recentSessions;
  }, [recentSessions, activeReviewSource]);

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-2.5 sm:p-4 lg:p-6 flex flex-col justify-between select-none text-zinc-100 bg-[#161512]">
      {/* 1. TOP AMBIENT STRIP (P3 Context & Player Identity) */}
      <header className="flex items-center justify-between gap-2 px-1 pb-2 shrink-0 border-b border-white/5">
        {/* Left: Player Identity Minimalist Chip */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#211f1c] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden text-sm">
            {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={effectiveAvatar} alt={effectiveDisplayName} className="w-full h-full object-cover" />
            ) : (
              <span>♟️</span>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate max-w-[130px] sm:max-w-[200px]">
                {effectiveDisplayName}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {effectiveCountry === 'ng' ? '🇳🇬' : '🌐'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="font-mono">
                {effectiveRating !== null ? (
                  <span className="text-zinc-200 font-semibold">{effectiveRating} Elo</span>
                ) : (
                  <span className="text-zinc-500">Unranked</span>
                )}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400 font-mono" suppressHydrationWarning>
                Level {xpProfile.level}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick Badges & Profile Sync Trigger */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* League Quick Chip */}
          <Button
            variant="secondary"
            size="xs"
            rounded="lg"
            onClick={() => setActiveScreen('leagues')}
            className="hidden sm:inline-flex"
            title="Inspect League Standings"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span suppressHydrationWarning>{xpProfile.league.name}</span>
            <span className="text-zinc-500 font-mono" suppressHydrationWarning>
              #{xpProfile.leagueRank}
            </span>
          </Button>

          {/* Daily Streak Chip */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[11px] font-medium text-zinc-300">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="font-mono text-white" suppressHydrationWarning>
              {xpProfile.streak}d
            </span>
          </div>

          {/* Connect / Sync Modal Trigger */}
          {onOpenSyncModal && (
            <Button
              variant="secondary"
              size="xs"
              rounded="lg"
              onClick={onOpenSyncModal}
              title="Connect Chess.com or Lichess Account"
            >
              <RotateCw className="w-3 h-3 text-[#81b64c]" />
              <span className="hidden md:inline">{isSynced ? 'Synced' : 'Sync Profile'}</span>
            </Button>
          )}
        </div>
      </header>

      {/* 2. SUB-SCREEN NAVIGATION BAR (Screens, Not Pages Architecture) */}
      <nav className="my-2.5 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveScreen('play')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'play'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Play Arena</span>
          </button>

          <button
            onClick={() => setActiveScreen('clocks')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'clocks'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Clocks &amp; Timers</span>
          </button>

          <button
            onClick={() => setActiveScreen('reviews')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'reviews'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Review Hub</span>
          </button>

          <button
            onClick={() => setActiveScreen('leagues')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'leagues'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leagues</span>
          </button>
        </div>

        {/* Active Clock Quick Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-xs font-mono text-zinc-300">
          <Clock className="w-3 h-3 text-[#81b64c]" />
          <span>Active: {selectedTcObj.label} ({selectedTcObj.category})</span>
        </div>
      </nav>

      {/* 3. CENTRAL STAGE (Render Active Screen without Window Scroll) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden flex flex-col justify-center">
        {/* ========================================================================= */}
        {/* SCREEN 1: PLAY ARENA (P1 Matchmaking Launch Stage) */}
        {/* ========================================================================= */}
        {activeScreen === 'play' && (
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center my-auto min-h-0 py-1">
            {/* Left Column (7 Cols): Match Configuration & ONE P1 Action Anchor */}
            <div className="lg:col-span-7 flex flex-col justify-center gap-3.5 max-w-md w-full mx-auto lg:mx-0">
              {/* Mode Segmented Switcher */}
              <div className="flex items-center gap-1 p-1 bg-[#1c1a17] rounded-xl border border-white/5 w-fit">
                <button
                  onClick={() => setActiveMode('online')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeMode === 'online'
                      ? 'bg-white/10 text-white shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Swords className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Live 1v1</span>
                </button>
                <button
                  onClick={() => setActiveMode('bots')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeMode === 'bots'
                      ? 'bg-white/10 text-white shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Play Bot</span>
                </button>
                <button
                  onClick={() => setActiveMode('puzzles')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeMode === 'puzzles'
                      ? 'bg-white/10 text-white shadow-xs font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tactics</span>
                </button>
              </div>

              {/* Time Control Quick Row (If Online Mode) */}
              {activeMode === 'online' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Clock Tempo:
                    </span>
                    <button
                      onClick={() => setActiveScreen('clocks')}
                      className="text-[11px] font-semibold text-[#81b64c] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Custom &amp; All 12+ Timers</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {POPULAR_TIME_CONTROLS.map((tc) => {
                      const isSelected = selectedTimeControl === tc.sec && selectedIncrement === tc.inc;
                      return (
                        <button
                          key={`${tc.sec}-${tc.inc}`}
                          onClick={() => {
                            setSelectedTimeControl(tc.sec);
                            setSelectedIncrement(tc.inc);
                          }}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/10 border-[#81b64c] text-white shadow-xs'
                              : 'bg-[#1c1a17] border-white/5 text-zinc-400 hover:border-white/10 hover:text-zinc-200'
                          }`}
                        >
                          <span className="text-xs font-bold font-mono">{tc.label}</span>
                          <span className="text-[9px] text-zinc-500 uppercase">{tc.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* P1 PRIMARY ACTION ANCHOR - EXACTLY ONE PER SCREEN */}
              <div className="pt-1">
                <Button
                  variant="primary"
                  size="xl"
                  rounded="2xl"
                  fullWidth
                  onClick={handleLaunchPrimary}
                >
                  <Zap className="w-5 h-5 fill-black" />
                  <span>
                    {activeMode === 'online'
                      ? `Play ${selectedTcObj.label} ${selectedTcObj.category}`
                      : activeMode === 'bots'
                      ? 'Challenge Chess Bot'
                      : 'Solve Tactics Puzzle'}
                  </span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <p className="text-center text-[11px] text-zinc-500 mt-2 font-medium">
                  {activeMode === 'online'
                    ? 'Instant rated matchmaking with Stockfish server evaluation'
                    : activeMode === 'bots'
                    ? 'Practice against 20+ grandmasters and historical personalities'
                    : 'Adaptive tactical exercises tailored to your tactical leaks'}
                </p>
              </div>
            </div>

            {/* Right Column (5 Cols): Daily Challenge Preview & XP Quest */}
            <div className="lg:col-span-5 flex flex-col gap-3 max-w-sm w-full mx-auto lg:mx-0">
              {/* Daily Challenge Card */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Daily Challenge</span>
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-tight">Tactical Mate in 2</h3>
                  <p className="text-[11px] text-zinc-400">+15 XP • 1,420 Rating</p>
                  <Button
                    variant="outline"
                    size="xs"
                    rounded="lg"
                    onClick={onOpenPuzzles}
                    className="mt-1.5 text-xs font-semibold w-fit"
                  >
                    <span>Solve Challenge</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Micro Chessboard Preview */}
                <div className="w-18 h-18 shrink-0 rounded-xl overflow-hidden border border-white/10 pointer-events-none opacity-90">
                  <ChessBoard
                    chess={puzzleMiniBoard}
                    boardTheme="wood"
                    pieceTheme="neo"
                    disabled={true}
                  />
                </div>
              </div>

              {/* Daily Quest Meter Card */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-300">Daily Quest</span>
                  <span className="font-mono text-xs text-white" suppressHydrationWarning>
                    {xpProfile.dailyXp} <span className="text-zinc-500">/ {xpProfile.dailyGoal} XP</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full bg-[#81b64c] rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((xpProfile.dailyXp / xpProfile.dailyGoal) * 100))}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-zinc-400" suppressHydrationWarning>
                  {xpProfile.dailyGoalAchieved
                    ? '✨ Daily goal achieved! Streak continued.'
                    : `${xpProfile.dailyGoal - xpProfile.dailyXp} XP remaining to maintain streak.`}
                </p>
              </div>

              {/* Quick Reviews Ribbon Teaser */}
              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-[#81b64c]" />
                  <span className="font-semibold text-zinc-300">Recent Games ({recentSessions.length})</span>
                </div>
                <button
                  onClick={() => setActiveScreen('reviews')}
                  className="text-xs font-semibold text-[#81b64c] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Review Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: CLOCKS & TIMERS (Full Timer Matrix + Custom Clock Builder) */}
        {/* ========================================================================= */}
        {activeScreen === 'clocks' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 my-auto min-h-0 py-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#81b64c]" />
                  <span>Official Clock Tempos &amp; Custom Timers</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select an official FIDE tempo or configure custom minutes and increment
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={() => setActiveScreen('play')}
              >
                &larr; Back to Play
              </Button>
            </div>

            {/* 4 Categorized Clock Grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['Bullet', 'Blitz', 'Rapid', 'Classical'] as const).map((category) => {
                const groupClocks = ALL_TIME_CONTROLS.filter((c) => c.category === category);
                return (
                  <div
                    key={category}
                    className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      {category}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {groupClocks.map((tc) => {
                        const isSelected =
                          selectedTimeControl === tc.sec && selectedIncrement === tc.inc;
                        return (
                          <button
                            key={`${tc.sec}-${tc.inc}`}
                            onClick={() => handleSelectPresetClock(tc)}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white/15 border-[#81b64c] text-[#81b64c] shadow-xs'
                                : 'bg-[#141311] border-white/5 text-zinc-300 hover:border-white/10 hover:text-white'
                            }`}
                          >
                            <span>{tc.label}</span>
                            <span className="text-[10px] text-zinc-500 font-sans font-normal">
                              {tc.inc > 0 ? `+${tc.inc}s inc` : 'Flat'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Time Control Builder */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Custom Clock Builder</span>
                </span>
                <h3 className="text-xs font-bold text-white">Create Custom Match Tempo</h3>
                <p className="text-[11px] text-zinc-400">Set arbitrary base minutes and increment per move</p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {/* Base Minutes */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Minutes</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={() => setCustomMinutes((m) => Math.max(1, m - 1))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-mono font-extrabold text-sm text-white">
                      {customMinutes}m
                    </span>
                    <button
                      onClick={() => setCustomMinutes((m) => Math.min(120, m + 1))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Increment Seconds */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono">Increment</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <button
                      onClick={() => setCustomIncSeconds((s) => Math.max(0, s - 1))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="w-9 text-center font-mono font-extrabold text-sm text-white">
                      +{customIncSeconds}s
                    </span>
                    <button
                      onClick={() => setCustomIncSeconds((s) => Math.min(60, s + 1))}
                      className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Action CTA */}
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  onClick={handleApplyCustomClock}
                  className="mt-3.5 sm:mt-0"
                >
                  <span>Apply &amp; Play</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: RECENT GAMES & REVIEW HUB (Multi-Source Game Review Engine) */}
        {/* ========================================================================= */}
        {activeScreen === 'reviews' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            {/* Header with Source Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#81b64c]" />
                  <span>Recent Games &amp; Engine Review Hub</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Inspect completed matches across Check.mate, Chess.com, and Lichess
                </p>
              </div>

              {/* Controls: Live Sync & Platform Switcher Pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={() => handleRefreshExternalGames(true)}
                  disabled={isSyncingExternal}
                  className="font-bold flex items-center gap-1.5"
                  title="Fetch fresh games from Chess.com & Lichess"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-[#81b64c] ${isSyncingExternal ? 'animate-spin' : ''}`} />
                  <span>{isSyncingExternal ? 'Syncing...' : 'Sync Live'}</span>
                </Button>

                <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-xl border border-white/5 text-xs font-bold shrink-0">
                <button
                  onClick={() => setActiveReviewSource('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeReviewSource === 'all'
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({recentSessions.length})
                </button>
                <button
                  onClick={() => setActiveReviewSource('checkmate')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    activeReviewSource === 'checkmate'
                      ? 'bg-[#81b64c] text-black font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Check.mate
                </button>
                <button
                  onClick={() => setActiveReviewSource('chesscom')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeReviewSource === 'chesscom'
                      ? 'bg-emerald-600 text-white font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Chess.com</span>
                  {syncedChessCom && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
                <button
                  onClick={() => setActiveReviewSource('lichess')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                    activeReviewSource === 'lichess'
                      ? 'bg-amber-600 text-white font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Lichess</span>
                  {syncedLichess && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                </button>
              </div>
            </div>
          </div>

            {/* Sync Account Banner if neither synced */}
            {!syncedChessCom && !syncedLichess && onOpenSyncModal && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#81b64c]" />
                  <span className="text-zinc-300">
                    Sync your Chess.com or Lichess profile to automatically import past games for engine review.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  rounded="lg"
                  onClick={onOpenSyncModal}
                  className="shrink-0 font-bold"
                >
                  Sync Accounts
                </Button>
              </div>
            )}

            {/* Scrollable Game Rows List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              {filteredReviewSessions.length > 0 ? (
                filteredReviewSessions.map((session) => {
                  let isUserWhite = isSessionUserWhite(session, effectiveDisplayName);
                  let oppPlayer = isUserWhite ? session.blackPlayer : session.whitePlayer;

                  // Failsafe: if the selected opponent's name matches user handle or 'rapid_qing' or 'qing' or 'you', swap
                  const userHandle = (effectiveDisplayName || '').toLowerCase().trim();
                  const oppNameLower = (oppPlayer?.name || '').toLowerCase().trim();
                  if (
                    oppNameLower &&
                    (oppNameLower === userHandle ||
                      (userHandle && userHandle.length >= 3 && oppNameLower.includes(userHandle)) ||
                      oppNameLower === 'rapid_qing' ||
                      oppNameLower.includes('qing') ||
                      oppNameLower === 'you')
                  ) {
                    isUserWhite = !isUserWhite;
                    oppPlayer = isUserWhite ? session.blackPlayer : session.whitePlayer;
                  }

                  const outcome = getSessionUserOutcome(session, effectiveDisplayName);
                  const isWin = outcome === 'win';
                  const isLoss = outcome === 'loss';
                  const opponentName = oppPlayer?.name || 'Opponent';
                  const opponentRating = oppPlayer?.rating;
                  const isChessCom = session.source === 'chesscom' || session.id.startsWith('chesscom-');
                  const isLichess = session.source === 'lichess' || session.id.startsWith('lichess-');

                  return (
                    <div
                      key={session.id}
                      className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Outcome Pill */}
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 uppercase tracking-wider ${
                            isWin
                              ? 'bg-[#81b64c]/20 text-[#81b64c]'
                              : isLoss
                              ? 'bg-red-400/20 text-red-400'
                              : 'bg-zinc-400/20 text-zinc-400'
                          }`}
                        >
                          {isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              vs {opponentName}
                            </span>
                            {opponentRating && (
                              <span className="text-[10px] font-mono text-zinc-400">
                                ({opponentRating})
                              </span>
                            )}
                            {/* Platform source pill */}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                                isChessCom
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : isLichess
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-[#81b64c]/10 text-[#81b64c]'
                              }`}
                            >
                              {isChessCom ? 'Chess.com' : isLichess ? 'Lichess' : 'Check.mate'}
                            </span>
                          </div>
                          <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono">
                            {session.timeControl ? `${Math.round(session.timeControl / 60)} min` : 'Standard'} •{' '}
                            {session.movesCount ? `${session.movesCount} moves` : 'Match'} •{' '}
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Launch Stockfish 18 Engine Review */}
                      <Button
                        variant="secondary"
                        size="xs"
                        rounded="xl"
                        onClick={() => onOpenReview(session.id)}
                        className="shrink-0 font-bold"
                      >
                        <Sparkles className="w-3 h-3 text-[#81b64c]" />
                        <span>Review</span>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-white/5 rounded-2xl">
                  <History className="w-6 h-6 text-zinc-600" />
                  <span>No matches found for the selected source.</span>
                  {onOpenSyncModal && (
                    <Button
                      variant="outline"
                      size="xs"
                      rounded="lg"
                      onClick={onOpenSyncModal}
                      className="mt-1 font-bold"
                    >
                      Connect Chess.com or Lichess
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 4: LEAGUES & PROGRESION (Ladder & Standings) */}
        {/* ========================================================================= */}
        {activeScreen === 'leagues' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span suppressHydrationWarning>{xpProfile.league.name} Weekly Standings</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Top 5 promote to next tier. Gain XP from live matches, bots, and puzzles.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={() => setActiveScreen('play')}
              >
                &larr; Back to Play
              </Button>
            </div>

            {/* Standings List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5">
              {Array.from({ length: 15 }).map((_, i) => {
                const rank = i + 1;
                const isUser = rank === xpProfile.leagueRank;
                const isPromotion = rank <= 5;
                const isDemotion = rank >= 13;
                return (
                  <div
                    key={rank}
                    className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between transition-colors ${
                      isUser
                        ? 'bg-[#81b64c]/10 border-[#81b64c]/30 text-white shadow-xs'
                        : 'bg-white/5 border-white/5 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <span
                        className={`font-mono text-xs font-bold w-5 text-center ${
                          rank <= 3 ? 'text-amber-400' : 'text-zinc-500'
                        }`}
                      >
                        #{rank}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold">
                          {isUser ? `${effectiveDisplayName} (You)` : `Grandmaster_${rank * 7}`}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-zinc-500">
                          {isPromotion ? '🟢 Promotion Zone' : isDemotion ? '🔴 Demotion Zone' : 'Safe Zone'}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-300" suppressHydrationWarning>
                      {isUser
                        ? `${xpProfile.totalXp} XP`
                        : `${Math.max(120, xpProfile.totalXp + (10 - rank) * 65)} XP`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. BOTTOM STATUS BAR (Compact Context Pill) */}
      <footer className="pt-2 border-t border-white/5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          <span className="text-[11px] text-zinc-500 font-medium">Stockfish 18 Engine Active</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500 font-mono" suppressHydrationWarning>
            {xpProfile.totalXp} XP Total
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] text-zinc-400 font-mono" suppressHydrationWarning>
            {xpProfile.league.name}
          </span>
        </div>
      </footer>
    </div>
  );
};
