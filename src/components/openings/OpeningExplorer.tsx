'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OpeningCounterEngine, FullOpeningMasteryDossier } from '@/lib/server/openingCounterEngine';
import { searchEcoOpenings, EcoOpening } from '@/lib/ecoOpenings';
import { BoardTheme, PieceTheme, PieceColor, OpeningContinuationBranch } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { useXpSystem } from '@/hooks/useXpSystem';
import { useRouter, useSearchParams } from 'next/navigation';
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
  Play,
  Pause,
  BookOpen,
  Zap,
  CheckCircle2,
  Loader2,
  Swords,
  Flame,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ExplorerConsoleTab = 'moves' | 'strategy' | 'practice';
export type DrillMode = 'main' | 'counter' | 'trap';

export interface MasterMoveStats {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  total: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  averageRating: number;
  eco?: string;
  openingName?: string;
}

export interface MasterGameRecord {
  id: string;
  white: { name: string; rating: number; title?: string };
  black: { name: string; rating: number; title?: string };
  year: number;
  event: string;
  result: '1-0' | '1/2-1/2' | '0-1';
  movesSan?: string;
}

export interface OpeningPositionResult {
  fen: string;
  normalizedFen: string;
  opening?: {
    eco: string;
    name: string;
    variation?: string;
  };
  totalGames: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  averageRating: number;
  moves: MasterMoveStats[];
  topGames: MasterGameRecord[];
}

