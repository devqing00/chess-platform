'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { ENDGAME_STUDIES, getEndgameById, EndgameStudy } from '@/lib/endgamesData';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { LearningProgressStore } from '@/lib/learningPathData';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpGainToast } from '@/components/xp/XpGainToast';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import {
  Crown,
  RotateCcw,
  ArrowRight,
  Eye,
  CheckCircle2,
  XCircle,
  Sparkles,
  Shield,
  Lightbulb,
  Award,
  BookOpen,
} from 'lucide-react';

interface EndgameArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  initialStudyId?: string;
  onComplete?: (studyId: string) => void;
}

export const EndgameArena: React.FC<EndgameArenaProps> = ({
  boardTheme,
  pieceTheme,
  initialStudyId,
  onComplete,
}) => {
  const { awardXp, recentGain } = useXpSystem();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [studyIndex, setStudyIndex] = useState(0);

  const filteredStudies = useMemo(() => {
    if (selectedCategory === 'all') return ENDGAME_STUDIES;
    return ENDGAME_STUDIES.filter((s) => s.category === selectedCategory);
  }, [selectedCategory]);

  // If initialStudyId is passed, find its index
  useEffect(() => {
    if (initialStudyId) {
      const idx = filteredStudies.findIndex((s) => s.id === initialStudyId);
      if (idx !== -1) {
        setStudyIndex(idx);
      }
    }
  }, [initialStudyId, filteredStudies]);

  const currentStudy: EndgameStudy =
    filteredStudies[studyIndex] || filteredStudies[0] || ENDGAME_STUDIES[0];

  const [chess, setChess] = useState<Chess>(() => new Chess(currentStudy.fen));
  const [moveStep, setMoveStep] = useState(0);
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect' | 'solved'>('idle');
  const [showSolution, setShowSolution] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Reset when study changes
  useEffect(() => {
    setChess(new Chess(currentStudy.fen));
    setMoveStep(0);
    setStatus('idle');
    setShowSolution(false);
    setHint(null);
  }, [currentStudy]);

  const handleNext = useCallback(() => {
    setStudyIndex((prev) => (prev + 1) % filteredStudies.length);
  }, [filteredStudies.length]);

  // Spacebar keyboard listener to advance when solved
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.code === 'Space' || e.key === 'Enter') && status === 'solved') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleNext]);

  const handleUserMove = useCallback(
    (from: Square, to: Square) => {
      if (status === 'solved') return false;

      const expectedUci = currentStudy.moves[moveStep];
      const attemptedUci = `${from}${to}`.toLowerCase();

      // Check legality in current position
      const test = new Chess(chess.fen());
      const legal = test.move({ from, to, promotion: 'q' });
      if (!legal) return false;

      if (attemptedUci === expectedUci || attemptedUci === expectedUci.substring(0, 4)) {
        // Correct move
        chess.move({ from, to, promotion: expectedUci.length === 5 ? (expectedUci[4] as any) : 'q' });
        setChess(new Chess(chess.fen()));
        soundService.playMove();

        const nextStep = moveStep + 1;

        if (nextStep >= currentStudy.moves.length) {
          // Solved!
          setStatus('solved');
          soundService.playPuzzleSuccess();
          LearningProgressStore.completeNode(currentStudy.id, 30);
          awardXp('complete_endgame_study', 'Endgame Study Mastered');
          onComplete?.(currentStudy.id);
          try {
            confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
          } catch {}
        } else {
          // Play opponent response automatically
          setStatus('correct');
          setMoveStep(nextStep);

          const oppUci = currentStudy.moves[nextStep];
          setTimeout(() => {
            const oppFrom = oppUci.substring(0, 2) as Square;
            const oppTo = oppUci.substring(2, 4) as Square;
            const oppProm = oppUci.length === 5 ? oppUci[4] : undefined;
            chess.move({ from: oppFrom, to: oppTo, promotion: oppProm as any });
            setChess(new Chess(chess.fen()));
            soundService.playMove();

            const afterOppStep = nextStep + 1;
            if (afterOppStep >= currentStudy.moves.length) {
              setStatus('solved');
              soundService.playPuzzleSuccess();
              LearningProgressStore.completeNode(currentStudy.id, 30);
              awardXp('complete_endgame_study', 'Endgame Study Mastered');
              onComplete?.(currentStudy.id);
              try {
                confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
              } catch {}
            } else {
              setMoveStep(afterOppStep);
            }
          }, 450);
        }
        return true;
      } else {
        // Incorrect move
        setStatus('incorrect');
        soundService.playPuzzleFail();
        return false;
      }
    },
    [chess, currentStudy, moveStep, status, onComplete, awardXp]
  );

  const handleReset = () => {
    setChess(new Chess(currentStudy.fen));
    setMoveStep(0);
    setStatus('idle');
    setShowSolution(false);
    setHint(null);
  };

  const handleShowHint = () => {
    const nextExpected = currentStudy.moves[moveStep];
    if (nextExpected) {
      const fromSq = nextExpected.substring(0, 2).toUpperCase();
      setHint(`Hint: Look for a key move with the piece on ${fromSq}. Key idea: ${currentStudy.keyTechnique}`);
    }
  };

  const handleShowSolution = () => {
    setShowSolution(true);
  };

  return (
    <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-5 sm:gap-6 select-none">
      {/* Chessboard Column */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[min(calc(100vw-2rem),560px)] lg:max-w-[460px] xl:max-w-[490px] 2xl:max-w-[530px]">
        {/* Priority Tablebase Directive Banner */}
        <div
          className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border-2 flex items-center justify-between gap-2.5 sm:gap-3 shadow-[0_4px_0_0_#141311] transition-all duration-200 ${
            status === 'solved'
              ? 'bg-[#182c14] border-[#58cc02] text-white shadow-[0_4px_0_0_#2b7300]'
              : status === 'incorrect'
              ? 'bg-[#2f1418] border-rose-500 text-white shadow-[0_4px_0_0_#881337]'
              : 'bg-[#201e1a] border-[#332f28] text-white'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 shrink-0 ${
                currentStudy.turn === 'w'
                  ? 'bg-white border-zinc-400'
                  : 'bg-zinc-950 border-zinc-600'
              }`}
            />
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate flex items-center gap-1.5">
                {status === 'solved' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#58cc02] shrink-0" />
                    <span>Study Mastered! +30 XP</span>
                  </>
                ) : status === 'incorrect' ? (
                  <>
                    <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" />
                    <span>Deviation from Defense</span>
                  </>
                ) : (
                  <span>
                    {currentStudy.turn === 'w' ? 'White to Move' : 'Black to Move'} ({currentStudy.objective === 'Win' ? 'Win' : 'Draw'})
                  </span>
                )}
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-300 font-medium truncate">
                {status === 'solved'
                  ? 'Spacebar or Continue to next study'
                  : status === 'incorrect'
                  ? 'Try another tablebase move or use a hint'
                  : `${currentStudy.tablebaseEvaluation || 'Tablebase'} | Move ${Math.min(moveStep + 1, currentStudy.moves.length)} of ${currentStudy.moves.length}`}
              </span>
            </div>
          </div>

          {status === 'solved' ? (
            <button
              onClick={handleNext}
              className="px-3 sm:px-4 py-1.5 rounded-xl bg-[#58cc02] hover:bg-[#4cad02] border-2 border-[#3da300] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#2b7300] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
            </button>
          ) : (
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-amber-400/20 shrink-0">
              {currentStudy.difficulty}
            </span>
          )}
        </div>

        {/* Board */}
        <div className="w-[min(calc(100vw-2.5rem),calc(100vh-230px),540px)] aspect-square relative rounded-2xl overflow-hidden border-2 border-[#332f28] shadow-[0_6px_0_0_#141311]">
          <ChessBoard
            chess={chess}
            orientation={currentStudy.turn}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleUserMove}
            disabled={status === 'solved'}
          />
        </div>

        {/* Objective & Technique Chip Bar */}
        <div className="w-[min(calc(100vw-2.5rem),calc(100vh-230px),540px)] bg-[#1a1815] border-2 border-[#2b2824] rounded-xl sm:rounded-2xl px-3 sm:px-3.5 py-2 flex items-center justify-between text-xs shadow-[0_2px_0_0_#141311]">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="text-zinc-300 text-[10px] sm:text-[11px] font-bold truncate">
              {currentStudy.keyTechnique}
            </span>
          </div>

          <span className="font-mono text-[10px] sm:text-[11px] text-zinc-400 shrink-0">
            Rating: <strong className="text-purple-400 font-bold">{currentStudy.rating}</strong>
          </span>
        </div>

        {/* Mobile Quick Action Ribbon */}
        <div className="w-[min(calc(100vw-2.5rem),calc(100vh-230px),540px)] lg:hidden flex items-center justify-between gap-2 p-2 bg-[#1a1815] border-2 border-[#2b2824] rounded-xl text-xs shadow-[0_2px_0_0_#141311]">
          <div className="flex items-center gap-1.5">
            <Button
              variant="secondary"
              size="xs"
              rounded="lg"
              onClick={handleReset}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
            <Button
              variant="secondary"
              size="xs"
              rounded="lg"
              onClick={handleShowHint}
            >
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Hint</span>
            </Button>
            <Button
              variant="secondary"
              size="xs"
              rounded="lg"
              onClick={handleShowSolution}
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              <span>Solution</span>
            </Button>
          </div>

          <Button
            variant="primary"
            size="xs"
            rounded="lg"
            onClick={handleNext}
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Control & Study Card Column */}
      <div className="w-full max-w-[min(calc(100vw-2rem),560px)] lg:max-w-[420px] xl:max-w-[440px] flex flex-col gap-3.5 sm:gap-4">
        {/* Category Filter Tabs - Horizontally scrollable without void */}
        <div className="flex items-center gap-1.5 p-1 sm:p-1.5 bg-[#1a1815] rounded-xl sm:rounded-2xl border-2 border-[#2b2824] shadow-[0_2px_0_0_#0f0e0c] overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Studies' },
            { id: 'king_pawn', label: 'King & Pawn' },
            { id: 'rook_endgame', label: 'Rook Citadel' },
            { id: 'minor_piece', label: 'Minor Piece' },
            { id: 'grandmaster_study', label: 'GM Studies' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                soundService.playTactilePop();
                setSelectedCategory(cat.id);
                setStudyIndex(0);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 active:translate-y-[1px]'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Study Details Card */}
        <div className="p-4 sm:p-5 bg-[#201e1a] border-2 border-[#332f28] rounded-2xl sm:rounded-3xl shadow-[0_6px_0_0_#141311] flex flex-col gap-3 sm:gap-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 inline-block mb-1">
                {currentStudy.difficulty} ({currentStudy.rating})
              </span>
              <h2 className="text-sm sm:text-base font-black text-white">{currentStudy.title}</h2>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#ce82ff]/15 border-2 border-[#ce82ff]/40 flex items-center justify-center text-[#ce82ff] shrink-0 shadow-[0_2px_0_0_#7e22ce]">
              <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <p className="text-xs text-zinc-300 font-medium leading-relaxed">
            {currentStudy.description}
          </p>

          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#171613] border border-[#2b2824] flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs text-zinc-300">
              <strong className="text-white font-bold">Key Technique:</strong> {currentStudy.keyTechnique}
            </span>
          </div>

          {/* Feedback Banners */}
          {status === 'solved' && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400 flex items-center gap-2.5 animate-in fade-in shadow-[0_3px_0_0_#064e3b]">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-xs font-black">
                Outstanding! Technique executed to theoretical perfection. (+30 XP)
              </span>
            </div>
          )}

          {status === 'incorrect' && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-400 flex items-center gap-2.5 animate-in fade-in shadow-[0_3px_0_0_#4c0519]">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="text-xs font-bold">
                That move deviates from optimal tablebase technique. Try again!
              </span>
            </div>
          )}

          {hint && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-amber-500/15 border-2 border-amber-500/30 text-amber-300 text-xs font-medium animate-in fade-in shadow-[0_2px_0_0_#78350f]">
              {hint}
            </div>
          )}

          {showSolution && (
            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-[#171613] border border-[#35322b] text-xs text-zinc-300 font-mono">
              <span className="font-bold text-white block mb-1">Winning Sequence:</span>
              {currentStudy.moves.join(' → ')}
            </div>
          )}

          {/* Action Buttons Row */}
          <div className="pt-2 flex flex-col gap-2.5">
            <Button
              variant="primary"
              size={status === 'solved' ? 'lg' : 'md'}
              rounded="2xl"
              fullWidth
              onClick={handleNext}
              className="gap-2"
            >
              <span>{status === 'solved' ? 'Continue to Next Study' : 'Next Endgame Study'}</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Button>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={handleReset}
                className="flex-1 gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={handleShowHint}
                className="flex-1 gap-1"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Hint</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={handleShowSolution}
                className="flex-1 gap-1"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Solution</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tactile XP Gain Toast */}
      <XpGainToast gain={recentGain} />
    </div>
  );
};
