'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Persistent progress state in localStorage
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('checkmate_lesson_progress_v1');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [stepProgressMap, setStepProgressMap] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('checkmate_lesson_steps_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const step: LessonStep = selectedLesson.steps[currentStepIndex] || selectedLesson.steps[0];

  const [chess, setChess] = useState(() => new Chess(step.fen));
  const [stepStatus, setStepStatus] = useState<'idle' | 'correct' | 'wrong' | 'completed'>('idle');
  const [showHint, setShowHint] = useState(false);
  const [customArrows, setCustomArrows] = useState<ArrowAnnotation[]>([]);

  // Total lessons count across all tracks
  const totalLessonsCount = useMemo(() => {
    return LESSON_TRACKS.reduce((acc, t) => acc + t.lessons.length, 0);
  }, []);

  const overallPercent = useMemo(() => {
    if (totalLessonsCount === 0) return 0;
    return Math.min(100, Math.round((completedLessonIds.length / totalLessonsCount) * 100));
  }, [completedLessonIds.length, totalLessonsCount]);

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

  // Sync authenticated user progress from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    FirestoreService.getUserLessonProgress(user.uid).then((progress) => {
      if (!progress || Object.keys(progress).length === 0) return;
      setStepProgressMap((prev) => {
        const merged = { ...prev };
        Object.entries(progress).forEach(([lid, stepNum]) => {
          merged[lid] = Math.max(merged[lid] || 0, stepNum);
        });
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('checkmate_lesson_steps_v1', JSON.stringify(merged));
          } catch {}
        }
        return merged;
      });

      // Calculate which lessons are fully completed
      const completed: string[] = [];
      LESSON_TRACKS.forEach((track) => {
        track.lessons.forEach((l) => {
          const finishedSteps = progress[l.id] || 0;
          if (finishedSteps >= l.steps.length) {
            completed.push(l.id);
          }
        });
      });
      if (completed.length > 0) {
        setCompletedLessonIds((prev) => {
          const merged = Array.from(new Set([...prev, ...completed]));
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('checkmate_lesson_progress_v1', JSON.stringify(merged));
            } catch {}
          }
          return merged;
        });
      }
    });
  }, [user?.uid]);

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

        // Persist step progress
        const nextStepIdx = currentStepIndex + 1;
        const newStepMap = {
          ...stepProgressMap,
          [selectedLesson.id]: Math.max(stepProgressMap[selectedLesson.id] || 0, nextStepIdx),
        };
        setStepProgressMap(newStepMap);
        if (typeof window !== 'undefined') {
          localStorage.setItem('checkmate_lesson_steps_v1', JSON.stringify(newStepMap));
        }

        if (isLastStep) {
          setStepStatus('completed');
          confetti({ particleCount: 75, spread: 80, origin: { y: 0.6 } });

          // Mark lesson complete
          if (!completedLessonIds.includes(selectedLesson.id)) {
            const nextCompleted = [...completedLessonIds, selectedLesson.id];
            setCompletedLessonIds(nextCompleted);
            if (typeof window !== 'undefined') {
              localStorage.setItem('checkmate_lesson_progress_v1', JSON.stringify(nextCompleted));
            }
          }
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
            FirestoreService.saveLessonProgress(
              user.uid,
              selectedLesson.id,
              isLastStep ? selectedLesson.steps.length : nextStepIdx
            );
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

  const handleNextLesson = () => {
    // Find next lesson in track, or first lesson in next track
    const currentTrackIndex = LESSON_TRACKS.findIndex((t) => t.id === selectedTrack.id);
    const currentLessonIndex = selectedTrack.lessons.findIndex((l) => l.id === selectedLesson.id);

    if (currentLessonIndex < selectedTrack.lessons.length - 1) {
      const nextL = selectedTrack.lessons[currentLessonIndex + 1];
      setSelectedLesson(nextL);
      setCurrentStepIndex(0);
    } else if (currentTrackIndex < LESSON_TRACKS.length - 1) {
      const nextT = LESSON_TRACKS[currentTrackIndex + 1];
      setSelectedTrack(nextT);
      setSelectedLesson(nextT.lessons[0]);
      setCurrentStepIndex(0);
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

  const isCurrentLessonCompleted = completedLessonIds.includes(selectedLesson.id);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 lg:gap-8 items-center lg:items-start justify-center p-1 sm:p-4 select-none">
      {/* Lesson Interactive Chessboard - Scaled smoothly up to 560px on tablet */}
      <div className="w-full max-w-[min(100vw-2rem,_560px)] lg:max-w-[460px] xl:max-w-[500px] 2xl:max-w-[540px] shrink-0 flex flex-col items-center gap-3 mx-auto lg:mx-0">
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
        <div className="w-full bg-[#1a1815] border-2 border-[#35322b] rounded-2xl p-3 flex items-center justify-between text-xs shadow-[0_3px_0_0_#141311]">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#81b64c] border-2 border-[#1a1815]" />
            <span className="font-black text-white">
              Step {step.stepId} of {selectedLesson.steps.length}: {step.title}
            </span>
          </div>
          <div className="flex gap-1.5">
            {selectedLesson.steps.map((s, idx) => (
              <div
                key={s.stepId}
                className={`w-6 h-2 rounded-full border border-black/30 transition-all ${
                  idx < currentStepIndex
                    ? 'bg-[#81b64c]'
                    : idx === currentStepIndex
                    ? 'bg-white shadow-[0_1px_0_0_#999]'
                    : 'bg-[#2b2926]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Coach Dialogue, Instruction & Curriculum Sidebar */}
      <div className="w-full max-w-[min(100vw-2rem,_560px)] lg:w-[400px] xl:w-[440px] shrink-0 min-w-0 flex flex-col gap-4 mx-auto lg:mx-0">
        {/* Active Lesson Card */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl p-5 flex flex-col gap-4 shadow-[0_4px_0_0_#141311]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
                  {selectedTrack.title}
                </span>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>{selectedLesson.title}</span>
                  {isCurrentLessonCompleted && (
                    <span className="text-[10px] bg-[#81b64c]/20 text-[#81b64c] border-2 border-[#81b64c]/40 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                      Mastered
                    </span>
                  )}
                </h2>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full border-2 border-emerald-500/30 flex items-center gap-1 font-mono shadow-[0_1px_0_0_#064e3b]">
              <Clock className="w-3.5 h-3.5" />
              {selectedLesson.durationMinutes} min
            </span>
          </div>

          {/* Coach Commentary Bubble */}
          <div className="bg-[#161512] border-2 border-[#2b2824] rounded-2xl p-3.5 flex gap-3 items-start shadow-inner">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#81b64c] to-[#5d8b32] border-2 border-[#4d7a24] shadow-[0_2px_0_0_#335318] flex items-center justify-center text-xl shrink-0">
              🧑‍🏫
            </div>
            <div className="flex flex-col gap-1 text-xs">
              <span className="font-black text-[#81b64c] uppercase tracking-wider text-[11px]">Coach Analysis</span>
              <p className="text-zinc-300 leading-relaxed font-medium">
                "{stepStatus === 'correct' || stepStatus === 'completed'
                  ? step.explanation
                  : step.instruction}"
              </p>
            </div>
          </div>

          {/* Feedback Status Alert */}
          {stepStatus === 'correct' && (
            <div className="p-3 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-between text-xs text-emerald-300 font-black animate-in fade-in shadow-[0_2px_0_0_#064e3b]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Well played! You found the correct move!</span>
              </div>
              <button
                onClick={handleNextStep}
                className="px-4 py-1.5 rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none transition-all"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {stepStatus === 'completed' && (
            <div className="p-4 bg-emerald-500/20 border-2 border-emerald-500/40 rounded-2xl flex flex-col gap-3 text-xs text-emerald-300 font-black animate-in fade-in shadow-[0_3px_0_0_#064e3b]">
              <div className="flex items-center gap-2 text-sm text-white font-black uppercase tracking-wider">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Lesson Complete! Master Trophy Earned!</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                You've successfully mastered {selectedLesson.title}. Review the key motifs or advance to the next course module!
              </p>
              <button
                onClick={handleNextLesson}
                className="w-full py-2.5 rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all"
              >
                <span>Advance to Next Lesson</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {stepStatus === 'wrong' && (
            <div className="p-3 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl text-xs text-rose-300 font-black animate-in fade-in shadow-[0_2px_0_0_#4c0519]">
              Not quite! That wasn't the principled move. The board is resetting—try again or view the hint!
            </div>
          )}

          {/* Hint Card */}
          {showHint && (
            <div className="p-3.5 bg-[#181614] rounded-2xl border-2 border-amber-500/40 text-xs text-amber-200 leading-relaxed flex items-start gap-2.5 animate-in fade-in shadow-[0_2px_0_0_#78350f]">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-300 mb-0.5 font-black uppercase tracking-wider text-[11px]">Tactical Hint:</strong>
                <span className="font-medium">{step.hint}</span>
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="flex items-center justify-between pt-3 border-t-2 border-[#2d2a26]">
            <button
              onClick={() => loadStep(step)}
              className="px-4 py-2 rounded-full bg-[#282622] hover:bg-[#34312b] text-zinc-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={toggleHint}
              className="px-4 py-2 rounded-full bg-[#282622] hover:bg-[#34312b] text-zinc-300 hover:text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Hint</span>
            </button>
          </div>
        </div>

        {/* Curriculum Tracks Directory Drawer */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl p-4 flex flex-col gap-3 shadow-[0_4px_0_0_#141311]">
          {/* Progress Header */}
          <div className="flex flex-col gap-2 pb-3 border-b-2 border-[#2d2a26]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#81b64c]" />
                Curriculum Progress
              </span>
              <span className="text-xs font-mono font-black text-[#81b64c]">
                {completedLessonIds.length} / {totalLessonsCount} ({overallPercent}%)
              </span>
            </div>
            <div className="w-full bg-[#141311] h-3 rounded-full overflow-hidden border-2 border-[#2b2824] p-0.5 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#81b64c] to-[#a3d865] h-full transition-all duration-500 rounded-full shadow"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Track:</span>
            <div className="flex gap-1.5">
              {LESSON_TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTrack(t);
                    setSelectedLesson(t.lessons[0]);
                    setCurrentStepIndex(0);
                  }}
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-2 ${
                    selectedTrack.id === t.id
                      ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                      : 'bg-[#161512] text-zinc-400 border-[#2d2a26] shadow-[0_2px_0_0_#141311] hover:text-white'
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
              const isDone = completedLessonIds.includes(les.id);
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
                  <div className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-[#81b64c] shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">{les.title}</span>
                      <span className="text-[11px] text-zinc-400 line-clamp-1">{les.subtitle}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