const FAMOUS_OPENINGS = [
  { id: 'stafford', name: 'Stafford Gambit', moves: '1. e4 e5 2. Nf3 Nf6 3. Nxe5 Nc6', eco: 'C42', isGambit: true },
  { id: 'englund', name: 'Englund Gambit', moves: '1. d4 e5 2. dxe5 Nc6 3. Nf3 Qe7', eco: 'A40', isGambit: true },
  { id: 'traxler', name: 'Traxler Counter-Attack', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 Bc5', eco: 'C57', isGambit: true },
  { id: 'albin', name: 'Albin Counter-Gambit', moves: '1. d4 d5 2. c4 e5 3. dxe5 d4', eco: 'D08', isGambit: true },
  { id: 'kings-gambit', name: "King's Gambit", moves: '1. e4 e5 2. f4 exf4', eco: 'C30', isGambit: true },
  { id: 'evans', name: 'Evans Gambit', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. b4', eco: 'C51', isGambit: true },
  { id: 'morra', name: 'Smith-Morra Gambit', moves: '1. e4 c5 2. d4 cxd4 3. c3 dxc3 4. Nxc3', eco: 'B21', isGambit: true },
  { id: 'danish', name: 'Danish Gambit', moves: '1. e4 e5 2. d4 exd4 3. c3 dxc3 4. Bc4 cxb2 5. Bxb2', eco: 'C21', isGambit: true },
  { id: 'budapest', name: 'Budapest Gambit', moves: '1. d4 Nf6 2. c4 e5 3. dxe5 Ng4', eco: 'A52', isGambit: true },
  { id: 'ruy-lopez', name: 'Ruy Lopez', moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5', eco: 'C60' },
  { id: 'italian', name: 'Italian Game', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4', eco: 'C50' },
  { id: 'sicilian', name: 'Sicilian Defense', moves: '1. e4 c5', eco: 'B20' },
  { id: 'french', name: 'French Defense', moves: '1. e4 e6', eco: 'C00' },
  { id: 'caro-kann', name: 'Caro-Kann Defense', moves: '1. e4 c6', eco: 'B10' },
  { id: 'queens-gambit', name: "Queen's Gambit", moves: '1. d4 d5 2. c4', eco: 'D06', isGambit: true },
  { id: 'kings-indian', name: "King's Indian", moves: '1. d4 Nf6 2. c4 g6', eco: 'E60' },
];

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ecoParam = searchParams.get('eco');
  const queryParam = searchParams.get('name') || searchParams.get('q') || searchParams.get('query');
  const { awardXp } = useXpSystem();
  const dossiers = useMemo(() => OpeningCounterEngine.listAllDossiers(), []);

  // Active opening dossier
  const [selectedDossier, setSelectedDossier] = useState<FullOpeningMasteryDossier>(() => {
    if (ecoParam) {
      const found = OpeningCounterEngine.getDossierByEco(ecoParam);
      if (found) return found;
    }
    return dossiers[0];
  });

  // 3 Primary Console Tabs: 'moves' | 'strategy' | 'practice'
  const [activeTab, setActiveTab] = useState<ExplorerConsoleTab>('moves');

  // Search & Catalog Overlay Modal state
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(queryParam || '');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'gambit' | '1.e4' | '1.d4' | 'flank'>('all');
  const [catalogLimit, setCatalogLimit] = useState(48);

  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Master Database query results
  const [masterResult, setMasterResult] = useState<OpeningPositionResult | null>(null);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);

  // Practice / Drill modes
  const [drillMode, setDrillMode] = useState<DrillMode>('main');
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'practicing' | 'completed'>('idle');
  const [coachFeedback, setCoachFeedback] = useState<string>(
    `Explore moves on the board or practice theoretical variations below.`
  );

  // Compute move-by-move positions for the active opening
  const historyPositions = useMemo(() => {
    const c = new Chess();
    const cleanMoves = selectedDossier.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    const positions = [
      { ply: 0, fen: c.fen(), san: 'Start', label: 'Start', color: 'w' as PieceColor }
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

  // Calculate active practice tree based on selected mode
  const activeTree = useMemo(() => {
    if (drillMode === 'trap' && selectedDossier.trapLine?.tree && selectedDossier.trapLine.tree.length > 0) {
      return selectedDossier.trapLine.tree;
    }
    if (drillMode === 'counter') {
      if (selectedDossier.bestCounterOpening?.counterMoves) {
        const counterTokens = selectedDossier.bestCounterOpening.counterMoves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
        if (counterTokens.length >= 2) {
          const tree: OpeningContinuationBranch[] = [];
          for (let i = 1; i < counterTokens.length; i += 2) {
            const userMove = counterTokens[i];
            const oppFollowUp = counterTokens[i + 1] || '';
            tree.push({
              id: `counter-${i}`,
              moveSan: userMove,
              responseSan: oppFollowUp,
              coachNote: `Counter move: ${userMove}. ${oppFollowUp ? `White replies ${oppFollowUp}.` : 'Neutralizes White.'}`,
              evaluation: 'Sound counterplay',
            });
          }
          return tree;
        }
      }
    }
    return selectedDossier.continuationTree || [];
  }, [drillMode, selectedDossier]);

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
    setDrillMode('main');
    setIsPlayingAutoplay(false);
    setCoachFeedback(`${dossier.name} (${dossier.eco}). Step through moves or choose a practice mode.`);
    soundService.playMove();
  }, []);

  const handleSelectEcoOpening = useCallback((op: EcoOpening) => {
    const dossier = OpeningCounterEngine.synthesizeDossierFromEco(op);
    loadOpeningDossier(dossier);
    setIsCatalogOpen(false);
  }, [loadOpeningDossier]);

  useEffect(() => {
    if (ecoParam || queryParam) {
      const term = (ecoParam || queryParam || '').toLowerCase().trim();
      const existing = OpeningCounterEngine.getDossierByEco(term);
      if (existing) {
        loadOpeningDossier(existing);
        return;
      }

      // Look up in the full ECO openings library
      const ecoMatches = searchEcoOpenings(term, 'all', 10);
      if (ecoMatches.items.length > 0) {
        handleSelectEcoOpening(ecoMatches.items[0]);
      }
    }
  }, [ecoParam, queryParam, handleSelectEcoOpening, loadOpeningDossier]);

  // Search filtered items for the catalog modal
  const ecoSearchResults = useMemo(() => {
    return searchEcoOpenings(searchQuery, categoryFilter, catalogLimit);
  }, [searchQuery, categoryFilter, catalogLimit]);

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
      setLastMove({ from, to });
      setCurrentPly((prev) => prev + 1);
      soundService.playMove();

      // Check against activeTree if in practice mode
      if (drillStatus === 'practicing') {
        const currentTarget = activeTree[drillIndex];

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
                if (drillIndex < activeTree.length - 1) {
                  setDrillIndex((prev) => prev + 1);
                  const nextTarget = activeTree[drillIndex + 1];
                  setCoachFeedback(`Opponent played ${currentTarget.responseSan}. Your turn: ${nextTarget?.moveSan || 'your move'}.`);
                } else {
                  setDrillStatus('completed');
                  const finishText = drillMode === 'trap'
                    ? `Checkmate or winning material achieved! You mastered the ${selectedDossier.trapLine?.name || selectedDossier.name} trap.`
                    : `Flawless! You mastered the ${selectedDossier.name} sequence.`;
                  setCoachFeedback(finishText);
                  soundService.playGameEndWin();
                  awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
                }
              } catch {
                if (drillIndex < activeTree.length - 1) {
                  setDrillIndex((prev) => prev + 1);
                } else {
                  setDrillStatus('completed');
                  soundService.playGameEndWin();
                  awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
                }
              }
            }, 600);
          } else {
            if (drillIndex < activeTree.length - 1) {
              setDrillIndex((prev) => prev + 1);
              setCoachFeedback(`Correct! ${currentTarget.coachNote} Play the next move.`);
            } else {
              setDrillStatus('completed');
              const finishText = drillMode === 'trap'
                ? `Checkmate delivered! You executed the ${selectedDossier.trapLine?.name || selectedDossier.name} line perfectly.`
                : `Flawless! You mastered the ${selectedDossier.name} sequence.`;
              setCoachFeedback(finishText);
              soundService.playGameEndWin();
              awardXp(30, `Mastered Opening: ${selectedDossier.name}`);
            }
          }
        } else {
          soundService.playPuzzleFail();
          setCoachFeedback(`Move ${move.san} is not the expected theory move (${currentTarget?.moveSan || 'expected move'}). Try again!`);
          setTimeout(() => {
            setChess(new Chess(chess.fen()));
          }, 700);
        }
      } else {
        setCoachFeedback(`Exploratory move: ${move.san}. Use reset to return to standard lines.`);
      }
    } catch {
      //
    }
  };

  const handleStartPractice = (mode: DrillMode) => {
    setDrillMode(mode);
    setDrillIndex(0);
    setDrillStatus('practicing');
    soundService.playTactilePop();

    if (mode === 'trap' && selectedDossier.trapLine) {
      setCoachFeedback(`Gambit / Trap Drill: Execute ${selectedDossier.trapLine.name}! Target: ${selectedDossier.trapLine.goal === 'checkmate' ? 'Deliver checkmate!' : 'Win decisive material!'}`);
      const c = new Chess();
      const cleanMoves = selectedDossier.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
      cleanMoves.forEach(san => { try { c.move(san); } catch {} });
      setChess(c);
      setOrientation('w');
    } else if (mode === 'counter') {
      const counterTokens = selectedDossier.bestCounterOpening?.counterMoves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean) || [];
      const c = new Chess();
      setOrientation('b');
      // If the first token is White's move, play it so Black is up next
      if (counterTokens.length >= 2) {
        try {
          c.move(counterTokens[0]);
        } catch {}
      }
      setChess(c);
      setCoachFeedback(`Counter-Play Drill: White opened with ${counterTokens[0] || '1. e4'}. Your turn: play ${counterTokens[1] || 'c5'} (${selectedDossier.bestCounterOpening.counterName})!`);
    } else {
      setCoachFeedback(`Main Line Drill: Step through master opening moves for ${selectedDossier.name}.`);
      setChess(new Chess());
      setOrientation('w');
    }
  };

  const handleResetBoard = () => {
    const c = new Chess();
    const cleanMoves = selectedDossier.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    cleanMoves.forEach((san) => {
      try { c.move(san); } catch {}
    });
    setChess(c);
    setCurrentPly(cleanMoves.length);
    setDrillStatus('idle');
    setDrillIndex(0);
    setIsPlayingAutoplay(false);
    setCoachFeedback(`Board reset to ${selectedDossier.name} initial moves.`);
    soundService.playMove();
  };

  const handlePlayMasterMove = (san: string) => {
    try {
      const copy = new Chess(chess.fen());
      const move = copy.move(san);
      if (move) {
        setChess(copy);
        setCurrentPly((prev) => prev + 1);
        soundService.playMove();
      }
    } catch {}
  };

  // Fetch live master opening explorer database stats
  useEffect(() => {
    let active = true;
    const fen = chess.fen();
    setIsLoadingMaster(true);
    fetch(`/api/openings/explorer?fen=${encodeURIComponent(fen)}&ply=${currentPly}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          setMasterResult(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoadingMaster(false);
      });

    return () => {
      active = false;
    };
  }, [chess, currentPly]);

  return (
    <div className="flex-1 w-full flex flex-col gap-2 min-h-0 select-none relative">
      {/* 1. COMPACT TOOLBAR: Opening Name + Search Trigger + Board Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-[#1a1815] px-3 py-2 rounded-xl border border-white/5 shrink-0">
        {/* Left: Active Opening Info */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded shrink-0">
            {selectedDossier.eco}
          </span>
          <div className="flex flex-col min-w-0">
            <h2 className="text-xs sm:text-sm font-black text-white truncate tracking-tight" title={selectedDossier.name}>
              {selectedDossier.name}
            </h2>
            <span className="text-[10px] font-mono text-zinc-400 truncate">
              {selectedDossier.moves}
            </span>
          </div>
        </div>

        {/* Center / Right: Quick Search Button & Board Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
          <button
            onClick={() => setIsCatalogOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#24221d] border border-white/10 hover:border-emerald-500/40 text-zinc-300 hover:text-white transition text-xs font-bold cursor-pointer shadow-sm"
            title="Search all 3,800+ openings"
          >
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <span>Search 3.8k Openings</span>
          </button>

          <Button
            variant="secondary"
            size="xs"
            rounded="md"
            onClick={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
            title="Flip Board"
          >
            <span>Flip ({orientation === 'w' ? '⚪' : '⚫'})</span>
          </Button>

          <Button
            variant="secondary"
            size="xs"
            rounded="md"
            onClick={handleResetBoard}
            title="Reset Board"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* 2. MAIN TWO-COLUMN WORKSPACE: Board (Left/Center) + Console (Right) */}
      <div className="flex-1 w-full min-h-0 flex flex-col lg:flex-row items-center justify-center gap-3 overflow-y-auto lg:overflow-hidden">
        {/* LEFT COLUMN: Contained Interactive Board & Stepper Bar */}
        <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-full max-w-[min(calc(100vw-2rem),calc(100dvh-200px),520px)]">
          <div className="w-full aspect-square rounded-xl overflow-hidden shadow-xl relative bg-black shrink-0">
            <ChessBoard
              chess={chess}
              orientation={orientation}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              onMove={handleMove}
              lastMove={lastMove}
            />
          </div>

          {/* Stepper Navigation Bar */}
          <div className="w-full flex flex-col gap-1.5 bg-[#1a1815] p-2 rounded-xl border border-white/5 shrink-0">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="md"
                  onClick={() => jumpToPly(0)}
                  disabled={currentPly === 0 || drillStatus === 'practicing'}
                  title="First move"
                >
                  <ChevronsLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="md"
                  onClick={() => jumpToPly(currentPly - 1)}
                  disabled={currentPly === 0 || drillStatus === 'practicing'}
                  title="Previous move"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="md"
                  onClick={() => setIsPlayingAutoplay((prev) => !prev)}
                  disabled={drillStatus === 'practicing'}
                  title={isPlayingAutoplay ? 'Pause' : 'Autoplay'}
                >
                  {isPlayingAutoplay ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="md"
                  onClick={() => jumpToPly(currentPly + 1)}
                  disabled={currentPly >= historyPositions.length - 1 || drillStatus === 'practicing'}
                  title="Next move"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="md"
                  onClick={() => jumpToPly(historyPositions.length - 1)}
                  disabled={currentPly >= historyPositions.length - 1 || drillStatus === 'practicing'}
                  title="Last move"
                >
                  <ChevronsRight className="w-3 h-3" />
                </Button>
              </div>

              <span className="text-[11px] font-mono font-bold text-zinc-300">
                {drillStatus === 'practicing' ? (
                  <span className="text-emerald-400 font-bold">
                    Drill: Step {drillIndex + 1} of {activeTree.length}
                  </span>
                ) : (
                  <span>
                    Move {currentPly}/{historyPositions.length - 1}: <strong className="text-white">{historyPositions[currentPly]?.label || 'Start'}</strong>
                  </span>
                )}
              </span>
            </div>

            {/* Move Pills Horizontal Strip */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {historyPositions.map((pos) => {
                const isActive = currentPly === pos.ply && drillStatus !== 'practicing';
                return (
                  <button
                    key={`ply-${pos.ply}`}
                    onClick={() => {
                      if (drillStatus === 'practicing') setDrillStatus('idle');
                      jumpToPly(pos.ply);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#282521] text-emerald-400 border border-emerald-500/40 shadow-sm'
                        : 'bg-[#141311] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {pos.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: The Explorer Console (3 Clear Tabs) */}
        <div className="w-full lg:w-[360px] xl:w-[400px] h-full max-h-[calc(100dvh-130px)] bg-[#1a1815] border border-white/5 rounded-xl p-3 flex flex-col justify-between gap-2.5 overflow-hidden shrink-0">
          {/* 3 Console Tabs Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/5 shrink-0">
            <div className="grid grid-cols-3 gap-1 bg-[#141311] p-0.5 rounded-lg border border-white/5 text-xs w-full">
              <button
                onClick={() => setActiveTab('moves')}
                className={`py-1 rounded-md transition cursor-pointer text-center font-bold text-[11px] ${
                  activeTab === 'moves'
                    ? 'bg-[#282622] text-white shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Master Moves
              </button>
              <button
                onClick={() => setActiveTab('strategy')}
                className={`py-1 rounded-md transition cursor-pointer text-center font-bold text-[11px] ${
                  activeTab === 'strategy'
                    ? 'bg-[#282622] text-white shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Strategy &amp; Ideas
              </button>
              <button
                onClick={() => setActiveTab('practice')}
                className={`py-1 rounded-md transition cursor-pointer text-center font-bold text-[11px] ${
                  activeTab === 'practice'
                    ? 'bg-[#282622] text-white shadow-sm font-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Practice &amp; Drills
              </button>
            </div>
          </div>

          {/* TAB 1: MASTER MOVES (Database continuation stats) */}
          {activeTab === 'moves' && (
            <div className="flex-1 flex flex-col justify-between gap-2 min-h-0 overflow-hidden">
              <div className="flex items-center justify-between bg-[#141311] px-2.5 py-1.5 rounded-lg border border-white/5 shrink-0 text-xs">
                <span className="text-zinc-300 font-bold truncate">
                  {masterResult?.opening?.name || selectedDossier.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  {isLoadingMaster ? (
                    <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-400">
                      {masterResult?.totalGames ? `${(masterResult.totalGames / 1000).toFixed(0)}k games` : 'Theory'}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto pr-0.5 flex flex-col gap-1">
                <div className="grid grid-cols-12 text-[10px] uppercase font-bold text-zinc-500 px-2 py-1 border-b border-white/5">
                  <span className="col-span-3">Move</span>
                  <span className="col-span-3 text-right pr-2">Games</span>
                  <span className="col-span-6 text-center">W / D / B</span>
                </div>

                {masterResult?.moves && masterResult.moves.length > 0 ? (
                  masterResult.moves.map((m) => (
                    <button
                      key={`master-${m.san}-${m.uci}`}
                      onClick={() => handlePlayMasterMove(m.san)}
                      className="grid grid-cols-12 items-center px-2 py-1.5 rounded hover:bg-white/5 transition cursor-pointer text-left group"
                      title={`Play ${m.san} (${m.total} games)`}
                    >
                      <span className="col-span-3 font-mono font-bold text-xs text-white group-hover:text-emerald-400">
                        {m.san}
                      </span>
                      <span className="col-span-3 text-right pr-2 font-mono tabular-nums text-[10px] text-zinc-400">
                        {m.total >= 1000000 ? `${(m.total / 1000000).toFixed(1)}M` : m.total >= 1000 ? `${Math.round(m.total / 1000)}k` : m.total}
                      </span>
                      <div className="col-span-6 flex h-3.5 rounded overflow-hidden text-[8px] font-bold font-mono">
                        {m.whiteWinPct > 0 && (
                          <div style={{ width: `${m.whiteWinPct}%` }} className="bg-slate-200 text-slate-900 flex items-center justify-center">
                            {m.whiteWinPct >= 20 ? `${m.whiteWinPct}%` : ''}
                          </div>
                        )}
                        {m.drawPct > 0 && (
                          <div style={{ width: `${m.drawPct}%` }} className="bg-slate-500 text-white flex items-center justify-center">
                            {m.drawPct >= 20 ? `${m.drawPct}%` : ''}
                          </div>
                        )}
                        {m.blackWinPct > 0 && (
                          <div style={{ width: `${m.blackWinPct}%` }} className="bg-zinc-800 text-zinc-300 flex items-center justify-center">
                            {m.blackWinPct >= 20 ? `${m.blackWinPct}%` : ''}
                          </div>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-500">
                    No further master moves for this position.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STRATEGY & IDEAS (Plans, Pawn Breaks, Coach Advice) */}
          {activeTab === 'strategy' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto">
              {/* Grandmaster Plan */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Grandmaster Strategic Plan
                </span>
                <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 text-xs text-zinc-300 leading-relaxed">
                  {selectedDossier.bestCounterOpening.whyItWorks}
                </div>
              </div>

              {/* Key Pawn Breaks */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Critical Pawn Breaks
                </span>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-[#141311] border border-white/5">
                  {selectedDossier.bestCounterOpening.keyPawnBreaks.map((pb, idx) => (
                    <span
                      key={`break-${pb}-${idx}`}
                      className="text-xs font-mono font-bold bg-[#1f1d19] text-amber-300 px-2 py-0.5 rounded border border-amber-500/20"
                    >
                      {pb}
                    </span>
                  ))}
                </div>
              </div>

              {/* Tactical Motifs & Coach Danny Advice */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Coach Danny Tactical Advice
                </span>
                <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-start gap-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    {coachFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRACTICE & DRILLS (Main Line, Counter-Play, Traps) */}
          {activeTab === 'practice' && (
            <div className="flex-1 flex flex-col justify-between gap-2.5 min-h-0 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Choose a Drill Mission
                </span>

                <div className="grid grid-cols-2 gap-1.5">
                  {/* Main Line Drill Button */}
                  <button
                    onClick={() => handleStartPractice('main')}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      drillMode === 'main' && drillStatus === 'practicing'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-[#141311] border-white/5 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <Play className="w-3 h-3 text-emerald-400" />
                      <span>Practice Main Line</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Standard book moves</span>
                  </button>

                  {/* Counter-Play Drill Button */}
                  <button
                    onClick={() => handleStartPractice('counter')}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col gap-0.5 ${
                      drillMode === 'counter' && drillStatus === 'practicing'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-[#141311] border-white/5 text-zinc-300 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-1 text-[11px] font-bold">
                      <Shield className="w-3 h-3 text-amber-400" />
                      <span>Practice Counter</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">Neutralize &amp; break</span>
                  </button>
                </div>

                {/* Trap / Checkmate Line Banner if available */}
                {selectedDossier.trapLine && (
                  <button
                    onClick={() => handleStartPractice('trap')}
                    className={`p-2 rounded-lg border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      drillMode === 'trap' && drillStatus === 'practicing'
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : 'bg-[#1f1614] border-rose-900/30 text-rose-300 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="w-4 h-4 text-rose-400 shrink-0" />
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">
                          {selectedDossier.trapLine.name}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {selectedDossier.trapLine.goal === 'checkmate' ? 'Delivers forced checkmate' : 'Wins decisive material'}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                      Drill Trap
                    </span>
                  </button>
                )}
              </div>

              {/* Active Practice Feedback Banner */}
              <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-start gap-2 text-xs">
                {drillStatus === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase text-zinc-400">
                    {drillStatus === 'practicing'
                      ? `Step ${drillIndex + 1} of ${activeTree.length}`
                      : drillStatus === 'completed'
                      ? 'Drill Completed!'
                      : 'Interactive Drill Status'}
                  </span>
                  <p className="text-[11px] text-zinc-300 leading-snug">
                    {coachFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Quick Switcher Strip for Famous Openings & Gambits */}
          <div className="pt-2 border-t border-white/5 flex flex-col gap-1 shrink-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
              Famous Gambits &amp; Openings
            </span>
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
              {FAMOUS_OPENINGS.map((op) => (
                <button
                  key={`famous-${op.id}`}
                  onClick={() => {
                    const dossier = OpeningCounterEngine.getDossierByEco(op.eco) || OpeningCounterEngine.getDossierByEco(op.name);
                    if (dossier) loadOpeningDossier(dossier);
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedDossier.eco === op.eco
                      ? 'bg-white/15 text-white font-black'
                      : 'bg-[#141311] text-zinc-400 hover:text-white'
                  }`}
                >
                  {op.isGambit ? `⚔️ ${op.name}` : op.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. CATALOG MODAL / DRAWER (Searchable 3,865+ Openings without losing the board) */}
      {isCatalogOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
          <div className="w-full max-w-3xl max-h-[85dvh] bg-[#1a1815] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-3.5 border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-black text-white">
                  Browse 3,865+ Openings &amp; Gambits
                </h3>
              </div>
              <button
                onClick={() => setIsCatalogOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input & Category Pills */}
            <div className="p-3 bg-[#141311] border-b border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shrink-0">
              <div className="flex-1 relative flex items-center">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name, moves, or ECO (e.g. Stafford, Sicilian, Italian, C50)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#1c1a17] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#1c1a17] p-0.5 border border-white/5 rounded-lg overflow-x-auto">
                {(['all', 'gambit', '1.e4', '1.d4', 'flank'] as const).map((cat) => (
                  <button
                    key={`cat-${cat}`}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      categoryFilter === cat
                        ? 'bg-[#282622] text-white font-black shadow-sm'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {cat === 'all' ? 'All (3.8k)' : cat === 'gambit' ? '⚔️ Gambits' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Openings Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {ecoSearchResults.items.map((op, idx) => {
                  const isSelected = selectedDossier.eco === op.eco && selectedDossier.name === op.name;
                  const isGambitItem = op.name.toLowerCase().includes('gambit') || op.name.toLowerCase().includes('counter');
                  return (
                    <button
                      key={`eco-${op.eco}-${op.name}-${idx}`}
                      onClick={() => handleSelectEcoOpening(op)}
                      className={`p-2.5 rounded-xl bg-[#141311] border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer hover:border-emerald-500/50 hover:bg-[#1c1a17] ${
                        isSelected ? 'border-emerald-500 ring-1 ring-emerald-500/30' : 'border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-[#24221d] px-1.5 py-0.5 rounded border border-white/5">
                          {op.eco}
                        </span>
                        {isGambitItem && (
                          <span className="text-[9px] font-mono font-bold bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded">
                            Gambit
                          </span>
                        )}
                      </div>

                      <div className="w-full">
                        <h4 className="text-xs font-bold text-white truncate" title={op.name}>
                          {op.name}
                        </h4>
                        <p className="font-mono text-[10px] text-zinc-400 truncate" title={op.moves}>
                          {op.moves}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {catalogLimit < ecoSearchResults.total && (
                <div className="flex items-center justify-center py-3">
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="md"
                    onClick={() => setCatalogLimit((prev) => prev + 48)}
                    className="font-bold text-xs"
                  >
                    Load More ({catalogLimit} of {ecoSearchResults.total})
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
