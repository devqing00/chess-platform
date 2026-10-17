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
        <div className="w-full max-w-[480px] mx-auto aspect-square rounded-3xl overflow-hidden border-2 border-[#35322b] shadow-[0_8px_0_0_#141311]">
          <ChessBoard chess={heroChess} disabled={true} />
        </div>

        {/* Right: Pitch & CTA */}
        <div className="flex flex-col items-start gap-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#81b64c]/15 border-2 border-[#81b64c]/40 text-[#81b64c] text-xs font-black uppercase tracking-wider shadow-[0_2px_0_0_#141311]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Duolingo-Style Tactile Chess</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Play Chess Online on the #1 Site!
          </h1>
          <p className="text-sm sm:text-base text-zinc-400 font-medium leading-relaxed">
            Join 200+ million players in the world&apos;s largest chess community. Learn from grandmasters, solve daily tactics, and compete in real-time.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={onGetStarted}
              className="py-4 px-8 bg-[#81b64c] hover:bg-[#73a542] text-white text-base font-black rounded-full border-2 border-[#5c8a32] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center gap-2"
            >
              <Swords className="w-5 h-5" />
              <span>Get Started</span>
            </button>
            <button
              onClick={onLogin}
              className="py-4 px-6 bg-[#262420] hover:bg-[#312e29] text-zinc-200 text-sm font-black rounded-full border-2 border-[#3d3933] shadow-[0_4px_0_0_#141311] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </section>

      {/* 2. Improve Your Game with Lessons (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t-2 border-[#35322b]">
        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-sky-500/15 border-2 border-sky-500/40 text-sky-400 text-[10px] font-black uppercase tracking-wider">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Interactive Academy</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Improve Your Game with Lessons
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Learn with grandmaster lessons designed for players of all levels. Master pins, forks, endgame technique, and opening principles.
          </p>
          <button
            onClick={onStartLesson}
            className="py-3 px-6 bg-[#38bdf8] hover:bg-[#0284c7] text-[#0f172a] font-black text-xs rounded-full border-2 border-[#0284c7] shadow-[0_4px_0_0_#0369a1] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#0369a1] transition-all flex items-center gap-2 cursor-pointer mt-1"
          >
            <GraduationCap className="w-4 h-4" />
            <span>Start a Lesson</span>
          </button>
        </div>

        {/* Isometric Tiles Visual */}
        <div className="flex items-center justify-center p-6 bg-[#211f1c] rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311]">
          <div className="grid grid-cols-3 gap-3 text-center w-full">
            {['Tactics', 'Endgames', 'Openings', 'Defense', 'Attacks', 'Mastery'].map(
              (title, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-[#262420] rounded-2xl border-2 border-[#35322b] text-xs font-black text-zinc-200 shadow-[0_3px_0_0_#141311] hover:-translate-y-[2px] transition-transform"
                >
                  {title}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* 3. Play Chess Bots (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t-2 border-[#35322b]">
        {/* Avatars Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 p-6 bg-[#211f1c] rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311]">
          {['Martin (250)', 'Elena (550)', 'Nelson (1300)', 'Danny (2500)', 'Hikaru (2820)', 'Gotham (2000)', 'Kramnik (2750)', 'Stockfish 17'].map(
            (bot, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#262420] rounded-2xl border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] flex flex-col items-center text-center gap-1 hover:-translate-y-[2px] transition-transform"
              >
                <div className="w-8 h-8 rounded-full bg-[#1c1a17] border border-[#35322b] flex items-center justify-center text-sm shadow-inner">
                  🤖
                </div>
                <span className="text-[10px] font-black text-zinc-200 truncate max-w-[64px]">
                  {bot}
                </span>
              </div>
            )
          )}
        </div>

        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#81b64c]/15 border-2 border-[#81b64c]/40 text-[#81b64c] text-[10px] font-black uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Sparring Engine</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Play Chess Bots
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Play against virtual personalities varying in skill and playing style. Friendly beginners to ruthless super-grandmasters.
          </p>
          <button
            onClick={onChallengeBot}
            className="py-3 px-6 bg-[#81b64c] hover:bg-[#73a542] text-white font-black text-xs rounded-full border-2 border-[#5c8a32] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all flex items-center gap-2 cursor-pointer mt-1"
          >
            <Bot className="w-4 h-4" />
            <span>Challenge a Bot</span>
          </button>
        </div>
      </section>

      {/* 4. Level Up with Chess Puzzles (Image 1 Parity) */}
      <section className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-6 border-t-2 border-[#35322b]">
        <div className="flex flex-col items-start gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/15 border-2 border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-wider">
            <Puzzle className="w-3.5 h-3.5" />
            <span>Tactical Training</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Level Up with Chess Puzzles
          </h2>
          <p className="text-sm text-zinc-400 font-medium">
            Sharpen your tactics and improve your tactical awareness with hundreds of thousands of curated puzzles from real tournament games.
          </p>
          <button
            onClick={onSolvePuzzles}
            className="py-3 px-6 bg-[#f59e0b] hover:bg-[#d97706] text-white font-black text-xs rounded-full border-2 border-[#b45309] shadow-[0_4px_0_0_#92400e] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#92400e] transition-all flex items-center gap-2 cursor-pointer mt-1"
          >
            <Puzzle className="w-4 h-4" />
            <span>Solve Puzzles</span>
          </button>
        </div>

        <div className="p-6 bg-[#211f1c] rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] flex flex-col items-center justify-center text-center gap-3">
          <span className="text-4xl font-black font-mono text-amber-400 drop-shadow">7,035 🏆</span>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181614] border-2 border-[#35322b] text-xs font-bold text-zinc-400">
            <span>Rated Tactical Arena</span>
            <span>•</span>
            <span>Puzzle Rush</span>
            <span>•</span>
            <span>Daily Tactics</span>
          </div>
        </div>
      </section>

      {/* 5. Watch the Best in the World Compete (Image 1 Parity) */}
      <section className="w-full py-6 border-t-2 border-[#35322b] flex flex-col gap-6">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-rose-500/15 border-2 border-rose-500/40 text-rose-400 text-[10px] font-black uppercase tracking-wider">
            <Tv className="w-3.5 h-3.5" />
            <span>Grandmaster Streams</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white">
            Watch the Best in the World Compete
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl">
            Tune in for live events, Speed Chess Championships, and grandmaster tournaments with real-time commentary.
          </p>
        </div>

        {/* Livestream Frame */}
        <div className="w-full max-w-3xl mx-auto aspect-video rounded-3xl bg-[#1e1c18] border-2 border-[#35322b] overflow-hidden flex items-center justify-center shadow-[0_8px_0_0_#141311] relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <div className="flex flex-col items-center gap-3 z-10">
            <div className="w-16 h-16 rounded-full bg-[#81b64c] border-2 border-[#5c8a32] shadow-[0_4px_0_0_#4d7a24] flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all">
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </div>
            <span className="text-xs font-black text-white bg-black/60 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-sm">
              Magnus Carlsen vs Hikaru Nakamura • Live Final
            </span>
          </div>
        </div>
      </section>

      {/* 6. Latest Chess News (Image 1 Parity) */}
      <section className="w-full py-6 border-t-2 border-[#35322b] flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white">Latest Chess News</h2>
          <div className="flex items-center gap-1 text-xs font-bold text-[#81b64c] hover:underline cursor-pointer">
            <span>Read All Articles</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
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
              className="p-4 bg-[#211f1c] border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] rounded-2xl flex flex-col justify-between gap-3 hover:-translate-y-1 hover:border-[#81b64c]/60 transition-all cursor-pointer"
            >
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-black text-[#81b64c] uppercase tracking-wider">
                  {news.category}
                </span>
                <h3 className="text-xs font-bold text-white leading-snug line-clamp-2">
                  {news.title}
                </h3>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono font-bold">{news.date}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Bottom Final CTA (Image 1 Parity) */}
      <section className="w-full py-12 border-t-2 border-[#35322b] flex flex-col items-center text-center gap-4">
        <h2 className="text-3xl sm:text-5xl font-black text-white">
          Learn, Play, and Have Fun!
        </h2>
        <button
          onClick={onGetStarted}
          className="py-4 px-10 bg-[#81b64c] hover:bg-[#73a542] text-white text-lg font-black rounded-full border-2 border-[#5c8a32] shadow-[0_5px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center gap-2.5"
        >
          <Swords className="w-6 h-6" />
          <span>Get Started Free</span>
        </button>
      </section>
    </div>
  );
};
