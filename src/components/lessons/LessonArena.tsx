'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { LESSON_TRACKS, ChessLesson, LessonStep, LessonTrack } from '@/lib/lessonsData';
import { BoardTheme, PieceTheme, ArrowAnnotation, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Clock,
  BookOpen,
  Award,
  Crown,
  Target,
  Shield,
  Compass,
  Layers,
  Flame,
  Zap,
  Check,
  Lock,
  Play,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type LessonScreen = 'study' | 'curriculum' | 'learning_path' | 'diplomas';

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { profile: xpProfile, awardXp } = useXpSystem();

  // Tab detection from URL query params
  const tabQuery = searchParams?.get('tab');
  const initialScreen: LessonScreen = useMemo(() => {
    if (tabQuery === 'curriculum' || tabQuery === 'tracks') return 'curriculum';
    if (tabQuery === 'path' || tabQuery === 'roadmap') return 'learning_path';
    if (tabQuery === 'diplomas' || tabQuery === 'certificates') return 'diplomas';
    return 'study';
  }, [tabQuery]);

  const [activeScreen, setActiveScreen] = useState<LessonScreen>(initialScreen);
  const [selectedTrack, setSelectedTrack] = useState<LessonTrack>(LESSON_TRACKS[0]);
  const [selectedLesson, setSelectedLesson] = useState<ChessLesson>(LESSON_TRACKS[0].lessons[0]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Persistent progress in localStorage
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([]);
  const [stepProgressMap, setStepProgressMap] = useState<Record<string, number>>({});
  const [isMounted, setIsMounted] = useState(false);

  // Sync tab query changes
  useEffect(() => {
    if (tabQuery === 'curriculum') setActiveScreen('curriculum');
    else if (tabQuery === 'path') setActiveScreen('learning_path');
    else if (tabQuery === 'diplomas') setActiveScreen('diplomas');
    else if (tabQuery === 'study') setActiveScreen('study');
  }, [tabQuery]);

  // Load localStorage progress safely on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedLessons = localStorage.getItem('checkmate_lesson_progress_v1');
      if (savedLessons) setCompletedLessonIds(JSON.parse(savedLessons));
      const savedSteps = localStorage.getItem('checkmate_lesson_steps_v1');
      if (savedSteps) setStepProgressMap(JSON.parse(savedSteps));
    } catch {}
  }, []);

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

        if (isLastStep) {
          setStepStatus('completed');
          awardXp(50, `Completed Lesson: ${selectedLesson.title}`);
          try {
            confetti({ particleCount: 55, spread: 70, origin: { y: 0.6 } });
          } catch {}

          setCompletedLessonIds((prev) => {
            if (prev.includes(selectedLesson.id)) return prev;
            const updated = [...prev, selectedLesson.id];
            try {
              localStorage.setItem('checkmate_lesson_progress_v1', JSON.stringify(updated));
            } catch {}
            return updated;
          });
        } else {
          setStepStatus('correct');
          awardXp(15, `Completed Step: ${step.title}`);
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
          color: '#10b981',
        },
      ]);
    }
  };

  const isCurrentLessonCompleted = completedLessonIds.includes(selectedLesson.id);

  const handleSelectLesson = (lesson: ChessLesson, track: LessonTrack) => {
    setSelectedTrack(track);
    setSelectedLesson(lesson);
    setCurrentStepIndex(0);
    setActiveScreen('study');
  };

  // Diplomas / Track completions calculations
  const trackStats = useMemo(() => {
    return LESSON_TRACKS.map((t) => {
      const total = t.lessons.length;
      const completed = t.lessons.filter((l) => completedLessonIds.includes(l.id)).length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        track: t,
        total,
        completed,
        percent: pct,
        isGraduated: completed === total && total > 0,
      };
    });
  }, [completedLessonIds]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between gap-2.5 min-h-0 select-none text-zinc-100">
      {/* ========================================================================= */}
      {/* 1. SEGMENTED SUB-SCREEN SWITCHER ("Screens, Not Pages" Architecture)       */}
      {/* ========================================================================= */}
      <nav className="shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => {
              soundService.playTactilePop();
              setActiveScreen('study');
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'study'
                ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Interactive Board</span>
            <span className="sm:hidden">Board</span>
          </button>

          <button
            onClick={() => {
              soundService.playTactilePop();
              setActiveScreen('curriculum');
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'curriculum'
                ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Full Curriculum ({totalLessonsCount})</span>
            <span className="sm:hidden">Curriculum</span>
          </button>

          <button
            onClick={() => {
              soundService.playTactilePop();
              setActiveScreen('learning_path');
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'learning_path'
                ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Learning Road</span>
            <span className="sm:hidden">Road</span>
          </button>

          <button
            onClick={() => {
              soundService.playTactilePop();
              setActiveScreen('diplomas');
            }}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'diplomas'
                ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Diplomas &amp; Vault</span>
            <span className="sm:hidden">Diplomas</span>
          </button>
        </div>

        {/* Right Ambient Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="text-emerald-400 font-black">{overallPercent}%</span>
          <span>Curriculum Mastered</span>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. SUB-SCREEN 1: INTERACTIVE STUDY BOARD                                  */}
      {/* ========================================================================= */}
      {activeScreen === 'study' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
          {/* Top Active Lesson Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                    {selectedTrack.title}
                  </span>
                  {isCurrentLessonCompleted && (
                    <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Mastered
                    </span>
                  )}
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  {selectedLesson.title}
                </h2>
              </div>
            </div>

            {/* Step Stepper & Duration */}
            <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
              <span className="text-[11px] font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-xl border border-white/5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{selectedLesson.durationMinutes}m</span>
              </span>

              <div className="flex items-center gap-1 bg-[#141311] px-2.5 py-1 rounded-xl border border-white/5">
                <span className="text-xs font-mono font-bold text-white">
                  Step {step.stepId} / {selectedLesson.steps.length}
                </span>
              </div>
            </div>
          </div>

          {/* Dual Column Stage: Board Left, Coach & Controls Right */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
            {/* Left Column (7 Cols): Scaled Interactive Board */}
            <div className="lg:col-span-7 h-full flex flex-col items-center justify-center min-h-0 gap-2">
              <div className="h-full max-h-[360px] sm:max-h-[400px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1c1a17]">
                <ChessBoard
                  chess={chess}
                  orientation="w"
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleBoardMove}
                  customArrows={customArrows}
                  disabled={stepStatus === 'correct' || stepStatus === 'completed'}
                />

                {stepStatus === 'completed' && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-500/95 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Lesson Mastered (+50 XP)</span>
                  </div>
                )}
              </div>

              {/* Progress Steps Dots */}
              <div className="flex items-center gap-1.5 py-0.5">
                {selectedLesson.steps.map((s, idx) => (
                  <div
                    key={s.stepId}
                    className={`h-1.5 rounded-full transition-all ${
                      idx < currentStepIndex
                        ? 'w-6 bg-emerald-500'
                        : idx === currentStepIndex
                        ? 'w-8 bg-white'
                        : 'w-4 bg-[#2b2926]'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Right Column (5 Cols): Coach Commentary & P1 Action Anchor */}
            <div className="lg:col-span-5 h-full max-h-[420px] p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-1">
                {/* Step Subtitle */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Step {step.stepId}: {step.title}
                  </span>
                  <p className="text-xs sm:text-sm font-extrabold text-white mt-0.5 leading-snug">
                    {step.instruction}
                  </p>
                </div>

                {/* Coach Analysis Card */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Coach Danny Rensch</span>
                  </div>
                  <p>
                    {stepStatus === 'wrong'
                      ? 'Not quite! That wasn’t the principled move. Board is resetting—try again or view the hint.'
                      : stepStatus === 'correct' || stepStatus === 'completed'
                      ? step.explanation
                      : `"${selectedLesson.coachIntro}"`}
                  </p>
                </div>

                {/* Hint Card if toggled */}
                {showHint && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 leading-relaxed flex items-start gap-2 animate-in fade-in">
                    <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-300 font-bold text-[11px] uppercase">
                        Tactical Clue:
                      </strong>
                      <span>{step.hint}</span>
                    </div>
                  </div>
                )}

                {/* Controls: Reset & Hint */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="xl"
                    onClick={() => loadStep(step)}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Step</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="xl"
                    onClick={toggleHint}
                    className={showHint ? 'text-amber-400 border-amber-500/40' : ''}
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                    <span>{showHint ? 'Hint Active' : 'Show Hint'}</span>
                  </Button>
                </div>
              </div>

              {/* Bottom Actions: EXACTLY ONE P1 PRIMARY ANCHOR */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
                {stepStatus === 'correct' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={handleNextStep}
                  >
                    <CheckCircle2 className="w-4 h-4 fill-black" />
                    <span>Advance to Next Step (+25 XP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : stepStatus === 'completed' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={handleNextLesson}
                  >
                    <Award className="w-4 h-4 fill-black" />
                    <span>Advance to Next Lesson (+50 XP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={toggleHint}
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Reveal Tactical Hint &amp; Arrows</span>
                  </Button>
                )}

                {/* Secondary P2 Action: Browse Full Curriculum */}
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  fullWidth
                  onClick={() => setActiveScreen('curriculum')}
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Browse All Curriculum Tracks ({totalLessonsCount})</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-SCREEN 2: FULL CURRICULUM & TRACKS                                 */}
      {/* ========================================================================= */}
      {activeScreen === 'curriculum' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
          {/* Top Progress & Track Picker */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Grandmaster Curriculum Tracks
                </h2>
                <p className="text-[11px] text-zinc-400">
                  {completedLessonIds.length} of {totalLessonsCount} lessons mastered ({overallPercent}%)
                </p>
              </div>
            </div>

            {/* Track Switcher Pills */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {LESSON_TRACKS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    soundService.playTactilePop();
                    setSelectedTrack(t);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    selectedTrack.id === t.id
                      ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                      : 'bg-[#141311] text-zinc-400 hover:text-white border border-white/5'
                  }`}
                >
                  <span className="capitalize">{t.difficulty}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lessons Grid in Selected Track */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            {selectedTrack.lessons.map((les, idx) => {
              const isDone = completedLessonIds.includes(les.id);
              const isCurrent = selectedLesson.id === les.id;

              return (
                <div
                  key={les.id}
                  className={`p-4 rounded-2xl bg-[#1c1a17] border flex flex-col justify-between gap-3 transition-all ${
                    isCurrent
                      ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/30'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-zinc-500 font-bold">
                        LESSON {idx + 1}
                      </span>
                      {isDone ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          <span>Completed</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-2 py-0.5 rounded-full">
                          {les.steps.length} Steps
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        {les.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed line-clamp-2">
                        {les.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 mt-1">
                      <Clock className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{les.durationMinutes} mins</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">+50 XP</span>
                    </div>
                  </div>

                  <Button
                    variant={isCurrent ? 'primary' : 'secondary'}
                    size="sm"
                    rounded="xl"
                    fullWidth
                    onClick={() => handleSelectLesson(les, selectedTrack)}
                  >
                    <span>{isDone ? 'Review Lesson' : isCurrent ? 'Continue Study' : 'Start Lesson'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">
                Ready to study? Jump into active lesson: <strong className="text-white">{selectedLesson.title}</strong>
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => setActiveScreen('study')}
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Resume Active Study Board</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-SCREEN 3: GAMIFIED LEARNING ROAD                                   */}
      {/* ========================================================================= */}
      {activeScreen === 'learning_path' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
          {/* Top HUD: Road Stats */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Gamified Quest Road
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Step-by-step chess mastery trail with bonus XP chests
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center font-mono text-[11px]">
              <span className="text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                🔥 Streak: {xpProfile.streak}d
              </span>
              <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                ⚡ Total: {xpProfile.totalXp} XP
              </span>
            </div>
          </div>

          {/* Stepped Road Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            {/* Stage 1: Fundamentals Trail */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Stage 1: Fundamentals
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">+120 XP</span>
                </div>
                <h3 className="text-sm font-black text-white">Board Control &amp; Piece Mobility</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Learn to claim open files, coordinate minor pieces, and tuck your king to safety before initiating attacks.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>4 Checkpoint Modules Complete</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => {
                  setSelectedTrack(LESSON_TRACKS[0]);
                  setSelectedLesson(LESSON_TRACKS[0].lessons[0]);
                  setActiveScreen('study');
                }}
              >
                <span>Drill Stage 1</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </Button>
            </div>

            {/* Stage 2: Tactical Combos */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    Stage 2: Tactical Radar
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">+150 XP</span>
                </div>
                <h3 className="text-sm font-black text-white">Pins, Forks &amp; Back-Rank Blasts</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Train your subconscious to instantly spot absolute pins, knight family forks, and back-rank checkmates.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1">
                  <Target className="w-3.5 h-3.5 text-amber-400" />
                  <span>3 Quests Ready</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/puzzles')}
              >
                <span>Launch Tactics Quest</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </Button>
            </div>

            {/* Stage 3: Endgame Precision */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    Stage 3: Endgame Mastery
                  </span>
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">+180 XP</span>
                </div>
                <h3 className="text-sm font-black text-white">Lucena, Philidor &amp; King Opposition</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Convert decisive advantages in king-and-pawn endings and build the unbreakable Lucena rook bridge.
                </p>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1">
                  <Crown className="w-3.5 h-3.5 text-purple-400" />
                  <span>Theoretical Endgame Lab</span>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/endgames')}
              >
                <span>Enter Endgame Study</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
              </Button>
            </div>
          </div>

          {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-200">
                Continue your daily learning streak with the next checkpoint drill.
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => router.push('/puzzles')}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Continue Quest Trail (+30 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-SCREEN 4: DIPLOMAS & GRADUATION VAULT                              */}
      {/* ========================================================================= */}
      {activeScreen === 'diplomas' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto xl:overflow-hidden animate-in fade-in duration-150">
          {/* Top HUD */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Check.mate Academy Diplomas
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Official certificates awarded upon completing curriculum milestones
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center font-mono text-[11px]">
              <span className="text-zinc-400">Graduation Status:</span>
              <span className="text-emerald-400 font-black">
                {trackStats.filter((t) => t.isGraduated).length} of {trackStats.length} Diplomas
              </span>
            </div>
          </div>

          {/* 3 Diplomas Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            {trackStats.map((stat, idx) => {
              const badgeColor =
                idx === 0
                  ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                  : idx === 1
                  ? 'text-amber-400 bg-amber-500/15 border-amber-500/30'
                  : 'text-purple-400 bg-purple-500/15 border-purple-500/30';

              return (
                <div
                  key={stat.track.id}
                  className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 shadow-md"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeColor}`}>
                        Level {idx + 1} Certificate
                      </span>
                      {stat.isGraduated ? (
                        <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Graduated
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-400">
                          {stat.completed}/{stat.total} Done
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        {stat.track.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {stat.track.description}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <span>Milestone Progress</span>
                        <span className="text-emerald-400 font-bold">{stat.percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                          style={{ width: `${stat.percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    fullWidth
                    onClick={() => {
                      setSelectedTrack(stat.track);
                      setSelectedLesson(stat.track.lessons[0]);
                      setActiveScreen('study');
                    }}
                  >
                    <span>{stat.isGraduated ? 'View Diploma' : 'Complete Requirements'}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-zinc-200">
                Unlock official Grandmaster diplomas by completing the curriculum tracks.
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => setActiveScreen('study')}
            >
              <FileCheck className="w-4 h-4 fill-black" />
              <span>Continue Academy Curriculum (+50 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
