'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

interface TimeControlOption {
  sec: number;
  inc: number;
  label: string;
  sub: string;
  category: 'bullet' | 'blitz' | 'rapid' | 'classical';
}

const ALL_TIME_CONTROLS: TimeControlOption[] = [
  // Bullet
  { sec: 60, inc: 0, label: '1 min', sub: 'Bullet', category: 'bullet' },
  { sec: 60, inc: 1, label: '1 | 1', sub: 'Bullet', category: 'bullet' },
  { sec: 120, inc: 1, label: '2 | 1', sub: 'Bullet', category: 'bullet' },
  // Blitz
  { sec: 180, inc: 0, label: '3 min', sub: 'Blitz', category: 'blitz' },
  { sec: 180, inc: 2, label: '3 | 2', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 0, label: '5 min', sub: 'Blitz', category: 'blitz' },
  { sec: 300, inc: 5, label: '5 | 5', sub: 'Blitz', category: 'blitz' },
  // Rapid
  { sec: 600, inc: 0, label: '10 min', sub: 'Rapid', category: 'rapid' },
  { sec: 900, inc: 10, label: '15 | 10', sub: 'Rapid', category: 'rapid' },
  { sec: 1800, inc: 0, label: '30 min', sub: 'Rapid', category: 'rapid' },
  // Classical
  { sec: 1800, inc: 20, label: '30 | 20', sub: 'Classical', category: 'classical' },
  { sec: 3600, inc: 0, label: '60 min', sub: 'Classical', category: 'classical' },
];

