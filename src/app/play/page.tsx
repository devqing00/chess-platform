'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  Globe,
  Loader2,
  X,
  Share2,
  History,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { FirestoreService } from '@/lib/firebase/firestoreService';

interface TimeControlOption {
  sec: number;
  inc: number;
  label: string;
  sub: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
  icon?: string;
}

const QUICK_TIME_CONTROLS: TimeControlOption[] = [
  { sec: 60, inc: 0, label: '1m', sub: 'Bullet', category: 'bullet', icon: '⚡' },
  { sec: 180, inc: 0, label: '3m', sub: 'Blitz', category: 'blitz', icon: '🔥' },
  { sec: 180, inc: 2, label: '3|2', sub: 'Blitz', category: 'blitz', icon: '🔥' },
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz', icon: '🔥' },
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid', icon: '⏱️' },
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
  const { user, profile, effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();

  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(QUICK_TIME_CONTROLS[4]); // Default 10m
  const [selectedMode, setSelectedMode] = useState<'online_pvp' | 'bot' | 'pass_and_play'>('bot');
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
    CHESS_BOTS.slice(0, 15).forEach((b) => {
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
    { id: 'kingofthehill' as ChessVariant, name: 'King of Hill', desc: 'Occupy center' },
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
  const filteredBots = CHESS_BOTS.filter(
    (b) => botCategoryFilter === 'all' || b.category === botCategoryFilter
  );

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] w-full bg-[#161512] text-zinc-100 select-none overflow-hidden justify-start">
      {/* Top Header Bar - Ultra-compact 38px */}
      <header className="h-9 sm:h-10 px-3 bg-[#1e1c19] border-b border-[#2d2a26] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c] shadow-[0_0_8px_#81b64c80] shrink-0" />
          <h1 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
            Play Arena
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {recentGames.length > 0 && (
            <button
              onClick={() => setIsRecentModalOpen(true)}
              className="px-2.5 py-1 rounded-lg border border-[#35322b] bg-[#24211d] hover:bg-[#2e2a25] text-zinc-300 hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#81b64c]" />
              <span className="hidden sm:inline">Recent Games</span>
            </button>
          )}

          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="px-2.5 py-1 rounded-lg border border-[#5d8b32] bg-[#81b64c] hover:bg-[#72a342] text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:translate-y-[1px] transition cursor-pointer"
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            <span>Demo Review</span>
          </button>
        </div>
      </header>

      {/* Main Play Hub Container */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto lg:overflow-hidden p-2 sm:p-4 flex items-center justify-center">
        <div className="w-full max-w-5xl h-auto max-h-full flex flex-col lg:flex-row gap-4 items-stretch justify-center">
          
          {/* LEFT / CENTER INTERACTIVE SECTION (Desktop Only) */}
          <div className="hidden lg:flex flex-1 min-w-0 flex-col gap-3 bg-[#1b1917] border border-[#2d2a26] rounded-2xl p-3.5 sm:p-5 shadow-xl overflow-hidden">
            
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2a26] gap-2">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-wider hidden sm:inline">
                Choose Mode:
              </span>
              <div className="grid grid-cols-3 gap-1.5 flex-1 sm:flex-initial bg-[#141311] p-1 rounded-xl border border-[#282622]">
                <button
                  onClick={() => setSelectedMode('bot')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedMode === 'bot'
                      ? 'bg-[#81b64c] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>vs Computer</span>
                </button>

                <button
                  onClick={() => setSelectedMode('online_pvp')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedMode === 'online_pvp'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>1v1 Online</span>
                </button>

                <button
                  onClick={() => setSelectedMode('pass_and_play')}
                  className={`py-1.5 px-3 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    selectedMode === 'pass_and_play'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Pass &amp; Play</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: VS COMPUTER BOTS */}
            {selectedMode === 'bot' && (
              <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Select Bot Opponent
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-[#262420] text-zinc-400 font-mono text-[10px]">
                      {filteredBots.length} Available
                    </span>
                  </div>

                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'beginner', label: 'Beginner' },
                      { id: 'intermediate', label: 'Intermediate' },
                      { id: 'advanced', label: 'Advanced' },
                      { id: 'master', label: 'Master' },
                      { id: 'grandmaster', label: 'GM' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setBotCategoryFilter(cat.id as typeof botCategoryFilter)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition cursor-pointer shrink-0 ${
                          botCategoryFilter === cat.id
                            ? 'bg-[#81b64c] text-white'
                            : 'bg-[#22201d] text-zinc-400 hover:text-white'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bot Cards Grid / Roster */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 overflow-y-auto max-h-[280px] sm:max-h-[340px] pr-1 custom-scrollbar">
                  {filteredBots.map((bot) => {
                    const isSelected = selectedBotId === bot.id;
                    const stars = botStarsMap[bot.id] || 0;
                    return (
                      <button
                        key={bot.id}
                        onClick={() => setSelectedBotId(bot.id)}
                        className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition cursor-pointer relative ${
                          isSelected
                            ? 'bg-[#28251e] border-[#81b64c] ring-1 ring-[#81b64c] shadow-md'
                            : 'bg-[#181614] border-[#292622] hover:bg-[#201e1a] hover:border-[#38342c]'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#24211c] border border-[#353128] flex items-center justify-center text-2xl shrink-0">
                          {bot.avatar}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-white truncate">{bot.name}</span>
                            {stars > 0 && (
                              <span className="text-[10px] text-amber-400 font-bold">
                                {stars}★
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-mono text-[#81b64c] font-bold">{bot.rating}</span>
                            <span className="text-zinc-500 uppercase text-[9px]">&bull; {bot.category}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: 1V1 ONLINE PVP */}
            {selectedMode === 'online_pvp' && (
              <div className="flex-1 min-h-0 flex flex-col gap-3 justify-center">
                <div className="bg-[#181614] border border-[#2b2723] rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-2xl text-amber-400">
                      🌐
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white">Live Multiplayer Matchmaking</h3>
                      <p className="text-xs text-zinc-400">
                        Ranked competitive play based on your current rating ({effectiveRating} ELO).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleOpenChallengeModal}
                    className="px-3 py-1.5 rounded-xl bg-[#26231e] hover:bg-[#322e28] border border-[#3b362e] text-zinc-200 text-xs font-bold uppercase transition flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Share2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Invite Friend</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: '1 min', sub: 'Bullet', sec: 60, inc: 0, icon: '⚡' },
                    { label: '3 min', sub: 'Blitz', sec: 180, inc: 0, icon: '🔥' },
                    { label: '5 min', sub: 'Blitz', sec: 300, inc: 0, icon: '🔥' },
                    { label: '10 min', sub: 'Rapid', sec: 600, inc: 0, icon: '⏱️' },
                  ].map((tc) => {
                    const isSelected = selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                    return (
                      <button
                        key={`${tc.sec}-${tc.inc}`}
                        onClick={() => setSelectedTimeControl({ ...tc, category: tc.sub.toLowerCase() as any })}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#29251d] border-[#81b64c] text-white ring-1 ring-[#81b64c]'
                            : 'bg-[#181614] border-[#292622] text-zinc-400 hover:text-white hover:bg-[#201e1a]'
                        }`}
                      >
                        <span className="text-base">{tc.icon}</span>
                        <span className="text-sm font-mono font-black text-white">{tc.label}</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-400">{tc.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PASS & PLAY */}
            {selectedMode === 'pass_and_play' && (
              <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center p-4 gap-3 bg-[#181614] border border-[#292622] rounded-xl">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-3xl text-purple-400 shadow">
                  👥
                </div>
                <div className="flex flex-col items-center max-w-sm">
                  <h3 className="text-base font-black text-white">Pass &amp; Play Tabletop</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Play with a friend on this device. The board automatically rotates or maintains standard orientation for casual analysis and over-the-board play.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT / MAIN PLAY CONSOLE */}
          <div className="w-full lg:w-80 xl:w-96 bg-[#1e1c19] border border-[#2d2a26] rounded-2xl p-3.5 sm:p-5 shadow-xl flex flex-col gap-3 shrink-0 justify-start">
            
            {/* Mobile Mode Switcher Tabs (< lg screens) */}
            <div className="flex lg:hidden items-center justify-between pb-2.5 border-b border-[#2d2a26] gap-2">
              <div className="grid grid-cols-3 gap-1.5 w-full bg-[#141311] p-1 rounded-xl border border-[#282622]">
                <button
                  onClick={() => setSelectedMode('bot')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    selectedMode === 'bot'
                      ? 'bg-[#81b64c] text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Bots</span>
                </button>

                <button
                  onClick={() => setSelectedMode('online_pvp')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    selectedMode === 'online_pvp'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Online</span>
                </button>

                <button
                  onClick={() => setSelectedMode('pass_and_play')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    selectedMode === 'pass_and_play'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Local</span>
                </button>
              </div>
            </div>

            {/* Selected Opponent / Mode Banner */}
            <div className="p-3 bg-[#151412] border border-[#282622] rounded-xl flex items-center justify-between gap-3">
              {selectedMode === 'bot' ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#24211c] border border-[#363229] flex items-center justify-center text-2xl shrink-0">
                      {chosenBot.avatar}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-black text-white truncate">{chosenBot.name}</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30">
                          {chosenBot.rating} ELO
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate max-w-[170px]">{chosenBot.bio}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setIsBotModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#272420] hover:bg-[#332f29] border border-[#3c372f] text-zinc-300 hover:text-white text-[10px] font-bold uppercase cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                </>
              ) : selectedMode === 'online_pvp' ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">🌐</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">Online 1v1 Match</span>
                    <span className="text-[10px] text-zinc-400">Target rating: {effectiveRating} &bull; Ranked</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-2xl">👥</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white">Local Pass &amp; Play</span>
                    <span className="text-[10px] text-zinc-400">2 Players &bull; Same Device</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Bot Carousel (Mobile only, < lg) */}
            {selectedMode === 'bot' && (
              <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 -mt-1">
                {CHESS_BOTS.slice(0, 8).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBotId(b.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shrink-0 transition cursor-pointer border ${
                      selectedBotId === b.id
                        ? 'bg-[#81b64c] text-white border-[#5d8b32] shadow-sm'
                        : 'bg-[#181614] text-zinc-400 hover:text-white border-[#2b2824]'
                    }`}
                  >
                    <span>{b.avatar}</span>
                    <span>{b.name}</span>
                    <span className="opacity-75 font-mono text-[9px]">{b.rating}</span>
                  </button>
                ))}
                <button
                  onClick={() => setIsBotModalOpen(true)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-[#262420] text-amber-400 hover:text-amber-300 border border-amber-500/30 shrink-0 cursor-pointer"
                >
                  + All
                </button>
              </div>
            )}

            {/* Time Control Pills */}
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
                      className={`py-1.5 px-1 rounded-xl text-center transition cursor-pointer flex flex-col items-center justify-center border ${
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
                <div className="grid grid-cols-4 gap-1 p-1.5 bg-[#141311] rounded-xl border border-[#282622] animate-in fade-in">
                  {ALL_TIME_CONTROLS.filter((tc) => !QUICK_TIME_CONTROLS.some((q) => q.sec === tc.sec && q.inc === tc.inc)).map((tc) => {
                    const isSelected = selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                    return (
                      <button
                        key={`${tc.sec}-${tc.inc}`}
                        onClick={() => setSelectedTimeControl(tc)}
                        className={`py-1 rounded-lg text-center text-[10px] font-mono font-bold transition cursor-pointer ${
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

            {/* Play As Color */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
                Play As Color
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setPlayAsColor('w')}
                  className={`py-2 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    playAsColor === 'w'
                      ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm ring-1 ring-[#81b64c]'
                      : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">♔</span>
                  <span>White</span>
                </button>
                <button
                  onClick={() => setPlayAsColor('random')}
                  className={`py-2 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    playAsColor === 'random'
                      ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm ring-1 ring-[#81b64c]'
                      : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">☯</span>
                  <span>Random</span>
                </button>
                <button
                  onClick={() => setPlayAsColor('b')}
                  className={`py-2 px-2 rounded-xl border text-xs font-black uppercase flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    playAsColor === 'b'
                      ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm ring-1 ring-[#81b64c]'
                      : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="text-sm">♚</span>
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
                    className={`py-1.5 px-2 rounded-xl border text-xs font-black text-center transition cursor-pointer ${
                      selectedVariant === v.id
                        ? 'bg-[#272420] border-[#81b64c] text-white shadow-sm ring-1 ring-[#81b64c]'
                        : 'bg-[#171513] border-[#2b2723] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* ACTION PLAY BUTTON - Positioned directly underneath with zero gap voids */}
            <div className="pt-2 border-t border-[#2d2a26]">
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
                      className="w-full py-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-black uppercase transition cursor-pointer"
                    >
                      Cancel Search
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleStartLiveMatchmaking}
                      className="w-full py-3 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-sm uppercase tracking-wider border border-[#5d8b32] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] transition-all cursor-pointer flex items-center justify-center gap-2"
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
      </div>

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

      {/* All Bots Modal */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in">
          <div className="bg-[#1f1d1a] border border-[#33302b] rounded-2xl w-full max-w-2xl p-4 sm:p-5 flex flex-col gap-3 shadow-2xl relative max-h-[85dvh] overflow-hidden">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#81b64c]" />
                <h3 className="text-sm font-black text-white">Select Chess Bot</h3>
              </div>
              <button
                onClick={() => setIsBotModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#282522] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
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
                  onClick={() => setBotCategoryFilter(cat.id as any)}
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shrink-0 transition cursor-pointer border ${
                    botCategoryFilter === cat.id
                      ? 'bg-[#81b64c] text-white border-[#5d8b32]'
                      : 'bg-[#181614] text-zinc-400 hover:text-white border-[#2b2824]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Bots grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto custom-scrollbar flex-1 min-h-0 pr-1">
              {filteredBots.map((bot) => (
                <button
                  key={bot.id}
                  onClick={() => {
                    setSelectedBotId(bot.id);
                    setIsBotModalOpen(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                    selectedBotId === bot.id
                      ? 'bg-[#272420] border-[#81b64c] text-white ring-1 ring-[#81b64c]'
                      : 'bg-[#181614] border-[#292622] text-zinc-300 hover:bg-[#22201d]'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#24211c] border border-[#363229] flex items-center justify-center text-xl shrink-0">
                    {bot.avatar}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-black text-white truncate">{bot.name}</span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold">{bot.rating} ELO</span>
                    <span className="text-[10px] text-zinc-400 truncate mt-0.5">{bot.playStyle || 'Tactical'}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
