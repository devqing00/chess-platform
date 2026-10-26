'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { ClassificationBadge } from '../board/ClassificationBadge';
import { PieceIcon } from '../board/PieceIcons';
import { CoachDannyAvatar } from './CoachDannyAvatar';
import { MentorAvatar } from './MentorAvatar';
import { Button } from '@/components/ui/button';
import { useShell } from '@/context/ShellContext';
import { MENTORS, getMentorById, generateMentorComment } from '@/lib/mentorsData';
import { explainChessMove } from '@/lib/chessMoveExplainer';
import {
  MoveRecord,
  MoveClassification,
  BoardTheme,
  PieceTheme,
  PieceColor,
  GamePlayer,
  ArrowAnnotation,
  GameResultDetails,
  EngineStrengthTier,
  ENGINE_STRENGTH_CONFIGS,
  KeyMoment,
} from '@/types/chess';
import { matchOpeningFromMoves } from '@/lib/openingsData';
import { formatGameOutcomeDescription, extractTerminationReason, isSessionUserWhite } from '@/lib/gameSessionStore';
import {
  ArrowLeft,
  Share2,
  Settings,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Keyboard,
  HelpCircle,
  Star,
  RotateCcw,
  Sparkles,
  ArrowUpDown,
  Flame,
  Cpu,
  Play,
  Pause,
  Eye,
  X,
  Filter,
  Microscope,
  RefreshCw,
  MoreHorizontal,
  BookOpen,
  Zap,
} from 'lucide-react';
import { EvalBar } from '../board/EvalBar';
import { soundService } from '@/lib/audioService';
import { ChessEvaluator } from '@/lib/chessEngine';
import confetti from 'canvas-confetti';

const PIP_COLORS: Record<string, string> = {
  brilliant: '#06b6d4',  // Cyan
  great: '#059669',      // Emerald
  best: '#10b981',       // Vibrant Emerald
  excellent: '#4ade80',  // Light Green
  good: '#84cc16',       // Yellow-Green
  book: '#a855f7',       // Purple / Book
  inaccuracy: '#eab308', // Amber / Yellow
  mistake: '#f97316',    // Orange
  miss: '#ef4444',       // Crimson Red
  blunder: '#b91c1c',    // Dark Red
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0,
};

interface MaterialBreakdown {
  whiteCaptured: PieceSymbol[];
  blackCaptured: PieceSymbol[];
  whiteAdvantage: number;
  blackAdvantage: number;
}

function getMaterialBreakdown(chess: Chess): MaterialBreakdown {
  const STARTING_COUNT: Record<PieceSymbol, number> = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1,
    k: 1,
  };

  const whiteOnBoard: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
  const blackOnBoard: Record<PieceSymbol, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        if (piece.color === 'w') {
          whiteOnBoard[piece.type]++;
        } else {
          blackOnBoard[piece.type]++;
        }
      }
    }
  }

  const PIECE_ORDER: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q'];

  // Pieces captured by White (missing Black pieces)
  const whiteCaptured: PieceSymbol[] = [];
  for (const t of PIECE_ORDER) {
    const missing = Math.max(0, STARTING_COUNT[t] - blackOnBoard[t]);
    for (let i = 0; i < missing; i++) whiteCaptured.push(t);
  }

  // Pieces captured by Black (missing White pieces)
  const blackCaptured: PieceSymbol[] = [];
  for (const t of PIECE_ORDER) {
    const missing = Math.max(0, STARTING_COUNT[t] - whiteOnBoard[t]);
    for (let i = 0; i < missing; i++) blackCaptured.push(t);
  }

  let whiteTotal = 0;
  let blackTotal = 0;
  for (const t of PIECE_ORDER) {
    whiteTotal += whiteOnBoard[t] * PIECE_VALUES[t];
    blackTotal += blackOnBoard[t] * PIECE_VALUES[t];
  }

  const diff = whiteTotal - blackTotal;

  return {
    whiteCaptured,
    blackCaptured,
    whiteAdvantage: diff > 0 ? diff : 0,
    blackAdvantage: diff < 0 ? Math.abs(diff) : 0,
  };
}

interface GameReviewViewProps {
  gameId?: string;
  moves: MoveRecord[];
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  whiteAccuracy?: number;
  blackAccuracy?: number;
  keyMoments?: KeyMoment[];
  gameResult?: string | null;
  resultDetails?: GameResultDetails | null;
  termination?: string;
  engineStrength?: EngineStrengthTier;
  onBackToGame: () => void;
  onBackToSummary?: () => void;
  onEngineChange?: (engine: 'torch_human' | 'stockfish') => void;
  onStrengthChange?: (strength: EngineStrengthTier) => void;
  onReanalyze?: () => void;
}

