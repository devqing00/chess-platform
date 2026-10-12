'use client';

import React, { useState } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
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
  RotateCcw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Target,
  Layers,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';

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

  // Interactive Blunder Retry State
  const [isBlunderModalOpen, setIsBlunderModalOpen] = useState(false);
  const [blunderStatus, setBlunderStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
  const [blunderChess, setBlunderChess] = useState(() => {
    return new Chess(
      report.blunderRetryPuzzle?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    );
  });

  const puzzle = report.blunderRetryPuzzle;

  const handleBlunderMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!puzzle || blunderStatus === 'correct' || blunderStatus === 'revealed') return;

    try {
      const clone = new Chess(blunderChess.fen());
      const res = clone.move({ from, to, promotion: promotion || 'q' });
      if (!res) return;

      const isSolution =
        res.san === puzzle.solutionSan ||
        `${res.from}${res.to}`.toLowerCase() === puzzle.solutionSan.toLowerCase();

      setBlunderChess(clone);

      if (isSolution) {
        setBlunderStatus('correct');
        soundService.playPuzzleSuccess();
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } else {
        setBlunderStatus('wrong');
        soundService.playMove();
      }
    } catch {
      // invalid move
    }
  };

  const resetBlunderPuzzle = () => {
    if (puzzle) {
      setBlunderChess(new Chess(puzzle.fen));
      setBlunderStatus('idle');
    }
  };

  const revealBlunderSolution = () => {
    if (puzzle) {
      try {
        const clone = new Chess(puzzle.fen);
        clone.move(puzzle.solutionSan);
        setBlunderChess(clone);
        setBlunderStatus('revealed');
        soundService.playMove();
      } catch {
        // fallback
      }
    }
  };

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
          {/* Left Column: Board & Eval Graph */}
          <div className="flex flex-col items-center gap-4 w-full max-w-[560px]">
            <ChessBoard
              chess={summaryChess}
              orientation="w"
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              disabled={true}
            />

            {/* Evaluation Flow Area Chart */}
            <div className="w-full bg-[#1b1917] p-3 rounded-xl border border-[#2d2a26] flex flex-col gap-1.5 shadow-lg">
              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span>Evaluation Advantage Over Time</span>
                <span className="font-mono text-xs text-[#81b64c] font-black">
                  {moves.length} Plies Analyzed
                </span>
              </div>
              <div className="h-16 w-full bg-[#12110f] rounded-lg border border-[#282622] relative overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 h-[1px] bg-zinc-700/60" />
                <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
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
          </div>

          {/* Right Column: CAPS Accuracies, Phases, Matrix, and Actions */}
          <div className="w-full max-w-md flex flex-col gap-4">
            {/* Accuracy Comparison Card */}
            <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Computer Accuracy (CAPS 2.0)
                </span>
                {report.opening && (
                  <span className="text-[11px] font-bold text-[#81b64c] bg-[#161512] px-2 py-0.5 rounded border border-[#2d2a26]">
                    {report.opening.eco}: {report.opening.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* White Player Acc */}
                <div className="bg-[#161512] p-3 rounded-xl border border-[#2d2a26] flex flex-col">
                  <span className="text-xs font-bold text-zinc-200 truncate">{whitePlayer.name}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Accuracy</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5">{whiteAccuracy}%</span>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-zinc-400">
                    <span>Est. Elo: <strong className="text-[#81b64c]">{report.whiteEstimatedElo || 1500}</strong></span>
                    {report.whiteAcpl !== undefined && (
                      <span>ACPL: <strong className="text-zinc-300">{report.whiteAcpl}</strong></span>
                    )}
                  </div>
                </div>

                {/* Black Player Acc */}
                <div className="bg-[#161512] p-3 rounded-xl border border-[#2d2a26] flex flex-col">
                  <span className="text-xs font-bold text-zinc-200 truncate">{blackPlayer.name}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-1">Accuracy</span>
                  <span className="text-2xl font-black text-white font-mono mt-0.5">{blackAccuracy}%</span>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] font-mono text-zinc-400">
                    <span>Est. Elo: <strong className="text-[#81b64c]">{report.blackEstimatedElo || 1500}</strong></span>
                    {report.blackAcpl !== undefined && (
                      <span>ACPL: <strong className="text-zinc-300">{report.blackAcpl}</strong></span>
                    )}
                  </div>
                </div>
              </div>

              {/* Coach Summary Quote */}
              <div className="bg-[#171513] p-3 rounded-xl border border-[#2a2723] text-xs text-zinc-300 leading-relaxed font-medium">
                "{report.summaryComment}"
              </div>
            </div>

            {/* Game Phase Accuracy Breakdown */}
            {report.phaseBreakdown && (
              <div className="bg-[#1a1815] border border-[#2d2a26] rounded-xl p-3.5 flex flex-col gap-2.5 shadow-lg text-xs">
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                  <span className="flex items-center gap-1.5 text-zinc-200 uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-[#81b64c]" />
                    Phase Accuracy Breakdown
                  </span>
                  <span className="font-mono text-[10px]">WHITE vs BLACK</span>
                </div>

                <div className="flex flex-col gap-2 divide-y divide-[#262420]">
                  {/* Opening Phase */}
                  <div className="pt-1.5 flex flex-col gap-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-300">Opening</span>
                      <div className="font-mono text-[11px] flex gap-4">
                        <span className="text-white font-bold">{report.phaseBreakdown.opening.whiteAccuracy}%</span>
                        <span className="text-zinc-400 font-bold">{report.phaseBreakdown.opening.blackAccuracy}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#12110f] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${report.phaseBreakdown.opening.whiteAccuracy}%` }}
                        className="bg-white h-full"
                      />
                      <div
                        style={{ width: `${100 - report.phaseBreakdown.opening.whiteAccuracy}%` }}
                        className="bg-zinc-800 h-full"
                      />
                    </div>
                  </div>

                  {/* Middlegame Phase */}
                  <div className="pt-2 flex flex-col gap-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-300">Middlegame</span>
                      <div className="font-mono text-[11px] flex gap-4">
                        <span className="text-white font-bold">{report.phaseBreakdown.middlegame.whiteAccuracy}%</span>
                        <span className="text-zinc-400 font-bold">{report.phaseBreakdown.middlegame.blackAccuracy}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#12110f] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${report.phaseBreakdown.middlegame.whiteAccuracy}%` }}
                        className="bg-white h-full"
                      />
                      <div
                        style={{ width: `${100 - report.phaseBreakdown.middlegame.whiteAccuracy}%` }}
                        className="bg-zinc-800 h-full"
                      />
                    </div>
                  </div>

                  {/* Endgame Phase */}
                  <div className="pt-2 flex flex-col gap-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-zinc-300">Endgame</span>
                      <div className="font-mono text-[11px] flex gap-4">
                        <span className="text-white font-bold">{report.phaseBreakdown.endgame.whiteAccuracy}%</span>
                        <span className="text-zinc-400 font-bold">{report.phaseBreakdown.endgame.blackAccuracy}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[#12110f] rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${report.phaseBreakdown.endgame.whiteAccuracy}%` }}
                        className="bg-white h-full"
                      />
                      <div
                        style={{ width: `${100 - report.phaseBreakdown.endgame.whiteAccuracy}%` }}
                        className="bg-zinc-800 h-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Classification Comparison Matrix Table */}
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

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={onStartInteractiveReview}
                className="w-full py-3.5 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white font-black text-sm tracking-wide shadow-xl shadow-[#81b64c]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Interactive Game Review</span>
              </button>

              {/* Blunder Retry CTA Button */}
              {report.blunderRetryPuzzle && (
                <button
                  onClick={() => {
                    resetBlunderPuzzle();
                    setIsBlunderModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[#e05344]/15 hover:bg-[#e05344]/25 text-[#f87171] hover:text-white font-bold text-xs border border-[#e05344]/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Target className="w-4 h-4 text-[#e05344]" />
                  <span>Practice & Retry Your Blunder</span>
                </button>
              )}

              {/* PGN Export Button */}
              <button
                onClick={async () => {
                  try {
                    const res = await fetch('/api/pgn/export', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ report }),
                    });
                    if (res.ok) {
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `review-${report.gameId || 'game'}.pgn`;
                      document.body.appendChild(a);
                      a.click();
                      window.URL.revokeObjectURL(url);
                      document.body.removeChild(a);
                    }
                  } catch (e) {
                    console.error('Export failed:', e);
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 border border-[#36332e]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>Export Annotated PGN with [%eval]</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Blunder Retry Modal */}
      {isBlunderModalOpen && puzzle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f1d1a] border border-[#36332e] rounded-2xl w-full max-w-lg p-5 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#e05344]" />
                <h3 className="text-base font-black text-white">Retry Your Blunder (Ply {puzzle.ply})</h3>
              </div>
              <button
                onClick={() => setIsBlunderModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-zinc-300 bg-[#161512] p-3 rounded-xl border border-[#282622]">
              In this position, you played <strong className="text-[#f87171]">{puzzle.blunderedMoveSan}</strong>. Can you find Stockfish's top winning continuation?
            </div>

            <div className="flex justify-center">
              <ChessBoard
                chess={blunderChess}
                orientation={puzzle.ply % 2 !== 0 ? 'w' : 'b'}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                onMove={handleBlunderMove}
                disabled={blunderStatus === 'correct' || blunderStatus === 'revealed'}
              />
            </div>

            {/* Status Feedback */}
            {blunderStatus === 'correct' && (
              <div className="p-3 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 text-[#81b64c] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Brilliant! You found the winning continuation ({puzzle.solutionSan})!</span>
              </div>
            )}

            {blunderStatus === 'wrong' && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>That's not the top move. Try again!</span>
                </div>
                <button
                  onClick={resetBlunderPuzzle}
                  className="px-2 py-1 rounded bg-[#2b2824] hover:bg-[#38342f] text-white text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
            )}

            {blunderStatus === 'revealed' && (
              <div className="p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-bold">
                Stockfish solution: <strong>{puzzle.solutionSan}</strong>. {puzzle.explanation}
              </div>
            )}

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={resetBlunderPuzzle}
                className="px-3 py-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>

              <button
                onClick={revealBlunderSolution}
                className="px-3 py-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Show Solution</span>
              </button>

              <button
                onClick={() => setIsBlunderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
