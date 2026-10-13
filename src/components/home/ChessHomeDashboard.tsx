'use client';

import React, { useState } from 'react';
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
  Heart,
  Play,
  Sparkles,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';

interface ChessHomeDashboardProps {
  onStartGame: (timeControl: number) => void;
  onOpenBots: () => void;
  onOpenLessons: () => void;
  onOpenPuzzles: () => void;
  onOpenReview: () => void;
}

export const ChessHomeDashboard: React.FC<ChessHomeDashboardProps> = ({
  onStartGame,
  onOpenBots,
  onOpenLessons,
  onOpenPuzzles,
  onOpenReview,
}) => {
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600); // 10 min default

  // Sample positions for the 3 mini-cards (Screenshot 3 Parity)
  const puzzleSampleChess = new Chess('r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5');
  const lessonSampleChess = new Chess('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2');
  const reviewSampleChess = new Chess('r1b1k2r/pppp1ppp/8/4q3/1bP5/2N5/PP1QPPPP/R3KB1R w KQkq - 2 10');
  const dailyPuzzleChess = new Chess('5rk1/5ppp/8/8/8/1Q6/5PPP/4R1K1 w - - 0 1');

  // Authentic game history matching Screenshot 3
  const gameHistory = [
    {
      opponent: 'Checkacabra',
      oppRating: 1250,
      oppFlag: '🇯🇵',
      user: 'rapid_qing',
      userRating: 429,
      userFlag: '🇳🇬',
      result: '1 - 0',
      isWin: true,
      accuracy: 74.2,
      moves: 45,
      date: 'Oct 12, 2026',
      time: '5 min',
    },
    {
      opponent: 'Aman_22_03',
      oppRating: 344,
      oppFlag: '🇮🇳',
      user: 'rapid_qing',
      userRating: 370,
      userFlag: '🇳🇬',
      result: '0 - 1',
      isWin: true,
      accuracy: 68.5,
      moves: 38,
      date: 'Oct 12, 2026',
      time: '5 min',
    },
    {
      opponent: 'Checkacabra',
      oppRating: 1250,
      oppFlag: '🇯🇵',
      user: 'rapid_qing',
      userRating: 429,
      userFlag: '🇳🇬',
      result: '0 - 1',
      isWin: false,
      accuracy: 62.1,
      moves: 53,
      date: 'Oct 12, 2026',
      time: '5 min',
    },
    {
      opponent: 'Checkacabra',
      oppRating: 1250,
      oppFlag: '🇯🇵',
      user: 'rapid_qing',
      userRating: 429,
      userFlag: '🇳🇬',
      result: '½ - ½',
      isWin: false,
      isDraw: true,
      accuracy: 71.0,
      moves: 109,
      date: 'Oct 12, 2026',
      time: '5 min',
    },
    {
      opponent: 'Checkacabra',
      oppRating: 1250,
      oppFlag: '🇯🇵',
      user: 'rapid_qing',
      userRating: 429,
      userFlag: '🇳🇬',
      result: '1 - 0',
      isWin: true,
      accuracy: 79.4,
      moves: 36,
      date: 'Oct 11, 2026',
      time: '5 min',
    },
    {
      opponent: 'Hey-CatZ',
      oppRating: 326,
      oppFlag: '🇧🇷',
      user: 'rapid_qing',
      userRating: 362,
      userFlag: '🇳🇬',
      result: '0 - 1',
      isWin: true,
      accuracy: 65.8,
      moves: 54,
      date: 'Oct 11, 2026',
      time: '5 min',
    },
    {
      opponent: 'indrajitv357',
      oppRating: 352,
      oppFlag: '🇮🇳',
      user: 'rapid_qing',
      userRating: 354,
      userFlag: '🇳🇬',
      result: '1 - 0',
      isWin: true,
      accuracy: 72.3,
      moves: 34,
      date: 'Oct 11, 2026',
      time: '5 min',
    },
    {
      opponent: 'PatriceCool',
      oppRating: 383,
      oppFlag: '🇵🇱',
      user: 'rapid_qing',
      userRating: 346,
      userFlag: '🇳🇬',
      result: '1 - 0',
      isWin: true,
      accuracy: 81.0,
      moves: 8,
      date: 'Oct 11, 2026',
      time: '5 min',
    },
  ];

  return (
    <div className="w-full max-w-[1280px] flex flex-col gap-6 py-4 px-2 sm:px-4 text-zinc-100 select-none">
      {/* Top User Bar (Screenshot 3 Parity) */}
      <div className="flex items-center justify-between pb-3 border-b border-[#2d2a26]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#2b2824] border border-[#3d3933] flex items-center justify-center text-lg font-bold">
            ♟️
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-white">rapid_qing</span>
            <span className="text-sm">🇳🇬</span>
          </div>
        </div>

        {/* 12 Days Streak Pill */}
        <div className="flex items-center gap-2 bg-[#21201d] border border-[#35322c] px-3.5 py-1.5 rounded-full shadow-sm">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-xs font-black text-white font-mono">12 Days</span>
        </div>
      </div>

      {/* Main Grid: Left 2/3 Content, Right 1/3 Widgets (Screenshot 3 Parity) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Play Card + 3 Mini Cards + Match Banner + Game History */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Top Row: Play Online Box + 3 Mini Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            {/* 1. Play Online Box */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col justify-between shadow-lg">
              <span className="text-xs font-black text-zinc-300">Play Online</span>

              {/* Time Control Options */}
              <div className="grid grid-cols-3 gap-1 my-2">
                {[
                  { label: '5 min', sec: 300 },
                  { label: '10 min', sec: 600 },
                  { label: '3 days', sec: 0 },
                ].map((tc) => (
                  <button
                    key={tc.sec}
                    onClick={() => setSelectedTimeControl(tc.sec)}
                    className={`py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      selectedTimeControl === tc.sec
                        ? 'bg-[#3b3832] text-white font-black'
                        : 'bg-[#181614] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>

              {/* Start Game Action */}
              <button
                onClick={() => onStartGame(selectedTimeControl)}
                className="w-full py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer"
              >
                Start Game
              </button>

              {/* Navigation Grid Buttons */}
              <div className="flex flex-col gap-1 mt-2.5">
                <button
                  onClick={() => onStartGame(600)}
                  className="py-1.5 px-2 bg-[#2b2824] hover:bg-[#34312c] rounded-lg text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  <span>Play Online</span>
                </button>
                <button
                  onClick={onOpenBots}
                  className="py-1.5 px-2 bg-[#2b2824] hover:bg-[#34312c] rounded-lg text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-blue-400" />
                  <span>Play Bots</span>
                </button>
                <button
                  onClick={onOpenLessons}
                  className="py-1.5 px-2 bg-[#2b2824] hover:bg-[#34312c] rounded-lg text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Play Coach</span>
                </button>
                <button
                  onClick={() => onStartGame(600)}
                  className="py-1.5 px-2 bg-[#2b2824] hover:bg-[#34312c] rounded-lg text-[11px] font-bold text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Play a Friend</span>
                </button>
              </div>
            </div>

            {/* 2. Solve Puzzles Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c]">
                <ChessBoard chess={puzzleSampleChess} disabled={true} />
              </div>
              <div className="flex items-center gap-1.5 my-1 px-1">
                <span className="text-[10px] font-mono text-zinc-400">💎 9,757</span>
                <div className="flex-1 h-1 bg-[#33302b] rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-[#81b64c]" />
                </div>
              </div>
              <button
                onClick={onOpenPuzzles}
                className="w-full py-1.5 bg-[#2b2824] hover:bg-[#36332d] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Solve Puzzles
              </button>
            </div>

            {/* 3. Next Lesson Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c]">
                <ChessBoard chess={lessonSampleChess} disabled={true} />
              </div>
              <span className="text-[10px] font-bold text-cyan-400 text-center my-1 truncate px-1">
                🎓 Getting Out of Check
              </span>
              <button
                onClick={onOpenLessons}
                className="w-full py-1.5 bg-[#2b2824] hover:bg-[#36332d] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Next Lesson
              </button>
            </div>

            {/* 4. Review Game Mini Board Card */}
            <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
              <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c]">
                <ChessBoard chess={reviewSampleChess} disabled={true} />
              </div>
              <span className="text-[10px] font-bold text-zinc-400 text-center my-1 truncate px-1">
                vs Aman_22_03
              </span>
              <button
                onClick={onOpenReview}
                className="w-full py-1.5 bg-[#2b2824] hover:bg-[#36332d] text-zinc-200 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Review Game
              </button>
            </div>
          </div>

          {/* Recommended Match Banner (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#2b2824] border border-[#3a3731] flex items-center justify-center">
                <span className="text-xl">🏁</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white">NexWily-01</span>
                  <span className="text-[10px] font-mono text-zinc-400">(417)</span>
                  <span className="text-[9px] font-black uppercase bg-[#81b64c]/20 text-[#81b64c] px-1 rounded">
                    Friend
                  </span>
                </div>
                <span className="text-[11px] text-zinc-400">Standard • Rated • 3 days</span>
              </div>
            </div>

            <button
              onClick={() => onStartGame(600)}
              className="px-4 py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer"
            >
              Challenge
            </button>
          </div>

          {/* Game History Table (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl overflow-hidden shadow-lg">
            <div className="p-3.5 bg-[#1c1a17] border-b border-[#2d2a26] flex items-center justify-between">
              <span className="text-xs font-black text-white">Game History</span>
              <button
                onClick={onOpenReview}
                className="text-[11px] font-bold text-[#81b64c] hover:underline cursor-pointer flex items-center gap-0.5"
              >
                <span>View All Games</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-[#2a2723] text-xs">
              {gameHistory.map((g, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#282521] transition"
                >
                  {/* Players Column */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">⚡</span>
                    <span className="text-[10px] text-zinc-400 font-mono">{g.time}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1 font-bold text-zinc-200 truncate">
                        <span>{g.userFlag}</span>
                        <span className="text-white">{g.user}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">({g.userRating})</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-400 truncate">
                        <span>{g.oppFlag}</span>
                        <span>{g.opponent}</span>
                        <span className="text-[10px] font-mono">({g.oppRating})</span>
                      </div>
                    </div>
                  </div>

                  {/* Result & Review Action Column */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`font-black font-mono text-xs px-1.5 py-0.5 rounded ${
                        g.isWin
                          ? 'text-[#81b64c] bg-[#81b64c]/10'
                          : g.isDraw
                          ? 'text-zinc-300 bg-zinc-800'
                          : 'text-rose-400 bg-rose-950/20'
                      }`}
                    >
                      {g.result}
                    </span>

                    <button
                      onClick={onOpenReview}
                      className="px-2.5 py-1 bg-[#2b2824] hover:bg-[#38342e] text-[11px] font-bold text-zinc-200 rounded-lg border border-[#3b3731] transition cursor-pointer"
                    >
                      Review
                    </button>

                    <div className="hidden sm:flex flex-col items-end text-[10px] text-zinc-400 font-mono">
                      <span>{g.moves} moves</span>
                      <span className="text-[9px] text-zinc-500">{g.date}</span>
                    </div>

                    <button className="text-zinc-500 hover:text-rose-400 transition cursor-pointer">
                      <Heart className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Daily Puzzle, Streak, Friends, Stream, Stats */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Daily Puzzle Card (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-lg">
            <span className="text-xs font-black text-white">Daily Puzzle</span>
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-[#35322c]">
              <ChessBoard chess={dailyPuzzleChess} disabled={true} />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Ricochet Saves the Day</span>
              <span className="text-[10px] text-zinc-400">Solved by 85,192 players</span>
            </div>
            <button
              onClick={onOpenPuzzles}
              className="w-full py-2 bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black rounded-xl transition shadow cursor-pointer"
            >
              Solve Daily Puzzle
            </button>
          </div>

          {/* 12 Day Streak Card (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">12 Day Streak</span>
                <div className="flex gap-1.5 mt-0.5 text-[9px] font-bold text-zinc-400">
                  <span>P ✓</span>
                  <span>S ✓</span>
                  <span>S ✓</span>
                  <span>M ✓</span>
                  <span className="text-amber-400">T ✓</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-black text-amber-400">12 🔥</span>
          </div>

          {/* Elite League Card (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-xs font-black text-white">Elite League</span>
                <span className="text-[10px] text-zinc-400">You are in 17th place</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500" />
          </div>

          {/* Friends Online (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col gap-2 shadow-md text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-white">Friends</span>
              <span className="text-[10px] text-zinc-400">3 Online</span>
            </div>
            <div className="flex items-center gap-2 py-1">
              {['NexWily-01', 'ToluKey', 'PROMISE...'].map((name, idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-lg bg-[#2e2b26] border border-[#3d3a33] flex items-center justify-center text-xs font-bold">
                    🧑‍💻
                  </div>
                  <span className="text-[9px] text-zinc-400 truncate max-w-[48px]">{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Afrchessbeginner Stream Video Embed Frame (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3 flex flex-col gap-1.5 shadow-md">
            <span className="text-[11px] font-black text-white">Afrchessbeginner • Live Stream</span>
            <div className="w-full aspect-video rounded-xl bg-black/60 border border-[#332f2a] overflow-hidden relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
              <span className="absolute top-2 left-2 text-[9px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">
                LIVE
              </span>
              <Play className="w-8 h-8 text-white/80 fill-white/80 hover:scale-110 transition cursor-pointer" />
            </div>
          </div>

          {/* Stats Card (Screenshot 3 Parity) */}
          <div className="bg-[#21201d] border border-[#302e2b] rounded-2xl p-3.5 flex flex-col gap-2 shadow-md text-xs">
            <div className="flex items-center justify-between pb-1 border-b border-[#2d2a26]">
              <span className="font-black text-white">Stats</span>
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="flex flex-col gap-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-400">Games</span>
                <span className="font-bold text-white">542</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Puzzles</span>
                <span className="font-bold text-white">167</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Lessons</span>
                <span className="font-bold text-white">22</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Rapid</span>
                <span className="font-bold text-[#81b64c]">429</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Blitz</span>
                <span className="font-bold text-[#81b64c]">370</span>
              </div>
            </div>
          </div>

          {/* Remove Ads Blue Button */}
          <button className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl transition shadow cursor-pointer">
            🚫 Remove Ads
          </button>
        </div>
      </div>

      {/* Footer (Screenshot 3 Parity) */}
      <footer className="pt-8 pb-4 text-center text-[10px] text-zinc-500 flex flex-col items-center gap-2 border-t border-[#2a2824]">
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
          <span className="hover:underline cursor-pointer">Support</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Language</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">About</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Jobs</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Developers</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Privacy Policy</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Cheating & Fair Play</span>
          <span>•</span>
          <span className="hover:underline cursor-pointer">Chess.com © 2026</span>
        </div>
      </footer>
    </div>
  );
};
