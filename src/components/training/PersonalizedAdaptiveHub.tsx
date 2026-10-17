'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  Layers,
  Sparkles,
  Award,
} from 'lucide-react';
import { SlideDrawer } from '@/components/ui/SlideDrawer';

export const PersonalizedAdaptiveHub: React.FC = () => {
  const router = useRouter();
  const { profile, effectiveDisplayName, effectiveRating } = useAuth();
  const { boardTheme, pieceTheme } = useShell();
  const { awardXp } = useXpSystem();

  const [repairedQuestIds, setRepairedQuestIds] = useState<string[]>([]);
  const [selectedQuestIndex, setSelectedQuestIndex] = useState<number>(0);
  const [isTelemetryDrawerOpen, setIsTelemetryDrawerOpen] = useState(false);

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
    return analyzeUserChessDna(
      profile,
      sessions
    );
  }, [profile]);

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

  return (
    <div className="w-full h-full flex flex-col justify-between gap-3 min-h-0 select-none text-zinc-100">
      {/* GROUP 1: TOP HUD - COGNITIVE LEAK VERDICT STRIP */}
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

        {/* Blunder Stepper Pills */}
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

      {/* GROUP 2 & 3: MAIN DUAL-PANE COGNITIVE LAB (Board Left, Coach & P1 Action Right) */}
      <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Column (7 Cols): Forensic Chessboard */}
        <div className="lg:col-span-7 h-full flex items-center justify-center min-h-0">
          <div className="h-full max-h-[460px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-[#1c1a17]">
            <ChessBoard
              chess={questChess}
              orientation={activeQuest?.turnColor || 'w'}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              onMove={handleQuestMove}
              disabled={questStatus === 'solved'}
            />
            {questStatus === 'solved' && (
              <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-emerald-500/90 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-sm animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>Refutation Solved</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (5 Cols): Coach Danny Feedback & P1 Action Anchor */}
        <div className="lg:col-span-5 h-full max-h-[460px] p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
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

            {/* Coach Danny Rensch Commentary */}
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-relaxed font-medium">
              <div className="flex items-center gap-1.5 text-[#81b64c] font-bold text-[10px] uppercase tracking-wider mb-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Coach Danny Rensch</span>
              </div>
              <p>{questFeedback || activeQuest?.explanation}</p>
            </div>

            {/* Reset Board Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleResetQuest}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Position</span>
              </button>
            </div>
          </div>

          {/* Bottom Actions: ONE P1 Action Anchor + Secondary Telemetry Trigger */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
            {/* P1 Primary Anchor */}
            <button
              onClick={() => router.push('/puzzles')}
              className="w-full py-3.5 px-4 rounded-xl bg-[#81b64c] hover:bg-[#92cb56] text-black font-black text-xs sm:text-sm tracking-tight shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Launch 5 Prescribed Tactical Drills (+40 XP)</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* P3 Progressive Disclosure Trigger */}
            <button
              onClick={() => setIsTelemetryDrawerOpen(true)}
              className="w-full py-2 px-3 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Inspect Match Hotspot Matrix &amp; Biases</span>
            </button>
          </div>
        </div>
      </div>

      {/* PROGRESSIVE DISCLOSURE DRAWER: Match Hotspot Matrix & Deep Biases */}
      <SlideDrawer
        isOpen={isTelemetryDrawerOpen}
        onClose={() => setIsTelemetryDrawerOpen(false)}
        title="Forensic Diagnostic Telemetry"
        subtitle="Detailed analysis of blunder coordinates and cognitive patterns."
        widthClass="max-w-xl"
      >
        <div className="flex flex-col gap-5 text-zinc-200">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
              64-Square Blunder Density Hotspots
            </h4>
            <p className="text-xs text-zinc-400 mb-3">
              Highlighted squares indicate repeated blunder destination squares in your recent games.
            </p>

            {/* 8x8 Matrix Display */}
            <div className="p-3 bg-[#141311] rounded-2xl border border-white/10 flex flex-col items-center">
              <div className="grid grid-cols-8 gap-1 w-full max-w-[320px] aspect-square">
                {['8', '7', '6', '5', '4', '3', '2', '1'].map((rank) =>
                  ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((file) => {
                    const sq = `${file}${rank}`;
                    const target = plan.blunderDensitySquares.find((b) => b.square === sq);
                    const count = target ? target.blunders : 0;
                    const isDark = (file.charCodeAt(0) + parseInt(rank)) % 2 === 0;
                    const hasBlunders = count > 0;
                    return (
                      <div
                        key={sq}
                        className={`relative rounded-md flex items-center justify-center text-[10px] font-mono transition-all ${
                          hasBlunders
                            ? count >= 3
                              ? 'bg-rose-600/40 border border-rose-500 text-rose-200 font-bold'
                              : 'bg-amber-600/30 border border-amber-500/60 text-amber-200 font-semibold'
                            : isDark
                            ? 'bg-[#262420] text-zinc-600'
                            : 'bg-[#35322c] text-zinc-500'
                        }`}
                        title={`${sq}: ${count} blunder(s)`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Cognitive Biases */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              Identified Cognitive Biases
            </span>
            <div className="flex flex-wrap gap-1.5">
              {plan.cognitiveProfile.cognitiveBiases.map((bias, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-zinc-300 font-medium"
                >
                  {bias}
                </span>
              ))}
            </div>
          </div>

          {/* Phase Accuracy Breakdown */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5">
            <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
              Phase Accuracy Balance
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-black/20">
                <span className="text-zinc-400 block text-[10px]">Opening</span>
                <span className="font-mono font-bold text-amber-400">
                  {plan.phaseDiagnoses.openings.score}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/20">
                <span className="text-zinc-400 block text-[10px]">Middlegame</span>
                <span className="font-mono font-bold text-emerald-400">
                  {plan.phaseDiagnoses.middlegame.score}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-black/20">
                <span className="text-zinc-400 block text-[10px]">Endgame</span>
                <span className="font-mono font-bold text-purple-400">
                  {plan.phaseDiagnoses.endgames.score}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
};
