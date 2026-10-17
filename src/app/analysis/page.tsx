'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { BoardTheme, PieceTheme, PieceColor, ArrowAnnotation, GameSession, MoveRecord } from '@/types/chess';
import { GameSessionStore, parsePgnToMoveRecords } from '@/lib/gameSessionStore';
import { matchOpeningFromMoves } from '@/lib/openingsData';
import { useRouter } from 'next/navigation';
import {
  Award,
  RotateCcw,
  ArrowUpDown,
  Cpu,
  Database,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Check,
  Play,
  Pause,
  Loader2,
  Sparkles,
  ShieldAlert,
  Upload,
  X,
  FileText,
  AlertTriangle,
  Bot,
  BookOpen,
  FolderOpen,
  Eye,
  EyeOff,
  HelpCircle,
  PlayCircle,
  MoreVertical,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';
import { useShell } from '@/context/ShellContext';

interface MultiPvLine {
  rank: number;
  scoreCp: number;
  mateIn?: number;
  scoreFormatted: string;
  bestMoveUci: string;
  bestMoveSan: string;
  pvSan: string[];
}

interface TablebaseInfo {
  isTablebase: boolean;
  pieceCount: number;
  category?: 'win' | 'loss' | 'draw' | 'cursed-win' | 'blessed-loss';
  dtz?: number | null;
  humanDescription: string;
  bestMoveSan?: string;
}

export default function AnalysisPage() {
  const router = useRouter();
  const { boardTheme, pieceTheme } = useShell();
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [mobileView, setMobileView] = useState<'board' | 'lines'>('board');

  // Deep-link position parser (e.g. from Openings, Puzzles, or Review)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const gameIdParam = search.get('gameId');
    const movesParam = search.get('moves');
    const plyParam = search.get('ply');
    const fenParam = search.get('fen');
    const pgnParam = search.get('pgn');

    // 1. High-fidelity Game / Moves Deep Link (e.g. from Game Review "Deep Studio")
    if (gameIdParam || movesParam) {
      let movesList: string[] = [];
      let isUserBlack = false;

      if (gameIdParam) {
        const session = GameSessionStore.getSession(gameIdParam);
        if (session) {
          if (session.moves && session.moves.length > 0) {
            movesList = session.moves.map((m) => m.san);
          } else if (session.pgn) {
            const records = parsePgnToMoveRecords(session.pgn);
            movesList = records.map((m) => m.san);
          }
          isUserBlack =
            session.blackPlayer?.name?.toLowerCase().includes('you') ||
            (!session.blackPlayer?.isBot && Boolean(session.whitePlayer?.isBot));
        }
      }

      if (movesList.length === 0 && movesParam) {
        try {
          const decodedMoves = decodeURIComponent(movesParam).trim();
          movesList = decodedMoves.split(/\s+/).filter(Boolean);
        } catch {}
      }

      if (movesList.length > 0) {
        const runner = new Chess();
        const fens = [runner.fen()];
        const sans: string[] = [];
        for (const s of movesList) {
          try {
            const m = runner.move(s);
            if (!m) break;
            fens.push(runner.fen());
            sans.push(m.san);
          } catch {
            break;
          }
        }

        setHistoryFens(fens);
        setSanHistory(sans);

        // Jump to target ply if specified (e.g. Move 7 blunder position), otherwise default to turning point
        let targetIndex = fens.length - 1;
        if (plyParam !== null) {
          const parsedPly = parseInt(plyParam, 10);
          if (!isNaN(parsedPly) && parsedPly >= 0 && parsedPly < fens.length) {
            targetIndex = parsedPly;
          }
        } else if (fens.length > 2) {
          // If the last move was checkmate, place board at the position before checkmate so user can analyze alternatives
          targetIndex = fens.length - 2;
        }

        setHistoryIndex(targetIndex);
        const activeChess = new Chess(fens[targetIndex]);
        setChess(activeChess);
        setOrientation(isUserBlack ? 'b' : 'w');
        return;
      }
    }

    // 2. FEN Deep Link (e.g. from Puzzles / Openings)
    if (fenParam) {
      try {
        const decoded = decodeURIComponent(fenParam);
        const newChess = new Chess(decoded);
        setChess(newChess);
        setHistoryFens([newChess.fen()]);
        setSanHistory([]);
        setHistoryIndex(0);
        setOrientation(newChess.turn());
      } catch (e) {
        console.warn('Could not parse FEN parameter:', e);
      }
    } else if (pgnParam) {
      try {
        const decoded = decodeURIComponent(pgnParam);
        const newChess = new Chess();
        newChess.loadPgn(decoded);
        setChess(newChess);
        const history = newChess.history({ verbose: true });
        const runner = new Chess();
        const fens = [runner.fen()];
        const sans: string[] = [];
        for (const m of history) {
          runner.move(m);
          fens.push(runner.fen());
          sans.push(m.san);
        }
        setHistoryFens(fens);
        setSanHistory(sans);
        setHistoryIndex(fens.length - 1);
      } catch (e) {
        console.warn('Could not parse PGN parameter:', e);
      }
    }
  }, []);

  // Engine evaluation states
  const [isEngineActive, setIsEngineActive] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [targetDepth, setTargetDepth] = useState<number>(14);
  const [currentEvalScore, setCurrentEvalScore] = useState<number>(20);
  const [currentEvalFormatted, setCurrentEvalFormatted] = useState<string>('+0.20');
  const [pvLines, setPvLines] = useState<MultiPvLine[]>([]);
  const [engineDepth, setEngineDepth] = useState<number>(0);
  const [nodesCount, setNodesCount] = useState<number>(0);
  const [tablebaseInfo, setTablebaseInfo] = useState<TablebaseInfo | null>(null);

  // Move history for step back/forward
  const [historyFens, setHistoryFens] = useState<string[]>([new Chess().fen()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [sanHistory, setSanHistory] = useState<string[]>([]);
  const [copiedFen, setCopiedFen] = useState(false);

  // Visual features
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [hoveredPvUci, setHoveredPvUci] = useState<string | null>(null);
  const [showHelpBanner, setShowHelpBanner] = useState(false);

  // Threat analysis
  const [threatInfo, setThreatInfo] = useState<{
    threatMoveSan: string;
    description: string;
    severity: string;
    arrow: ArrowAnnotation | null;
  } | null>(null);
  const [isDetectingThreat, setIsDetectingThreat] = useState(false);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isRecentGamesModalOpen, setIsRecentGamesModalOpen] = useState(false);
  const [recentGamesList, setRecentGamesList] = useState<GameSession[]>([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load recent games when opening modal
  const handleOpenRecentGamesModal = () => {
    try {
      const list = GameSessionStore.listRecentSessions();
      setRecentGamesList(list || []);
    } catch {
      setRecentGamesList([]);
    }
    setIsRecentGamesModalOpen(true);
  };

  // Fetch engine evaluation from backend API
  const fetchEngineEval = useCallback(async (fen: string, depth: number) => {
    if (!isEngineActive) return;
    setIsEvaluating(true);
    setThreatInfo(null); // clear old threat on new position
    try {
      const res = await fetch('/api/engine/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen, depth, multiPv: 3 }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCurrentEvalScore(json.data.scoreCp);
          setCurrentEvalFormatted(json.data.scoreFormatted);
          setPvLines(json.data.lines || []);
          setEngineDepth(json.data.depth);
          setNodesCount(json.data.nodes);
          setTablebaseInfo(json.data.tablebase || null);
        }
      }
    } catch {
      // Graceful fallback
    } finally {
      setIsEvaluating(false);
    }
  }, [isEngineActive]);

  const handleDetectThreat = async () => {
    setIsDetectingThreat(true);
    try {
      const res = await fetch('/api/engine/threat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: chess.fen() }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.threat) {
          setThreatInfo(json.threat);
        }
      }
    } catch {
      //
    } finally {
      setIsDetectingThreat(false);
    }
  };

  const handleImportSubmit = async () => {
    const raw = importText.trim();
    if (!raw) return;
    setImportError(null);

    // Check if FEN
    const fenTokens = raw.split(/\s+/);
    if (fenTokens.length >= 2 && /[prnbqkPRNBQK1-8\/]+/.test(fenTokens[0])) {
      try {
        const newChess = new Chess(raw);
        setChess(newChess);
        setHistoryFens([newChess.fen()]);
        setSanHistory([]);
        setHistoryIndex(0);
        setLastMove(null);
        setIsImportModalOpen(false);
        setImportText('');
        soundService.playGameStart();
        return;
      } catch {
        // Not a valid FEN, try PGN
      }
    }

    // Try PGN import via API
    try {
      const res = await fetch('/api/pgn/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pgn: raw }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.moves?.length > 0) {
          const runner = new Chess();
          const fens: string[] = [runner.fen()];
          const sans: string[] = [];
          for (const m of json.data.moves) {
            runner.move(m);
            fens.push(runner.fen());
            sans.push(m);
          }
          setChess(runner);
          setHistoryFens(fens);
          setSanHistory(sans);
          setHistoryIndex(fens.length - 1);
          setLastMove(null);
          setIsImportModalOpen(false);
          setImportText('');
          soundService.playGameStart();
          return;
        }
      }
      setImportError('Could not parse valid PGN or FEN');
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  // Load a session from Recent Games modal
  const handleLoadSession = (session: GameSession) => {
    let moves = session.moves;
    if ((!moves || moves.length === 0) && session.pgn) {
      moves = parsePgnToMoveRecords(session.pgn);
    }
    if (!moves || moves.length === 0) return;

    const runner = new Chess();
    const fens: string[] = [runner.fen()];
    const sans: string[] = [];
    for (const m of moves) {
      try {
        const executed = runner.move(m.san);
        if (!executed) break;
        fens.push(runner.fen());
        sans.push(m.san);
      } catch {
        break;
      }
    }

    setChess(runner);
    setHistoryFens(fens);
    setSanHistory(sans);
    setHistoryIndex(fens.length - 1);
    setLastMove(
      moves.length > 0
        ? { from: moves[moves.length - 1].from, to: moves[moves.length - 1].to }
        : null
    );

    const isUserBlack =
      session.blackPlayer?.name?.toLowerCase().includes('qing') ||
      session.blackPlayer?.name?.toLowerCase().includes('you');
    setOrientation(isUserBlack ? 'b' : 'w');

    soundService.playGameStart();
    setIsRecentGamesModalOpen(false);
  };

  // Preset: Load ChiefTbot vs rapid_qing game directly
  const handleLoadChiefTbotGame = () => {
    const runner = new Chess();
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'h6', 'd4', 'exd4', 'Nxd4', 'Nxd4', 'Qxd4', 'd6', 'Qd5', 'c6', 'Qxf7#'];
    const fens: string[] = [runner.fen()];
    const sans: string[] = [];
    for (const s of moves) {
      try {
        runner.move(s);
        fens.push(runner.fen());
        sans.push(s);
      } catch {
        break;
      }
    }
    setChess(runner);
    setHistoryFens(fens);
    setSanHistory(sans);
    // Position at move 7 (ply 13: 7. Qd5 played by White) so user can analyze Black's defense
    setHistoryIndex(13);
    const posAt7 = new Chess(fens[13]);
    setChess(posAt7);
    setOrientation('b');
    soundService.playGameStart();
    setIsRecentGamesModalOpen(false);
  };

  useEffect(() => {
    fetchEngineEval(chess.fen(), targetDepth);
  }, [chess, targetDepth, fetchEngineEval]);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const newFen = chess.fen();
      const updatedHistory = historyFens.slice(0, historyIndex + 1).concat(newFen);
      const updatedSan = sanHistory.slice(0, historyIndex).concat(move.san);

      setHistoryFens(updatedHistory);
      setSanHistory(updatedSan);
      setHistoryIndex(updatedHistory.length - 1);
      setLastMove({ from, to });
      soundService.playMove();
      setChess(new Chess(newFen));
    } catch {
      //
    }
  };

  const jumpToMove = useCallback((idx: number) => {
    if (idx < 0 || idx >= historyFens.length) return;
    setHistoryIndex(idx);
    const targetFen = historyFens[idx];
    const newChess = new Chess(targetFen);
    setChess(newChess);
    setLastMove(null);
  }, [historyFens]);

  // Keyboard navigation for Left/Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        jumpToMove(historyIndex - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        jumpToMove(historyIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToMove(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToMove(historyFens.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, historyFens, jumpToMove]);

  const handleReset = () => {
    const initial = new Chess();
    setChess(initial);
    setHistoryFens([initial.fen()]);
    setSanHistory([]);
    setHistoryIndex(0);
    setLastMove(null);
    soundService.playGameStart();
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  const handleGoToGameReview = () => {
    if (sanHistory.length > 0) {
      const runner = new Chess();
      const moveRecords: MoveRecord[] = [];
      for (const san of sanHistory) {
        const fenBefore = runner.fen();
        try {
          const m = runner.move(san);
          if (!m) break;
          moveRecords.push({
            san: m.san,
            from: m.from as Square,
            to: m.to as Square,
            captured: m.captured as any,
            promotion: m.promotion as any,
            fenBefore,
            fenAfter: runner.fen(),
            evalBefore: 0,
            evalAfter: 0,
            isCheck: runner.inCheck(),
          });
        } catch {
          break;
        }
      }

      const sessionId = `analysis-${Date.now()}`;
      const session: GameSession = {
        id: sessionId,
        whitePlayer: {
          id: 'w-analysis',
          name: orientation === 'w' ? 'You' : 'Opponent',
          rating: 1500,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
        },
        blackPlayer: {
          id: 'b-analysis',
          name: orientation === 'b' ? 'You' : 'Opponent',
          rating: 1500,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
        },
        timeControl: 600,
        variant: 'standard',
        moves: moveRecords,
        fen: runner.fen(),
        isGameOver: true,
        gameResult: runner.isCheckmate() ? (runner.turn() === 'w' ? '0-1' : '1-0') : 'Game Concluded',
        resultDetails: {
          winner: runner.isCheckmate() ? (runner.turn() === 'w' ? 'b' : 'w') : 'draw',
          reason: runner.isCheckmate() ? 'checkmate' : 'agreement',
          ratingDelta: 0,
          newRating: 1500,
        },
        reviewReport: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      GameSessionStore.saveSession(session);
      router.push(`/game/review/${sessionId}`);
    } else {
      router.push('/game/review/demo-game-masterpiece');
    }
  };

  // Matched opening from current played SAN moves
  const currentOpening = useMemo(() => {
    return matchOpeningFromMoves(sanHistory.slice(0, historyIndex));
  }, [sanHistory, historyIndex]);

  // Dynamic visual arrows on the board
  const boardArrows = useMemo<ArrowAnnotation[]>(() => {
    const list: ArrowAnnotation[] = [];
    if (threatInfo?.arrow) {
      list.push(threatInfo.arrow);
    }
    if (hoveredPvUci && hoveredPvUci.length >= 4) {
      list.push({
        from: hoveredPvUci.slice(0, 2) as Square,
        to: hoveredPvUci.slice(2, 4) as Square,
        color: '#38bdf8', // bright sky-blue for preview
      });
    } else if (showBestMoveArrow && pvLines[0]?.bestMoveUci && pvLines[0].bestMoveUci.length >= 4) {
      list.push({
        from: pvLines[0].bestMoveUci.slice(0, 2) as Square,
        to: pvLines[0].bestMoveUci.slice(2, 4) as Square,
        color: '#81b64c', // chess.com green for #1 best move
      });
    }
    return list;
  }, [threatInfo, hoveredPvUci, showBestMoveArrow, pvLines]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161512] text-zinc-100 overflow-hidden select-none min-w-0">
      {/* Top Navbar */}
      <header className="h-14 border-b-2 border-[#282522] bg-[#1a1916] px-3 sm:px-4 lg:px-6 flex items-center justify-between z-10 shrink-0 shadow-[0_2px_0_0_#141311]">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5 sm:gap-2 truncate">
                <span>Analysis<span className="hidden xs:inline"> Studio</span></span>
                <button
                  onClick={() => setShowHelpBanner(!showHelpBanner)}
                  className="text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  title="What is Analysis Studio?"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                </button>
              </h1>
              <span className="text-[10px] font-medium text-zinc-400 hidden sm:block truncate">
                Deep-Dive Sandbox & Engine Lab
              </span>
            </div>
          </div>
        </div>

        {/* Mobile View Switcher Pill */}
        <div className="flex lg:hidden items-center bg-[#141311] p-0.5 rounded-full border border-[#35322b] mx-2">
          <button
            onClick={() => setMobileView('board')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              mobileView === 'board'
                ? 'bg-[#81b64c] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setMobileView('lines')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              mobileView === 'lines'
                ? 'bg-[#81b64c] text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lines ({pvLines.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Tablebase indicator if active */}
          {tablebaseInfo?.isTablebase && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c2e14] border-2 border-[#81b64c]/40 text-[#81b64c] text-xs font-black uppercase tracking-wider shadow-[0_2px_0_0_#4d7a24]">
              <Database className="w-3.5 h-3.5" />
              <span>7-Piece Tablebase</span>
            </div>
          )}

          {/* Desktop & Tablet actions */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleOpenRecentGamesModal}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#282622] hover:bg-[#33302b] text-sky-300 hover:text-sky-200 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 border-sky-500/40 shadow-[0_2px_0_0_#141311] active:translate-y-[1px]"
              title="Load your recent matches or bot games into Analysis Studio"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Load Game</span>
            </button>

            <button
              onClick={() => router.push(`/bots?fen=${encodeURIComponent(chess.fen())}`)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#282622] hover:bg-[#33302b] text-amber-300 hover:text-amber-200 text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 border-amber-500/40 shadow-[0_2px_0_0_#141311] active:translate-y-[1px]"
              title="Spar current position against Bot"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Spar Bot</span>
            </button>

            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-2.5 sm:px-3 py-1.5 rounded-full bg-[#282622] hover:bg-[#33302b] text-zinc-200 hover:text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 border-[#3d3a35] shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none"
              title="Import FEN / PGN"
            >
              <Upload className="w-3.5 h-3.5 text-[#81b64c]" />
              <span className="hidden lg:inline">Import</span>
            </button>
          </div>

          {/* Primary CTA: Game Review */}
          <button
            onClick={handleGoToGameReview}
            className="px-2.5 sm:px-4 py-1.5 rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24]"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span><span className="hidden xs:inline">Game </span>Review</span>
          </button>

          {/* Mobile Secondary Actions Dropdown */}
          <div className="relative md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="p-1.5 rounded-full bg-[#282622] border-2 border-[#3d3a35] text-zinc-300 hover:text-white shadow-[0_2px_0_0_#141311] active:translate-y-[1px] cursor-pointer"
              title="More Actions"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {isMobileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl p-1.5 shadow-2xl z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleOpenRecentGamesModal();
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-black text-sky-300 hover:bg-[#2a2723] rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span>Load Match / Game</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    router.push(`/bots?fen=${encodeURIComponent(chess.fen())}`);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-black text-amber-300 hover:bg-[#2a2723] rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Bot className="w-4 h-4" />
                  <span>Spar Bot from Here</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsImportModalOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-black text-zinc-200 hover:bg-[#2a2723] rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-[#81b64c]" />
                  <span>Import FEN / PGN</span>
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowHelpBanner((prev) => !prev);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-black text-zinc-400 hover:bg-[#2a2723] rounded-xl flex items-center gap-2 cursor-pointer border-t border-[#2a2723] pt-1.5 mt-0.5"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>Help &amp; Guide</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Purpose & Help Banner (Collapsible) */}
      {showHelpBanner && (
        <div className="bg-[#1e1c18] border-b border-[#2d2a25] px-6 py-3 flex items-center justify-between text-xs text-zinc-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
            <p className="leading-relaxed">
              <strong className="text-white font-bold">Purpose of Analysis Studio:</strong> An interactive chess laboratory. Unlike static Game Review, you can freely play out candidate moves, test hypothetical sidelines, see real-time Stockfish 16 arrows, uncover hidden opponent threats with the Threat Radar, study ECO opening theory, and query 7-piece endgame tablebases.
            </p>
          </div>
          <button
            onClick={() => setShowHelpBanner(false)}
            className="text-zinc-500 hover:text-white p-1 rounded-md cursor-pointer shrink-0 ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Workspace: Board on Left, Multi-PV & Opening Panel on Right */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Board Container */}
        <div className={`flex-1 flex flex-col items-center justify-start lg:justify-center p-1 sm:p-4 bg-[#161512] relative overflow-hidden shrink-0 ${mobileView === 'lines' ? 'hidden lg:flex' : 'flex'}`}>
          <div className="flex items-center gap-2 max-w-full justify-center">
            <EvalBar score={currentEvalScore} orientation={orientation} />
            <div className="w-[min(calc(100vw-3.25rem),calc(100dvh-220px),520px)] aspect-square">
              <ChessBoard
                chess={chess}
                orientation={orientation}
                boardTheme={boardTheme}
                pieceTheme={pieceTheme}
                onMove={handleMove}
                lastMove={lastMove}
                customArrows={boardArrows}
              />
            </div>
          </div>

          {/* Opponent Threat Alert Banner */}
          {threatInfo && (
            <div
              className={`mt-3 w-full max-w-[520px] p-2.5 sm:p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                threatInfo.severity === 'critical'
                  ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                  : threatInfo.severity === 'moderate'
                  ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  : 'bg-blue-950/40 border-blue-600/50 text-blue-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <AlertTriangle
                  className={`w-4 h-4 shrink-0 ${
                    threatInfo.severity === 'critical'
                      ? 'text-rose-400 animate-pulse'
                      : 'text-amber-400'
                  }`}
                />
                <div>
                  <span className="font-black uppercase tracking-wider text-[10px] block opacity-85">
                    {threatInfo.severity} Threat Detected ({threatInfo.threatMoveSan})
                  </span>
                  <span className="font-semibold text-white text-xs">
                    {threatInfo.description}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setThreatInfo(null)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-black/30 cursor-pointer"
                title="Dismiss threat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Under-Board Toolbar (Mobile 2-row clean stack, Tablet/Desktop single pill) */}
          <div className="w-full max-w-[520px] mt-2.5 sm:mt-3 flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2 bg-[#211f1c] p-1.5 sm:px-4 sm:py-2 rounded-2xl sm:rounded-full border-2 border-[#332f2b] shadow-[0_3px_0_0_#141311]">
            {/* Move Navigation Cluster */}
            <div className="flex items-center justify-center gap-1 w-full sm:w-auto">
              <button
                onClick={() => jumpToMove(0)}
                disabled={historyIndex === 0}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="First Move"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => jumpToMove(historyIndex - 1)}
                disabled={historyIndex === 0}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Previous Move"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] sm:text-xs font-mono font-black text-zinc-200 px-2 uppercase text-center min-w-[120px]">
                {historyIndex === 0 ? 'Start' : `Move ${Math.ceil(historyIndex / 2)}`} ({historyIndex}/{historyFens.length - 1})
              </span>
              <button
                onClick={() => jumpToMove(historyIndex + 1)}
                disabled={historyIndex >= historyFens.length - 1}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Next Move"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => jumpToMove(historyFens.length - 1)}
                disabled={historyIndex >= historyFens.length - 1}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Last Move"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:block h-4 w-[1px] bg-[#332f2b] mx-0.5" />

            {/* Analysis Tools Cluster */}
            <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full sm:w-auto pt-1 sm:pt-0 border-t border-[#2d2a25] sm:border-t-0">
              {/* Best Move Arrow Toggle */}
              <button
                onClick={() => setShowBestMoveArrow(!showBestMoveArrow)}
                className={`p-1.5 sm:p-2 rounded-xl sm:rounded-full cursor-pointer transition-colors ${
                  showBestMoveArrow
                    ? 'text-[#81b64c] bg-[#81b64c]/15'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#2c2925]'
                }`}
                title={showBestMoveArrow ? 'Hide Engine Best Move Arrow' : 'Show Engine Best Move Arrow'}
              >
                {showBestMoveArrow ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Threat Detection Button */}
              <button
                onClick={handleDetectThreat}
                disabled={isDetectingThreat}
                className={`px-2.5 sm:px-3 py-1 rounded-full cursor-pointer transition-all flex items-center gap-1 text-[11px] sm:text-xs font-black uppercase tracking-wider border-2 ${
                  threatInfo
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-[0_2px_0_0_#881337]'
                    : 'bg-[#282622] text-zinc-300 border-[#383530] hover:text-white shadow-[0_2px_0_0_#141311] active:translate-y-[1px]'
                }`}
                title="Analyze opponent tactical threats using Null-Move search"
              >
                {isDetectingThreat ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Threats</span>
              </button>

              <button
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white cursor-pointer rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Flip Board"
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
              <button
                onClick={handleReset}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white cursor-pointer rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Reset Board"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyFen}
                className="p-1.5 sm:p-2 text-zinc-400 hover:text-white cursor-pointer rounded-xl sm:rounded-full hover:bg-[#2c2925] transition-colors"
                title="Copy FEN"
              >
                {copiedFen ? <Check className="w-4 h-4 text-[#81b64c]" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right Engine Multi-PV & Opening Theory Panel */}
        <aside className={`w-full lg:w-[400px] xl:w-[420px] border-t-2 lg:border-t-0 lg:border-l-2 border-[#282522] bg-[#1a1916] flex flex-col shrink-0 h-full overflow-hidden ${mobileView === 'board' ? 'hidden lg:flex' : 'flex'}`}>
          {/* Engine Header & Controls */}
          <div className="p-4 border-b-2 border-[#282522] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#81b64c]" />
                <span className="text-xs font-black tracking-wider text-white uppercase">
                  Engine Assessment
                </span>
              </div>
              <button
                onClick={() => setIsEngineActive(!isEngineActive)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider cursor-pointer transition-all border-2 ${
                  isEngineActive
                    ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                    : 'bg-[#282522] text-zinc-400 border-[#383530]'
                }`}
              >
                {isEngineActive ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3" />}
                <span>{isEngineActive ? 'Engine ON' : 'Engine OFF'}</span>
              </button>
            </div>

            {/* Depth & Speed Indicator Card */}
            <div className="bg-[#211f1c] p-3.5 rounded-2xl border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] flex items-center justify-between">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-zinc-400">Stockfish 16</div>
                <div className="text-xl font-black font-mono text-white flex items-center gap-2">
                  <span className={currentEvalScore >= 0 ? 'text-[#81b64c]' : 'text-rose-400'}>
                    {currentEvalFormatted}
                  </span>
                  {isEvaluating && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[11px] font-mono font-bold text-zinc-300">
                  Depth <span className="text-white font-black">{engineDepth || targetDepth}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 font-semibold">
                  {nodesCount ? `${(nodesCount / 1000).toFixed(0)}k nodes` : 'Instant cache'}
                </div>
              </div>
            </div>

            {/* Depth Selector Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mr-1">Depth:</span>
              {[10, 14, 18].map((d) => (
                <button
                  key={d}
                  onClick={() => setTargetDepth(d)}
                  className={`px-3 py-1 rounded-full text-xs font-mono font-black cursor-pointer transition-all border-2 ${
                    targetDepth === d
                      ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                      : 'bg-[#24221f] text-zinc-400 border-[#33302b] shadow-[0_2px_0_0_#141311] hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Opening Theory / ECO Card */}
            {currentOpening ? (
              <div className="bg-[#211f1c] p-3 rounded-2xl border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#81b64c]/20 border border-[#81b64c]/50 text-[#81b64c] text-[10px] font-black font-mono">
                      {currentOpening.eco}
                    </span>
                    <span className="text-xs font-black text-white truncate max-w-[200px]" title={currentOpening.name}>
                      {currentOpening.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">
                    {currentOpening.variation}
                  </span>
                </div>

                {/* Win Pct Bar */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold">
                  <div className="flex-1 bg-zinc-200 text-zinc-900 rounded-sm px-1 py-0.5 text-center">
                    W {currentOpening.whiteWinPct}%
                  </div>
                  <div className="flex-1 bg-zinc-600 text-zinc-200 rounded-sm px-1 py-0.5 text-center">
                    D {currentOpening.drawPct}%
                  </div>
                  <div className="flex-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded-sm px-1 py-0.5 text-center">
                    B {currentOpening.blackWinPct}%
                  </div>
                </div>

                {currentOpening.keyIdeas && currentOpening.keyIdeas.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {currentOpening.keyIdeas.slice(0, 2).map((idea, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#181714] text-zinc-400 border border-[#2e2a25]">
                        {idea}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#1c1b18] px-3 py-2 rounded-xl border border-[#2b2925] flex items-center justify-between text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-zinc-600" />
                  <span className="text-[11px] font-medium">Custom / Out-of-Book Position</span>
                </div>
              </div>
            )}
          </div>

          {/* 7-Piece Tablebase Status Card (If active) */}
          {tablebaseInfo?.isTablebase && (
            <div className="m-4 mb-0 p-3 rounded-xl bg-[#142312] border border-[#81b64c]/30 text-xs flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 text-[#81b64c] font-black uppercase text-[10px] tracking-wider">
                <Database className="w-3.5 h-3.5" />
                <span>Syzygy 7-Piece Endgame Tablebase</span>
              </div>
              <p className="text-zinc-200 font-medium leading-relaxed">
                {tablebaseInfo.humanDescription}
              </p>
              {tablebaseInfo.bestMoveSan && (
                <div className="text-[#81b64c] font-mono font-bold text-[11px]">
                  Optimal Tablebase Move: {tablebaseInfo.bestMoveSan}
                </div>
              )}
            </div>
          )}

          {/* Top Multi-PV Lines */}
          <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black tracking-wider text-zinc-400 uppercase">
                Top Engine Lines (Multi-PV)
              </span>
              <span className="text-[10px] text-zinc-500">
                Click line to play move
              </span>
            </div>

            {pvLines.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 font-medium">
                Evaluating position with Stockfish...
              </div>
            ) : (
              pvLines.map((line) => (
                <div
                  key={line.rank}
                  onMouseEnter={() => setHoveredPvUci(line.bestMoveUci)}
                  onMouseLeave={() => setHoveredPvUci(null)}
                  onClick={() => {
                    if (line.bestMoveUci && line.bestMoveUci.length >= 4) {
                      const from = line.bestMoveUci.slice(0, 2) as Square;
                      const to = line.bestMoveUci.slice(2, 4) as Square;
                      const promotion = line.bestMoveUci.length >= 5 ? (line.bestMoveUci[4] as PieceSymbol) : undefined;
                      handleMove(from, to, promotion);
                    }
                  }}
                  className={`p-3.5 rounded-2xl bg-[#211f1c] border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] hover:-translate-y-0.5 hover:border-[#81b64c]/60 transition-all cursor-pointer flex flex-col gap-1.5 ${
                    hoveredPvUci === line.bestMoveUci ? 'border-sky-500/70' : ''
                  }`}
                  title="Click to play this move on the board"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full border-2 border-[#3d3830] bg-[#2b2824] text-[10px] font-black uppercase text-zinc-300">
                        Line {line.rank}
                      </span>
                      <span className="text-xs font-black text-white font-mono flex items-center gap-1.5">
                        {line.bestMoveSan}
                        <PlayCircle className="w-3 h-3 text-[#81b64c] opacity-60 group-hover:opacity-100" />
                      </span>
                    </div>
                    <span
                      className={`text-xs font-black font-mono px-2 py-0.5 rounded-full border-2 ${
                        line.scoreCp >= 0
                          ? 'text-[#81b64c] bg-[#81b64c]/15 border-[#81b64c]/40'
                          : 'text-rose-400 bg-rose-500/15 border-rose-500/40'
                      }`}
                    >
                      {line.scoreFormatted}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-zinc-400 line-clamp-2 leading-relaxed font-medium">
                    {line.pvSan && line.pvSan.length > 0
                      ? line.pvSan.slice(0, 8).join(' ')
                      : line.bestMoveSan}
                  </div>
                </div>
              ))
            )}

            {/* Move List Log */}
            <div className="mt-4 pt-4 border-t border-[#282522]">
              <span className="text-[11px] font-black tracking-wider text-zinc-400 uppercase block mb-2">
                Move Sequence ({sanHistory.length} plies)
              </span>
              <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto text-xs font-mono">
                {Array.from({ length: Math.ceil(sanHistory.length / 2) }).map((_, moveIdx) => {
                  const whitePly = moveIdx * 2;
                  const blackPly = moveIdx * 2 + 1;
                  return (
                    <React.Fragment key={moveIdx}>
                      <div
                        onClick={() => jumpToMove(whitePly + 1)}
                        className={`p-1.5 rounded cursor-pointer transition-colors ${
                          historyIndex === whitePly + 1
                            ? 'bg-[#81b64c] text-white font-bold'
                            : 'hover:bg-[#282522] text-zinc-300'
                        }`}
                      >
                        {moveIdx + 1}. {sanHistory[whitePly]}
                      </div>
                      {blackPly < sanHistory.length ? (
                        <div
                          onClick={() => jumpToMove(blackPly + 1)}
                          className={`p-1.5 rounded cursor-pointer transition-colors ${
                            historyIndex === blackPly + 1
                              ? 'bg-[#81b64c] text-white font-bold'
                              : 'hover:bg-[#282522] text-zinc-300'
                          }`}
                        >
                          {sanHistory[blackPly]}
                        </div>
                      ) : (
                        <div />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Quick Load Recent Games Modal */}
      {isRecentGamesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f1e1b] border border-[#33302b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 max-h-[85vh]">
            <div className="px-5 py-4 border-b border-[#2d2b27] flex items-center justify-between bg-[#191815]">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-sky-400" />
                <h2 className="text-sm font-black text-white">Load Game into Studio</h2>
              </div>
              <button
                onClick={() => setIsRecentGamesModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2c2925] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4 overflow-y-auto">
              {/* Highlighted Preset: ChiefTbot Match */}
              <div className="p-3.5 rounded-xl bg-[#25221d] border-2 border-amber-500/40 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                      Featured Bot Match
                    </span>
                    <span className="text-xs font-bold text-white">ChiefTbot vs Challenger</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Italian Game (Move 7 blunder position: 7. Qd5 c6?? 8. Qxf7#). Test defensive alternatives!
                  </p>
                </div>
                <button
                  onClick={handleLoadChiefTbotGame}
                  className="px-3.5 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black uppercase tracking-wider cursor-pointer shrink-0 ml-3"
                >
                  Load
                </button>
              </div>

              <div className="border-t border-[#2b2925] pt-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block mb-2">
                  Recent Matches & Synced Games
                </span>

                {recentGamesList.length === 0 ? (
                  <div className="p-6 text-center text-xs text-zinc-500">
                    No recently recorded games found. Play a game or import a PGN!
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                    {recentGamesList.slice(0, 15).map((g) => (
                      <div
                        key={g.id}
                        onClick={() => handleLoadSession(g)}
                        className="p-3 rounded-xl bg-[#191815] border border-[#2c2925] hover:border-[#81b64c]/50 hover:bg-[#211f1c] cursor-pointer transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-white">
                            {g.whitePlayer?.name || 'White'} vs {g.blackPlayer?.name || 'Black'}
                          </div>
                          <div className="text-[10px] text-zinc-400 flex items-center gap-2 mt-0.5">
                            <span>Result: {g.gameResult || 'Finished'}</span>
                            <span>•</span>
                            <span>{g.moves?.length || 0} plies</span>
                            <span>•</span>
                            <span>{new Date(g.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button className="text-xs font-black text-[#81b64c] px-2.5 py-1 rounded bg-[#81b64c]/10 hover:bg-[#81b64c]/20">
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 border-t border-[#2d2b27] bg-[#191815] flex items-center justify-end">
              <button
                onClick={() => setIsRecentGamesModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import PGN / FEN Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1f1e1b] border border-[#33302b] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-4 border-b border-[#2d2b27] flex items-center justify-between bg-[#191815]">
              <div className="flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#81b64c]" />
                <h2 className="text-sm font-black text-white">Import PGN or FEN</h2>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#2c2925] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-3">
              <p className="text-xs text-zinc-400">
                Paste any standard PGN game notation (with headers or moves) or FEN position string to load it into the Analysis Studio.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder={`1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6...\n\nOR\n\nr1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3`}
                rows={7}
                className="w-full bg-[#141311] border border-[#2c2a26] rounded-xl p-3 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#81b64c] transition-colors resize-none"
              />

              {importError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{importError}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-[#2d2b27] bg-[#191815] flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportError(null);
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSubmit}
                disabled={!importText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-[#81b64c] hover:bg-[#72a342] text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Load Into Studio</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
