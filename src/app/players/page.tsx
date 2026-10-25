'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Users,
  Award,
  Zap,
  Flame,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Trophy,
  Loader2,
  TrendingUp,
  RefreshCw,
  Eye,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Swords,
  Target,
  Shield,
  Layers,
  ChevronRight,
  UserCheck,
  Compass,
  BookOpen,
  PieChart,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  buildPlayerScoutDna,
  generateHowToBeatThemPlan,
  PlayerScoutDna,
  HowToBeatThemPlan,
} from '@/lib/server/scoutingEngine';
import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';

export type PlayerScreen = 'dossier' | 'repertoire' | 'blueprint' | 'matches';

const FEATURED_PLAYERS = [
  { username: 'magnuscarlsen', label: 'Magnus Carlsen 🇳🇴', tag: 'GM' },
  { username: 'hikaru', label: 'Hikaru Nakamura 🇺🇸', tag: 'GM' },
  { username: 'danielnaroditsky', label: 'Daniel Naroditsky 🇺🇸', tag: 'GM' },
  { username: 'gothamchess', label: 'GothamChess 🇺🇸', tag: 'IM' },
  { username: 'firouzja2003', label: 'Alireza Firouzja 🇫🇷', tag: 'GM' },
];

export default function PlayersExplorerPage() {
  const router = useRouter();
  const { user, profile: myProfile, effectiveDisplayName, effectiveRating, syncedChessCom, syncedLichess } = useAuth();

  // Primary states
  const [platform, setPlatform] = useState<'chesscom' | 'lichess'>('chesscom');
  const [searchInput, setSearchInput] = useState('magnuscarlsen');
  const [activeUsername, setActiveUsername] = useState('magnuscarlsen');
  const [activeScreen, setActiveScreen] = useState<PlayerScreen>('dossier');

  // Player A Data
  const [playerAProfile, setPlayerAProfile] = useState<any | null>(null);
  const [playerAStats, setPlayerAStats] = useState<any | null>(null);
  const [playerAGames, setPlayerAGames] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compare / Scout Player B Data
  const [compareUsername, setCompareUsername] = useState<string>('');
  const [playerBProfile, setPlayerBProfile] = useState<any | null>(null);
  const [playerBStats, setPlayerBStats] = useState<any | null>(null);
  const [playerBGames, setPlayerBGames] = useState<any[]>([]);
  const [isComparingLoading, setIsComparingLoading] = useState(false);

  // Match History Filter
  const [matchFilter, setMatchFilter] = useState<'all' | 'rapid' | 'blitz' | 'bullet'>('all');

  // Fetch Player A
  const fetchPlayer = useCallback(
    async (targetUser: string, targetPlatform: 'chesscom' | 'lichess' = platform) => {
      if (!targetUser.trim()) return;
      setIsLoading(true);
      setErrorMessage(null);

      const endpoint =
        targetPlatform === 'chesscom'
          ? `/api/sync/chesscom?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`
          : `/api/sync/lichess?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();

        if (!res.ok || !data.success) {
          setErrorMessage(data.error || `Could not find player "${targetUser}" on ${targetPlatform === 'chesscom' ? 'Chess.com' : 'Lichess'}.`);
          setIsLoading(false);
          return;
        }

        setPlayerAProfile(data.profile);
        setPlayerAStats(data.stats);
        setPlayerAGames(data.games || []);
        setActiveUsername(targetUser);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to connect to player lookup API.');
      } finally {
        setIsLoading(false);
      }
    },
    [platform]
  );

  // Fetch Player B for comparison
  const fetchComparePlayer = useCallback(
    async (targetUser: string, targetPlatform: 'chesscom' | 'lichess' = platform) => {
      if (!targetUser.trim()) return;
      setIsComparingLoading(true);

      const endpoint =
        targetPlatform === 'chesscom'
          ? `/api/sync/chesscom?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`
          : `/api/sync/lichess?username=${encodeURIComponent(targetUser.trim().toLowerCase())}`;

      try {
        const res = await fetch(endpoint);
        const data = await res.json();
        if (data.success) {
          setPlayerBProfile(data.profile);
          setPlayerBStats(data.stats);
          setPlayerBGames(data.games || []);
        }
      } catch (e) {
        console.warn('Failed to fetch comparison player:', e);
      } finally {
        setIsComparingLoading(false);
      }
    },
    [platform]
  );

  // Initial load
  useEffect(() => {
    fetchPlayer('magnuscarlsen', 'chesscom');
  }, [fetchPlayer]);

  // Player A Scout DNA
  const playerADna: PlayerScoutDna = useMemo(() => {
    return buildPlayerScoutDna(playerAProfile, playerAStats, playerAGames, platform);
  }, [playerAProfile, playerAStats, playerAGames, platform]);

  // Player B (Hero / You or opponent 2) Scout DNA
  const heroDna: PlayerScoutDna = useMemo(() => {
    if (playerBProfile) {
      return buildPlayerScoutDna(playerBProfile, playerBStats, playerBGames, platform);
    }
    // Default hero profile from logged-in account or generic 1500 benchmark
    return {
      username: effectiveDisplayName || 'You',
      platform,
      totalGamesAnalyzed: 45,
      overallWinRatePct: 56,
      ratings: {
        rapid: effectiveRating || 1500,
        blitz: effectiveRating ? effectiveRating - 50 : 1450,
        bullet: effectiveRating ? effectiveRating - 80 : 1400,
      },
      openingsAsWhite: [
        { name: 'Italian Game', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4', playedCount: 18, winCount: 11, lossCount: 5, drawCount: 2, winRatePct: 62, color: 'white', verdict: 'strong' },
        { name: "Queen's Gambit", moves: '1. d4 d5 2. c4', playedCount: 12, winCount: 7, lossCount: 4, drawCount: 1, winRatePct: 58, color: 'white', verdict: 'strong' },
      ],
      openingsAsBlack: [
        { name: 'Sicilian Defense', moves: '1. e4 c5', playedCount: 22, winCount: 12, lossCount: 7, drawCount: 3, winRatePct: 55, color: 'black', verdict: 'strong' },
        { name: "King's Indian Defense", moves: '1. d4 Nf6 2. c4 g6', playedCount: 14, winCount: 7, lossCount: 5, drawCount: 2, winRatePct: 52, color: 'black', verdict: 'neutral' },
      ],
      phaseAnalysis: {
        openingScore: 78,
        middlegameScore: 82,
        endgameScore: 74,
        tacticalAggressiveness: 80,
        timePanicTendency: 28,
        blunderRatePct: 4.8,
        primaryWeakness: 'Endgame pawn race precision under time pressure',
        primaryStrength: 'Rapid kingside attacking coordination and pawn breaks',
      },
      commonMistakes: ['Premature central simplification', 'Passive rook placement in 7th rank defense'],
    };
  }, [playerBProfile, playerBStats, playerBGames, platform, effectiveDisplayName, effectiveRating]);

  // Grandmaster Blueprint
  const howToBeatThemPlan: HowToBeatThemPlan = useMemo(() => {
    return generateHowToBeatThemPlan(playerADna, heroDna);
  }, [playerADna, heroDna]);

  // Handle Search Submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchPlayer(searchInput.trim(), platform);
      soundService.playMove();
    }
  };

  const handlePlatformToggle = (nextPlatform: 'chesscom' | 'lichess') => {
    setPlatform(nextPlatform);
    fetchPlayer(searchInput.trim() || activeUsername, nextPlatform);
    soundService.playMove();
  };

  const handleCompareWithMe = () => {
    setPlayerBProfile(null);
    setCompareUsername('');
    setActiveScreen('blueprint');
    soundService.playMove();
  };

  const handleReviewGame = (game: any) => {
    try {
      const parsedMoves = game.pgn ? parsePgnToMoveRecords(game.pgn) : [];
      GameSessionStore.saveSession({
        id: game.id,
        source: platform,
        whitePlayer: {
          id: game.isUserWhite ? 'p1' : 'p2',
          name: game.isUserWhite ? playerAProfile?.username || activeUsername : game.opponent?.username || 'Opponent',
          rating: game.isUserWhite ? game.userPlayer?.rating || 1500 : game.opponent?.rating || 1500,
          avatar: game.isUserWhite ? playerAProfile?.avatar || '' : game.opponent?.avatar || '',
        },
        blackPlayer: {
          id: !game.isUserWhite ? 'p1' : 'p2',
          name: !game.isUserWhite ? playerAProfile?.username || activeUsername : game.opponent?.username || 'Opponent',
          rating: !game.isUserWhite ? game.userPlayer?.rating || 1500 : game.opponent?.rating || 1500,
          avatar: !game.isUserWhite ? playerAProfile?.avatar || '' : game.opponent?.avatar || '',
        },
        timeControl: parseInt(game.timeControl) || 600,
        variant: 'standard',
        moves: parsedMoves,
        movesCount: parsedMoves.length > 0 ? Math.ceil(parsedMoves.length / 2) : game.movesCount || 0,
        pgn: game.pgn || '',
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        isGameOver: true,
        gameResult: game.userResult === 'win' ? (game.isUserWhite ? '1-0' : '0-1') : game.userResult === 'loss' ? (game.isUserWhite ? '0-1' : '1-0') : '1/2-1/2',
        resultDetails: {
          winner: game.userResult === 'win' ? (game.isUserWhite ? 'w' : 'b') : game.userResult === 'loss' ? (game.isUserWhite ? 'b' : 'w') : 'draw',
          reason: 'resignation',
          ratingDelta: 0,
          newRating: game.userPlayer?.rating || 800,
          league: 'Scouting Review',
          trophiesDelta: 0,
        },
        reviewReport: null,
        createdAt: game.playedAt ? new Date(game.playedAt).getTime() : Date.now(),
        updatedAt: Date.now(),
      });
      router.push(`/game/review/${game.id}`);
    } catch {
      router.push('/analysis');
    }
  };

  const filteredGames = useMemo(() => {
    if (matchFilter === 'all') return playerAGames;
    return playerAGames.filter((g) => (g.timeClass || '').toLowerCase().includes(matchFilter));
  }, [playerAGames, matchFilter]);

  return (
    <div className="w-full min-h-full xl:h-full xl:max-h-full overflow-y-auto xl:overflow-hidden p-2.5 sm:p-4 lg:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6">
      <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-0 gap-2.5">
        {/* ========================================================================= */}
        {/* 1. TOP HEADER & SEARCH BAR                                                */}
        {/* ========================================================================= */}
        <header className="p-3 sm:p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2.5 shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  Player Explorer
                </h1>
                <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.2 rounded-full border border-emerald-500/30 uppercase">
                  Live Search
                </span>
              </div>
            </div>

            {/* Platform Toggle Pills */}
            <div className="flex items-center gap-1 p-0.5 bg-[#141311] border border-white/5 rounded-xl self-end sm:self-auto">
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  handlePlatformToggle('chesscom');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  platform === 'chesscom'
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>♟️</span>
                <span>Chess.com</span>
              </button>
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  handlePlatformToggle('lichess');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  platform === 'lichess'
                    ? 'bg-amber-600 text-white font-black shadow-xs'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚔️</span>
                <span>Lichess</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Quick Suggestion Chips */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${platform === 'chesscom' ? 'Chess.com' : 'Lichess'} handle (e.g. magnuscarlsen)...`}
                className="w-full bg-[#141311] border border-white/10 rounded-xl pl-8 pr-20 py-1.5 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <Button
                type="submit"
                variant="primary"
                size="xs"
                rounded="lg"
                disabled={isLoading}
                className="absolute right-1"
              >
                {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                <span>Search</span>
              </Button>
            </form>

            {/* Popular Grandmasters */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider hidden lg:inline shrink-0">
                Quick:
              </span>
              {FEATURED_PLAYERS.map((p) => {
                const isActive = activeUsername.toLowerCase() === p.username.toLowerCase();
                return (
                  <button
                    key={p.username}
                    onClick={() => {
                      soundService.playTactilePop();
                      setSearchInput(p.username);
                      fetchPlayer(p.username, platform);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                        : 'bg-[#141311] border border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span>{p.label}</span>
                    <span className="text-[8px] font-black uppercase bg-black/20 px-1 rounded">{p.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </header>

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center gap-2 text-xs text-rose-200 font-medium shadow shrink-0">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SEGMENTED SUB-SCREEN SWITCHER                                          */}
        {/* ========================================================================= */}
        <nav className="shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none w-full sm:w-auto">
            <button
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('dossier');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'dossier'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Overview &amp; Stats</span>
            </button>

            <button
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('repertoire');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'repertoire'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Openings Played</span>
            </button>

            <button
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('blueprint');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'blueprint'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>How to Beat Them</span>
            </button>

            <button
              onClick={() => {
                soundService.playTactilePop();
                setActiveScreen('matches');
              }}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeScreen === 'matches'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Games ({playerAGames.length})</span>
            </button>
          </div>

          {/* Right Matchup Badge Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-zinc-400">
            <span className="text-emerald-400 font-black">{howToBeatThemPlan.predictedWinChancePct}%</span>
            <span>Win Chance vs @{playerADna.username}</span>
          </div>
        </nav>

        {/* ========================================================================= */}
        {/* 3. VIEWPORT-LOCKED CONTENT STAGES                                         */}
        {/* ========================================================================= */}
        <div className="flex-1 w-full min-h-0 overflow-visible flex flex-col">
          {/* ----------------------------------------------------------------------- */}
          {/* SUB-SCREEN 1: DOSSIER & RATINGS                                         */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'dossier' && (
            <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
              {/* Player Header Card */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-[#141311] border border-white/10 overflow-hidden flex items-center justify-center text-xl shrink-0 shadow-inner">
                    {playerAProfile?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={playerAProfile.avatar}
                        alt={playerAProfile.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{platform === 'chesscom' ? '♟️' : '⚔️'}</span>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                        {playerAProfile?.displayName || playerAProfile?.username || activeUsername}
                      </h2>
                      {playerAProfile?.title && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[10px] font-black uppercase">
                          {playerAProfile.title}
                        </span>
                      )}
                      <span className="text-xs text-zinc-400 font-mono">@{playerAProfile?.username || activeUsername}</span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {platform === 'chesscom' ? 'Chess.com' : 'Lichess'} Member &bull;{' '}
                      <span className="capitalize">{playerAProfile?.country || 'Global'}</span>
                    </span>
                  </div>
                </div>

                {/* Primary P1 CTA */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    variant="primary"
                    size="sm"
                    rounded="xl"
                    onClick={handleCompareWithMe}
                    className="flex-1 sm:flex-initial"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Launch Scouting Blueprint</span>
                  </Button>
                  {playerAProfile?.profileUrl || playerAProfile?.url ? (
                    <a
                      href={playerAProfile.profileUrl || playerAProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#141311] border border-white/5 text-zinc-400 hover:text-white transition"
                      title="View Official Profile"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>

              {/* Live Official Ratings Quad */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
                <div className="p-3 bg-[#1c1a17] rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" /> Rapid
                  </span>
                  <span className="text-lg font-black text-white font-mono mt-0.5">
                    {playerAStats?.rapid?.rating || 800}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playerAStats?.rapid?.games || 0} matches
                  </span>
                </div>

                <div className="p-3 bg-[#1c1a17] rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-rose-400" /> Blitz
                  </span>
                  <span className="text-lg font-black text-white font-mono mt-0.5">
                    {playerAStats?.blitz?.rating || 800}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playerAStats?.blitz?.games || 0} matches
                  </span>
                </div>

                <div className="p-3 bg-[#1c1a17] rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Award className="w-3 h-3 text-cyan-400" /> Bullet
                  </span>
                  <span className="text-lg font-black text-white font-mono mt-0.5">
                    {playerAStats?.bullet?.rating || 800}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playerAStats?.bullet?.games || 0} matches
                  </span>
                </div>

                <div className="p-3 bg-[#1c1a17] rounded-xl border border-white/5 flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-400" /> Daily
                  </span>
                  <span className="text-lg font-black text-white font-mono mt-0.5">
                    {playerAStats?.daily?.rating || 800}
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {playerAStats?.daily?.games || 0} matches
                  </span>
                </div>
              </div>

              {/* Lower Dual Panel: Phase Analysis & Playing DNA */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                {/* Playing Style & Psychological Tendencies (6 Cols) */}
                <div className="md:col-span-6 p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Cognitive DNA &amp; Tendencies</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-black uppercase">
                        {playerADna.phaseAnalysis.tacticalAggressiveness >= 60 ? 'Sharp Tactician' : 'Solid Strategist'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      Tactical aggressiveness rated at{' '}
                      <strong className="text-white">{playerADna.phaseAnalysis.tacticalAggressiveness}%</strong>. Time panic scramble index:{' '}
                      <strong className="text-amber-400">{playerADna.phaseAnalysis.timePanicTendency}%</strong>. Blunder rate:{' '}
                      <strong className="text-rose-400">{playerADna.phaseAnalysis.blunderRatePct}%</strong>.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-zinc-400">Primary Exploitable Leak</span>
                      <span className="text-xs text-rose-300 font-semibold mt-0.5">
                        {playerADna.phaseAnalysis.primaryWeakness}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => setActiveScreen('repertoire')}
                    >
                      <span>Explore Openings</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Phase Scores Trio (6 Cols) */}
                <div className="md:col-span-6 p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Phase Mastery Distribution</span>
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Openings Mastery</span>
                        <span className="font-mono font-bold text-cyan-400">{playerADna.phaseAnalysis.openingScore}%</span>
                      </div>
                      <div className="w-full bg-[#141311] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${playerADna.phaseAnalysis.openingScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Middlegame Tactics</span>
                        <span className="font-mono font-bold text-amber-400">{playerADna.phaseAnalysis.middlegameScore}%</span>
                      </div>
                      <div className="w-full bg-[#141311] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${playerADna.phaseAnalysis.middlegameScore}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-zinc-400 font-medium">Endgame Technique</span>
                        <span className="font-mono font-bold text-emerald-400">{playerADna.phaseAnalysis.endgameScore}%</span>
                      </div>
                      <div className="w-full bg-[#141311] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${playerADna.phaseAnalysis.endgameScore}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Matches analyzed: <strong className="text-white font-mono">{playerAGames.length}</strong></span>
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setActiveScreen('matches');
                      }}
                      className="text-emerald-400 hover:underline font-bold cursor-pointer"
                    >
                      View Games
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SUB-SCREEN 2: REPERTOIRE FORENSICS                                      */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'repertoire' && (
            <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-white">Opening Repertoire Forensics</h2>
                    <p className="text-[11px] text-zinc-400">
                      Historical win rates, favorite systems, and defensive preferences
                    </p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="xs"
                  rounded="lg"
                  onClick={() => router.push('/openings')}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Openings Masterclass</span>
                </Button>
              </div>

              {/* Dual Repertoire Grid: As White (Left) & As Black (Right) */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                {/* White Repertoire */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>⚪ As White Repertoire</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {playerADna.openingsAsWhite.length} Systems Tracked
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                    {playerADna.openingsAsWhite.map((op, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-white truncate">{op.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500 truncate">{op.moves}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-zinc-400 text-[11px]">{op.playedCount}g</span>
                          <span
                            className={`font-mono font-black text-[10px] px-2 py-0.5 rounded ${
                              op.winRatePct >= 55
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : op.winRatePct <= 40
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {op.winRatePct}% W
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-zinc-500 italic pt-1 border-t border-white/5">
                    Exploitation Tip: Force early deviations from their pet setup to neutralize their prep.
                  </p>
                </div>

                {/* Black Repertoire */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <span>⚫ As Black Defenses</span>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {playerADna.openingsAsBlack.length} Systems Tracked
                    </span>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                    {playerADna.openingsAsBlack.map((op, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-center justify-between text-xs hover:border-white/10 transition"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-bold text-white truncate">{op.name}</span>
                          <span className="text-[10px] font-mono text-zinc-500 truncate">{op.moves}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-zinc-400 text-[11px]">{op.playedCount}g</span>
                          <span
                            className={`font-mono font-black text-[10px] px-2 py-0.5 rounded ${
                              op.winRatePct >= 55
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : op.winRatePct <= 40
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {op.winRatePct}% W
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-[10px] text-zinc-500 italic pt-1 border-t border-white/5">
                    Exploitation Tip: Challenge their pawn breaks early to seize the center.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SUB-SCREEN 3: GRANDMASTER BLUEPRINT (HOW TO BEAT THEM)                  */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'blueprint' && (
            <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
              {/* Header Matchup Bar */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-2">
                      <span>Tactical Blueprint: How to Beat @{playerADna.username}</span>
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Algorithmic game-plan calculated against their tactical vulnerabilities
                    </p>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    howToBeatThemPlan.matchupDifficulty === 'favorable'
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : howToBeatThemPlan.matchupDifficulty === 'tough'
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{howToBeatThemPlan.predictedWinChancePct}% Win Prediction</span>
                </div>
              </div>

              {/* Side-by-Side Weaponry Cards */}
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3 items-stretch">
                {/* 1. Recommended Weapon as White */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-2.5 min-h-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-white text-black flex items-center justify-center text-xs font-black">
                        ⚪
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Recommended as White
                        </span>
                        <h3 className="text-xs font-black text-white">
                          {howToBeatThemPlan.recommendedWeaponWhite.opening}
                        </h3>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-[#141311] border border-white/5 font-mono text-xs text-emerald-400">
                      {howToBeatThemPlan.recommendedWeaponWhite.moves}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {howToBeatThemPlan.recommendedWeaponWhite.rationale}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Exploit: {howToBeatThemPlan.recommendedWeaponWhite.exploitFactor}</span>
                  </div>
                </div>

                {/* 2. Recommended Defense as Black */}
                <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-2.5 min-h-0">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center text-xs font-black">
                        ⚫
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                          Recommended as Black
                        </span>
                        <h3 className="text-xs font-black text-white">
                          {howToBeatThemPlan.recommendedDefenseBlack.defense}
                        </h3>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-[#141311] border border-white/5 font-mono text-xs text-emerald-400">
                      {howToBeatThemPlan.recommendedDefenseBlack.moves}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                      {howToBeatThemPlan.recommendedDefenseBlack.rationale}
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-[11px] text-cyan-300 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>Exploit: {howToBeatThemPlan.recommendedDefenseBlack.exploitFactor}</span>
                  </div>
                </div>
              </div>

              {/* Lower Exploitation Directives Banner */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                <div className="flex items-start gap-2 text-xs">
                  <Swords className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">Tactical Directive</span>
                    <span className="text-zinc-300 leading-snug">
                      Exploit leak: <strong className="text-white">{playerADna.phaseAnalysis.primaryWeakness}</strong>. Blunder frequency is <strong className="text-rose-400">{playerADna.phaseAnalysis.blunderRatePct}%</strong>.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-xs">
                  <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Endgame &amp; Clock Strategy</span>
                    <span className="text-zinc-300 leading-snug">
                      {playerADna.phaseAnalysis.timePanicTendency > 30
                        ? 'Keep positions complex into time trouble—they exhibit heavy scramble panic.'
                        : 'Aim for a simplified king-and-pawn endgame where their technical conversion is lowest.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------------- */}
          {/* SUB-SCREEN 4: MATCH ARCHIVES & GAME REVIEW                              */}
          {/* ----------------------------------------------------------------------- */}
          {activeScreen === 'matches' && (
            <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
              {/* Filter Tabs */}
              <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs sm:text-sm font-extrabold text-white">Recent Match Archives</h2>
                    <p className="text-[11px] text-zinc-400">
                      Click Review on any match to load interactive Stockfish analysis
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 p-0.5 bg-[#141311] border border-white/5 rounded-xl self-end sm:self-auto">
                  {(['all', 'rapid', 'blitz', 'bullet'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => {
                        soundService.playTactilePop();
                        setMatchFilter(filter);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                        matchFilter === filter
                          ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-black font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Games Table List */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5">
                {filteredGames.length === 0 ? (
                  <div className="py-16 text-center text-xs text-zinc-500 font-mono">
                    No matches found matching the selected filter.
                  </div>
                ) : (
                  filteredGames.map((g) => (
                    <div
                      key={g.id}
                      className="p-2.5 rounded-xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs shrink-0">{g.isUserWhite ? '⚪' : '⚫'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            vs {g.opponent.username} ({g.opponent.rating})
                          </span>
                          <span className="text-[10px] text-zinc-400 capitalize">
                            {g.timeClass} &bull; {g.movesCount || 30} moves
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                            g.userResult === 'win'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : g.userResult === 'loss'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {g.userResult}
                        </span>
                        <Button
                          variant="primary"
                          size="xs"
                          rounded="lg"
                          onClick={() => handleReviewGame(g)}
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Review</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
