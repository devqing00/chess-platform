'use client';

import React from 'react';
import {
  Swords,
  GraduationCap,
  Bot,
  Puzzle,
  Tv,
  Newspaper,
  Smartphone,
  ChevronRight,
  Sparkles,
  Award,
  Play,
} from 'lucide-react';
import { ChessBoard } from '@/components/board/ChessBoard';
import { Chess } from 'chess.js';

interface ChessLandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
  onChallengeBot: () => void;
  onStartLesson: () => void;
  onSolvePuzzles: () => void;
}

export const ChessLandingPage: React.FC<ChessLandingPageProps> = ({
  onGetStarted,
  onLogin,
  onChallengeBot,
  onStartLesson,
  onSolvePuzzles,
}) => {
  const heroChess = new Chess('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2');

  return (
    <div className="w-full flex flex-col items-center gap-16 py-8 px-4 sm:px-8 text-zinc-100 select-none max-w-6xl">
      {/* 1. Hero Section (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-4">
        {/* Left: Big Interactive Chessboard */}
        <div className="w-full max-w-[480px] mx-auto aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-[#272522]">
          <ChessBoard chess={heroChess} disabled={true} />
        </div>

        {/* Right: Pitch & CTA */}
        <div className="flex flex-col items-start gap-4">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Play Chess Online on the #1 Site!
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
            Join 200+ million players in the world&apos;s largest chess community. Learn from grandmasters, solve daily tactics, and compete in real-time.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onGetStarted}
              className="py-4 px-8 bg-[#81b64c] hover:bg-[#73a542] active:bg-[#68973b] text-white text-lg font-black rounded-2xl shadow-xl shadow-[#81b64c]/25 transition cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={onLogin}
              className="py-4 px-6 bg-[#2b2824] hover:bg-[#36322d] text-zinc-200 text-sm font-bold rounded-2xl border border-[#3b3833] transition cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </section>

      {/* 2. Improve Your Game with Lessons (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t border-[#2a2723]">
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Improve Your Game with Lessons
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Learn with grandmaster lessons designed for players of all levels. Master pins, forks, endgame technique, and opening principles.
          </p>
          <button
            onClick={onStartLesson}
            className="py-3 px-6 bg-[#2b2824] hover:bg-[#34302a] text-[#38bdf8] border border-[#38bdf8]/30 font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer mt-1"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Start a Lesson</span>
          </button>
        </div>

        {/* Isometric Tiles Visual */}
        <div className="flex items-center justify-center p-6 bg-[#1f1d19] rounded-3xl border border-[#302d27]">
          <div className="grid grid-cols-3 gap-3 text-center">
            {['🎓 Tactics', '♟️ Endgames', '👑 Openings', '🛡️ Defense', '⚔️ Attacks', '💎 Mastery'].map(
              (title, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#2b2824] rounded-2xl border border-[#3d3a33] text-xs font-bold text-zinc-200 shadow"
                >
                  {title}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* 3. Play Chess Bots (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t border-[#2a2723]">
        {/* Avatars Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-6 bg-[#1f1d19] rounded-3xl border border-[#302d27]">
          {['Martin (250)', 'Elena (550)', 'Nelson (1300)', 'Danny (2500)', 'Hikaru (2820)', 'Gotham (2000)', 'Kramnik (2750)', 'Stockfish 17'].map(
            (bot, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#2b2824] rounded-xl border border-[#3a3731] flex flex-col items-center text-center gap-1"
              >
                <div className="w-8 h-8 rounded-full bg-[#1c1a17] flex items-center justify-center text-sm">
                  🤖
                </div>
                <span className="text-[10px] font-bold text-zinc-200 truncate max-w-[64px]">
                  {bot}
                </span>
              </div>
            )
          )}
        </div>

        <div className="flex flex-col items-start gap-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Play Chess Bots
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Play against virtual personalities varying in skill and playing style. Friendly beginners to ruthless super-grandmasters.
          </p>
          <button
            onClick={onChallengeBot}
            className="py-3 px-6 bg-[#2b2824] hover:bg-[#34302a] text-[#81b64c] border border-[#81b64c]/40 font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer mt-1"
          >
            <Bot className="w-4 h-4" />
            <span>Challenge a Bot</span>
          </button>
        </div>
      </section>

      {/* 4. Level Up with Chess Puzzles (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t border-[#2a2723]">
        <div className="flex flex-col items-start gap-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Level Up with Chess Puzzles
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Sharpen your tactics and improve your tactical awareness with hundreds of thousands of curated puzzles from real tournament games.
          </p>
          <button
            onClick={onSolvePuzzles}
            className="py-3 px-6 bg-[#81b64c] hover:bg-[#73a542] text-white font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer mt-1 shadow-lg shadow-[#81b64c]/20"
          >
            <Puzzle className="w-4 h-4" />
            <span>Solve Puzzles</span>
          </button>
        </div>

        <div className="p-6 bg-[#1f1d19] rounded-3xl border border-[#302d27] flex flex-col items-center justify-center text-center gap-3">
          <span className="text-3xl font-black font-mono text-amber-400">7,035 🏆</span>
          <span className="text-xs text-zinc-400">Rated Tactical Arena • Puzzle Rush • Daily Tactics</span>
        </div>
      </section>

      {/* 5. Watch the Best in the World Compete (Image 1 Parity) */}
      <section className="w-full py-6 border-t border-[#2a2723] flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Watch the Best in the World Compete
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl">
            Tune in for live events, Speed Chess Championships, and grandmaster tournaments with real-time commentary.
          </p>
        </div>

        {/* Livestream Frame */}
        <div className="w-full max-w-3xl mx-auto aspect-video rounded-3xl bg-[#1e1c18] border border-[#332f2a] overflow-hidden flex items-center justify-center shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="flex flex-col items-center gap-2 z-10">
            <div className="w-16 h-16 rounded-full bg-[#81b64c] flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
            <span className="text-xs font-bold text-white">Magnus Carlsen vs Hikaru Nakamura • Live Final</span>
          </div>
        </div>
      </section>

      {/* 6. Latest Chess News (Image 1 Parity) */}
      <section className="w-full py-6 border-t border-[#2a2723] flex flex-col gap-6">
        <h2 className="text-2xl font-black text-white">Latest Chess News</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: "Woodward, Shunkhand Strike; Alice Lee Joins Women's Leaders",
              date: 'October 12, 2026',
              category: 'Tournament Report',
            },
            {
              title: 'Wesley So, Awonder Liang Lead Open; Perfect Scores Recorded',
              date: 'October 12, 2026',
              category: 'Championship',
            },
            {
              title: 'Nakamura Makes History With Record 6th Straight Bullet Brawl Victory',
              date: 'October 11, 2026',
              category: 'Bullet Brawl',
            },
          ].map((news, idx) => (
            <div
              key={idx}
              className="p-4 bg-[#1f1d19] border border-[#302d27] rounded-2xl flex flex-col justify-between gap-3 hover:bg-[#282520] transition cursor-pointer"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#81b64c] uppercase tracking-wider">
                  {news.category}
                </span>
                <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">
                  {news.title}
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">{news.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Bottom Final CTA (Image 1 Parity) */}
      <section className="w-full py-12 border-t border-[#2a2723] flex flex-col items-center text-center gap-4">
        <h2 className="text-3xl sm:text-5xl font-black text-white">
          Learn, Play, and Have Fun!
        </h2>
        <button
          onClick={onGetStarted}
          className="py-4 px-10 bg-[#81b64c] hover:bg-[#73a542] text-white text-lg font-black rounded-2xl shadow-xl shadow-[#81b64c]/25 transition cursor-pointer"
        >
          Get Started
        </button>
      </section>
    </div>
  );
};
