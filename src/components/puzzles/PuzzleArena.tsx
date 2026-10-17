'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { TACTICAL_PUZZLES } from '@/lib/puzzlesData';
import { TacticalPuzzle, BoardTheme, PieceTheme } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import { useRouter } from 'next/navigation';
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
  Microscope,
  Bot,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { LearningProgressStore } from '@/lib/learningPathData';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpGainToast } from '@/components/xp/XpGainToast';

interface PuzzleArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  initialPuzzleId?: string;
  onSolve?: (puzzleId: string) => void;
}

export const PuzzleArena: React.FC<PuzzleArenaProps> = ({
  boardTheme,
  pieceTheme,
  initialPuzzleId,
  onSolve,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { awardXp, recentGain } = useXpSystem();
  const [puzzleIndex, setPuzzleIndex] = useState(0);

  // Jump to requested puzzle if initialPuzzleId passed
  useEffect(() => {
    if (initialPuzzleId) {
      const idx = TACTICAL_PUZZLES.findIndex((p) => p.id === initialPuzzleId);
      if (idx !== -1) {
        setPuzzleIndex(idx);
      }
    }
  }, [initialPuzzleId]);
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

  // Sync puzzle rating and streak from Firestore for authenticated users
  useEffect(() => {
    if (!user?.uid) return;
    FirestoreService.getUserPuzzleStats(user.uid).then((stats) => {
      if (stats) {
        if (typeof stats.rating === 'number') {
          setPlayerRating((prev) => ({ ...prev, rating: stats.rating }));
        }
        if (typeof stats.streak === 'number') {
          setStreak(stats.streak);
        }
      }
    });
  }, [user?.uid]);
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

  // Advance to next puzzle with Spacebar or Enter when solved
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === 'Enter') && statusMessage === 'solved') {
        e.preventDefault();
        handleNextPuzzle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [statusMessage, handleNextPuzzle]);

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
          LearningProgressStore.completeNode(currentPuzzle.id, 25);
          awardXp(hintLevel > 0 ? 'solve_puzzle_retry' : 'solve_puzzle_first_try', 'Tactical Puzzle Solved');
          onSolve?.(currentPuzzle.id);

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
                if (user?.uid) {
                  const newStreak = hintLevel < 3 && !showSolution ? streak + 1 : streak;
                  FirestoreService.saveUserPuzzleStats(user.uid, Math.round(solveData.newRating.rating), newStreak);
                  FirestoreService.savePuzzleAttempt(user.uid, currentPuzzle.id, true, Math.round(solveData.newRating.rating));
                }
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
                if (user?.uid) {
                  FirestoreService.saveUserPuzzleStats(user.uid, Math.round(solveData.newRating.rating), 0);
                  FirestoreService.savePuzzleAttempt(user.uid, currentPuzzle.id, false, Math.round(solveData.newRating.rating));
                }
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
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-8 items-center lg:items-start justify-center p-1 sm:p-4 select-none">
      {/* Tactical Board Column - Bound cleanly by screen height & width, scaled on tablet */}
      <div className="w-full max-w-[min(100vw-2rem,_560px)] lg:max-w-[460px] xl:max-w-[500px] 2xl:max-w-[540px] shrink-0 flex flex-col items-center gap-2.5 sm:gap-3 mx-auto lg:mx-0">
        {/* Priority Tactical Directive Banner - Unmistakable Visual Guidance */}
        <div
          className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-2xl border-2 flex items-center justify-between gap-2.5 sm:gap-3 shadow-[0_4px_0_0_#141311] transition-all duration-200 ${
            statusMessage === 'solved'
              ? 'bg-[#182c14] border-[#58cc02] text-white shadow-[0_4px_0_0_#2b7300]'
              : statusMessage === 'incorrect'
              ? 'bg-[#2f1418] border-rose-500 text-white shadow-[0_4px_0_0_#881337]'
              : 'bg-[#1f1d1a] border-[#35322b] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 shrink-0 ${
                puzzleTurn === 'w'
                  ? 'bg-white border-zinc-400'
                  : 'bg-zinc-950 border-zinc-600'
              }`}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-white truncate flex items-center gap-1.5">
                {statusMessage === 'solved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-[#58cc02] shrink-0" />
                    <span>Puzzle Solved! +15 XP</span>
                  </>
                ) : statusMessage === 'incorrect' ? (
                  <>
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Wrong Move &bull; Try Another</span>
                  </>
                ) : (
                  <span>{puzzleTurn === 'w' ? 'White to Move' : 'Black to Move'}</span>
                )}
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-300 font-medium truncate">
                {statusMessage === 'solved'
                  ? 'Spacebar or Continue for next puzzle'
                  : statusMessage === 'incorrect'
                  ? 'Board reverted to initial position'
                  : `Find the winning tactic (${Math.min(moveStepIndex + 1, Math.ceil(solutionSequence.length / 2))} of ${Math.max(1, Math.ceil(solutionSequence.length / 2))})`}
              </span>
            </div>
          </div>

          {statusMessage === 'solved' ? (
            <button
              onClick={handleNextPuzzle}
              className="px-3.5 sm:px-4 py-1.5 rounded-xl bg-[#58cc02] hover:bg-[#4cad02] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#2b7300] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          ) : (
            <div className="flex items-center gap-1 font-mono text-xs text-zinc-400 shrink-0">
              <span className="text-zinc-500 font-bold text-[10px] sm:text-xs">ELO</span>
              <strong className="text-[#81b64c] text-xs sm:text-sm">{currentPuzzle.rating}</strong>
            </div>
          )}
        </div>

        {/* Board */}
        <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-[#332f28] shadow-[0_6px_0_0_#141311]">
          <ChessBoard
            chess={chess}
            orientation={puzzleTurn}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleMove}
            disabled={statusMessage === 'solved'}
          />
        </div>

        {/* Tactical Info Bar */}
        <div className="w-full bg-[#1a1815] border-2 border-[#2b2824] rounded-2xl px-3 sm:px-3.5 py-2 flex items-center justify-between text-xs shadow-[0_2px_0_0_#141311]">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-black uppercase text-[10px] tracking-wider">Motif:</span>
            <span className="font-black text-white text-[11px] capitalize">
              {currentPuzzle.theme ? currentPuzzle.theme.replace(/_/g, ' ') : 'Tactical Sequence'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[10px] sm:text-[11px] text-zinc-400">
            <span>Puzzle #{currentPuzzle.id}</span>
          </div>
        </div>
      </div>

      {/* Control Hub & Tactical Rating Sidebar */}
      <div className="w-full max-w-[min(100vw-2rem,_560px)] lg:w-[360px] xl:w-[380px] shrink-0 min-w-0 flex flex-col gap-3.5 sm:gap-4 mx-auto lg:mx-0">
        {/* Rating & Mode Header Card */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-3.5 sm:p-5 flex flex-col gap-3 sm:gap-3.5 shadow-[0_6px_0_0_#141311] overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center shrink-0 shadow-[0_2px_0_0_#4d7a24]">
                <Award className="w-5 h-5 text-[#81b64c]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Tactical Rating
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-white font-mono leading-none">
                    {Math.round(playerRating.rating)}
                  </span>
                  {ratingDelta !== null && (
                    <span
                      className={`text-xs font-mono font-black px-2.5 py-0.5 rounded-xl border-2 ${
                        ratingDelta >= 0
                          ? 'bg-[#81b64c]/20 text-[#81b64c] border-[#81b64c]/50'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                      }`}
                    >
                      {ratingDelta >= 0 ? `+${ratingDelta}` : ratingDelta}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Streak Badge */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#f59e0b]/15 border-2 border-[#f59e0b] text-amber-300 shadow-[0_2px_0_0_#92400e] shrink-0"
              title={`Current puzzle streak: ${streak}`}
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0" />
              <span className="text-sm font-mono font-black">{streak}</span>
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">streak</span>
            </div>
          </div>

          {/* Mode Toggle Tabs Container - Uniform balanced p-1.5 padding without excessive bottom void */}
          <div className="grid grid-cols-3 gap-1.5 bg-[#141311] p-1.5 rounded-2xl border-2 border-[#2b2824] w-full shadow-[0_2px_0_0_#0f0e0c]">
            <button
              onClick={() => {
                setIsDailyMode(false);
                setRushMode(false);
              }}
              className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 text-center cursor-pointer border-2 ${
                !isDailyMode && !rushMode
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              Rated
            </button>
            <button
              onClick={() => {
                setIsDailyMode(true);
                setRushMode(false);
              }}
              className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 text-center cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                isDailyMode
                  ? 'bg-amber-500 text-white border-amber-700 shadow-[0_2px_0_0_#b45309] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0" />
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
              className={`py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 text-center cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                rushMode
                  ? 'bg-orange-500 text-white border-orange-700 shadow-[0_2px_0_0_#c2410c] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <span>Rush</span>
            </button>
          </div>

          {/* Level Filter Bar */}
          <div className="pt-2 border-t-2 border-[#2d2a26] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                Difficulty Level
              </span>
              <span className="text-[10px] font-bold text-zinc-400 capitalize">
                {selectedLevel === 'all' ? 'All ELO Ratings' : `${selectedLevel} Tier`}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5 w-full">
              {(['all', 'beginner', 'club', 'advanced', 'master'] as const).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedLevel(lvl);
                    handleNextPuzzle();
                  }}
                  className={`py-1 sm:py-1.5 px-0.5 sm:px-1 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-150 text-center cursor-pointer border-2 truncate ${
                    selectedLevel === lvl
                      ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] translate-y-0.5'
                      : 'bg-[#161512] text-zinc-400 border-[#272522] shadow-[0_2px_0_0_#141311] hover:text-white hover:border-[#383530]'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Tactical Motif Filters (Rated Mode) */}
          {!rushMode && !isDailyMode && (
            <div className="pt-2 border-t-2 border-[#2d2a26] flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  Tactical Motif
                </span>
                <span className="text-[10px] font-bold text-zinc-400 capitalize">
                  {selectedTheme === 'all' ? 'All Motifs' : selectedTheme.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-1.5">
                {[
                  { id: 'all', label: 'Any Motif' },
                  { id: 'fork', label: 'Fork' },
                  { id: 'pin', label: 'Pin' },
                  { id: 'skewer', label: 'Skewer' },
                  { id: 'mate', label: 'Mate' },
                  { id: 'back_rank', label: 'Back Rank' },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setSelectedTheme(th.id)}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer border-2 ${
                      selectedTheme === th.id
                        ? 'bg-[#81b64c]/20 text-[#81b64c] border-[#81b64c] shadow-[0_2px_0_0_#4d7a24]'
                        : 'bg-[#161512] text-zinc-400 border-[#272522] shadow-[0_2px_0_0_#141311] hover:text-zinc-200'
                    }`}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rush Mode Status Header */}
        {rushMode && (
          <div className="p-3 sm:p-3.5 bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl flex items-center justify-between text-xs shadow-[0_3px_0_0_#7c2d12]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" />
              <span className="font-mono font-black text-white text-base">
                {Math.floor(rushTimeRemaining / 60)}:
                {rushTimeRemaining % 60 < 10 ? '0' : ''}
                {rushTimeRemaining % 60}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono font-black text-[#81b64c] text-sm">Score: {score}</span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((s) => (
                  <span key={s} className={s < strikes ? 'text-red-500 font-black' : 'text-zinc-700'}>
                    ✕
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Puzzle Card & Details */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-3.5 sm:p-5 flex flex-col gap-3 sm:gap-3.5 shadow-[0_6px_0_0_#141311] overflow-hidden">
          <div className="flex items-center justify-between min-h-[24px]">
            <span className="text-sm font-black text-white">
              {currentPuzzle.title?.trim() || 'Find the Winning Move'}
            </span>
            {currentPuzzle.theme && currentPuzzle.theme.trim().length > 0 ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-300 px-3 py-1 rounded-xl border-2 border-blue-500/40 shadow-[0_2px_0_0_#141311]">
                {currentPuzzle.theme.replace(/_/g, ' ')}
              </span>
            ) : null}
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-medium">
            Find the best continuation for{' '}
            <strong className="text-white font-black">
              {puzzleTurn === 'w' ? 'White' : 'Black'}
            </strong>
            . Look for forcing checks, tactical pins, double attacks, and mating nets.
          </p>

          {/* Feedback Badges */}
          {statusMessage === 'solved' && (
            <div className="p-3.5 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl flex items-center gap-2.5 text-emerald-300 text-xs font-black animate-in fade-in shadow-[0_3px_0_0_#064e3b]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Brilliant! Tactical continuation verified! (+15 XP)</span>
            </div>
          )}

          {statusMessage === 'incorrect' && (
            <div className="p-3.5 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl flex items-center gap-2.5 text-rose-300 text-xs font-black animate-in fade-in shadow-[0_3px_0_0_#4c0519]">
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Incorrect move. That lets the opponent escape or loses material!</span>
            </div>
          )}

          {/* Progressive Hint Display */}
          {hintLevel > 0 && (
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl text-xs text-amber-200 flex flex-col gap-1.5 shadow-[0_2px_0_0_#78350f]">
              <div className="flex items-center gap-1.5 font-black text-amber-400 uppercase tracking-wider text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tactical Hint ({hintLevel}/3):</span>
              </div>
              <p className="text-[11px] leading-relaxed text-zinc-300 font-medium">
                {hintLevel === 1 && (
                  <>
                    Notice the piece alignment and unprotected units. Consider moving your{' '}
                    <strong className="text-white font-bold">
                      {solutionSequence[0]?.slice(0, 2) ? 'tactical piece' : 'active piece'}
                    </strong>
                    .
                  </>
                )}
                {hintLevel === 2 && (
                  <>
                    Look specifically at the square{' '}
                    <strong className="text-amber-300 font-mono font-bold">
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
                    <strong className="text-[#81b64c] font-mono font-bold">
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
            <div className="p-3.5 bg-[#161512] rounded-2xl border-2 border-[#2b2824] text-xs text-zinc-300 leading-relaxed font-sans shadow-inner">
              <strong className="text-[#81b64c] block mb-1 font-black uppercase tracking-wider text-[11px]">Solution Breakdown:</strong>
              {currentPuzzle.solutionDescription}
              <div className="mt-2 text-[11px] font-mono font-bold text-zinc-400">
                Moves: {solutionSequence.join(' → ')}
              </div>
            </div>
          )}

          {/* Action Buttons - Priority Visual Hierarchy */}
          {statusMessage === 'solved' ? (
            <div className="pt-3 border-t-2 border-[#2d2a26] flex flex-col gap-2.5">
              <button
                onClick={handleNextPuzzle}
                className="w-full py-3.5 px-6 rounded-2xl bg-[#58cc02] hover:bg-[#4bad02] text-white text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-[#3da300] shadow-[0_5px_0_0_#2b7300] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
              >
                <span>Continue to Next Puzzle</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => {
                    setChess(new Chess(currentPuzzle.fen));
                    setMoveStepIndex(0);
                    setPlayedMoves([]);
                    setStatusMessage('idle');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#262420] hover:bg-[#2d2a26] text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>
                <button
                  onClick={() => setShowSolution((prev) => !prev)}
                  className="px-4 py-2 rounded-xl bg-[#262420] hover:bg-[#2d2a26] text-zinc-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showSolution ? 'Hide Analysis' : 'Show Analysis'}</span>
                </button>

                <button
                  onClick={() => router.push(`/analysis?fen=${encodeURIComponent(currentPuzzle.fen)}`)}
                  className="px-3.5 py-2 rounded-xl bg-[#201e1a] hover:bg-[#2a2722] text-cyan-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border-2 border-cyan-500/30 hover:border-cyan-500 shadow-[0_2px_0_0_#141311] transition-all cursor-pointer"
                  title="Deep calculate this puzzle in Analysis Studio"
                >
                  <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Studio</span>
                </button>

                <button
                  onClick={() => router.push(`/bots?fen=${encodeURIComponent(currentPuzzle.fen)}`)}
                  className="px-3.5 py-2 rounded-xl bg-[#201e1a] hover:bg-[#2a2722] text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1.5 border-2 border-amber-500/40 hover:border-amber-500 shadow-[0_2px_0_0_#141311] transition-all cursor-pointer"
                  title="Practice converting this winning tactical position against a Bot"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>Spar Bot</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t-2 border-[#2d2a26]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setChess(new Chess(currentPuzzle.fen));
                    setMoveStepIndex(0);
                    setPlayedMoves([]);
                    setStatusMessage('idle');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#262420] hover:bg-[#2e2a25] text-zinc-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  onClick={() => setHintLevel((lvl) => (lvl >= 3 ? 0 : lvl + 1))}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 transition-all cursor-pointer ${
                    hintLevel > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_2px_0_0_#92400e]'
                      : 'bg-[#262420] hover:bg-[#2e2a25] text-zinc-300 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{hintLevel > 0 ? `Hint ${hintLevel}/3` : 'Hint'}</span>
                </button>

                <button
                  onClick={() => setShowSolution((prev) => !prev)}
                  className="px-3.5 py-2 rounded-xl bg-[#262420] hover:bg-[#2e2a25] text-zinc-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showSolution ? 'Hide' : 'Solution'}</span>
                </button>

                <button
                  onClick={() => router.push(`/analysis?fen=${encodeURIComponent(currentPuzzle.fen)}`)}
                  className="px-3 py-2 rounded-xl bg-[#262420] hover:bg-[#2e2a25] text-cyan-300 text-xs font-black uppercase tracking-wider flex items-center gap-1 border-2 border-cyan-500/30 hover:border-cyan-500 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title="Deep calculate this puzzle in Analysis Studio"
                >
                  <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden sm:inline">Studio</span>
                </button>

                <button
                  onClick={() => router.push(`/bots?fen=${encodeURIComponent(currentPuzzle.fen)}`)}
                  className="px-3 py-2 rounded-xl bg-[#262420] hover:bg-[#2e2a25] text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1 border-2 border-amber-500/30 hover:border-amber-500 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
                  title="Practice converting this position against a Bot"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Spar Bot</span>
                </button>
              </div>

              <button
                onClick={handleNextPuzzle}
                className="px-5 py-2 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-[#5c8a32] shadow-[0_3px_0_0_#4d7a24] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tactile XP Gain Toast */}
      <XpGainToast gain={recentGain} />
    </div>
  );
};
