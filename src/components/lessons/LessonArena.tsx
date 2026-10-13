'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { LESSON_TRACKS, ChessLesson, LessonStep } from '@/lib/lessonsData';
import { BoardTheme, PieceTheme, ArrowAnnotation, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  Clock,
  BookOpen,
  Award,
  Crown,
} from 'lucide-react';

interface LessonArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  tier?: MembershipTier;
}

export const LessonArena: React.FC<LessonArenaProps> = ({
  boardTheme,
  pieceTheme,
  tier = 'diamond',
}) => {
  const { user } = useAuth();
  const [selectedTrack, setSelectedTrack] = useState(LESSON_TRACKS[0]);
  const [selectedLesson, setSelectedLesson] = useState<ChessLesson>(LESSON_TRACKS[0].lessons[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const step: LessonStep = selectedLesson.steps[currentStepIndex] || selectedLesson.steps[0];

  const [chess, setChess] = useState(() => new Chess(step.fen));
  const [stepStatus, setStepStatus] = useState<'idle' | 'correct' | 'wrong' | 'completed'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [customArrows, setCustomArrows] = useState<ArrowAnnotation[]>([]);

  // Reset or load current step
  const loadStep = useCallback((targetStep: LessonStep) => {
    setChess(new Chess(targetStep.fen));
    setStepStatus('idle');
    setShowHint(false);
    setCustomArrows([]);
  }, []);

  useEffect(() => {
    loadStep(step);
  }, [step, loadStep]);

  // Handle board move in lesson
  const handleBoardMove = async (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (stepStatus === 'correct' || stepStatus === 'completed') return;

    try {
      const clone = new Chess(chess.fen());
      const moveRes = clone.move({ from, to, promotion: promotion || 'q' });
      if (!moveRes) return;

      const expectedSan = step.solutionMoves[0];
      const isExpected =
        moveRes.san === expectedSan ||
        `${moveRes.from}${moveRes.to}`.toLowerCase() === expectedSan.toLowerCase();

      setChess(clone);

      if (isExpected) {
        soundService.playPuzzleSuccess();
        const isLastStep = currentStepIndex === selectedLesson.steps.length - 1;

        if (isLastStep) {
          setStepStatus('completed');
          confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });
        } else {
          setStepStatus('correct');
        }

        // Inform backend about lesson step completion
        try {
          await fetch('/api/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lessonId: selectedLesson.id,
              stepId: step.stepId,
              tier,
            }),
          });
          if (user) {
            FirestoreService.saveLessonProgress(user.uid, selectedLesson.id, step.stepId);
          }
        } catch {
          // ignore error
        }
      } else {
        soundService.playPuzzleFail();
        setStepStatus('wrong');
        setTimeout(() => {
          loadStep(step);
        }, 900);
      }
    } catch {
      // Invalid move
    }
  };

  const handleNextStep = () => {
    if (currentStepIndex < selectedLesson.steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const toggleHint = () => {
    setShowHint(true);
    if (step.arrowHint) {
      setCustomArrows([
        {
          from: step.arrowHint.from as Square,
          to: step.arrowHint.to as Square,
          color: '#81b64c',
        },
      ]);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center p-2 sm:p-4 select-none">
      {/* Lesson Interactive Chessboard */}
      <div className="w-[min(100%,calc(100vh-220px),480px)] shrink-0 flex flex-col items-center gap-2.5">
        <div className="w-full aspect-square">
          <ChessBoard
            chess={chess}
            orientation="w"
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleBoardMove}
            customArrows={customArrows}
            disabled={stepStatus === 'correct' || stepStatus === 'completed'}
          />
        </div>

        {/* Step Indicator Ribbon */}
        <div className="w-full bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c] animate-pulse" />
            <span className="font-bold text-white">
              Step {step.stepId} of {selectedLesson.steps.length}: {step.title}
            </span>
          </div>
          <div className="flex gap-1.5">
            {selectedLesson.steps.map((s, idx) => (
              <div
                key={s.stepId}
                className={`w-6 h-2 rounded-full transition-colors ${
                  idx < currentStepIndex
                    ? 'bg-[#81b64c]'
                    : idx === currentStepIndex
                    ? 'bg-white shadow'
                    : 'bg-[#2b2926]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Coach Dialogue, Instruction & Curriculum Sidebar */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 min-w-0 flex flex-col gap-4">
        {/* Active Lesson Card */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-[#81b64c]" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {selectedTrack.title}
                </span>
                <h2 className="text-base font-black text-white">{selectedLesson.title}</h2>
              </div>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 px-2.5 py-1 rounded-lg border border-emerald-500/20 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" />
              {selectedLesson.durationMinutes} min
            </span>
          </div>

          {/* Coach Danny Commentary Bubble */}
          <div className="bg-[#161512] border border-[#2b2824] rounded-xl p-3.5 flex gap-3 items-start">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#81b64c] to-[#5d8b32] flex items-center justify-center text-lg shadow shrink-0">
              🧑‍🏫
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-black text-[#81b64c]">Coach Danny Rensch</span>
              <p className="text-zinc-300 leading-relaxed font-medium">
                "{stepStatus === 'correct' || stepStatus === 'completed'
                  ? step.explanation
                  : step.instruction}"
              </p>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {stepStatus === 'correct' && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-300 font-bold animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Well played! You found the correct continuation!</span>
              </div>
              <button
                onClick={handleNextStep}
                className="px-3 py-1.5 rounded-lg bg-[#81b64c] text-white text-xs font-black flex items-center gap-1 cursor-pointer hover:bg-[#72a342]"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {stepStatus === 'completed' && (
            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl flex flex-col gap-2 text-xs text-emerald-300 font-bold animate-in fade-in">
              <div className="flex items-center gap-2 text-sm text-white font-black">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Lesson Complete! Master Trophy Earned!</span>
              </div>
              <p className="text-xs text-zinc-300 font-normal">
                You've successfully mastered {selectedLesson.title}. Review the key motifs or advance to the next course module!
              </p>
            </div>
          )}

          {stepStatus === 'wrong' && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-bold animate-in fade-in">
              Not quite! That wasn't the principled move. The board is resetting—try again or view the hint!
            </div>
          )}

          {/* Hint Card */}
          {showHint && (
            <div className="p-3 bg-[#181614] rounded-xl border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-2 animate-in fade-in">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 mb-0.5">Tactical Hint:</strong>
                {step.hint}
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2d2a26]">
            <button
              onClick={() => loadStep(step)}
              className="p-2.5 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Step</span>
            </button>

            <button
              onClick={toggleHint}
              className="p-2.5 rounded-xl bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>
          </div>
        </div>

        {/* Curriculum Tracks Directory Drawer */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#81b64c]" />
              Interactive Curriculum Tree
            </span>
            <div className="flex gap-1">
              {LESSON_TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTrack(t);
                    setSelectedLesson(t.lessons[0]);
                    setCurrentStepIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedTrack.id === t.id
                      ? 'bg-[#81b64c] text-white shadow'
                      : 'bg-[#161512] text-zinc-400 hover:text-white border border-[#2d2a26]'
                  }`}
                >
                  {t.difficulty}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-[#282622]">
            {selectedTrack.lessons.map((les) => {
              const isCurrent = selectedLesson.id === les.id;
              return (
                <button
                  key={les.id}
                  onClick={() => {
                    setSelectedLesson(les);
                    setCurrentStepIndex(0);
                  }}
                  className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#262420] border-l-4 border-[#81b64c]'
                      : 'hover:bg-[#23211e]'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{les.title}</span>
                    <span className="text-[11px] text-zinc-400 line-clamp-1">{les.subtitle}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
