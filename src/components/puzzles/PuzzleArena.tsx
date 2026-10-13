'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { TACTICAL_PUZZLES } from '@/lib/puzzlesData';
import { TacticalPuzzle, BoardTheme, PieceTheme } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import {
  Flame,
  Clock,
  Award,
  RotateCcw,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Filter,
  Sparkles,
} from 'lucide-react';

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
  const [hintLevel, setHintLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'beginner' | 'club' | 'advanced' | 'master'>('all');

  // Live Glicko-2 Rating & Remote Puzzle State
  const [playerRating, setPlayerRating] = useState({ rating: 1500, rd: 350, vol: 0.06 });
  const [ratingDelta, setRatingDelta] = useState<number | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [isDailyMode, setIsDailyMode] = useState(false);
  const [remotePuzzle, setRemotePuzzle] = useState<TacticalPuzzle | null>(null);
  const [isLoadingPuzzle, setIsLoadingPuzzle] = useState(false);

  // Filtered local puzzles based on category and level
  const filteredLocalPuzzles = useMemo(() => {
    return TACTICAL_PUZZLES.filter((p) => {
      if (selectedTheme !== 'all' && !p.theme.toLowerCase().includes(selectedTheme.replace('_', ' ').toLowerCase())) {
        return false;
      }
      if (selectedLevel === 'beginner') return p.rating <= 900;
      if (selectedLevel === 'club') return p.rating > 900 && p.rating <= 1400;
      if (selectedLevel === 'advanced') return p.rating > 1400 && p.rating <= 1800;
      if (selectedLevel === 'master') return p.rating > 1800;
      return true;
    });
  }, [selectedTheme, selectedLevel]);

  // Active puzzle: fallback to static array if remote not loaded
  const availablePool = filteredLocalPuzzles.length > 0 ? filteredLocalPuzzles : TACTICAL_PUZZLES;
  const currentPuzzle = remotePuzzle || availablePool[puzzleIndex % availablePool.length];

  // Normalized solution sequence from either remote API or local data
  const solutionSequence: string[] = useMemo(() => {
    const raw = (currentPuzzle as any).solutionMoves || (currentPuzzle as any).moves || [];
    return Array.isArray(raw) ? raw : [];
  }, [currentPuzzle]);

  // Chess instance for current puzzle
  const [chess, setChess] = useState(() => new Chess(currentPuzzle.fen));
  const [moveStepIndex, setMoveStepIndex] = useState(0);
  const [playedMoves, setPlayedMoves] = useState<string[]>([]);

  // Reset and load next puzzle
  const handleNextPuzzle = useCallback(() => {
    setRemotePuzzle(null);
    setPuzzleIndex((prev) => prev + 1);
    setHintLevel(0);
    setShowSolution(false);
    setStatusMessage('idle');
    setMoveStepIndex(0);
    setPlayedMoves([]);
    setRatingDelta(null);
  }, []);

  // Fetch puzzle from backend API
  const fetchPuzzle = useCallback(async (theme: string, daily: boolean) => {
    setIsLoadingPuzzle(true);
    setRatingDelta(null);
    try {
      const endpoint = daily
        ? '/api/puzzles/daily'
        : `/api/puzzles/random?rating=${Math.round(playerRating.rating)}${
            theme !== 'all' ? `&theme=${theme}` : ''
          }`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.puzzle) {
          setRemotePuzzle(json.puzzle);
          setChess(new Chess(json.puzzle.fen));
          setMoveStepIndex(0);
          setPlayedMoves([]);
          setStatusMessage('idle');
          setShowSolution(false);
          setHintLevel(0);
          setIsLoadingPuzzle(false);
          return;
        }
      }
    } catch (e) {
      console.error('Failed to fetch remote puzzle, using local fallback:', e);
    }
    // Fallback to local pool
    const p = availablePool[puzzleIndex % availablePool.length];
    setRemotePuzzle(null);
    setChess(new Chess(p.fen));
    setMoveStepIndex(0);
    setPlayedMoves([]);
    setStatusMessage('idle');
    setShowSolution(false);
    setHintLevel(0);
    setIsLoadingPuzzle(false);
  }, [playerRating.rating, puzzleIndex, availablePool]);

  useEffect(() => {
    fetchPuzzle(selectedTheme, isDailyMode);
  }, [selectedTheme, isDailyMode, puzzleIndex, fetchPuzzle]);

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

  const handleMove = async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (statusMessage === 'solved' || statusMessage === 'incorrect') return;

    try {
      const originalFen = chess.fen();
      const clone = new Chess(originalFen);
      const moveResult = clone.move({ from, to, promotion: promotion || 'q' });
      if (!moveResult) return;

      const uciMove = `${from}${to}${moveResult.promotion || ''}`.toLowerCase();
      const expected = solutionSequence[moveStepIndex] || '';

      const cleanExpected = expected.toLowerCase().replace(/[+#x]/g, '');
      const cleanSan = moveResult.san.toLowerCase().replace(/[+#x]/g, '');
      const isExpected =
        uciMove === expected.toLowerCase() ||
        `${from}${to}` === expected.toLowerCase() ||
        cleanSan === cleanExpected ||
        moveResult.san === expected;

      // Update board state immediately so the piece visually moves!
      setChess(clone);

      const newPlayed = [...playedMoves, uciMove];
      setPlayedMoves(newPlayed);

      // Check if move matches puzzle solution
      if (isExpected) {
        soundService.playMove();
        const nextStep = moveStepIndex + 1;
        setMoveStepIndex(nextStep);

        // Check if entire puzzle is solved
        if (nextStep >= solutionSequence.length) {
          setStatusMessage('solved');
          setScore((s) => s + 1);
          if (hintLevel < 3 && !showSolution) {
            setStreak((s) => s + 1);
          }
          soundService.playPuzzleSuccess();
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });

          // Submit solve to backend Glicko-2 engine
          try {
            const solveRes = await fetch('/api/puzzles/solve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puzzleId: currentPuzzle.id,
                submittedMoves: newPlayed,
                playerRating,
              }),
            });
            if (solveRes.ok) {
              const solveData = await solveRes.json();
              if (solveData.newRating) {
                setPlayerRating(solveData.newRating);
                setRatingDelta(solveData.ratingDelta);
              }
            }
          } catch (err) {
            console.error('Failed to submit puzzle rating update:', err);
          }

          if (rushActive) {
            setTimeout(() => {
              setPuzzleIndex((prev) => prev + 1);
            }, 800);
          }
        } else {
          // Play opponent response move automatically
          const opponentMoveSpec = solutionSequence[nextStep];
          setTimeout(() => {
            try {
              const oppClone = new Chess(clone.fen());
              let oppMove = null;
              if (opponentMoveSpec.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(opponentMoveSpec)) {
                oppMove = oppClone.move({
                  from: opponentMoveSpec.slice(0, 2) as Square,
                  to: opponentMoveSpec.slice(2, 4) as Square,
                  promotion: opponentMoveSpec.length > 4 ? (opponentMoveSpec[4] as PieceSymbol) : undefined,
                });
              } else {
                oppMove = oppClone.move(opponentMoveSpec);
              }

              if (oppMove) {
                soundService.playCapture();
                setMoveStepIndex(nextStep + 1);
                setPlayedMoves((prev) => [...prev, opponentMoveSpec]);
                setChess(oppClone);
              }
            } catch (err) {
              console.error('Error applying opponent puzzle move:', err);
            }
          }, 450);
        }
      } else {
        // Blunder/Mistake in puzzle: play fail sound & revert after brief pause
        soundService.playPuzzleFail();
        setStatusMessage('incorrect');
        setStreak(0);

        setTimeout(() => {
          setChess(new Chess(originalFen));
          setStatusMessage('idle');
        }, 850);

        // Submit failure to Glicko-2 engine if not in rush mode
        if (!rushActive) {
          try {
            const solveRes = await fetch('/api/puzzles/solve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                puzzleId: currentPuzzle.id,
                submittedMoves: ['fail'],
                playerRating,
              }),
            });
            if (solveRes.ok) {
              const solveData = await solveRes.json();
              if (solveData.newRating) {
                setPlayerRating(solveData.newRating);
                setRatingDelta(solveData.ratingDelta);
              }
            }
          } catch (err) {
            console.error('Failed to submit puzzle failure update:', err);
          }
        }

        if (rushActive) {
          const nextStrikes = strikes + 1;
          setStrikes(nextStrikes);
          if (nextStrikes >= 3) {
            setRushActive(false);
            soundService.playGameEndLoss();
          }
        }
      }
    } catch {
      // Invalid move attempt
    }
  };

  const puzzleTurn = currentPuzzle.fen.split(' ')[1] as 'w' | 'b';

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center p-2 sm:p-4 select-none">
      {/* Tactical Board Column - Bound cleanly by screen height & width */}
      <div className="w-[min(100%,calc(100vh-220px),480px)] shrink-0 flex flex-col items-center gap-2.5">
        <div className="w-full aspect-square">
          <ChessBoard
            chess={chess}
            orientation={puzzleTurn}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleMove}
            disabled={statusMessage === 'solved'}
          />
        </div>

        {/* Turn indicator card */}
        <div className="w-full bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full border ${
                puzzleTurn === 'w' ? 'bg-white border-zinc-300' : 'bg-zinc-900 border-zinc-600'
              }`}
            />
            <span className="font-bold text-white">
              {puzzleTurn === 'w' ? 'White to Move' : 'Black to Move'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
            <span>Puzzle #{currentPuzzle.id}</span>
            <span>•</span>
            <span>Rating: <strong className="text-[#81b64c]">{currentPuzzle.rating}</strong></span>
          </div>
        </div>
      </div>

      {/* Control Hub & Tactical Rating Sidebar */}
      <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 min-w-0 flex flex-col gap-4">
        {/* Rating & Mode Header Card */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#81b64c]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Tactics Rating (Glicko-2)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {Math.round(playerRating.rating)}
                  </span>
                  {ratingDelta !== null && (
                    <span
                      className={`text-xs font-mono font-black px-1.5 py-0.5 rounded ${
                        ratingDelta >= 0
                          ? 'bg-[#81b64c]/20 text-[#81b64c]'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Mode Toggle Pills */}
            <div className="flex items-center gap-1.5 bg-[#161512] p-1 rounded-xl border border-[#2b2824]">
              <button
                onClick={() => {
                  setIsDailyMode(false);
                  setRushMode(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  !isDailyMode && !rushMode
                    ? 'bg-[#81b64c] text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Rated
              </button>
              <button
                onClick={() => {
                  setIsDailyMode(true);
                  setRushMode(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isDailyMode
                    ? 'bg-amber-500 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Daily</span>
              </button>
              <button
                onClick={() => {
                  setRushMode(true);
                  setIsDailyMode(false);
                  setRushActive(true);
                  setRushTimeRemaining(180);
                  setScore(0);
                  setStrikes(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  rushMode
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>Rush</span>
              </button>
            </div>
          </div>

          {/* Level Filter & Streak Banner */}
          <div className="flex items-center justify-between pt-1 border-t border-[#2d2a26]">
            <div className="flex items-center gap-1">
              {(['all', 'beginner', 'club', 'advanced', 'master'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedLevel(lvl);
                    handleNextPuzzle();
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedLevel === lvl
                      ? 'bg-[#81b64c] text-white'
                      : 'bg-[#161512] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{streak} Streak</span>
            </div>
          </div>

          {/* Theme Filters (Rated Mode) */}
          {!rushMode && !isDailyMode && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#2d2a26]">
              {['all', 'fork', 'pin', 'skewer', 'mate', 'back_rank'].map((th) => (
                <button
                  key={th}
                  onClick={() => setSelectedTheme(th)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedTheme === th
                      ? 'bg-[#2d2a26] text-[#81b64c] border border-[#81b64c]/40'
                      : 'bg-[#161512] text-zinc-400 hover:text-zinc-200 border border-transparent'
                  }`}
                >
                  {th.replace('_', ' ')}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Rush Mode Status Header */}
        {rushMode && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-mono font-bold text-white text-base">
                {Math.floor(rushTimeRemaining / 60)}:
                {rushTimeRemaining % 60 < 10 ? '0' : ''}
                {rushTimeRemaining % 60}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-[#81b64c] text-sm">Score: {score}</span>
              <div className="flex gap-1">
                {[0, 1, 2].map((s) => (
                  <span key={s} className={s < strikes ? 'text-red-500 font-bold' : 'text-zinc-700'}>
                    ✕
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Puzzle Card & Details */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-white">{currentPuzzle.title}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
              {currentPuzzle.theme}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Find the best continuation for{' '}
            <strong className="text-white font-bold">
              {puzzleTurn === 'w' ? 'White' : 'Black'}
            </strong>
            . Look for forcing checks, tactical pins, double attacks, and mating nets.
          </p>

          {/* Feedback Badges */}
          {statusMessage === 'solved' && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Brilliant! Tactical continuation verified!</span>
            </div>
          )}

          {statusMessage === 'incorrect' && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs font-bold animate-in fade-in">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Incorrect move. That lets the opponent escape or loses material!</span>
            </div>
          )}

          {/* Progressive Hint Display */}
          {hintLevel > 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tactical Hint ({hintLevel}/3):</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300">
                {hintLevel === 1 && (
                  <>
                    Notice the piece alignment and unprotected units. Consider moving your{' '}
                    <strong className="text-white">
                      {solutionSequence[0]?.slice(0, 2) ? 'tactical piece' : 'active piece'}
                    </strong>
                    .
                  </>
                )}
                {hintLevel === 2 && (
                  <>
                    Look specifically at the square{' '}
                    <strong className="text-amber-300 font-mono">
                      {solutionSequence[0]?.length >= 4
                        ? solutionSequence[0].slice(2, 4)
                        : solutionSequence[0]}
                    </strong>
                    . Is there a forcing tempo or check?
                  </>
                )}
                {hintLevel === 3 && (
                  <>
                    The winning first move is{' '}
                    <strong className="text-[#81b64c] font-mono">
                      {solutionSequence[0]}
                    </strong>
                    ! Execute it to continue the attack.
                  </>
                )}
              </p>
            </div>
          )}

          {/* Solution Breakdown */}
          {showSolution && (
            <div className="p-3 bg-[#161512] rounded-xl border border-[#2b2824] text-xs text-zinc-300 leading-relaxed font-sans">
              <strong className="text-[#81b64c] block mb-1">Solution Breakdown:</strong>
              {currentPuzzle.solutionDescription}
              <div className="mt-2 text-[11px] font-mono text-zinc-400">
                Moves: {solutionSequence.join(' → ')}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#2d2a26]">
            <button
              onClick={() => {
                setChess(new Chess(currentPuzzle.fen));
                setMoveStepIndex(0);
                setPlayedMoves([]);
                setStatusMessage('idle');
              }}
              className="p-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => setHintLevel((lvl) => (lvl >= 3 ? 0 : lvl + 1))}
              className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                hintLevel > 0
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-[#282622] hover:bg-[#34312b] text-zinc-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{hintLevel > 0 ? `Hint (${hintLevel}/3)` : 'Hint'}</span>
            </button>

            <button
              onClick={() => setShowSolution((prev) => !prev)}
              className="p-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{showSolution ? 'Hide' : 'Solution'}</span>
            </button>

            <button
              onClick={handleNextPuzzle}
              className="ml-auto px-4 py-2 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-[#81b64c]/20"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
