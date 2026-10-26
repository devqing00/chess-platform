'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PieceIcon } from './PieceIcons';
import { soundService } from '@/lib/audioService';
import {
  ClassificationBadge,
  CLASSIFICATION_CONFIG,
  CheckmateBadge,
  WinnerBadge,
} from './ClassificationBadge';
import {
  BoardTheme,
  PieceTheme,
  PieceColor,
  MoveClassification,
  ArrowAnnotation,
  Premove,
  MoveInputMode,
} from '@/types/chess';
import { useSafeShell } from '@/context/ShellContext';
import {
  isGeometricMoveValid,
  getPremoveCandidateSquares,
  validatePremoveInPosition,
} from '@/lib/premoveValidator';

export interface ChessBoardProps {
  chess: Chess;
  orientation?: PieceColor;
  playerColor?: PieceColor;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
  moveInputMode?: MoveInputMode;
  premoveEnabled?: boolean;
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  onPremove?: (from: Square, to: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
  activeClassification?: { square: Square; classification: MoveClassification } | null;
  bestMoveArrow?: { from: Square; to: Square } | null;
  premoves?: Premove[];
  activePremove?: Premove | null;
  onPremoveChange?: (premove: Premove | null) => void;
  customArrows?: ArrowAnnotation[];
  customSquareHighlights?: { square: Square; color?: string; label?: string; border?: string }[];
  onCustomSquareClick?: (sq: Square) => boolean | void;
  onAddCustomArrow?: (arrow: ArrowAnnotation) => void;
  onClearCustomArrows?: () => void;
  disabled?: boolean;
  blindfold?: boolean;
  isFastForward?: boolean;
  defeatedColor?: PieceColor | null;
}

// Authoritative Chess.com theme color palettes
const THEME_COLORS: Record<BoardTheme, { light: string; dark: string; border: string }> = {
  green: { light: '#eeeed2', dark: '#769656', border: '#272522' },
  wood: { light: '#e4c590', dark: '#a36d39', border: '#332011' },
  glass: { light: '#d9e7f4', dark: '#5b82a6', border: '#1e293b' },
  neon: { light: '#263345', dark: '#151e2b', border: '#06b6d4' },
  marble: { light: '#e5e5e5', dark: '#737373', border: '#262626' },
  arcade: { light: '#a8b98b', dark: '#547343', border: '#1c2813' },
  high_contrast: { light: '#ffffff', dark: '#111827', border: '#000000' },
  low_vision_amber: { light: '#fef3c7', dark: '#b45309', border: '#78350f' },
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface BoardSquareProps {
  layer?: 'background' | 'foreground' | 'all';
  sq: Square;
  piece: { type: PieceSymbol; color: PieceColor } | null | undefined;
  isLight: boolean;
  isSelected: boolean;
  isLegalDestination: boolean;
  isCapture: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isCheckSquare: boolean;
  isDefeatedKing: boolean;
  isCheckmate: boolean;
  isWinningKing: boolean;
  classificationOnSquare: MoveClassification | null;
  customHighlight?: { square: Square; color?: string; label?: string; border?: string };
  moveHighlightOverlayColor?: string | null;
  isPremoveSquare?: boolean;
  isPremoveCandidate?: boolean;
  showRank: boolean;
  showFile: boolean;
  rank: string;
  file: string;
  fileIdx: number;
  rankIdx: number;
  pieceTheme: PieceTheme;
  blindfold: boolean;
  isFastForward: boolean;
  moveDelta: { dx: number; dy: number } | null;
  isAnimating: boolean;
  isPieceBeingDragged: boolean;
  isDragOver: boolean;
  bgSquareColor: string;
  cornerRoundedClass?: string;
  onSquareClick: (sq: Square) => void;
  onPointerDownSquare: (e: React.PointerEvent, sq: Square) => void;
  onMouseDownSquare: (e: React.MouseEvent, sq: Square) => void;
  onMouseUpSquare: (e: React.MouseEvent, sq: Square) => void;
}

const BoardSquare = React.memo<BoardSquareProps>(function BoardSquare({
  layer = 'all',
  sq,
  piece,
  isLight,
  isSelected,
  isLegalDestination,
  isCapture,
  isLastMoveFrom,
  isLastMoveTo,
  isCheckSquare,
  isDefeatedKing,
  isCheckmate,
  isWinningKing,
  classificationOnSquare,
  customHighlight,
  moveHighlightOverlayColor,
  isPremoveSquare = false,
  isPremoveCandidate = false,
  showRank,
  showFile,
  rank,
  file,
  fileIdx,
  rankIdx,
  pieceTheme,
  blindfold,
  isFastForward,
  moveDelta,
  isAnimating,
  isPieceBeingDragged,
  isDragOver,
  bgSquareColor,
  cornerRoundedClass,
  onSquareClick,
  onPointerDownSquare,
  onMouseDownSquare,
  onMouseUpSquare,
}) {
  const isLastMovePiece = Boolean(
    isAnimating &&
      moveDelta &&
      (moveDelta.dx !== 0 || moveDelta.dy !== 0) &&
      !isFastForward
  );

  // Badges are positioned strictly at standard top-right corner of each square
  const badgePositionClass = '-top-1.5 sm:-top-2 -right-1.5 sm:-right-2';

  // 1. Background layer (Tiles, Highlights, Coordinates, Glows)
  if (layer === 'background') {
    return (
      <div
        style={{
          backgroundColor: bgSquareColor,
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
        className={`relative w-full h-full pointer-events-none select-none ${cornerRoundedClass || ''}`}
      >
        {/* Move Type Classification Highlight Overlay */}
        {moveHighlightOverlayColor && (
          <div
            className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-150 ${cornerRoundedClass || ''}`}
            style={{ backgroundColor: moveHighlightOverlayColor }}
          />
        )}

        {/* Premove Highlight Overlay (Ruby-Coral with Glowing Ring) */}
        {isPremoveSquare && (
          <div
            className={`absolute inset-0 pointer-events-none z-10 ring-2 sm:ring-[3px] ring-inset ring-rose-500 bg-rose-500/35 transition-all duration-100 ${cornerRoundedClass || ''}`}
          />
        )}

        {/* Custom Highlights */}
        {customHighlight && (
          <div
            className={`absolute inset-0 pointer-events-none z-10 ${customHighlight.border || ''}`}
            style={{ backgroundColor: customHighlight.color }}
          >
            {customHighlight.label && (
              <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white/90">
                {customHighlight.label}
              </div>
            )}
          </div>
        )}

        {/* Defeated King or King in Check Red Glow */}
        {isDefeatedKing ? (
          <div
            className={`absolute inset-0 pointer-events-none z-10 animate-in fade-in duration-300 ${cornerRoundedClass || ''}`}
            style={{
              background:
                'radial-gradient(circle at center, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.75) 45%, rgba(127, 29, 29, 0.4) 75%, transparent 100%)',
              boxShadow: 'inset 0 0 16px 4px rgba(185, 28, 28, 0.85)',
            }}
          />
        ) : isCheckSquare ? (
          <div
            className={`absolute inset-0 pointer-events-none z-10 animate-pulse ${cornerRoundedClass || ''}`}
            style={{
              background:
                'radial-gradient(circle at center, rgba(239, 68, 68, 0.88) 0%, rgba(220, 38, 38, 0.55) 35%, rgba(185, 28, 28, 0.22) 65%, transparent 85%)',
              boxShadow: 'inset 0 0 14px 2px rgba(239, 68, 68, 0.65)',
            }}
          />
        ) : null}

        {/* Coordinate Labels */}
        {showRank && (
          <span
            className={`absolute top-0.5 left-1 text-[11px] font-black leading-none select-none pointer-events-none ${
              isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
            }`}
          >
            {rank}
          </span>
        )}
        {showFile && (
          <span
            className={`absolute bottom-0.5 right-1 text-[11px] font-black leading-none select-none pointer-events-none ${
              isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
            }`}
          >
            {file}
          </span>
        )}

        {/* Move Arrival Shutter Flash Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 pointer-events-none z-10 animate-tile-flash" />
        )}

        {/* Drag source tile highlight: indicates where piece was lifted from */}
        {isPieceBeingDragged && (
          <div className="absolute inset-0 bg-[#f7f789]/60 border-2 border-[#baca2b] pointer-events-none z-10" />
        )}
      </div>
    );
  }

  // 2. Foreground / Interactive layer (Pieces, Badges, Legal Move Dots, Drag Over)
  return (
    <div
      role="gridcell"
      tabIndex={0}
      onClick={() => onSquareClick(sq)}
      onPointerDown={(e) => onPointerDownSquare(e, sq)}
      onMouseDown={(e) => onMouseDownSquare(e, sq)}
      onMouseUp={(e) => onMouseUpSquare(e, sq)}
      style={{
        backgroundColor: layer === 'foreground' ? 'transparent' : bgSquareColor,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className={`relative w-full h-full flex items-center justify-center cursor-pointer focus:outline-none select-none ${cornerRoundedClass || ''}`}
    >
      {/* If layer === 'all', also render background components */}
      {layer === 'all' && (
        <>
          {moveHighlightOverlayColor && (
            <div
              className={`absolute inset-0 pointer-events-none z-10 transition-colors duration-150 ${cornerRoundedClass || ''}`}
              style={{ backgroundColor: moveHighlightOverlayColor }}
            />
          )}
          {isPremoveSquare && (
            <div
              className={`absolute inset-0 pointer-events-none z-10 ring-2 sm:ring-[3px] ring-inset ring-rose-500 bg-rose-500/35 transition-all duration-100 ${cornerRoundedClass || ''}`}
            />
          )}
          {customHighlight && (
            <div
              className={`absolute inset-0 pointer-events-none z-10 ${customHighlight.border || ''}`}
              style={{ backgroundColor: customHighlight.color }}
            >
              {customHighlight.label && (
                <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white/90">
                  {customHighlight.label}
                </div>
              )}
            </div>
          )}
          {isDefeatedKing ? (
            <div
              className={`absolute inset-0 pointer-events-none z-10 animate-in fade-in duration-300 ${cornerRoundedClass || ''}`}
              style={{
                background:
                  'radial-gradient(circle at center, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.75) 45%, rgba(127, 29, 29, 0.4) 75%, transparent 100%)',
                boxShadow: 'inset 0 0 16px 4px rgba(185, 28, 28, 0.85)',
              }}
            />
          ) : isCheckSquare ? (
            <div
              className={`absolute inset-0 pointer-events-none z-10 animate-pulse ${cornerRoundedClass || ''}`}
              style={{
                background:
                  'radial-gradient(circle at center, rgba(239, 68, 68, 0.88) 0%, rgba(220, 38, 38, 0.55) 35%, rgba(185, 28, 28, 0.22) 65%, transparent 85%)',
                boxShadow: 'inset 0 0 14px 2px rgba(239, 68, 68, 0.65)',
              }}
            />
          ) : null}
          {showRank && (
            <span
              className={`absolute top-0.5 left-1 text-[11px] font-black leading-none select-none pointer-events-none ${
                isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
              }`}
            >
              {rank}
            </span>
          )}
          {showFile && (
            <span
              className={`absolute bottom-0.5 right-1 text-[11px] font-black leading-none select-none pointer-events-none ${
                isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
              }`}
            >
              {file}
            </span>
          )}
          {isAnimating && (
            <div className="absolute inset-0 pointer-events-none z-10 animate-tile-flash" />
          )}
          {isPieceBeingDragged && (
            <div className="absolute inset-0 bg-[#f7f789]/60 border-2 border-[#baca2b] pointer-events-none z-10" />
          )}
        </>
      )}

      {/* Defeated King Checkmate Badge */}
      {isDefeatedKing && isCheckmate && (
        <div className={`absolute ${badgePositionClass} z-30 pointer-events-none animate-in zoom-in-75 duration-200`}>
          <CheckmateBadge size="board" />
        </div>
      )}

      {/* Winning King Crown Badge */}
      {isWinningKing && (
        <div className={`absolute ${badgePositionClass} z-30 pointer-events-none animate-in zoom-in-75 duration-200`}>
          <WinnerBadge size="board" />
        </div>
      )}

      {/* Classification Badge on Top-Right (z-30: always rendered above pieces and arrows) */}
      {classificationOnSquare && (
        <div className={`absolute ${badgePositionClass} z-30 pointer-events-none animate-in zoom-in-75 duration-200`}>
          <ClassificationBadge classification={classificationOnSquare} size="board" />
        </div>
      )}

      {/* Drag-Over Tile Highlight (Lights up tiles as piece moves across) */}
      {isDragOver && (
        <div
          className={`absolute inset-0 pointer-events-none z-15 transition-all duration-75 ${
            isLegalDestination
              ? 'bg-emerald-500/40 ring-4 ring-inset ring-emerald-500'
              : 'bg-white/20 ring-2 ring-inset ring-white/40'
          }`}
        />
      )}

      {/* Piece Rendering (z-20: rendered above arrows) */}
      {piece && !blindfold && (
        <div
          key={`piece-${sq}-${piece.type}-${piece.color}`}
          style={
            isLastMovePiece
              ? ({
                  '--move-dx': `${moveDelta!.dx}%`,
                  '--move-dy': `${moveDelta!.dy}%`,
                } as React.CSSProperties)
              : undefined
          }
          className={`w-[86%] h-[86%] flex items-center justify-center pointer-events-none transition-transform ${
            isDefeatedKing && piece.type === 'k'
              ? 'animate-king-defeated select-none drop-shadow-md z-30'
              : isLastMovePiece && !isPieceBeingDragged
              ? 'animate-piece-speed-blur select-none z-30'
              : isPieceBeingDragged
              ? 'opacity-0 pointer-events-none select-none z-20'
              : 'select-none z-20'
          }`}
        >
          <PieceIcon type={piece.type} color={piece.color} theme={pieceTheme} />
        </div>
      )}

      {/* Legal Move Indicators (Quiet moves vs Captures) */}
      {isLegalDestination && !isCapture && (
        <div className="absolute z-20 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-black/25 dark:bg-white/35 pointer-events-none shadow-sm" />
      )}
      {isLegalDestination && isCapture && (
        <div className="absolute inset-1 sm:inset-1.5 z-20 border-[5px] sm:border-[6px] border-black/25 dark:border-white/35 rounded-full pointer-events-none" />
      )}

      {/* Premove Candidate Dots (Quiet moves vs Captures) */}
      {isPremoveCandidate && !isCapture && (
        <div className="absolute z-20 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-rose-500/50 pointer-events-none shadow-sm animate-in fade-in duration-75" />
      )}
      {isPremoveCandidate && isCapture && (
        <div className="absolute inset-1 sm:inset-1.5 z-20 border-[4px] sm:border-[5px] border-rose-500/50 rounded-full pointer-events-none animate-in fade-in duration-75" />
      )}
    </div>
  );
});

export const ChessBoard: React.FC<ChessBoardProps> = React.memo(function ChessBoard({
  chess,
  orientation = 'w',
  playerColor,
  boardTheme = 'green',
  pieceTheme = 'neo',
  moveInputMode = 'both',
  premoveEnabled: propPremoveEnabled,
  onMove,
  onPremove,
  lastMove = null,
  activeClassification = null,
  bestMoveArrow = null,
  premoves = [],
  activePremove: propsActivePremove,
  onPremoveChange,
  customArrows = [],
  customSquareHighlights = [],
  onCustomSquareClick,
  onAddCustomArrow,
  onClearCustomArrows,
  disabled = false,
  blindfold = false,
  isFastForward = false,
  defeatedColor = null,
}) {
  const safeShell = useSafeShell();
  const effectivePremoveEnabled =
    propPremoveEnabled !== undefined ? propPremoveEnabled : (safeShell?.premoveEnabled ?? false);
  const effectivePlayerColor: PieceColor = playerColor || orientation || 'w';
  const isMyTurn = chess.turn() === effectivePlayerColor;

  // Internal premove state if not externally controlled
  const [internalPremove, setInternalPremove] = useState<Premove | null>(null);
  const premove = propsActivePremove !== undefined ? propsActivePremove : internalPremove;

  const setPremoveState = useCallback(
    (pm: Premove | null) => {
      setInternalPremove(pm);
      if (onPremoveChange) onPremoveChange(pm);
    },
    [onPremoveChange]
  );

  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Escape key cancels active premove or square selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (premove) setPremoveState(null);
        if (selectedSquare) setSelectedSquare(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [premove, selectedSquare, setPremoveState]);

  // Active drag metadata for rendering the floating piece
  const [activeDrag, setActiveDrag] = useState<{
    square: Square;
    type: PieceSymbol;
    color: PieceColor;
  } | null>(null);

  // Active square currently hovered by dragged piece (for real-time tile highlight)
  const [dragOverSquare, setDragOverSquare] = useState<Square | null>(null);
  const [dragSquareSize, setDragSquareSize] = useState<number>(56);
  const dragOverSquareRef = useRef<Square | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const floatingPieceRef = useRef<HTMLDivElement>(null);
  const dragCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tracks whether the last move was made via drag-and-drop (to disable redundant re-sliding)
  const wasDraggedRef = useRef(false);

  // Pointer drag origin tracking without causing React re-renders
  const dragOriginRef = useRef<{
    square: Square;
    piece: { type: PieceSymbol; color: PieceColor };
    startX: number;
    startY: number;
    squareSize: number;
    isDragging: boolean;
  } | null>(null);

  // Suppresses click event right after a completed drag-and-drop
  const wasDraggingJustNow = useRef(false);

  // Active square currently running arrival animation (clears strictly after 180ms)
  const [animatingSquare, setAnimatingSquare] = useState<Square | null>(null);
  const prevLastMoveRef = useRef<{ from: Square; to: Square } | null>(null);

  useEffect(() => {
    if (!lastMove || !lastMove.from || !lastMove.to) {
      setAnimatingSquare(null);
      prevLastMoveRef.current = null;
      return;
    }

    const isSameMove =
      prevLastMoveRef.current &&
      prevLastMoveRef.current.from === lastMove.from &&
      prevLastMoveRef.current.to === lastMove.to;

    if (isSameMove) {
      return;
    }

    prevLastMoveRef.current = lastMove;

    if (wasDraggedRef.current) {
      // Local drag-and-drop was already positioned by user - no animation needed
      wasDraggedRef.current = false;
      setAnimatingSquare(null);
      return;
    }

    if (isFastForward) {
      setAnimatingSquare(null);
      return;
    }

    // Trigger animation strictly once for 180ms, then clear completely
    setAnimatingSquare(lastMove.to);
    const timer = setTimeout(() => {
      setAnimatingSquare(null);
    }, 180);

    return () => clearTimeout(timer);
  }, [lastMove, isFastForward]);

  // Right-click drag arrow drawing state
  const [arrowDragStart, setArrowDragStart] = useState<Square | null>(null);

  const colors = THEME_COLORS[boardTheme] || THEME_COLORS.green;

  // Board layout depending on player perspective
  const ranksLayout = useMemo(() => {
    return orientation === 'w' ? RANKS : [...RANKS].reverse();
  }, [orientation]);

  const filesLayout = useMemo(() => {
    return orientation === 'w' ? FILES : [...FILES].reverse();
  }, [orientation]);

  // Calculate relative pixel/percentage translation offset for last move piece speed blur animation
  const moveDelta = useMemo(() => {
    if (!lastMove || !lastMove.from || !lastMove.to) return null;
    const from = lastMove.from;
    const to = lastMove.to;
    const fromFileIdx = filesLayout.indexOf(from[0]);
    const fromRankIdx = ranksLayout.indexOf(from[1]);
    const toFileIdx = filesLayout.indexOf(to[0]);
    const toRankIdx = ranksLayout.indexOf(to[1]);
    if (fromFileIdx === -1 || fromRankIdx === -1 || toFileIdx === -1 || toRankIdx === -1) return null;
    return {
      dx: (fromFileIdx - toFileIdx) * 100,
      dy: (fromRankIdx - toRankIdx) * 100,
    };
  }, [lastMove, filesLayout, ranksLayout]);

  // Compute legal moves for selected square during player's turn
  const activeOriginSquare = activeDrag ? activeDrag.square : selectedSquare;
  const legalMovesForActive = useMemo(() => {
    if (!activeOriginSquare || disabled || !isMyTurn) return [];
    try {
      return chess.moves({ square: activeOriginSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, activeOriginSquare, disabled, isMyTurn]);

  const legalSquaresMap = useMemo(() => {
    const map = new Map<Square, Move>();
    legalMovesForActive.forEach((m) => {
      map.set(m.to as Square, m);
    });
    return map;
  }, [legalMovesForActive]);

  // Compute premove candidate target squares when piece selected during opponent's turn
  const premoveCandidateSquares = useMemo(() => {
    if (isMyTurn || !effectivePremoveEnabled || !activeOriginSquare || disabled) {
      return new Set<Square>();
    }
    const piece = chess.get(activeOriginSquare);
    if (!piece || piece.color !== effectivePlayerColor) return new Set<Square>();
    const candidates = getPremoveCandidateSquares(activeOriginSquare, piece.type, piece.color);
    return new Set<Square>(candidates);
  }, [isMyTurn, effectivePremoveEnabled, activeOriginSquare, chess, effectivePlayerColor, disabled]);

  // Auto-execution watchdog: triggers immediately when opponent move arrives and it becomes player's turn
  const lastProcessedFenRef = useRef<string>(chess.fen());

  useEffect(() => {
    const currentFen = chess.fen();
    if (currentFen === lastProcessedFenRef.current) return;
    lastProcessedFenRef.current = currentFen;

    if (!premove) return;

    if (chess.isGameOver()) {
      setPremoveState(null);
      return;
    }

    // When turn becomes our turn, validate and execute premove in 0.0s!
    if (chess.turn() === effectivePlayerColor) {
      const pmToExecute = premove;
      setPremoveState(null);

      const validation = validatePremoveInPosition(currentFen, pmToExecute);
      if (validation.valid && validation.move && onMove) {
        onMove(pmToExecute.from, pmToExecute.to, (pmToExecute.promotion as PieceSymbol) || 'q');
      }
    }
  }, [chess, effectivePlayerColor, premove, onMove, setPremoveState]);

  // Find King in check
  const kingInCheckSquare = useMemo<Square | null>(() => {
    if (!chess.isCheck()) return null;
    const turn = chess.turn();
    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === turn) {
          const file = FILES[c];
          const rank = RANKS[r];
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chess]);

  // Find Defeated King (Checkmate or explicit resignation/loss/timeout)
  const defeatedKingSquare = useMemo<Square | null>(() => {
    let targetColor: PieceColor | null = defeatedColor || null;
    if (!targetColor && chess.isCheckmate()) {
      targetColor = chess.turn();
    }
    if (!targetColor) return null;

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === targetColor) {
          const file = FILES[c];
          const rank = RANKS[r];
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chess, defeatedColor]);

  // Find Winning King on checkmate or explicit game victory
  const winningKingSquare = useMemo<Square | null>(() => {
    let winnerColor: PieceColor | null = null;
    if (defeatedColor) {
      winnerColor = defeatedColor === 'w' ? 'b' : 'w';
    } else if (chess.isCheckmate()) {
      winnerColor = chess.turn() === 'w' ? 'b' : 'w';
    }
    if (!winnerColor) return null;

    const board = chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === winnerColor) {
          const file = FILES[c];
          const rank = RANKS[r];
          return `${file}${rank}` as Square;
        }
      }
    }
    return null;
  }, [chess, defeatedColor]);

  // Execute Move Helper (Optimistic local dispatch)
  const executeMove = useCallback(
    (from: Square, to: Square, wasDrag = false, promotion?: PieceSymbol) => {
      wasDraggedRef.current = wasDrag;
      const piece = chess.get(from);
      const isPawnPromotion =
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPawnPromotion && !promotion) {
        setPendingPromotion({ from, to });
        return;
      }

      if (onMove) {
        onMove(from, to, promotion);
      }
      setSelectedSquare(null);
    },
    [chess, onMove]
  );

  // Square Click Handler
  const handleSquareClick = useCallback(
    (sq: Square) => {
      if (wasDraggingJustNow.current) return;

      if (onCustomSquareClick) {
        const consumed = onCustomSquareClick(sq);
        if (consumed) return;
      }

      if (disabled) return;

      // 1. Regular turn move handling
      if (isMyTurn) {
        if (selectedSquare) {
          if (selectedSquare === sq) {
            setSelectedSquare(null);
            return;
          }

          const legalMove = legalSquaresMap.get(sq);
          if (legalMove) {
            executeMove(selectedSquare, sq, false);
            return;
          }

          const clickedPiece = chess.get(sq);
          if (clickedPiece && clickedPiece.color === chess.turn()) {
            setSelectedSquare(sq);
            return;
          }

          setSelectedSquare(null);
          return;
        }

        const piece = chess.get(sq);
        if (piece && piece.color === chess.turn()) {
          setSelectedSquare(sq);
        } else {
          setSelectedSquare(null);
        }
        return;
      }

      // 2. Premove handling during opponent's turn
      if (effectivePremoveEnabled) {
        if (selectedSquare) {
          if (selectedSquare === sq) {
            // Clicking selected piece again deselects it; if already premoved from here, cancels premove
            if (premove?.from === sq) {
              setPremoveState(null);
            }
            setSelectedSquare(null);
            return;
          }

          const clickedPiece = chess.get(sq);
          if (clickedPiece && clickedPiece.color === effectivePlayerColor) {
            // Switch selection to another friendly piece
            setSelectedSquare(sq);
            return;
          }

          // Test geometric validity for premove
          const selectedPiece = chess.get(selectedSquare);
          if (
            selectedPiece &&
            selectedPiece.color === effectivePlayerColor &&
            isGeometricMoveValid(selectedSquare, sq, selectedPiece.type, selectedPiece.color)
          ) {
            const isPawnPromotion =
              selectedPiece.type === 'p' &&
              ((selectedPiece.color === 'w' && sq[1] === '8') ||
                (selectedPiece.color === 'b' && sq[1] === '1'));
            const newPremove: Premove = {
              from: selectedSquare,
              to: sq,
              promotion: isPawnPromotion ? 'q' : undefined,
            };
            setPremoveState(newPremove);
            if (onPremove) onPremove(selectedSquare, sq);
            soundService.playTactilePop();
            setSelectedSquare(null);
            return;
          }

          setSelectedSquare(null);
          return;
        }

        const piece = chess.get(sq);
        if (piece && piece.color === effectivePlayerColor) {
          if (premove?.from === sq) {
            // Clicking piece that has active premove cancels it
            setPremoveState(null);
            setSelectedSquare(null);
            return;
          }
          setSelectedSquare(sq);
        } else {
          setSelectedSquare(null);
        }
      }
    },
    [
      disabled,
      isMyTurn,
      effectivePremoveEnabled,
      effectivePlayerColor,
      selectedSquare,
      legalSquaresMap,
      executeMove,
      chess,
      premove,
      setPremoveState,
      onPremove,
      onCustomSquareClick,
    ]
  );

  // Pointer Down (Records initial position & square pixel size for perfect center drag alignment)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, sq: Square) => {
      if (disabled || e.button !== 0) return;
      if (moveInputMode === 'click') return;

      const piece = chess.get(sq);
      if (!piece) return;

      if (isMyTurn) {
        if (piece.color !== chess.turn()) return;
      } else {
        if (!effectivePremoveEnabled || piece.color !== effectivePlayerColor) return;
      }

      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const sqSize = rect.width || (boardRef.current ? boardRef.current.clientWidth / 8 : 56);

      dragCoordsRef.current = { x: e.clientX, y: e.clientY };

      dragOriginRef.current = {
        square: sq,
        piece: { type: piece.type, color: piece.color },
        startX: e.clientX,
        startY: e.clientY,
        squareSize: sqSize,
        isDragging: false,
      };
    },
    [disabled, moveInputMode, chess, isMyTurn, effectivePremoveEnabled, effectivePlayerColor]
  );

  // Window-level pointer listeners for decoupled zero-latency drag-and-drop
  useEffect(() => {
    const onGlobalPointerMove = (e: PointerEvent) => {
      if (!dragOriginRef.current) return;

      dragCoordsRef.current = { x: e.clientX, y: e.clientY };

      if (!dragOriginRef.current.isDragging) {
        const dist = Math.hypot(
          e.clientX - dragOriginRef.current.startX,
          e.clientY - dragOriginRef.current.startY
        );
        // 3px movement threshold before initiating drag
        if (dist >= 3) {
          dragOriginRef.current.isDragging = true;
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';
          setDragSquareSize(dragOriginRef.current.squareSize);
          setActiveDrag({
            square: dragOriginRef.current.square,
            type: dragOriginRef.current.piece.type,
            color: dragOriginRef.current.piece.color,
          });
          setSelectedSquare(dragOriginRef.current.square);
        }
      }

      if (dragOriginRef.current.isDragging) {
        // Direct, zero-latency synchronous hardware transform update directly locked to pointer coordinates!
        // No requestAnimationFrame drops, no frame queuing, instantaneous 1:1 cursor sync!
        if (floatingPieceRef.current) {
          floatingPieceRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
        }

        // Highlight the tile currently hovered during dragging
        if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const squareWidth = rect.width / 8;
            const squareHeight = rect.height / 8;
            const fileIndex = Math.floor(x / squareWidth);
            const rankIndex = Math.floor(y / squareHeight);

            if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
              const hoverSquare = `${filesLayout[fileIndex]}${ranksLayout[rankIndex]}` as Square;
              if (dragOverSquareRef.current !== hoverSquare) {
                dragOverSquareRef.current = hoverSquare;
                setDragOverSquare(hoverSquare);
              }
            } else if (dragOverSquareRef.current !== null) {
              dragOverSquareRef.current = null;
              setDragOverSquare(null);
            }
          } else if (dragOverSquareRef.current !== null) {
            dragOverSquareRef.current = null;
            setDragOverSquare(null);
          }
        }
      }
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (!dragOriginRef.current) return;

      const wasDragging = dragOriginRef.current.isDragging;
      const originSquare = dragOriginRef.current.square;
      dragOriginRef.current = null;
      dragOverSquareRef.current = null;
      setDragOverSquare(null);

      if (wasDragging) {
        wasDraggingJustNow.current = true;
        setTimeout(() => {
          wasDraggingJustNow.current = false;
        }, 120);

        if (boardRef.current) {
          const rect = boardRef.current.getBoundingClientRect();
          // Drop where the pointer/drag center currently is
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;

          if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
            const squareWidth = rect.width / 8;
            const squareHeight = rect.height / 8;
            const fileIndex = Math.floor(x / squareWidth);
            const rankIndex = Math.floor(y / squareHeight);

            if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
              const targetFile = filesLayout[fileIndex];
              const targetRank = ranksLayout[rankIndex];
              const targetSquare = `${targetFile}${targetRank}` as Square;

              if (targetSquare !== originSquare) {
                if (isMyTurn) {
                  const legalMove = legalSquaresMap.get(targetSquare);
                  if (legalMove) {
                    executeMove(originSquare, targetSquare, true);
                    setSelectedSquare(null);
                    setActiveDrag(null);
                    return;
                  }
                } else if (effectivePremoveEnabled) {
                  const originPiece = chess.get(originSquare);
                  if (
                    originPiece &&
                    originPiece.color === effectivePlayerColor &&
                    isGeometricMoveValid(originSquare, targetSquare, originPiece.type, originPiece.color)
                  ) {
                    const isPawnPromotion =
                      originPiece.type === 'p' &&
                      ((originPiece.color === 'w' && targetSquare[1] === '8') ||
                        (originPiece.color === 'b' && targetSquare[1] === '1'));
                    const newPremove: Premove = {
                      from: originSquare,
                      to: targetSquare,
                      promotion: isPawnPromotion ? 'q' : undefined,
                    };
                    setPremoveState(newPremove);
                    if (onPremove) onPremove(originSquare, targetSquare);
                    soundService.playTactilePop();
                    setSelectedSquare(null);
                    setActiveDrag(null);
                    return;
                  }
                }
              }
            }
          }
        }
        setActiveDrag(null);
      }
    };

    window.addEventListener('pointermove', onGlobalPointerMove, { passive: true });
    window.addEventListener('pointerup', onGlobalPointerUp);
    window.addEventListener('pointercancel', onGlobalPointerUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
    };
  }, [
    filesLayout,
    ranksLayout,
    legalSquaresMap,
    executeMove,
    isMyTurn,
    effectivePremoveEnabled,
    effectivePlayerColor,
    chess,
    onPremove,
    setPremoveState,
  ]);

  // Arrow drawing & premove cancellation right-click events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, sq: Square) => {
      if (e.button === 2) {
        e.preventDefault();
        // If an active premove exists, right-click cancels it immediately!
        if (premove) {
          setPremoveState(null);
          return;
        }
        setArrowDragStart(sq);
      }
    },
    [premove, setPremoveState]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, sq: Square) => {
      if (e.button === 2 && arrowDragStart) {
        e.preventDefault();
        if (onAddCustomArrow) {
          onAddCustomArrow({ from: arrowDragStart, to: sq, color: '#10b981' });
        }
        setArrowDragStart(null);
      }
    },
    [arrowDragStart, onAddCustomArrow]
  );

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const getSquareCenterPercent = useCallback(
    (sq: Square) => {
      const file = sq[0];
      const rank = sq[1];
      const fileIdx = filesLayout.indexOf(file);
      const rankIdx = ranksLayout.indexOf(rank);
      if (fileIdx === -1 || rankIdx === -1) return null;
      return {
        x: (fileIdx + 0.5) * 12.5,
        y: (rankIdx + 0.5) * 12.5,
      };
    },
    [filesLayout, ranksLayout]
  );

  const arrowsToRender = useMemo(() => {
    const list: ArrowAnnotation[] = [...customArrows];
    if (bestMoveArrow) {
      list.push({ from: bestMoveArrow.from, to: bestMoveArrow.to, color: '#06b6d4' });
    }
    if (premove) {
      list.push({ from: premove.from, to: premove.to, color: '#f43f5e' });
    }
    return list;
  }, [customArrows, bestMoveArrow, premove]);

  return (
    <div
      ref={boardRef}
      onContextMenu={handleContextMenu}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="relative w-full h-full aspect-square rounded-none sm:rounded-xl shadow-2xl overflow-visible select-none"
    >
      {/* Compute squares list once for both background and foreground layers */}
      {(() => {
        const squaresList: BoardSquareProps[] = [];
        ranksLayout.forEach((rank, rankIdx) => {
          filesLayout.forEach((file, fileIdx) => {
            const sq = `${file}${rank}` as Square;
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const piece = chess.get(sq);

            const isSelected = selectedSquare === sq;
            const isLegalDestination = legalSquaresMap.has(sq);
            const isPremoveSquare = Boolean(premove && (premove.from === sq || premove.to === sq));
            const isPremoveCandidate = premoveCandidateSquares.has(sq);
            const isCapture =
              Boolean(isLegalDestination && (piece || chess.get(sq))) ||
              Boolean(isPremoveCandidate && piece && piece.color !== effectivePlayerColor);

            const isLastMoveFrom = lastMove?.from === sq;
            const isLastMoveTo = lastMove?.to === sq;

            const isCheckSquare = kingInCheckSquare === sq;
            const isDefeatedKing = defeatedKingSquare === sq;
            const isWinningKing = winningKingSquare === sq;

            const showRank = fileIdx === 0;
            const showFile = rankIdx === 7;

            const classificationOnSquare =
              activeClassification && activeClassification.square === sq
                ? activeClassification.classification
                : null;

            let moveHighlightOverlayColor: string | null = null;
            if (classificationOnSquare) {
              const conf = CLASSIFICATION_CONFIG[classificationOnSquare];
              if (conf) {
                moveHighlightOverlayColor = conf.overlayRgba;
              }
            }

            let bgSquareColor = isLight ? colors.light : colors.dark;
            if (isSelected) {
              bgSquareColor = isLight ? '#f7f789' : '#baca2b';
            } else if (isLastMoveFrom || isLastMoveTo) {
              bgSquareColor = isLight ? '#f5f682' : '#b9ca43';
            }

            const customHighlight = customSquareHighlights.find((h) => h.square === sq);
            const isPieceBeingDragged = activeDrag !== null && activeDrag.square === sq;

            const cornerRoundedClass =
              rankIdx === 0 && fileIdx === 0
                ? 'sm:rounded-tl-xl'
                : rankIdx === 0 && fileIdx === 7
                ? 'sm:rounded-tr-xl'
                : rankIdx === 7 && fileIdx === 0
                ? 'sm:rounded-bl-xl'
                : rankIdx === 7 && fileIdx === 7
                ? 'sm:rounded-br-xl'
                : '';

            squaresList.push({
              sq,
              piece,
              isLight,
              isSelected,
              isLegalDestination,
              isCapture,
              isPremoveSquare,
              isPremoveCandidate,
              isLastMoveFrom,
              isLastMoveTo,
              isCheckSquare,
              isDefeatedKing,
              isCheckmate: chess.isCheckmate(),
              isWinningKing,
              classificationOnSquare,
              customHighlight,
              moveHighlightOverlayColor,
              showRank,
              showFile,
              rank,
              file,
              fileIdx,
              rankIdx,
              pieceTheme,
              blindfold,
              isFastForward,
              moveDelta,
              isAnimating: animatingSquare === sq,
              isPieceBeingDragged,
              isDragOver: dragOverSquare === sq && activeDrag?.square !== sq,
              bgSquareColor,
              cornerRoundedClass,
              onSquareClick: handleSquareClick,
              onPointerDownSquare: handlePointerDown,
              onMouseDownSquare: handleMouseDown,
              onMouseUpSquare: handleMouseUp,
            });
          });
        });

        return (
          <>
            {/* Layer 1: Board Tile Backgrounds & Highlights (z-0) */}
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 w-full h-full select-none pointer-events-none z-0">
              {squaresList.map((sqProps) => (
                <BoardSquare key={`bg-${sqProps.sq}`} layer="background" {...sqProps} />
              ))}
            </div>

            {/* Layer 2: SVG Arrow Annotations Overlay (Rendered BELOW pieces & badges at z-10) */}
            {arrowsToRender.length > 0 && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100"
              >
                {arrowsToRender.map((arrow, idx) => {
                  const start = getSquareCenterPercent(arrow.from);
                  const end = getSquareCenterPercent(arrow.to);
                  if (!start || !end) return null;

                  const arrowColor = arrow.color || '#10b981';

                  if (arrow.from === arrow.to) {
                    return (
                      <circle
                        key={idx}
                        cx={start.x}
                        cy={start.y}
                        r={5}
                        fill={arrowColor}
                        opacity={0.75}
                      />
                    );
                  }

                  const headLength = 4.0;
                  const headHalfWidth = 2.4;
                  const shaftHalfWidth = 1.05;
                  const notchDepth = 0.8;

                  const isKnightL =
                    (Math.abs(start.x - end.x) === 12.5 && Math.abs(start.y - end.y) === 25) ||
                    (Math.abs(start.x - end.x) === 25 && Math.abs(start.y - end.y) === 12.5);

                  if (isKnightL) {
                    const cornerX = Math.abs(start.x - end.x) === 12.5 ? start.x : end.x;
                    const cornerY = Math.abs(start.x - end.x) === 12.5 ? end.y : start.y;

                    const dx2 = end.x - cornerX;
                    const dy2 = end.y - cornerY;
                    const len2 = Math.hypot(dx2, dy2);
                    if (len2 < 1) return null;

                    const u2x = dx2 / len2;
                    const u2y = dy2 / len2;
                    const n2x = -u2y;
                    const n2y = u2x;

                    const tipX = end.x - u2x * 0.9;
                    const tipY = end.y - u2y * 0.9;

                    const baseX = tipX - u2x * headLength;
                    const baseY = tipY - u2y * headLength;
                    const notchX = baseX + u2x * notchDepth;
                    const notchY = baseY + u2y * notchDepth;

                    const wingLeftX = baseX + n2x * headHalfWidth;
                    const wingLeftY = baseY + n2y * headHalfWidth;
                    const wingRightX = baseX - n2x * headHalfWidth;
                    const wingRightY = baseY - n2y * headHalfWidth;

                    return (
                      <g key={idx} opacity={0.80}>
                        <path
                          d={`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${cornerX.toFixed(2)} ${cornerY.toFixed(2)} L ${notchX.toFixed(2)} ${notchY.toFixed(2)}`}
                          stroke={arrowColor}
                          strokeWidth={shaftHalfWidth * 2}
                          strokeLinecap="round"
                          fill="none"
                        />
                        <polygon
                          points={`${tipX.toFixed(2)},${tipY.toFixed(2)} ${wingLeftX.toFixed(2)},${wingLeftY.toFixed(2)} ${notchX.toFixed(2)},${notchY.toFixed(2)} ${wingRightX.toFixed(2)},${wingRightY.toFixed(2)}`}
                          fill={arrowColor}
                        />
                      </g>
                    );
                  }

                  const dx = end.x - start.x;
                  const dy = end.y - start.y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  if (len < 1) return null;

                  const ux = dx / len;
                  const uy = dy / len;
                  const nx = -uy;
                  const ny = ux;

                  const sX = start.x + ux * 1.5;
                  const sY = start.y + uy * 1.5;

                  const tipX = end.x - ux * 0.9;
                  const tipY = end.y - uy * 0.9;

                  const baseX = tipX - ux * headLength;
                  const baseY = tipY - uy * headLength;
                  const notchX = baseX + ux * notchDepth;
                  const notchY = baseY + uy * notchDepth;

                  const wingLeftX = baseX + nx * headHalfWidth;
                  const wingLeftY = baseY + ny * headHalfWidth;
                  const wingRightX = baseX - nx * headHalfWidth;
                  const wingRightY = baseY - ny * headHalfWidth;

                  const shaftLeftEndX = notchX + nx * shaftHalfWidth;
                  const shaftLeftEndY = notchY + ny * shaftHalfWidth;
                  const shaftRightEndX = notchX - nx * shaftHalfWidth;
                  const shaftRightEndY = notchY - ny * shaftHalfWidth;

                  const startLeftX = sX + nx * shaftHalfWidth;
                  const startLeftY = sY + ny * shaftHalfWidth;
                  const startRightX = sX - nx * shaftHalfWidth;
                  const startRightY = sY - ny * shaftHalfWidth;

                  const chevronPath = `M ${startLeftX.toFixed(2)} ${startLeftY.toFixed(2)} L ${shaftLeftEndX.toFixed(2)} ${shaftLeftEndY.toFixed(2)} L ${wingLeftX.toFixed(2)} ${wingLeftY.toFixed(2)} L ${tipX.toFixed(2)} ${tipY.toFixed(2)} L ${wingRightX.toFixed(2)} ${wingRightY.toFixed(2)} L ${shaftRightEndX.toFixed(2)} ${shaftRightEndY.toFixed(2)} L ${startRightX.toFixed(2)} ${startRightY.toFixed(2)} Z`;

                  return (
                    <g key={idx} opacity={0.80}>
                      <path
                        d={chevronPath}
                        fill={arrowColor}
                        stroke={arrowColor}
                        strokeWidth={0.2}
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Layer 3: Interactive Pieces, Badges, Legal Move Indicators (Rendered ABOVE arrows at z-20) */}
            <div className="relative grid grid-cols-8 grid-rows-8 w-full h-full select-none z-20" style={{ touchAction: 'none' }}>
              {squaresList.map((sqProps) => (
                <BoardSquare key={`fg-${sqProps.sq}`} layer="foreground" {...sqProps} />
              ))}
            </div>
          </>
        );
      })()}

      {/* Hardware-accelerated floating piece element centered on drag point in Portal */}
      {activeDrag &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={(el) => {
              floatingPieceRef.current = el;
              if (el) {
                el.style.transform = `translate3d(${dragCoordsRef.current.x}px, ${dragCoordsRef.current.y}px, 0) translate(-50%, -50%)`;
              }
            }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              width: dragSquareSize,
              height: dragSquareSize,
              willChange: 'transform',
              pointerEvents: 'none',
              zIndex: 999999,
              transition: 'none',
            }}
            className="flex items-center justify-center pointer-events-none select-none"
          >
            <div className="w-[92%] h-[92%] flex items-center justify-center pointer-events-none select-none scale-110 filter drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)] transition-transform duration-75">
              <PieceIcon type={activeDrag.type} color={activeDrag.color} theme={pieceTheme} />
            </div>
          </div>,
          document.body
        )}

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
          <div className="bg-[#262421] border border-[#3b3833] rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3 text-white">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Choose Promotion
            </span>
            <div className="flex gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => {
                    soundService.playTactilePop();
                    if (onMove) {
                      onMove(pendingPromotion.from, pendingPromotion.to, pType);
                    }
                    setPendingPromotion(null);
                  }}
                  className="w-14 h-14 rounded-xl bg-gradient-to-b from-[#3a3731] to-[#2a2723] hover:from-[#8fd649] hover:to-[#699c30] border-t border-white/20 transition-all flex items-center justify-center p-2 cursor-pointer shadow-[0_3px_0_0_#141311] hover:shadow-[0_3px_0_0_#385a16] active:translate-y-[2px] active:shadow-[0_1px_0_0_#385a16]"
                >
                  <PieceIcon type={pType} color={chess.turn()} theme={pieceTheme} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
