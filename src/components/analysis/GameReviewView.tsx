'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { ClassificationBadge } from '../board/ClassificationBadge';
import { CoachDannyAvatar } from './CoachDannyAvatar';
import {
  MoveRecord,
  MoveClassification,
  BoardTheme,
  PieceTheme,
  GamePlayer,
  ArrowAnnotation,
} from '@/types/chess';
import {
  ArrowLeft,
  Share2,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Star,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';

interface GameReviewViewProps {
  moves: MoveRecord[];
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  onBackToGame: () => void;
  onBackToSummary?: () => void;
}

export const GameReviewView: React.FC<GameReviewViewProps> = ({
  moves,
  whitePlayer,
  blackPlayer,
  boardTheme,
  pieceTheme,
  onBackToGame,
  onBackToSummary,
}) => {
  const [activeMoveIndex, setActiveMoveIndex] = useState<number>(() => {
    // Start on the first key moment or latest move
    return moves.length > 0 ? moves.length - 1 : -1;
  });

  const [showBestArrow, setShowBestArrow] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState<boolean | null>(null);

  const activeMove = activeMoveIndex >= 0 && activeMoveIndex < moves.length ? moves[activeMoveIndex] : null;

  // Compute chess board position at activeMoveIndex
  const { currentChess, activeSquareHighlight } = useMemo(() => {
    const c = new Chess();
    if (activeMoveIndex === -1 || moves.length === 0) {
      return { currentChess: c, activeSquareHighlight: null };
    }

    const targetMove = moves[activeMoveIndex];
    if (isRetryMode) {
      // In retry mode, set board to position BEFORE the move
      return {
        currentChess: new Chess(targetMove.fenBefore),
        activeSquareHighlight: null,
      };
    }

    return {
      currentChess: new Chess(targetMove.fenAfter),
      activeSquareHighlight: {
        square: targetMove.to,
        classification: targetMove.classification || 'best',
      },
    };
  }, [moves, activeMoveIndex, isRetryMode]);

  // Dynamic evaluation score formatted (e.g. +1.61, -0.45, M1)
  const formattedScore = useMemo(() => {
    if (!activeMove) return '0.0';
    const score = activeMove.evalAfter;
    if (Math.abs(score) >= 20000) {
      return score > 0 ? 'M1' : '-M1';
    }
    const val = (score / 100).toFixed(2);
    return score > 0 ? `+${val}` : `${val}`;
  }, [activeMove]);

  // Horizontal bar fill percentage (sigmoid)
  const evalPercent = useMemo(() => {
    if (!activeMove) return 50;
    const score = activeMove.evalAfter;
    const winProb = 1 / (1 + Math.pow(10, -score / 400));
    return Math.min(95, Math.max(5, winProb * 100));
  }, [activeMove]);

  // Key moments (Brilliant, Great, Blunders, Mistakes) for the Next CTA
  const keyMomentIndices = useMemo(() => {
    const indices: number[] = [];
    moves.forEach((m, idx) => {
      if (
        m.classification === 'brilliant' ||
        m.classification === 'great' ||
        m.classification === 'blunder' ||
        m.classification === 'mistake' ||
        m.classification === 'miss'
      ) {
        indices.push(idx);
      }
    });
    return indices;
  }, [moves]);

  const handleNextKeyMoment = () => {
    setShowBestArrow(false);
    setIsRetryMode(false);
    setRetrySuccess(null);

    // Find next key moment after activeMoveIndex
    const nextKey = keyMomentIndices.find((idx) => idx > activeMoveIndex);
    if (nextKey !== undefined) {
      setActiveMoveIndex(nextKey);
      soundService.playMove();
    } else if (activeMoveIndex < moves.length - 1) {
      setActiveMoveIndex(activeMoveIndex + 1);
      soundService.playMove();
    }
  };

  const handlePrevMove = () => {
    setShowBestArrow(false);
    setIsRetryMode(false);
    setRetrySuccess(null);
    if (activeMoveIndex > 0) {
      setActiveMoveIndex(activeMoveIndex - 1);
      soundService.playMove();
    }
  };

  const handleNextMove = () => {
    setShowBestArrow(false);
    setIsRetryMode(false);
    setRetrySuccess(null);
    if (activeMoveIndex < moves.length - 1) {
      setActiveMoveIndex(activeMoveIndex + 1);
      soundService.playMove();
    }
  };

  const handleRetryMove = (from: Square, to: Square) => {
    if (!activeMove) return;
    try {
      const move = currentChess.move({ from, to });
      if (move) {
        if (move.san === activeMove.bestMoveSan) {
          soundService.playPuzzleSuccess();
          setRetrySuccess(true);
        } else {
          soundService.playPuzzleFail();
          setRetrySuccess(false);
          currentChess.undo();
        }
      }
    } catch {
      //
    }
  };

  // Best move arrow
  const bestMoveArrow: ArrowAnnotation | null = useMemo(() => {
    if (!showBestArrow || !activeMove || !activeMove.bestMoveSan) return null;
    const testChess = new Chess(activeMove.fenBefore);
    try {
      const m = testChess.move(activeMove.bestMoveSan);
      if (m) {
        return { from: m.from as Square, to: m.to as Square, color: '#81b64c' };
      }
    } catch {
      //
    }
    return null;
  }, [showBestArrow, activeMove]);

  return (
    <div className="flex flex-col h-full w-full bg-[#161512] text-zinc-100 select-none">
      {/* Top Header Bar (Image 1 & 4) */}
      <header className="h-14 px-4 lg:px-6 bg-[#1f1d1a] border-b border-[#2d2a26] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToGame}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Play</span>
          </button>
          {onBackToSummary && (
            <button
              onClick={onBackToSummary}
              className="px-2.5 py-1 rounded-lg bg-[#272522] hover:bg-[#33302b] text-xs font-bold text-zinc-200 border border-[#3b3833] transition-colors cursor-pointer"
            >
              Overview
            </button>
          )}
        </div>

        <h1 className="text-base font-black text-white tracking-wide">
          Game Review
        </h1>

        <div className="flex items-center gap-2 text-zinc-400">
          <button className="p-2 rounded-lg hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer">
            <Search className="w-4 h-4" />
          </button>
          <button className="p-2 rounded-lg hover:text-white hover:bg-[#2b2824] transition-colors cursor-pointer">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Review Workspace */}
      <div className="flex-1 p-4 lg:p-6 flex flex-col xl:flex-row gap-6 items-center xl:items-start justify-center overflow-y-auto">
        {/* Left Board Column */}
        <div className="flex flex-col items-center gap-3 w-full max-w-[580px]">
          <ChessBoard
            chess={currentChess}
            orientation="w"
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            activeClassification={activeSquareHighlight}
            lastMove={activeMove ? { from: activeMove.from, to: activeMove.to } : null}
            bestMoveArrow={bestMoveArrow}
            onMove={isRetryMode ? handleRetryMove : undefined}
            disabled={!isRetryMode}
          />
        </div>

        {/* Right Side Review Panel (Image 1 & 4) */}
        <div className="w-full max-w-[480px] flex flex-col gap-4">
          {/* Coach Speech Bubble with Avatar */}
          <div className="flex items-start gap-3">
            {/* Coach Danny Portrait Avatar (Screenshot 3 & 4) */}
            <div className="relative shrink-0">
              <CoachDannyAvatar size={56} />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#81b64c] text-white flex items-center justify-center text-[10px] font-black border border-[#2a2723]">
                AI
              </span>
            </div>

            {/* Speech Bubble Container with Left Tail */}
            <div className="flex-1 bg-[#ffffff] text-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-200 relative">
              {/* Bubble Pointer Tail */}
              <div className="absolute top-4 -left-2 w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-white border-b-[8px] border-b-transparent" />

              {/* Bubble Header: Badge, Move description, Score */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {activeMove?.classification && (
                    <ClassificationBadge
                      classification={activeMove.classification}
                      size="md"
                    />
                  )}
                  <span className="text-sm font-black text-zinc-900">
                    {activeMove ? `${activeMove.san} is ${activeMove.classification || 'good'}` : 'Game Review Ready'}
                  </span>
                </div>

                <span className="text-xs font-black font-mono bg-zinc-100 text-zinc-800 px-2 py-0.5 rounded-md border border-zinc-200">
                  {formattedScore}
                </span>
              </div>

              {/* Natural Language Coaching Advice */}
              <p className="text-xs text-zinc-700 font-medium mt-2 leading-relaxed">
                {activeMove?.coachComment ||
                  'Step through the moves below to review the critical turning points and engine accuracy.'}
              </p>

              {/* Retry Feedback Banner */}
              {isRetryMode && (
                <div className="mt-2.5 p-2 rounded-lg text-xs font-bold border">
                  {retrySuccess === true && (
                    <span className="text-emerald-700 bg-emerald-50 block p-1.5 rounded">
                      🎉 Excellent! You found the best move!
                    </span>
                  )}
                  {retrySuccess === false && (
                    <span className="text-rose-700 bg-rose-50 block p-1.5 rounded">
                      ❌ That was not the top move. Try again!
                    </span>
                  )}
                  {retrySuccess === null && (
                    <span className="text-zinc-600">
                      Play the best move on the board to fix your mistake.
                    </span>
                  )}
                </div>
              )}

              {/* Share Pill Button */}
              <div className="mt-3 flex items-center justify-end">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Check.mate Review',
                        text: `Check out my move: ${activeMove?.san} is ${activeMove?.classification}!`,
                      });
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-zinc-200"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </div>

          {/* Move Notation List (Image 1) */}
          <div className="bg-[#1f1d1a] rounded-2xl border border-[#2d2a26] overflow-hidden flex flex-col h-64 shadow-md">
            <div className="p-2.5 bg-[#262420] border-b border-[#302e2a] flex items-center justify-between text-xs font-bold text-zinc-400">
              <span>Moves Notation</span>
              <span className="font-mono text-[11px] text-[#81b64c]">
                Move {activeMoveIndex + 1} of {moves.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 font-mono text-xs">
              {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, turnIdx) => {
                const turnNumber = turnIdx + 1;
                const whiteIdx = turnIdx * 2;
                const blackIdx = turnIdx * 2 + 1;

                const whiteMove = moves[whiteIdx];
                const blackMove = moves[blackIdx];

                const isWhiteSelected = activeMoveIndex === whiteIdx;
                const isBlackSelected = activeMoveIndex === blackIdx;

                return (
                  <div
                    key={turnNumber}
                    className="grid grid-cols-[36px_1fr_1fr] items-center gap-2 px-2 py-1 rounded hover:bg-[#282622] transition-colors"
                  >
                    <span className="text-zinc-500 font-sans text-[11px] font-semibold">
                      {turnNumber}.
                    </span>

                    {/* White Move */}
                    <button
                      onClick={() => {
                        setActiveMoveIndex(whiteIdx);
                        setShowBestArrow(false);
                        setIsRetryMode(false);
                        soundService.playMove();
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                        isWhiteSelected
                          ? 'bg-[#81b64c] text-white font-bold shadow'
                          : 'text-zinc-200 hover:bg-[#33302b]'
                      }`}
                    >
                      <span>{whiteMove?.san}</span>
                      {whiteMove?.classification && (
                        <ClassificationBadge
                          classification={whiteMove.classification}
                          size="sm"
                        />
                      )}
                    </button>

                    {/* Black Move */}
                    {blackMove ? (
                      <button
                        onClick={() => {
                          setActiveMoveIndex(blackIdx);
                          setShowBestArrow(false);
                          setIsRetryMode(false);
                          soundService.playMove();
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                          isBlackSelected
                            ? 'bg-[#81b64c] text-white font-bold shadow'
                            : 'text-zinc-200 hover:bg-[#33302b]'
                        }`}
                      >
                        <span>{blackMove.san}</span>
                        {blackMove.classification && (
                          <ClassificationBadge
                            classification={blackMove.classification}
                            size="sm"
                          />
                        )}
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Horizontal Evaluation Bar (Image 1) */}
          <div className="bg-[#1f1d1a] p-3 rounded-xl border border-[#2d2a26] flex items-center gap-3 shadow-sm">
            <span className="text-xs font-mono font-black text-white shrink-0 min-w-[48px]">
              {formattedScore}
            </span>
            <div className="flex-1 h-3 bg-[#33302b] rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-white transition-all duration-300 rounded-full"
                style={{ width: `${evalPercent}%` }}
              />
            </div>
          </div>

          {/* Review Bottom Action Bar (Image 1 & 4) */}
          <div className="p-3 bg-[#1f1d1a] rounded-2xl border border-[#2d2a26] flex items-center justify-between gap-2 shadow-md">
            {/* Stepper Navigation Arrows */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMove}
                disabled={activeMoveIndex <= 0}
                className="p-2 rounded-xl bg-[#282622] hover:bg-[#33302b] disabled:opacity-30 text-white transition-colors cursor-pointer"
                title="Previous Move"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextMove}
                disabled={activeMoveIndex >= moves.length - 1}
                className="p-2 rounded-xl bg-[#282622] hover:bg-[#33302b] disabled:opacity-30 text-white transition-colors cursor-pointer"
                title="Next Move"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Middle Action Pills: Show, Best, Retry */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBestArrow((prev) => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  showBestArrow
                    ? 'bg-[#81b64c] text-white shadow'
                    : 'bg-[#282622] hover:bg-[#33302b] text-zinc-300'
                }`}
                title="Show Best Move Arrow"
              >
                <Star className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Best</span>
              </button>

              <button
                onClick={() => {
                  setIsRetryMode((prev) => !prev);
                  setRetrySuccess(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isRetryMode
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-[#282622] hover:bg-[#33302b] text-zinc-300'
                }`}
                title="Retry this position on board"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Retry</span>
              </button>
            </div>

            {/* Prominent Next Key Moment CTA Button */}
            <button
              onClick={handleNextKeyMoment}
              className="px-6 py-2.5 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-sm font-black transition-all cursor-pointer shadow-lg shadow-[#81b64c]/20 flex items-center gap-1.5"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
