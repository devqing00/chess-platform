'use client';

import React from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { ClassificationBadge } from '../board/ClassificationBadge';
import {
  GameReviewReport,
  BoardTheme,
  PieceTheme,
  MoveClassification,
} from '@/types/chess';
import {
  ArrowLeft,
  Volume2,
  Sparkles,
  Play,
  Share2,
  Star,
  Award,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';

interface GameReviewSummaryViewProps {
  report: GameReviewReport;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  onStartInteractiveReview: () => void;
  onBackToGame: () => void;
}

export const GameReviewSummaryView: React.FC<GameReviewSummaryViewProps> = ({
  report,
  boardTheme,
  pieceTheme,
  onStartInteractiveReview,
  onBackToGame,
}) => {
  const { whitePlayer, blackPlayer, whiteAccuracy, blackAccuracy, tallies, evalTimeline, moves } = report;

  // Board position for summary: show final move or most brilliant move
  const keyMove = moves.find((m) => m.classification === 'brilliant') || moves[moves.length - 1];
  const summaryChess = new Chess(keyMove ? keyMove.fenAfter : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

  // Classification comparison rows matching Screenshot 3
  const classificationRows: {
    label: string;
    classification: MoveClassification;
    whiteCount: number;
    blackCount: number;
  }[] = [
    {
      label: 'Brilliant',
      classification: 'brilliant',
      whiteCount: tallies.white.brilliant,
      blackCount: tallies.black.brilliant,
    },
    {
      label: 'Great',
      classification: 'great',
      whiteCount: tallies.white.great,
      blackCount: tallies.black.great,
    },
    {
      label: 'Best',
      classification: 'best',
      whiteCount: tallies.white.best,
      blackCount: tallies.black.best,
    },
    {
      label: 'Mistake',
      classification: 'mistake',
      whiteCount: tallies.white.mistake,
      blackCount: tallies.black.mistake,
    },
    {
      label: 'Miss',
      classification: 'miss',
      whiteCount: tallies.white.miss,
      blackCount: tallies.black.miss,
    },
    {
      label: 'Blunder',
      classification: 'blunder',
      whiteCount: tallies.white.blunder,
      blackCount: tallies.black.blunder,
    },
  ];

  // SVG Evaluation graph points
  const points = evalTimeline.map((p, idx) => {
    const x = (idx / Math.max(1, evalTimeline.length - 1)) * 100;
    // Map eval from -800..+800 to 0..100% (50% is equal)
    const winProb = 1 / (1 + Math.pow(10, -p.score / 400));
    const y = 100 - winProb * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="flex flex-col h-full w-full bg-[#161512] text-zinc-100 select-none">
      {/* Top Header Bar */}
      <header className="h-14 px-4 lg:px-6 bg-[#1f1d1a] border-b border-[#2d2a26] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToGame}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Play</span>
          </button>
          <span className="text-zinc-600">|</span>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c] animate-pulse" />
            <h1 className="text-sm font-black text-white tracking-wide uppercase">
              Game Review Summary
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => soundService.playMove()}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer"
            title="Sound"
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={onStartInteractiveReview}
            className="px-4 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-[#81b64c]/20"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Review</span>
          </button>
        </div>
      </header>

      {/* Main Review Hub Body: 60/40 Split */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 flex items-center justify-center">
        <div className="flex flex-col xl:flex-row gap-6 w-full max-w-6xl items-center xl:items-start justify-center">
          {/* Left: Chessboard showing key highlight moment */}
          <div className="w-full max-w-[560px] flex flex-col gap-3 items-center">
            <ChessBoard
              chess={summaryChess}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              activeClassification={
                keyMove && keyMove.classification
                  ? { square: keyMove.to, classification: keyMove.classification }
                  : null
              }
              lastMove={keyMove ? { from: keyMove.from, to: keyMove.to } : null}
              disabled={true}
            />
            <div className="text-xs text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#06b6d4]" />
              <span>Displaying key tactical position from the game</span>
            </div>
          </div>

          {/* Right Context Panel (Matches Screenshot 3) */}
          <div className="w-full max-w-[480px] bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
            {/* Coach Speech Bubble Header */}
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 flex items-center justify-center shrink-0 shadow-lg text-2xl">
                👨‍💼
              </div>
              <div className="flex-1 bg-[#262421] border border-[#36332e] rounded-2xl p-3.5 shadow-md relative">
                <div className="absolute top-4 -left-2 w-3 h-3 bg-[#262421] border-l border-b border-[#36332e] rotate-45" />
                <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                  &ldquo;Right, let&apos;s go through this game and find some key moments.&rdquo;
                </p>
              </div>
            </div>

            {/* Evaluation Graph Across Moves */}
            <div className="bg-[#181614] border border-[#2a2824] rounded-xl p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span>Evaluation Graph</span>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {evalTimeline.length} plies
                </span>
              </div>
              <div className="relative h-16 w-full bg-[#12110f] rounded-lg overflow-hidden border border-[#22201d]">
                {/* Center equilibrium zero line */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-zinc-700/60" />
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                  <polygon
                    points={`0,100 ${points} 100,100`}
                    className="fill-[#81b64c]/20"
                  />
                  <polyline
                    fill="none"
                    stroke="#81b64c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                </svg>
              </div>
            </div>

            {/* Players Accuracy Comparison Cards (Screenshot 3) */}
            <div className="grid grid-cols-2 gap-3">
              {/* White Player */}
              <div className="bg-[#262421] border border-[#33302b] rounded-xl p-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{whitePlayer.avatar}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white truncate max-w-[100px]">
                      {whitePlayer.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {whitePlayer.rating}
                    </span>
                  </div>
                </div>
                <div className="w-full py-1.5 bg-[#181715] rounded-lg border border-[#302d28] flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Accuracy
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {whiteAccuracy}%
                  </span>
                </div>
              </div>

              {/* Black Player */}
              <div className="bg-[#262421] border border-[#33302b] rounded-xl p-3 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{blackPlayer.avatar}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-white truncate max-w-[100px]">
                      {blackPlayer.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {blackPlayer.rating}
                    </span>
                  </div>
                </div>
                <div className="w-full py-1.5 bg-[#181715] rounded-lg border border-[#302d28] flex flex-col items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Accuracy
                  </span>
                  <span className="text-xl font-black text-white font-mono">
                    {blackAccuracy}%
                  </span>
                </div>
              </div>
            </div>

            {/* Classification Comparison Matrix Table (Screenshot 3) */}
            <div className="bg-[#181614] border border-[#2a2824] rounded-xl overflow-hidden text-xs">
              <div className="px-3 py-2 bg-[#201e1b] border-b border-[#2d2a26] flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span>Move Classification</span>
                <div className="flex items-center gap-6 font-mono text-[10px]">
                  <span>WHITE</span>
                  <span>BLACK</span>
                </div>
              </div>

              <div className="divide-y divide-[#262420]">
                {classificationRows.map((row) => (
                  <div
                    key={row.classification}
                    className="px-3 py-2 flex items-center justify-between hover:bg-[#201e1a] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <ClassificationBadge classification={row.classification} size="sm" />
                      <span className="font-semibold text-zinc-200">{row.label}</span>
                    </div>

                    <div className="flex items-center gap-8 font-mono font-bold text-sm">
                      <span className={row.whiteCount > 0 ? 'text-zinc-100' : 'text-zinc-600'}>
                        {row.whiteCount}
                      </span>
                      <span className={row.blackCount > 0 ? 'text-zinc-100' : 'text-zinc-600'}>
                        {row.blackCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dominant Green CTA: Start Game Review (Screenshot 3) */}
            <button
              onClick={onStartInteractiveReview}
              className="w-full py-3.5 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white font-black text-sm tracking-wide shadow-xl shadow-[#81b64c]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Game Review</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