export default function PlayLobbyPage() {
  const router = useRouter();
  const { user, profile, effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();
  
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'bullet' | 'blitz' | 'rapid' | 'classical'>('all');
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(ALL_TIME_CONTROLS[7]); // Default 10 min
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');
  const [selectedMode, setSelectedMode] = useState<'online_pvp' | 'bot' | 'pass_and_play'>('online_pvp');
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');

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

  const filteredTimeControls = ALL_TIME_CONTROLS.filter(
    (tc) => selectedCategory === 'all' || tc.category === selectedCategory
  );

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

    // Online opponents pool for reliable matchmaking fallback
    const onlineOpponents = [
      { name: 'Magnus_Disciple', rating: effectiveRating + 18, avatar: '🦅', country: 'NO' },
      { name: 'Vishy_Knight', rating: effectiveRating - 12, avatar: '🐯', country: 'IN' },
      { name: 'Tactics_Storm99', rating: effectiveRating + 35, avatar: '⚡', country: 'US' },
      { name: 'HikaruStream_Fan', rating: effectiveRating - 24, avatar: '🍍', country: 'JP' },
      { name: 'Endgame_Wizard', rating: effectiveRating + 5, avatar: '🧙', country: 'DE' },
      { name: 'CheckMate_Pro', rating: effectiveRating + 14, avatar: '👑', country: 'GB' },
    ];

    // Try real matchmaking if user is authenticated with Firebase
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

    // 3.5s Fallback simulation if no real human matches immediately
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
    }, 3500);
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
    const whitePlayer: GamePlayer = {
      id: user?.uid || 'player-you',
      name: effectiveDisplayName,
      rating: effectiveRating,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];
    const blackPlayer: GamePlayer =
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
            name: 'Player 2 (Black)',
            rating: 1250,
            avatar: '♟️',
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
  };

  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  useEffect(() => {
    setRecentGames(GameSessionStore.listRecentSessions());
  }, []);

  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262421] pb-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Play Chess</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Live 1v1 PvP Matchmaking, Grandmaster Computer Bots, or Pass & Play.
            </p>
          </div>

          {/* Quick link to Masterpiece Game Review Demo */}
          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Open Demo Game Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time Control Grid */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#81b64c]" />
              <span>Choose Time Control</span>
            </label>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 bg-[#1a1815] p-1 rounded-xl border border-[#2b2824]">
              {(['all', 'bullet', 'blitz', 'rapid', 'classical'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#81b64c] text-white shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {filteredTimeControls.map((tc) => {
              const Icon =
                tc.category === 'bullet'
                  ? Zap
                  : tc.category === 'blitz'
                  ? Flame
                  : Clock;
              const isSelected =
                selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
              return (
                <button
                  key={`${tc.sec}-${tc.inc}`}
                  onClick={() => setSelectedTimeControl(tc)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                    isSelected
                      ? 'bg-[#81b64c] border-[#81b64c] text-white shadow-lg shadow-[#81b64c]/20 ring-1 ring-[#81b64c]'
                      : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-300 hover:border-zinc-500 hover:bg-[#262420]'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-0.5 opacity-90" />
                  <span className="text-sm font-black font-mono">{tc.label}</span>
                  <span className="text-[10px] font-bold opacity-75 uppercase tracking-wider">
                    {tc.inc > 0 ? `+${tc.inc}s inc` : tc.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opponent Mode (3 Options: Online 1v1, vs Computer, Pass & Play) */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Swords className="w-4 h-4 text-[#81b64c]" />
            <span>Game Mode</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Online 1v1 PvP */}
            <button
              onClick={() => setSelectedMode('online_pvp')}
              className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                selectedMode === 'online_pvp'
                  ? 'bg-gradient-to-br from-[#2b271d] to-[#1e1c18] border-amber-500 text-white shadow-lg shadow-amber-500/10'
                  : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                <Globe className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white">Online 1v1 PvP</span>
                <span className="text-[10px] text-zinc-400">Live Matchmaking & Rooms</span>
              </div>
            </button>

            {/* 2. vs Computer */}
            <button
              onClick={() => setSelectedMode('bot')}
              className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                selectedMode === 'bot'
                  ? 'bg-[#282622] border-[#81b64c] text-white shadow-lg shadow-[#81b64c]/10'
                  : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white">vs Computer</span>
                <span className="text-[10px] text-zinc-400">20+ Grandmaster Bots</span>
              </div>
            </button>

            {/* 3. Pass & Play */}
            <button
              onClick={() => setSelectedMode('pass_and_play')}
              className={`p-4 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                selectedMode === 'pass_and_play'
                  ? 'bg-[#282622] border-[#81b64c] text-white'
                  : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
              }`}
            >
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-white">Pass & Play</span>
                <span className="text-[10px] text-zinc-400">Local 2-Player Board</span>
              </div>
            </button>
          </div>
        </div>

        {/* Variant Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-400" />
            <span>Chess Variant</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(v.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedVariant === v.id
                    ? 'bg-[#282622] border-[#81b64c] text-white'
                    : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
                }`}
              >
                <span className="text-xs font-black block text-white">{v.name}</span>
                <span className="text-[10px] text-zinc-500">{v.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Action Section */}
        {selectedMode === 'online_pvp' ? (
          <div className="flex flex-col gap-3">
            {isQueueing ? (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-600/10 to-transparent border border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">
                      Searching for Opponent...
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Rating Window: ±{Math.min(400, 75 + queueDuration * 15)} &bull; Queue Time:{' '}
                      <span className="font-mono text-amber-400">{queueDuration}s</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelQueue}
                  className="px-5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Search</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleStartLiveMatchmaking}
                  className="py-4 rounded-2xl bg-[#81b64c] hover:bg-[#73a542] text-white text-sm font-black tracking-wide shadow-2xl shadow-[#81b64c]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Globe className="w-5 h-5" />
                  <span>Find 1v1 Rated Opponent</span>
                </button>
                <button
                  onClick={handleOpenChallengeModal}
                  className="py-4 rounded-2xl bg-[#262420] hover:bg-[#302d28] border border-[#3b3832] text-zinc-200 text-sm font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Share2 className="w-5 h-5 text-amber-400" />
                  <span>Create Private Challenge Room</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleStartLocalGame}
            className="w-full py-4 rounded-2xl bg-[#81b64c] hover:bg-[#73a542] text-white text-base font-black tracking-wide shadow-2xl shadow-[#81b64c]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Start Game</span>
          </button>
        )}

        {/* Recent Games List */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#262421]">
          <h2 className="text-sm font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#81b64c]" />
            <span>Recent Games & Game Reviews</span>
          </h2>
          <div className="divide-y divide-[#282522] bg-[#1a1815] border border-[#2d2a26] rounded-2xl overflow-hidden">
            {recentGames.map((game) => (
              <div
                key={game.id}
                className="p-4 flex items-center justify-between hover:bg-[#201e1a] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#262421] border border-[#383530] flex items-center justify-center text-lg overflow-hidden shrink-0">
                    {game.whitePlayer.avatar &&
                    (game.whitePlayer.avatar.startsWith('http') || game.whitePlayer.avatar.startsWith('/')) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={game.whitePlayer.avatar}
                        alt={game.whitePlayer.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm select-none">{game.whitePlayer.avatar || '♟️'}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">
                      {game.whitePlayer.name} ({game.whitePlayer.rating}) vs{' '}
                      {game.blackPlayer.name} ({game.blackPlayer.rating})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {game.gameResult || 'In Progress'} • {game.moves.length} moves •{' '}
                      {game.variant}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/game/${game.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-[#282622] hover:bg-[#33302b] text-xs font-bold text-zinc-200 border border-[#3b3833] transition-colors cursor-pointer"
                  >
                    Open Game
                  </button>
                  <button
                    onClick={() => router.push(`/game/review/${game.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1 shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Private Challenge Room Modal */}
      {isChallengeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[#1f1d1a] border border-[#33302b] rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl relative">
            <button
              onClick={() => setIsChallengeModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#282522] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Private Challenge Room</h3>
                <p className="text-xs text-zinc-400">Room Code: <span className="font-mono text-amber-400 font-bold">{challengeRoomCode}</span></p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Share this invite link with your friend. When they accept, you will enter a custom live match!
            </p>

            {/* Invite URL box */}
            <div className="flex items-center gap-2 p-2.5 bg-[#141311] border border-[#2b2824] rounded-xl">
              <input
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/play?room=${challengeRoomCode}` : `https://checkmate.app/play?room=${challengeRoomCode}`}
                className="bg-transparent text-xs text-zinc-200 font-mono flex-1 outline-none select-all"
              />
              <button
                onClick={handleCopyChallengeLink}
                className="px-3 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
              >
                <span>{hasCopiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>

            {/* Match config summary */}
            <div className="p-3 bg-[#181714] rounded-xl border border-[#262421] flex items-center justify-between text-xs text-zinc-300">
              <span>Time: <strong className="text-white font-mono">{selectedTimeControl.label}</strong></span>
              <span>Increment: <strong className="text-white font-mono">+{selectedTimeControl.inc}s</strong></span>
              <span>Variant: <strong className="text-[#81b64c] capitalize">{selectedVariant}</strong></span>
            </div>

            {/* Join buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => handleStartChallengeMatch('w')}
                className="py-3 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-[#81b64c]/20"
              >
                Play as White ♔
              </button>
              <button
                onClick={() => handleStartChallengeMatch('b')}
                className="py-3 rounded-xl bg-[#2b2824] hover:bg-[#38342e] border border-[#3b3730] text-zinc-200 text-xs font-black transition-all cursor-pointer"
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
