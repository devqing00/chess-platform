'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Flame,
  Clock,
  Swords,
  Bot,
  GraduationCap,
  Users,
  Trophy,
  Award,
  ChevronRight,
  Play,
  Sparkles,
  Zap,
  Target,
  ArrowRight,
  TrendingUp,
  RotateCw,
  Crown,
  CheckCircle2,
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';
import { GameSessionStore, parsePgnToMoveRecords, countMovesInPgn, isSessionUserWhite, getSessionUserOutcome } from '@/lib/gameSessionStore';
import { GameSession } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { useAuth } from '@/context/AuthContext';
import { FullGameArchiveModal } from '@/components/modals/FullGameArchiveModal';

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
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600); // 10 min default

  // Mini-board sample positions
  const puzzleSampleChess = useMemo(
    () => new Chess('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5'),
    []
  );
  const lessonSampleChess = useMemo(
    () => new Chess('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2'),
    []
  );
  const reviewSampleChess = useMemo(
    () => new Chess('r1b1k2r/pppp1ppp/8/4q3/1bP5/2N5/PP1QPPPP/R3KB1R w KQkq - 2 10'),
    []
  );
  const dailyPuzzleChess = useMemo(
    () => new Chess('5rk1/5ppp/8/8/8/1Q6/5PPP/4R1K1 w - - 0 1'),
    []
  );

  // Retrieve actual player sessions or fallback to initial demonstration game after client mount
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [historyTab, setHistoryTab] = useState<'checkmate' | 'chesscom'>('checkmate');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  const [isRefreshingArchive, setIsRefreshingArchive] = useState<boolean>(false);

  const reloadSessions = () => {
    setRecentSessions(GameSessionStore.listRecentSessions());
  };

  const { user, profile, effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry, syncedChessCom } = useAuth();

  const handleRefreshArchive = async (silent: boolean = false) => {
    const username = syncedChessCom?.username;
    if (!username) {
      if (!silent) setIsRefreshingArchive(false);
      return;
    }
    if (!silent) setIsRefreshingArchive(true);
    try {
      const url = silent
        ? `/api/sync/chesscom?username=${encodeURIComponent(username)}`
        : `/api/sync/chesscom?refresh=true&username=${encodeURIComponent(username)}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.games) {
        const batchSessions: GameSession[] = json.games.map((g: any) => {
          const expectedResult =
            g.gameResult ||
            (g.userResult === 'win'
              ? g.isUserWhite
                ? '1-0'
                : '0-1'
              : g.userResult === 'loss'
              ? g.isUserWhite
                ? '0-1'
                : '1-0'
              : '1/2-1/2');

          const expectedWinner: 'w' | 'b' | 'draw' =
            expectedResult === '1-0'
              ? 'w'
              : expectedResult === '0-1'
              ? 'b'
              : 'draw';

          const approxMoves = g.movesCount || (g.pgn ? Math.ceil((g.pgn.match(/\b\d+\./g)?.length || 10)) : 15);

          return {
            id: g.id,
            source: 'chesscom',
            whitePlayer: {
              id: g.isUserWhite ? 'user-local' : 'opp',
              name: g.isUserWhite ? json.profile?.username || username : g.opponent.username,
              rating: g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
              avatar: g.isUserWhite ? json.profile?.avatar : '',
              country: g.isUserWhite ? json.profile?.country : '',
            },
            blackPlayer: {
              id: !g.isUserWhite ? 'user-local' : 'opp',
              name: !g.isUserWhite ? json.profile?.username || username : g.opponent.username,
              rating: !g.isUserWhite ? g.userPlayer.rating : g.opponent.rating,
              avatar: !g.isUserWhite ? json.profile?.avatar : '',
              country: !g.isUserWhite ? json.profile?.country : '',
            },
            timeControl: parseInt(g.timeControl) || 600,
            variant: 'standard',
            moves: g.moves || [],
            movesCount: approxMoves,
            pgn: g.pgn || '',
            fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
            isGameOver: true,
            gameResult: expectedResult,
            resultDetails: {
              winner: expectedWinner,
              reason: g.userPlayer?.result === 'win' ? 'checkmate' : 'resignation',
              ratingDelta: 0,
              newRating: g.userPlayer?.rating || 1200,
              league: '',
              trophiesDelta: 0,
            },
            reviewReport: null,
            createdAt: g.playedAt ? new Date(g.playedAt).getTime() : g.timestamp || Date.now(),
            updatedAt: Date.now(),
          };
        });

        GameSessionStore.saveSessionsBatch(batchSessions);
        localStorage.setItem('chess_com_imported_games', JSON.stringify(json.games));
        reloadSessions();
      }
    } catch (err) {
      console.warn('Failed to refresh archive:', err);
    } finally {
      if (!silent) setIsRefreshingArchive(false);
    }
  };

  useEffect(() => {
    reloadSessions();
    // 1. Initial live fetch on mount
    handleRefreshArchive(true);

    // 2. Continuous background interval polling every 30 seconds
    const intervalId = setInterval(() => {
      handleRefreshArchive(true);
    }, 30000);

    // 3. Window focus event listener (instant sync when user tabs back from Chess.com)
    const handleFocus = () => {
      handleRefreshArchive(true);
    };
    window.addEventListener('focus', handleFocus);

    // 4. Tab visibility change listener
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRefreshArchive(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const checkmateSessions = useMemo(
    () => recentSessions.filter((s) => s.source !== 'chesscom' && !s.id.startsWith('chesscom-')),
    [recentSessions]
  );
  const chesscomSessions = useMemo(
    () => recentSessions.filter((s) => s.source === 'chesscom' || s.id.startsWith('chesscom-')),
    [recentSessions]
  );
  const displayedRecent = historyTab === 'checkmate' ? checkmateSessions : chesscomSessions;

  // Spotlight Bot for quick challenge
  const featuredBot = CHESS_BOTS[0] || {
    id: 'martin',
    name: 'Martin',
    rating: 250,
    avatar: '🤖',
    bio: 'Casual beginner bot, perfect for warming up.',
    playStyle: 'Friendly',
  };

  const displayName = effectiveDisplayName;
  const rapidRating = effectiveRating;
  const blitzRating = profile?.ratings?.blitz || 370;

  // Real statistics computed directly from session archive
  const realStats = useMemo(() => {
    let wins = 0;
    let draws = 0;
    let losses = 0;

    recentSessions.forEach((s) => {
      const outcome = getSessionUserOutcome(s, displayName);
      if (outcome === 'win') wins++;
      else if (outcome === 'loss') losses++;
      else if (outcome === 'draw') draws++;
    });

    const total = recentSessions.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const drawRate = total > 0 ? Math.round((draws / total) * 100) : 0;
    const lossRate = total > 0 ? Math.max(0, 100 - winRate - drawRate) : 0;

    return { total, wins, draws, losses, winRate, drawRate, lossRate };
  }, [recentSessions, displayName]);

  return (
    <div className="w-full max-w-[1240px] flex flex-col gap-5 py-2 px-2 sm:px-4 text-zinc-100 select-none animate-in fade-in duration-200 overflow-x-hidden min-w-0">
      {/* Top Player Profile HUD Card */}
      <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-4 sm:p-5 shadow-[0_4px_0_0_#141311] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Avatar + Details */}
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
          {/* Avatar with subtle border and status */}
          <div className="relative shrink-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#282521] border-2 border-[#3d3830] shadow-[0_3px_0_0_#141311] flex items-center justify-center text-2xl sm:text-3xl overflow-hidden">
              {effectiveAvatar && effectiveAvatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={effectiveAvatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>♟️</span>
              )}
            </div>
            {syncedChessCom && (
              <span
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#81b64c] border-2 border-[#21201d] flex items-center justify-center shadow-sm"
                title="Chess.com Account Linked"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            )}
          </div>

          {/* User Credentials & Real Ratings */}
          <div className="flex flex-col min-w-0 gap-1.5">
            {/* Name + Flag + Tier */}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className="text-base sm:text-xl font-black text-white tracking-tight">
                {displayName}
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-md bg-[#171513] border border-[#2e2b26] font-semibold text-zinc-300 flex items-center gap-1 shrink-0"
                title={effectiveCountry === 'ng' ? 'Nigeria' : 'Global'}
              >
                <span>{effectiveCountry === 'ng' ? '🇳🇬' : '🌐'}</span>
                <span className="uppercase text-[10px] font-bold text-zinc-400">
                  {effectiveCountry === 'ng' ? 'NG' : 'INT'}
                </span>
              </span>
              <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_2px_0_0_#141311] flex items-center gap-1 shrink-0">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>Diamond VIP</span>
              </span>
            </div>

            {/* Micro rating pills - authentic ratings */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#171513] border border-[#2e2b26] rounded-lg shadow-sm">
                <Zap className="w-3.5 h-3.5 text-[#81b64c]" />
                <span className="text-[11px] text-zinc-400 font-medium">Rapid:</span>
                <span className="font-mono font-bold text-white text-[11px]">{rapidRating}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#171513] border border-[#2e2b26] rounded-lg shadow-sm">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] text-zinc-400 font-medium">Blitz:</span>
                <span className="font-mono font-bold text-white text-[11px]">{blitzRating}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#171513] border border-[#2e2b26] rounded-lg shadow-sm">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] text-zinc-400 font-medium">Matches:</span>
                <span className="font-mono font-bold text-white text-[11px]">{recentSessions.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Clean, single profile action */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0 pt-2 md:pt-0 border-t border-[#2b2823] md:border-0">
          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="w-full md:w-auto px-4 py-2 rounded-xl bg-[#26231f] hover:bg-[#322e28] text-zinc-200 hover:text-white text-xs font-black uppercase tracking-wider border-2 border-[#3a352c] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#81b64c]" />
              <span>{syncedChessCom ? 'Chess.com Synced' : 'Connect Chess.com'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left 8-col Operations, Right 4-col Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start w-full min-w-0">
        {/* Left Column (8 cols): Quick Play Hero + 3 Core Action Cards + Bot Spotlight + Match History */}
        <div className="lg:col-span-8 flex flex-col gap-5 w-full min-w-0">
          {/* Top 4 Functional Cards: Responsive grid 1 col mobile, 2 col tablet/laptop, 4 col 2xl */}
          <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-4 gap-3.5 sm:gap-4">
            {/* 1. Play Online Card */}
            <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311] hover:-translate-y-0.5 transition-transform duration-150">
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b-2 border-[#2c2924]">
                  <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Swords className="w-4 h-4 text-[#81b64c]" />
                    Play Online
                  </span>
                  <span className="text-[10px] font-black text-[#81b64c] uppercase tracking-wider bg-[#81b64c]/15 px-2 py-0.5 rounded-full border border-[#81b64c]/30">
                    Live Match
                  </span>
                </div>

                {/* Time Control Options */}
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { label: '3 min', sub: 'Blitz', sec: 180 },
                    { label: '5 min', sub: 'Blitz', sec: 300 },
                    { label: '10 min', sub: 'Rapid', sec: 600 },
                  ].map((tc) => (
                    <button
                      key={tc.sec}
                      onClick={() => setSelectedTimeControl(tc.sec)}
                      className={`py-2 px-1 rounded-xl text-center transition-all duration-150 cursor-pointer border-2 flex flex-col items-center gap-0.5 ${
                        selectedTimeControl === tc.sec
                          ? 'bg-[#81b64c]/20 text-white border-[#81b64c] shadow-[0_2px_0_0_#4d7a24] translate-y-0.5'
                          : 'bg-[#181614] text-zinc-400 border-[#302e2b] shadow-[0_2px_0_0_#141311] hover:text-white hover:border-[#403d38]'
                      }`}
                    >
                      <span className="text-xs font-black font-mono leading-none">{tc.label}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{tc.sub}</span>
                    </button>
                  ))}
                </div>

                {/* Rated Arena Matchmaking Status Pill */}
                <div className="flex items-center justify-between text-[10px] text-zinc-400 bg-[#171513] px-2.5 py-1.5 rounded-xl border border-[#2d2a25]">
                  <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#81b64c] animate-pulse" />
                    Rated Matchmaking
                  </span>
                  <span className="font-mono font-bold text-zinc-400">Rapid {rapidRating}</span>
                </div>
              </div>

              {/* Start Game Action & Shortcuts */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onStartGame(selectedTimeControl)}
                  className="w-full py-2.5 bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Game</span>
                </button>

                {/* Quick Navigation Shortcuts */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenBots()}
                    className="py-1.5 px-2 bg-[#262420] hover:bg-[#302d28] rounded-full border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-blue-400" />
                    <span>Spar Bot</span>
                  </button>
                  <button
                    onClick={() => onStartGame(selectedTimeControl)}
                    className="py-1.5 px-2 bg-[#262420] hover:bg-[#302d28] rounded-full border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Play Friend</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Solve Puzzles Mini Board Card */}
            <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-[0_4px_0_0_#141311] hover:-translate-y-0.5 transition-transform duration-150">
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#2c2924]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  Tactics
                </span>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Rush &amp; Rated
                </span>
              </div>

              <div className="w-full max-w-[130px] sm:max-w-[140px] aspect-square mx-auto my-1.5 rounded-xl overflow-hidden border-2 border-[#35322c] bg-[#1a1816] shadow-inner">
                <ChessBoard chess={puzzleSampleChess} disabled={true} />
              </div>

              <div className="flex flex-col text-center">
                <span className="text-xs font-black text-white">Daily Tactical Puzzles</span>
                <span className="text-[10px] text-zinc-400 font-medium">Solve rated puzzles &amp; tactics</span>
              </div>

              <button
                onClick={onOpenPuzzles}
                className="w-full py-2.5 bg-[#2a2723] hover:bg-[#35312c] text-zinc-200 text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#3d3932] shadow-[0_3px_0_0_#141311] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Train Tactics</span>
              </button>
            </div>

            {/* 3. Next Lesson Mini Board Card */}
            <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-[0_4px_0_0_#141311] hover:-translate-y-0.5 transition-transform duration-150">
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#2c2924]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  Lessons
                </span>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/30">
                  Guided
                </span>
              </div>

              <div className="w-full max-w-[130px] sm:max-w-[140px] aspect-square mx-auto my-1.5 rounded-xl overflow-hidden border-2 border-[#35322c] bg-[#1a1816] shadow-inner">
                <ChessBoard chess={lessonSampleChess} disabled={true} />
              </div>

              <div className="flex flex-col text-center">
                <span className="text-xs font-black text-white">Escape Check</span>
                <span className="text-[10px] text-cyan-400 font-bold">Beginner Track &bull; Step 1</span>
              </div>

              <button
                onClick={onOpenLessons}
                className="w-full py-2.5 bg-[#2a2723] hover:bg-[#35312c] text-zinc-200 text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#3d3932] shadow-[0_3px_0_0_#141311] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Continue Lesson</span>
              </button>
            </div>

            {/* 4. Review Game Mini Board Card */}
            <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-[0_4px_0_0_#141311] hover:-translate-y-0.5 transition-transform duration-150">
              <div className="flex items-center justify-between pb-2 border-b-2 border-[#2c2924]">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Game Review
                </span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  AI Coach
                </span>
              </div>

              <div className="w-full max-w-[130px] sm:max-w-[140px] aspect-square mx-auto my-1.5 rounded-xl overflow-hidden border-2 border-[#35322c] bg-[#1a1816] shadow-inner">
                <ChessBoard chess={reviewSampleChess} disabled={true} />
              </div>

              <div className="flex flex-col text-center">
                <span className="text-xs font-black text-white">Coach Accuracy Report</span>
                <span className="text-[10px] text-emerald-400 font-bold">Stockfish &bull; CAPS Analysis</span>
              </div>

              <button
                onClick={() => onOpenReview()}
                className="w-full py-2.5 bg-[#2a2723] hover:bg-[#35312c] text-zinc-200 text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#3d3932] shadow-[0_3px_0_0_#141311] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Review Game</span>
              </button>
            </div>
          </div>

          {/* Featured Bot Challenge Card */}
          <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 shadow-[0_4px_0_0_#141311] overflow-hidden w-full min-w-0">
            <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#2a2723] border-2 border-[#3d3932] shadow-[0_3px_0_0_#141311] flex items-center justify-center text-2xl sm:text-3xl shrink-0">
                {featuredBot.avatar || '🤖'}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-black text-white truncate">{featuredBot.name}</span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                    {featuredBot.rating} ELO
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full shrink-0">
                    Featured Bot
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-medium italic mt-1 leading-relaxed">
                  "{featuredBot.bio || featuredBot.playStyle}"
                </p>
              </div>
            </div>

            <button
              onClick={() => onOpenBots(featuredBot.id)}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Challenge Bot</span>
            </button>
          </div>

          {/* Real Match History & Recent Games Table */}
          <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl overflow-hidden shadow-[0_4px_0_0_#141311]">
            {/* Header & Source Switcher Tabs */}
            <div className="p-2.5 sm:p-3.5 bg-[#1b1916] border-b-2 border-[#2d2a26] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              {/* Top row on mobile / Left group on desktop: Source Tabs & Sync */}
              <div className="flex items-center justify-between sm:justify-start gap-2 overflow-x-auto no-scrollbar">
                {/* Tactile Segmented Source Tabs */}
                <div className="flex items-center bg-[#141311] p-0.5 rounded-full border-2 border-[#2c2924] shrink-0">
                  <button
                    onClick={() => setHistoryTab('checkmate')}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      historyTab === 'checkmate'
                        ? 'bg-[#81b64c] text-white border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                        : 'text-zinc-400 hover:text-white border-2 border-transparent'
                    }`}
                  >
                    <Swords className="w-3 h-3" />
                    <span>My Games ({checkmateSessions.length})</span>
                  </button>

                  <button
                    onClick={() => setHistoryTab('chesscom')}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
                      historyTab === 'chesscom'
                        ? 'bg-[#81b64c] text-white border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                        : 'text-zinc-400 hover:text-white border-2 border-transparent'
                    }`}
                  >
                    <span>🌐</span>
                    <span>Connected ({chesscomSessions.length})</span>
                  </button>
                </div>

                {/* Manual Refresh / Sync Button */}
                <button
                  onClick={() => handleRefreshArchive(false)}
                  disabled={isRefreshingArchive}
                  title="Refresh connected games"
                  className="px-2.5 py-1 rounded-full bg-[#272420] hover:bg-[#343029] text-zinc-300 hover:text-[#81b64c] border-2 border-[#3b3730] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-black uppercase tracking-wider disabled:opacity-50 shrink-0"
                >
                  <RotateCw className={`w-3 h-3 ${isRefreshingArchive ? 'animate-spin text-[#81b64c]' : ''}`} />
                  <span>Sync</span>
                </button>
              </div>

              {/* Bottom row on mobile / Right group on desktop: Auto-Sync & Full Archive */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-black uppercase tracking-wider bg-[#161513] px-2.5 py-1 rounded-full border-2 border-[#2b2823]">
                  <RotateCw className="w-3 h-3 text-[#81b64c]" />
                  <span>Synced</span>
                </div>

                {/* View Full Game Archive Button */}
                <button
                  onClick={() => setIsArchiveModalOpen(true)}
                  className="px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#2b2824] hover:bg-[#38342e] text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-200 border-2 border-[#3d3831] hover:border-[#81b64c] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>Full History</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#81b64c]" />
                </button>
              </div>
            </div>

            {/* Games Table List */}
            <div className="divide-y divide-[#282521] text-xs">
              {displayedRecent.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-400">
                  <span className="text-2xl">♟️</span>
                  <span className="font-extrabold text-white text-sm">
                    {historyTab === 'checkmate'
                      ? 'No games played yet'
                      : 'No connected games found'}
                  </span>
                  <span className="text-xs text-zinc-400 max-w-sm">
                    {historyTab === 'checkmate'
                      ? 'Play a game with friends or test your skills against a computer bot above!'
                      : 'Optionally link your Chess.com or Lichess account to import past games for game review.'}
                  </span>
                  {historyTab === 'chesscom' && onOpenSyncModal && (
                    <button
                      onClick={onOpenSyncModal}
                      className="mt-2 px-4 py-2 bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer"
                    >
                      Connect Account (Optional)
                    </button>
                  )}
                </div>
              ) : (
                displayedRecent.slice(0, 5).map((session, idx) => {
                  const currentUsername = syncedChessCom?.username || effectiveDisplayName || user?.displayName || 'Player';
                  const isUserWhite = isSessionUserWhite(session, currentUsername);
                  const userPlayer = isUserWhite ? session.whitePlayer : session.blackPlayer;
                  const oppPlayer = isUserWhite ? session.blackPlayer : session.whitePlayer;
                  const outcome = getSessionUserOutcome(session, currentUsername);
                  const isWin = outcome === 'win';
                  const isDraw = outcome === 'draw';

                  const moveCount =
                    session.moves && session.moves.length > 0
                      ? Math.ceil(session.moves.length / 2)
                      : session.movesCount || (session.pgn ? countMovesInPgn(session.pgn) : 0);

                  const rawScore = session.gameResult?.includes('1-0')
                    ? '1 - 0'
                    : session.gameResult?.includes('0-1')
                    ? '0 - 1'
                    : session.gameResult?.includes('1/2')
                    ? '½ - ½'
                    : session.isGameOver
                    ? (isWin ? (isUserWhite ? '1 - 0' : '0 - 1') : isDraw ? '½ - ½' : (isUserWhite ? '0 - 1' : '1 - 0'))
                    : 'Live';

                  return (
                    <div
                      key={session.id || idx}
                      className="px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-[#262420] transition-colors"
                    >
                      {/* Players & Time Control */}
                      <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                        <span className="text-amber-400 font-mono text-xs shrink-0 mt-0.5 sm:mt-0">⚡</span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-200 text-xs sm:text-sm flex-wrap">
                            <span className="text-xs" title={isUserWhite ? 'White pieces' : 'Black pieces'}>
                              {isUserWhite ? '⚪' : '⚫'}
                            </span>
                            <span className="truncate max-w-[100px] sm:max-w-[130px] md:max-w-[160px]">{userPlayer.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">({userPlayer.rating})</span>
                            <span className="text-zinc-500 font-normal text-xs">vs</span>
                            <span className="text-xs" title={isUserWhite ? 'Black pieces' : 'White pieces'}>
                              {isUserWhite ? '⚫' : '⚪'}
                            </span>
                            <span className="text-white truncate max-w-[100px] sm:max-w-[130px] md:max-w-[160px]">{oppPlayer.name}</span>
                            <span className="text-[10px] text-zinc-400 font-mono">({oppPlayer.rating})</span>
                          </div>
                          <span className="text-[10px] text-zinc-400 flex items-center gap-1.5 font-medium mt-0.5">
                            <span>{session.timeControl ? `${Math.floor(session.timeControl / 60)} min` : 'Casual'}</span>
                            <span>•</span>
                            <span className="font-mono font-bold text-zinc-300">{moveCount} moves</span>
                            <span>•</span>
                            <span className="capitalize">{session.variant || 'Standard'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Result & Instant Review Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-2.5 pt-1 sm:pt-0 border-t border-[#25221f] sm:border-0 shrink-0">
                        <div
                          className={`font-black uppercase tracking-wider text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1 rounded-full flex items-center gap-1.5 border-2 shadow-[0_2px_0_0_#141311] ${
                            isWin
                              ? 'text-white bg-[#81b64c] border-[#4d7a24]'
                              : isDraw
                              ? 'text-zinc-300 bg-zinc-800 border-zinc-700'
                              : 'text-rose-200 bg-rose-900 border-rose-950'
                          }`}
                        >
                          <span>{isWin ? 'Win' : isDraw ? 'Draw' : 'Loss'}</span>
                          <span className="font-bold opacity-80">{rawScore}</span>
                        </div>

                        <button
                          onClick={() => onOpenReview(session.id)}
                          className="px-3 sm:px-3.5 py-1 bg-[#2b2824] hover:bg-[#38342e] text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-200 rounded-full border-2 border-[#3d3931] hover:border-[#81b64c] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#81b64c]" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Daily Puzzle + Streaks + Longitudinal Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4 w-full min-w-0">
          {/* Daily Puzzle Card */}
          <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-4 flex flex-col gap-3 shadow-[0_4px_0_0_#141311]">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#2b2823]">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-amber-400" />
                Daily Puzzle
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#81b64c] bg-[#81b64c]/15 border border-[#81b64c]/40 px-2 py-0.5 rounded-full">
                  Today
                </span>
              </div>
            </div>

            <div className="w-full max-w-[210px] sm:max-w-[230px] mx-auto aspect-square rounded-xl overflow-hidden border-2 border-[#35322c] bg-[#1a1816] shadow-inner">
              <ChessBoard chess={dailyPuzzleChess} disabled={true} />
            </div>

            <div className="flex flex-col text-center">
              <div className="flex items-center justify-center gap-1.5 mb-0.5">
                <span className="text-xs font-black text-white">Ricochet Saves the Day</span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">Deflection</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-medium">White to move &bull; Tactical Challenge</span>
            </div>

            <button
              onClick={onOpenPuzzles}
              className="w-full py-2.5 bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-amber-300" />
              <span>Solve Daily Puzzle</span>
            </button>
          </div>

          {/* Performance & Rating Stats */}
          <div className="bg-[#21201d] border-2 border-[#35322b] rounded-2xl p-4 flex flex-col gap-3.5 shadow-[0_4px_0_0_#141311] text-xs">
            <div className="flex items-center justify-between pb-2 border-b-2 border-[#2d2a26]">
              <span className="font-black uppercase tracking-wider text-white flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                Player Statistics
              </span>
              {onOpenInsights && (
                <button
                  onClick={onOpenInsights}
                  className="text-[11px] font-black uppercase tracking-wider text-[#81b64c] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Insights</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Win / Loss / Draw Visual Ratio Bar */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-300">
                  Win Rate:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {realStats.total > 0 ? `${realStats.winRate}%` : '—'}
                  </strong>
                </span>
                <span className="font-mono text-zinc-400 text-[10px]">
                  {realStats.total} {realStats.total === 1 ? 'match' : 'matches'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#181614] overflow-hidden flex border border-[#302d27]">
                {realStats.total > 0 ? (
                  <>
                    <div
                      style={{ width: `${realStats.winRate}%` }}
                      className="h-full bg-[#81b64c]"
                      title={`${realStats.winRate}% Wins`}
                    />
                    <div
                      style={{ width: `${realStats.drawRate}%` }}
                      className="h-full bg-zinc-500"
                      title={`${realStats.drawRate}% Draws`}
                    />
                    <div
                      style={{ width: `${realStats.lossRate}%` }}
                      className="h-full bg-rose-500"
                      title={`${realStats.lossRate}% Losses`}
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-zinc-800" />
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono font-medium px-0.5">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#81b64c]" />
                  {realStats.wins}W
                </span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                  {realStats.draws}D
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {realStats.losses}L
                </span>
              </div>
            </div>

            {/* 2x2 Micro-Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#181614] border border-[#2d2a25] rounded-xl p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap className="w-3 h-3 text-[#81b64c]" />
                  Rapid
                </span>
                <span className="text-sm font-black font-mono text-[#81b64c]">{rapidRating}</span>
                <span className="text-[9px] text-zinc-400 font-medium">Current ELO</span>
              </div>

              <div className="bg-[#181614] border border-[#2d2a25] rounded-xl p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Blitz
                </span>
                <span className="text-sm font-black font-mono text-amber-400">{blitzRating}</span>
                <span className="text-[9px] text-zinc-400 font-medium">Current ELO</span>
              </div>

              <div className="bg-[#181614] border border-[#2d2a25] rounded-xl p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Swords className="w-3 h-3 text-cyan-400" />
                  Check·mate
                </span>
                <span className="text-sm font-black font-mono text-white">{checkmateSessions.length}</span>
                <span className="text-[9px] text-cyan-400 font-medium">Platform Matches</span>
              </div>

              <div className="bg-[#181614] border border-[#2d2a25] rounded-xl p-2.5 flex flex-col gap-0.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-emerald-400" />
                  Chess.com
                </span>
                <span className="text-sm font-black font-mono text-white">{chesscomSessions.length}</span>
                <span className="text-[9px] text-zinc-400 font-medium">Synced Archive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Game Archive Modal */}
      <FullGameArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        sessions={recentSessions}
        onReviewGame={(gameId) => onOpenReview(gameId)}
        onOpenSyncModal={onOpenSyncModal}
        onRefreshArchive={handleRefreshArchive}
      />
    </div>
  );
};
