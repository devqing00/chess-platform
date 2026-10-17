'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { useShell } from '@/context/ShellContext';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { MatchmakingService } from '@/lib/firebase/matchmakingService';
import { useAuth } from '@/context/AuthContext';
import { ChessVariant, GamePlayer, GameSession } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import {
  Zap,
  Flame,
  Clock,
  Swords,
  Bot,
  Crown,
  Users,
  Award,
  Play,
  ArrowRight,
  Globe,
  Loader2,
  X,
  Share2,
  ChevronRight,
  History,
  SlidersHorizontal,
} from 'lucide-react';
import { FirestoreService } from '@/lib/firebase/firestoreService';

interface TimeControlOption {
  sec: number;
  inc: number;
  label: string;
  sub: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
}

const QUICK_TIME_CONTROLS: TimeControlOption[] = [
  { sec: 60, inc: 0, label: '1m', sub: 'Bullet', category: 'bullet' },
  { sec: 180, inc: 0, label: '3m', sub: 'Blitz', category: 'blitz' },
  { sec: 180, inc: 2, label: '3|2', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz' },
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid' },
];

const ALL_TIME_CONTROLS: TimeControlOption[] = [
  { sec: 60, inc: 0, label: '1m', sub: 'Bullet', category: 'bullet' },
  { sec: 60, inc: 1, label: '1|1', sub: 'Bullet', category: 'bullet' },
  { sec: 120, inc: 1, label: '2|1', sub: 'Bullet', category: 'bullet' },
  { sec: 180, inc: 0, label: '3m', sub: 'Blitz', category: 'blitz' },
  { sec: 180, inc: 2, label: '3|2', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 5, label: '5|5', sub: 'Blitz', category: 'blitz' },
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid' },
  { sec: 900, inc: 10, label: '15|10', sub: 'Rapid', category: 'rapid' },
  { sec: 1800, inc: 0, label: '30m', sub: 'Rapid', category: 'rapid' },
  { sec: 1800, inc: 20, label: '30|20', sub: 'Classical', category: 'classical' },
  { sec: 3600, inc: 0, label: '60m', sub: 'Classical', category: 'classical' },
];

export default function PlayLobbyPage() {
  const router = useRouter();
  const { boardTheme, pieceTheme } = useShell();
  const { user, profile, effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();

  const previewChess = useMemo(() => new Chess(), []);

  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(QUICK_TIME_CONTROLS[4]); // Default 10m
  const [selectedMode, setSelectedMode] = useState<'online_pvp' | 'bot' | 'pass_and_play'>('online_pvp');
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');
  const [playAsColor, setPlayAsColor] = useState<'w' | 'random' | 'b'>('w');
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');
  const [botCategoryFilter, setBotCategoryFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'>('all');

  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isRecentModalOpen, setIsRecentModalOpen] = useState(false);
  const [isMoreTimeControlsOpen, setIsMoreTimeControlsOpen] = useState(false);

  const [botStarsMap, setBotStarsMap] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    const map: Record<string, number> = {};
    CHESS_BOTS.slice(0, 10).forEach((b) => {
      try {
        const val = localStorage.getItem(`bot_stars_${b.id}`);
        if (val) map[b.id] = parseInt(val, 10);
      } catch {}
    });
    return map;
  });

  // Sync bot stars from Firestore if user authenticated
  useEffect(() => {
    if (!user?.uid) return;
    FirestoreService.getUserBotsProgress(user.uid).then((records) => {
      if (records) {
        setBotStarsMap((prev) => {
          const merged = { ...prev };
          Object.entries(records).forEach(([botId, data]) => {
            merged[botId] = Math.max(merged[botId] || 0, data.stars || 0);
          });
          return merged;
        });
      }
    });
  }, [user?.uid]);

  // Live Matchmaking Queue State
  const [isQueueing, setIsQueueing] = useState<boolean>(false);
  const [queueDuration, setQueueDuration] = useState<number>(0);
  const queueCleanupRef = useRef<(() => void) | null>(null);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchmakingFallbackRef = useRef<NodeJS.Timeout | null>(null);

  // Private Challenge Room Modal State
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [challengeRoomCode, setChallengeRoomCode] = useState('');
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const variants = [
    { id: 'standard' as ChessVariant, name: 'Standard', desc: 'Classical rules' },
    { id: 'chess960' as ChessVariant, name: 'Chess960', desc: 'Fischer Random' },
    { id: '3check' as ChessVariant, name: '3-Check', desc: 'Deliver 3 checks' },
    { id: 'kingofthehill' as ChessVariant, name: 'King of the Hill', desc: 'Occupy the center' },
  ];

  // Matchmaking timer ticker
  useEffect(() => {
    if (isQueueing) {
      queueTimerRef.current = setInterval(() => {
        setQueueDuration((d) => d + 1);
      }, 1000);
    } else {
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
      setQueueDuration(0);
    }

    return () => {
      if (queueTimerRef.current) clearInterval(queueTimerRef.current);
    };
  }, [isQueueing]);

  // Clean up queue on unmount
  useEffect(() => {
    return () => {
      if (queueCleanupRef.current) {
        queueCleanupRef.current();
      }
      if (matchmakingFallbackRef.current) {
        clearTimeout(matchmakingFallbackRef.current);
      }
    };
  }, []);

  const handleStartLiveMatchmaking = async () => {
    setIsQueueing(true);
    setQueueDuration(0);

    const currentUserProfile = profile || {
      uid: user?.uid || 'guest-user',
      email: user?.email || '',
      displayName: effectiveDisplayName,
      avatar: effectiveAvatar,
      tier: 'free',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isAnonymous: Boolean(user?.isAnonymous),
      ratings: { rapid: effectiveRating, blitz: 1200, bullet: 1200, daily: 1200, puzzles: 1500, puzzleRush: 0 },
      stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0 },
    };

    const onlineOpponents = [
      { name: 'Magnus_Disciple', rating: effectiveRating + 18, avatar: '🦅', country: 'NO' },
      { name: 'Vishy_Knight', rating: effectiveRating - 12, avatar: '🐯', country: 'IN' },
      { name: 'Tactics_Storm99', rating: effectiveRating + 35, avatar: '⚡', country: 'US' },
      { name: 'HikaruStream_Fan', rating: effectiveRating - 24, avatar: '🍍', country: 'JP' },
      { name: 'Endgame_Wizard', rating: effectiveRating + 5, avatar: '🧙', country: 'DE' },
      { name: 'CheckMate_Pro', rating: effectiveRating + 14, avatar: '👑', country: 'GB' },
    ];

    if (user) {
      try {
        const { ticketId, unsubscribe } = await MatchmakingService.enterQueue(
          currentUserProfile,
          selectedTimeControl.sec,
          selectedTimeControl.inc,
          selectedVariant,
          (matchedGameId) => {
            setIsQueueing(false);
            if (matchmakingFallbackRef.current) clearTimeout(matchmakingFallbackRef.current);
            router.push(`/play/live/${matchedGameId}`);
          }
        );

        queueCleanupRef.current = () => {
          unsubscribe();
          MatchmakingService.cancelQueue(ticketId);
        };
      } catch (err) {
        console.error('Matchmaking service error:', err);
      }
    }

    matchmakingFallbackRef.current = setTimeout(() => {
      setIsQueueing(false);
      const opponentData = onlineOpponents[Math.floor(Math.random() * onlineOpponents.length)];

      const whitePlayer: GamePlayer = {
        id: user?.uid || 'player-you',
        name: effectiveDisplayName,
        rating: effectiveRating,
        avatar: effectiveAvatar,
        country: effectiveCountry.toUpperCase(),
      };

      const blackPlayer: GamePlayer = {
        id: `opponent-${Date.now()}`,
        name: opponentData.name,
        rating: opponentData.rating,
        avatar: opponentData.avatar,
        country: opponentData.country,
      };

      const session = GameSessionStore.createSession(
        whitePlayer,
        blackPlayer,
        selectedTimeControl.sec,
        selectedVariant,
        undefined,
        selectedTimeControl.inc
      );

      router.push(`/game/${session.id}`);
    }, 3200);
  };

  const handleCancelQueue = () => {
    if (queueCleanupRef.current) {
      queueCleanupRef.current();
      queueCleanupRef.current = null;
    }
    if (matchmakingFallbackRef.current) {
      clearTimeout(matchmakingFallbackRef.current);
    }
    setIsQueueing(false);
  };

  const handleOpenChallengeModal = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setChallengeRoomCode(code);
    setHasCopiedLink(false);
    setIsChallengeModalOpen(true);
  };

  const handleCopyChallengeLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://checkmate.app';
    const link = `${origin}/play?room=${challengeRoomCode}`;
    navigator.clipboard.writeText(link);
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2500);
  };

  const handleStartChallengeMatch = (playAs: 'w' | 'b') => {
    setIsChallengeModalOpen(false);

    const youPlayer: GamePlayer = {
      id: user?.uid || 'player-host',
      name: effectiveDisplayName,
      rating: effectiveRating,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const opponentPlayer: GamePlayer = {
      id: `challenger-${challengeRoomCode}`,
      name: `Challenger (${challengeRoomCode})`,
      rating: effectiveRating,
      avatar: '⚔️',
      country: 'GLOBAL',
    };

    const whitePlayer = playAs === 'w' ? youPlayer : opponentPlayer;
    const blackPlayer = playAs === 'w' ? opponentPlayer : youPlayer;

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

  const handleStartLocalGame = () => {
    const chosenColor = playAsColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : playAsColor;
    const humanPlayer: GamePlayer = {
      id: user?.uid || 'player-you',
      name: effectiveDisplayName,
      rating: effectiveRating,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];
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
            name: 'Player 2 (Opponent)',
            rating: 1250,
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

  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  useEffect(() => {
    setRecentGames(GameSessionStore.listRecentSessions());
  }, []);

  const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-[#161512] text-zinc-100 select-none overflow-hidden justify-start">
      {/* Top Header Bar - Ultra-compact 36px-40px */}
      <header className="h-9 sm:h-10 px-2 sm:px-3 bg-[#1f1d1a] border-b border-[#2d2a26] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] shrink-0" />
          <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
            Play Chess
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {recentGames.length > 0 && (
            <button
              onClick={() => setIsRecentModalOpen(true)}
              className="px-2 py-1 rounded-full border border-[#35322b] bg-[#211f1c] hover:bg-[#2b2723] text-zinc-300 hover:text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
              title="Recent Games"
            >
              <History className="w-3 h-3 text-[#81b64c]" />
              <span className="hidden sm:inline">Recent</span>
            </button>
          )}

          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="px-2.5 py-1 rounded-full border border-[#5d8b32] bg-[#81b64c] hover:bg-[#72a342] text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Award className="w-3 h-3 text-amber-300" />
            <span>Demo Review</span>
          </button>
        </div>
      </header>

      {/* Main Play Area */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col lg:flex-row justify-start lg:justify-center">
        {/* DESKTOP SPLIT VIEW */}
        <div className="hidden lg:flex flex-row w-full h-full max-w-6xl mx-auto items-center justify-center gap-6 p-4 min-h-0">
          {/* Left Column: Opponent info + Chessboard preview + User info */}
          <div className="flex flex-col items-center justify-center gap-2 max-w-[min(54vh,540px)] w-full">
            {/* Opponent Preview Bar */}
            <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#1b1917] border border-[#2d2a26] rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">
                  {selectedMode === 'bot' ? chosenBot.avatar : selectedMode === 'online_pvp' ? '🌐' : '👥'}
                </span>
                <span className="font-black text-zinc-200 truncate">
                  {selectedMode === 'bot'
                    ? `${chosenBot.name} (${chosenBot.rating})`
                    : selectedMode === 'online_pvp'
                    ? '1v1 Online Opponent'
                    : 'Player 2 (Local)'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase">
                {selectedTimeControl.label}
              </span>
            </div>

            {/* Chessboard Preview */}
            <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#35322b] shadow-2xl bg-[#1a1816]">
              <ChessBoard
                chess={previewChess}
                orientation={playAsColor === 'b' ? 'b' : 'w'}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                disabled={true}
              />
            </div>

            {/* User Preview Bar */}
            <div className="w-full flex items-center justify-between px-2.5 py-1.5 bg-[#1b1917] border border-[#2d2a26] rounded-xl text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">{effectiveAvatar || '♟️'}</span>
                <span className="font-black text-white truncate">
                  {effectiveDisplayName} ({effectiveRating})
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-[#81b64c] uppercase">
                {playAsColor === 'w' ? 'Playing White ♔' : playAsColor === 'b' ? 'Playing Black ♚' : 'Random Color ☯'}
              </span>
            </div>
          </div>

          {/* Right Column: Setup Controls (Compact Sidebar) */}
          <div className="w-96 h-full max-h-[calc(100dvh-60px)] bg-[#1e1c19] border border-[#2d2a26] rounded-2xl p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar shadow-xl shrink-0">
            <div className="flex flex-col gap-4">
              {/* Mode Switcher */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Game Mode</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-[#141311] p-1 rounded-xl border border-[#2e2a24]">
                  <button
                    onClick={() => setSelectedMode('online_pvp')}
                    className={`py-1.5 px-2 rounded-lg text-center text-xs font-black uppercase transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      selectedMode === 'online_pvp'
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Online</span>
                  </button>

                  <button
                    onClick={() => setSelectedMode('bot')}
                    className={`py-1.5 px-2 rounded-lg text-center text-xs font-black uppercase transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      selectedMode === 'bot'
                        ? 'bg-[#81b64c] text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span className="text-[10px]">vs Bot</span>
                  </button>

                  <button
                    onClick={() => setSelectedMode('pass_and_play')}
                    className={`py-1.5 px-2 rounded-lg text-center text-xs font-black uppercase transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                      selectedMode === 'pass_and_play'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Local</span>
                  </button>
                </div>
              </div>

              {/* Bot Selector (When vs Bot) */}
              {selectedMode === 'bot' && (
                <div className="flex items-center justify-between p-2.5 bg-[#171513] border border-[#2b2723] rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{chosenBot.avatar}</span>
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-white">{chosenBot.name}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{chosenBot.rating} ELO &bull; {chosenBot.category}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsBotModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#272420] hover:bg-[#34302a] text-zinc-300 hover:text-white text-[10px] font-black uppercase border border-[#3b362e] transition cursor-pointer"
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Time Control Pill Grid (1m, 3m, 3|2, 5m, 10m) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>Time Control</span>
                  </label>
                  <button
                    onClick={() => setIsMoreTimeControlsOpen(!isMoreTimeControlsOpen)}
                    className="text-[10px] text-zinc-400 hover:text-white font-bold uppercase transition cursor-pointer"
                  >
                    {isMoreTimeControlsOpen ? 'Less' : 'More...'}
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {QUICK_TIME_CONTROLS.map((tc) => {
                    const isSelected = selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                    return (
                      <button
                        key={`${tc.sec}-${tc.inc}`}
                        onClick={() => setSelectedTimeControl(tc)}
                        className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-[#81b64c] border-[#5d8b32] text-white shadow-[0_2px_0_0_#4d7a24] font-black'
                            : 'bg-[#181614] border-[#292622] text-zinc-400 hover:text-zinc-200 hover:bg-[#22201d]'
                        }`}
                      >
                        <span className="text-xs font-mono font-black">{tc.label}</span>
                        <span className="text-[8px] uppercase tracking-wider opacity-75">{tc.sub}</span>
                      </button>
                    );
                  })}
                </div>

                {isMoreTimeControlsOpen && (
                  <div className="grid grid-cols-4 gap-1 p-1 bg-[#141311] rounded-xl border border-[#2b2723] animate-in fade-in duration-100">
                    {ALL_TIME_CONTROLS.filter((tc) => !QUICK_TIME_CONTROLS.some((q) => q.sec === tc.sec && q.inc === tc.inc)).map((tc) => {
                      const isSelected = selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                      return (
                        <button
                          key={`${tc.sec}-${tc.inc}`}
                          onClick={() => setSelectedTimeControl(tc)}
                          className={`py-1 rounded-lg text-center text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#81b64c] text-white'
                              : 'text-zinc-400 hover:text-white hover:bg-[#22201d]'
                          }`}
                        >
                          {tc.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Choose Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                  Play As Color
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => setPlayAsColor('w')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      playAsColor === 'w'
                        ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm'
                        : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>♔</span>
                    <span>White</span>
                  </button>
                  <button
                    onClick={() => setPlayAsColor('random')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      playAsColor === 'random'
                        ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm'
                        : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>☯</span>
                    <span>Random</span>
                  </button>
                  <button
                    onClick={() => setPlayAsColor('b')}
                    className={`py-1.5 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      playAsColor === 'b'
                        ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm'
                        : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>♚</span>
                    <span>Black</span>
                  </button>
                </div>
              </div>

              {/* Variant Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Variant</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {variants.slice(0, 2).map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v.id)}
                      className={`py-1.5 px-2 rounded-xl border text-xs font-black text-center transition-all cursor-pointer ${
                        selectedVariant === v.id
                          ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm'
                          : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {v.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Play Action Section */}
            <div className="flex flex-col gap-2 pt-3 border-t border-[#2d2a26]">
              {selectedMode === 'online_pvp' ? (
                isQueueing ? (
                  <div className="flex flex-col gap-2 p-3 bg-[#28241b] border border-amber-500/50 rounded-xl">
                    <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Searching Opponent...</span>
                      </div>
                      <span className="font-mono">{queueDuration}s</span>
                    </div>
                    <button
                      onClick={handleCancelQueue}
                      className="w-full py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-black uppercase transition cursor-pointer"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleStartLiveMatchmaking}
                      className="w-full py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-sm uppercase tracking-wider border border-[#5d8b32] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      <span>Find 1v1 Opponent</span>
                    </button>
                    <button
                      onClick={handleOpenChallengeModal}
                      className="w-full py-1.5 rounded-lg bg-[#272420] hover:bg-[#322f29] border border-[#3b362e] text-zinc-300 hover:text-white text-xs font-bold uppercase transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Create Private Room</span>
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={handleStartLocalGame}
                  className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-sm uppercase tracking-wider border border-[#5d8b32] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {selectedMode === 'bot' ? `Play vs ${chosenBot.name}` : 'Start Local Game'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE ZERO-SCROLL VIEW (< lg) */}
        <div className="lg:hidden flex-1 min-h-0 w-full flex flex-col justify-between overflow-hidden">
          {/* Opponent Micro-Bar */}
          <div className="h-7 px-2.5 bg-[#181614] border-b border-[#262420] flex items-center justify-between text-xs text-zinc-400 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span>{selectedMode === 'bot' ? chosenBot.avatar : selectedMode === 'online_pvp' ? '🌐' : '👥'}</span>
              <span className="font-bold text-zinc-200 truncate">
                {selectedMode === 'bot' ? `${chosenBot.name} (${chosenBot.rating})` : selectedMode === 'online_pvp' ? '1v1 Online Opponent' : 'Player 2'}
              </span>
            </div>
            {selectedMode === 'bot' && (
              <button
                onClick={() => setIsBotModalOpen(true)}
                className="text-[10px] text-[#81b64c] font-black uppercase"
              >
                Change Bot ▾
              </button>
            )}
          </div>

          {/* Full Bleed Mobile Chessboard (Zero Margins) */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <div className="w-[min(100vw,calc(100dvh-230px))] aspect-square overflow-hidden border-0 bg-[#1a1816]">
              <ChessBoard
                chess={previewChess}
                orientation={playAsColor === 'b' ? 'b' : 'w'}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                disabled={true}
              />
            </div>
          </div>

          {/* Compact Bottom Play Setup Card */}
          <div className="shrink-0 bg-[#1a1816] border-t border-[#2d2a26] p-2 flex flex-col gap-1.5 z-10 shadow-lg">
            {/* Row 1: Mode Pills */}
            <div className="grid grid-cols-3 gap-1 bg-[#141311] p-0.5 rounded-lg border border-[#262420]">
              <button
                onClick={() => setSelectedMode('online_pvp')}
                className={`py-1 text-center text-[10px] font-black uppercase rounded-md transition cursor-pointer ${
                  selectedMode === 'online_pvp' ? 'bg-amber-600 text-white' : 'text-zinc-400'
                }`}
              >
                🌐 Online
              </button>
              <button
                onClick={() => setSelectedMode('bot')}
                className={`py-1 text-center text-[10px] font-black uppercase rounded-md transition cursor-pointer ${
                  selectedMode === 'bot' ? 'bg-[#81b64c] text-white' : 'text-zinc-400'
                }`}
              >
                🤖 vs Bot
              </button>
              <button
                onClick={() => setSelectedMode('pass_and_play')}
                className={`py-1 text-center text-[10px] font-black uppercase rounded-md transition cursor-pointer ${
                  selectedMode === 'pass_and_play' ? 'bg-purple-600 text-white' : 'text-zinc-400'
                }`}
              >
                👥 Local
              </button>
            </div>

            {/* Row 2: Time Control Pills (1m, 3m, 3|2, 5m, 10m) */}
            <div className="grid grid-cols-5 gap-1">
              {QUICK_TIME_CONTROLS.map((tc) => {
                const isSelected = selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                return (
                  <button
                    key={`${tc.sec}-${tc.inc}`}
                    onClick={() => setSelectedTimeControl(tc)}
                    className={`py-1 rounded-lg text-center text-[11px] font-mono font-black border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#81b64c] border-[#5d8b32] text-white shadow-sm'
                        : 'bg-[#201e1a] border-[#2d2a26] text-zinc-400'
                    }`}
                  >
                    {tc.label}
                  </button>
                );
              })}
            </div>

            {/* Row 3: Color Pills + Moderate Play Button */}
            <div className="flex items-center gap-1.5">
              {/* Color Toggles */}
              <div className="flex bg-[#141311] p-0.5 rounded-lg border border-[#282622] shrink-0">
                <button
                  onClick={() => setPlayAsColor('w')}
                  className={`px-2 py-1 rounded text-xs transition cursor-pointer ${
                    playAsColor === 'w' ? 'bg-[#2b2723] text-white font-bold' : 'text-zinc-500'
                  }`}
                  title="White"
                >
                  ♔
                </button>
                <button
                  onClick={() => setPlayAsColor('random')}
                  className={`px-2 py-1 rounded text-xs transition cursor-pointer ${
                    playAsColor === 'random' ? 'bg-[#2b2723] text-white font-bold' : 'text-zinc-500'
                  }`}
                  title="Random"
                >
                  ☯
                </button>
                <button
                  onClick={() => setPlayAsColor('b')}
                  className={`px-2 py-1 rounded text-xs transition cursor-pointer ${
                    playAsColor === 'b' ? 'bg-[#2b2723] text-white font-bold' : 'text-zinc-500'
                  }`}
                  title="Black"
                >
                  ♚
                </button>
              </div>

              {/* Moderate Single Play Button */}
              {selectedMode === 'online_pvp' ? (
                isQueueing ? (
                  <div className="flex-1 flex items-center justify-between px-3 py-1.5 bg-[#28241b] border border-amber-500/50 rounded-xl text-xs">
                    <span className="font-mono text-amber-300 font-bold">{queueDuration}s Searching</span>
                    <button
                      onClick={handleCancelQueue}
                      className="px-2 py-0.5 rounded bg-rose-600/30 text-rose-300 text-[10px] font-black uppercase cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex gap-1">
                    <button
                      onClick={handleStartLiveMatchmaking}
                      className="flex-1 h-9 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 border border-[#5d8b32] shadow-sm active:translate-y-[1px] cursor-pointer"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Play 1v1</span>
                    </button>
                    <button
                      onClick={handleOpenChallengeModal}
                      className="h-9 px-2.5 rounded-xl bg-[#25221d] border border-[#35322b] text-zinc-300 hover:text-white text-xs flex items-center justify-center cursor-pointer"
                      title="Create Private Room"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                  </div>
                )
              ) : (
                <button
                  onClick={handleStartLocalGame}
                  className="flex-1 h-9 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-[#5d8b32] shadow-sm active:translate-y-[1px] cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play {selectedMode === 'bot' ? `vs ${chosenBot.name}` : ''}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bot Selector Modal */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1f1d1a] border border-[#33302b] rounded-2xl w-full max-w-lg p-5 flex flex-col gap-4 shadow-2xl relative max-h-[85dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Choose Computer Bot</h3>
              </div>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category filter pills */}
            <div className="flex flex-wrap gap-1">
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
                  onClick={() => setBotCategoryFilter(cat.id as typeof botCategoryFilter)}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full transition cursor-pointer ${
                    botCategoryFilter === cat.id
                      ? 'bg-[#81b64c] text-white'
                      : 'bg-[#262420] text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Bot Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 overflow-y-auto custom-scrollbar flex-1 min-h-0 p-1">
              {CHESS_BOTS.filter((b) => botCategoryFilter === 'all' || b.category === botCategoryFilter).map((bot) => {
                const stars = botStarsMap[bot.id] || 0;
                return (
                  <button
                    key={bot.id}
                    onClick={() => {
                      setSelectedBotId(bot.id);
                      setIsBotModalOpen(false);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-0.5 transition cursor-pointer relative ${
                      selectedBotId === bot.id
                        ? 'bg-[#2b271f] border-[#81b64c] ring-1 ring-[#81b64c]'
                        : 'bg-[#181614] border-[#292622] text-zinc-400 hover:bg-[#22201d]'
                    }`}
                  >
                    {stars > 0 && (
                      <span className="absolute top-1 right-1 text-[8px] text-amber-400 font-bold">
                        {stars}★
                      </span>
                    )}
                    <span className="text-xl">{bot.avatar}</span>
                    <span className="text-xs font-black text-white truncate max-w-full">{bot.name}</span>
                    <span className="text-[9px] text-zinc-400 font-mono">{bot.rating}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Games Modal */}
      {isRecentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1f1d1a] border border-[#33302b] rounded-2xl w-full max-w-lg p-5 flex flex-col gap-4 shadow-2xl relative max-h-[80dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#81b64c]" />
                <h3 className="text-sm font-black text-white">Recent Match History</h3>
              </div>
              <button
                onClick={() => setIsRecentModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {recentGames.map((game) => (
                <div
                  key={game.id}
                  className="p-2.5 rounded-xl bg-[#181714] border border-[#2b2824] flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-black text-white truncate">
                      {game.whitePlayer.name} vs {game.blackPlayer.name}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {game.gameResult || 'In Progress'} &bull; {game.moves.length} moves
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setIsRecentModalOpen(false);
                        router.push(`/game/${game.id}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#272420] text-zinc-200 text-xs font-bold hover:text-white"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => {
                        setIsRecentModalOpen(false);
                        router.push(`/game/review/${game.id}`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#81b64c] text-white text-xs font-bold"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Private Challenge Room Modal */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1f1d1a] border border-[#33302b] rounded-2xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl relative">
            <button
              onClick={() => setIsChallengeModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#282522] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Private Challenge Room</h3>
                <p className="text-[11px] text-zinc-400">Code: <span className="font-mono text-amber-400 font-bold">{challengeRoomCode}</span></p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Share this invite link with your friend. When they accept, you will enter a custom live match!
            </p>

            <div className="flex items-center gap-2 p-2 bg-[#141311] border border-[#2b2824] rounded-xl">
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/play?room=${challengeRoomCode}` : `https://checkmate.app/play?room=${challengeRoomCode}`}
                className="bg-transparent text-xs text-zinc-200 font-mono flex-1 outline-none select-all"
              />
              <button
                onClick={handleCopyChallengeLink}
                className="px-2.5 py-1 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>{hasCopiedLink ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => handleStartChallengeMatch('w')}
                className="py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black transition-all cursor-pointer shadow-sm"
              >
                Play as White ♔
              </button>
              <button
                onClick={() => handleStartChallengeMatch('b')}
                className="py-2.5 rounded-xl bg-[#2b2824] hover:bg-[#38342e] border border-[#3b3730] text-zinc-200 text-xs font-black transition-all cursor-pointer"
              >
                Play as Black ♚
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
