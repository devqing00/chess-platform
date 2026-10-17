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
} from 'lucide-react';
import { SlideDrawer } from '@/components/ui/SlideDrawer';
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
  { sec: 300, inc: 0, label: '5m', sub: 'Blitz', category: 'blitz', icon: '🔥' },
  { sec: 600, inc: 0, label: '10m', sub: 'Rapid', category: 'rapid', icon: '⏱️' },
  { sec: 900, inc: 10, label: '15|10', sub: 'Rapid', category: 'rapid', icon: '⏱️' },
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
  const { user, profile, effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } =
    useAuth();

  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControlOption>(
    QUICK_TIME_CONTROLS[3] // Default 10m Rapid
  );
  const [selectedMode, setSelectedMode] = useState<'bot' | 'online_pvp' | 'pass_and_play'>('bot');
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');
  const [playAsColor, setPlayAsColor] = useState<'w' | 'random' | 'b'>('w');
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');

  // Progressive Disclosure Drawers
  const [isBotDrawerOpen, setIsBotDrawerOpen] = useState(false);
  const [isTimeControlsDrawerOpen, setIsTimeControlsDrawerOpen] = useState(false);
  const [isChallengeDrawerOpen, setIsChallengeDrawerOpen] = useState(false);
  const [isRecentDrawerOpen, setIsRecentDrawerOpen] = useState(false);

  // Bot search & filter in drawer
  const [botFilter, setBotFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'>('all');
  const [botSearchQuery, setBotSearchQuery] = useState('');

  // Queue state
  const [isQueueing, setIsQueueing] = useState(false);
  const [queueElapsed, setQueueElapsed] = useState(0);
  const [challengeRoomCode, setChallengeRoomCode] = useState('');
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchmakingFallbackRef = useRef<NodeJS.Timeout | null>(null);
  const queueCleanupRef = useRef<(() => void) | null>(null);

  const [recentGames, setRecentGames] = useState<GameSession[]>([]);
  useEffect(() => {
    setRecentGames(GameSessionStore.listRecentSessions());
  }, []);

  const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];

  const filteredBots = CHESS_BOTS.filter((b) => {
    const matchesCategory = botFilter === 'all' || b.category === botFilter;
    const matchesSearch =
      b.name.toLowerCase().includes(botSearchQuery.toLowerCase()) ||
      b.rating.toString().includes(botSearchQuery);
    return matchesCategory && matchesSearch;
  });

  // Handle Online Queue
  const handleStartOnlineQueue = async () => {
    setIsQueueing(true);
    setQueueElapsed(0);

    queueTimerRef.current = setInterval(() => {
      setQueueElapsed((prev) => prev + 1);
    }, 1000);

    const onlineOpponents = [
      { name: 'Magnus_Carlsen_Fan', rating: 1240, avatar: '🇳🇴', country: 'NO' },
      { name: 'BlitzKing99', rating: 1315, avatar: '🇺🇸', country: 'US' },
      { name: 'TacticalDragon', rating: 1180, avatar: '🇩🇪', country: 'DE' },
      { name: 'CheckmateArtist', rating: 1290, avatar: '🇫🇷', country: 'FR' },
    ];

    if (user?.uid && profile) {
      try {
        const { ticketId, unsubscribe } = await MatchmakingService.enterQueue(
          profile,
          selectedTimeControl.sec,
          selectedTimeControl.inc,
          selectedVariant,
          (matchedGameId: string) => {
            if (queueTimerRef.current) clearInterval(queueTimerRef.current);
            if (matchmakingFallbackRef.current) clearTimeout(matchmakingFallbackRef.current);
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
      }
    }

    matchmakingFallbackRef.current = setTimeout(() => {
      setIsQueueing(false);
      const opponentData = onlineOpponents[Math.floor(Math.random() * onlineOpponents.length)];

      const whitePlayer: GamePlayer = {
        id: user?.uid || 'player-you',
        name: effectiveDisplayName,
        rating: effectiveRating || 1200,
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
    if (queueTimerRef.current) {
      clearInterval(queueTimerRef.current);
    }
    setIsQueueing(false);
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

  const handleCreateChallengeLink = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setChallengeRoomCode(code);
    setHasCopiedLink(false);
    setIsChallengeDrawerOpen(true);
  };

  const handleCopyLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://checkmate.app';
    const link = `${origin}/play?room=${challengeRoomCode}`;
    navigator.clipboard.writeText(link);
    setHasCopiedLink(true);
    setTimeout(() => setHasCopiedLink(false), 2500);
  };

  return (
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col gap-4 min-h-0">
        {/* TOP BAR / SCREEN HUD */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Play Arena
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Choose mode, clock tempo &amp; challenge opponents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {recentGames.length > 0 && (
              <button
                onClick={() => setIsRecentDrawerOpen(true)}
                className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#81b64c]" />
                <span className="hidden sm:inline">Recent Games</span>
              </button>
            )}
            <button
              onClick={handleCreateChallengeLink}
              className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Play a Friend</span>
            </button>
          </div>
        </div>

        {/* MAIN VIEWPORT COMMAND CENTER: 3-GROUP ARCHITECTURE */}
        <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* GROUP 1: LEFT CONFIG DECK (7 Cols) - Mode, Clock, Color & P1 Action */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-4">
            <div className="flex flex-col gap-4">
              {/* Mode Segmented Switcher */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Select Game Mode
                </span>
                <div className="grid grid-cols-3 gap-1.5 bg-[#141311] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setSelectedMode('bot')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedMode === 'bot'
                        ? 'bg-[#81b64c] text-black shadow-md font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>vs Computer</span>
                  </button>

                  <button
                    onClick={() => setSelectedMode('online_pvp')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedMode === 'online_pvp'
                        ? 'bg-amber-600 text-white shadow-md font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Online 1v1</span>
                  </button>

                  <button
                    onClick={() => setSelectedMode('pass_and_play')}
                    className={`py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      selectedMode === 'pass_and_play'
                        ? 'bg-purple-600 text-white shadow-md font-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Pass &amp; Play</span>
                  </button>
                </div>
              </div>

              {/* Quick Time Control Grid */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Time Control
                  </span>
                  <button
                    onClick={() => setIsTimeControlsDrawerOpen(true)}
                    className="text-[11px] text-[#81b64c] hover:underline font-semibold cursor-pointer"
                  >
                    Custom Clocks &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {QUICK_TIME_CONTROLS.map((tc) => {
                    const isSelected =
                      selectedTimeControl.sec === tc.sec && selectedTimeControl.inc === tc.inc;
                    return (
                      <button
                        key={tc.label}
                        onClick={() => setSelectedTimeControl(tc)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white/10 border-[#81b64c] text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="text-sm font-extrabold font-mono">{tc.label}</span>
                        <span className="text-[10px] uppercase font-bold text-zinc-500">
                          {tc.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side / Color Selection */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Play As
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPlayAsColor('w')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      playAsColor === 'w'
                        ? 'bg-white/15 border-white text-white'
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
                        ? 'bg-white/15 border-[#81b64c] text-[#81b64c]'
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
                        ? 'bg-white/15 border-zinc-400 text-white'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>⚫</span>
                    <span>Black</span>
                  </button>
                </div>
              </div>
            </div>

            {/* P1 PRIMARY ACTION ANCHOR */}
            <div className="pt-2">
              {isQueueing ? (
                <div className="flex items-center gap-3">
                  <div className="flex-1 py-3.5 px-4 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-300 font-extrabold text-sm flex items-center justify-center gap-2 animate-pulse">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Searching match ({queueElapsed}s)...</span>
                  </div>
                  <button
                    onClick={handleCancelQueue}
                    className="py-3.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={
                    selectedMode === 'online_pvp' ? handleStartOnlineQueue : handleStartLocalOrBotMatch
                  }
                  className="w-full py-4 px-6 rounded-xl bg-[#81b64c] hover:bg-[#92cb56] text-black font-black text-sm tracking-tight shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>
                    {selectedMode === 'online_pvp'
                      ? `Find 1v1 Opponent (${selectedTimeControl.label} ${selectedTimeControl.sub})`
                      : selectedMode === 'bot'
                      ? `Play vs ${chosenBot.name} (${selectedTimeControl.label} ${selectedTimeControl.sub})`
                      : `Start Pass & Play (${selectedTimeControl.label})`}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* GROUP 2: RIGHT ARENA PREVIEW (5 Cols) - Visual context & Bot Switcher */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-4">
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

                {/* Switch Bot Drawer Trigger */}
                <button
                  onClick={() => setIsBotDrawerOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Choose Another Bot Opponent ({CHESS_BOTS.length} Bots) &rarr;</span>
                </button>
              </div>
            )}

            {selectedMode === 'online_pvp' && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Global Matchmaking Pool
                </span>
                <div className="p-5 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-2xl animate-pulse">
                    <Globe className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Live Rating Pairings</h3>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs">
                      Matched dynamically with players of similar rating across Chess.com and Lichess.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {selectedMode === 'pass_and_play' && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  Local Two-Player Session
                </span>
                <div className="p-5 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
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
      </div>

      {/* PROGRESSIVE DISCLOSURE DRAWER 1: BOT ROSTER */}
      <SlideDrawer
        isOpen={isBotDrawerOpen}
        onClose={() => setIsBotDrawerOpen(false)}
        title="Bot Opponents Roster"
        subtitle="Select from 100+ simulated Grandmasters &amp; personalities."
        widthClass="max-w-xl"
      >
        <div className="flex flex-col gap-4">
          {/* Search & Tier Filter */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search bot by name or rating..."
                value={botSearchQuery}
                onChange={(e) => setBotSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141311] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
              />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
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
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                    botFilter === cat.id
                      ? 'bg-[#81b64c] text-black border-[#81b64c]'
                      : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredBots.map((bot) => {
              const isSelected = selectedBotId === bot.id;
              return (
                <button
                  key={bot.id}
                  onClick={() => {
                    setSelectedBotId(bot.id);
                    setIsBotDrawerOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white/15 border-[#81b64c] shadow-sm'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center text-lg shrink-0">
                    {bot.avatar.startsWith('http') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{bot.avatar}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">{bot.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400">{bot.rating} Elo</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </SlideDrawer>

      {/* PROGRESSIVE DISCLOSURE DRAWER 2: ALL TIME CONTROLS */}
      <SlideDrawer
        isOpen={isTimeControlsDrawerOpen}
        onClose={() => setIsTimeControlsDrawerOpen(false)}
        title="All Time Controls"
        subtitle="Choose standard tournament clocks or rapid blitz settings."
        widthClass="max-w-md"
      >
        <div className="grid grid-cols-2 gap-2">
          {ALL_TIME_CONTROLS.map((tc) => (
            <button
              key={`${tc.sec}-${tc.inc}`}
              onClick={() => {
                setSelectedTimeControl(tc);
                setIsTimeControlsDrawerOpen(false);
              }}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-left flex flex-col gap-0.5 transition cursor-pointer"
            >
              <span className="text-sm font-extrabold font-mono text-white">{tc.label}</span>
              <span className="text-[10px] uppercase font-bold text-zinc-400">{tc.sub}</span>
            </button>
          ))}
        </div>
      </SlideDrawer>

      {/* PROGRESSIVE DISCLOSURE DRAWER 3: CHALLENGE FRIEND */}
      <SlideDrawer
        isOpen={isChallengeDrawerOpen}
        onClose={() => setIsChallengeDrawerOpen(false)}
        title="Play With a Friend"
        subtitle="Share an invite link to play a private match."
        widthClass="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-zinc-400">Direct Room Link</span>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}/play?room=${challengeRoomCode}`
                    : `https://checkmate.app/play?room=${challengeRoomCode}`
                }
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-zinc-300 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-lg bg-[#81b64c] hover:bg-[#92cb56] text-black font-bold text-xs transition cursor-pointer"
              >
                {hasCopiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      </SlideDrawer>

      {/* PROGRESSIVE DISCLOSURE DRAWER 4: RECENT GAMES */}
      <SlideDrawer
        isOpen={isRecentDrawerOpen}
        onClose={() => setIsRecentDrawerOpen(false)}
        title="Recent Match History"
        subtitle="Review past sessions and open game analysis."
        widthClass="max-w-md"
      >
        <div className="flex flex-col gap-2">
          {recentGames.map((game) => (
            <div
              key={game.id}
              onClick={() => router.push(`/game/review/${game.id}`)}
              className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">
                  {game.whitePlayer.name} vs {game.blackPlayer.name}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {game.gameResult || 'In Progress'} &bull; {Math.floor(game.timeControl / 60)}m
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </div>
          ))}
        </div>
      </SlideDrawer>
    </div>
  );
}
