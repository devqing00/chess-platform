'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OpeningCounterEngine, FullOpeningMasteryDossier } from '@/lib/server/openingCounterEngine';
import { BoardTheme, PieceTheme, PieceColor } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { useXpSystem } from '@/hooks/useXpSystem';
import { useRouter } from 'next/navigation';
import {
  Compass,
  Search,
  RotateCcw,
  Shield,
  Target,
  Sparkles,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  AlertTriangle,
  Award,
  Play,
  Pause,
  Layers,
  Bot,
  BookOpen,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type OpeningScreen = 'study' | 'catalog' | 'counter' | 'traps';

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const { awardXp } = useXpSystem();
  const dossiers = useMemo(() => OpeningCounterEngine.listAllDossiers(), []);

  const [activeScreen, setActiveScreen] = useState<OpeningScreen>('study');
  const [selectedDossier, setSelectedDossier] = useState<FullOpeningMasteryDossier>(dossiers[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | '1.e4' | '1.d4' | 'flank'>('all');
  const [orientation, setOrientation] = useState<PieceColor>('w');

  // Continuation drill state
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'practicing' | 'completed'>('idle');
  const [coachFeedback, setCoachFeedback] = useState<string>(
    `Opening loaded: ${dossiers[0].name}. Use the stepper below to explore move-by-move or practice the continuation.`
  );

  // Compute move-by-move positions for the active opening
  const historyPositions = useMemo(() => {
    const c = new Chess();
    const cleanMoves = selectedDossier.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    const positions = [
      { ply: 0, fen: c.fen(), san: 'Start', label: 'Start', color: 'w' }
    ];
    cleanMoves.forEach((san, idx) => {
      try {
        const move = c.move(san);
        if (move) {
          positions.push({
            ply: idx + 1,
            fen: c.fen(),
            san: move.san,
            label: `${Math.floor(idx / 2) + 1}${idx % 2 === 0 ? '.' : '...'} ${move.san}`,
            color: move.color,
          });
        }
      } catch {}
    });
    return positions;
  }, [selectedDossier]);

  const [currentPly, setCurrentPly] = useState<number>(() => {
    const cleanMoves = dossiers[0].moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    return cleanMoves.length;
  });

  const [isPlayingAutoplay, setIsPlayingAutoplay] = useState(false);

  // Chess instance synced to current ply or interactive play
  const [chess, setChess] = useState<Chess>(() => {
    const c = new Chess();
    const cleanMoves = dossiers[0].moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    cleanMoves.forEach((san) => {
      try { c.move(san); } catch {}
    });
    return c;
  });

  // Jump to specific ply in opening
  const jumpToPly = useCallback((ply: number) => {
    const targetPly = Math.max(0, Math.min(ply, historyPositions.length - 1));
    setCurrentPly(targetPly);
    const targetPos = historyPositions[targetPly];
    if (targetPos) {
      setChess(new Chess(targetPos.fen));
      soundService.playMove();
      if (targetPly === 0) {
        setCoachFeedback(`Starting position. Step through moves to see how ${selectedDossier.name} develops.`);
      } else {
        setCoachFeedback(`Move ${targetPos.label}: ${targetPos.color === 'w' ? 'White' : 'Black'} plays ${targetPos.san}.`);
      }
    }
  }, [historyPositions, selectedDossier.name]);

  // Autoplay ticker
  useEffect(() => {
    if (!isPlayingAutoplay) return;

    if (currentPly >= historyPositions.length - 1) {
      setIsPlayingAutoplay(false);
      return;
    }

    const timer = setTimeout(() => {
      jumpToPly(currentPly + 1);
    }, 1100);

    return () => clearTimeout(timer);
  }, [isPlayingAutoplay, currentPly, historyPositions.length, jumpToPly]);

  const loadOpeningDossier = useCallback((dossier: FullOpeningMasteryDossier) => {
    setSelectedDossier(dossier);
    const c = new Chess();
    const cleanMoves = dossier.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    cleanMoves.forEach((san) => {
      try { c.move(san); } catch {}
    });
    setChess(c);
    setCurrentPly(cleanMoves.length);
    setDrillIndex(0);
    setDrillStatus('idle');
    setIsPlayingAutoplay(false);
    setCoachFeedback(`Opening loaded: ${dossier.name}. Step through moves or practice refutation lines.`);
    soundService.playMove();
  }, []);

  const filteredDossiers = useMemo(() => {
    return dossiers.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.eco.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === 'all' ||
        (categoryFilter === '1.e4' && d.moves.startsWith('1. e4')) ||
        (categoryFilter === '1.d4' && d.moves.startsWith('1. d4')) ||
        (categoryFilter === 'flank' && !d.moves.startsWith('1. e4') && !d.moves.startsWith('1. d4'));
      return matchesSearch && matchesCategory;
    });
  }, [dossiers, searchQuery, categoryFilter]);

  // Handle board move in interactive continuation drill or free analysis
  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const copy = new Chess(chess.fen());
      const move = copy.move({
        from,
        to,
        promotion: promotion || 'q',
      });

      if (!move) return;

      setChess(copy);
      soundService.playMove();

      // Check against continuation tree if in practice mode
      if (drillStatus === 'practicing') {
        const tree = selectedDossier.continuationTree;
        const currentTarget = tree[drillIndex];

        if (currentTarget && (move.san === currentTarget.moveSan || `${move.from}${move.to}` === currentTarget.moveSan)) {
          soundService.playPuzzleSuccess();
          
          if (currentTarget.responseSan) {
            setCoachFeedback(`Correct! ${currentTarget.coachNote}. Opponent plays ${currentTarget.responseSan}...`);
            // Opponent auto-reply after 600ms
            setTimeout(() => {
              try {
                const oppCopy = new Chess(copy.fen());
                const oppMove = oppCopy.move(currentTarget.responseSan);
                if (oppMove) {
                  setChess(oppCopy);
                  soundService.playMove();
                }
                if (drillIndex < tree.length - 1) {
                  setDrillIndex((prev) => prev + 1);
                  const nextTarget = tree[drillIndex + 1];
                  setCoachFeedback(`White played ${currentTarget.responseSan}. Now play your next move: ${nextTarget?.moveSan || 'your response'}.`);
                } else {
                  setDrillStatus('completed');
                  setCoachFeedback(`Flawless! You completed the ${selectedDossier.name} counter-opening sequence.`);
                  soundService.playGameEndWin();
                  awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
                }
              } catch {
                if (drillIndex < tree.length - 1) {
                  setDrillIndex((prev) => prev + 1);
                } else {
                  setDrillStatus('completed');
                  soundService.playGameEndWin();
                  awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
                }
              }
            }, 600);
          } else {
            if (drillIndex < tree.length - 1) {
              setDrillIndex((prev) => prev + 1);
              setCoachFeedback(`Correct! ${currentTarget.coachNote} Play the next continuation move.`);
            } else {
              setDrillStatus('completed');
              setCoachFeedback(`Flawless! You completed the ${selectedDossier.name} counter-opening sequence.`);
              soundService.playGameEndWin();
              awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
            }
          }
        } else {
          soundService.playPuzzleFail();
          setCoachFeedback(`Move ${move.san} deviates from the top theoretical counter (${currentTarget?.moveSan || 'best move'}). Resetting...`);
          setTimeout(() => {
            setChess(new Chess(chess.fen()));
          }, 700);
        }
      } else {
        setCoachFeedback(`Exploratory move: ${move.san}. Use the stepper or reset button to return to theoretical lines.`);
      }
    } catch {
      // Invalid move
    }
  };

  const handleResetBoard = () => {
    setIsPlayingAutoplay(false);
    jumpToPly(historyPositions.length - 1);
    setDrillStatus('idle');
    setDrillIndex(0);
    setCoachFeedback(`Board reset to ${selectedDossier.name} main position.`);
    soundService.playMove();
  };

  return (
    <div className="w-full h-full flex flex-col justify-between gap-2.5 min-h-0 select-none text-zinc-100">
      {/* ========================================================================= */}
      {/* 1. SEGMENTED SUB-SCREEN SWITCHER ("Screens, Not Pages" Architecture)       */}
      {/* ========================================================================= */}
      <nav className="shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-2xl border border-white/5 overflow-x-auto scrollbar-none flex-nowrap w-full sm:w-auto">
          <button
            onClick={() => setActiveScreen('study')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'study'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="sm:hidden">Board</span>
            <span className="hidden sm:inline">Interactive Board</span>
          </button>

          <button
            onClick={() => setActiveScreen('catalog')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'catalog'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="sm:hidden">Catalog ({filteredDossiers.length})</span>
            <span className="hidden sm:inline">Opening Catalog ({filteredDossiers.length})</span>
          </button>

          <button
            onClick={() => setActiveScreen('counter')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'counter'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="sm:hidden">Counter</span>
            <span className="hidden sm:inline">Counter Strategy</span>
          </button>

          <button
            onClick={() => setActiveScreen('traps')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeScreen === 'traps'
                ? 'bg-[#81b64c] text-black shadow-xs font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="sm:hidden">Traps</span>
            <span className="hidden sm:inline">Traps &amp; Pitfalls</span>
          </button>
        </div>

        {/* Current Active Opening Chip */}
        <div className="hidden md:flex items-center gap-2 text-xs font-mono">
          <span className="text-[#81b64c] font-black">{selectedDossier.eco}</span>
          <span className="text-zinc-400 truncate max-w-[200px]">{selectedDossier.name}</span>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. SUB-SCREEN 1: INTERACTIVE BOARD & CONTINUATION STEPPER                 */}
      {/* ========================================================================= */}
      {activeScreen === 'study' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Top Active Opening Info Strip */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold bg-[#81b64c]/20 text-[#81b64c] px-2 py-0.2 rounded-full border border-[#81b64c]/30">
                    {selectedDossier.eco}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {selectedDossier.moves.split(' ').slice(0, 4).join(' ')}
                  </span>
                </div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white truncate">
                  {selectedDossier.name}
                </h2>
              </div>
            </div>

            {/* Controls: Flip, Reset, Catalog */}
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                onClick={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
                title="Flip Board"
              >
                <span>Flip ({orientation === 'w' ? '⚪' : '⚫'})</span>
              </Button>

              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                onClick={handleResetBoard}
                title="Reset to Opening Moves"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>

              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                onClick={() => setActiveScreen('catalog')}
              >
                <BookOpen className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>Change Opening</span>
              </Button>
            </div>
          </div>

          {/* Dual Column Layout: Board Left (7 Cols), Coach Danny & Controls Right (5 Cols) */}
          <div className="flex-1 w-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* Left Column (7 Cols): Scaled Interactive Board + Stepper Controls */}
            <div className="lg:col-span-7 flex flex-col items-center justify-between min-h-0 gap-2.5">
              <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black shrink-0">
                <ChessBoard
                  chess={chess}
                  orientation={orientation}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleMove}
                />
              </div>

              {/* Stepper Navigation Bar */}
              <div className="w-full max-w-[420px] flex flex-col gap-2 bg-[#1c1a17] p-2.5 rounded-2xl border border-white/5 shrink-0">
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => jumpToPly(0)}
                      disabled={currentPly === 0 || drillStatus === 'practicing'}
                      title="Jump to Start"
                    >
                      <ChevronsLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => jumpToPly(currentPly - 1)}
                      disabled={currentPly === 0 || drillStatus === 'practicing'}
                      title="Previous Move"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => setIsPlayingAutoplay((prev) => !prev)}
                      disabled={drillStatus === 'practicing'}
                      title={isPlayingAutoplay ? 'Pause Autoplay' : 'Play Opening Sequence'}
                    >
                      {isPlayingAutoplay ? (
                        <Pause className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#81b64c]" />
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => jumpToPly(currentPly + 1)}
                      disabled={currentPly >= historyPositions.length - 1 || drillStatus === 'practicing'}
                      title="Next Move"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => jumpToPly(historyPositions.length - 1)}
                      disabled={currentPly >= historyPositions.length - 1 || drillStatus === 'practicing'}
                      title="Jump to Final Move"
                    >
                      <ChevronsRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Move indicator */}
                  <span className="text-xs font-mono font-bold text-zinc-300">
                    {drillStatus === 'practicing' ? (
                      <span className="text-[#81b64c]">Drill Step {drillIndex + 1}/{selectedDossier.continuationTree.length}</span>
                    ) : (
                      <span>
                        Ply {currentPly}/{historyPositions.length - 1} &bull;{' '}
                        <strong className="text-white">{historyPositions[currentPly]?.label || 'Start'}</strong>
                      </span>
                    )}
                  </span>
                </div>

                {/* Move sequence pills */}
                <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                  {historyPositions.map((pos) => {
                    const isActive = currentPly === pos.ply && drillStatus !== 'practicing';
                    return (
                      <button
                        key={pos.ply}
                        onClick={() => {
                          if (drillStatus === 'practicing') setDrillStatus('idle');
                          jumpToPly(pos.ply);
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-[#81b64c] text-black font-black shadow-xs'
                            : 'bg-[#141311] text-zinc-400 hover:text-white hover:bg-white/10 border border-white/5'
                        }`}
                      >
                        {pos.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column (5 Cols): Coach Danny Strategy & Primary Actions */}
            <div className="lg:col-span-5 h-full p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
              {/* Practice Mode Active View */}
              {drillStatus === 'practicing' && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-[#81b64c]/10 border border-[#81b64c]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#81b64c]" />
                      <span className="text-xs font-extrabold text-[#81b64c]">
                        Continuation Drill &bull; Step {drillIndex + 1} of {selectedDossier.continuationTree.length}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono bg-[#81b64c]/20 text-[#81b64c] px-2 py-0.5 rounded font-bold">
                      +30 XP
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                      Your Mission
                    </span>
                    <p className="text-xs text-white font-bold leading-relaxed">
                      {coachFeedback}
                    </p>
                    {selectedDossier.continuationTree[drillIndex]?.evaluation && (
                      <span className="text-[11px] font-mono text-amber-400">
                        Eval: {selectedDossier.continuationTree[drillIndex].evaluation}
                      </span>
                    )}
                    {selectedDossier.continuationTree[drillIndex]?.pitfallWarning && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{selectedDossier.continuationTree[drillIndex].pitfallWarning}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Completed Drill View */}
              {drillStatus === 'completed' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2.5 text-center items-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-white">Opening Sequence Mastered!</h3>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {coachFeedback}
                  </p>
                  <span className="text-xs font-mono font-bold text-[#81b64c] bg-[#81b64c]/10 px-3 py-1 rounded-full border border-[#81b64c]/20">
                    +30 XP Added to Profile
                  </span>
                </div>
              )}

              {/* Study Mode Default View */}
              {drillStatus === 'idle' && (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                    <div className="w-7 h-7 rounded-xl bg-[#81b64c]/15 border border-[#81b64c]/30 flex items-center justify-center text-[#81b64c]">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#81b64c] block">
                        Coach Danny &bull; Strategic Directive
                      </span>
                      <span className="text-xs font-bold text-white">{selectedDossier.name}</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#141311] border border-white/5 text-xs text-zinc-300 leading-relaxed font-sans">
                    {coachFeedback}
                  </div>

                  {/* Best Counter Quick Preview */}
                  <div className="p-3 rounded-xl bg-[#141311] border border-white/5 flex items-center justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] uppercase font-bold text-zinc-500">Refutation Weapon</span>
                      <span className="text-xs font-bold text-white truncate">
                        {selectedDossier.bestCounterOpening.counterName}
                      </span>
                      <span className="text-[10px] font-mono text-amber-400">
                        {selectedDossier.bestCounterOpening.counterMoves}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="xs"
                      rounded="lg"
                      onClick={() => setActiveScreen('counter')}
                      className="shrink-0"
                    >
                      <span>Full Plan</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Anchors */}
              <div className="flex flex-col gap-2 pt-2 border-t border-white/5 shrink-0">
                {drillStatus === 'practicing' ? (
                  <Button
                    variant="secondary"
                    size="md"
                    rounded="xl"
                    fullWidth
                    onClick={() => {
                      setDrillStatus('idle');
                      jumpToPly(historyPositions.length - 1);
                      setCoachFeedback(`Exited drill mode. Stepping through ${selectedDossier.name}.`);
                    }}
                  >
                    <span>Exit Drill Mode</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    rounded="xl"
                    fullWidth
                    onClick={() => {
                      setDrillStatus('practicing');
                      setDrillIndex(0);
                      // Set board to the final opening move
                      jumpToPly(historyPositions.length - 1);
                      // Auto-flip if counter is for Black
                      if (selectedDossier.bestCounterOpening.counterMoves.startsWith('3...') || selectedDossier.bestCounterOpening.counterMoves.startsWith('1...')) {
                        setOrientation('b');
                      }
                      const branch = selectedDossier.continuationTree[0];
                      setCoachFeedback(`Drill Active: Play Black's refutation move ${branch?.moveSan || 'on the board'}.`);
                    }}
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Practice Counter Continuation (+30 XP)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    onClick={() => router.push(`/bots?fen=${encodeURIComponent(chess.fen())}`)}
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spar Against Bot</span>
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    onClick={() => setActiveScreen('traps')}
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Pitfalls ({selectedDossier.commonTraps?.length || 0})</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SUB-SCREEN 2: OPENING CATALOG & DIRECTORY                              */}
      {/* ========================================================================= */}
      {activeScreen === 'catalog' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          {/* Search & Category Filter Bar */}
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
            <div className="flex-1 relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search openings by ECO or name (e.g. Italian, Sicilian, E10)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141311] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-[#141311] border border-white/5 rounded-xl">
              {(['all', '1.e4', '1.d4', 'flank'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-[#81b64c] text-black font-black shadow-xs'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Opening Cards Grid */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch">
            {filteredDossiers.map((d) => {
              const isSelected = selectedDossier.eco === d.eco;
              return (
                <div
                  key={d.eco}
                  className={`p-3.5 rounded-2xl bg-[#1c1a17] border flex flex-col justify-between gap-2.5 transition cursor-pointer hover:border-white/20 ${
                    isSelected ? 'border-[#81b64c]/60 shadow-md ring-1 ring-[#81b64c]/30' : 'border-white/5'
                  }`}
                  onClick={() => {
                    loadOpeningDossier(d);
                    setActiveScreen('study');
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-[#81b64c] bg-[#81b64c]/10 px-2 py-0.5 rounded">
                        {d.eco}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {d.bestCounterOpening.difficulty}
                      </span>
                    </div>

                    <h3 className="text-xs font-extrabold text-white truncate">{d.name}</h3>
                    <p className="font-mono text-[10px] text-zinc-400 truncate">{d.moves}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px]">
                    <span className="text-zinc-500 truncate max-w-[150px]">
                      Counter: <strong className="text-amber-400">{d.bestCounterOpening.counterName}</strong>
                    </span>
                    <Button variant="secondary" size="xs" rounded="lg">
                      <span>Study</span>
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SUB-SCREEN 3: COUNTER-OPENING STRATEGY & ROADMAP                       */}
      {/* ========================================================================= */}
      {activeScreen === 'counter' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Counter Strategy vs {selectedDossier.name}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Recommended refutation: <strong className="text-rose-300">{selectedDossier.bestCounterOpening.counterName}</strong>
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="xs"
              rounded="lg"
              onClick={() => setActiveScreen('study')}
            >
              <span>Back to Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* Why It Works & Pawn Breaks */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Why This Counter Works</span>
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  {selectedDossier.bestCounterOpening.whyItWorks}
                </p>

                <div className="pt-2 border-t border-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
                    Crucial Pawn Breaks
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDossier.bestCounterOpening.keyPawnBreaks.map((pb, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-[#141311] border border-white/10 text-xs font-mono font-bold text-amber-300"
                      >
                        {pb}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 font-mono">
                Advantage: {selectedDossier.bestCounterOpening.winRateAdvantage}
              </div>
            </div>

            {/* Strategic Winning Roadmap */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
              <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
                <Target className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>Grandmaster Winning Roadmap</span>
              </span>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2 text-xs text-zinc-300">
                {selectedDossier.winningRoadmap.map((step, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#81b64c]/20 text-[#81b64c] font-black text-[10px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="primary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => {
                  setActiveScreen('study');
                  setDrillStatus('practicing');
                  setDrillIndex(0);
                }}
              >
                <span>Drill This Roadmap on Board (+30 XP)</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SUB-SCREEN 4: TRAPS & PITFALLS                                          */}
      {/* ========================================================================= */}
      {activeScreen === 'traps' && (
        <div className="flex-1 w-full min-h-0 flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
          <div className="p-3.5 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white">
                  Tactical Traps &bull; {selectedDossier.name}
                </h2>
                <p className="text-[11px] text-zinc-400">
                  Known pitfalls to dodge when contesting this system
                </p>
              </div>
            </div>

            <Button
              variant="secondary"
              size="xs"
              rounded="lg"
              onClick={() => setActiveScreen('study')}
            >
              <span>Back to Board</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
            {/* Traps List */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5 pb-2 border-b border-white/5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Documented Traps in {selectedDossier.eco}</span>
              </span>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2.5">
                {selectedDossier.commonTraps && selectedDossier.commonTraps.length > 0 ? (
                  selectedDossier.commonTraps.map((trap, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-[#141311] border border-amber-500/20 text-xs text-zinc-300 flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] flex items-center justify-center shrink-0">
                        !
                      </span>
                      <p className="leading-relaxed">{trap}</p>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-xs text-zinc-500 font-mono">
                    No immediate known traps recorded for this line. Play principled central chess.
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-500">
                Rule of Thumb: Always calculate checks and captures before committing to non-developing moves.
              </div>
            </div>

            {/* Direct Bot Sparring Challenge */}
            <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3 min-h-0">
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
                  <Bot className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Interactive Bot Sparring</span>
                </span>

                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  Test your defenses against the computer engine right from the critical tabiya of{' '}
                  <strong className="text-white">{selectedDossier.name}</strong>.
                </p>

                <div className="p-3 rounded-xl bg-[#141311] border border-white/5 font-mono text-xs text-[#81b64c] truncate">
                  {selectedDossier.moves}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                rounded="xl"
                fullWidth
                onClick={() => router.push(`/bots?fen=${encodeURIComponent(chess.fen())}`)}
              >
                <Bot className="w-4 h-4 fill-black" />
                <span>Spar This Opening Against Bot</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
