'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  PersonalizedMission,
} from '@/lib/server/personalizedTrainer';
import {
  Brain,
  Zap,
  Target,
  Shield,
  Crosshair,
  Flame,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Crown,
  BookOpen,
  Puzzle,
  ChevronRight,
  Play,
  Compass,
  Trophy,
  Award,
  Eye,
  Info,
  Clock,
  Layers,
} from 'lucide-react';

interface PersonalizedAdaptiveHubProps {
  initialSubTab?: 'dna' | 'missions' | 'blunders';
}

export const PersonalizedAdaptiveHub: React.FC<PersonalizedAdaptiveHubProps> = ({
  initialSubTab = 'dna',
}) => {
  const router = useRouter();
  const { profile, effectiveDisplayName, effectiveRating, user } = useAuth();
  const { boardTheme, pieceTheme } = useShell();
  const { awardXp } = useXpSystem();

  const [activeTab, setActiveTab] = useState<'dna' | 'missions' | 'blunders'>(initialSubTab);
  const [repairedQuestIds, setRepairedQuestIds] = useState<string[]>([]);
  const [selectedQuestIndex, setSelectedQuestIndex] = useState<number>(0);

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Load repaired quest IDs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chess_repaired_blunder_quests_v1');
      if (stored) {
        setRepairedQuestIds(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load repaired blunder quests:', e);
    }
  }, []);

  // Save repaired quest IDs
  const markQuestAsRepaired = useCallback((questId: string, xpReward: number, motif: string) => {
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
        particleCount: 45,
        spread: 60,
        origin: { y: 0.65 },
      });
    } catch {}
  }, [awardXp]);

  // Read stored game sessions
  const [sessions, setSessions] = useState<any[]>([]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const recents = GameSessionStore.listRecentSessions();
      setSessions(recents);
    }
  }, []);

  // Synthesize dynamic chess plan
  const plan: PersonalizedTrainingPlan = useMemo(() => {
    const userAdapter = {
      displayName: effectiveDisplayName || 'You',
      ratings: {
        rapid: effectiveRating,
      },
    };
    return analyzeUserChessDna(userAdapter, sessions);
  }, [effectiveDisplayName, effectiveRating, sessions]);

  // Blunder Side Quest interactive state
  const activeQuest: BlunderSideQuestItem | undefined = plan.blunderSideQuests[selectedQuestIndex];
  const isCurrentQuestRepaired = activeQuest ? repairedQuestIds.includes(activeQuest.id) : false;

  const [questChess, setQuestChess] = useState<Chess>(() => {
    const fen = activeQuest?.fenBefore || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    try {
      return new Chess(fen);
    } catch {
      return new Chess();
    }
  });

  const [questStatus, setQuestStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle');
  const [questFeedback, setQuestFeedback] = useState<string>('');
  const [showHint, setShowHint] = useState<boolean>(false);

  // Sync board state when changing quest
  useEffect(() => {
    if (activeQuest) {
      try {
        setQuestChess(new Chess(activeQuest.fenBefore));
      } catch {
        setQuestChess(new Chess());
      }
      setQuestStatus(isCurrentQuestRepaired ? 'correct' : 'idle');
      setQuestFeedback(
        isCurrentQuestRepaired
          ? `Already Repaired! You successfully solved this position.`
          : `Find the move that fixes your mistake (${activeQuest.blunderedSan}).`
      );
      setShowHint(false);
    }
  }, [activeQuest, isCurrentQuestRepaired]);

  // Handle move on the Blunder Repair board
  const handleQuestMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!activeQuest || questStatus === 'correct') return;

    try {
      const tempChess = new Chess(questChess.fen());
      const move = tempChess.move({ from, to, promotion: promotion || 'q' });

      if (!move) {
        soundService.playPuzzleFail();
        return;
      }

      // Check if move matches bestMoveSan
      const isSanMatch =
        move.san === activeQuest.bestMoveSan ||
        move.san.replace('+', '') === activeQuest.bestMoveSan.replace('+', '') ||
        move.san.replace('#', '') === activeQuest.bestMoveSan.replace('#', '');

      // Check if best move also delivered mate or winning check
      const isWinningMove = isSanMatch || tempChess.isCheckmate();

      if (isWinningMove) {
        setQuestChess(tempChess);
        setQuestStatus('correct');
        setQuestFeedback(`Outstanding! ${move.san} is the engine-recommended refutation.`);
        soundService.playPuzzleSuccess();
        markQuestAsRepaired(activeQuest.id, activeQuest.xpReward, activeQuest.motif);
      } else {
        soundService.playPuzzleFail();
        setQuestStatus('incorrect');
        setQuestFeedback(
          `Not quite. ${move.san} doesn't address the main tactical threat (${activeQuest.motif}). Try another square!`
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

  return (
    <div className="w-full flex flex-col gap-4 bg-[#1a1815] border-2 border-[#302c26] rounded-3xl p-4 sm:p-6 shadow-[0_6px_0_0_#141311]">
      {/* Smart Hub Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b-2 border-[#2b2722]">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-indigo-400 flex items-center justify-center text-white shadow-[0_3px_0_0_#3730a3] shrink-0">
            <Brain className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                Cognitive Intelligence Engine
              </span>
              <span className="px-2 py-0.2 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-300">
                v2.4 Adaptive
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-black text-white">
              Personalized Chess DNA &amp; Training
            </h2>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-[#141311] border-2 border-[#2b2722] rounded-2xl self-start md:self-auto">
          <button
            onClick={() => setActiveTab('dna')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'dna'
                ? 'bg-[#2b2823] text-white border border-[#403c34] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-indigo-400" />
            <span>Chess DNA</span>
          </button>

          <button
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'missions'
                ? 'bg-[#2b2823] text-white border border-[#403c34] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>Daily Missions</span>
          </button>

          <button
            onClick={() => setActiveTab('blunders')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'blunders'
                ? 'bg-[#2b2823] text-white border border-[#403c34] shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-rose-400" />
            <span>Blunder Repair</span>
            {plan.blunderSideQuests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-mono flex items-center justify-center font-bold">
                {plan.blunderSideQuests.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* TAB 1: COGNITIVE CHESS DNA */}
      {activeTab === 'dna' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Archetype & Radar Hero */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Archetype Card */}
            <div className="lg:col-span-1 p-4 sm:p-5 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Player Archetype
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono font-bold text-indigo-300">
                  {effectiveRating !== null ? `${effectiveRating} Elo` : 'Unranked'}
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  <span>{plan.cognitiveProfile.archetype}</span>
                </h3>
                <p className="text-xs text-zinc-300 font-medium mt-1 leading-relaxed">
                  {plan.cognitiveProfile.archetypeDescription}
                </p>
              </div>

              <div className="pt-3 border-t border-[#2d2924] flex items-center justify-between text-xs font-mono font-bold">
                <span className="text-zinc-400">Tactical Aggressiveness</span>
                <span className="text-amber-400">{plan.cognitiveProfile.aggressivenessScore}%</span>
              </div>
            </div>

            {/* Cognitive Psychological Radar */}
            <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Psychological &amp; Tactical Radar
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  Overall Index: {plan.overallProgressScore}/100
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Aggressiveness */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">Attacking Thrust</span>
                    <span className="font-mono text-amber-400">{plan.cognitiveProfile.aggressivenessScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#141311] rounded-full overflow-hidden border border-[#2b2722]">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${plan.cognitiveProfile.aggressivenessScore}%` }}
                    />
                  </div>
                </div>

                {/* Patience */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">Positional Patience</span>
                    <span className="font-mono text-blue-400">{plan.cognitiveProfile.patienceScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#141311] rounded-full overflow-hidden border border-[#2b2722]">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${plan.cognitiveProfile.patienceScore}%` }}
                    />
                  </div>
                </div>

                {/* Tactical Radar */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">Tactical Vision</span>
                    <span className="font-mono text-emerald-400">{plan.cognitiveProfile.tacticalRadarScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#141311] rounded-full overflow-hidden border border-[#2b2722]">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${plan.cognitiveProfile.tacticalRadarScore}%` }}
                    />
                  </div>
                </div>

                {/* Endgame Precision */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-zinc-300">Endgame Precision</span>
                    <span className="font-mono text-purple-400">{plan.cognitiveProfile.endgamePrecisionScore}%</span>
                  </div>
                  <div className="h-2 w-full bg-[#141311] rounded-full overflow-hidden border border-[#2b2722]">
                    <div
                      className="h-full bg-purple-400 rounded-full transition-all duration-500"
                      style={{ width: `${plan.cognitiveProfile.endgamePrecisionScore}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Cognitive Biases Strip */}
              <div className="pt-2 border-t border-[#2b2722] flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-zinc-400 mr-1 flex items-center gap-1">
                  <Crosshair className="w-3 h-3 text-indigo-400" />
                  Blindspots:
                </span>
                {plan.cognitiveProfile.cognitiveBiases.map((bias, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2722] text-[10px] text-zinc-300 font-medium"
                  >
                    {bias}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Phase-by-Phase Diagnoses: Openings, Middlegame, Endgames */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Openings Diagnosis */}
            <div className="p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Opening Theory</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20 text-[10px] font-mono font-bold">
                  {plan.phaseDiagnoses.openings.grade} ({plan.phaseDiagnoses.openings.score}%)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Primary Strength</span>
                  <span className="text-zinc-200">{plan.phaseDiagnoses.openings.primaryStrength}</span>
                </div>

                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <span className="text-[10px] uppercase font-black text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Identified Leak
                  </span>
                  <p className="text-[11px] text-amber-200 mt-0.5 font-medium leading-snug">
                    {plan.phaseDiagnoses.openings.criticalLeak}
                  </p>
                </div>
              </div>

              <Link
                href="/openings"
                className="w-full py-2 rounded-xl bg-[#2b2823] hover:bg-[#35322b] border border-[#403c34] text-amber-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Drill Opening Lines</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Middlegame Diagnosis */}
            <div className="p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Puzzle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Middlegame Tactics</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-400/10 text-emerald-300 border border-emerald-400/20 text-[10px] font-mono font-bold">
                  {plan.phaseDiagnoses.middlegame.grade} ({plan.phaseDiagnoses.middlegame.score}%)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Primary Strength</span>
                  <span className="text-zinc-200">{plan.phaseDiagnoses.middlegame.primaryStrength}</span>
                </div>

                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/25">
                  <span className="text-[10px] uppercase font-black text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Identified Leak
                  </span>
                  <p className="text-[11px] text-rose-200 mt-0.5 font-medium leading-snug">
                    {plan.phaseDiagnoses.middlegame.criticalLeak}
                  </p>
                </div>
              </div>

              <Link
                href="/puzzles"
                className="w-full py-2 rounded-xl bg-[#2b2823] hover:bg-[#35322b] border border-[#403c34] text-emerald-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Solve Tactical Drills</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Endgame Diagnosis */}
            <div className="p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Endgame Mastery</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-purple-400/10 text-purple-300 border border-purple-400/20 text-[10px] font-mono font-bold">
                  {plan.phaseDiagnoses.endgames.grade} ({plan.phaseDiagnoses.endgames.score}%)
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Primary Strength</span>
                  <span className="text-zinc-200">{plan.phaseDiagnoses.endgames.primaryStrength}</span>
                </div>

                <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/25">
                  <span className="text-[10px] uppercase font-black text-purple-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Identified Leak
                  </span>
                  <p className="text-[11px] text-purple-200 mt-0.5 font-medium leading-snug">
                    {plan.phaseDiagnoses.endgames.criticalLeak}
                  </p>
                </div>
              </div>

              <Link
                href="/endgames"
                className="w-full py-2 rounded-xl bg-[#2b2823] hover:bg-[#35322b] border border-[#403c34] text-purple-400 text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Train Tablebases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* 64-Square Blunder Hotspot Matrix (Merged from Insights) */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col gap-2.5 shadow-[0_4px_0_0_#141311]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  64-Square Blunder Hotspots
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 font-mono">
                Aggregated from your real match history
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {plan.blunderDensitySquares.map((item) => (
                <div
                  key={item.square}
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                    item.dangerLevel === 'critical'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                      : item.dangerLevel === 'moderate'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-zinc-800/40 border-zinc-700/40 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-black text-sm uppercase text-white">{item.square}</span>
                    <span className="text-[10px] font-mono font-bold">
                      {item.blunders} {item.blunders === 1 ? 'slip' : 'slips'}
                    </span>
                  </div>
                  <span className="text-[10px] leading-tight text-zinc-400 truncate">
                    {item.theme}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PERSONALIZED DAILY MISSIONS */}
      {activeTab === 'missions' && (
        <div className="flex flex-col gap-3.5 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dynamic daily assignments targeting your specific diagnosed weaknesses</span>
            <span className="font-mono font-bold text-emerald-400">Updated from your last 20 games</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {plan.dailyMissions.map((mission) => (
              <div
                key={mission.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col justify-between gap-3 shadow-[0_4px_0_0_#141311] group hover:border-[#58cc02]/60 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-white border ${
                        mission.category === 'openings'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                          : mission.category === 'tactics'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-purple-500/20 text-purple-400 border-purple-500/40'
                      }`}
                    >
                      {mission.category === 'openings' && <Compass className="w-4 h-4" />}
                      {mission.category === 'tactics' && <Puzzle className="w-4 h-4" />}
                      {mission.category === 'endgames' && <Crown className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                        {mission.phase}
                      </span>
                      <h4 className="text-sm font-black text-white">{mission.title}</h4>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2722] text-[10px] font-mono font-bold text-emerald-400">
                    +{mission.xpReward} XP
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  {mission.description}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#2d2924] text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5 text-zinc-400" />
                    <span>~{mission.estimatedMinutes} mins</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#141311] text-[10px] font-bold text-zinc-300">
                    {mission.difficulty}
                  </span>
                </div>

                <Link
                  href={mission.actionRoute}
                  className="w-full py-2.5 rounded-xl bg-[#58cc02] hover:bg-[#4cad02] border-2 border-[#3da300] text-white text-xs font-black uppercase tracking-wider shadow-[0_3px_0_0_#2b7300] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>Start Mission</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BLUNDER REPAIR SIDE QUEST */}
      {activeTab === 'blunders' && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Subheader & Spaced Repetition Tracker */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2b2722]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Spaced-Repetition Blunder Correction
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-400">Repaired:</span>
              <strong className="text-emerald-400">
                {repairedQuestIds.length} / {plan.blunderSideQuests.length}
              </strong>
            </div>
          </div>

          {/* Blunder Carousel Selector */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {plan.blunderSideQuests.map((quest, qIdx) => {
              const isRepaired = repairedQuestIds.includes(quest.id);
              const isSelected = qIdx === selectedQuestIndex;
              return (
                <button
                  key={quest.id}
                  onClick={() => setSelectedQuestIndex(qIdx)}
                  className={`px-3 py-2 rounded-xl text-left border-2 transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-[#2b2823] border-[#58cc02] shadow-[0_3px_0_0_#388302]'
                      : 'bg-[#1a1815] border-[#2d2924] hover:border-[#3d3830]'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${
                      isRepaired
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {isRepaired ? '✓' : `#${qIdx + 1}`}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">
                        Move {quest.moveNumber}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        ({quest.blunderedSan})
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 truncate max-w-[120px] block">
                      vs {quest.opponentName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Chessboard & Refutation Workspace */}
          {activeQuest && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Chessboard Column */}
              <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden border-2 border-[#332f28] shadow-[0_6px_0_0_#141311]">
                  <ChessBoard
                    chess={questChess}
                    orientation={activeQuest.turnColor === 'w' ? 'w' : 'b'}
                    boardTheme={boardTheme}
                    pieceTheme={pieceTheme}
                    onMove={handleQuestMove}
                    disabled={questStatus === 'correct'}
                  />
                </div>

                {/* Quick actions under board */}
                <div className="w-full max-w-[420px] mt-2.5 flex items-center justify-between gap-2">
                  <button
                    onClick={handleResetQuest}
                    className="px-3 py-1.5 rounded-xl bg-[#24211d] hover:bg-[#2c2823] border border-[#353029] text-xs font-bold text-zinc-300 flex items-center gap-1.5 active:translate-y-[1px] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Position</span>
                  </button>

                  <button
                    onClick={() => setShowHint((prev) => !prev)}
                    className="px-3 py-1.5 rounded-xl bg-[#24211d] hover:bg-[#2c2823] border border-[#353029] text-xs font-bold text-amber-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{showHint ? 'Hide Hint' : 'Get Hint'}</span>
                  </button>
                </div>
              </div>

              {/* Coaching & Explanations Column */}
              <div className="lg:col-span-6 xl:col-span-7 flex flex-col gap-3">
                {/* Blunder Alert Header */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col gap-2.5 shadow-[0_4px_0_0_#141311]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                        {activeQuest.motif}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-[#141311] border border-[#2b2722] text-[10px] font-mono text-zinc-400">
                      vs {activeQuest.opponentName} ({activeQuest.opponentRating})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-xs font-bold">
                      Blundered: <strong className="text-white">{activeQuest.blunderedSan}</strong>
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">
                      Dropped evaluation drastically. Can you find the engine refutation?
                    </div>
                  </div>
                </div>

                {/* Coach Danny Explanation & Hint */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-[#1f1d1a] border-2 border-[#332f28] flex flex-col gap-2 shadow-[0_4px_0_0_#141311]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5" />
                    Grandmaster Feedback
                  </span>
                  <p className="text-xs text-zinc-200 font-medium leading-relaxed">
                    {activeQuest.explanation}
                  </p>

                  {showHint && (
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-medium mt-1 animate-fadeIn">
                      💡 <strong>Hint:</strong> Look for a move with your{' '}
                      {activeQuest.bestMoveSan.startsWith('Q')
                        ? 'Queen'
                        : activeQuest.bestMoveSan.startsWith('R')
                        ? 'Rook'
                        : activeQuest.bestMoveSan.startsWith('B')
                        ? 'Bishop'
                        : activeQuest.bestMoveSan.startsWith('N')
                        ? 'Knight'
                        : activeQuest.bestMoveSan.startsWith('O')
                        ? 'Castling'
                        : 'Pawn'}{' '}
                      to turn the tables!
                    </div>
                  )}
                </div>

                {/* Real-time Status Card */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 shadow-[0_4px_0_0_#141311] transition-all ${
                    questStatus === 'correct'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                      : questStatus === 'incorrect'
                      ? 'bg-rose-500/15 border-rose-500/50 text-rose-200'
                      : 'bg-[#1f1d1a] border-[#332f28] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {questStatus === 'correct' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : questStatus === 'incorrect' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : (
                      <Crosshair className="w-5 h-5 text-indigo-400 shrink-0" />
                    )}
                    <span className="text-xs font-bold leading-snug">{questFeedback}</span>
                  </div>

                  {questStatus === 'correct' && (
                    <button
                      onClick={() => {
                        if (selectedQuestIndex < plan.blunderSideQuests.length - 1) {
                          setSelectedQuestIndex((prev) => prev + 1);
                        } else {
                          setSelectedQuestIndex(0);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-[#58cc02] hover:bg-[#4cad02] text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer shadow-sm active:translate-y-[1px]"
                    >
                      Next Blunder
                    </button>
                  )}
                </div>

                {/* 1-Click Game Review Button */}
                <button
                  onClick={() => router.push(`/game/review/${activeQuest.gameId}`)}
                  className="w-full py-2.5 rounded-xl bg-[#26231f] hover:bg-[#302c27] border-2 border-[#38332b] text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-[0_2px_0_0_#141311] active:translate-y-[1px] transition-all"
                >
                  <span>Review Entire Game in Stockfish</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
