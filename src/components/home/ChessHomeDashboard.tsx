'use client';

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { CHESS_BOTS } from '@/lib/botsData';
import { useAuth } from '@/context/AuthContext';

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
  const { user, profile } = useAuth();

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

  // Retrieve actual player sessions or fallback to initial demonstration game
  const recentSessions = useMemo(() => {
    return GameSessionStore.listRecentSessions();
  }, []);

  // Spotlight Bot for quick challenge
  const featuredBot = CHESS_BOTS[0] || {
    id: 'martin',
    name: 'Martin',
    rating: 250,
    avatar: '🤖',
    bio: 'Casual beginner bot, perfect for warming up.',
    playStyle: 'Friendly',
  };

  const displayName = profile?.displayName || user?.displayName || 'rapid_qing';
  const rapidRating = profile?.ratings?.rapid || 429;
  const blitzRating = profile?.ratings?.blitz || 370;

  return (
    <div className="w-full max-w-[1240px] flex flex-col gap-5 py-2 px-2 sm:px-4 text-zinc-100 select-none animate-in fade-in duration-200">
      {/* Top Player Welcome & Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2d2a26]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#282521] border border-[#3d3830] flex items-center justify-center text-xl shadow">
            {profile?.avatar && profile.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt={displayName} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span>♟️</span>
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black text-white">{displayName}</span>
              <span className="text-sm">🇳🇬</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#312e29] text-zinc-300">
                Rapid {rapidRating}
              </span>
            </div>
            <span className="text-xs text-zinc-400">
              Welcome back to your Grandmaster suite. Ready for your next rated game?
            </span>
          </div>
        </div>

        {/* Streak, Chess.com Sync & League Badges */}
        <div className="flex items-center gap-2">
          {onOpenSyncModal && (
            <button
              onClick={onOpenSyncModal}
              className="flex items-center gap-1.5 bg-[#81b64c]/15 border border-[#81b64c]/40 hover:bg-[#81b64c] text-[#81b64c] hover:text-white px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <span>♟️ Sync Chess.com</span>
            </button>
          )}
          <div className="flex items-center gap-2 bg-[#21201d] border border-[#35322c] px-3.5 py-1.5 rounded-full shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-xs font-black text-amber-300 font-mono">12 Day Streak</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-[#21201d] border border-[#35322c] px-3 py-1.5 rounded-full text-xs text-zinc-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">Elite League</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left 8-col Operations, Right 4-col Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8 cols): Quick Play Hero + 3 Core Action Cards + Bot Spotlight + Match History */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Top 4 Functional Cards: Quick Play Box + 3 Mini Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* 1. Play Online Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3 flex flex-col justify-between shadow-lg hover:border-[#3d3a33] transition">
              <div>
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-[#81b64c]" />
                  Play Online
                </span>

                {/* Time Control Options */}
                <div className="grid grid-cols-3 gap-1 my-2">
                  {[
                    { label: '3 min', sec: 180 },
                    { label: '5 min', sec: 300 },
                    { label: '10 min', sec: 600 },
                  ].map((tc) => (
                    <button
                      key={tc.sec}
                      onClick={() => setSelectedTimeControl(tc.sec)}
                      className={`py-1 rounded text-[10px] font-bold transition cursor-pointer ${
                        selectedTimeControl === tc.sec
                          ? 'bg-[#3d3931] text-white font-black border border-[#4d473c]'
                          : 'bg-[#181614] text-zinc-400 hover:text-white'
                      }`}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Game Action */}
              <button
                onClick={() => onStartGame(selectedTimeControl)}
                className="w-full py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Game</span>
              </button>

              {/* Quick Navigation Shortcuts */}
              <div className="grid grid-cols-2 gap-1 mt-2">
                <button
                  onClick={() => onOpenBots()}
                  className="py-1 px-1.5 bg-[#292622] hover:bg-[#332f2a] rounded-lg text-[10px] font-bold text-zinc-300 flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Bot className="w-3 h-3 text-blue-400" />
                  <span>Bots</span>
                </button>
                <button
                  onClick={() => onStartGame(selectedTimeControl)}
                  className="py-1 px-1.5 bg-[#292622] hover:bg-[#332f2a] rounded-lg text-[10px] font-bold text-zinc-300 flex items-center justify-center gap-1 transition cursor-pointer"
                >
                  <Users className="w-3 h-3 text-emerald-400" />
                  <span>Friend</span>
                </button>
              </div>
            </div>

            {/* 2. Solve Puzzles Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg hover:border-[#3d3a33] transition">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c] bg-[#1a1816]">
                <ChessBoard chess={puzzleSampleChess} disabled={true} />
              </div>
              <div className="flex items-center justify-between my-1 px-1 text-[10px]">
                <span className="font-mono text-zinc-400">Tactics</span>
                <span className="font-bold text-[#81b64c]">Rush & Rated</span>
              </div>
              <button
                onClick={onOpenPuzzles}
                className="w-full py-1.5 bg-[#292622] hover:bg-[#35312a] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Target className="w-3 h-3 text-amber-400" />
                <span>Solve Puzzles</span>
              </button>
            </div>

            {/* 3. Next Lesson Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg hover:border-[#3d3a33] transition">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c] bg-[#1a1816]">
                <ChessBoard chess={lessonSampleChess} disabled={true} />
              </div>
              <span className="text-[10px] font-bold text-cyan-400 text-center my-1 truncate px-1">
                🎓 Getting Out of Check
              </span>
              <button
                onClick={onOpenLessons}
                className="w-full py-1.5 bg-[#292622] hover:bg-[#35312a] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                <GraduationCap className="w-3 h-3 text-cyan-400" />
                <span>Next Lesson</span>
              </button>
            </div>

            {/* 4. Review Game Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg hover:border-[#3d3a33] transition">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c] bg-[#1a1816]">
                <ChessBoard chess={reviewSampleChess} disabled={true} />
              </div>
              <span className="text-[10px] font-bold text-emerald-400 text-center my-1 truncate px-1">
                Coach Danny Analysis
              </span>
              <button
                onClick={() => onOpenReview()}
                className="w-full py-1.5 bg-[#292622] hover:bg-[#35312a] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Review Game</span>
              </button>
            </div>
          </div>

          {/* Featured Bot Challenge Card (Replaces the fake static friend banner) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#2a2723] border border-[#3d3932] flex items-center justify-center text-2xl shadow">
                {featuredBot.avatar || '🤖'}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-white">{featuredBot.name}</span>
                  <span className="text-xs font-mono text-zinc-400">({featuredBot.rating})</span>
                  <span className="text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                    Featured Bot
                  </span>
                </div>
                <span className="text-xs text-zinc-400">{featuredBot.bio || featuredBot.playStyle}</span>
              </div>
            </div>

            <button
              onClick={() => onOpenBots(featuredBot.id)}
              className="px-4 py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Challenge Bot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Real Match History & Recent Games Table */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl overflow-hidden shadow-lg">
            <div className="p-3.5 bg-[#1b1916] border-b border-[#2d2a26] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#81b64c]" />
                <span className="text-xs font-black text-white">Recent Match History</span>
              </div>
              <button
                onClick={() => onOpenReview()}
                className="text-[11px] font-bold text-[#81b64c] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>Full Game Review Archive</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#282521] text-xs">
              {recentSessions.slice(0, 5).map((session, idx) => {
                const isUserWhite = session.whitePlayer.name.toLowerCase().includes('qing') || session.whitePlayer.name.toLowerCase().includes('you');
                const userPlayer = isUserWhite ? session.whitePlayer : session.blackPlayer;
                const oppPlayer = isUserWhite ? session.blackPlayer : session.whitePlayer;
                const isWin = session.resultDetails?.winner === (isUserWhite ? 'w' : 'b');
                const isDraw = session.resultDetails?.winner === 'draw';

                return (
                  <div
                    key={session.id || idx}
                    className="px-3.5 py-3 flex items-center justify-between hover:bg-[#262420] transition"
                  >
                    {/* Players & Time Control */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-amber-400 font-mono text-xs">⚡</span>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-200 truncate">
                          <span>{userPlayer.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({userPlayer.rating})</span>
                          <span className="text-zinc-500 font-normal">vs</span>
                          <span className="text-white">{oppPlayer.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">({oppPlayer.rating})</span>
                        </div>
                        <span className="text-[10px] text-zinc-400">
                          {session.timeControl ? `${Math.floor(session.timeControl / 60)} min` : 'Casual'} • {session.moves.length} moves • {session.variant}
                        </span>
                      </div>
                    </div>

                    {/* Result & Instant Review Action */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-black font-mono text-xs px-2 py-0.5 rounded ${
                          isWin
                            ? 'text-[#81b64c] bg-[#81b64c]/15'
                            : isDraw
                            ? 'text-zinc-300 bg-zinc-800'
                            : 'text-rose-400 bg-rose-950/30'
                        }`}
                      >
                        {session.gameResult?.includes('1-0')
                          ? '1 - 0'
                          : session.gameResult?.includes('0-1')
                          ? '0 - 1'
                          : session.gameResult?.includes('1/2')
                          ? '½ - ½'
                          : session.isGameOver
                          ? 'Finished'
                          : 'Live'}
                      </span>

                      <button
                        onClick={() => onOpenReview(session.id)}
                        className="px-3 py-1 bg-[#2b2824] hover:bg-[#38342e] text-[11px] font-bold text-zinc-200 rounded-lg border border-[#3d3931] hover:border-[#81b64c] transition cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-[#81b64c]" />
                        <span>Review</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Daily Puzzle + Streaks + Longitudinal Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Daily Puzzle Card */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                Daily Puzzle
              </span>
              <span className="text-[10px] font-bold text-[#81b64c] bg-[#81b64c]/15 px-1.5 py-0.5 rounded">
                Today
              </span>
            </div>
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c] bg-[#1a1816]">
              <ChessBoard chess={dailyPuzzleChess} disabled={true} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Ricochet Saves the Day</span>
              <span className="text-[10px] text-zinc-400">White to move and win material</span>
            </div>
            <button
              onClick={onOpenPuzzles}
              className="w-full py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Solve Daily Puzzle</span>
            </button>
          </div>

          {/* Performance & Rating Stats */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-md text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-[#2d2a26]">
              <span className="font-black text-white flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                Player Statistics
              </span>
              {onOpenInsights && (
                <button
                  onClick={onOpenInsights}
                  className="text-[10px] font-bold text-[#81b64c] hover:underline cursor-pointer"
                >
                  Insights
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2 text-[11px] font-mono">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Total Games</span>
                <span className="font-bold text-white">542</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Puzzles Solved</span>
                <span className="font-bold text-white">167</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Lessons Completed</span>
                <span className="font-bold text-white">22</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Rapid ELO</span>
                <span className="font-bold text-[#81b64c]">{rapidRating}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-zinc-400">Blitz ELO</span>
                <span className="font-bold text-[#81b64c]">{blitzRating}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
