'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chess } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer, PieceColor } from '@/types/chess';
import { GameSessionStore, getSessionUserOutcome } from '@/lib/gameSessionStore';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { Button } from '@/components/ui/button';
import { soundService } from '@/lib/audioService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import {
  Bot,
  Swords,
  Play,
  Sparkles,
  Star,
  Trophy,
  Search,
  RotateCcw,
  Check,
  ArrowRight,
  History,
  Flame,
  Zap,
  Award,
  X,
  Shield,
  Layers,
  ChevronRight,
  RotateCw,
  Loader2,
  Sliders,
} from 'lucide-react';

type BotScreen = 'ring' | 'roster' | 'fen_spar' | 'vault';

const BOT_TIME_CONTROLS = [
  { sec: 180, inc: 0, label: '3 min', sub: 'Blitz' },
  { sec: 300, inc: 0, label: '5 min', sub: 'Blitz' },
  { sec: 600, inc: 0, label: '10 min', sub: 'Rapid', popular: true },
  { sec: 900, inc: 10, label: '15 | 10', sub: 'Rapid' },
];

const PRESET_SPARRING_POSITIONS = [
  {
    name: 'Greek Gift Bishop Sacrifice',
    category: 'Attacking King',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/3p4/2PP4/2N1PN2/PP1Q1PPP/R3KB1R w KQ - 0 8',
    description: 'Bxh7+ sacrifice opportunity to shatter Black castled king structure.',
  },
  {
    name: 'ChiefTbot Move 7 Blunder Defense',
    category: 'Opening Trap',
    fen: 'r1bqkb1r/pppp1ppp/2n4n/3Q4/2BpP3/5N2/PPP2PPP/RNB1K2R b KQkq - 1 7',
    description: 'White played 7. Qd5 threatening mate on f7. Find the resilient defense (7... Qe7 or 7... d6)!',
  },
  {
    name: 'Lucena Winning Rook Endgame',
    category: 'Endgame Conversion',
    fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
    description: 'Build a bridge with the White rook to shield the king and promote.',
  },
  {
    name: 'Opposite-Castling Flank Attack',
    category: 'Sharp Middlegame',
    fen: 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NP1N2/PPP1QPPP/R3K2R w KQkq - 0 8',
    description: 'Mutual king attack race: launch your h-pawn and g-pawn pawn storm.',
  },
];

function ComputerBotsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { boardTheme, pieceTheme } = useShell();
  const { effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry, user } = useAuth();
  const { profile: xpProfile } = useXpSystem();

  // Sub-screen navigation ("Screens, Not Pages" architecture)
  const [activeScreen, setActiveScreen] = useState<BotScreen>('ring');

  // Selected bot state
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');
  const [playAsColor, setPlayAsColor] = useState<'w' | 'random' | 'b'>('w');
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600); // 10m Rapid default
  const [activeCustomFen, setActiveCustomFen] = useState<string | null>(null);

  // Roster filters
  const [rosterCategory, setRosterCategory] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Bot stars progress map
  const [botStarsMap, setBotStarsMap] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    const map: Record<string, number> = {};
    CHESS_BOTS.forEach((b) => {
      try {
        const val = localStorage.getItem(`bot_stars_${b.id}`);
        if (val) map[b.id] = parseInt(val, 10);
      } catch {}
    });
    return map;
  });

  // Recent bot match sessions
  const [recentBotGames, setRecentBotGames] = useState(() => {
    try {
      const all = GameSessionStore.listRecentSessions();
      return all.filter((g) => g.whitePlayer?.isBot || g.blackPlayer?.isBot);
    } catch {
      return [];
    }
  });

  // Read URL search params (e.g. ?id=martin or ?fen=...)
  useEffect(() => {
    if (!searchParams) return;
    const botParam = searchParams.get('id');
    const fenParam = searchParams.get('fen');

    if (botParam) {
      const found = CHESS_BOTS.find((b) => b.id === botParam);
      if (found) setSelectedBotId(found.id);
    }
    if (fenParam) {
      try {
        const decoded = decodeURIComponent(fenParam);
        setActiveCustomFen(decoded);
        setActiveScreen('fen_spar');
      } catch {}
    }
  }, [searchParams]);

  // Sync stars from Firestore if user is authenticated
  useEffect(() => {
    if (!user?.uid) return;
    FirestoreService.getUserBotsProgress(user.uid).then((records) => {
      if (records && Object.keys(records).length > 0) {
        setBotStarsMap((prev) => {
          const merged = { ...prev };
          Object.entries(records).forEach(([botId, data]) => {
            merged[botId] = Math.max(merged[botId] || 0, data.stars || 0);
            try {
              localStorage.setItem(`bot_stars_${botId}`, String(merged[botId]));
            } catch {}
          });
          return merged;
        });
      }
    });
  }, [user?.uid]);

  // The active chosen bot object
  const activeBot = useMemo(() => {
    return CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];
  }, [selectedBotId]);

  // Interactive board preview instance
  const previewBoard = useMemo(() => {
    try {
      if (activeCustomFen) return new Chess(activeCustomFen);
      return new Chess();
    } catch {
      return new Chess();
    }
  }, [activeCustomFen]);

  // Filtered bot list for Roster sub-screen
  const filteredBots = useMemo(() => {
    return CHESS_BOTS.filter((b) => {
      const matchesCategory = rosterCategory === 'all' || b.category === rosterCategory;
      const matchesSearch =
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.rating.toString().includes(searchQuery) ||
        b.playStyle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [rosterCategory, searchQuery]);

  // Overall bot progress statistics
  const botStats = useMemo(() => {
    let defeated = 0;
    let totalStars = 0;
    CHESS_BOTS.forEach((b) => {
      const stars = botStarsMap[b.id] || 0;
      if (stars > 0) defeated++;
      totalStars += stars;
    });
    return {
      defeated,
      total: CHESS_BOTS.length,
      totalStars,
      maxStars: CHESS_BOTS.length * 3,
      pct: Math.round((defeated / CHESS_BOTS.length) * 100),
    };
  }, [botStarsMap]);

  // Start sparring match against active bot
  const handleStartGame = (overrideColor?: 'w' | 'b' | 'random') => {
    const chosenColor = overrideColor || playAsColor;
    const resolvedSide: 'w' | 'b' =
      chosenColor === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : chosenColor;

    const userPlayer: GamePlayer = {
      id: user?.uid || 'player-you',
      name: effectiveDisplayName,
      rating: effectiveRating || 1200,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const botPlayer: GamePlayer = {
      id: activeBot.id,
      name: activeBot.name,
      rating: activeBot.rating,
      avatar: activeBot.avatar,
      title: activeBot.rating >= 2800 ? 'GM' : 'BOT',
      isBot: true,
    };

    const whitePlayer = resolvedSide === 'w' ? userPlayer : botPlayer;
    const blackPlayer = resolvedSide === 'w' ? botPlayer : userPlayer;

    const session = GameSessionStore.createSession(
      whitePlayer,
      blackPlayer,
      selectedTimeControl,
      'standard',
      activeCustomFen || undefined
    );

    router.push(`/game/${session.id}`);
  };

  return (
    <div className="flex-1 flex flex-col min-h-full xl:h-full bg-[#161512] text-zinc-100 overflow-y-auto xl:overflow-hidden select-none min-w-0 pb-24 md:pb-6">
      {/* 1. TOP HEADER & SUB-SCREEN SWITCHER */}
      <header className="border-b border-white/5 shrink-0 bg-[#141311] z-20 flex flex-col lg:flex-row lg:items-center lg:justify-between px-3 sm:px-4 py-2 lg:py-0 lg:h-12 gap-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                <span>Computer Personalities</span>
              </h1>
            </div>
          </div>

          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 shrink-0">
            {botStats.defeated}/{botStats.total} Defeated
          </span>
        </div>

        {/* 4 Segmented Sub-Screen Switcher Pills - Scrollable row on mobile & tablet, inline on desktop */}
        <div className="flex items-center gap-1.5 p-1 bg-[#1c1a17] rounded-xl border border-white/5 text-xs font-bold overflow-x-auto scrollbar-none w-full lg:w-auto">
          {[
            { id: 'ring' as const, label: 'Sparring Ring' },
            { id: 'roster' as const, label: `All Bots (${CHESS_BOTS.length})` },
            { id: 'fen_spar' as const, label: 'Custom FEN' },
            { id: 'vault' as const, label: 'Trophies' },
          ].map((screen) => {
            const isActive = activeScreen === screen.id;
            return (
              <button
                key={screen.id}
                onClick={() => {
                  soundService.playTactilePop();
                  setActiveScreen(screen.id);
                }}
                className={`tactile-btn flex-1 lg:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap text-center text-xs select-none ${
                  isActive
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_2px_0_0_#385a16]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                }`}
              >
                {screen.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* 2. MAIN SUB-SCREEN VIEWPORT */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-visible lg:overflow-hidden">
        {/* ========================================================================= */}
        {/* SUB-SCREEN 1: SPARRING RING (CHALLENGER SPOTLIGHT) */}
        {/* ========================================================================= */}
        {activeScreen === 'ring' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-visible lg:overflow-hidden">
            {/* Left: Interactive Preview Board */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-visible lg:overflow-hidden">
              <div className="w-[min(calc(100vw-3.5rem),calc(100dvh-200px),460px)] aspect-square relative">
                <ChessBoard
                  chess={previewBoard}
                  orientation={playAsColor === 'b' ? 'b' : 'w'}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  disabled={true}
                />
                {activeCustomFen && (
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm border border-amber-500/40 rounded-lg px-2 py-1 text-[10px] font-bold text-amber-300 flex items-center gap-1.5 shadow-lg">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Custom Position Active</span>
                    <button
                      onClick={() => setActiveCustomFen(null)}
                      className="text-zinc-400 hover:text-white ml-1 cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                )}
              </div>

              {/* Bot Quote Banner */}
              <div className="mt-2.5 w-full max-w-[460px] p-2.5 rounded-xl bg-[#1c1a17] border border-white/5 flex items-center gap-2.5 text-xs">
                <span className="text-xl shrink-0">{activeBot.avatar}</span>
                <p className="text-zinc-300 italic truncate font-medium">
                  &ldquo;{activeBot.quotes.gameStart[0] || activeBot.bio}&rdquo;
                </p>
              </div>
            </div>

            {/* Right: Selected Bot Card, Color & Time Controls */}
            <div className="w-full lg:w-96 flex flex-col justify-between gap-3 min-h-0 bg-[#181614] p-3.5 rounded-2xl border border-white/5">
              <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                {/* Bot Profile Header */}
                <div className="p-3.5 rounded-2xl bg-[#201e1a] border border-white/5 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-black/40 border-2 border-white/10 flex items-center justify-center text-3xl shrink-0 shadow-lg relative">
                    {activeBot.avatar.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={activeBot.avatar} alt={activeBot.name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <span>{activeBot.avatar}</span>
                    )}
                    {(botStarsMap[activeBot.id] || 0) > 0 && (
                      <span className="absolute top-0 right-0 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center text-white text-[9px] font-black">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-white truncate">{activeBot.name}</h3>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {activeBot.rating} Elo
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mt-0.5">
                      {activeBot.category} &bull; {activeBot.playStyle}
                    </span>
                    <p className="text-[11px] text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                      {activeBot.bio}
                    </p>
                  </div>
                </div>

                {/* 3-Star Challenge Tracker */}
                <div className="p-2.5 rounded-xl bg-[#201e1a] border border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Stars Earned</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((starNum) => {
                      const earned = (botStarsMap[activeBot.id] || 0) >= starNum;
                      return (
                        <Star
                          key={starNum}
                          className={`w-4 h-4 ${earned ? 'text-amber-400 fill-amber-400' : 'text-zinc-600'}`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Color Selector */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Select Your Piece Color
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setPlayAsColor('w');
                      }}
                      className={`tactile-btn py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        playAsColor === 'w'
                          ? 'bg-white/15 border-white text-white shadow-xs'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>⚪</span>
                      <span>White</span>
                    </button>
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setPlayAsColor('random');
                      }}
                      className={`tactile-btn py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        playAsColor === 'random'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-xs'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>🌓</span>
                      <span>Random</span>
                    </button>
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setPlayAsColor('b');
                      }}
                      className={`tactile-btn py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        playAsColor === 'b'
                          ? 'bg-white/15 border-zinc-400 text-white shadow-xs'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      <span>⚫</span>
                      <span>Black</span>
                    </button>
                  </div>
                </div>

                {/* Sparring Clock */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Clock Duration
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {BOT_TIME_CONTROLS.map((tc) => (
                      <button
                        key={tc.sec}
                        onClick={() => {
                          soundService.playTactilePop();
                          setSelectedTimeControl(tc.sec);
                        }}
                        className={`tactile-btn p-2 rounded-xl border flex items-center justify-between text-xs font-bold transition cursor-pointer ${
                          selectedTimeControl === tc.sec
                            ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-xs'
                            : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{tc.label}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{tc.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Exactly ONE P1 Anchor Button */}
              <div className="pt-2 border-t border-white/5 shrink-0">
                <Button
                  variant="primary"
                  size="xl"
                  rounded="xl"
                  onClick={() => handleStartGame()}
                  className="w-full flex items-center justify-center gap-2 font-black"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Challenge {activeBot.name}</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 2: ALL BOTS ROSTER */}
        {/* ========================================================================= */}
        {activeScreen === 'roster' && (
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span>Challenger Bot Directory ({filteredBots.length})</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Select any simulated coach, master, or Grandmaster to spar against
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search bot or rating..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 rounded-xl bg-[#141311] border border-white/10 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0 pb-1">
              {[
                { id: 'all', label: 'All Bots' },
                { id: 'beginner', label: 'Beginner (250-700)' },
                { id: 'intermediate', label: 'Intermediate (1300-1600)' },
                { id: 'advanced', label: 'Advanced (1800)' },
                { id: 'master', label: 'Master (2000-2200)' },
                { id: 'grandmaster', label: 'Grandmaster (2800+)' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    soundService.playTactilePop();
                    setRosterCategory(cat.id as typeof rosterCategory);
                  }}
                  className={`tactile-btn text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer whitespace-nowrap ${
                    rosterCategory === cat.id
                      ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_2px_0_0_#385a16]'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Scrollable Bots Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {filteredBots.map((bot) => {
                const isSelected = selectedBotId === bot.id;
                const stars = botStarsMap[bot.id] || 0;
                const isDefeated = stars > 0;

                return (
                  <div
                    key={bot.id}
                    onClick={() => {
                      soundService.playTactilePop();
                      setSelectedBotId(bot.id);
                      setActiveScreen('ring');
                    }}
                    className={`tactile-btn p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                        : 'bg-[#1c1a17] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center text-2xl shrink-0 relative">
                      {bot.avatar.startsWith('http') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{bot.avatar}</span>
                      )}
                      {isDefeated && (
                        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-gradient-to-b from-[#8fd649] to-[#699c30] shadow-[0_1px_0_0_#385a16] rounded-full flex items-center justify-center text-white text-[8px] font-black">
                          ✓
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{bot.name}</span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          {bot.rating}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase font-bold text-zinc-500">
                        {bot.category}
                      </span>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{bot.playStyle}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Exactly ONE P1 Anchor Button */}
            <div className="pt-2 border-t border-white/5 shrink-0">
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={() => setActiveScreen('ring')}
                className="w-full flex items-center justify-center gap-2 font-black"
              >
                <span>Challenge {activeBot.name} in Sparring Ring</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 3: CUSTOM POSITION SPARRING */}
        {/* ========================================================================= */}
        {activeScreen === 'fen_spar' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Custom Position Sparring Hub</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Transfer any position from Analysis Studio or paste a FEN to test against {activeBot.name}
                </p>
              </div>

              {activeCustomFen && (
                <Button
                  variant="outline"
                  size="xs"
                  rounded="lg"
                  onClick={() => setActiveCustomFen(null)}
                  className="font-bold"
                >
                  Clear Custom FEN
                </Button>
              )}
            </div>

            {/* FEN Input Box */}
            <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2 shrink-0">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Active FEN Position</span>
              </span>
              <input
                type="text"
                value={activeCustomFen || ''}
                onChange={(e) => setActiveCustomFen(e.target.value.trim() || null)}
                placeholder="Paste FEN string (e.g. 1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1)"
                className="w-full bg-[#141311] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-emerald-500"
              />
            </div>

            {/* Tactical Scenario Presets List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Or Select a Classical Sparring Scenario
              </span>
              {PRESET_SPARRING_POSITIONS.map((pos, i) => {
                const isSelected = activeCustomFen === pos.fen;
                return (
                  <div
                    key={i}
                    onClick={() => {
                      soundService.playTactilePop();
                      setActiveCustomFen(pos.fen);
                    }}
                    className={`tactile-btn p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                        : 'bg-[#1c1a17] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 uppercase">
                          {pos.category}
                        </span>
                        <h4 className="text-xs font-bold text-white">{pos.name}</h4>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1">{pos.description}</p>
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="xs"
                      rounded="lg"
                      className="shrink-0 font-bold"
                    >
                      {isSelected ? 'Loaded' : 'Load Setup'}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Exactly ONE P1 Anchor Button */}
            <div className="pt-2 border-t border-white/5 shrink-0">
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={() => handleStartGame()}
                className="w-full flex items-center justify-center gap-2 font-black"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>Spar This Position against {activeBot.name}</span>
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 4: TROPHIES & BOT HISTORY */}
        {/* ========================================================================= */}
        {activeScreen === 'vault' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Bot Championship Progression</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Track your stars, conquered computer bots, and past sparring reviews
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400 text-xs font-mono font-black">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{botStats.totalStars} Stars</span>
                </div>
              </div>
            </div>

            {/* Milestone Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Bots Conquered</span>
                <span className="text-xl font-mono font-black text-white">
                  {botStats.defeated} <span className="text-xs text-zinc-500">/ {botStats.total}</span>
                </span>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${botStats.pct}%` }} />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sparring XP Earned</span>
                <span className="text-xl font-mono font-black text-emerald-400">
                  {xpProfile.totalXp} XP
                </span>
                <span className="text-[10px] text-zinc-400">{xpProfile.league.name} League</span>
              </div>

              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Current Training Streak</span>
                <span className="text-xl font-mono font-black text-amber-400 flex items-center gap-1">
                  <Flame className="w-5 h-5 fill-amber-400" />
                  <span>{xpProfile.streak} Days</span>
                </span>
                <span className="text-[10px] text-zinc-400">Consistency bonus active</span>
              </div>
            </div>

            {/* Recent Bot Matches List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Completed Bot Sparring Matches ({recentBotGames.length})
              </span>
              {recentBotGames.length > 0 ? (
                recentBotGames.map((game) => {
                  const outcome = getSessionUserOutcome(game, effectiveDisplayName);
                  const isWin = outcome === 'win';
                  const isLoss = outcome === 'loss';

                  return (
                    <div
                      key={game.id}
                      className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 uppercase tracking-wider ${
                            isWin
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isLoss
                              ? 'bg-red-400/20 text-red-400'
                              : 'bg-zinc-400/20 text-zinc-400'
                          }`}
                        >
                          {isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {game.whitePlayer.name} vs {game.blackPlayer.name}
                          </span>
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
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>Review</span>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <History className="w-6 h-6 text-zinc-600" />
                  <span>No completed bot matches recorded yet. Challenge a bot above!</span>
                </div>
              )}
            </div>

            {/* Exactly ONE P1 Anchor Button */}
            <div className="pt-2 border-t border-white/5 shrink-0">
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={() => setActiveScreen('ring')}
                className="w-full flex items-center justify-center gap-2 font-black"
              >
                <span>Challenge {activeBot.name} in Sparring Ring</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BotsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-full bg-[#161512] text-zinc-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ComputerBotsContent />
    </Suspense>
  );
}
