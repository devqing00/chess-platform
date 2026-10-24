'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameSessionStore, getSessionUserOutcome, isSessionUserWhite } from '@/lib/gameSessionStore';
import { syncExternalAccountGames } from '@/lib/syncService';
import { MatchmakingService } from '@/lib/firebase/matchmakingService';
import { GameSyncService } from '@/lib/firebase/gameSyncService';
import { UserProfile } from '@/lib/firebase/types';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { ChessVariant, GamePlayer, GameSession } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import {
  Zap,
  Flame,
  Clock,
  Swords,
  Bot,
  Globe,
  Users,
  Award,
  Play,
  RotateCw,
  Share2,
  History,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Shield,
  Search,
  Sliders,
  Copy,
  Check,
  ArrowRight,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface TimeControlOption {
  sec: number;
  inc: number;
  label: string;
  sub: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
  popular?: boolean;
}

export const QUICK_TIME_CONTROLS: TimeControlOption[] = [
  { sec: 60, inc: 0, label: '1m', sub: 'Bullet', category: 'bullet', popular: true },
  { sec: 180, inc: 0, label: '3m', sub: 'Blitz', category: 'blitz', popular: true },
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz', popular: true },
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid', popular: true },
  { sec: 900, inc: 10, label: '15|10', sub: 'Rapid', category: 'rapid', popular: true },
];

export const ALL_TIME_CONTROLS: TimeControlOption[] = [
  // Bullet
  { sec: 60, inc: 0, label: '1m', sub: 'Bullet', category: 'bullet', popular: true },
  { sec: 60, inc: 1, label: '1 | 1', sub: 'Bullet', category: 'bullet' },
  { sec: 120, inc: 1, label: '2 | 1', sub: 'Bullet', category: 'bullet' },
  // Blitz
  { sec: 180, inc: 0, label: '3m', sub: 'Blitz', category: 'blitz', popular: true },
  { sec: 180, inc: 2, label: '3 | 2', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz', popular: true },
  { sec: 300, inc: 5, label: '5 | 5', sub: 'Blitz', category: 'blitz' },
  // Rapid
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid', popular: true },
  { sec: 900, inc: 10, label: '15 | 10', sub: 'Rapid', category: 'rapid', popular: true },
  { sec: 1800, inc: 0, label: '30m', sub: 'Rapid', category: 'rapid' },
  // Classical
  { sec: 1800, inc: 20, label: '30 | 20', sub: 'Classical', category: 'classical' },
  { sec: 3600, inc: 0, label: '60m', sub: 'Classical', category: 'classical' },
];

type PlayScreen = 'arena' | 'bots' | 'clocks' | 'history';

export default function PlayLobbyPage() {
  const router = useRouter();
  const {
    user,
    profile,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    syncedChessCom,
    syncedLichess,
  } = useAuth();
  const { openChessComSync } = useShell();

  // Active sub-screen within Play Hub
  const [activeScreen, setActiveScreen] = useState<PlayScreen>('arena');

  // Match configurations
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    QUICK_TIME_CONTROLS[3] // Default 10m Rapid
  );
  const [selectedMode, setSelectedMode] = useState<'bot' | 'online_pvp' | 'friend_challenge' | 'pass_and_play'>('bot');
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');
  const [playAsColor, setPlayAsColor] = useState<'w' | 'random' | 'b'>('w');
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');

  // Custom clock builder state
  const [customMinutes, setCustomMinutes] = useState<number>(10);
  const [customIncSeconds, setCustomIncSeconds] = useState<number>(0);

  // Bot search & filter
  const [botFilter, setBotFilter] = useState<
    'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'
  >('all');
  const [botSearchQuery, setBotSearchQuery] = useState('');

  // Queue state
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [queueTimeoutReached, setQueueTimeoutReached] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const queueCleanupRef = useRef<(() => void) | null>(null);

  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  const [historyProvider, setHistoryProvider] = useState<'all' | 'checkmate' | 'chesscom' | 'lichess'>('all');
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

    setRecentGames(GameSessionStore.listRecentSessions());
    setIsSyncingExternal(false);
  }, [syncedChessCom?.username, syncedLichess?.username]);

  useEffect(() => {
    setRecentGames(GameSessionStore.listRecentSessions());
    // Auto sync on mount
    handleRefreshExternalGames(true);
  }, [handleRefreshExternalGames]);

  const filteredHistoryGames = useMemo(() => {
    return recentGames.filter((g) => {
      const isChessCom = g.source === 'chesscom' || g.id.startsWith('chesscom-');
      const isLichess = g.source === 'lichess' || g.id.startsWith('lichess-');
      if (historyProvider === 'chesscom') return isChessCom;
      if (historyProvider === 'lichess') return isLichess;
      if (historyProvider === 'checkmate') return !isChessCom && !isLichess;
      return true;
    });
  }, [recentGames, historyProvider]);

  const providerCounts = useMemo(() => {
    let checkmate = 0;
    let chesscom = 0;
    let lichess = 0;
    recentGames.forEach((g) => {
      const isChessCom = g.source === 'chesscom' || g.id.startsWith('chesscom-');
      const isLichess = g.source === 'lichess' || g.id.startsWith('lichess-');
      if (isChessCom) chesscom++;
      else if (isLichess) lichess++;
      else checkmate++;
    });
    return { all: recentGames.length, checkmate, chesscom, lichess };
  }, [recentGames]);

  const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];

  const filteredBots = CHESS_BOTS.filter((b) => {
    const matchesCategory = botFilter === 'all' || b.category === botFilter;
    const matchesSearch =
      b.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
      b.rating.toString().includes(botSearchQuery);
    return matchesCategory && matchesSearch;
  });

  // Handle Real Online Matchmaking Queue (100% Genuine Human Players via Firestore)
  const handleStartOnlineQueue = async () => {
    setIsQueueing(true);
    setQueueElapsed(0);
    setQueueTimeoutReached(false);

    queueTimerRef.current = setInterval(() => {
      setQueueElapsed((prev) => {
        const next = prev + 1;
        if (next >= 20) {
          setQueueTimeoutReached(true);
        }
        return next;
      });
    }, 1000);

    const userProfile: UserProfile = profile || {
      uid: user?.uid || `guest-${Date.now()}`,
      email: user?.email || null,
      displayName: effectiveDisplayName || 'Guest Player',
      avatar: effectiveAvatar || '♟️',
      tier: 'free',
      country: effectiveCountry || 'US',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: !user?.uid,
      ratings: {
        blitz: effectiveRating || 1200,
        rapid: effectiveRating || 1200,
        bullet: effectiveRating || 1200,
        daily: 1200,
        puzzles: 1200,
        puzzleRush: 0,
      },
      stats: {
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winStreak: 0,
      },
    };

    try {
      const { ticketId, unsubscribe } = await MatchmakingService.enterQueue(
        userProfile,
        selectedTimeControl.sec,
        selectedTimeControl.inc,
        selectedVariant,
        (matchedGameId: string) => {
          if (queueTimerRef.current) clearInterval(queueTimerRef.current);
          setIsQueueing(false);
          router.push(`/play/live/${matchedGameId}`);
        }
      );

      queueCleanupRef.current = () => {
        unsubscribe();
        MatchmakingService.cancelQueue(ticketId);
      };
    } catch (err) {
      console.error('Matchmaking service error:', err);
      setIsQueueing(false);
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    }
  };

  const handleCancelQueue = () => {
    if (queueCleanupRef.current) {
      queueCleanupRef.current();
      queueCleanupRef.current = null;
    }
    if (queueTimerRef.current) {
      clearInterval(queueTimerRef.current);
    }
    setIsQueueing(false);
    setQueueTimeoutReached(false);
  };

  // Handle Create Private Friend Challenge
  const handleCreateFriendChallenge = async () => {
    try {
      setIsCreatingChallenge(true);
      const hostProfile: UserProfile = profile || {
        uid: user?.uid || `guest-${Date.now()}`,
        email: user?.email || null,
        displayName: effectiveDisplayName || 'Host Player',
        avatar: effectiveAvatar || '♟️',
        tier: 'free',
        country: effectiveCountry || 'US',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: !user?.uid,
        ratings: {
          blitz: effectiveRating || 1200,
          rapid: effectiveRating || 1200,
          bullet: effectiveRating || 1200,
          daily: 1200,
          puzzles: 1200,
          puzzleRush: 0,
        },
        stats: {
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          winStreak: 0,
        },
      };

      const gameId = await GameSyncService.createFriendChallengeWithAutoId(
        hostProfile,
        selectedTimeControl.sec,
        selectedTimeControl.inc,
        selectedVariant,
        playAsColor,
        true
      );

      router.push(`/play/live/${gameId}`);
    } catch (err) {
      console.error('Failed to create friend challenge:', err);
      setIsCreatingChallenge(false);
    }
  };

  // Handle Play Against Bot or Pass & Play
  const handleStartLocalOrBotMatch = () => {
    const chosenColor = playAsColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : playAsColor;
    const humanPlayer: GamePlayer = {
      id: user?.uid || 'player-you',
      name: effectiveDisplayName,
      rating: effectiveRating || 1200,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const opponentPlayer: GamePlayer =
      selectedMode === 'bot'
        ? {
            id: chosenBot.id,
            name: chosenBot.name,
            rating: chosenBot.rating,
            avatar: chosenBot.avatar,
            title: chosenBot.rating >= 2800 ? 'GM' : 'BOT',
            isBot: true,
          }
        : {
            id: 'player-2',
            name: 'Opponent (Pass & Play)',
            rating: 1200,
            avatar: '♟️',
          };

    const whitePlayer = chosenColor === 'w' ? humanPlayer : opponentPlayer;
    const blackPlayer = chosenColor === 'w' ? opponentPlayer : humanPlayer;

    const session = GameSessionStore.createSession(
      whitePlayer,
      blackPlayer,
      selectedTimeControl.sec,
      selectedVariant,
      undefined,
      selectedTimeControl.inc
    );

    router.push(`/game/${session.id}`);
  };

  const handleSelectFriendChallenge = () => {
    setSelectedMode('friend_challenge');
    setActiveScreen('arena');
  };

  const handleApplyCustomClock = () => {
    const totalSec = Math.max(60, customMinutes * 60);
    const label = `${customMinutes}${customIncSeconds > 0 ? `|${customIncSeconds}` : 'm'}`;
    const category = totalSec < 180 ? 'bullet' : totalSec < 600 ? 'blitz' : totalSec < 3600 ? 'rapid' : 'classical';
    setSelectedTimeControl({
      sec: totalSec,
      inc: customIncSeconds,
      label,
      sub: category.charAt(0).toUpperCase() + category.slice(1),
      category,
    });
    setActiveScreen('arena');
  };

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-2.5 sm:p-4 lg:p-6 flex flex-col justify-between select-none text-zinc-100 bg-[#161512]">
      {/* 1. TOP AMBIENT STRIP (HUD & Player Status) */}
      <header className="flex items-center justify-between gap-2 px-1 pb-2 shrink-0 border-b border-white/5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Play Arena
            </h1>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-medium truncate">
              {effectiveDisplayName} ({effectiveRating || 'Unranked'}) • Live Matchmaking &amp; Bot Hub
            </p>
          </div>
        </div>

        {/* Right: Quick Action Triggers */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant={selectedMode === 'friend_challenge' ? 'primary' : 'secondary'}
            size="xs"
            rounded="xl"
            onClick={handleSelectFriendChallenge}
            title="Challenge a friend with private invite link"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Play a Friend</span>
          </Button>
          <Button
            variant="secondary"
            size="xs"
            rounded="xl"
            onClick={() => setActiveScreen('history')}
            title="View recent matches"
          >
            <History className="w-3.5 h-3.5 text-[#81b64c]" />
            <span className="hidden sm:inline">Recent ({recentGames.length})</span>
          </Button>
        </div>
      </header>

      {/* 2. SUB-SCREEN NAVIGATION PILLS ("Screens, Not Pages" Architecture) */}
      <nav className="my-2.5 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveScreen('arena')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'arena'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Play Arena</span>
          </button>

          <button
            onClick={() => setActiveScreen('bots')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'bots'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Choose Bot</span>
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
            onClick={() => setActiveScreen('history')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeScreen === 'history'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Match History</span>
          </button>
        </div>

        {/* Active Tempo Display */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/5 text-xs font-mono text-zinc-300">
          <Clock className="w-3 h-3 text-[#81b64c]" />
          <span>Clock: {selectedTimeControl.label} ({selectedTimeControl.sub})</span>
        </div>
      </nav>

      {/* 3. CENTRAL STAGE (Render Active Screen without Window Scroll) */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden flex flex-col justify-center">
        {/* ========================================================================= */}
        {/* SCREEN 1: ARENA / MATCH LAUNCH */}
        {/* ========================================================================= */}
        {activeScreen === 'arena' && (
          <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-8 items-center my-auto min-h-0 py-1">
            {/* Left Column (7 Cols): Mode Switcher, Tempo Selector, Color & P1 Action */}
            <div className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-4">
                {/* Mode Segmented Switcher */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Select Game Mode
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#141311] p-1 rounded-xl border border-white/5">
                    <button
                      onClick={() => setSelectedMode('bot')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedMode === 'bot'
                          ? 'bg-[#81b64c] text-black shadow-sm font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>vs Bot</span>
                    </button>

                    <button
                      onClick={() => setSelectedMode('online_pvp')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedMode === 'online_pvp'
                          ? 'bg-amber-600 text-white shadow-sm font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Online 1v1</span>
                    </button>

                    <button
                      onClick={() => setSelectedMode('friend_challenge')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedMode === 'friend_challenge'
                          ? 'bg-blue-600 text-white shadow-sm font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Friend Link</span>
                    </button>

                    <button
                      onClick={() => setSelectedMode('pass_and_play')}
                      className={`py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        selectedMode === 'pass_and_play'
                          ? 'bg-purple-600 text-white shadow-sm font-black'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Pass &amp; Play</span>
                    </button>
                  </div>
                </div>

                {/* Quick Time Control Ribbon */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Time Control:
                    </span>
                    <button
                      onClick={() => setActiveScreen('clocks')}
                      className="text-[11px] font-semibold text-[#81b64c] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Custom &amp; All 12+ Timers</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                    {QUICK_TIME_CONTROLS.map((tc) => {
                      const isSelected =
                        selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                      return (
                        <button
                          key={`${tc.sec}-${tc.inc}`}
                          onClick={() => setSelectedTimeControl(tc)}
                          className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white/10 border-[#81b64c] text-white shadow-sm'
                              : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <span className="text-xs sm:text-sm font-extrabold font-mono">{tc.label}</span>
                          <span className="text-[9px] uppercase font-bold text-zinc-500">{tc.sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color Chooser (White / Random / Black) */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Play As Color
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPlayAsColor('w')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        playAsColor === 'w'
                          ? 'bg-white/15 border-white text-white shadow-sm'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>⚪</span>
                      <span>White</span>
                    </button>

                    <button
                      onClick={() => setPlayAsColor('random')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        playAsColor === 'random'
                          ? 'bg-white/15 border-[#81b64c] text-[#81b64c] shadow-sm'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>🌓</span>
                      <span>Random</span>
                    </button>

                    <button
                      onClick={() => setPlayAsColor('b')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                        playAsColor === 'b'
                          ? 'bg-white/15 border-zinc-400 text-white shadow-sm'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>⚫</span>
                      <span>Black</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* P1 PRIMARY ACTION ANCHOR - EXACTLY ONE ON SCREEN */}
              <div className="pt-2">
                {isQueueing ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 py-3 px-4 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 animate-pulse">
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Searching global queue ({queueElapsed}s)...</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="md"
                        rounded="xl"
                        onClick={handleCancelQueue}
                      >
                        Cancel
                      </Button>
                    </div>

                    {queueTimeoutReached && (
                      <div className="p-3 rounded-xl bg-[#141311] border border-amber-500/30 flex flex-col gap-2 text-xs animate-in fade-in">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>No live opponents in this rating window right now</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">
                          You can continue searching or switch instantly:
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Button
                            variant="secondary"
                            size="xs"
                            rounded="lg"
                            onClick={() => {
                              handleCancelQueue();
                              setSelectedMode('friend_challenge');
                            }}
                          >
                            <Share2 className="w-3 h-3 text-blue-400" />
                            <span>Challenge a Friend via Link</span>
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            rounded="lg"
                            onClick={() => {
                              handleCancelQueue();
                              setSelectedMode('bot');
                            }}
                          >
                            <Bot className="w-3 h-3 text-[#81b64c]" />
                            <span>Play vs {chosenBot.name}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="xl"
                    rounded="xl"
                    fullWidth
                    disabled={isCreatingChallenge}
                    onClick={
                      selectedMode === 'online_pvp'
                        ? handleStartOnlineQueue
                        : selectedMode === 'friend_challenge'
                        ? handleCreateFriendChallenge
                        : handleStartLocalOrBotMatch
                    }
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>
                      {isCreatingChallenge
                        ? 'Creating Challenge Link...'
                        : selectedMode === 'online_pvp'
                        ? `Find 1v1 Opponent (${selectedTimeControl.label} ${selectedTimeControl.sub})`
                        : selectedMode === 'friend_challenge'
                        ? `Create Challenge Link (${selectedTimeControl.label})`
                        : selectedMode === 'bot'
                        ? `Play vs ${chosenBot.name} (${selectedTimeControl.label} ${selectedTimeControl.sub})`
                        : `Start Pass & Play (${selectedTimeControl.label})`}
                    </span>
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column (5 Cols): Sparring Partner / Opponent Context Card */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-4">
              {selectedMode === 'bot' && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      Selected Sparring Partner
                    </span>
                    <span className="text-xs font-mono font-bold text-[#81b64c]">
                      {chosenBot.rating} Elo
                    </span>
                  </div>

                  {/* Bot Profile Card */}
                  <div className="p-4 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-[#262420] border-2 border-white/10 overflow-hidden flex items-center justify-center text-3xl shadow-lg relative">
                      {chosenBot.avatar.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={chosenBot.avatar} alt={chosenBot.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{chosenBot.avatar}</span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-white flex items-center justify-center gap-1.5">
                        <span>{chosenBot.name}</span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          {chosenBot.category.toUpperCase()}
                        </span>
                      </h3>
                      <p className="text-xs text-zinc-400 italic mt-1">&ldquo;{chosenBot.quotes.gameStart[0] || chosenBot.bio}&rdquo;</p>
                    </div>
                  </div>

                  {/* Switch Bot Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    fullWidth
                    onClick={() => setActiveScreen('bots')}
                  >
                    <Bot className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Choose Another Bot Opponent ({CHESS_BOTS.length} Bots) &rarr;</span>
                  </Button>
                </div>
              )}

              {selectedMode === 'online_pvp' && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    Live Global Matchmaking
                  </span>
                  <div className="p-5 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl animate-pulse">
                      <Globe className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Genuine Rating Pairings</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                        Queues against real human players connected to the platform in your rating tier. 0 fake demo bots.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedMode === 'friend_challenge' && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                    Private 1v1 Friend Challenge
                  </span>
                  <div className="p-5 rounded-2xl bg-[#141311] border border-blue-500/20 flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 text-2xl">
                      <Share2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Shareable Invite Link</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                        Generate a private link to send to a friend via WhatsApp, Discord, or SMS. They review your format and accept to begin immediately!
                      </p>
                    </div>
                    <div className="w-full p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-300 flex items-center justify-around font-mono">
                      <span>Format: {selectedTimeControl.label}</span>
                      <span>&bull;</span>
                      <span>Color: {playAsColor === 'w' ? 'White ⚪' : playAsColor === 'b' ? 'Black ⚫' : 'Random 🌓'}</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedMode === 'pass_and_play' && (
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                    Local Board Setup
                  </span>
                  <div className="p-5 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl">
                      <Users className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Same Device Pass &amp; Play</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                        Play over-the-board with a friend on your screen with automatic clocks.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Quick Summary Pill */}
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span>Variant: Standard</span>
                <span>Clock: {selectedTimeControl.label}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: BOTS SPARRIING ROSTER */}
        {/* ========================================================================= */}
        {activeScreen === 'bots' && (
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#81b64c]" />
                  <span>Grandmaster &amp; Personality Sparring Bots</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select a bot personality from Beginner (250) to Grandmaster (3000)
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={() => setActiveScreen('arena')}
              >
                &larr; Back to Match Launch
              </Button>
            </div>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'beginner', label: 'Beginner' },
                  { id: 'intermediate', label: 'Intermediate' },
                  { id: 'advanced', label: 'Advanced' },
                  { id: 'master', label: 'Master' },
                  { id: 'grandmaster', label: 'Grandmaster' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setBotFilter(cat.id as typeof botFilter)}
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0 ${
                      botFilter === cat.id
                        ? 'bg-[#81b64c] text-black border-[#81b64c]'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60 shrink-0">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search bot by name or Elo..."
                  value={botSearchQuery}
                  onChange={(e) => setBotSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#141311] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
                />
              </div>
            </div>

            {/* Bot Grid (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {filteredBots.map((bot) => {
                const isSelected = selectedBotId === bot.id;
                return (
                  <div
                    key={bot.id}
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setSelectedMode('bot');
                      setActiveScreen('arena');
                    }}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white/15 border-[#81b64c] shadow-sm'
                        : 'bg-[#1c1a17] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-[#262420] border border-white/10 overflow-hidden flex items-center justify-center text-xl shrink-0">
                        {bot.avatar.startsWith('http') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
                        ) : (
                          <span>{bot.avatar}</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{bot.name}</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                            {bot.category.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#81b64c]">
                          {bot.rating} Elo
                        </span>
                      </div>
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="xs"
                      rounded="lg"
                      className="shrink-0 font-bold"
                    >
                      {isSelected ? 'Selected' : 'Choose'}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 3: CLOCKS & TIMERS */}
        {/* ========================================================================= */}
        {activeScreen === 'clocks' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-4 my-auto min-h-0 py-2">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#81b64c]" />
                  <span>Clock Tempos &amp; Custom Timers</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select an official time control or configure custom minutes and increment
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={() => setActiveScreen('arena')}
              >
                &larr; Back to Play
              </Button>
            </div>

            {/* Categorized Clocks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(['bullet', 'blitz', 'rapid', 'classical'] as const).map((category) => {
                const groupClocks = ALL_TIME_CONTROLS.filter((c) => c.category === category);
                return (
                  <div
                    key={category}
                    className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2"
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      {category.toUpperCase()}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {groupClocks.map((tc) => {
                        const isSelected =
                          selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                        return (
                          <button
                            key={`${tc.sec}-${tc.inc}`}
                            onClick={() => {
                              setSelectedTimeControl(tc);
                              setActiveScreen('arena');
                            }}
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
                <h3 className="text-xs font-bold text-white">Custom Match Clock</h3>
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

                {/* Apply Action */}
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
        {/* SCREEN 4: MATCH HISTORY & REVIEW */}
        {/* ========================================================================= */}
        {activeScreen === 'history' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-[#81b64c]" />
                  <span>Recent Matches ({filteredHistoryGames.length})</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Review completed games across connected platforms with Stockfish 18
                </p>
              </div>

              {/* Controls: Live Sync & Provider Switcher Pills */}
              <div className="flex items-center gap-2 self-stretch sm:self-auto flex-wrap justify-between sm:justify-end">
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

                <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-xl border border-white/5 text-xs font-bold shrink-0 overflow-x-auto scrollbar-none">
                  <button
                    onClick={() => setHistoryProvider('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      historyProvider === 'all'
                        ? 'bg-white/10 text-white'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({providerCounts.all})
                  </button>
                  <button
                    onClick={() => setHistoryProvider('checkmate')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      historyProvider === 'checkmate'
                        ? 'bg-[#81b64c] text-black font-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Check.mate ({providerCounts.checkmate})
                  </button>
                  <button
                    onClick={() => setHistoryProvider('chesscom')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      historyProvider === 'chesscom'
                        ? 'bg-emerald-600 text-white font-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Chess.com ({providerCounts.chesscom})</span>
                  </button>
                  <button
                    onClick={() => setHistoryProvider('lichess')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                      historyProvider === 'lichess'
                        ? 'bg-amber-600 text-white font-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>Lichess ({providerCounts.lichess})</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sync Account Banner if no third-party games found */}
            {providerCounts.chesscom === 0 && providerCounts.lichess === 0 && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#81b64c]" />
                  <span className="text-zinc-300">
                    Sync your Chess.com or Lichess account to automatically import and analyze past games.
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  rounded="lg"
                  onClick={openChessComSync}
                  className="shrink-0 font-bold"
                >
                  Sync Accounts
                </Button>
              </div>
            )}

            {/* Filtered Games List (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              {filteredHistoryGames.length > 0 ? (
                filteredHistoryGames.map((game) => {
                  const isWhite = isSessionUserWhite(game, effectiveDisplayName);
                  const outcome = getSessionUserOutcome(game, effectiveDisplayName);
                  const isWin = outcome === 'win';
                  const isLoss = outcome === 'loss';

                  const isChessCom = game.source === 'chesscom' || game.id.startsWith('chesscom-');
                  const isLichess = game.source === 'lichess' || game.id.startsWith('lichess-');
                  const providerLabel = isChessCom ? 'Chess.com' : isLichess ? 'Lichess' : 'Check.mate';
                  const providerBadgeColor = isChessCom
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : isLichess
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-[#81b64c]/15 text-[#81b64c] border-[#81b64c]/30';

                  return (
                    <div
                      key={game.id}
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
                              {game.whitePlayer.name} vs {game.blackPlayer.name}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${providerBadgeColor}`}>
                              {providerLabel}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {game.gameResult || 'Finished'} &bull; {Math.floor(game.timeControl / 60)}m clock &bull;{' '}
                            {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="xs"
                        rounded="lg"
                        onClick={() => router.push(`/game/review/${game.id}`)}
                        className="shrink-0 font-bold"
                      >
                        <Sparkles className="w-3 h-3 text-[#81b64c]" />
                        <span>Review</span>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <History className="w-6 h-6 text-zinc-600" />
                  <span>No {historyProvider === 'all' ? '' : historyProvider} games recorded yet.</span>
                  {(historyProvider === 'chesscom' || historyProvider === 'lichess') && (
                    <Button
                      variant="outline"
                      size="xs"
                      rounded="lg"
                      onClick={openChessComSync}
                      className="mt-1 font-bold"
                    >
                      Connect {historyProvider === 'chesscom' ? 'Chess.com' : 'Lichess'} Account
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. FOOTER STATUS BAR */}
      <footer className="pt-2 border-t border-white/5 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          <span className="text-[11px] text-zinc-500 font-medium">Matchmaking Gateway Ready</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-400 font-mono">
            Mode: {selectedMode === 'bot' ? 'vs Bot' : selectedMode === 'online_pvp' ? 'Online 1v1' : selectedMode === 'friend_challenge' ? 'Friend Challenge' : 'Pass & Play'}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-[11px] text-zinc-300 font-mono">
            {selectedTimeControl.label}
          </span>
        </div>
      </footer>
    </div>
  );
}
