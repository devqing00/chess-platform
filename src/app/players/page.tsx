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
  const [activeTab, setActiveTab] = useState<'profile' | 'scout'>('profile');

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
    // Fallback to active logged-in Checkmate user
    const heroRating = effectiveRating || 1200;
    return {
      username: effectiveDisplayName || 'You',
      platform,
      totalGamesAnalyzed: 25,
      overallWinRatePct: 54,
      ratings: {
        rapid: heroRating,
        blitz: myProfile?.ratings?.blitz || heroRating,
        bullet: myProfile?.ratings?.bullet || heroRating,
      },
      openingsAsWhite: [],
      openingsAsBlack: [],
      phaseAnalysis: {
        openingScore: Math.min(95, Math.max(50, Math.round(heroRating / 26))),
        middlegameScore: Math.min(95, Math.max(50, Math.round(heroRating / 25))),
        endgameScore: Math.min(95, Math.max(45, Math.round(heroRating / 28))),
        tacticalAggressiveness: 65,
        timePanicTendency: 40,
        blunderRatePct: 8,
        primaryWeakness: 'Endgame pawn majorities',
        primaryStrength: 'Sharp king-side attacks',
      },
      commonMistakes: [],
    };
  }, [playerBProfile, playerBStats, playerBGames, platform, effectiveDisplayName, effectiveRating, myProfile]);

  // How To Beat Them Blueprint
  const howToBeatThemPlan: HowToBeatThemPlan = useMemo(() => {
    return generateHowToBeatThemPlan(playerADna, heroDna);
  }, [playerADna, heroDna]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchPlayer(searchInput.trim(), platform);
    }
  };

  const handlePlatformToggle = (newPlatform: 'chesscom' | 'lichess') => {
    setPlatform(newPlatform);
    const defaultSearch = newPlatform === 'chesscom' ? 'magnuscarlsen' : 'thibault';
    setSearchInput(defaultSearch);
    fetchPlayer(defaultSearch, newPlatform);
  };

  const handleCompareWithMe = () => {
    // Clear Player B to use logged-in account
    setPlayerBProfile(null);
    setCompareUsername('');
    setActiveTab('scout');
    soundService.playMove();
  };

  const handleReviewGame = (game: any) => {
    try {
      // Inject game into GameSessionStore so /game/review/[id] loads it immediately
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

  return (
    <div className="flex-1 p-3 sm:p-5 lg:p-6 pb-24 md:pb-8 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl flex flex-col gap-4">
        {/* Main Header & Platform Switcher */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#1f1d1a] border-2 border-[#35322b] shadow-[0_5px_0_0_#141311] flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#81b64c] border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-black text-white flex items-center gap-2">
                  <span>Player Scout &amp; Strategy</span>
                  <span className="text-[10px] font-mono uppercase bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40 px-2 py-0.5 rounded-full">
                    Intelligence
                  </span>
                </h1>
                <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                  Inspect any player across Chess.com &amp; Lichess. Generate grandmaster scouting reports on how to beat them.
                </p>
              </div>
            </div>

            {/* Platform Toggle Pills */}
            <div className="flex items-center gap-1.5 p-1 bg-[#161512] border border-[#2e2b26] rounded-xl self-start sm:self-center">
              <button
                onClick={() => handlePlatformToggle('chesscom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  platform === 'chesscom'
                    ? 'bg-[#81b64c] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>♟️</span>
                <span>Chess.com</span>
              </button>
              <button
                onClick={() => handlePlatformToggle('lichess')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  platform === 'lichess'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚔️</span>
                <span>Lichess</span>
              </button>
            </div>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={`Search ${platform === 'chesscom' ? 'Chess.com' : 'Lichess'} username...`}
                className="w-full bg-[#161512] border-2 border-[#35322b] rounded-xl pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c] transition shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 sm:py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs sm:text-sm font-black flex items-center gap-1.5 border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] active:translate-y-[1px] transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Scout</span>
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider mr-0.5">Popular:</span>
            {FEATURED_PLAYERS.map((p) => {
              const isActive = activeUsername.toLowerCase() === p.username.toLowerCase();
              return (
                <button
                  key={p.username}
                  onClick={() => {
                    setSearchInput(p.username);
                    fetchPlayer(p.username, platform);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white'
                      : 'bg-[#181614] border-[#2f2c26] text-zinc-300 hover:text-white'
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="text-[9px] font-black uppercase bg-black/30 px-1 py-0.2 rounded">{p.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/70 border-2 border-rose-800/80 rounded-2xl flex items-center gap-2 text-xs text-rose-200 font-semibold shadow">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#1a1815] rounded-2xl border-2 border-[#332f27] shadow-[0_3px_0_0_#12110e]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#81b64c] text-white shadow-[0_2px_0_0_#4d7a24]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Profile &amp; Games</span>
          </button>
          <button
            onClick={() => setActiveTab('scout')}
            className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer ${
              activeTab === 'scout'
                ? 'bg-amber-600 text-white shadow-[0_2px_0_0_#b45309]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 text-amber-300" />
            <span>How to Beat Them (Scout)</span>
          </button>
        </div>

        {/* TAB 1: PLAYER PROFILE & GAMES INSPECTOR */}
        {activeTab === 'profile' && playerAProfile && (
          <div className="flex flex-col gap-4">
            {/* Player Card */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#211f1c] border-2 border-[#38342c] shadow-[0_6px_0_0_#141311] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#181614] border-2 border-[#38342c] overflow-hidden flex items-center justify-center text-2xl shrink-0 shadow">
                  {playerAProfile.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={playerAProfile.avatar} alt={playerAProfile.username} className="w-full h-full object-cover" />
                  ) : (
                    <span>{platform === 'chesscom' ? '♟️' : '⚔️'}</span>
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-black text-white truncate">
                      {playerAProfile.displayName || playerAProfile.username}
                    </span>
                    {playerAProfile.title && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-zinc-950 text-[10px] font-black">
                        {playerAProfile.title}
                      </span>
                    )}
                    <span className="text-xs text-zinc-400">@{playerAProfile.username}</span>
                  </div>
                  <span className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <span>{platform === 'chesscom' ? 'Chess.com' : 'Lichess'} Member</span>
                    <span>•</span>
                    <span className="capitalize">{playerAProfile.country || 'Global'}</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCompareWithMe}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-black uppercase tracking-wider rounded-xl border border-amber-500 shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Target className="w-3.5 h-3.5 text-amber-200" />
                  <span>How to Beat Them</span>
                </button>
                {playerAProfile.profileUrl || playerAProfile.url ? (
                  <a
                    href={playerAProfile.profileUrl || playerAProfile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-[#282521] border border-[#38342c] text-zinc-400 hover:text-white transition"
                    title="View Profile on Web"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : null}
              </div>
            </div>

            {/* Live Ratings Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Rapid
                </span>
                <span className="text-xl font-black text-white font-mono mt-0.5">
                  {playerAStats?.rapid?.rating || 800}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Standard Rated</span>
              </div>

              <div className="p-3 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Swords className="w-3 h-3 text-amber-500" /> Blitz
                </span>
                <span className="text-xl font-black text-white font-mono mt-0.5">
                  {playerAStats?.blitz?.rating || 800}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">3m / 5m Speed</span>
              </div>

              <div className="p-3 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400" /> Bullet
                </span>
                <span className="text-xl font-black text-white font-mono mt-0.5">
                  {playerAStats?.bullet?.rating || 800}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">1m Hyper-Speed</span>
              </div>

              <div className="p-3 bg-[#211f1c] rounded-2xl border-2 border-[#35322b] flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Award className="w-3 h-3 text-[#81b64c]" /> Tactics
                </span>
                <span className="text-xl font-black text-[#81b64c] font-mono mt-0.5">
                  {playerAStats?.tactics?.highest || playerAStats?.puzzles?.rating || 1500}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">Peak Rating</span>
              </div>
            </div>

            {/* Opening DNA Section */}
            <div className="p-4 rounded-3xl bg-[#211f1c] border-2 border-[#35322b] flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-cyan-400" />
                  <span>Opening DNA &amp; Win Rates</span>
                </span>
                <span className="text-[10px] text-zinc-400">Based on recent matches</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* As White */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                    <span>⚪ As White</span>
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {playerADna.openingsAsWhite.map((op, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-[#1a1815] border border-[#2e2b25] flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white truncate">{op.name}</span>
                          <span className="text-[9px] font-mono text-zinc-500 truncate">{op.moves}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-zinc-400 text-[11px]">{op.playedCount}g</span>
                          <span
                            className={`font-mono font-black text-[11px] px-1.5 py-0.5 rounded ${
                              op.winRatePct >= 55
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : op.winRatePct <= 40
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {op.winRatePct}% W
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* As Black */}
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1">
                    <span>⚫ As Black</span>
                  </span>
                  <div className="flex flex-col gap-1.5">
                    {playerADna.openingsAsBlack.map((op, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-xl bg-[#1a1815] border border-[#2e2b25] flex items-center justify-between text-xs"
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-white truncate">{op.name}</span>
                          <span className="text-[9px] font-mono text-zinc-500 truncate">{op.moves}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-zinc-400 text-[11px]">{op.playedCount}g</span>
                          <span
                            className={`font-mono font-black text-[11px] px-1.5 py-0.5 rounded ${
                              op.winRatePct >= 55
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : op.winRatePct <= 40
                                ? 'bg-rose-500/20 text-rose-400'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {op.winRatePct}% W
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Games Table */}
            <div className="p-4 rounded-3xl bg-[#211f1c] border-2 border-[#35322b] flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Recent Matches ({playerAGames.length})</span>
                </span>
                <span className="text-[10px] text-zinc-400">Click Review to analyze game</span>
              </div>

              <div className="flex flex-col divide-y divide-[#2d2a25] max-h-[320px] overflow-y-auto">
                {playerAGames.slice(0, 15).map((g) => (
                  <div key={g.id} className="py-2.5 px-2 flex items-center justify-between hover:bg-[#282520] transition rounded-xl gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-xs">{g.isUserWhite ? '⚪' : '⚫'}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-white truncate">
                          vs {g.opponent.username} ({g.opponent.rating})
                        </span>
                        <span className="text-[10px] text-zinc-400 capitalize">
                          {g.timeClass} • {g.movesCount || 30} moves
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                          g.userResult === 'win'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : g.userResult === 'loss'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {g.userResult}
                      </span>
                      <button
                        onClick={() => handleReviewGame(g)}
                        className="px-2.5 py-1 bg-[#81b64c] hover:bg-[#72a342] text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <Sparkles className="w-3 h-3 text-amber-200" />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HEAD-TO-HEAD SCOUT & "HOW TO BEAT THEM" */}
        {activeTab === 'scout' && (
          <div className="flex flex-col gap-4">
            {/* Opponent Selector / Compare Header */}
            <div className="p-4 rounded-3xl bg-[#211f1c] border-2 border-[#38342c] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                    <span>Scouting Dossier: How to Beat @{playerADna.username}</span>
                  </h2>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Tactical blueprint generated from their opening choices, blunder habits, and endgame conversion flaws.
                  </p>
                </div>
              </div>

              {/* Matchup Prediction Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 self-start sm:self-center shrink-0 ${
                  howToBeatThemPlan.matchupDifficulty === 'favorable'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : howToBeatThemPlan.matchupDifficulty === 'tough'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : howToBeatThemPlan.matchupDifficulty === 'underdog'
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{howToBeatThemPlan.predictedWinChancePct}% Win Prediction</span>
              </div>
            </div>

            {/* Side-by-Side Phase Comparison Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Openings Comparison */}
              <div className="p-3.5 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-zinc-400">Openings Phase</span>
                  <span className="text-xs font-black text-cyan-400">
                    {heroDna.phaseAnalysis.openingScore} vs {playerADna.phaseAnalysis.openingScore}
                  </span>
                </div>
                <div className="w-full bg-[#141210] h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${heroDna.phaseAnalysis.openingScore}%` }} />
                </div>
                <span className="text-[10px] text-zinc-400">
                  {heroDna.phaseAnalysis.openingScore >= playerADna.phaseAnalysis.openingScore
                    ? 'You have superior opening theory depth'
                    : 'They have stronger early line memorization'}
                </span>
              </div>

              {/* Middlegame Comparison */}
              <div className="p-3.5 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-zinc-400">Middlegame Tactics</span>
                  <span className="text-xs font-black text-amber-400">
                    {heroDna.phaseAnalysis.middlegameScore} vs {playerADna.phaseAnalysis.middlegameScore}
                  </span>
                </div>
                <div className="w-full bg-[#141210] h-2 rounded-full overflow-hidden flex">
                  <div className="bg-amber-500 h-full" style={{ width: `${heroDna.phaseAnalysis.middlegameScore}%` }} />
                </div>
                <span className="text-[10px] text-zinc-400">
                  Their tactical aggressiveness is rated at {playerADna.phaseAnalysis.tacticalAggressiveness}%.
                </span>
              </div>

              {/* Endgame Comparison */}
              <div className="p-3.5 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-zinc-400">Endgame Technique</span>
                  <span className="text-xs font-black text-[#81b64c]">
                    {heroDna.phaseAnalysis.endgameScore} vs {playerADna.phaseAnalysis.endgameScore}
                  </span>
                </div>
                <div className="w-full bg-[#141210] h-2 rounded-full overflow-hidden flex">
                  <div className="bg-[#81b64c] h-full" style={{ width: `${heroDna.phaseAnalysis.endgameScore}%` }} />
                </div>
                <span className="text-[10px] text-zinc-400">
                  Their endgame conversion score is {playerADna.phaseAnalysis.endgameScore}/100.
                </span>
              </div>
            </div>

            {/* Strategic Dossier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* 1. Recommended Weapon as White */}
              <div className="p-4 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-200 text-zinc-950 flex items-center justify-center font-black text-xs">
                    ⚪
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Your Opening As White</span>
                    <h3 className="text-xs font-black text-white">{howToBeatThemPlan.recommendedWeaponWhite.opening}</h3>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#81b64c] bg-[#141310] px-2.5 py-1 rounded-lg border border-[#2d2a23]">
                  {howToBeatThemPlan.recommendedWeaponWhite.moves}
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {howToBeatThemPlan.recommendedWeaponWhite.rationale}
                </p>
                <span className="text-[10px] font-bold text-amber-400">
                  ★ {howToBeatThemPlan.recommendedWeaponWhite.exploitFactor}
                </span>
              </div>

              {/* 2. Recommended Defense as Black */}
              <div className="p-4 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-700 text-white flex items-center justify-center font-black text-xs">
                    ⚫
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Your Defense As Black</span>
                    <h3 className="text-xs font-black text-white">{howToBeatThemPlan.recommendedDefenseBlack.defense}</h3>
                  </div>
                </div>
                <span className="font-mono text-xs text-[#81b64c] bg-[#141310] px-2.5 py-1 rounded-lg border border-[#2d2a23]">
                  {howToBeatThemPlan.recommendedDefenseBlack.moves}
                </span>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {howToBeatThemPlan.recommendedDefenseBlack.rationale}
                </p>
                <span className="text-[10px] font-bold text-amber-400">
                  ★ {howToBeatThemPlan.recommendedDefenseBlack.exploitFactor}
                </span>
              </div>

              {/* 3. Middlegame Strategy Plan */}
              <div className="p-4 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5" />
                  Middlegame Strategy: {howToBeatThemPlan.middlegameStrategy.title}
                </span>
                <p className="text-[11px] font-bold text-zinc-200">
                  {howToBeatThemPlan.middlegameStrategy.coreRule}
                </p>
                <ul className="flex flex-col gap-1.5 mt-1">
                  {howToBeatThemPlan.middlegameStrategy.actionablePointers.map((p, idx) => (
                    <li key={idx} className="text-[11px] text-zinc-400 flex items-start gap-1.5">
                      <span className="text-[#81b64c] font-black">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 4. Endgame Conversion Directive */}
              <div className="p-4 rounded-2xl bg-[#1e1c19] border-2 border-[#35322b] flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#81b64c] flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Endgame Blueprint: {howToBeatThemPlan.endgameStrategy.title}
                </span>
                <p className="text-[11px] font-bold text-zinc-200">
                  {howToBeatThemPlan.endgameStrategy.conversionPlan}
                </p>
                <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">
                  {howToBeatThemPlan.endgameStrategy.techniqueAdvice}
                </p>
                <div className="mt-2 pt-2 border-t border-[#2d2a25] flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-zinc-500">Psychological Edge</span>
                  <span className="text-[10px] text-zinc-400">{howToBeatThemPlan.psychologicalEdge[0]}</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Memo */}
            <div className="p-4 rounded-2xl bg-[#181614] border border-[#2d2a25] flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                <strong>Executive Scouting Summary:</strong> {howToBeatThemPlan.executiveSummary}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
