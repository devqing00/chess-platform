'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OPENINGS_DATABASE } from '@/lib/openingsData';
import { OpeningInfo, BoardTheme, PieceTheme, PieceColor, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { useShell } from '@/context/ShellContext';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Trophy,
  Sparkles,
  Layers,
  Flame,
  Swords,
  Microscope,
  Compass,
  CheckCircle2,
  AlertCircle,
  Play,
  Pause,
  Target,
  Bot,
  Lightbulb,
  ExternalLink,
  GraduationCap,
  HelpCircle,
  Puzzle,
} from 'lucide-react';

interface MasterMoveStats {
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

interface MasterGameRecord {
  id: string;
  white: { name: string; rating: number; title?: string };
  black: { name: string; rating: number; title?: string };
  year: number;
  event: string;
  result: '1-0' | '1/2-1/2' | '0-1';
}

interface ExplorerData {
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

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  tier?: MembershipTier;
}

type OpeningCategory = 'all' | 'e4' | 'd4' | 'flank' | 'gambit';
type StudioMode = 'explore' | 'walkthrough' | 'drill';

// Move annotation lookup to explain why specific opening moves are played
const MOVE_ANNOTATIONS: Record<string, string> = {
  'e4': 'Controls the d5 and f5 squares and opens diagonals for the queen and light-squared bishop.',
  'e5': 'Directly challenges White’s central space claim and establishes symmetrical center equality.',
  'Nf3': 'Develops kingside knight to its most active square, pressures the e5 pawn, and prepares early kingside castling.',
  'Nc6': 'Develops knight naturally while protecting the attacked e5 pawn.',
  'Bb5': 'The signature Ruy Lopez move. White pins or threatens to eliminate the defender of e5, building long-term pressure.',
  'Nf6': 'The Berlin Defense / Petrov idea: counter-attacks White’s e4 pawn rather than passive defense.',
  'Bc4': 'The Italian Game: rapidly develops the bishop directly targeting Black’s vulnerable f7 square.',
  'Bc5': 'Giuoco Piano: develops the bishop actively outside the pawn chain before committing central pawns.',
  'd4': 'White directly strikes at the center, contesting spatial supremacy and opening queenside diagonals.',
  'exd4': 'Black accepts the central challenge and liquidates White’s pawn.',
  'c5': 'The Sicilian Defense: asymmetrical counter-strike fighting for the d4 square from the flank.',
  'e6': 'The French Defense: establishes a solid pawn wedge preparing the ...d5 central counter-punch.',
  'c6': 'The Caro-Kann Defense: solidifies ...d5 without trapping the light-squared bishop behind pawns.',
  'c4': 'The English Opening / Queen’s Gambit: controls d5 from the flank while keeping open piece pathways.',
};

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
  tier: propTier,
}) => {
  const router = useRouter();
  const { membershipTier } = useShell();
  const effectiveTier = propTier || membershipTier || 'diamond';

  // Mode state: Explore / Walkthrough / Drill
  const [studioMode, setStudioMode] = useState<StudioMode>('explore');
  const [showTipsModal, setShowTipsModal] = useState(false);

  // Board and Navigation History
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fenHistory, setFenHistory] = useState<string[]>([
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [orientation, setOrientation] = useState<PieceColor>('w');

  // Filter & Catalog
  const [selectedCategory, setSelectedCategory] = useState<OpeningCategory>('all');
  const [activeTab, setActiveTab] = useState<'moves' | 'strategy' | 'games' | 'catalog'>('moves');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpening, setSelectedOpening] = useState<OpeningInfo | null>(OPENINGS_DATABASE[0]);
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Walkthrough Auto-play
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  // Drill Mode State
  const [drillSide, setDrillSide] = useState<PieceColor>('w');
  const [drillStepIdx, setDrillStepIdx] = useState(0);
  const [drillStatus, setDrillStatus] = useState<'idle' | 'correct' | 'wrong' | 'completed'>('idle');
  const [drillFeedback, setDrillFeedback] = useState<string>('');

  const currentFen = fenHistory[historyIndex] || chess.fen();

  // Parse moves of the currently selected opening
  const openingMovesSequence = useMemo(() => {
    if (!selectedOpening) return [];
    return selectedOpening.moves
      .replace(/\d+\./g, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
  }, [selectedOpening]);

  // Fetch opening explorer data for current board state
  const fetchExplorerData = useCallback(async (fen: string, ply: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/openings/explorer?fen=${encodeURIComponent(fen)}&tier=${effectiveTier}&ply=${ply}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setExplorerData(json.data);
          if (json.data.opening?.name) {
            const matched = OPENINGS_DATABASE.find(
              (o) =>
                o.eco === json.data.opening.eco ||
                o.name.toLowerCase().includes(json.data.opening.name.toLowerCase())
            );
            if (matched) {
              setSelectedOpening(matched);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch explorer data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveTier]);

  useEffect(() => {
    fetchExplorerData(currentFen, historyIndex);
  }, [currentFen, historyIndex, fetchExplorerData]);

  // Execute a move on the board
  const executeMove = useCallback((sanOrUci: string) => {
    try {
      const currentChess = new Chess(fenHistory[historyIndex]);
      const result = currentChess.move(sanOrUci);
      if (!result) return;

      const newFen = currentChess.fen();
      const newFenHistory = [...fenHistory.slice(0, historyIndex + 1), newFen];
      const newMoveHistory = [...moveHistory.slice(0, historyIndex), result.san];

      setChess(currentChess);
      setFenHistory(newFenHistory);
      setMoveHistory(newMoveHistory);
      setHistoryIndex(newFenHistory.length - 1);

      if (result.captured) soundService.playCapture();
      else if (result.flags.includes('k') || result.flags.includes('q')) soundService.playCastle();
      else soundService.playMove();
    } catch (e) {
      console.error('Invalid move in explorer:', e);
    }
  }, [fenHistory, historyIndex, moveHistory]);

  // Board move handler (drag/click)
  const handleBoardMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (studioMode === 'drill') {
      handleDrillMove(from, to, promotion);
      return;
    }

    try {
      const currentChess = new Chess(fenHistory[historyIndex]);
      const move = currentChess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const newFen = currentChess.fen();
      const newFenHistory = [...fenHistory.slice(0, historyIndex + 1), newFen];
      const newMoveHistory = [...moveHistory.slice(0, historyIndex), move.san];

      setChess(currentChess);
      setFenHistory(newFenHistory);
      setMoveHistory(newMoveHistory);
      setHistoryIndex(newFenHistory.length - 1);

      if (move.captured) soundService.playCapture();
      else soundService.playMove();
    } catch {
      // invalid move
    }
  };

  // Move Stepping Controls
  const stepToStart = () => {
    setHistoryIndex(0);
    setChess(new Chess(fenHistory[0]));
    soundService.playMove();
  };

  const stepBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  const stepForward = () => {
    if (historyIndex < fenHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  const stepToEnd = () => {
    const lastIdx = fenHistory.length - 1;
    setHistoryIndex(lastIdx);
    setChess(new Chess(fenHistory[lastIdx]));
    soundService.playMove();
  };

  // Reset to starting position
  const resetBoard = () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setChess(new Chess(startFen));
    setFenHistory([startFen]);
    setMoveHistory([]);
    setHistoryIndex(0);
    setIsAutoPlaying(false);
    setDrillStatus('idle');
    setDrillFeedback('');
    soundService.playMove();
  };

  // Load opening directly from catalog / chips
  const loadOpening = (opening: OpeningInfo) => {
    setSelectedOpening(opening);
    const c = new Chess();
    const cleaned = opening.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    const newFens = [c.fen()];
    const newMoves: string[] = [];

    for (const move of cleaned) {
      try {
        const res = c.move(move);
        if (res) {
          newFens.push(c.fen());
          newMoves.push(res.san);
        }
      } catch {
        break;
      }
    }

    setChess(c);
    setFenHistory(newFens);
    setMoveHistory(newMoves);
    setHistoryIndex(newFens.length - 1);
    setIsAutoPlaying(false);
    soundService.playMove();

    // Reset drill if active
    if (studioMode === 'drill') {
      startDrillMode(drillSide, opening);
    }
  };

  // Autoplay Walkthrough Line
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setHistoryIndex((prev) => {
        if (prev >= fenHistory.length - 1) {
          setIsAutoPlaying(false);
          return prev;
        }
        const next = prev + 1;
        setChess(new Chess(fenHistory[next]));
        soundService.playMove();
        return next;
      });
    }, 1400);

    return () => clearInterval(interval);
  }, [isAutoPlaying, fenHistory]);

  // Start Interactive Drill Mode
  const startDrillMode = (side: PieceColor, openingToDrill: OpeningInfo | null = selectedOpening) => {
    if (!openingToDrill) return;
    setStudioMode('drill');
    setDrillSide(side);
    setOrientation(side);

    const c = new Chess();
    setChess(c);
    setFenHistory([c.fen()]);
    setMoveHistory([]);
    setHistoryIndex(0);
    setDrillStepIdx(0);
    setDrillStatus('idle');

    const moves = openingToDrill.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);

    // If drilling as Black, White must make the first move automatically
    if (side === 'b' && moves.length > 0) {
      setDrillFeedback(`Opponent playing White's 1. ${moves[0]}...`);
      setTimeout(() => {
        try {
          const res = c.move(moves[0]);
          if (res) {
            setChess(new Chess(c.fen()));
            setFenHistory([c.fen()]);
            setMoveHistory([res.san]);
            setHistoryIndex(0);
            setDrillStepIdx(1);
            setDrillFeedback(`Your turn as Black: Find Black's theoretical move ${Math.floor(1 / 2) + 1}...`);
            soundService.playMove();
          }
        } catch {}
      }, 700);
    } else {
      setDrillFeedback(`Your turn as White: Play White's first move in the ${openingToDrill.name}!`);
    }
  };

  // Handle Drill move execution
  const handleDrillMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (!selectedOpening || drillStatus === 'completed') return;

    const moves = selectedOpening.moves.replace(/\d+\./g, '').trim().split(/\s+/).filter(Boolean);
    const expectedSan = moves[drillStepIdx];

    if (!expectedSan) {
      setDrillStatus('completed');
      setDrillFeedback('🎉 Opening theoretical line completed!');
      return;
    }

    try {
      const clone = new Chess(chess.fen());
      const move = clone.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const isMatch =
        move.san.toLowerCase().replace(/[+#x]/g, '') ===
        expectedSan.toLowerCase().replace(/[+#x]/g, '');

      if (isMatch) {
        soundService.playPuzzleSuccess();
        const nextFens = [...fenHistory, clone.fen()];
        const nextMoves = [...moveHistory, move.san];
        setChess(clone);
        setFenHistory(nextFens);
        setMoveHistory(nextMoves);
        setHistoryIndex(nextFens.length - 1);

        const nextIdx = drillStepIdx + 1;
        setDrillStepIdx(nextIdx);

        if (nextIdx >= moves.length) {
          setDrillStatus('completed');
          setDrillFeedback(`🌟 Mastered! You successfully memorized the ${selectedOpening.name} sequence.`);
          confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
        } else {
          setDrillStatus('correct');
          setDrillFeedback(`Correct! Opponent responding...`);

          // Computer automatically plays opponent continuation
          setTimeout(() => {
            try {
              const compClone = new Chess(clone.fen());
              const compMoveSan = moves[nextIdx];
              const compRes = compClone.move(compMoveSan);
              if (compRes) {
                const compFens = [...nextFens, compClone.fen()];
                const compMoves = [...nextMoves, compRes.san];
                setChess(compClone);
                setFenHistory(compFens);
                setMoveHistory(compMoves);
                setHistoryIndex(compFens.length - 1);
                setDrillStepIdx(nextIdx + 1);
                soundService.playMove();

                if (nextIdx + 1 >= moves.length) {
                  setDrillStatus('completed');
                  setDrillFeedback(`🌟 Line completed! Outstanding knowledge of ${selectedOpening.name}.`);
                  confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
                } else {
                  const turnNum = Math.floor((nextIdx + 1) / 2) + 1;
                  setDrillStatus('idle');
                  setDrillFeedback(`Your turn: Play move ${turnNum} (${drillSide === 'w' ? 'White' : 'Black'}).`);
                }
              }
            } catch {}
          }, 800);
        }
      } else {
        soundService.playPuzzleFail();
        setDrillStatus('wrong');
        setDrillFeedback(`Not in theory. You played ${move.san}, but theory plays ${expectedSan}. Try again!`);
      }
    } catch {
      // invalid move
    }
  };

  // Filtered catalog by category and search
  const filteredCatalog = useMemo(() => {
    return OPENINGS_DATABASE.filter((op) => {
      const matchesSearch =
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.moves.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'e4') {
        return op.moves.startsWith('1. e4') && !op.name.toLowerCase().includes('gambit');
      }
      if (selectedCategory === 'd4') {
        return op.moves.startsWith('1. d4') && !op.name.toLowerCase().includes('gambit');
      }
      if (selectedCategory === 'flank') {
        return (
          op.moves.startsWith('1. c4') ||
          op.moves.startsWith('1. Nf3') ||
          op.moves.startsWith('1. f4') ||
          op.moves.startsWith('1. b3')
        );
      }
      if (selectedCategory === 'gambit') {
        return (
          op.name.toLowerCase().includes('gambit') ||
          op.variation?.toLowerCase().includes('gambit')
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  // Current move annotation explanation
  const currentMoveSan = historyIndex > 0 ? moveHistory[historyIndex - 1] : null;
  const currentMoveNote = currentMoveSan ? MOVE_ANNOTATIONS[currentMoveSan] : null;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5 p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Top Repertoire Quick-Switch Carousel */}
      <div className="bg-[#1a1815] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-2.5 sm:gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white truncate">
              Opening Repertoire ({OPENINGS_DATABASE.length})
            </span>
          </div>

          {/* Tips button */}
          <button
            onClick={() => setShowTipsModal((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer border-2 border-[#f59e0b] shadow-[0_2px_0_0_#92400e] active:translate-y-[1px] active:shadow-none shrink-0"
          >
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Guide</span>
          </button>
        </div>

        {/* Horizontal Quick-Select Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {OPENINGS_DATABASE.slice(0, 12).map((op) => {
            const isSelected = selectedOpening?.name === op.name;
            return (
              <button
                key={op.eco + op.name}
                onClick={() => loadOpening(op)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 shrink-0 border-2 ${
                  isSelected
                    ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] -translate-y-0.5'
                    : 'bg-[#151412] text-zinc-300 hover:text-white border-[#302e2b] shadow-[0_2px_0_0_#141311] hover:border-[#403d38]'
                }`}
              >
                <span className="font-mono text-[10px] opacity-80">{op.eco}</span>
                <span>{op.name.split('(')[0].trim()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable Studio Guide & Tips Panel */}
      {showTipsModal && (
        <div className="bg-[#1f1d1a] border-2 border-amber-500/40 rounded-2xl p-4 shadow-[0_4px_0_0_#78350f] flex flex-col gap-3 text-xs text-zinc-300 animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 border-b-2 border-[#2d2a26]">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-amber-400" />
              <span className="font-black text-white text-xs sm:text-sm uppercase tracking-wider">
                How to Master &amp; Navigate Openings with This Studio
              </span>
            </div>
            <button
              onClick={() => setShowTipsModal(false)}
              className="text-zinc-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#161512] rounded-2xl border-2 border-[#2b2824] shadow-inner flex flex-col gap-1">
              <span className="font-black text-white flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <Layers className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>1. Explore the Tree</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Click any continuation move in the master table to navigate deeper into theoretical branches with win percentages from 2M+ master games.
              </p>
            </div>
            <div className="p-3.5 bg-[#161512] rounded-2xl border-2 border-[#2b2824] shadow-inner flex flex-col gap-1">
              <span className="font-black text-white flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                <span>2. Step-by-Step Walkthrough</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Click &quot;Guided Walkthrough&quot; to study the opening move-by-move. Each move highlights why it is played and its central strategic idea.
              </p>
            </div>
            <div className="p-3.5 bg-[#161512] rounded-2xl border-2 border-[#2b2824] shadow-inner flex flex-col gap-1">
              <span className="font-black text-white flex items-center gap-1.5 uppercase tracking-wider text-xs">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>3. Memory Drill &amp; Practice</span>
              </span>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Switch to &quot;Drill Line&quot; to test your active recall. Play moves against the computer to solidify your opening repertoire memory.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 xl:gap-8 items-center lg:items-start justify-center max-w-7xl mx-auto w-full">
        {/* Left Column: Interactive Board + Stepper + Practice Actions */}
        <div className="flex flex-col items-center gap-3 shrink-0 w-full max-w-[min(100vw-2rem,_560px)] lg:max-w-[460px] xl:max-w-[490px] 2xl:max-w-[530px] mx-auto lg:mx-0">
          {/* Tactile Mode Switcher Tabs - Uniform balanced p-1.5 padding without excessive bottom void */}
          <div className="w-full grid grid-cols-3 gap-1 sm:gap-1.5 bg-[#141311] p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border-2 border-[#2b2824] shadow-[0_2px_0_0_#0f0e0c]">
            <button
              onClick={() => {
                setStudioMode('explore');
                setIsAutoPlaying(false);
              }}
              className={`py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-2 ${
                studioMode === 'explore'
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => {
                setStudioMode('walkthrough');
                if (selectedOpening) loadOpening(selectedOpening);
              }}
              className={`py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-2 ${
                studioMode === 'walkthrough'
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Walkthrough</span>
              <span className="xs:hidden inline">Guide</span>
            </button>
            <button
              onClick={() => {
                if (selectedOpening) startDrillMode(orientation, selectedOpening);
              }}
              className={`py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer border-2 ${
                studioMode === 'drill'
                  ? 'bg-amber-500 text-white border-amber-700 shadow-[0_2px_0_0_#b45309] active:translate-y-[1px] active:shadow-none'
                  : 'text-zinc-400 hover:text-white border-transparent'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Drill</span>
            </button>
          </div>

          {/* Chessboard Container */}
          <div className="w-full aspect-square shadow-2xl rounded-2xl overflow-hidden border border-[#302d29]">
            <ChessBoard
              chess={chess}
              orientation={orientation}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              onMove={handleBoardMove}
              disabled={studioMode === 'drill' && drillStatus === 'completed'}
            />
          </div>

          {/* Stepper Toolbar */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 w-full bg-[#1e1c19] px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#2d2a26] text-xs shadow-md">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={stepToStart}
                disabled={historyIndex === 0}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Move"
              >
                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={stepBack}
                disabled={historyIndex === 0}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Step Back"
              >
                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {studioMode === 'walkthrough' && (
                <button
                  onClick={() => setIsAutoPlaying((prev) => !prev)}
                  className="px-2 sm:px-2.5 py-1 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white font-bold transition-all cursor-pointer flex items-center gap-1 text-[11px] sm:text-xs"
                  title={isAutoPlaying ? 'Pause Walkthrough' : 'Auto Play Line'}
                >
                  {isAutoPlaying ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />}
                  <span>{isAutoPlaying ? 'Pause' : 'Play'}</span>
                </button>
              )}

              <button
                onClick={stepForward}
                disabled={historyIndex >= fenHistory.length - 1}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Step Forward"
              >
                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={stepToEnd}
                disabled={historyIndex >= fenHistory.length - 1}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Move"
              >
                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={resetBoard}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Reset Board"
              >
                <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0">
              <span className="text-zinc-400 font-mono text-[10px] sm:text-[11px]">
                Move {historyIndex === 0 ? 'Start' : Math.ceil(historyIndex / 2)} ({historyIndex}/{fenHistory.length - 1})
              </span>
              <button
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="px-1.5 sm:px-2 py-1 rounded-lg bg-[#272522] hover:bg-[#34312b] text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-bold text-[10px] sm:text-[11px]"
                title="Flip Board Orientation"
              >
                <ArrowUpDown className="w-3 h-3" />
                <span>{orientation === 'w' ? 'White' : 'Black'}</span>
              </button>
            </div>
          </div>

          {/* Drill Status Banner (When in Drill Mode) */}
          {studioMode === 'drill' && (
            <div
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                drillStatus === 'completed'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : drillStatus === 'wrong'
                  ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                  : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {drillStatus === 'completed' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : drillStatus === 'wrong' ? (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                ) : (
                  <Target className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span className="font-bold">{drillFeedback}</span>
              </div>
              <button
                onClick={() => startDrillMode(drillSide, selectedOpening)}
                className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white text-[10px] font-bold cursor-pointer transition"
              >
                Restart Drill
              </button>
            </div>
          )}

          {/* Active Move Explanation Ribbon */}
          {currentMoveSan && currentMoveNote && (
            <div className="w-full bg-[#1b1916] border border-[#2d2a26] rounded-xl p-3 text-xs text-zinc-300 shadow-md">
              <strong className="text-[#81b64c] block mb-0.5 font-bold font-mono">
                {Math.floor(historyIndex / 2) + (historyIndex % 2 === 1 ? 1 : 0)}. {currentMoveSan}
              </strong>
              <span>{currentMoveNote}</span>
            </div>
          )}

          {/* Practice Action CTAs & Cross-Page Hub Bridges */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              onClick={() => router.push(`/analysis?fen=${encodeURIComponent(currentFen)}`)}
              className="py-2.5 px-3 rounded-xl bg-[#25221e] hover:bg-[#302c27] border-2 border-[#38342d] hover:border-[#06b6d4] text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Deep calculate this position in Analysis Studio"
            >
              <Microscope className="w-3.5 h-3.5 text-cyan-400" />
              <span>Analysis</span>
            </button>

            <button
              onClick={() => router.push(`/bots?fen=${encodeURIComponent(currentFen)}`)}
              className="py-2.5 px-3 rounded-xl bg-[#25221e] hover:bg-[#302c27] border-2 border-[#38342d] hover:border-amber-500 text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Spar against adaptive bot from this opening"
            >
              <Bot className="w-3.5 h-3.5 text-amber-400" />
              <span>Spar Bot</span>
            </button>

            <button
              onClick={() => {
                if (selectedOpening) {
                  startDrillMode(orientation === 'w' ? 'b' : 'w', selectedOpening);
                }
              }}
              className="py-2.5 px-3 rounded-xl bg-[#25221e] hover:bg-[#302c27] border-2 border-[#38342d] hover:border-[#81b64c] text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <Target className="w-3.5 h-3.5 text-[#81b64c]" />
              <span>Drill Opponent</span>
            </button>

            <button
              onClick={() => router.push('/puzzles')}
              className="py-2.5 px-3 rounded-xl bg-[#25221e] hover:bg-[#302c27] border-2 border-[#38342d] hover:border-amber-500 text-zinc-200 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
              title="Practice tactical puzzles in this theme"
            >
              <Puzzle className="w-3.5 h-3.5 text-amber-400" />
              <span>Tactics</span>
            </button>
          </div>
        </div>

        {/* Right Column: Opening Intelligence Hub */}
        <div className="flex-1 w-full max-w-[min(100vw-2rem,_560px)] lg:max-w-[540px] xl:max-w-[620px] flex flex-col gap-4 mx-auto lg:mx-0">
          {/* Active Opening Overview Card */}
          {selectedOpening && (
            <div className="bg-[#1e1c19] border-2 border-[#35322b] rounded-xl sm:rounded-2xl p-3.5 sm:p-4 shadow-[0_4px_0_0_#141311] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b-2 border-[#2d2a26]">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-black bg-[#161512] text-[#81b64c] px-2 py-0.5 rounded-full border-2 border-[#33302b] shrink-0">
                      {selectedOpening.eco}
                    </span>
                    <h2 className="text-sm sm:text-base font-black text-white truncate">{selectedOpening.name}</h2>
                  </div>
                  {selectedOpening.variation && (
                    <span className="text-xs text-amber-400 font-bold mt-0.5 truncate">
                      {selectedOpening.variation}
                    </span>
                  )}
                  <span className="text-[11px] sm:text-xs font-mono text-zinc-400 mt-1 font-medium break-all sm:break-normal">
                    Theoretical Line: <strong className="text-zinc-200">{selectedOpening.moves}</strong>
                  </span>
                </div>

                <button
                  onClick={() => {
                    startDrillMode('w', selectedOpening);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl sm:rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none shrink-0"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Drill Line</span>
                </button>
              </div>

              {/* Master Win-Rate Statistics Bar */}
              <div className="flex flex-col gap-1.5 bg-[#161512] p-2.5 rounded-xl border border-[#282522]">
                <div className="flex justify-between text-[10px] sm:text-[11px] font-bold">
                  <span className="text-white">White {selectedOpening.whiteWinPct}%</span>
                  <span className="text-zinc-400">Draw {selectedOpening.drawPct}%</span>
                  <span className="text-zinc-400">Black {selectedOpening.blackWinPct}%</span>
                </div>
                <div className="h-2 w-full bg-[#12110f] rounded-full overflow-hidden flex shadow-inner">
                  <div
                    style={{ width: `${selectedOpening.whiteWinPct}%` }}
                    className="bg-white h-full"
                  />
                  <div
                    style={{ width: `${selectedOpening.drawPct}%` }}
                    className="bg-zinc-500 h-full"
                  />
                  <div
                    style={{ width: `${selectedOpening.blackWinPct}%` }}
                    className="bg-zinc-800 h-full"
                  />
                </div>
                <span className="text-[10px] text-zinc-500 font-mono text-right">
                  {selectedOpening.totalGames.toLocaleString()} Master Games Indexed
                </span>
              </div>

              {/* Strategic Explanation */}
              {selectedOpening.description && (
                <p className="text-xs text-zinc-300 leading-relaxed bg-[#24221e] p-3 rounded-xl border border-[#302d28]">
                  {selectedOpening.description}
                </p>
              )}

              {/* Strategic Ideas Badges */}
              {selectedOpening.keyIdeas && selectedOpening.keyIdeas.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-[#81b64c]" />
                    <span>Key Plans &amp; Strategic Themes</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedOpening.keyIdeas.map((idea, i) => (
                      <span
                        key={i}
                        className="text-[11px] sm:text-xs bg-[#252320] text-zinc-200 border border-[#36332d] px-2.5 py-1 rounded-lg font-medium"
                      >
                        {idea}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Master Moves & Search Catalog Tabs */}
          <div className="bg-[#1e1c19] border border-[#2d2a26] rounded-xl sm:rounded-2xl overflow-hidden shadow-xl flex flex-col h-[380px]">
            <div className="flex bg-[#181614] border-b border-[#2d2a26] px-1 sm:px-2 text-xs font-bold overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('moves')}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'moves'
                    ? 'border-[#81b64c] text-white bg-[#22201d]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Continuations ({explorerData?.moves?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'catalog'
                    ? 'border-[#81b64c] text-white bg-[#22201d]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Catalog ({filteredCatalog.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'games'
                    ? 'border-[#81b64c] text-white bg-[#22201d]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Master Games ({explorerData?.topGames?.length || 0})</span>
              </button>
            </div>

            {/* Tab 1: Master Continuations */}
            {activeTab === 'moves' && (
              <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
                {explorerData?.moves && explorerData.moves.length > 0 ? (
                  explorerData.moves.map((m) => (
                    <div
                      key={m.san}
                      onClick={() => executeMove(m.san)}
                      className="p-2.5 sm:p-3 hover:bg-[#262420] transition-colors cursor-pointer flex items-center justify-between group gap-2"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="font-mono font-black text-sm text-white group-hover:text-[#81b64c] transition-colors w-10 sm:w-12 shrink-0">
                          {m.san}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-semibold text-zinc-300 truncate">
                            {m.openingName || 'Theoretical continuation'}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500 truncate">
                            {m.total.toLocaleString()} games &bull; Avg {m.averageRating}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="flex flex-col items-end gap-1">
                          <div className="w-16 sm:w-24 h-2 bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
                            <div
                              style={{ width: `${m.whiteWinPct}%` }}
                              className="bg-white h-full"
                            />
                            <div
                              style={{ width: `${m.drawPct}%` }}
                              className="bg-zinc-500 h-full"
                            />
                            <div
                              style={{ width: `${m.blackWinPct}%` }}
                              className="bg-zinc-800 h-full"
                            />
                          </div>
                          <div className="flex gap-1 sm:gap-1.5 text-[9px] font-mono text-zinc-400">
                            <span className="text-white">{m.whiteWinPct}%</span>
                            <span>{m.drawPct}%</span>
                            <span className="text-zinc-400">{m.blackWinPct}%</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No further book moves for this position. Select an opening from the catalog or step back!
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Full Catalog Directory */}
            {activeTab === 'catalog' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 bg-[#191815] border-b border-[#2d2a26] flex items-center gap-2">
                  <Search className="w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Search openings (e.g. Sicilian, Queen’s Gambit, French)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                  />
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
                  {filteredCatalog.map((op) => (
                    <button
                      key={op.eco + op.name}
                      onClick={() => loadOpening(op)}
                      className={`w-full text-left p-3 hover:bg-[#262420] transition-colors cursor-pointer flex items-center justify-between ${
                        selectedOpening?.name === op.name ? 'bg-[#262420]' : ''
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white truncate">{op.name}</span>
                          {op.variation && (
                            <span className="text-[10px] text-amber-400 truncate">({op.variation})</span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400 line-clamp-1 mt-0.5">
                          {op.moves}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[#81b64c] bg-[#161512] px-2 py-0.5 rounded border border-[#2d2a26] shrink-0 ml-2">
                        {op.eco}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Master Games */}
            {activeTab === 'games' && (
              <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
                {explorerData?.topGames && explorerData.topGames.length > 0 ? (
                  explorerData.topGames.map((g) => (
                    <div
                      key={g.id}
                      className="p-3 hover:bg-[#262420] transition-colors flex items-center justify-between"
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-bold text-white">
                          <span>{g.white.name} ({g.white.rating})</span>
                          <span className="text-zinc-500 font-mono text-[10px]">vs</span>
                          <span>{g.black.name} ({g.black.rating})</span>
                        </div>
                        <span className="text-[10px] text-zinc-400 mt-0.5">
                          {g.event} &bull; {g.year}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                          g.result === '1-0'
                            ? 'bg-white/10 text-white'
                            : g.result === '0-1'
                            ? 'bg-zinc-800 text-zinc-200'
                            : 'bg-zinc-700/40 text-zinc-300'
                        }`}
                      >
                        {g.result}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No top master games indexed directly for this specific position.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
