'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { PieceColor, ArrowAnnotation, GameSession, MoveRecord } from '@/types/chess';
import { GameSessionStore, parsePgnToMoveRecords, getSessionUserOutcome, isSessionUserWhite } from '@/lib/gameSessionStore';
import { matchOpeningFromMoves } from '@/lib/openingsData';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Microscope,
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
  BookOpen,
  FolderOpen,
  Eye,
  EyeOff,
  PlayCircle,
  ArrowRight,
  RotateCw,
  History,
  Target,
  Flame,
  Globe,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';
import { useShell } from '@/context/ShellContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { syncExternalAccountGames } from '@/lib/syncService';

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

type AnalysisScreen = 'sandbox' | 'theory' | 'tablebase' | 'vault';

function AnalysisStudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { boardTheme, pieceTheme, openChessComSync } = useShell();
  const { effectiveDisplayName, syncedChessCom, syncedLichess } = useAuth();

  // Sub-screen navigation ("Screens, Not Pages" architecture)
  const [activeScreen, setActiveScreen] = useState<AnalysisScreen>('sandbox');

  // Interactive Chess Board & Orientation
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  // Move history for step back/forward
  const [historyFens, setHistoryFens] = useState<string[]>([new Chess().fen()]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [sanHistory, setSanHistory] = useState<string[]>([]);
  const [copiedFen, setCopiedFen] = useState(false);

  // Engine evaluation states (Stockfish 18 WASM API)
  const [isEngineActive, setIsEngineActive] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [targetDepth, setTargetDepth] = useState<number>(14);
  const [currentEvalScore, setCurrentEvalScore] = useState<number>(20);
  const [currentEvalFormatted, setCurrentEvalFormatted] = useState<string>('+0.20');
  const [pvLines, setPvLines] = useState<MultiPvLine[]>([]);
  const [engineDepth, setEngineDepth] = useState<number>(0);
  const [nodesCount, setNodesCount] = useState<number>(0);
  const [tablebaseInfo, setTablebaseInfo] = useState<TablebaseInfo | null>(null);

  // Visual feature states
  const [showBestMoveArrow, setShowBestMoveArrow] = useState(true);
  const [hoveredPvUci, setHoveredPvUci] = useState<string | null>(null);

  // Threat analysis
  const [threatInfo, setThreatInfo] = useState<{
    threatMoveSan: string;
    description: string;
    severity: string;
    arrow: ArrowAnnotation | null;
  } | null>(null);
  const [isDetectingThreat, setIsDetectingThreat] = useState(false);

  // Vault / Import state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [recentGamesList, setRecentGamesList] = useState<GameSession[]>([]);
  const [vaultProvider, setVaultProvider] = useState<'all' | 'checkmate' | 'chesscom' | 'lichess'>('all');
  const [isSyncingVault, setIsSyncingVault] = useState(false);

  // Deep-link position parser (e.g. from Openings, Puzzles, or Review)
  useEffect(() => {
    if (!searchParams) return;
    const gameIdParam = searchParams.get('gameId');
    const movesParam = searchParams.get('moves');
    const plyParam = searchParams.get('ply');
    const fenParam = searchParams.get('fen');
    const pgnParam = searchParams.get('pgn');

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
            session.blackPlayer?.name?.toLowerCase().includes(effectiveDisplayName.toLowerCase()) ||
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

        let targetIndex = fens.length - 1;
        if (plyParam !== null) {
          const parsedPly = parseInt(plyParam, 10);
          if (!isNaN(parsedPly) && parsedPly >= 0 && parsedPly < fens.length) {
            targetIndex = parsedPly;
          }
        } else if (fens.length > 2) {
          targetIndex = fens.length - 2;
        }

        setHistoryIndex(targetIndex);
        const activeChess = new Chess(fens[targetIndex]);
        setChess(activeChess);
        setOrientation(isUserBlack ? 'b' : 'w');
        return;
      }
    }

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
  }, [searchParams, effectiveDisplayName]);

  // Load recent games for Vault
  const refreshVaultGames = useCallback(async (force = false) => {
    setIsSyncingVault(true);
    let ccUser = syncedChessCom?.username;
    let liUser = syncedLichess?.username;

    if (!ccUser && typeof window !== 'undefined') {
      try {
        const storedCC = localStorage.getItem('chess_com_profile');
        if (storedCC) ccUser = JSON.parse(storedCC)?.username;
      } catch {}
    }
    if (!liUser && typeof window !== 'undefined') {
      try {
        const storedLI = localStorage.getItem('lichess_profile');
        if (storedLI) liUser = JSON.parse(storedLI)?.username;
      } catch {}
    }

    if (force) {
      if (ccUser) await syncExternalAccountGames('chesscom', ccUser, true);
      if (liUser) await syncExternalAccountGames('lichess', liUser, true);
    }

    setRecentGamesList(GameSessionStore.listRecentSessions());
    setIsSyncingVault(false);
  }, [syncedChessCom?.username, syncedLichess?.username]);

  useEffect(() => {
    refreshVaultGames(false);
  }, [refreshVaultGames]);

  // Fetch engine evaluation from backend API
  const fetchEngineEval = useCallback(async (fen: string, depth: number) => {
    if (!isEngineActive) return;
    setIsEvaluating(true);
    setThreatInfo(null);
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

  useEffect(() => {
    fetchEngineEval(chess.fen(), targetDepth);
  }, [chess, targetDepth, fetchEngineEval]);

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
      // Invalid move
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
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, jumpToMove]);

  const handleReset = () => {
    const startChess = new Chess();
    setChess(startChess);
    setHistoryFens([startChess.fen()]);
    setSanHistory([]);
    setHistoryIndex(0);
    setLastMove(null);
    setThreatInfo(null);
    soundService.playGameStart();
  };

  const handleCopyFen = () => {
    navigator.clipboard.writeText(chess.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  };

  // Launch Stockfish 18 Game Review from current analysis game
  const handleGoToGameReview = () => {
    if (sanHistory.length > 0) {
      const runner = new Chess();
      const moveRecords: MoveRecord[] = [];
      for (let i = 0; i < sanHistory.length; i++) {
        const san = sanHistory[i];
        const fenBefore = runner.fen();
        try {
          const m = runner.move(san);
          if (!m) break;
          moveRecords.push({
            san: m.san,
            from: m.from,
            to: m.to,
            captured: m.captured as any,
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
          name: orientation === 'w' ? effectiveDisplayName : 'Opponent',
          rating: 1500,
          avatar: '',
        },
        blackPlayer: {
          id: 'b-analysis',
          name: orientation === 'b' ? effectiveDisplayName : 'Opponent',
          rating: 1500,
          avatar: '',
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
        color: '#38bdf8',
      });
    } else if (showBestMoveArrow && pvLines[0]?.bestMoveUci && pvLines[0].bestMoveUci.length >= 4) {
      list.push({
        from: pvLines[0].bestMoveUci.slice(0, 2) as Square,
        to: pvLines[0].bestMoveUci.slice(2, 4) as Square,
        color: '#81b64c',
      });
    }
    return list;
  }, [threatInfo, hoveredPvUci, showBestMoveArrow, pvLines]);

  // Load a session from Vault into Analysis Board
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

    const isUserWhiteColor = isSessionUserWhite(session, effectiveDisplayName);
    setOrientation(isUserWhiteColor ? 'w' : 'b');

    soundService.playGameStart();
    setActiveScreen('sandbox');
  };

  const handleImportSubmit = async () => {
    const raw = importText.trim();
    if (!raw) return;
    setImportError(null);

    const fenTokens = raw.split(/\s+/);
    if (fenTokens.length >= 2 && /[prnbqkPRNBQK1-8\/]+/.test(fenTokens[0])) {
      try {
        const newChess = new Chess(raw);
        setChess(newChess);
        setHistoryFens([newChess.fen()]);
        setSanHistory([]);
        setHistoryIndex(0);
        setLastMove(null);
        setImportText('');
        soundService.playGameStart();
        setActiveScreen('sandbox');
        return;
      } catch {
        // Not a valid FEN
      }
    }

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
          setImportText('');
          soundService.playGameStart();
          setActiveScreen('sandbox');
          return;
        }
      }
      setImportError('Could not parse valid PGN or FEN position');
    } catch (err: any) {
      setImportError(err.message || 'Import failed');
    }
  };

  // Filter vault games by provider
  const filteredVaultGames = useMemo(() => {
    return recentGamesList.filter((g) => {
      const isChessCom = g.source === 'chesscom' || g.id.startsWith('chesscom-');
      const isLichess = g.source === 'lichess' || g.id.startsWith('lichess-');
      if (vaultProvider === 'chesscom') return isChessCom;
      if (vaultProvider === 'lichess') return isLichess;
      if (vaultProvider === 'checkmate') return !isChessCom && !isLichess;
      return true;
    });
  }, [recentGamesList, vaultProvider]);

  const pieceCount = useMemo(() => {
    const fen = chess.fen().split(' ')[0];
    return (fen.match(/[prnbqkPRNBQK]/g) || []).length;
  }, [chess]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161512] text-zinc-100 overflow-hidden select-none min-w-0">
      {/* 1. TOP HEADER & SUB-SCREEN SWITCHER */}
      <header className="h-12 border-b border-white/5 px-3 sm:px-4 flex items-center justify-between shrink-0 bg-[#141311] z-20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#81b64c]/15 text-[#81b64c] flex items-center justify-center font-black shrink-0">
            <Microscope className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 truncate">
              <span>Analysis Studio</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white/5 text-zinc-400 hidden xs:inline">
                Stockfish 18
              </span>
            </h1>
          </div>
        </div>

        {/* 4 Segmented Sub-Screen Switcher Pills */}
        <div className="flex items-center gap-1 p-1 bg-[#1c1a17] rounded-xl border border-white/5 text-xs font-bold overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveScreen('sandbox')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeScreen === 'sandbox'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Multi-PV Engine
          </button>
          <button
            onClick={() => setActiveScreen('theory')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeScreen === 'theory'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Opening Explorer
          </button>
          <button
            onClick={() => setActiveScreen('tablebase')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeScreen === 'tablebase'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            7-Piece Tablebase
          </button>
          <button
            onClick={() => setActiveScreen('vault')}
            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
              activeScreen === 'vault'
                ? 'bg-[#81b64c] text-black font-black'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Game Vault &amp; Import
          </button>
        </div>
      </header>

      {/* 2. MAIN SUB-SCREEN VIEWPORT */}
      <div className="flex-1 min-h-0 flex flex-col p-2 sm:p-3 overflow-hidden">
        {/* ========================================================================= */}
        {/* SUB-SCREEN 1: STOCKFISH 18 SANDBOX & MULTI-PV */}
        {/* ========================================================================= */}
        {activeScreen === 'sandbox' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Left: Interactive Chess Board + Stepper */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
              <div className="flex items-center gap-2 max-w-full justify-center">
                <EvalBar score={currentEvalScore} orientation={orientation} />
                <div className="w-[min(calc(100vw-3.5rem),calc(100dvh-200px),480px)] aspect-square">
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
                  className={`mt-2 w-full max-w-[480px] p-2 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    threatInfo.severity === 'critical'
                      ? 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                      : 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="font-bold uppercase tracking-wider text-[10px] block opacity-80">
                        {threatInfo.severity} Threat ({threatInfo.threatMoveSan})
                      </span>
                      <span className="text-white text-xs truncate block">{threatInfo.description}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setThreatInfo(null)}
                    className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer shrink-0"
                  >
                    &times;
                  </button>
                </div>
              )}

              {/* Under-Board Stepper & Tool Controls */}
              <div className="w-full max-w-[480px] mt-2 flex items-center justify-between gap-1 bg-[#1c1a17] px-3 py-1.5 rounded-xl border border-white/5">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => jumpToMove(0)}
                    disabled={historyIndex === 0}
                    title="Start of Game"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => jumpToMove(historyIndex - 1)}
                    disabled={historyIndex === 0}
                    title="Previous Move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-mono font-bold text-zinc-300 px-1 text-center min-w-[80px]">
                    {historyIndex === 0 ? 'Start' : `Ply ${historyIndex}`} / {historyFens.length - 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => jumpToMove(historyIndex + 1)}
                    disabled={historyIndex >= historyFens.length - 1}
                    title="Next Move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => jumpToMove(historyFens.length - 1)}
                    disabled={historyIndex >= historyFens.length - 1}
                    title="Latest Position"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="h-4 w-[1px] bg-white/10" />

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowBestMoveArrow(!showBestMoveArrow)}
                    className={showBestMoveArrow ? 'text-[#81b64c]' : 'text-zinc-500'}
                    title={showBestMoveArrow ? 'Hide Engine Best Move Arrow' : 'Show Engine Best Move Arrow'}
                  >
                    {showBestMoveArrow ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleDetectThreat}
                    disabled={isDetectingThreat}
                    title="Scan Opponent Threats"
                  >
                    {isDetectingThreat ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    ) : (
                      <ShieldAlert className="w-4 h-4 text-amber-400" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                    title="Flip Board Orientation"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="xs" onClick={handleReset} title="Reset Position">
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="xs" onClick={handleCopyFen} title="Copy FEN to Clipboard">
                    {copiedFen ? <Check className="w-4 h-4 text-[#81b64c]" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>

            {/* Right: Multi-PV Lines & Launch Game Review */}
            <div className="w-full lg:w-96 flex flex-col gap-2.5 min-h-0 bg-[#181614] p-3 rounded-2xl border border-white/5">
              {/* Engine Assessment Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#81b64c]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Stockfish 18 WASM
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-zinc-400">
                    Depth {engineDepth || targetDepth} &bull; {nodesCount ? `${(nodesCount / 1000).toFixed(0)}k` : 'instant'}
                  </span>
                  <button
                    onClick={() => setIsEngineActive(!isEngineActive)}
                    className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {isEngineActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-[#81b64c]" />}
                  </button>
                </div>
              </div>

              {/* Score Display Card */}
              <div className="p-2.5 rounded-xl bg-[#201e1a] border border-white/5 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Evaluation</span>
                  <span className={`text-xl font-mono font-black ${currentEvalScore >= 0 ? 'text-[#81b64c]' : 'text-red-400'}`}>
                    {currentEvalFormatted}
                  </span>
                </div>
                {/* Target Depth Selector */}
                <div className="flex items-center gap-1">
                  {[12, 16, 20].map((d) => (
                    <button
                      key={d}
                      onClick={() => setTargetDepth(d)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer ${
                        targetDepth === d
                          ? 'bg-[#81b64c] text-black font-black'
                          : 'bg-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {/* Multi-PV Candidates List */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                {pvLines.length > 0 ? (
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
                      className="p-2 rounded-xl bg-[#211f1c] border border-white/5 hover:border-[#81b64c]/40 transition-all cursor-pointer flex flex-col gap-1"
                      title="Click line to play move on the board"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-zinc-300">
                            #{line.rank}
                          </span>
                          <span className="text-xs font-black text-white font-mono flex items-center gap-1">
                            {line.bestMoveSan}
                            <PlayCircle className="w-3 h-3 text-[#81b64c]" />
                          </span>
                        </div>
                        <span
                          className={`text-xs font-mono font-bold px-1.5 py-0.2 rounded ${
                            line.scoreCp >= 0 ? 'bg-[#81b64c]/15 text-[#81b64c]' : 'bg-red-400/15 text-red-400'
                          }`}
                        >
                          {line.scoreFormatted}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">
                        {line.pvSan && line.pvSan.length > 0 ? line.pvSan.slice(0, 7).join(' ') : line.bestMoveSan}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Evaluating candidate moves with Stockfish...</span>
                  </div>
                )}
              </div>

              {/* Exactly ONE P1 Anchor Button */}
              <div className="pt-2 border-t border-white/5 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  onClick={handleGoToGameReview}
                  className="w-full flex items-center justify-center gap-2 font-black"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Launch Stockfish 18 Game Review</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 2: OPENING EXPLORER & THEORY */}
        {/* ========================================================================= */}
        {activeScreen === 'theory' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Left: Active Board */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
              <div className="w-[min(calc(100vw-3.5rem),calc(100dvh-200px),480px)] aspect-square">
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

            {/* Right: Opening Classification & Theory Tree */}
            <div className="w-full lg:w-96 flex flex-col gap-2.5 min-h-0 bg-[#181614] p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 shrink-0">
                <BookOpen className="w-4 h-4 text-[#81b64c]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Opening Explorer</span>
              </div>

              {/* Matched Opening Details */}
              {currentOpening ? (
                <div className="p-3 rounded-xl bg-[#201e1a] border border-white/5 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#81b64c]/20 text-[#81b64c] font-mono text-xs font-black">
                      {currentOpening.eco}
                    </span>
                    <span className="text-xs font-extrabold text-white truncate">{currentOpening.name}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-medium">{currentOpening.variation}</span>

                  {/* Win Percentage Distribution Bar */}
                  <div className="flex items-center gap-1 text-[10px] font-mono font-bold pt-1">
                    <div className="flex-1 bg-zinc-200 text-zinc-900 rounded px-1 py-0.5 text-center font-black">
                      White {currentOpening.whiteWinPct}%
                    </div>
                    <div className="flex-1 bg-zinc-600 text-zinc-200 rounded px-1 py-0.5 text-center">
                      Draw {currentOpening.drawPct}%
                    </div>
                    <div className="flex-1 bg-zinc-900 text-zinc-300 border border-zinc-700 rounded px-1 py-0.5 text-center">
                      Black {currentOpening.blackWinPct}%
                    </div>
                  </div>

                  {currentOpening.keyIdeas && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentOpening.keyIdeas.map((idea, i) => (
                        <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
                          {idea}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-[#201e1a] border border-white/5 text-xs text-zinc-400 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-zinc-500" />
                  <span>Position is out-of-book or customized. Play moves to explore theory.</span>
                </div>
              )}

              {/* Quick Preset Openings */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block pt-1">
                  Master Continuation Repertoire
                </span>
                {[
                  { name: "Scotch Game (Main Line)", eco: "C45", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4', 'exd4', 'Nxd4'] },
                  { name: "Ruy Lopez (Closed)", eco: "C84", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'] },
                  { name: "Italian Game (Giuoco Piano)", eco: "C50", moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6'] },
                  { name: "Sicilian Defense (Najdorf)", eco: "B90", moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'] },
                  { name: "Queen's Gambit Declined", eco: "D30", moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6', 'Bg5', 'Be7'] },
                ].map((op) => (
                  <div
                    key={op.eco}
                    onClick={() => {
                      const runner = new Chess();
                      const fens = [runner.fen()];
                      const sans: string[] = [];
                      for (const m of op.moves) {
                        runner.move(m);
                        fens.push(runner.fen());
                        sans.push(m);
                      }
                      setChess(runner);
                      setHistoryFens(fens);
                      setSanHistory(sans);
                      setHistoryIndex(fens.length - 1);
                      soundService.playGameStart();
                    }}
                    className="p-2 rounded-xl bg-[#211f1c] border border-white/5 hover:border-[#81b64c]/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#81b64c]/10 text-[#81b64c]">
                          {op.eco}
                        </span>
                        <span className="text-xs font-bold text-white">{op.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">{op.moves.join(' ')}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                ))}
              </div>

              {/* Exactly ONE P1 Anchor Button */}
              <div className="pt-2 border-t border-white/5 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  onClick={() => router.push(`/openings?eco=${currentOpening?.eco || 'C45'}`)}
                  className="w-full flex items-center justify-center gap-2 font-black"
                >
                  <span>Explore Full Repertoire in Openings Lab</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 3: 7-PIECE ENDGAME TABLEBASE */}
        {/* ========================================================================= */}
        {activeScreen === 'tablebase' && (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 overflow-hidden">
            {/* Left: Active Board */}
            <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-hidden">
              <div className="w-[min(calc(100vw-3.5rem),calc(100dvh-200px),480px)] aspect-square">
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

            {/* Right: Tablebase Ground Truth Assessment */}
            <div className="w-full lg:w-96 flex flex-col gap-2.5 min-h-0 bg-[#181614] p-3 rounded-2xl border border-white/5">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2 shrink-0">
                <Database className="w-4 h-4 text-[#81b64c]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Syzygy 7-Piece Endgame Tablebase
                </span>
              </div>

              {/* Tablebase Verification Card */}
              <div className="p-3 rounded-xl bg-[#201e1a] border border-white/5 flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Pieces on Board</span>
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${pieceCount <= 7 ? 'bg-[#81b64c]/20 text-[#81b64c]' : 'bg-white/10 text-zinc-400'}`}>
                    {pieceCount} Pieces {pieceCount <= 7 ? '(Within Tablebase Scope)' : '(Above 7 Pieces)'}
                  </span>
                </div>

                {tablebaseInfo?.isTablebase ? (
                  <div className="flex flex-col gap-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-400">Theoretical Outcome</span>
                      <span className="text-xs font-black uppercase text-[#81b64c]">
                        {tablebaseInfo.category || 'Win'}
                      </span>
                    </div>
                    {tablebaseInfo.dtz !== undefined && (
                      <div className="text-[11px] font-mono text-zinc-300">
                        Distance to Zero (DTZ): <strong className="text-white">{tablebaseInfo.dtz} moves</strong>
                      </div>
                    )}
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed bg-black/20 p-2 rounded-lg">
                      {tablebaseInfo.humanDescription}
                    </p>
                    {tablebaseInfo.bestMoveSan && (
                      <div className="text-xs font-mono font-bold text-[#81b64c] flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Optimal Move: {tablebaseInfo.bestMoveSan}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                    Tablebases calculate complete game trees for positions with 7 or fewer pieces, guaranteeing theoretical perfection and exact DTZ (moves until pawn advance or capture).
                  </p>
                )}
              </div>

              {/* Standard Endgame Position Presets */}
              <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block pt-1">
                  Load Classic Endgame Study
                </span>
                {[
                  { name: "Lucena Position (Rook Endgame)", fen: "1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1" },
                  { name: "Philidor Defense (Drawing Rooks)", fen: "8/8/8/4k3/4r3/8/5K2/4R3 b - - 0 1" },
                  { name: "King + Pawn vs King (Key Squares)", fen: "8/8/8/4k3/8/4K3/4P3/8 w - - 0 1" },
                  { name: "Queen vs Pawn on 7th Rank", fen: "8/8/8/8/8/4K3/4p3/3Q1k2 w - - 0 1" },
                ].map((eg, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      const newChess = new Chess(eg.fen);
                      setChess(newChess);
                      setHistoryFens([newChess.fen()]);
                      setSanHistory([]);
                      setHistoryIndex(0);
                      setLastMove(null);
                      soundService.playGameStart();
                    }}
                    className="p-2 rounded-xl bg-[#211f1c] border border-white/5 hover:border-[#81b64c]/40 transition-all cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-xs font-bold text-white">{eg.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                ))}
              </div>

              {/* Exactly ONE P1 Anchor Button */}
              <div className="pt-2 border-t border-white/5 shrink-0">
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  onClick={() => router.push('/endgames')}
                  className="w-full flex items-center justify-center gap-2 font-black"
                >
                  <span>Practice Studies in Endgame Hub</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-SCREEN 4: GAME VAULT & IMPORT */}
        {/* ========================================================================= */}
        {activeScreen === 'vault' && (
          <div className="w-full max-w-4xl mx-auto flex flex-col gap-3 my-auto min-h-0 h-full py-1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-white/5 pb-2 shrink-0">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#81b64c]" />
                  <span>Game Review Vault &amp; PGN Import</span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Import games from Check.mate, Chess.com, or Lichess into Analysis Studio
                </p>
              </div>

              {/* Controls: Live Sync & Provider Switcher */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={() => refreshVaultGames(true)}
                  disabled={isSyncingVault}
                  className="font-bold flex items-center gap-1.5"
                  title="Fetch fresh games from Chess.com & Lichess"
                >
                  <RotateCw className={`w-3.5 h-3.5 text-[#81b64c] ${isSyncingVault ? 'animate-spin' : ''}`} />
                  <span>{isSyncingVault ? 'Syncing...' : 'Sync Live'}</span>
                </Button>

                <div className="flex items-center gap-1 p-1 bg-[#141311] rounded-xl border border-white/5 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setVaultProvider('all')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      vaultProvider === 'all' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    All ({recentGamesList.length})
                  </button>
                  <button
                    onClick={() => setVaultProvider('checkmate')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      vaultProvider === 'checkmate' ? 'bg-[#81b64c] text-black font-black' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Check.mate
                  </button>
                  <button
                    onClick={() => setVaultProvider('chesscom')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      vaultProvider === 'chesscom' ? 'bg-emerald-600 text-white font-black' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Chess.com
                  </button>
                  <button
                    onClick={() => setVaultProvider('lichess')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      vaultProvider === 'lichess' ? 'bg-amber-600 text-white font-black' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Lichess
                  </button>
                </div>
              </div>
            </div>

            {/* Direct FEN / PGN Paste Import Box */}
            <div className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-2 shrink-0">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Upload className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>Paste FEN String or Full PGN Notation</span>
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="e.g. 1. e4 e5 2. Nf3 Nc6 3. d4 or rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  className="flex-1 bg-[#141311] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 font-mono outline-none focus:border-[#81b64c]"
                />
                <Button variant="secondary" size="xs" rounded="lg" onClick={handleImportSubmit} className="font-bold">
                  Load Position
                </Button>
              </div>
              {importError && <span className="text-xs text-red-400">{importError}</span>}
            </div>

            {/* Scrollable Game Rows List */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-2">
              {filteredVaultGames.length > 0 ? (
                filteredVaultGames.map((game) => {
                  const outcome = getSessionUserOutcome(game, effectiveDisplayName);
                  const isWin = outcome === 'win';
                  const isLoss = outcome === 'loss';
                  const isChessCom = game.source === 'chesscom' || game.id.startsWith('chesscom-');
                  const isLichess = game.source === 'lichess' || game.id.startsWith('lichess-');
                  const providerLabel = isChessCom ? 'Chess.com' : isLichess ? 'Lichess' : 'Check.mate';
                  const providerBadgeColor = isChessCom
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : isLichess
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-[#81b64c]/15 text-[#81b64c] border-[#81b64c]/30';

                  return (
                    <div
                      key={game.id}
                      className="p-3 rounded-2xl bg-[#1c1a17] border border-white/5 flex items-center justify-between gap-3 hover:border-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 uppercase tracking-wider ${
                            isWin ? 'bg-[#81b64c]/20 text-[#81b64c]' : isLoss ? 'bg-red-400/20 text-red-400' : 'bg-zinc-400/20 text-zinc-400'
                          }`}
                        >
                          {isWin ? 'VICTORY' : isLoss ? 'DEFEAT' : 'DRAW'}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {game.whitePlayer.name} vs {game.blackPlayer.name}
                            </span>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${providerBadgeColor}`}>
                              {providerLabel}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-zinc-400">
                            {game.gameResult || 'Concluded'} &bull; {Math.floor(game.timeControl / 60)}m clock &bull;{' '}
                            {new Date(game.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="secondary"
                          size="xs"
                          rounded="lg"
                          onClick={() => handleLoadSession(game)}
                          className="font-bold"
                          title="Load moves into Analysis Board"
                        >
                          Load in Studio
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          rounded="lg"
                          onClick={() => router.push(`/game/review/${game.id}`)}
                          className="font-bold"
                          title="Stockfish 18 Accuracy Review"
                        >
                          <Sparkles className="w-3 h-3 text-[#81b64c]" />
                          <span>Review</span>
                        </Button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-zinc-500 text-xs border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <History className="w-6 h-6 text-zinc-600" />
                  <span>No matches found for {vaultProvider}.</span>
                  {openChessComSync && (
                    <Button variant="outline" size="xs" rounded="lg" onClick={openChessComSync} className="font-bold mt-1">
                      Connect Accounts
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Exactly ONE P1 Anchor Button */}
            <div className="pt-2 border-t border-white/5 shrink-0">
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={handleGoToGameReview}
                className="w-full flex items-center justify-center gap-2 font-black"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Stockfish 18 Review for Active Board</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center h-full bg-[#161512] text-zinc-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin text-[#81b64c]" />
        </div>
      }
    >
      <AnalysisStudioContent />
    </Suspense>
  );
}
