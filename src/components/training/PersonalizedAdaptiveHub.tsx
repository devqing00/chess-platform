'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import {
  analyzeUserChessDna,
  PersonalizedTrainingPlan,
  BlunderSideQuestItem,
  BlunderDensitySquare,
} from '@/lib/server/personalizedTrainer';
import {
  Brain,
  Zap,
  Target,
  Shield,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Award,
  Crown,
  BookOpen,
  Compass,
  GraduationCap,
  Grid,
  BarChart3,
  Flame,
  Check,
  Layers,
  Activity,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TrainingScreen = 'blunders' | 'curriculum' | 'dna' | 'pillars';

export const PersonalizedAdaptiveHub: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile: userProfile, effectiveDisplayName, effectiveRating } = useAuth();
  const { boardTheme, pieceTheme } = useShell();
  const { profile: xpProfile, awardXp } = useXpSystem();

  // Query parameter tab detection (e.g. ?tab=dna from /insights redirect)
  const tabQuery = searchParams?.get('tab');
  const initialScreen: TrainingScreen = useMemo(() => {
    if (tabQuery === 'dna' || tabQuery === 'cognitive') return 'dna';
    if (tabQuery === 'curriculum' || tabQuery === 'quests') return 'curriculum';
    if (tabQuery === 'pillars' || tabQuery === 'vault') return 'pillars';
    return 'blunders';
  }, [tabQuery]);

  const [activeScreen, setActiveScreen] = useState<TrainingScreen>(initialScreen);
  const [repairedQuestIds, setRepairedQuestIds] = useState<string[]>([]);
  const [selectedQuestIndex, setSelectedQuestIndex] = useState<number>(0);
  const [selectedHotspotSquare, setSelectedHotspotSquare] = useState<string>('f7');
  const [isMounted, setIsMounted] = useState(false);

  // Load repaired quest IDs safely on mount
  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('chess_repaired_blunder_quests_v1');
      if (stored) {
        setRepairedQuestIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load repaired blunder quests:', e);
    }
  }, []);

  // Sync tabQuery changes if query param changes dynamically
  useEffect(() => {
    if (tabQuery === 'dna' || tabQuery === 'cognitive') setActiveScreen('dna');
    else if (tabQuery === 'curriculum' || tabQuery === 'quests') setActiveScreen('curriculum');
    else if (tabQuery === 'pillars' || tabQuery === 'vault') setActiveScreen('pillars');
    else if (tabQuery === 'blunders') setActiveScreen('blunders');
  }, [tabQuery]);

  const markQuestAsRepaired = useCallback(
    (questId: string, xpReward: number, motif: string) => {
      setRepairedQuestIds((prev) => {
        if (prev.includes(questId)) return prev;
        const updated = [...prev, questId];
        try {
          localStorage.setItem('chess_repaired_blunder_quests_v1', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save repaired blunder quests:', e);
        }
        return updated;
      });

      awardXp(xpReward, `Repaired Blunder: ${motif}`);

      try {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.65 },
        });
      } catch {}
    },
    [awardXp]
  );

  // Compute dynamic personalized plan from real match sessions
  const plan: PersonalizedTrainingPlan = useMemo(() => {
    const sessions = GameSessionStore.listRecentSessions();
    return analyzeUserChessDna(userProfile, sessions);
  }, [userProfile]);

  // Active blunder side quest state
  const activeQuest: BlunderSideQuestItem | undefined =
    plan.blunderSideQuests[selectedQuestIndex] || plan.blunderSideQuests[0];

  const [questChess, setQuestChess] = useState<Chess>(() => {
    return new Chess(
      activeQuest
        ? activeQuest.fenBefore
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQK2R w KQkq - 0 1'
    );
  });
  const [questStatus, setQuestStatus] = useState<'idle' | 'solved' | 'failed'>('idle');
  const [questFeedback, setQuestFeedback] = useState<string>('');

  useEffect(() => {
    if (activeQuest) {
      setQuestChess(new Chess(activeQuest.fenBefore));
      const alreadySolved = repairedQuestIds.includes(activeQuest.id);
      setQuestStatus(alreadySolved ? 'solved' : 'idle');
      setQuestFeedback(
        alreadySolved
          ? '✓ Previously mastered! Play the refutation again to reinforce tactical muscle memory.'
          : `You played ${activeQuest.blunderedSan}. Find the tactical refutation that punishes this position!`
      );
    }
  }, [activeQuest, repairedQuestIds]);

  const handleQuestMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!activeQuest || questStatus === 'solved') return;
    try {
      const copy = new Chess(questChess.fen());
      const move = copy.move({
        from,
        to,
        promotion: promotion || 'q',
      });
      if (!move) return;

      const isRefutation =
        move.san.toLowerCase() === activeQuest.bestMoveSan.toLowerCase();

      if (isRefutation) {
        setQuestChess(copy);
        setQuestStatus('solved');
        soundService.playGameEndWin();
        markQuestAsRepaired(activeQuest.id, activeQuest.xpReward, activeQuest.motif);
        setQuestFeedback(
          `Mastered! ${move.san} correctly refutes the blunder. Coach insight: ${activeQuest.explanation}`
        );
      } else {
        soundService.playGameEndLoss();
        setQuestStatus('failed');
        setQuestFeedback(
          `Not quite. ${move.san} doesn't address the tactical motif (${activeQuest.motif}). Try again!`
        );
      }
    } catch (err) {
      console.warn('Move error:', err);
    }
  };

  const handleResetQuest = () => {
    if (activeQuest) {
      setQuestChess(new Chess(activeQuest.fenBefore));
      setQuestStatus('idle');
      setQuestFeedback(`Board reset. Find the refutation for ${activeQuest.blunderedSan}.`);
    }
  };

  const questsCount = plan.blunderSideQuests.length;

  // Selected hotspot square details
  const activeHotspot = useMemo(() => {
    return plan.blunderDensitySquares.find((b) => b.square === selectedHotspotSquare);
  }, [plan.blunderDensitySquares, selectedHotspotSquare]);

  return (
    <div className="w-full flex-1 flex flex-col justify-between gap-2.5 min-h-0 select-none text-zinc-100">
      {/* ========================================================================= */}
      {/* 1. SEGMENTED SUB-SCREEN SWITCHER ("Screens, Not Pages" Architecture)       */}
      {/* ========================================================================= */}
      <nav className="shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none w-full sm:w-auto">
          <button
            onClick={() => setActiveScreen('blunders')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'blunders'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Blunder Lab</span>
            <span className="sm:hidden">Blunders</span>
          </button>

          <button
            onClick={() => setActiveScreen('curriculum')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'curriculum'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daily Curriculum</span>
            <span className="sm:hidden">Curriculum</span>
          </button>

          <button
            onClick={() => setActiveScreen('dna')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'dna'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chess DNA &amp; Hotspots</span>
            <span className="sm:hidden">DNA</span>
          </button>

          <button
            onClick={() => setActiveScreen('pillars')}
            className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'pillars'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mastery Pillars</span>
            <span className="sm:hidden">Pillars</span>
          </button>
        </div>

        {/* Right Ambient Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          <span>Real-Match Engine Telemetry</span>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. SUB-SCREEN 1: BLUNDER REPAIR LAB                                       */}
      {/* ========================================================================= */}
      {activeScreen === 'blunders' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Top HUD: Leak Verdict Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
                    Primary Tactical Leak Detected
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400 font-bold">
                    {plan.cognitiveProfile.archetype}
                  </span>
                </div>
                <p className="text-xs text-zinc-200 font-medium truncate max-w-xl">
                  {plan.phaseDiagnoses.middlegame.criticalLeak ||
                    'Over-pressing tactical attacks without securing king defense.'}
                </p>
              </div>
            </div>

            {/* Blunder Stepper Controls */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => setSelectedQuestIndex((prev) => (prev > 0 ? prev - 1 : questsCount - 1))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Previous Blunder"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono font-bold text-zinc-400 px-1">
                Blunder {selectedQuestIndex + 1} of {questsCount}
              </span>
              <button
                onClick={() => setSelectedQuestIndex((prev) => (prev < questsCount - 1 ? prev + 1 : 0))}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition cursor-pointer"
                title="Next Blunder"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Dual-Pane Cognitive Lab (Board Left, Coach & Action Right) */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
            {/* Left Column (7 Cols): Forensic Chessboard */}
            <div className="lg:col-span-7 h-full flex items-center justify-center min-h-0">
              <div className="h-full max-h-[380px] sm:max-h-[420px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1c1a17]">
                <ChessBoard
                  chess={questChess}
                  orientation={activeQuest?.turnColor || 'w'}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleQuestMove}
                  disabled={questStatus === 'solved'}
                />
                {questStatus === 'solved' && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-500/95 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Refutation Solved (+35 XP)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (5 Cols): Coach Commentary & P1 Action Anchor */}
            <div className="lg:col-span-5 h-full max-h-[420px] p-4 sm:p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Motif: {activeQuest?.motif || 'Tactical Slip'}</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-[#81b64c] bg-[#81b64c]/10 px-2 py-0.5 rounded-full border border-[#81b64c]/20">
                    +{activeQuest?.xpReward || 35} XP
                  </span>
                </div>

                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-white">
                    Real Match Inaccuracy #{selectedQuestIndex + 1}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    In game <span className="font-mono text-zinc-300">#{activeQuest?.gameId.slice(0, 8)}</span>, you played <strong className="text-rose-400 font-mono">{activeQuest?.blunderedSan}</strong>.
                  </p>
                </div>

                {/* Coach Danny Commentary */}
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5 text-[#81b64c] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Coach Danny Rensch</span>
                  </div>
                  <p>{questFeedback || activeQuest?.explanation}</p>
                </div>

                {/* Secondary Action: Reset Board */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="xl"
                    onClick={handleResetQuest}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Position</span>
                  </Button>
                </div>
              </div>

              {/* Bottom Actions: EXACTLY ONE P1 PRIMARY ANCHOR */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
                {questStatus === 'solved' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={() => {
                      setSelectedQuestIndex((prev) => (prev < questsCount - 1 ? prev + 1 : 0));
                    }}
                  >
                    <CheckCircle2 className="w-4 h-4 fill-black" />
                    <span>Next Blunder Refutation (+35 XP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={() => router.push('/puzzles')}
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Launch 5 Prescribed Tactical Drills (+40 XP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                {/* P2 Secondary Action: Jump to Hotspot Matrix */}
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  fullWidth
                  onClick={() => setActiveScreen('dna')}
                >
                  <Grid className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Inspect 64-Square Blunder Hotspots &amp; Biases</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-SCREEN 2: DAILY CURRICULUM & MISSIONS                              */}
      {/* ========================================================================= */}
      {activeScreen === 'curriculum' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Top HUD: Curriculum Progress */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 flex items-center justify-center text-[#81b64c] shrink-0">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Personalized Daily Regimen
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Targeted missions derived from your recent engine blunders &amp; tactical leaks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <span className="text-[11px] font-mono text-[#81b64c] bg-[#81b64c]/10 border border-[#81b64c]/20 px-2.5 py-1 rounded-xl font-bold">
                Daily Pool: +135 XP
              </span>
              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl font-bold">
                Streak: {xpProfile.streak}d
              </span>
            </div>
          </div>

          {/* 3 Phase Missions Grid */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            {plan.dailyMissions.map((mission, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const phaseBadge =
                mission.phase === 'openings'
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : mission.phase === 'middlegame'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : 'bg-purple-500/15 text-purple-400 border-purple-500/30';

              return (
                <div
                  key={mission.id}
                  className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 shadow-md hover:border-white/10 transition-all"
                >
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${phaseBadge}`}>
                        {mission.phase}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-[#81b64c]">
                        +{mission.xpReward} XP
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-extrabold text-white">
                        {mission.title}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        {mission.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-1">
                      <span>Est. {mission.estimatedMinutes} mins</span>
                      <span>•</span>
                      <span className="capitalize">{mission.difficulty}</span>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    fullWidth
                    onClick={() => router.push(mission.actionRoute)}
                  >
                    <span>Start {mission.phase} Drill</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#81b64c]" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-[#81b64c]" />
              <span className="text-xs font-bold text-zinc-200">
                Ready for today&apos;s primary challenge? Tackle your biggest middlegame blindspot.
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => router.push('/puzzles')}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Launch Tactical Threat Radar (+50 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-SCREEN 3: CHESS DNA & 64-SQUARE HOTSPOTS                           */}
      {/* ========================================================================= */}
      {activeScreen === 'dna' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Top Archetype Banner */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                    Psychological Archetype
                  </span>
                  <span className="text-xs font-bold text-white bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                    {plan.cognitiveProfile.archetype}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 max-w-xl">
                  {plan.cognitiveProfile.archetypeDescription}
                </p>
              </div>
            </div>

            {/* Radar Quick Stats */}
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
              <div className="px-2.5 py-1 rounded-xl bg-[#141311] border border-white/5">
                <span className="text-zinc-400">Aggression: </span>
                <span className="text-amber-400 font-bold">{plan.cognitiveProfile.aggressivenessScore}%</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-[#141311] border border-white/5">
                <span className="text-zinc-400">Tactics: </span>
                <span className="text-emerald-400 font-bold">{plan.cognitiveProfile.tacticalRadarScore}%</span>
              </div>
              <div className="px-2.5 py-1 rounded-xl bg-[#141311] border border-white/5">
                <span className="text-zinc-400">Endgame: </span>
                <span className="text-purple-400 font-bold">{plan.cognitiveProfile.endgamePrecisionScore}%</span>
              </div>
            </div>
          </div>

          {/* Main Dual Columns: 8x8 Hotspot Matrix Left, Biases & Balance Right */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Left Column (6 Cols): 64-Square Interactive Hotspot Grid */}
            <div className="lg:col-span-6 p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>64-Square Blunder Density Matrix</span>
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-mono">Click any square to inspect</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Highlighted coordinates indicate repeated blunder destination squares in your matches.
                </p>
              </div>

              {/* 8x8 Matrix Display */}
              <div className="p-3 bg-[#141311] rounded-2xl border border-white/10 flex flex-col items-center justify-center my-auto">
                <div className="grid grid-cols-8 gap-1 w-full max-w-[280px] sm:max-w-[310px] aspect-square">
                  {['8', '7', '6', '5', '4', '3', '2', '1'].map((rank) =>
                    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => {
                      const sq = `${file}${rank}`;
                      const target = plan.blunderDensitySquares.find((b) => b.square === sq);
                      const count = target ? target.blunders : 0;
                      const isDark = (file.charCodeAt(0) + parseInt(rank)) % 2 === 0;
                      const hasBlunders = count > 0;
                      const isSelected = selectedHotspotSquare === sq;

                      return (
                        <button
                          key={sq}
                          onClick={() => setSelectedHotspotSquare(sq)}
                          className={`relative rounded-md flex items-center justify-center text-[10px] font-mono transition-all cursor-pointer ${
                            isSelected
                              ? 'ring-2 ring-[#81b64c] z-10 scale-105'
                              : ''
                          } ${
                            hasBlunders
                              ? count >= 3
                                ? 'bg-rose-600/40 border border-rose-500 text-rose-200 font-bold'
                                : 'bg-amber-600/30 border border-amber-500/60 text-amber-200 font-semibold'
                              : isDark
                              ? 'bg-[#262420] text-zinc-600 hover:bg-[#2e2b26]'
                              : 'bg-[#35322c] text-zinc-500 hover:bg-[#3f3b33]'
                          }`}
                          title={`${sq}: ${count} blunder(s)`}
                        >
                          {count > 0 ? count : sq}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Square Inspector Pill */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-white uppercase bg-black/40 px-2 py-0.5 rounded-lg border border-white/10">
                    {selectedHotspotSquare}
                  </span>
                  <span className="text-xs text-zinc-300 font-medium">
                    {activeHotspot
                      ? `${activeHotspot.blunders} blunders recorded • ${activeHotspot.theme}`
                      : 'Clean tactical square • No recent blunder concentrations'}
                  </span>
                </div>

                {activeHotspot && (
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    activeHotspot.dangerLevel === 'critical'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {activeHotspot.dangerLevel}
                  </span>
                )}
              </div>
            </div>

            {/* Right Column (6 Cols): Biases & Phase Balance */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-3 min-h-0">
              {/* Identified Cognitive Biases */}
              <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Identified Cognitive Biases</span>
                </h3>
                <div className="flex flex-col gap-2">
                  {plan.cognitiveProfile.cognitiveBiases.map((bias, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-300 leading-relaxed font-medium flex items-start gap-2"
                    >
                      <span className="text-amber-400 font-bold shrink-0 mt-0.5">⚠</span>
                      <span>{bias}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Phase Accuracy Balance */}
              <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Phase Accuracy Balance</span>
                </h3>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Openings</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {plan.phaseDiagnoses.openings.score}%
                    </span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">
                      {plan.phaseDiagnoses.openings.grade}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Middlegame</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      {plan.phaseDiagnoses.middlegame.score}%
                    </span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">
                      {plan.phaseDiagnoses.middlegame.grade}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-black/20 border border-white/5">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Endgames</span>
                    <span className="font-mono font-bold text-purple-400 text-sm">
                      {plan.phaseDiagnoses.endgames.score}%
                    </span>
                    <span className="block text-[10px] text-zinc-500 mt-0.5">
                      {plan.phaseDiagnoses.endgames.grade}
                    </span>
                  </div>
                </div>
              </div>

              {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
              <Button
                variant="primary"
                size="lg"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/puzzles')}
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Drill Weakest Hotspot: {selectedHotspotSquare} Deflections (+35 XP)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-SCREEN 4: MASTERY VAULT & PILLARS                                  */}
      {/* ========================================================================= */}
      {activeScreen === 'pillars' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Top HUD: Mastery Overview */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 flex items-center justify-center text-[#81b64c] shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Check.mate Training Pillars
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Four interconnected disciplines to systematically elevate your competitive rating
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center font-mono text-[11px]">
              <span className="text-zinc-400">Overall Mastery:</span>
              <span className="text-[#81b64c] font-black">{plan.overallProgressScore}%</span>
            </div>
          </div>

          {/* 4 Pillars Grid (2x2) */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* Pillar 1: Tactics Arena */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 hover:border-white/10 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white">Tactics Arena</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#81b64c] font-bold bg-[#81b64c]/10 px-2 py-0.5 rounded-full">
                    +30 XP / puzzle
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Rapid pattern recognition covering smothered checkmates, absolute pins, knight forks, and skewers.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/puzzles')}
              >
                <span>Enter Tactics Arena</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#81b64c]" />
              </Button>
            </div>

            {/* Pillar 2: Opening Repertoire */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 hover:border-white/10 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <Compass className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white">Opening Repertoire</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#81b64c] font-bold bg-[#81b64c]/10 px-2 py-0.5 rounded-full">
                    +40 XP / line
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Master ECO opening trees, Sicilian defenses, Ruy Lopez variations, and GM move win rates.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/openings')}
              >
                <span>Explore Opening Lines</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
              </Button>
            </div>

            {/* Pillar 3: Endgame Studies */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 hover:border-white/10 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                      <Crown className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white">Endgame Studies</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#81b64c] font-bold bg-[#81b64c]/10 px-2 py-0.5 rounded-full">
                    +45 XP / study
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Theoretical conversions including Lucena position, Philidor defense, rook endings, and king opposition.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/endgames')}
              >
                <span>Study Theoretical Endgames</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
              </Button>
            </div>

            {/* Pillar 4: Guided Lessons */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 hover:border-white/10 transition-all">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-black text-white">Interactive Lessons</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#81b64c] font-bold bg-[#81b64c]/10 px-2 py-0.5 rounded-full">
                    +50 XP / lesson
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Curated grandmaster curriculums taking you from beginner principles to master-level positional thinking.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => router.push('/lessons')}
              >
                <span>Browse Lesson Courses</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
              </Button>
            </div>
          </div>

          {/* EXACTLY ONE P1 PRIMARY ANCHOR */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-zinc-200">
                Warm up your tactical radar with instant adaptive puzzles.
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => router.push('/puzzles')}
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Launch Tactical Puzzle Rush (+30 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