export const GameReviewView: React.FC<GameReviewViewProps> = ({
  gameId,
  moves,
  whitePlayer,
  blackPlayer,
  boardTheme,
  pieceTheme,
  whiteAccuracy,
  blackAccuracy,
  keyMoments,
  gameResult,
  resultDetails,
  termination,
  engineStrength,
  onBackToGame,
  onBackToSummary,
  onEngineChange,
  onStrengthChange,
  onReanalyze,
}) => {
  const router = useRouter();
  const { activeMentorId, setActiveMentorId, analysisEngine, setAnalysisEngine, openSettings } = useShell();
  const currentMentor = getMentorById(activeMentorId);

  const [notationFilter, setNotationFilter] = useState<'all' | 'highlights'>('all');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const isUserWhite = useMemo(() => {
    return isSessionUserWhite({
      whitePlayer,
      blackPlayer,
      gameResult: gameResult || undefined,
      resultDetails: resultDetails || undefined,
      pgn: '',
    } as any);
  }, [whitePlayer, blackPlayer, gameResult, resultDetails]);

  const gameOutcome = useMemo(() => {
    let winner = resultDetails?.winner;
    const res = (gameResult || '').trim().toLowerCase();
    if (res.includes('white win') || res.includes('white won') || res.includes('1-0')) {
      winner = 'w';
    } else if (res.includes('black win') || res.includes('black won') || res.includes('0-1')) {
      winner = 'b';
    } else if (!winner) {
      if (gameResult === '1-0') winner = 'w';
      else if (gameResult === '0-1') winner = 'b';
      else if (gameResult?.includes('1/2') || gameResult?.includes('0.5')) winner = 'draw';
      else winner = isUserWhite ? 'w' : 'b';
    }
    const reason = resultDetails?.reason || (termination ? extractTerminationReason({ pgn: `[Termination "${termination}"]` }) : 'resignation');
    return formatGameOutcomeDescription({
      winner,
      reason,
      whiteName: whitePlayer.name,
      blackName: blackPlayer.name,
      isUserWhite,
    });
  }, [resultDetails, gameResult, termination, whitePlayer.name, blackPlayer.name, isUserWhite]);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isNotationModalOpen, setIsNotationModalOpen] = useState(false);

  const [activeMoveIndex, setActiveMoveIndex] = useState<number>(() => {
    // Start on the first move so the user reviews sequentially from the beginning
    return moves.length > 0 ? 0 : -1;
  });

  const activeNotationItemRef = useRef<HTMLButtonElement | null>(null);
  const pipTimelineDesktopRef = useRef<HTMLDivElement | null>(null);
  const pipTimelineMobileRef = useRef<HTMLDivElement | null>(null);
  const pipDesktopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pipMobileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Auto-scroll the active move into view inside the notation list and pip timeline (instant auto behavior to prevent animation queuing lag)
  useEffect(() => {
    if (activeNotationItemRef.current) {
      activeNotationItemRef.current.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'auto',
      });
    }
    if (activeMoveIndex >= 0) {
      pipDesktopRefs.current[activeMoveIndex]?.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
      pipMobileRefs.current[activeMoveIndex]?.scrollIntoView({
        behavior: 'auto',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeMoveIndex]);

  // Dynamically compute active ECO opening theory from move history up to activeMoveIndex
  const activeOpening = useMemo(() => {
    if (moves.length === 0 || activeMoveIndex < 0) return null;
    const currentSanList = moves.slice(0, activeMoveIndex + 1).map((m) => m.san);
    return matchOpeningFromMoves(currentSanList);
  }, [moves, activeMoveIndex]);

  const [showBestMove, setShowBestMove] = useState(false);
  const [showFollowUpMove, setShowFollowUpMove] = useState(false);
  const [isRetryMode, setIsRetryMode] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState<boolean | null>(null);
  const [retryMove, setRetryMove] = useState<{
    chess: Chess;
    from: Square;
    to: Square;
    san: string;
    classification: MoveClassification;
    comment: string;
  } | null>(null);

  // DVD Player Rapid Fast Forward / Rewind Interval
  const fastForwardIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isFastForwarding, setIsFastForwarding] = useState(false);

  const stopFastForward = useCallback(() => {
    if (fastForwardIntervalRef.current) {
      clearInterval(fastForwardIntervalRef.current);
      fastForwardIntervalRef.current = null;
    }
    setIsFastForwarding(false);
  }, []);

  useEffect(() => {
    return () => {
      if (fastForwardIntervalRef.current) {
        clearInterval(fastForwardIntervalRef.current);
      }
    };
  }, []);

  const [orientation, setOrientation] = useState<PieceColor>(() => {
    // User piece whether white or black MUST be the bottom one
    return isUserWhite ? 'w' : 'b';
  });

  useEffect(() => {
    setOrientation(isUserWhite ? 'w' : 'b');
  }, [isUserWhite]);

  const playMoveAudio = (m: MoveRecord | null) => {
    if (!m) return;
    const cls = getCleanClassification(m.classification);
    if (m.san.includes('#')) {
      soundService.playCheckmate();
    } else if (cls === 'brilliant') {
      soundService.playBrilliant();
    } else if (cls === 'great') {
      soundService.playGreat();
    } else if (cls === 'blunder') {
      soundService.playBlunder();
    } else if (cls === 'mistake' || cls === 'miss') {
      soundService.playMiss();
    } else if (m.san.includes('+') || m.isCheck) {
      soundService.playCheck();
    } else if (m.san.includes('x') || m.captured) {
      soundService.playCapture();
    } else if (m.san.includes('O-O')) {
      soundService.playCastle();
    } else {
      soundService.playMove();
    }
  };

  const getCleanClassification = (cls: any): MoveClassification => {
    if (!cls) return 'good';
    if (typeof cls === 'object' && cls !== null) {
      const inner = (cls as any).classification;
      if (typeof inner === 'string') {
        const c = inner.toLowerCase().trim();
        if (c !== '[object object]' && !c.includes('object')) {
          return c as MoveClassification;
        }
      }
      return 'good';
    }
    if (typeof cls === 'string') {
      const lower = cls.toLowerCase().trim();
      if (lower === '[object object]' || lower.includes('object')) {
        return 'good';
      }
      const valid = [
        'brilliant',
        'great',
        'best',
        'excellent',
        'good',
        'book',
        'inaccuracy',
        'mistake',
        'blunder',
        'miss',
      ];
      if (valid.includes(lower)) {
        return lower as MoveClassification;
      }
    }
    return 'good';
  };

  const activeMove = activeMoveIndex >= 0 && activeMoveIndex < moves.length ? moves[activeMoveIndex] : null;
  const activeClass = activeMove ? getCleanClassification(activeMove.classification) : 'good';

  const isWhiteMove = activeMoveIndex % 2 === 0;
  const isPlayerMove = isWhiteMove === isUserWhite;
  const movingPlayer = isWhiteMove ? whitePlayer : blackPlayer;
  const movingPlayerName = movingPlayer?.name || (isPlayerMove ? 'You' : 'Opponent');

  // Next player to move from fenAfter
  const nextPlayer = isWhiteMove ? blackPlayer : whitePlayer;
  const nextPlayerName = nextPlayer?.name || (!isPlayerMove ? 'You' : 'Opponent');

  // Helper: Try executing a move on a FEN string with fallback disambiguation
  const tryExecuteMove = (
    fen: string,
    moveStr?: string,
    fallbackFrom?: Square,
    fallbackTo?: Square
  ): { chess: Chess; san: string; from: Square; to: Square } | null => {
    if (!fen) return null;
    try {
      const c = new Chess(fen);
      if (c.isGameOver()) return null;

      // 1. Direct standard move
      if (moveStr) {
        try {
          const m = c.move(moveStr);
          if (m) {
            return { chess: c, san: m.san, from: m.from as Square, to: m.to as Square };
          }
        } catch {}

        // 2. Cleaned SAN without punctuation
        const cleanStr = moveStr.replace(/[+#?!]/g, '').trim();
        const legalMoves = c.moves({ verbose: true });
        const match = legalMoves.find((lm) => {
          const lmClean = lm.san.replace(/[+#?!]/g, '').trim();
          return (
            lmClean === cleanStr ||
            lm.lan === cleanStr ||
            `${lm.from}${lm.to}`.toLowerCase() === cleanStr.toLowerCase()
          );
        });

        if (match) {
          const m = c.move(match.san);
          if (m) {
            return { chess: c, san: m.san, from: m.from as Square, to: m.to as Square };
          }
        }

        // 3. Coordinate move (e.g. e2e4)
        if (moveStr.length >= 4) {
          const from = moveStr.slice(0, 2) as Square;
          const to = moveStr.slice(2, 4) as Square;
          const promotion = moveStr.length > 4 ? (moveStr[4] as PieceSymbol) : undefined;
          try {
            const m = c.move({ from, to, promotion });
            if (m) {
              return { chess: c, san: m.san, from: m.from as Square, to: m.to as Square };
            }
          } catch {}
        }
      }

      // 4. Fallback: direct from/to squares
      if (fallbackFrom && fallbackTo) {
        try {
          const m = c.move({ from: fallbackFrom, to: fallbackTo });
          if (m) {
            return { chess: c, san: m.san, from: m.from as Square, to: m.to as Square };
          }
        } catch {}
      }

      // 5. Ultimate fallback: first legal move
      const legal = c.moves({ verbose: true });
      if (legal.length > 0) {
        const m = c.move(legal[0].san);
        if (m) {
          return { chess: c, san: m.san, from: m.from as Square, to: m.to as Square };
        }
      }
    } catch {}
    return null;
  };

  // Best move executed from fenBefore on the board (Chess.com "Best" mode)
  // Computed lazily ONLY when user clicks "Best" so regular move navigation is 100% lag-free
  const bestMoveVariation = useMemo<{ chess: Chess; san: string; from: Square; to: Square } | null>(() => {
    if (!activeMove || !activeMove.fenBefore) return null;
    if (!showBestMove) return null;

    const cls = getCleanClassification(activeMove.classification);
    const isSuboptimal = ['blunder', 'mistake', 'miss', 'inaccuracy'].includes(cls);

    let candidateSan = activeMove.bestMoveSan;

    // If activeMove is suboptimal, candidateSan cannot be activeMove.san
    if (isSuboptimal && candidateSan === activeMove.san) {
      candidateSan = undefined;
    }

    // Sanity check: disqualify any candidate move that walks into immediate mate or hangs mate-in-1
    if (candidateSan) {
      try {
        const testChess = new Chess(activeMove.fenBefore);
        const m = testChess.move(candidateSan);
        if (!m) {
          candidateSan = undefined;
        } else {
          const opponentMates = testChess.moves({ verbose: true }).some((oppM: any) => oppM.san.includes('#'));
          if (opponentMates) {
            candidateSan = undefined;
          }
        }
      } catch {
        candidateSan = undefined;
      }
    }

    // 1. Fast path: recorded bestMoveSan from engine review (instant execution, 0ms latency)
    if (candidateSan) {
      const exec = tryExecuteMove(activeMove.fenBefore, candidateSan);
      if (exec) return exec;
    }

    // 2. Dynamic engine search if candidateSan was invalid, missing, or hung mate
    try {
      const c = new Chess(activeMove.fenBefore);
      if (!c.isGameOver()) {
        const res = ChessEvaluator.findBestMoveAndScore(c);
        if (res.bestMoveSan && (!isSuboptimal || res.bestMoveSan !== activeMove.san)) {
          const exec = tryExecuteMove(activeMove.fenBefore, res.bestMoveSan);
          if (exec) return exec;
        }
      }
    } catch {}

    // 3. Fallback: Any legal move that avoids immediate checkmate
    if (isSuboptimal) {
      try {
        const c = new Chess(activeMove.fenBefore);
        const legalMoves = c.moves({ verbose: true });
        for (const lm of legalMoves) {
          if (lm.san === activeMove.san) continue;
          const clone = new Chess(activeMove.fenBefore);
          clone.move(lm.san);
          const hangsMate = clone.moves({ verbose: true }).some((m: any) => m.san.includes('#'));
          if (!hangsMate) {
            const exec = tryExecuteMove(activeMove.fenBefore, lm.san, lm.from as Square, lm.to as Square);
            if (exec) return exec;
          }
        }
      } catch {}
    }

    // 4. Fallback: played move itself (only if move was not suboptimal)
    if (activeMove.san && !isSuboptimal) {
      const exec = tryExecuteMove(activeMove.fenBefore, activeMove.san, activeMove.from, activeMove.to);
      if (exec) return exec;
    }

    return null;
  }, [activeMove, showBestMove]);

  // Next player's follow-up reply executed from fenAfter on the board (Chess.com "Show" mode)
  // Computed lazily ONLY when user clicks "Show Response" so navigating moves stays 100% lag-free
  const followUpVariation = useMemo<{ chess: Chess; san: string; from: Square; to: Square } | null>(() => {
    if (!activeMove || !activeMove.fenAfter) return null;
    if (!showFollowUpMove) return null; // Avoid expensive tree searches during regular move navigation

    const nextMoveRecord = moves[activeMoveIndex + 1];

    // 1. Instant path: Try opponent's bestMoveSan from nextMoveRecord
    if (nextMoveRecord?.bestMoveSan) {
      const exec = tryExecuteMove(activeMove.fenAfter, nextMoveRecord.bestMoveSan, nextMoveRecord.from, nextMoveRecord.to);
      if (exec) return exec;
    }

    // 2. Instant path: If next move in game was best/great/book
    if (nextMoveRecord?.san) {
      const nextCleanClass = getCleanClassification(nextMoveRecord.classification);
      if (['best', 'great', 'book', 'excellent', 'good'].includes(nextCleanClass)) {
        const exec = tryExecuteMove(activeMove.fenAfter, nextMoveRecord.san, nextMoveRecord.from, nextMoveRecord.to);
        if (exec) return exec;
      }
    }

    // 3. Fallback engine search on activeMove.fenAfter
    try {
      const c = new Chess(activeMove.fenAfter);
      if (!c.isGameOver()) {
        const res = ChessEvaluator.findBestMoveAndScore(c);
        if (res.bestMoveSan) {
          const exec = tryExecuteMove(activeMove.fenAfter, res.bestMoveSan);
          if (exec) return exec;
        }
      }
    } catch {}

    // 4. Any legal reply from fenAfter
    return tryExecuteMove(activeMove.fenAfter);
  }, [activeMove, activeMoveIndex, moves, showFollowUpMove]);

  // Condition under which "Best" button is disabled:
  // - Book moves should not have a best move
  // - Best moves should not have another best move
  // - Suboptimal moves (blunder, mistake, miss, inaccuracy) MUST ALWAYS have Best button enabled
  const isBestDisabled = useMemo(() => {
    if (!activeMove || !activeMove.fenBefore) return true;
    const cls = getCleanClassification(activeMove.classification);
    if (cls === 'book' || cls === 'best') return true;

    // For any suboptimal move, the "Best" button must ALWAYS be clickable
    if (['blunder', 'mistake', 'miss', 'inaccuracy'].includes(cls)) {
      return false;
    }

    if (activeMove.bestMoveSan && activeMove.bestMoveSan === activeMove.san) return true;
    return false;
  }, [activeMove]);

  // Condition under which "Show" button is disabled:
  // - Game is over after this move (checkmate, stalemate, or draw)
  // - Last move of the game
  const isShowDisabled = useMemo(() => {
    if (!activeMove || !activeMove.fenAfter) return true;
    if (activeMove.san?.includes('#')) return true;
    if (activeMoveIndex >= moves.length - 1) return true;
    try {
      const c = new Chess(activeMove.fenAfter);
      return c.isGameOver();
    } catch {
      return false;
    }
  }, [activeMove, activeMoveIndex, moves.length]);

  const formatClassificationDescription = (san: string, cls: MoveClassification): string => {
    switch (cls) {
      case 'book':
        return `${san} is book`;
      case 'brilliant':
        return `${san} is brilliant`;
      case 'great':
        return `${san} is great`;
      case 'best':
        return `${san} is best`;
      case 'excellent':
        return `${san} is excellent`;
      case 'good':
        return `${san} is good`;
      case 'inaccuracy':
        return `${san} is an inaccuracy`;
      case 'mistake':
        return `${san} is a mistake`;
      case 'miss':
        return `${san} is a miss`;
      case 'blunder':
        return `${san} is a blunder`;
      default:
        return `${san} is good`;
    }
  };

  const coachComment = activeMove
    ? generateMentorComment(
        activeMentorId,
        activeClass,
        activeMove.san,
        activeMove.bestMoveSan,
        activeMove.evalAfter,
        movingPlayerName,
        isPlayerMove,
        activeMove.motif,
        activeMove.fenBefore
      )
    : 'Step through the moves below to review the critical turning points and engine accuracy.';

  const displayedBadgeClass: MoveClassification = showBestMove
    ? 'best'
    : showFollowUpMove
    ? 'best'
    : isRetryMode && retryMove
    ? retryMove.classification
    : isRetryMode
    ? 'best'
    : activeClass;

  const displayedHeaderTitle: string = useMemo(() => {
    if (!activeMove) return 'Game Review Ready';
    if (showBestMove && bestMoveVariation) {
      return `${bestMoveVariation.san} was Best`;
    }
    if (showFollowUpMove && followUpVariation) {
      return `${followUpVariation.san} is Best Response`;
    }
    if (isRetryMode) {
      if (retryMove) {
        return `Retry: ${retryMove.san} is ${retryMove.classification.toUpperCase()}`;
      }
      return `Retry: Find Best Move`;
    }
    const base = formatClassificationDescription(activeMove.san, activeClass);
    if (activeMoveIndex === moves.length - 1) {
      return `${base} · ${gameOutcome.fullSentence}`;
    }
    return base;
  }, [activeMove, showBestMove, showFollowUpMove, isRetryMode, retryMove, activeClass, bestMoveVariation, followUpVariation, activeMoveIndex, moves.length, gameOutcome.fullSentence]);

  const displayedComment = useMemo(() => {
    if (!activeMove) return 'Step through the moves below to review the critical turning points and engine accuracy.';
    if (showBestMove && bestMoveVariation) {
      if (activeMove.san === bestMoveVariation.san) {
        return `You already played the top engine move! ${activeMove.san} maintains the highest advantage for ${movingPlayerName}. Click "Best" again to return.`;
      }
      const betterDescribed = explainChessMove(bestMoveVariation.san, activeMove.fenBefore);
      return `Instead of ${activeMove.san}, ${movingPlayerName} should have played ${betterDescribed}. This ${activeMove.motif ? `capitalizes on ${activeMove.motif.description || activeMove.motif.type}` : 'preserves optimal piece coordination and positional advantage'}. Click "Best" again to return to your move.`;
    }
    if (showFollowUpMove && followUpVariation) {
      const followUpDescribed = explainChessMove(followUpVariation.san, activeMove.fenAfter);
      return `The strongest response for ${nextPlayerName} is ${followUpDescribed}. This ${activeMove.motif ? `counters your attack and fights for counterplay` : 'is the most precise tactical continuation'}. Click "Show" again to return to your move.`;
    }
    if (isRetryMode) {
      if (retrySuccess === true && retryMove) {
        return retryMove.comment;
      }
      if (retrySuccess === false && retryMove) {
        return retryMove.comment;
      }
      return `Can you find the best move for ${movingPlayerName}? Make your move directly on the board.`;
    }
    if (activeMoveIndex === moves.length - 1) {
      return `${coachComment} Game ended: ${gameOutcome.fullSentence} (${gameOutcome.subtitle}).`;
    }
    if (activeClass === 'book') {
      if (activeOpening) {
        return `Book move! Standard grandmaster opening theory in the ${activeOpening.name} [${activeOpening.eco}]. ${activeOpening.description || 'Focus on controlling the center, developing pieces smoothly, and securing early king safety.'}`;
      }
      return `${activeMove.san} is standard grandmaster opening theory, following time-tested principles for piece development.`;
    }
    return coachComment;
  }, [activeMove, showBestMove, showFollowUpMove, isRetryMode, retrySuccess, retryMove, coachComment, movingPlayerName, nextPlayerName, bestMoveVariation, followUpVariation, activeMoveIndex, moves.length, gameOutcome.fullSentence, gameOutcome.subtitle, activeClass, activeOpening]);

  // Compute chess board position: actually plays Best Move or Follow-up on the board
  const { currentChess, activeSquareHighlight, displayedLastMove } = useMemo(() => {
    const c = new Chess();
    if (activeMoveIndex === -1 || moves.length === 0) {
      return { currentChess: c, activeSquareHighlight: null, displayedLastMove: null };
    }

    const targetMove = moves[activeMoveIndex];
    if (isRetryMode) {
      if (retryMove) {
        return {
          currentChess: retryMove.chess,
          activeSquareHighlight: {
            square: retryMove.to,
            classification: retryMove.classification,
          },
          displayedLastMove: { from: retryMove.from, to: retryMove.to },
        };
      }
      // In retry mode, set board to position BEFORE the move
      return {
        currentChess: new Chess(targetMove.fenBefore),
        activeSquareHighlight: null,
        displayedLastMove: null,
      };
    }

    // When showing best move: piece is moved on board to the best square!
    if (showBestMove && bestMoveVariation) {
      return {
        currentChess: bestMoveVariation.chess,
        activeSquareHighlight: {
          square: bestMoveVariation.to,
          classification: 'best' as MoveClassification,
        },
        displayedLastMove: { from: bestMoveVariation.from, to: bestMoveVariation.to },
      };
    }

    // When showing follow-up move: opponent piece is moved on board to the response square!
    if (showFollowUpMove && followUpVariation) {
      return {
        currentChess: followUpVariation.chess,
        activeSquareHighlight: {
          square: followUpVariation.to,
          classification: 'best' as MoveClassification,
        },
        displayedLastMove: { from: followUpVariation.from, to: followUpVariation.to },
      };
    }

    // Default: actual game move played
    return {
      currentChess: new Chess(targetMove.fenAfter),
      activeSquareHighlight: {
        square: targetMove.to,
        classification: getCleanClassification(targetMove.classification),
      },
      displayedLastMove: { from: targetMove.from, to: targetMove.to },
    };
  }, [moves, activeMoveIndex, isRetryMode, showBestMove, showFollowUpMove, bestMoveVariation, followUpVariation]);

  // Material counts & captured piece tray
  const materialInfo = useMemo(() => {
    return getMaterialBreakdown(currentChess);
  }, [currentChess]);

  // Auto-play game review stepper
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed] = useState<number>(1500);

  useEffect(() => {
    if (!isPlaying) return;
    if (activeMoveIndex >= moves.length - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setActiveMoveIndex((prev) => {
        const next = prev + 1;
        if (next < moves.length) {
          playMoveAudio(moves[next]);
          return next;
        }
        setIsPlaying(false);
        return prev;
      });
    }, playSpeed);

    return () => clearTimeout(timer);
  }, [isPlaying, activeMoveIndex, moves, playSpeed]);

  // Dynamic evaluation score formatted (e.g. +1.61, -0.45, M1)
  const formattedScore = useMemo(() => {
    if (!activeMove) return '0.0';
    const score = activeMove.evalAfter;
    if (Math.abs(score) >= 20000) {
      return score > 0 ? 'M1' : '-M1';
    }
    const val = (score / 100).toFixed(2);
    return score > 0 ? `+${val}` : `${val}`;
  }, [activeMove]);

  // Horizontal bar fill percentage (sigmoid)
  const evalPercent = useMemo(() => {
    if (!activeMove) return 50;
    const score = activeMove.evalAfter;
    const winProb = 1 / (1 + Math.pow(10, -score / 400));
    return Math.min(95, Math.max(5, winProb * 100));
  }, [activeMove]);

  // Key moments (Turning points from report or fallback classification filters)
  const keyMomentIndices: number[] = useMemo(() => {
    if (keyMoments && keyMoments.length > 0) {
      return keyMoments
        .map((km: KeyMoment) => km.moveIndex)
        .filter((idx: number) => typeof idx === 'number' && idx >= 0 && idx < moves.length);
    }
    const indices: number[] = [];
    moves.forEach((m: MoveRecord, idx: number) => {
      if (
        m.classification === 'brilliant' ||
        m.classification === 'great' ||
        m.classification === 'blunder' ||
        m.classification === 'mistake' ||
        m.classification === 'miss'
      ) {
        indices.push(idx);
      }
    });
    return indices;
  }, [moves, keyMoments]);

  const handleToggleBest = () => {
    stopFastForward();
    if (showBestMove) {
      setShowBestMove(false);
      if (activeMove) playMoveAudio(activeMove);
    } else {
      if (isBestDisabled) return;
      setShowBestMove(true);
      setShowFollowUpMove(false);
      setIsRetryMode(false);
      setRetrySuccess(null);
      setRetryMove(null);
      setIsPlaying(false);
      soundService.playGreat();
    }
  };

  const handleToggleShow = () => {
    stopFastForward();
    if (showFollowUpMove) {
      setShowFollowUpMove(false);
      if (activeMove) playMoveAudio(activeMove);
    } else {
      if (isShowDisabled) return;
      setShowFollowUpMove(true);
      setShowBestMove(false);
      setIsRetryMode(false);
      setRetrySuccess(null);
      setRetryMove(null);
      setIsPlaying(false);
      soundService.playMove();
    }
  };

  const handleToggleRetry = () => {
    stopFastForward();
    if (isRetryMode) {
      setIsRetryMode(false);
      setRetrySuccess(null);
      setRetryMove(null);
    } else {
      setIsRetryMode(true);
      setRetrySuccess(null);
      setRetryMove(null);
      setShowBestMove(false);
      setShowFollowUpMove(false);
      setIsPlaying(false);
    }
  };

  const navigateToMove = (targetIdx: number) => {
    stopFastForward();
    setShowBestMove(false);
    setShowFollowUpMove(false);
    setIsRetryMode(false);
    setRetrySuccess(null);
    setRetryMove(null);
    setIsPlaying(false);

    const clamped = Math.max(0, Math.min(moves.length - 1, targetIdx));
    setActiveMoveIndex(clamped);

    if (moves[clamped]) {
      playMoveAudio(moves[clamped]);
    }
  };

  // DVD Player Rapid Fast Forward / Rewind: smooth rapid scan across moves
  const runDvdScan = useCallback(
    (targetIndex: number) => {
      stopFastForward();
      setShowBestMove(false);
      setShowFollowUpMove(false);
      setIsRetryMode(false);
      setRetrySuccess(null);
      setRetryMove(null);
      setIsPlaying(false);

      const clampedTarget = Math.max(0, Math.min(moves.length - 1, targetIndex));
      if (clampedTarget === activeMoveIndex) return;

      const diff = Math.abs(clampedTarget - activeMoveIndex);
      if (diff <= 1) {
        navigateToMove(clampedTarget);
        return;
      }

      setIsFastForwarding(true);
      const stepDirection = clampedTarget > activeMoveIndex ? 1 : -1;
      let currentIdx = activeMoveIndex;

      fastForwardIntervalRef.current = setInterval(() => {
        currentIdx += stepDirection;
        setActiveMoveIndex(currentIdx);

        if (currentIdx === clampedTarget) {
          if (fastForwardIntervalRef.current) {
            clearInterval(fastForwardIntervalRef.current);
            fastForwardIntervalRef.current = null;
          }
          setIsFastForwarding(false);
          if (moves[clampedTarget]) {
            playMoveAudio(moves[clampedTarget]);
          }
        }
      }, 55); // 55ms instantaneous unlagged DVD playback
    },
    [activeMoveIndex, moves, stopFastForward]
  );

  const handlePrevKeyMoment = () => {
    const prevKeys = keyMomentIndices.filter((idx) => idx < activeMoveIndex);
    if (prevKeys.length > 0) {
      runDvdScan(prevKeys[prevKeys.length - 1]);
    } else if (activeMoveIndex > 0) {
      navigateToMove(activeMoveIndex - 1);
    }
  };

  const handleNextKeyMoment = () => {
    const nextKey = keyMomentIndices.find((idx) => idx > activeMoveIndex);
    if (nextKey !== undefined) {
      runDvdScan(nextKey);
    } else if (activeMoveIndex < moves.length - 1) {
      navigateToMove(activeMoveIndex + 1);
    }
  };

  const handlePrevMove = () => {
    stopFastForward();
    if (activeMoveIndex > 0) {
      navigateToMove(activeMoveIndex - 1);
    }
  };

  const handleNextMove = () => {
    stopFastForward();
    if (activeMoveIndex < moves.length - 1) {
      navigateToMove(activeMoveIndex + 1);
    }
  };

  // Keyboard navigation for Game Review
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stopFastForward();
        handlePrevMove();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stopFastForward();
        handleNextMove();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevKeyMoment();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextKeyMoment();
      } else if (e.key === ' ') {
        e.preventDefault();
        stopFastForward();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        if (!isBestDisabled || showBestMove) {
          handleToggleBest();
        }
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        if (!isShowDisabled || showFollowUpMove) {
          handleToggleShow();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleToggleRetry();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setOrientation((prev) => (prev === 'w' ? 'b' : 'w'));
      } else if (e.key === 'Home') {
        e.preventDefault();
        stopFastForward();
        if (moves.length > 0) {
          navigateToMove(0);
        }
      } else if (e.key === 'End') {
        e.preventDefault();
        stopFastForward();
        if (moves.length > 0) {
          navigateToMove(moves.length - 1);
        }
      } else if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        stopFastForward();
        setIsShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMoveIndex, moves, keyMomentIndices, showBestMove, showFollowUpMove, isRetryMode, stopFastForward]);

  const handleRetryMove = (from: Square, to: Square) => {
    if (!activeMove) return;
    try {
      const baseChess = new Chess(activeMove.fenBefore);
      const move = baseChess.move({ from, to });
      if (!move) return;

      const cleanMoveSan = move.san.replace(/[+#?!]/g, '').trim();
      const cleanBestSan = (activeMove.bestMoveSan || '').replace(/[+#?!]/g, '').trim();
      const cleanVarSan = (bestMoveVariation?.san || '').replace(/[+#?!]/g, '').trim();

      const isDirectBestMatch = cleanMoveSan === cleanBestSan || cleanMoveSan === cleanVarSan;

      const evalBefore = activeMove.evalBefore;
      const evalAfter = ChessEvaluator.evaluateWithReply(baseChess);
      const turn = activeMoveIndex % 2 === 0 ? 'w' : 'b';
      const isWhite = turn === 'w';

      const engineBest = ChessEvaluator.findBestMoveAndScore(new Chess(activeMove.fenBefore));
      const evalLoss = isWhite ? (engineBest.score - evalAfter) : (evalAfter - engineBest.score);

      const classificationObj = ChessEvaluator.classifyMove(
        move.san,
        engineBest.bestMoveSan || activeMove.bestMoveSan || '',
        evalBefore,
        evalAfter,
        turn as any,
        Boolean(move.captured),
        baseChess.isCheck(),
        activeMoveIndex,
        move.piece,
        Math.abs(engineBest.score - engineBest.secondBestScore),
        activeMove.fenBefore,
        baseChess.fen(),
        move.from as Square,
        move.to as Square
      );

      const cls = classificationObj.classification;
      const isWinningPosition = isWhite ? evalAfter >= 300 : evalAfter <= -300;
      const isAcceptedMove =
        isDirectBestMatch ||
        cls === 'brilliant' ||
        cls === 'great' ||
        cls === 'best' ||
        cls === 'excellent' ||
        evalLoss <= 30 ||
        (isWinningPosition && evalLoss <= 60);

      const effectiveClass: MoveClassification =
        isDirectBestMatch || cls === 'brilliant' || cls === 'great' || cls === 'best'
          ? (cls === 'brilliant' || cls === 'great' ? cls : 'best')
          : 'excellent';

      if (isAcceptedMove) {
        soundService.playBrilliant();
        setRetrySuccess(true);
        setRetryMove({
          chess: baseChess,
          from: move.from as Square,
          to: move.to as Square,
          san: move.san,
          classification: effectiveClass,
          comment: `🎉 Fantastic! You played ${move.san} (${effectiveClass.toUpperCase()})! ${
            evalLoss <= 10 ? 'That matches the top engine move.' : 'An excellent tactical continuation!'
          }`,
        });
        try {
          confetti({
            particleCount: 50,
            spread: 70,
            origin: { y: 0.65 },
          });
        } catch {}
      } else {
        soundService.playBlunder();
        setRetrySuccess(false);
        setRetryMove({
          chess: baseChess,
          from: move.from as Square,
          to: move.to as Square,
          san: move.san,
          classification: cls,
          comment: `❌ ${move.san} was ${cls.toUpperCase()} (eval diff: -${Math.max(0, Math.round(evalLoss / 10)) / 10} pawns). Try finding a stronger move directly on the board!`,
        });
      }
    } catch (err) {
      console.error('Retry move error:', err);
    }
  };

  // Review arrows: move played arrow takes exact move badge color, or variation arrow in preview mode
  const reviewArrows = useMemo<ArrowAnnotation[]>(() => {
    const list: ArrowAnnotation[] = [];
    if (!activeMove || isRetryMode) return list;

    const classification = getCleanClassification(activeMove.classification);

    const colorMap: Record<string, string> = {
      brilliant: '#1baca6',
      great: '#5c8bb0',
      best: '#10b981',
      excellent: '#96bc4b',
      good: '#90928f',
      book: '#d5a47d',
      inaccuracy: '#f0c15c',
      mistake: '#e58f2a',
      blunder: '#ca3431',
      miss: '#e05244',
    };

    // 1. When showing best move on board, draw green arrow
    if (showBestMove && bestMoveVariation) {
      list.push({
        from: bestMoveVariation.from,
        to: bestMoveVariation.to,
        color: '#10b981',
      });
      return list;
    }

    // 2. When showing follow-up response on board, draw sky blue arrow
    if (showFollowUpMove && followUpVariation) {
      list.push({
        from: followUpVariation.from,
        to: followUpVariation.to,
        color: '#0284c7', // Sky Blue
      });
      return list;
    }

    // 3. Move played arrow always takes the move badge classification color
    if (activeMove.from && activeMove.to) {
      list.push({
        from: activeMove.from,
        to: activeMove.to,
        color: colorMap[classification] || '#10b981',
      });
    }

    return list;
  }, [activeMove, showBestMove, showFollowUpMove, bestMoveVariation, followUpVariation, isRetryMode]);

  return (
    <div className="flex flex-col min-h-[100dvh] xl:h-[100dvh] xl:max-h-[100dvh] w-full bg-[#161512] text-zinc-100 select-none overflow-y-auto xl:overflow-hidden justify-start pb-16 xl:pb-0">
      {/* Top Micro-Header Bar (36px-40px, flex-shrink: 0, never overlaps board) */}
      <header className="h-9 sm:h-10 px-2 sm:px-4 bg-[#1f1d1a] border-b border-[#2d2a26] flex items-center justify-between shrink-0 shadow-sm z-30">
        {/* Left: Compact Back / Summary button */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <button
            onClick={onBackToSummary || onBackToGame}
            className="px-2 py-1 rounded-full border border-[#35322b] bg-[#282622] text-zinc-300 hover:text-white hover:bg-[#34312b] transition-all cursor-pointer flex items-center gap-1 text-[11px] font-black uppercase tracking-wider shrink-0"
            title="Back to Review Summary"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Summary</span>
          </button>
          <button
            onClick={onBackToGame}
            className="px-2.5 py-1 rounded-full bg-[#272522] hover:bg-[#33302b] text-[11px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-200 border border-[#3b3833] transition-all cursor-pointer hidden lg:flex items-center gap-1 shrink-0"
            title="Exit to Play / Home"
          >
            <span>Play</span>
          </button>
        </div>

        {/* Center: Title + Active Move info */}
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
            <span className="hidden xs:inline">Game </span>Review
          </h1>
          {activeMove && (
            <span className="text-[10px] font-mono text-zinc-400 bg-[#262420] px-1.5 py-0.5 rounded border border-[#35322b]">
              Move {Math.floor(activeMoveIndex / 2) + 1}
            </span>
          )}

          {/* Tactile Engine Selection Toggle - Full Inline on xl+ screens */}
          <div className="hidden xl:flex items-center bg-[#141311] p-0.5 rounded-full border border-[#2e2a24] text-[9px] font-black uppercase tracking-wider ml-1">
            <button
              onClick={() => {
                setAnalysisEngine('torch_human');
                onEngineChange?.('torch_human');
              }}
              className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-150 cursor-pointer ${
                analysisEngine === 'torch_human'
                  ? 'bg-[#f59e0b] text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Torch Human (Maia NNUE)"
            >
              <Flame className="w-2.5 h-2.5 text-amber-300" />
              <span>Torch</span>
            </button>
            <button
              onClick={() => {
                soundService.playTactilePop();
                setAnalysisEngine('stockfish');
                onEngineChange?.('stockfish');
              }}
              className={`px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-150 cursor-pointer ${
                analysisEngine === 'stockfish'
                  ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-bold'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="Stockfish 18"
            >
              <Cpu className="w-2.5 h-2.5 text-white" />
              <span>Stockfish</span>
            </button>
          </div>

          {/* 4-Tier Strength Switcher (Fast, Standard, Deep, Maximum) */}
          <div className="hidden 2xl:flex items-center bg-[#141311] p-0.5 rounded-full border border-[#2e2a24] text-[9px] font-black uppercase tracking-wider ml-1">
            {(['fast', 'standard', 'deep', 'maximum'] as EngineStrengthTier[]).map((tier) => {
              const cfg = ENGINE_STRENGTH_CONFIGS[tier];
              const activeTier = engineStrength || 'fast';
              const isSelected = activeTier === tier;
              return (
                <button
                  key={tier}
                  onClick={() => {
                    soundService.playTactilePop();
                    onStrengthChange?.(tier);
                  }}
                  className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#35322b] text-emerald-400 font-black shadow-sm border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`${cfg.label}: ${cfg.description}`}
                >
                  <span>{cfg.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Header Actions & Popover Menu (•••) */}
        <div className="flex items-center gap-1.5 text-zinc-400 shrink-0 relative">
          <button
            onClick={() => {
              const movesStr = moves.map((m) => m.san).join(' ');
              router.push(
                `/analysis?${gameId ? `gameId=${encodeURIComponent(gameId)}&` : ''}moves=${encodeURIComponent(movesStr)}&ply=${activeMoveIndex}`
              );
            }}
            className="hidden sm:flex px-2 py-1 rounded-full text-zinc-200 hover:text-white bg-[#282622] hover:bg-[#34312b] border border-[#383530] text-[10px] font-black uppercase tracking-wider items-center gap-1 transition cursor-pointer"
            title="Open position in Analysis Studio"
          >
            <Microscope className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">Studio</span>
          </button>

          <button
            onClick={() => {
              soundService.playTactilePop();
              setOrientation((o) => (o === 'w' ? 'b' : 'w'));
            }}
            className="hidden sm:flex px-2 py-1 rounded-full text-zinc-200 hover:text-white bg-[#282622] hover:bg-[#34312b] border border-[#383530] text-[10px] font-black uppercase tracking-wider items-center gap-1 transition cursor-pointer active:scale-95"
            title="Flip Board Orientation (F)"
          >
            <ArrowUpDown className="w-3 h-3 text-emerald-400" />
            <span className="hidden md:inline">Flip</span>
          </button>

          <button
            onClick={openSettings}
            className="hidden sm:flex p-1 rounded-full border border-[#35322b] bg-[#282622] text-zinc-300 hover:text-white hover:bg-[#34312b] transition cursor-pointer"
            title="Platform Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          {/* More Options Popover Button (•••) */}
          <div className="relative">
            <button
              onClick={() => setIsMoreMenuOpen((prev) => !prev)}
              className="p-1 sm:p-1.5 rounded-full border border-[#35322b] bg-[#282622] text-zinc-300 hover:text-white hover:bg-[#34312b] transition cursor-pointer"
              title="More Options"
            >
              <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {isMoreMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
                  onClick={() => setIsMoreMenuOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1.5 w-56 bg-[#1e1c19] border-2 border-[#35322b] rounded-2xl shadow-2xl p-2.5 z-50 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider px-1 pb-1 border-b border-[#2d2a26]">
                  Review Options
                </div>

                {/* Flip Board (Mobile & Desktop) */}
                <button
                  onClick={() => {
                    soundService.playTactilePop();
                    setOrientation((o) => (o === 'w' ? 'b' : 'w'));
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2 cursor-pointer transition text-left"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Flip Board Orientation</span>
                </button>

                {/* Analysis Studio */}
                <button
                  onClick={() => {
                    soundService.playTactilePop();
                    setIsMoreMenuOpen(false);
                    const movesStr = moves.map((m) => m.san).join(' ');
                    router.push(
                      `/analysis?${gameId ? `gameId=${encodeURIComponent(gameId)}&` : ''}moves=${encodeURIComponent(movesStr)}&ply=${activeMoveIndex}`
                    );
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2 cursor-pointer transition text-left"
                >
                  <Microscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Analysis Studio</span>
                </button>

                {/* Engine Selector */}
                <div className="pt-1 border-t border-[#2d2a26]">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1">
                    Analysis Engine
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-[#141311] p-1 rounded-lg">
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setAnalysisEngine('torch_human');
                        onEngineChange?.('torch_human');
                        setIsMoreMenuOpen(false);
                      }}
                      className={`px-1.5 py-1 rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 ${
                        analysisEngine === 'torch_human' ? 'bg-[#f59e0b] text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Flame className="w-2.5 h-2.5" />
                      <span>Torch</span>
                    </button>
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        setAnalysisEngine('stockfish');
                        onEngineChange?.('stockfish');
                        setIsMoreMenuOpen(false);
                      }}
                      className={`px-1.5 py-1 rounded text-[10px] font-black uppercase flex items-center justify-center gap-1 ${
                        analysisEngine === 'stockfish' ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-bold' : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Cpu className="w-2.5 h-2.5" />
                      <span>Stockfish</span>
                    </button>
                  </div>
                </div>

                {/* Engine Strength Tier Selector */}
                <div className="pt-1 border-t border-[#2d2a26]">
                  <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider px-1 mb-1 flex items-center justify-between">
                    <span>Strength Tier</span>
                    <span className="text-emerald-400 font-mono text-[8px]">
                      {ENGINE_STRENGTH_CONFIGS[engineStrength || 'fast'].label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-[#141311] p-1 rounded-lg">
                    {(['fast', 'standard', 'deep', 'maximum'] as EngineStrengthTier[]).map((tier) => {
                      const cfg = ENGINE_STRENGTH_CONFIGS[tier];
                      const activeTier = engineStrength || 'fast';
                      const isSelected = activeTier === tier;
                      return (
                        <button
                          key={tier}
                          onClick={() => {
                            soundService.playTactilePop();
                            onStrengthChange?.(tier);
                            setIsMoreMenuOpen(false);
                          }}
                          className={`px-1.5 py-1 rounded text-[10px] flex items-center justify-center gap-1 border ${
                            isSelected
                              ? 'bg-[#2a2723] border-emerald-500 text-emerald-400 font-black'
                              : 'border-transparent text-zinc-400 hover:text-white'
                          }`}
                        >
                          <span>{cfg.badge}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {onReanalyze && (
                  <button
                    onClick={() => {
                      soundService.playTactilePop();
                      setIsMoreMenuOpen(false);
                      onReanalyze();
                    }}
                    className="w-full py-1.5 px-2 rounded-lg bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2 cursor-pointer transition text-left"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Re-analyze Match</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setIsShortcutsOpen(true);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer transition text-left"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Keyboard Shortcuts</span>
                </button>

                <button
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    openSettings();
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-300 hover:text-white flex items-center gap-2 cursor-pointer transition text-left"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </button>
              </div>
            </>
          )}
          </div>
        </div>
      </header>

      {/* Main Review Workspace: Responsive Container */}
      <div className="flex-1 flex flex-col lg:flex-row items-center lg:items-start justify-start lg:justify-center overflow-visible lg:overflow-hidden w-full max-w-7xl mx-auto min-h-0 lg:p-3 lg:gap-5">
        {/* Left Board Column: Top Opponent Card, ChessBoard with EvalBar, Bottom User Card */}
        {(() => {
          const topPlayer = orientation === 'w' ? blackPlayer : whitePlayer;
          const topAccuracy = orientation === 'w' ? blackAccuracy : whiteAccuracy;
          const topColor: PieceColor = orientation === 'w' ? 'b' : 'w';
          const topCapturedPieces = topColor === 'w' ? materialInfo.whiteCaptured : materialInfo.blackCaptured;
          const topAdvantage = topColor === 'w' ? materialInfo.whiteAdvantage : materialInfo.blackAdvantage;
          const topCapturedPieceColor: PieceColor = topColor === 'w' ? 'b' : 'w';

          const bottomPlayer = orientation === 'w' ? whitePlayer : blackPlayer;
          const bottomAccuracy = orientation === 'w' ? whiteAccuracy : blackAccuracy;
          const bottomColor: PieceColor = orientation === 'w' ? 'w' : 'b';
          const bottomCapturedPieces = bottomColor === 'w' ? materialInfo.whiteCaptured : materialInfo.blackCaptured;
          const bottomAdvantage = bottomColor === 'w' ? materialInfo.whiteAdvantage : materialInfo.blackAdvantage;
          const bottomCapturedPieceColor: PieceColor = bottomColor === 'w' ? 'b' : 'w';

          return (
            <div className="flex flex-col items-center justify-start w-full lg:w-auto shrink-0 min-h-0 px-0 sm:px-2">
              {/* Top Player Card (Opponent) - Compact 34px-38px max height */}
              <div className="w-full max-w-[min(100vw,calc(100dvh-200px),520px)] flex items-center justify-between px-2 sm:px-3 py-1 bg-[#201e1a] border-b border-[#2d2a26] sm:border sm:rounded-xl shrink-0 h-8 sm:h-9">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-6 h-6 rounded bg-[#2c2924] flex items-center justify-center font-black text-[11px] text-zinc-300 overflow-hidden">
                      {topPlayer.avatar && (topPlayer.avatar.startsWith('http') || topPlayer.avatar.startsWith('/') || topPlayer.avatar.startsWith('data:')) ? (
                        <img src={topPlayer.avatar} alt={topPlayer.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{topPlayer.avatar || topPlayer.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#201e1a] shadow-sm ${
                        topColor === 'w' ? 'bg-white' : 'bg-[#181613]'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">{topPlayer.name}</span>
                    {topPlayer.rating && (
                      <span className="text-[10px] text-zinc-400 font-mono">({topPlayer.rating})</span>
                    )}
                    {topCapturedPieces.length > 0 && (
                      <div className="hidden xs:flex items-center gap-0.5 bg-[#171613] px-1 py-0.2 rounded border border-[#2b2824]">
                        <div className="flex items-center -space-x-1">
                          {topCapturedPieces.slice(0, 5).map((p, idx) => (
                            <div key={`${p}-${idx}`} className="w-3 h-3 shrink-0 opacity-85">
                              <PieceIcon type={p} color={topCapturedPieceColor} theme={pieceTheme} />
                            </div>
                          ))}
                        </div>
                        {topAdvantage > 0 && (
                          <span className="text-[9px] font-black font-mono text-zinc-200 ml-0.5">+{topAdvantage}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {topAccuracy !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                    <span className="text-[9px] text-zinc-400 font-bold">ACC</span>
                    <span className="text-[11px] font-black text-emerald-400 font-mono">{topAccuracy.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Center Board with EvalBar: Edge-to-Edge on Mobile, Responsive & Constrained to never overflow */}
              <div className="w-full max-w-[min(100vw,calc(100dvh-200px),520px)] flex items-stretch gap-1.5 sm:gap-2 shrink-0 aspect-square relative">
                <div className="w-5 sm:w-6 py-0.5 shrink-0">
                  <EvalBar score={activeMove ? activeMove.evalAfter : 0} orientation={orientation} />
                </div>
                <div className="flex-1 min-w-0 relative aspect-square">
                  {isRetryMode && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1 rounded-full bg-amber-600/95 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider shadow-xl flex items-center gap-1.5 border border-white/20 select-none pointer-events-auto">
                      <RotateCcw className="w-3 h-3 text-white" />
                      <span>Retry: Play on board</span>
                      <button
                        onClick={() => {
                          setIsRetryMode(false);
                          setRetrySuccess(null);
                        }}
                        className="ml-1 p-0.5 rounded-full hover:bg-black/30 text-white cursor-pointer"
                        title="Exit retry mode"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  <ChessBoard
                    chess={currentChess}
                    orientation={orientation}
                    boardTheme={boardTheme}
                    pieceTheme={pieceTheme}
                    activeClassification={activeSquareHighlight}
                    lastMove={displayedLastMove}
                    customArrows={reviewArrows}
                    onMove={isRetryMode ? handleRetryMove : undefined}
                    disabled={!isRetryMode}
                    isFastForward={isFastForwarding}
                  />
                </div>
              </div>

              {/* Bottom Player Card (User) - Compact 34px-38px max height */}
              <div className="w-full max-w-[min(100vw,calc(100dvh-200px),520px)] flex items-center justify-between px-2 sm:px-3 py-1 bg-[#201e1a] border-t border-[#2d2a26] sm:border sm:rounded-xl shrink-0 h-8 sm:h-9">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-6 h-6 rounded bg-[#2c2924] flex items-center justify-center font-black text-[11px] text-zinc-300 overflow-hidden">
                      {bottomPlayer.avatar && (bottomPlayer.avatar.startsWith('http') || bottomPlayer.avatar.startsWith('/') || bottomPlayer.avatar.startsWith('data:')) ? (
                        <img src={bottomPlayer.avatar} alt={bottomPlayer.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs">{bottomPlayer.avatar || bottomPlayer.name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#201e1a] shadow-sm ${
                        bottomColor === 'w' ? 'bg-white' : 'bg-[#181613]'
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[160px]">{bottomPlayer.name}</span>
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/20 px-1 rounded border border-emerald-500/30">YOU</span>
                    {bottomPlayer.rating && (
                      <span className="text-[10px] text-zinc-400 font-mono">({bottomPlayer.rating})</span>
                    )}
                    {bottomCapturedPieces.length > 0 && (
                      <div className="hidden xs:flex items-center gap-0.5 bg-[#171613] px-1 py-0.2 rounded border border-[#2b2824]">
                        <div className="flex items-center -space-x-1">
                          {bottomCapturedPieces.slice(0, 5).map((p, idx) => (
                            <div key={`${p}-${idx}`} className="w-3 h-3 shrink-0 opacity-85">
                              <PieceIcon type={p} color={bottomCapturedPieceColor} theme={pieceTheme} />
                            </div>
                          ))}
                        </div>
                        {bottomAdvantage > 0 && (
                          <span className="text-[9px] font-black font-mono text-zinc-200 ml-0.5">+{bottomAdvantage}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {bottomAccuracy !== undefined && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 shrink-0">
                    <span className="text-[9px] text-zinc-400 font-bold">ACC</span>
                    <span className="text-[11px] font-black text-emerald-400 font-mono">{bottomAccuracy.toFixed(1)}%</span>
                  </div>
                )}
              </div>

              {/* Mobile Coach Micro-Banner: Ultra-compact single line (~36px) with tap-to-expand Details */}
              <div className="lg:hidden w-full max-w-[min(100vw,calc(100dvh-200px),520px)] px-2 py-1 bg-[#1a1816] border-t border-b border-[#2d2a26] flex items-center justify-between gap-1.5 shrink-0 h-9">
                <div className="flex items-center gap-1.5 min-w-0 truncate">
                  <ClassificationBadge classification={displayedBadgeClass} size="sm" />
                  <span className="font-black text-white text-[11px] truncate">{displayedHeaderTitle}</span>
                  <span className="text-[10px] text-zinc-400 font-medium truncate hidden xs:inline max-w-[130px]">{displayedComment}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono font-black bg-[#141311] px-1.5 py-0.5 rounded text-zinc-200">{formattedScore}</span>
                  <button
                    onClick={() => {
                      soundService.playTactilePop();
                      setIsMobileDrawerOpen(true);
                    }}
                    className="px-2 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/40 cursor-pointer transition active:scale-95"
                  >
                    Details ▾
                  </button>
                </div>
              </div>

              {/* Mobile Review Navigation Row (Line 1: Prev Highlight, Prev, Play/Pause, Next, Next Highlight & Move Info) */}
              <div className="lg:hidden w-full max-w-[min(100vw,calc(100dvh-200px),520px)] px-2.5 py-1.5 bg-[#181614] border-t border-[#2d2a26] flex items-center justify-between gap-1.5 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {/* Speed Rewind to Prev Highlight */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      handlePrevKeyMoment();
                    }}
                    disabled={activeMoveIndex <= 0 || isFastForwarding}
                    className="w-8 h-8 rounded-lg bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:pointer-events-none text-emerald-400 flex items-center justify-center border border-[#35322b] cursor-pointer active:scale-95 transition shrink-0"
                    title="Speed Rewind to Previous Highlight (Arrow Up)"
                    aria-label="Previous Highlight"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  {/* Previous Move */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stopFastForward();
                      handlePrevMove();
                    }}
                    disabled={activeMoveIndex <= 0 || isFastForwarding}
                    className="w-8 h-8 rounded-lg bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center border border-[#35322b] cursor-pointer active:scale-95 transition shrink-0"
                    title="Previous Move (Arrow Left)"
                    aria-label="Previous Move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Play / Pause */}
                  <button
                    onClick={() => {
                      stopFastForward();
                      setIsPlaying((p) => !p);
                    }}
                    className={`w-9 h-8 rounded-lg flex items-center justify-center cursor-pointer transition active:scale-95 shrink-0 ${
                      isPlaying
                        ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] border-t border-white/35 shadow-[0_2px_0_0_#385a16] text-white'
                        : 'bg-[#282622] border border-[#35322b] text-white hover:bg-[#34312b]'
                    }`}
                    title={isPlaying ? 'Pause Auto-Play (Space)' : 'Start Auto-Play (Space)'}
                    aria-label="Play/Pause"
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </button>

                  {/* Next Move */}
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      stopFastForward();
                      handleNextMove();
                    }}
                    disabled={activeMoveIndex >= moves.length - 1 || isFastForwarding}
                    className="w-8 h-8 rounded-lg bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:pointer-events-none text-white flex items-center justify-center border border-[#35322b] cursor-pointer active:scale-95 transition shrink-0"
                    title="Next Move (Arrow Right)"
                    aria-label="Next Move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Speed Fast-Forward to Next Highlight */}
                  <button
                    onClick={() => {
                      soundService.playTactilePop();
                      setIsPlaying(false);
                      handleNextKeyMoment();
                    }}
                    disabled={activeMoveIndex >= moves.length - 1 || isFastForwarding}
                    className="w-8 h-8 rounded-lg bg-gradient-to-b from-[#8fd649] to-[#699c30] hover:brightness-105 disabled:opacity-30 disabled:pointer-events-none text-white border-t border-white/35 shadow-[0_2px_0_0_#385a16] flex items-center justify-center cursor-pointer active:scale-95 transition shrink-0"
                    title="Speed Fast-Forward to Next Highlight (Arrow Down)"
                    aria-label="Next Highlight"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Move Indicator and Progress */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-mono font-bold text-zinc-300 shrink-0">
                    {Math.floor(activeMoveIndex / 2) + 1}
                    <span className="text-zinc-500 font-normal">/{Math.ceil(moves.length / 2)}</span>
                  </span>
                  {activeMove && (
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-[#25221d] border border-[#38342c] text-emerald-400 truncate max-w-[55px]">
                      {activeMove.san}
                    </span>
                  )}
                </div>
              </div>

              {/* Mobile Review Actions Row (Line 2: Best, Show, Retry, Moves Grid) */}
              <div className="lg:hidden w-full max-w-[min(100vw,calc(100dvh-200px),520px)] px-2 py-1.5 bg-[#141311] border-t border-[#24221e] grid grid-cols-4 gap-1.5 shrink-0">
                <button
                  onClick={handleToggleBest}
                  disabled={isBestDisabled && !showBestMove}
                  className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition cursor-pointer active:scale-95 ${
                    showBestMove
                      ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] border-t border-white/35 text-white shadow-[0_2px_0_0_#385a16]'
                      : isBestDisabled
                      ? 'bg-[#1e1c19] border border-[#2e2a24] text-zinc-600 opacity-40 cursor-not-allowed pointer-events-none'
                      : 'bg-[#282622] border border-[#35322b] text-zinc-300 hover:text-white'
                  }`}
                >
                  <Star className="w-3 h-3 text-amber-400" />
                  <span>Best</span>
                </button>

                <button
                  onClick={handleToggleShow}
                  disabled={isShowDisabled && !showFollowUpMove}
                  className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border transition cursor-pointer active:scale-95 ${
                    showFollowUpMove
                      ? 'bg-[#0284c7] border-[#0369a1] text-white shadow'
                      : isShowDisabled
                      ? 'bg-[#1e1c19] border border-[#2e2a24] text-zinc-600 opacity-40 cursor-not-allowed pointer-events-none'
                      : 'bg-[#282622] border-[#35322b] text-zinc-300 hover:text-white'
                  }`}
                >
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Show</span>
                </button>

                <button
                  onClick={handleToggleRetry}
                  className={`h-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border transition cursor-pointer active:scale-95 ${
                    isRetryMode
                      ? 'bg-amber-500 border-amber-600 text-white shadow'
                      : 'bg-[#282622] border-[#35322b] text-zinc-300 hover:text-white'
                  }`}
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Retry</span>
                </button>

                <button
                  onClick={() => {
                    soundService.playTactilePop();
                    setIsNotationModalOpen(true);
                  }}
                  className="h-8 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 border bg-[#282622] border-[#35322b] text-zinc-300 hover:text-white transition cursor-pointer active:scale-95"
                  title="View Moves Notation"
                >
                  <BookOpen className="w-3 h-3 text-emerald-400" />
                  <span>Moves</span>
                </button>
              </div>
            </div>
          );
        })()}

        {/* Right Side Review Panel - Desktop Dashboard Split-View (Zero Outer Scroll, Fixed Height) */}
        <div className="hidden lg:flex flex-col gap-2 w-full max-w-[420px] xl:max-w-[460px] 2xl:max-w-[490px] h-full max-h-[calc(100dvh-54px)] overflow-hidden shrink-0">
          {/* Bento Tile 1: Coach Intelligence Card */}
          <div className="flex flex-col gap-1.5">
            {/* Active Mentor Header (Static, following Settings) */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Coach Feedback
              </span>
              <div className="text-[10px] text-zinc-300 font-medium flex items-center gap-1.5 bg-[#262420] px-2.5 py-0.5 rounded-full border border-[#35322b]">
                <span className="text-zinc-400">Mentor:</span>
                <strong className="text-white font-bold">{currentMentor.name}</strong>
                <span className="text-zinc-500 font-normal">({currentMentor.title})</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              {/* Dynamic Mentor Portrait Avatar */}
              <div className="relative shrink-0 pt-0.5">
                <MentorAvatar mentorId={activeMentorId} size={50} />
                <span
                  className="absolute bottom-0 -right-1 px-1 rounded-full text-[8px] font-black text-white border border-[#2a2723]"
                  style={{ backgroundColor: currentMentor.accentColor }}
                >
                  AI
                </span>
              </div>

              {/* Speech Bubble Container with Left Tail */}
              <div className="flex-1 bg-[#ffffff] text-zinc-900 rounded-2xl p-3 shadow-xl border border-zinc-200 relative min-h-[96px] flex flex-col justify-between overflow-hidden">
                {/* Bubble Pointer Tail */}
                <div className="absolute top-4 -left-2 w-0 h-0 border-t-[7px] border-t-transparent border-r-[9px] border-r-white border-b-[7px] border-b-transparent" />

                {/* Bubble Header: Badge, Move description, Score pill, and Share button in single row */}
                <div className="flex items-center justify-between gap-1.5 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 truncate">
                    {activeMove?.classification && (
                      <ClassificationBadge
                        classification={displayedBadgeClass}
                        size="md"
                      />
                    )}
                    <span className="text-sm font-black text-zinc-900 tracking-tight truncate">
                      {displayedHeaderTitle}
                    </span>
                    {activeMove?.motif && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-800 border border-amber-500/30 uppercase tracking-wider shrink-0" title={activeMove.motif.description}>
                        ⚡ {activeMove.motif.type.replace('-', ' ')}
                      </span>
                    )}
                    {activeOpening && (activeClass === 'book' || activeMoveIndex <= 14) && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-900 border border-purple-500/30 tracking-tight shrink-0" title={activeOpening.description}>
                        📖 [{activeOpening.eco}] {activeOpening.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] font-black font-mono bg-[#312e2b] text-white px-2 py-0.5 rounded shadow-sm">
                      {formattedScore}
                    </span>
                    <button
                      onClick={() => {
                        if (navigator.share) {
                          navigator.share({
                            title: 'Check.mate Review',
                            text: `Check out my move: ${activeMove?.san} is ${activeClass}!`,
                          });
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer border border-zinc-200"
                      title="Share Move"
                    >
                      <Share2 className="w-3 h-3" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>

                {/* Natural Language Coaching Advice */}
                <div className="min-h-[40px] flex items-center overflow-hidden py-0.5">
                  <p className="text-xs text-zinc-700 font-medium leading-[1.35] line-clamp-2 sm:line-clamp-3">
                    {displayedComment}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Tile 2: Moves Notation Card with Auto-Scroll & Filter Tabs */}
          <div className="bg-[#1f1d1a] rounded-xl border border-[#2d2a26] overflow-hidden flex flex-col flex-1 min-h-[140px] shadow-sm">
            <div className="px-3 py-1.5 bg-[#262420] border-b border-[#302e2a] flex items-center justify-between text-xs font-bold text-zinc-400">
              <span className="text-[11px] uppercase tracking-wider font-black">Notation</span>

              {/* Filter Tabs: All Moves vs Highlights */}
              <div className="flex items-center bg-[#171614] p-0.5 rounded-lg border border-[#302d28] text-[10px] font-bold">
                <button
                  onClick={() => setNotationFilter('all')}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                    notationFilter === 'all'
                      ? 'bg-[#2f2b25] text-white shadow-sm font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  All ({moves.length})
                </button>
                <button
                  onClick={() => {
                    soundService.playTactilePop();
                    setNotationFilter('highlights');
                  }}
                  className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors flex items-center gap-1 ${
                    notationFilter === 'highlights'
                      ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_2px_0_0_#385a16] border-t border-white/35 font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Highlights</span>
                  <span className="text-[9px] font-mono px-1 rounded-full bg-black/20">
                    {keyMomentIndices.length}
                  </span>
                </button>
              </div>
            </div>

            {notationFilter === 'highlights' ? (
              /* Curated Highlights View */
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 font-mono text-xs custom-scrollbar">
                {keyMomentIndices.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No major turning points detected.
                  </div>
                ) : (
                  keyMomentIndices.map((moveIdx: number) => {
                    const m = moves[moveIdx];
                    const km = keyMoments?.find((k: KeyMoment) => k.moveIndex === moveIdx);
                    const isSelected = activeMoveIndex === moveIdx;
                    const turnNum = Math.floor(moveIdx / 2) + 1;
                    const isWhite = moveIdx % 2 === 0;
                    const moveLabel = `${turnNum}${isWhite ? '.' : '...'} ${m.san}`;

                    return (
                      <button
                        key={`highlight-${moveIdx}`}
                        ref={isSelected ? activeNotationItemRef : null}
                        onClick={() => navigateToMove(moveIdx)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                            : 'bg-[#24221e] hover:bg-[#2c2924] text-zinc-200 border border-[#302d27]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-mono shrink-0 ${isSelected ? 'text-white/80' : 'text-zinc-500'}`}>
                            #{moveIdx + 1}
                          </span>
                          <div className="text-left min-w-0">
                            <span className="font-bold block">{moveLabel}</span>
                            {km?.description && (
                              <span className={`text-[10px] block truncate font-sans ${isSelected ? 'text-white/90' : 'text-zinc-400'}`}>
                                {km.description}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.classification && (
                            <ClassificationBadge
                              classification={getCleanClassification(m.classification)}
                              size="sm"
                            />
                          )}
                          <span className={`text-[10px] font-mono ${isSelected ? 'text-white' : 'text-zinc-400'}`}>
                            {m.evalAfter > 0 ? `+${(m.evalAfter / 100).toFixed(1)}` : (m.evalAfter / 100).toFixed(1)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              /* Full Notation Grid */
              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 font-mono text-xs custom-scrollbar">
              {Array.from({ length: Math.ceil(moves.length / 2) }).map((_, turnIdx) => {
                const turnNumber = turnIdx + 1;
                const whiteIdx = turnIdx * 2;
                const blackIdx = turnIdx * 2 + 1;

                const whiteMove = moves[whiteIdx];
                const blackMove = moves[blackIdx];

                const isWhiteSelected = activeMoveIndex === whiteIdx;
                const isBlackSelected = activeMoveIndex === blackIdx;

                return (
                  <div
                    key={turnNumber}
                    className="grid grid-cols-[32px_1fr_1fr] items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[#282622] transition-colors"
                  >
                    <span className="text-zinc-500 font-sans text-[11px] font-semibold">
                      {turnNumber}.
                    </span>

                    {/* White Move */}
                    <button
                      ref={isWhiteSelected ? activeNotationItemRef : null}
                      onClick={() => {
                        navigateToMove(whiteIdx);
                      }}
                      className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                        isWhiteSelected
                          ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                          : 'text-zinc-200 hover:bg-[#33302b]'
                      }`}
                    >
                      <span className="truncate">{whiteMove?.san}</span>
                      {whiteMove?.classification && (
                        <ClassificationBadge
                          classification={getCleanClassification(whiteMove.classification)}
                          size="sm"
                        />
                      )}
                    </button>

                    {/* Black Move */}
                    {blackMove ? (
                      <button
                        ref={isBlackSelected ? activeNotationItemRef : null}
                        onClick={() => {
                          navigateToMove(blackIdx);
                        }}
                        className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-xs ${
                          isBlackSelected
                            ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                            : 'text-zinc-200 hover:bg-[#33302b]'
                        }`}
                      >
                        <span className="truncate">{blackMove.san}</span>
                        {blackMove.classification && (
                          <ClassificationBadge
                            classification={getCleanClassification(blackMove.classification)}
                            size="sm"
                          />
                        )}
                      </button>
                    ) : (
                      <div />
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* Bento Tile 3: Unified Position Ribbon & Advantage Gauge */}
          <div className="bg-[#1f1d1a] rounded-xl border border-[#2d2a26] p-2.5 flex flex-col gap-2 shadow-sm">
            {/* Top: Advantage Gauge */}
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-black text-white shrink-0 min-w-[44px]">
                {formattedScore}
              </span>
              <div className="flex-1 h-2.5 bg-[#33302b] rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-white transition-all duration-300 rounded-full"
                  style={{ width: `${evalPercent}%` }}
                />
              </div>
            </div>



            {/* Bottom: 3-Move Position Context Ribbon */}
            <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-[#2a2723] text-xs font-mono">
              {activeMoveIndex > 0 ? (
                <button
                  onClick={handlePrevMove}
                  className="flex-1 py-1 px-2 rounded-lg bg-[#272522] hover:bg-[#33302b] text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer border border-[#38342e] truncate"
                  title="Previous move"
                >
                  <span className="text-zinc-500 font-sans text-[10px]">
                    {Math.floor((activeMoveIndex - 1) / 2) + 1}.
                  </span>
                  <span className="truncate">{moves[activeMoveIndex - 1]?.san}</span>
                </button>
              ) : (
                <div className="flex-1 py-1 px-2 text-center text-zinc-600 text-xs">—</div>
              )}

              {/* Currently Active Move (Played, Best, or Show Follow-up) */}
              <div className="flex-1 py-1 px-2.5 rounded-lg bg-[#332f28] border border-[#524b3f] font-black text-white shadow-sm flex items-center justify-center gap-1.5">
                <ClassificationBadge classification={displayedBadgeClass} size="sm" />
                <span className="text-xs font-black text-white truncate">
                  {showBestMove && bestMoveVariation
                    ? bestMoveVariation.san
                    : showFollowUpMove && followUpVariation
                    ? followUpVariation.san
                    : activeMove?.san || ''}
                </span>
              </div>

              {activeMoveIndex < moves.length - 1 ? (
                <button
                  onClick={handleNextMove}
                  className="flex-1 py-1 px-2 rounded-lg bg-[#272522] hover:bg-[#33302b] text-zinc-400 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer border border-[#38342e] truncate"
                  title="Next move"
                >
                  <span className="text-zinc-500 font-sans text-[10px]">
                    {Math.floor((activeMoveIndex + 1) / 2) + 1}.
                  </span>
                  <span className="truncate">{moves[activeMoveIndex + 1]?.san}</span>
                </button>
              ) : (
                <div className="flex-1 py-1 px-2 text-center text-zinc-600 text-xs">—</div>
              )}
            </div>
          </div>

          {/* Bento Tile 4: Command Center Action Bar (2 Centered Rows) */}
          <div className="px-3 py-2.5 bg-[#1f1d1a] rounded-xl border-2 border-[#35322b] flex flex-col gap-2 shadow-[0_4px_0_0_#141311]">
            {/* Row 1: Icons Only Navigation (Centered) */}
            <div className="flex items-center justify-center gap-2 w-full">
              {/* Speed Backwards: Reverses / DVD Rewind to previous highlight */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  handlePrevKeyMoment();
                }}
                disabled={activeMoveIndex <= 0 || isFastForwarding}
                className="w-10 h-9 rounded-lg border-2 border-[#35322b] bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:border-[#2a2723] disabled:text-zinc-600 disabled:pointer-events-none text-zinc-300 hover:text-white shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Speed Rewind to Previous Highlight (Arrow Up)"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Previous Move */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  stopFastForward();
                  handlePrevMove();
                }}
                disabled={activeMoveIndex <= 0 || isFastForwarding}
                className="w-10 h-9 rounded-lg border-2 border-[#35322b] bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:border-[#2a2723] disabled:text-zinc-600 disabled:pointer-events-none text-zinc-300 hover:text-white shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Previous Move (Arrow Left)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Play / Pause Auto-Play */}
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  stopFastForward();
                  setIsPlaying((p) => !p);
                }}
                disabled={isFastForwarding}
                className={`w-11 h-9 rounded-lg border-t border-white/35 transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                  isPlaying
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white shadow-[0_3px_0_0_#385a16] active:translate-y-[2px] active:shadow-[0_1px_0_0_#385a16]'
                    : 'bg-gradient-to-b from-[#35322c] to-[#24221d] border-t border-white/10 hover:brightness-110 text-white shadow-[0_3px_0_0_#0f0e0c] active:translate-y-[2px] active:shadow-[0_1px_0_0_#0f0e0c]'
                }`}
                title={isPlaying ? 'Pause Auto-Play (Space)' : 'Start Auto-Play (Space)'}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              {/* Next Move */}
              <button
                onClick={() => {
                  setIsPlaying(false);
                  stopFastForward();
                  handleNextMove();
                }}
                disabled={activeMoveIndex >= moves.length - 1 || isFastForwarding}
                className="w-10 h-9 rounded-lg border-2 border-[#35322b] bg-[#282622] hover:bg-[#34312b] disabled:opacity-30 disabled:border-[#2a2723] disabled:text-zinc-600 disabled:pointer-events-none text-zinc-300 hover:text-white shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Next Move (Arrow Right)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Speed Forward: Advances / DVD Fast-Forward to next highlight */}
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setIsPlaying(false);
                  handleNextKeyMoment();
                }}
                disabled={activeMoveIndex >= moves.length - 1 || isFastForwarding}
                className="w-10 h-9 rounded-lg bg-gradient-to-b from-[#8fd649] to-[#699c30] hover:brightness-105 disabled:opacity-30 disabled:pointer-events-none text-white border-t border-white/35 shadow-[0_3px_0_0_#385a16] active:translate-y-[2px] active:shadow-[0_1px_0_0_#385a16] transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Speed Fast-Forward to Next Highlight (Arrow Down)"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Subtle Divider Line */}
            <div className="w-full border-t border-[#2e2a24]" />

            {/* Row 2: Text Action Buttons (Centered) */}
            <div className="flex items-center justify-center gap-2.5 w-full">
              {/* BEST BUTTON */}
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  handleToggleBest();
                }}
                disabled={isBestDisabled && !showBestMove}
                className={`h-9 px-3.5 sm:px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                  showBestMove
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] border-t border-white/35 text-white shadow-[0_3px_0_0_#385a16] active:translate-y-[2px] active:shadow-[0_1px_0_0_#385a16] cursor-pointer'
                    : isBestDisabled
                    ? 'bg-[#282622] border border-[#35322b] text-zinc-500 opacity-30 cursor-not-allowed pointer-events-none'
                    : 'bg-gradient-to-b from-[#35322c] to-[#24221d] border-t border-white/10 hover:brightness-110 text-zinc-200 shadow-[0_3px_0_0_#0f0e0c] active:translate-y-[2px] active:shadow-[0_1px_0_0_#0f0e0c] cursor-pointer'
                }`}
                title={
                  showBestMove
                    ? 'Exit Best Move Preview (B)'
                    : isBestDisabled
                    ? activeClass === 'book'
                      ? 'Book move: already recognized opening theory'
                      : 'Best move: you already played the top engine move'
                    : 'Best Move: Play what should have been played on the board (B)'
                }
              >
                <Star className={`w-3.5 h-3.5 ${showBestMove ? 'text-amber-200 fill-amber-200' : isBestDisabled ? 'text-zinc-600' : 'text-amber-400'}`} />
                <span>Best</span>
              </button>

              {/* SHOW BUTTON */}
              <button
                onClick={handleToggleShow}
                disabled={isShowDisabled && !showFollowUpMove}
                className={`h-9 px-3.5 sm:px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-2 ${
                  showFollowUpMove
                    ? 'bg-[#0284c7] border-[#0369a1] text-white shadow-[0_2px_0_0_#0369a1] cursor-pointer'
                    : isShowDisabled
                    ? 'bg-[#282622] border-[#35322b] text-zinc-500 opacity-30 cursor-not-allowed pointer-events-none'
                    : 'bg-[#282622] border-[#35322b] hover:bg-[#34312b] text-zinc-300 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none cursor-pointer'
                }`}
                title={
                  showFollowUpMove
                    ? 'Exit Follow-up Preview (S)'
                    : isShowDisabled
                    ? 'Game over: no response available'
                    : "Show Follow-up: Play the opponent's best response on the board (S)"
                }
              >
                <Eye className={`w-3.5 h-3.5 ${showFollowUpMove ? 'text-white' : isShowDisabled ? 'text-zinc-600' : 'text-cyan-400'}`} />
                <span>Show</span>
              </button>

              {/* RETRY BUTTON */}
              <button
                onClick={handleToggleRetry}
                className={`h-9 px-3.5 sm:px-4 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 border-2 ${
                  isRetryMode
                    ? 'bg-amber-500 border-amber-700 text-white shadow-[0_2px_0_0_#b45309]'
                    : 'bg-[#282622] border-[#35322b] hover:bg-[#34312b] text-zinc-300 shadow-[0_2px_0_0_#141311] active:translate-y-[1px] active:shadow-none'
                }`}
                title={isRetryMode ? 'Exit Retry Mode (R)' : 'Retry this position on board directly (R)'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Coach Feedback & Details Slide-Up Drawer */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1f1d1a] border-t-2 border-[#38342e] rounded-t-3xl max-h-[80vh] overflow-y-auto p-4 text-white shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2.5">
                <MentorAvatar mentorId={activeMentorId} size={36} />
                <div>
                  <div className="text-xs font-black text-white flex items-center gap-1.5">
                    <span>{currentMentor.name}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-black text-white" style={{ backgroundColor: currentMentor.accentColor }}>AI</span>
                  </div>
                  <div className="text-[10px] text-zinc-400">{currentMentor.title}</div>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-[#282622] hover:bg-[#34312b] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Coach Speech in Drawer */}
            <div className="bg-white text-zinc-900 rounded-2xl p-3 shadow-md border border-zinc-200">
              <div className="flex items-center justify-between gap-1.5 mb-2">
                <div className="flex items-center gap-2">
                  <ClassificationBadge classification={displayedBadgeClass} size="md" />
                  <span className="text-xs font-black text-zinc-900">{displayedHeaderTitle}</span>
                </div>
                <span className="text-[11px] font-black font-mono bg-[#312e2b] text-white px-2 py-0.5 rounded">
                  {formattedScore}
                </span>
              </div>
              <p className="text-xs text-zinc-700 font-medium leading-relaxed">
                {displayedComment}
              </p>
              {activeMove?.motif && (
                <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center gap-1.5 text-[10px] font-black text-amber-700">
                  <span>⚡ Tactical Motif: {activeMove.motif.type.replace('-', ' ')}</span>
                </div>
              )}
            </div>

            {/* Accuracy Comparison */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#262420] p-2.5 rounded-xl border border-[#35322b] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold truncate">{whitePlayer.name}</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{whiteAccuracy?.toFixed(1)}%</span>
              </div>
              <div className="bg-[#262420] p-2.5 rounded-xl border border-[#35322b] flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-bold truncate">{blackPlayer.name}</span>
                <span className="text-xs font-black text-emerald-400 font-mono">{blackAccuracy?.toFixed(1)}%</span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="md"
              rounded="xl"
              onClick={() => setIsMobileDrawerOpen(false)}
            >
              Back to Board
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Move Notation Slide-Up Drawer */}
      {isNotationModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1f1d1a] border-t-2 border-[#38342e] rounded-t-3xl max-h-[75vh] flex flex-col p-4 text-white shadow-2xl animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">Move Notation</h3>
              </div>
              <button
                onClick={() => setIsNotationModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#282622] hover:bg-[#34312b] text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setNotationFilter('all');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  notationFilter === 'all'
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                    : 'bg-[#282622] text-zinc-400 hover:text-white'
                }`}
              >
                All Moves ({moves.length})
              </button>
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setNotationFilter('highlights');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  notationFilter === 'highlights'
                    ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-black shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                    : 'bg-[#282622] text-zinc-400 hover:text-white'
                }`}
              >
                Highlights ({keyMomentIndices.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[45vh] p-1 font-mono text-xs custom-scrollbar">
              {notationFilter === 'highlights' ? (
                keyMomentIndices.map((moveIdx: number) => {
                  const m = moves[moveIdx];
                  const isSelected = activeMoveIndex === moveIdx;
                  const turnNum = Math.floor(moveIdx / 2) + 1;
                  const isWhite = moveIdx % 2 === 0;
                  return (
                    <button
                      key={`mob-hi-${moveIdx}`}
                      onClick={() => {
                        navigateToMove(moveIdx);
                        setIsNotationModalOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg mb-1 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                          : 'bg-[#24221e] text-zinc-200 border border-[#302d27]'
                      }`}
                    >
                      <span>{turnNum}{isWhite ? '.' : '...'} {m.san}</span>
                      <ClassificationBadge classification={getCleanClassification(m.classification)} size="sm" />
                    </button>
                  );
                })
              ) : (
                Array.from({ length: Math.ceil(moves.length / 2) }).map((_, turnIdx) => {
                  const turnNum = turnIdx + 1;
                  const wIdx = turnIdx * 2;
                  const bIdx = turnIdx * 2 + 1;
                  const wMove = moves[wIdx];
                  const bMove = moves[bIdx];
                  return (
                    <div key={turnNum} className="grid grid-cols-[32px_1fr_1fr] items-center gap-1.5 py-1 px-2 border-b border-[#282622]">
                      <span className="text-zinc-500 text-[11px] font-sans">{turnNum}.</span>
                      <button
                        onClick={() => {
                          navigateToMove(wIdx);
                          setIsNotationModalOpen(false);
                        }}
                        className={`px-2 py-1 rounded text-left flex items-center justify-between cursor-pointer ${
                          activeMoveIndex === wIdx
                            ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                            : 'text-zinc-200'
                        }`}
                      >
                        <span className="truncate">{wMove?.san}</span>
                        {wMove?.classification && <ClassificationBadge classification={getCleanClassification(wMove.classification)} size="sm" />}
                      </button>
                      {bMove ? (
                        <button
                          onClick={() => {
                            navigateToMove(bIdx);
                            setIsNotationModalOpen(false);
                          }}
                          className={`px-2 py-1 rounded text-left flex items-center justify-between cursor-pointer ${
                            activeMoveIndex === bIdx
                              ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-bold shadow-[0_2px_0_0_#385a16] border-t border-white/35'
                              : 'text-zinc-200'
                          }`}
                        >
                          <span className="truncate">{bMove.san}</span>
                          {bMove.classification && <ClassificationBadge classification={getCleanClassification(bMove.classification)} size="sm" />}
                        </button>
                      ) : <div />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {isShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#1f1d1a] border-2 border-[#38342e] rounded-2xl w-full max-w-md shadow-2xl p-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2b26] mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black uppercase tracking-wider">Keyboard Shortcuts</h3>
              </div>
              <button
                onClick={() => setIsShortcutsOpen(false)}
                className="p-1.5 rounded-lg bg-[#282622] hover:bg-[#34312b] text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Previous / Next Move</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-zinc-200">
                  ← / →
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Previous / Next Highlight</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-emerald-400">
                  ↑ / ↓
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Toggle Auto-Play</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-zinc-200">
                  Space
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Preview Best Move</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-amber-400">
                  B
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Show Follow-Up Response</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-cyan-400">
                  S
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Retry Move on Board</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-amber-500">
                  R
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Flip Board Orientation</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-zinc-200">
                  F
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-[#262420]">
                <span className="text-zinc-300 font-medium">Start / End of Game</span>
                <span className="font-mono bg-[#171614] px-2 py-0.5 rounded border border-[#35322b] font-bold text-zinc-200">
                  Home / End
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#2e2b26] flex justify-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsShortcutsOpen(false)}
              >
                Got It
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
