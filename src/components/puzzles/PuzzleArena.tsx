'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { TacticalPuzzle, BoardTheme, PieceTheme, PuzzlePillar, PuzzleTier } from '@/types/chess';
import { PuzzleEngineService } from '@/lib/server/puzzleEngineService';
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
  Sparkles,
  Zap,
  Target,
  Brain,
  Crown,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpGainToast } from '@/components/xp/XpGainToast';
import { Button } from '@/components/ui/button';

interface PuzzleArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  initialPuzzleId?: string;
  initialPillar?: PuzzlePillar;
  onSolve?: (puzzleId: string) => void;
}

export const PuzzleArena: React.FC<PuzzleArenaProps> = ({
  boardTheme,
  pieceTheme,
  initialPuzzleId,
  initialPillar = 'tactics',
  onSolve,
}) => {
  const router = useRouter();
  const { user } = useAuth();
  const { awardXp, recentGain } = useXpSystem();

  // Active training pillar: tactics | strategy | endgame
  const [activePillar, setActivePillar] = useState<PuzzlePillar>(initialPillar);
  const [selectedTier, setSelectedTier] = useState<PuzzleTier>('club');

  // Master SRS puzzle state
  const [currentPuzzle, setCurrentPuzzle] = useState<TacticalPuzzle>(() => {
    return PuzzleEngineService.getNextPuzzle(initialPillar, 'club');
  });

  const [chess, setChess] = useState<Chess>(() => new Chess(currentPuzzle.fen));
  const [moveStepIndex, setMoveStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<'idle' | 'correct' | 'incorrect' | 'solved'>('idle');
  const [showSolution, setShowSolution] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [masteryNotice, setMasteryNotice] = useState<string | null>(null);

  // Sync initialPillar prop changes
  useEffect(() => {
    if (initialPillar && initialPillar !== activePillar) {
      setActivePillar(initialPillar);
      const nextPuz = PuzzleEngineService.getNextPuzzle(initialPillar, selectedTier);
      setCurrentPuzzle(nextPuz);
      setChess(new Chess(nextPuz.fen));
      setMoveStepIndex(0);
      setStatusMessage('idle');
      setShowSolution(false);
      setHintLevel(0);
      setMasteryNotice(null);
    }
  }, [initialPillar, selectedTier, activePillar]);

  // Solution moves parsed
  const solutionSequence = useMemo(() => {
    return currentPuzzle.moves || [];
  }, [currentPuzzle]);

  const loadPuzzle = useCallback((puz: TacticalPuzzle) => {
    setCurrentPuzzle(puz);
    setChess(new Chess(puz.fen));
    setMoveStepIndex(0);
    setStatusMessage('idle');
    setShowSolution(false);
    setHintLevel(0);
    setMasteryNotice(null);
  }, []);

  const handleNextPuzzle = useCallback(() => {
    const nextPuz = PuzzleEngineService.getNextPuzzle(activePillar, selectedTier);
    loadPuzzle(nextPuz);
  }, [activePillar, selectedTier, loadPuzzle]);

  const handlePillarChange = (newPillar: PuzzlePillar) => {
    setActivePillar(newPillar);
    const nextPuz = PuzzleEngineService.getNextPuzzle(newPillar, selectedTier);
    loadPuzzle(nextPuz);
  };

  const handleTierChange = (newTier: PuzzleTier) => {
    setSelectedTier(newTier);
    const nextPuz = PuzzleEngineService.getNextPuzzle(activePillar, newTier);
    loadPuzzle(nextPuz);
  };

  // Keyboard shortcut listener for spacebar to next puzzle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && statusMessage === 'solved') {
        e.preventDefault();
        handleNextPuzzle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [statusMessage, handleNextPuzzle]);

  // Execute and validate player move
  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (statusMessage === 'solved') return;

    try {
      const copy = new Chess(chess.fen());
      const move = copy.move({
        from,
        to,
        promotion: promotion || 'q',
      });
      if (!move) return;

      const expectedUci = solutionSequence[moveStepIndex];
      const isExpected =
        expectedUci &&
        (move.san.toLowerCase() === expectedUci.toLowerCase() ||
          `${move.from}${move.to}`.toLowerCase() === expectedUci.toLowerCase() ||
          `${move.from}${move.to}${move.promotion || ''}`.toLowerCase() === expectedUci.toLowerCase());

      if (isExpected) {
        setChess(copy);
        soundService.playMove();

        const nextStepIndex = moveStepIndex + 1;
        setMoveStepIndex(nextStepIndex);

        if (nextStepIndex >= solutionSequence.length) {
          // Fully solved!
          setStatusMessage('solved');
          soundService.playGameEndWin();
          const nextStreak = streak + 1;
          setStreak(nextStreak);

          // Update Leitner Spaced Repetition status
          const result = PuzzleEngineService.recordSolveAttempt(
            currentPuzzle.id,
            true,
            currentPuzzle.pillar || activePillar,
            currentPuzzle.tier || selectedTier
          );

          // Award pure XP (No fake Elo)
          awardXp(result.xpEarned, `${(currentPuzzle.pillar || activePillar).toUpperCase()}: ${currentPuzzle.theme}`);

          if (result.graduatedToMastered) {
            setMasteryNotice('🎓 Graduated to Mastered! Retiring from active rotation.');
            try {
              confetti({ particleCount: 60, spread: 70, origin: { y: 0.65 } });
            } catch {}
          }

          if (onSolve) onSolve(currentPuzzle.id);
        } else {
          // Opponent response in continuation
          setStatusMessage('correct');
          setTimeout(() => {
            const oppUci = solutionSequence[nextStepIndex];
            if (oppUci) {
              const oppCopy = new Chess(copy.fen());
              let oppMove = null;
              if (oppUci.length >= 4) {
                const oppFrom = oppUci.slice(0, 2) as Square;
                const oppTo = oppUci.slice(2, 4) as Square;
                const oppProm = (oppUci[4] as PieceSymbol) || undefined;
                oppMove = oppCopy.move({ from: oppFrom, to: oppTo, promotion: oppProm });
              }
              if (!oppMove) {
                oppMove = oppCopy.move(oppUci);
              }
              if (oppMove) {
                setChess(oppCopy);
                setMoveStepIndex(nextStepIndex + 1);
                soundService.playMove();
              }
            }
          }, 450);
        }
      } else {
        // Incorrect move attempt: reset consecutive SRS progress
        soundService.playGameEndLoss();
        setStatusMessage('incorrect');
        setStreak(0);

        PuzzleEngineService.recordSolveAttempt(
          currentPuzzle.id,
          false,
          currentPuzzle.pillar || activePillar,
          currentPuzzle.tier || selectedTier
        );

        setTimeout(() => {
          setChess(new Chess(currentPuzzle.fen));
          setMoveStepIndex(0);
          setStatusMessage('idle');
        }, 1200);
      }
    } catch {
      // Invalid chess.js move attempt ignored
    }
  };

  const handleReset = () => {
    setChess(new Chess(currentPuzzle.fen));
    setMoveStepIndex(0);
    setStatusMessage('idle');
    setShowSolution(false);
  };

  const puzzleTurn = currentPuzzle.fen.split(' ')[1] as 'w' | 'b';

  return (
    <div className="w-full h-full min-h-0 flex flex-col justify-between gap-3 select-none text-zinc-100">
      {recentGain && <XpGainToast gain={recentGain} />}

      {/* TOP PILLAR & TIER CONTROLLER (Tactics | Strategy | Endgames) */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-1">
            Mastery Pillar:
          </span>
          <button
            onClick={() => handlePillarChange('tactics')}
            className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer select-none ${
              activePillar === 'tactics'
                ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16] font-black'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Tactics</span>
          </button>

          <button
            onClick={() => handlePillarChange('strategy')}
            className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer select-none ${
              activePillar === 'strategy'
                ? 'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#78350f] font-black'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Strategy</span>
          </button>

          <button
            onClick={() => handlePillarChange('endgame')}
            className={`tactile-btn px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer select-none ${
              activePillar === 'endgame'
                ? 'bg-gradient-to-b from-[#c084fc] via-[#a855f7] to-[#9333ea] text-white border-t border-white/35 shadow-[0_2px_0_0_#4c1d95] font-black'
                : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Endgames</span>
          </button>
        </div>

        {/* Tier Range Selector & Streak Badge */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center gap-1 bg-[#141311] p-1 rounded-xl border border-white/5">
            {(['fundamentals', 'club', 'advanced', 'master'] as PuzzleTier[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTierChange(t)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                  selectedTier === t
                    ? 'bg-white/20 text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {t.slice(0, 4)}
              </button>
            ))}
          </div>

          {streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{streak}x</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN VIEWPORT DUAL-PANE ARENA */}
      <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left (7 Cols): Tactical Board */}
        <div className="lg:col-span-7 h-full flex flex-col items-center justify-center min-h-0">
          <div className="h-full max-h-[460px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1c1a17]">
            <ChessBoard
              chess={chess}
              orientation={puzzleTurn}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              onMove={handleMove}
              disabled={statusMessage === 'solved'}
            />

            {/* In-Board Status Overlay */}
            {statusMessage === 'solved' && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-500/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Solved! +{currentPuzzle.xpReward || 25} XP</span>
              </div>
            )}
            {statusMessage === 'incorrect' && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-rose-500/90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-in fade-in">
                <XCircle className="w-4 h-4" />
                <span>Incorrect Move</span>
              </div>
            )}
          </div>
        </div>

        {/* Right (5 Cols): Smart Teaching, Danny Coach Insight & Single P1 Anchor */}
        <div className="lg:col-span-5 h-full max-h-[460px] p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Theme: {currentPuzzle.theme}</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 text-zinc-300">
                {(currentPuzzle.tier || selectedTier).toUpperCase()}
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">{currentPuzzle.title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {puzzleTurn === 'w' ? 'White to move' : 'Black to move'} — Find the best move.
              </p>
            </div>

            {/* Coach Danny Rensch Commentary */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-relaxed font-medium">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Coach Danny Rensch</span>
              </div>
              <p>
                {statusMessage === 'solved'
                  ? currentPuzzle.teachingNotes || currentPuzzle.solutionDescription
                  : hintLevel > 0
                  ? currentPuzzle.coachHint || 'Identify undefended pieces and potential pins.'
                  : 'Look for tactical weaknesses, overworked defenders, and king exposure.'}
              </p>
            </div>

            {/* Spaced Repetition Mastery Notice */}
            {masteryNotice && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{masteryNotice}</span>
              </div>
            )}

            {/* Helper Controls: Reset & Hint */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="secondary"
                size="xs"
                rounded="xl"
                onClick={handleReset}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>

              <Button
                variant="warning"
                size="xs"
                rounded="xl"
                onClick={() => setHintLevel((prev) => prev + 1)}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Hint</span>
              </Button>
            </div>
          </div>

          {/* P1 PRIMARY ACTION ANCHOR - EXACTLY ONE PER SCREEN */}
          <div className="pt-2 border-t border-white/5 shrink-0">
            {statusMessage === 'solved' ? (
              <Button
                variant="primary"
                size="lg"
                rounded="xl"
                fullWidth
                onClick={handleNextPuzzle}
              >
                <span>Next Challenge (Spacebar)</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="md"
                rounded="xl"
                fullWidth
                onClick={handleNextPuzzle}
              >
                <span>Skip to Next Due Puzzle</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
