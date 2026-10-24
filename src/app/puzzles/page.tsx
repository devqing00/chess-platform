'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { TacticalPuzzle, PuzzlePillar, PuzzleTier } from '@/types/chess';
import { PuzzleEngineService, UserMasteryStats } from '@/lib/server/puzzleEngineService';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import { useXpSystem } from '@/hooks/useXpSystem';
import { XpGainToast } from '@/components/xp/XpGainToast';
import { Button } from '@/components/ui/button';
import {
  Puzzle,
  Flame,
  Zap,
  Award,
  Target,
  Brain,
  Crown,
  RotateCcw,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  GraduationCap,
  History,
  TrendingUp,
  BarChart2,
  BookOpen,
  Check,
  Shield,
  Loader2,
} from 'lucide-react';

type PuzzleScreen = 'tactics' | 'strategy' | 'endgame' | 'vault';

function PuzzlesMasteryContent() {
  const searchParams = useSearchParams();
  const { boardTheme, pieceTheme } = useShell();
  const { isSynced, syncedPlatform, effectiveRating } = useAuth();
  const { profile: xpProfile, awardXp, recentGain } = useXpSystem();

  // Active sub-screen ("Screens, Not Pages" architecture)
  const pillarParam = searchParams.get('pillar');
  const initialScreen: PuzzleScreen =
    pillarParam === 'strategy' ? 'strategy' : pillarParam === 'endgame' ? 'endgame' : pillarParam === 'vault' ? 'vault' : 'tactics';

  const [activeScreen, setActiveScreen] = useState<PuzzleScreen>(initialScreen);
  const [selectedTier, setSelectedTier] = useState<PuzzleTier>('club');

  // Master SRS puzzle state
  const [currentPuzzle, setCurrentPuzzle] = useState<TacticalPuzzle>(() => {
    const initialPillar: PuzzlePillar = initialScreen === 'vault' ? 'tactics' : initialScreen;
    return PuzzleEngineService.getNextPuzzle(initialPillar, 'club');
  });

  const [chess, setChess] = useState<Chess>(() => new Chess(currentPuzzle.fen));
  const [moveStepIndex, setMoveStepIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState<'idle' | 'correct' | 'incorrect' | 'solved'>('idle');
  const [hintLevel, setHintLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [masteryNotice, setMasteryNotice] = useState<string | null>(null);

  // Spaced repetition stats for Vault screen
  const [masteryStats, setMasteryStats] = useState<UserMasteryStats>(() => {
    return PuzzleEngineService.getMasteryStats();
  });

  // Recent solved session log
  const [solveHistory, setSolveHistory] = useState<Array<{ id: string; title: string; theme: string; xp: number; time: string }>>([]);

  const loadPuzzle = useCallback((puz: TacticalPuzzle) => {
    setCurrentPuzzle(puz);
    setChess(new Chess(puz.fen));
    setMoveStepIndex(0);
    setStatusMessage('idle');
    setHintLevel(0);
    setMasteryNotice(null);
  }, []);

  const handleNextPuzzle = useCallback(() => {
    const targetPillar: PuzzlePillar = activeScreen === 'vault' ? 'tactics' : activeScreen;
    const nextPuz = PuzzleEngineService.getNextPuzzle(targetPillar, selectedTier);
    loadPuzzle(nextPuz);
  }, [activeScreen, selectedTier, loadPuzzle]);

  const handleScreenChange = (screen: PuzzleScreen) => {
    setActiveScreen(screen);
    if (screen !== 'vault') {
      const nextPuz = PuzzleEngineService.getNextPuzzle(screen, selectedTier);
      loadPuzzle(nextPuz);
    } else {
      setMasteryStats(PuzzleEngineService.getMasteryStats());
    }
  };

  const handleTierChange = (newTier: PuzzleTier) => {
    setSelectedTier(newTier);
    const targetPillar: PuzzlePillar = activeScreen === 'vault' ? 'tactics' : activeScreen;
    const nextPuz = PuzzleEngineService.getNextPuzzle(targetPillar, newTier);
    loadPuzzle(nextPuz);
  };

  // Solution move sequence
  const solutionSequence = useMemo(() => {
    return currentPuzzle.moves || [];
  }, [currentPuzzle]);

  // Keyboard shortcut listener: Spacebar to advance when solved
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

          const targetPillar: PuzzlePillar = activeScreen === 'vault' ? 'tactics' : activeScreen;
          const result = PuzzleEngineService.recordSolveAttempt(
            currentPuzzle.id,
            true,
            currentPuzzle.pillar || targetPillar,
            currentPuzzle.tier || selectedTier
          );

          awardXp(result.xpEarned, `${(currentPuzzle.pillar || targetPillar).toUpperCase()}: ${currentPuzzle.theme}`);

          setSolveHistory((prev) => [
            {
              id: currentPuzzle.id,
              title: currentPuzzle.title,
              theme: currentPuzzle.theme,
              xp: result.xpEarned,
              time: 'Just now',
            },
            ...prev.slice(0, 9),
          ]);

          if (result.graduatedToMastered) {
            setMasteryNotice('Graduated to Mastered! Retired from active Leitner rotation.');
            try {
              confetti({ particleCount: 70, spread: 70, origin: { y: 0.65 } });
            } catch {}
          }

          setMasteryStats(PuzzleEngineService.getMasteryStats());
        } else {
          // Opponent response in puzzle continuation
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
        // Incorrect move attempt: reset streak
        soundService.playGameEndLoss();
        setStatusMessage('incorrect');
        setStreak(0);

        const targetPillar: PuzzlePillar = activeScreen === 'vault' ? 'tactics' : activeScreen;
        PuzzleEngineService.recordSolveAttempt(
          currentPuzzle.id,
          false,
          currentPuzzle.pillar || targetPillar,
          currentPuzzle.tier || selectedTier
        );

        setTimeout(() => {
          setChess(new Chess(currentPuzzle.fen));
          setMoveStepIndex(0);
          setStatusMessage('idle');
        }, 1200);
      }
    } catch {
      // Invalid move ignored
    }
  };

  const handleReset = () => {
    setChess(new Chess(currentPuzzle.fen));
    setMoveStepIndex(0);
    setStatusMessage('idle');
    setHintLevel(0);
  };

  const puzzleTurn = currentPuzzle.fen.split(' ')[1] as 'w' | 'b';

  return (
    <div className="flex-1 flex flex-col min-h-full lg:h-full bg-[#161512] text-zinc-100 overflow-y-auto lg:overflow-hidden select-none min-w-0 pb-24 md:pb-6">
      {recentGain && <XpGainToast gain={recentGain} />}

      {/* 1. TOP HEADER & SUB-SCREEN SWITCHER */}
      <header className="border-b border-white/5 shrink-0 bg-[#141311] z-20 flex flex-col md:flex-row md:items-center md:justify-between px-3 sm:px-4 py-2 md:py-0 md:h-12 gap-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#81b64c]/15 text-[#81b64c] flex items-center justify-center font-black shrink-0">
              <Puzzle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
                <span>Tactics &amp; Strategy</span>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 hidden xs:inline">
                  SRS
                </span>
              </h1>
            </div>
          </div>

          {/* Mobile HUD metrics */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold">
                <Flame className="w-3 h-3 fill-amber-400" />
                <span>{streak}x</span>
              </div>
            )}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
              <Zap className="w-3 h-3 fill-emerald-400" />
              <span>{xpProfile.totalXp} XP</span>
            </div>
          </div>
        </div>

        {/* 4 Segmented Sub-Screen Switcher Pills - Dedicated scrollable row on mobile, inline on desktop */}
        <div className="flex items-center gap-1 p-1 bg-[#1c1a17] rounded-xl border border-white/5 text-xs font-bold overflow-x-auto scrollbar-none w-full md:w-auto">
          <button
            onClick={() => handleScreenChange('tactics')}
            className={`flex-1 md:flex-initial px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 text-xs ${
              activeScreen === 'tactics'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Tactics</span>
          </button>
          <button
            onClick={() => handleScreenChange('strategy')}
            className={`flex-1 md:flex-initial px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 text-xs ${
              activeScreen === 'strategy'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Strategy</span>
          </button>
          <button
            onClick={() => handleScreenChange('endgame')}
            className={`flex-1 md:flex-initial px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 text-xs ${
              activeScreen === 'endgame'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Endgame</span>
          </button>
          <button
            onClick={() => handleScreenChange('vault')}
            className={`flex-1 md:flex-initial px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 text-xs ${
              activeScreen === 'vault'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Vault</span>
          </button>
        </div>

        {/* Desktop Quick HUD Metrics */}
        <div className="hidden md:flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5 fill-amber-400" />
              <span>{streak}x</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <Zap className="w-3.5 h-3.5 fill-emerald-400" />
            <span>{xpProfile.totalXp} XP</span>
          </div>
        </div>
      </header>

      {/* 2. MAIN SUB-SCREEN VIEWPORT */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-visible lg:overflow-hidden">
        {/* ========================================================================= */}
        {/* SUB-SCREENS 1, 2, 3: THE 3 MASTERY PILLARS (Tactics, Strategy, Endgame) */}
        {/* ========================================================================= */}
        {(activeScreen === 'tactics' || activeScreen === 'strategy' || activeScreen === 'endgame') && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-visible lg:overflow-hidden">
            {/* Left: Viewport-Locked ChessBoard */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0">
              <div className="w-[min(calc(100vw-3.5rem),calc(100dvh-200px),460px)] aspect-square relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#1c1a17]">
                <ChessBoard
                  chess={chess}
                  orientation={puzzleTurn}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleMove}
                  disabled={statusMessage === 'solved'}
                />

                {/* In-Board Success / Error Status Badge */}
                {statusMessage === 'solved' && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-[#81b64c] text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-sm animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    <span>Solved! +{currentPuzzle.xpReward || 25} XP</span>
                  </div>
                )}
                {statusMessage === 'incorrect' && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xl backdrop-blur-sm animate-in fade-in">
                    <XCircle className="w-4 h-4" />
                    <span>Incorrect Move</span>
                  </div>
                )}
              </div>

              {/* Turn Indicator Strip */}
              <div className="mt-2.5 w-full max-w-[460px] p-2 rounded-xl bg-[#1c1a17] border border-white/5 flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-bold flex items-center gap-1.5">
                  <span>{puzzleTurn === 'w' ? '⚪ White to move' : '⚫ Black to move'}</span>
                </span>
                <span className="text-zinc-400 font-mono text-[11px]">
                  {statusMessage === 'solved' ? 'Challenge Completed' : 'Find the winning line'}
                </span>
              </div>
            </div>

            {/* Right: Coach Danny Insight, Tier Switcher & Exactly ONE P1 Button */}
            <div className="w-full lg:w-96 flex flex-col justify-between gap-3 min-h-0 bg-[#181614] p-3.5 rounded-2xl border border-white/5">
              <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                {/* Header: Theme and Difficulty Tier */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#81b64c] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Theme: {currentPuzzle.theme}</span>
                  </span>
                  <div className="flex items-center gap-1 bg-[#141311] p-0.5 rounded-lg border border-white/5">
                    {(['fundamentals', 'club', 'advanced', 'master'] as PuzzleTier[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTierChange(t)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition cursor-pointer ${
                          selectedTier === t ? 'bg-white/20 text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {t.slice(0, 4)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-sm font-black text-white">{currentPuzzle.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {currentPuzzle.solutionDescription || 'Calculate every response carefully before playing.'}
                  </p>
                </div>

                {/* Coach Danny Rensch Teaching Card */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-200 leading-relaxed font-medium">
                  <div className="flex items-center gap-1.5 text-[#81b64c] font-bold text-[10px] uppercase tracking-wider mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Coach Danny Rensch</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">
                    {statusMessage === 'solved'
                      ? currentPuzzle.teachingNotes || currentPuzzle.solutionDescription
                      : hintLevel > 0
                      ? currentPuzzle.coachHint || 'Identify undefended pieces, discovered attacks, and king pins.'
                      : 'Look for tactical weaknesses, overworked defenders, and king exposure.'}
                  </p>
                </div>

                {/* Spaced Repetition Mastery Alert */}
                {masteryNotice && (
                  <div className="p-2.5 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 text-[#81b64c] text-xs font-semibold flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#81b64c] shrink-0" />
                    <span>{masteryNotice}</span>
                  </div>
                )}

                {/* Reset & Hint Secondary Helpers */}
                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="xs" rounded="lg" onClick={handleReset} className="font-bold">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="lg"
                    onClick={() => setHintLevel((h) => h + 1)}
                    className="font-bold"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Hint {hintLevel > 0 ? `(${hintLevel})` : ''}</span>
                  </Button>
                </div>
              </div>

              {/* Exactly ONE P1 Anchor Button */}
              <div className="pt-2 border-t border-white/5 shrink-0">
                {statusMessage === 'solved' ? (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={handleNextPuzzle}
                    className="font-black"
                  >
                    <span>Next {activeScreen === 'tactics' ? 'Tactics' : activeScreen === 'strategy' ? 'Strategy' : 'Endgame'} (Spacebar)</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    rounded="xl"
                    fullWidth
                    onClick={handleNextPuzzle}
                    className="font-bold"
                  >
                    <span>Skip to Next Due Puzzle</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 4: LEITNER SRS VAULT & MASTERY STATS */}
        {/* ========================================================================= */}
        {activeScreen === 'vault' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#81b64c]" />
                  <span>Leitner Spaced Repetition Mastery Vault</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Adaptive spaced interval tracking ensuring long-term memory retention
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-[#81b64c]/15 border border-[#81b64c]/30 rounded-xl text-[#81b64c] text-xs font-mono font-black">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>{masteryStats.totalMastered} Mastered</span>
                </div>
              </div>
            </div>

            {/* 3 Pillar Mastery Progress Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 shrink-0">
              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-[#81b64c]" />
                    <span>Tactics Pillar</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-[#81b64c]">
                    {masteryStats.tacticsMastered} Mastered
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-[#81b64c] h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (masteryStats.tacticsMastered / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Brain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Strategy Pillar</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {masteryStats.strategyMastered} Mastered
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-amber-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (masteryStats.strategyMastered / 10) * 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5 text-purple-400" />
                    <span>Endgame Pillar</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400">
                    {masteryStats.endgameMastered} Mastered
                  </span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-purple-400 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, (masteryStats.endgameMastered / 10) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Leitner Box Explanation Card */}
            <div className="p-3 rounded-2xl bg-[#201e1a] border border-white/5 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#81b64c]/15 text-[#81b64c] flex items-center justify-center shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">How Leitner Adaptive Mastery Works</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Puzzles require 2-3 consecutive clean solves across scheduled spaced intervals to graduate into Mastered status. Failed puzzles immediately reset to Box 1 for reinforcement.
                  </p>
                </div>
              </div>
            </div>

            {/* Solved Session Log */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Recent Solves in this Session ({solveHistory.length})
              </span>
              {solveHistory.length > 0 ? (
                solveHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#81b64c]/20 text-[#81b64c] flex items-center justify-center text-[10px] font-black shrink-0">
                        ✓
                      </span>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white truncate block">{item.title}</span>
                        <span className="text-[10px] font-mono text-zinc-400">{item.theme}</span>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 shrink-0">
                      +{item.xp} XP
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <History className="w-6 h-6 text-zinc-600" />
                  <span>No puzzles solved in this session yet. Pick a pillar above to begin!</span>
                </div>
              )}
            </div>

            {/* Exactly ONE P1 Anchor Button */}
            <div className="pt-2 border-t border-white/5 shrink-0">
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={() => handleScreenChange('tactics')}
                className="w-full flex items-center justify-center gap-2 font-black"
              >
                <span>Resume Active Tactics Stream</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PuzzlesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-full bg-[#161512] text-zinc-400 text-xs font-mono">
          <Loader2 className="w-5 h-5 animate-spin text-[#81b64c]" />
        </div>
      }
    >
      <PuzzlesMasteryContent />
    </Suspense>
  );
}
