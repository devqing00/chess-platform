'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { TACTICAL_PUZZLES } from '@/lib/puzzlesData';
import { TacticalPuzzle, BoardTheme, PieceTheme } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import { Flame, Clock, Award, RotateCcw, ArrowRight, Eye, CheckCircle2, XCircle } from 'lucide-react';

interface PuzzleArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const PuzzleArena: React.FC<PuzzleArenaProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [rushMode, setRushMode] = useState(false);
  const [rushTimeRemaining, setRushTimeRemaining] = useState(180); // 3 minutes
  const [rushActive, setRushActive] = useState(false);
  const [score, setScore] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [statusMessage, setStatusMessage] = useState<'idle' | 'correct' | 'incorrect' | 'solved'>('idle');
  const [showSolution, setShowSolution] = useState(false);

  const currentPuzzle = TACTICAL_PUZZLES[puzzleIndex % TACTICAL_PUZZLES.length];

  // Chess instance for current puzzle
  const [chess, setChess] = useState(() => new Chess(currentPuzzle.fen));
  const [moveStepIndex, setMoveStepIndex] = useState(0);

  // Reset or load puzzle
  const loadPuzzle = useCallback((idx: number) => {
    const p = TACTICAL_PUZZLES[idx % TACTICAL_PUZZLES.length];
    setChess(new Chess(p.fen));
    setMoveStepIndex(0);
    setStatusMessage('idle');
    setShowSolution(false);
  }, []);

  useEffect(() => {
    loadPuzzle(puzzleIndex);
  }, [puzzleIndex, loadPuzzle]);

  // Rush mode timer
  useEffect(() => {
    if (!rushActive || rushTimeRemaining <= 0) return;
    const interval = setInterval(() => {
      setRushTimeRemaining((t) => {
        if (t <= 1) {
          setRushActive(false);
          soundService.playCheckmate();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rushActive, rushTimeRemaining]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (statusMessage === 'solved') return;

    try {
      const uciMove = `${from}${to}${promotion || ''}`;
      const expectedUci = currentPuzzle.moves[moveStepIndex];

      // Validate on chess board
      const moveResult = chess.move({ from, to, promotion });
      if (!moveResult) return;

      // Check if move matches puzzle solution
      if (uciMove === expectedUci || moveResult.san === expectedUci) {
        soundService.playMove();
        const nextStep = moveStepIndex + 1;
        setMoveStepIndex(nextStep);

        // Check if entire puzzle is solved
        if (nextStep >= currentPuzzle.moves.length) {
          setStatusMessage('solved');
          setScore((s) => s + 1);
          soundService.playPuzzleSuccess();
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });

          if (rushActive) {
            setTimeout(() => {
              setPuzzleIndex((prev) => prev + 1);
            }, 800);
          }
        } else {
          // Play opponent response move automatically
          const opponentUci = currentPuzzle.moves[nextStep];
          setTimeout(() => {
            if (opponentUci.length >= 4) {
              const oppFrom = opponentUci.slice(0, 2) as Square;
              const oppTo = opponentUci.slice(2, 4) as Square;
              const oppPromo = opponentUci.length > 4 ? (opponentUci[4] as PieceSymbol) : undefined;
              chess.move({ from: oppFrom, to: oppTo, promotion: oppPromo });
              soundService.playCapture();
              setMoveStepIndex(nextStep + 1);
              setChess(new Chess(chess.fen()));
            }
          }, 400);
        }
      } else {
        // Blunder/Mistake in puzzle
        soundService.playPuzzleFail();
        setStatusMessage('incorrect');
        chess.undo();
        setChess(new Chess(chess.fen()));

        if (rushActive) {
          const nextStrikes = strikes + 1;
          setStrikes(nextStrikes);
          if (nextStrikes >= 3) {
            setRushActive(false);
            soundService.playCheckmate();
          }
        }
      }
    } catch {
      // Invalid move
    }
  };

  const startPuzzleRush = () => {
    setRushMode(true);
    setRushActive(true);
    setRushTimeRemaining(180);
    setScore(0);
    setStrikes(0);
    setPuzzleIndex(0);
    loadPuzzle(0);
    soundService.playGameStart();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-center justify-center p-4 select-none">
      {/* Tactical Chessboard */}
      <div className="flex flex-col items-center">
        <ChessBoard
          chess={chess}
          orientation={currentPuzzle.fen.split(' ')[1] === 'w' ? 'w' : 'b'}
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          onMove={handleMove}
          disabled={statusMessage === 'solved' || (rushMode && !rushActive)}
        />
      </div>

      {/* Control & Tactic Info Panel */}
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Mode Selector Header */}
        <div className="p-4 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRushMode(false);
                setRushActive(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                !rushMode
                  ? 'bg-[#81b64c] text-white shadow'
                  : 'bg-[#2b2926] text-zinc-400 hover:text-white'
              }`}
            >
              Daily Tactics
            </button>
            <button
              onClick={startPuzzleRush}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                rushMode
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-[#2b2926] text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Puzzle Rush (3 Min)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-zinc-400">Rating</span>
            <span className="text-xs font-mono font-black text-[#81b64c] bg-[#161512] px-2 py-0.5 rounded border border-[#302e2b]">
              {currentPuzzle.rating}
            </span>
          </div>
        </div>

        {/* Rush Timer and Strikes */}
        {rushMode && (
          <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-xl font-black font-mono text-white">
                {Math.floor(rushTimeRemaining / 60)}:
                {rushTimeRemaining % 60 < 10 ? '0' : ''}
                {rushTimeRemaining % 60}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-lg font-black font-mono text-[#81b64c]">
                Score: {score}
              </div>
              <div className="flex gap-1 text-base">
                {[0, 1, 2].map((s) => (
                  <span key={s} className={s < strikes ? 'text-red-500' : 'text-zinc-600'}>
                    ✕
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Puzzle Details Card */}
        <div className="p-5 bg-[#21201d] rounded-xl border border-[#302e2b] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white">{currentPuzzle.title}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
              {currentPuzzle.theme}
            </span>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Find the best move for{' '}
            <strong className="text-zinc-200">
              {currentPuzzle.fen.split(' ')[1] === 'w' ? 'White' : 'Black'}
            </strong>
            . Calculate forcing moves, checks, captures, and threats!
          </p>

          {/* Feedback Status */}
          {statusMessage === 'solved' && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Brilliant! Puzzle Solved!</span>
            </div>
          )}

          {statusMessage === 'incorrect' && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-xs font-bold">
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Incorrect move. That hangs a piece or misses the tactic!</span>
            </div>
          )}

          {/* Solution Explanation if revealed */}
          {showSolution && (
            <div className="p-3 bg-[#161512] rounded-lg border border-[#302e2b] text-xs text-zinc-300 leading-relaxed font-sans">
              <strong className="text-[#81b64c] block mb-1">Solution Breakdown:</strong>
              {currentPuzzle.solutionDescription}
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2 mt-2 pt-3 border-t border-[#302e2b]">
            <button
              onClick={() => loadPuzzle(puzzleIndex)}
              className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset Puzzle"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setShowSolution((prev) => !prev)}
              className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{showSolution ? 'Hide Solution' : 'View Solution'}</span>
            </button>

            <button
              onClick={() => setPuzzleIndex((idx) => idx + 1)}
              className="ml-auto px-4 py-2 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
            >
              <span>Next Puzzle</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
