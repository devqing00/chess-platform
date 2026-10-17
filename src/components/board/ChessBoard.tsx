'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PieceIcon } from './PieceIcons';
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

export interface ChessBoardProps {
  chess: Chess;
  orientation?: PieceColor;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
  moveInputMode?: MoveInputMode;
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  onPremove?: (from: Square, to: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
  activeClassification?: { square: Square; classification: MoveClassification } | null;
  bestMoveArrow?: { from: Square; to: Square } | null;
  premoves?: Premove[];
  customArrows?: ArrowAnnotation[];
  customSquareHighlights?: { square: Square; color?: string; label?: string; border?: string }[];
  onCustomSquareClick?: (sq: Square) => boolean | void;
  onAddCustomArrow?: (arrow: ArrowAnnotation) => void;
  onClearCustomArrows?: () => void;
  disabled?: boolean;
  blindfold?: boolean;
  isFastForward?: boolean;
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
  sq: Square;
  piece: { type: PieceSymbol; color: PieceColor } | null | undefined;
  isLight: boolean;
  isSelected: boolean;
  isLegalDestination: boolean;
  isCapture: boolean;
  isLastMoveFrom: boolean;
  isLastMoveTo: boolean;
  isCheckSquare: boolean;
  isCheckmatedKing: boolean;
  isWinningKing: boolean;
  classificationOnSquare: MoveClassification | null;
  customHighlight?: { square: Square; color?: string; label?: string; border?: string };
  moveHighlightOverlayColor?: string | null;
  showRank: boolean;
  showFile: boolean;
  rank: string;
  file: string;
  pieceTheme: PieceTheme;
  blindfold: boolean;
  isFastForward: boolean;
  moveDelta: { dx: number; dy: number } | null;
  wasDraggedLast: boolean;
  isPieceBeingDragged: boolean;
  bgSquareColor: string;
  onSquareClick: (sq: Square) => void;
  onPointerDownSquare: (e: React.PointerEvent, sq: Square) => void;
  onMouseDownSquare: (e: React.MouseEvent, sq: Square) => void;
  onMouseUpSquare: (e: React.MouseEvent, sq: Square) => void;
}

const BoardSquare = React.memo<BoardSquareProps>(function BoardSquare({
  sq,
  piece,
  isLight,
  isSelected,
  isLegalDestination,
  isCapture,
  isLastMoveFrom,
  isLastMoveTo,
  isCheckSquare,
  isCheckmatedKing,
  isWinningKing,
  classificationOnSquare,
  customHighlight,
  moveHighlightOverlayColor,
  showRank,
  showFile,
  rank,
  file,
  pieceTheme,
  blindfold,
  isFastForward,
  moveDelta,
  wasDraggedLast,
  isPieceBeingDragged,
  bgSquareColor,
  onSquareClick,
  onPointerDownSquare,
  onMouseDownSquare,
  onMouseUpSquare,
}) {
  const isLastMovePiece = Boolean(
    isLastMoveTo &&
      moveDelta &&
      (moveDelta.dx !== 0 || moveDelta.dy !== 0) &&
      !isFastForward &&
      !wasDraggedLast
  );

  return (
    <div
      role="gridcell"
      tabIndex={0}
      onClick={() => onSquareClick(sq)}
      onPointerDown={(e) => onPointerDownSquare(e, sq)}
      onMouseDown={(e) => onMouseDownSquare(e, sq)}
      onMouseUp={(e) => onMouseUpSquare(e, sq)}
      style={{
        backgroundColor: bgSquareColor,
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="relative w-full h-full flex items-center justify-center cursor-pointer focus:outline-none select-none"
    >
      {/* Move Type Classification Highlight Overlay */}
      {moveHighlightOverlayColor && (
        <div
          className="absolute inset-0 pointer-events-none z-10 transition-colors duration-150"
          style={{ backgroundColor: moveHighlightOverlayColor }}
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

      {/* Checkmated King or King in Check Red Glow */}
      {isCheckmatedKing ? (
        <>
          <div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background:
                'radial-gradient(circle at center, rgba(220, 38, 38, 0.95) 0%, rgba(185, 28, 28, 0.75) 45%, rgba(127, 29, 29, 0.4) 75%, transparent 100%)',
              boxShadow: 'inset 0 0 16px 4px rgba(185, 28, 28, 0.85)',
            }}
          />
          <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-40 pointer-events-none animate-in zoom-in-75 duration-200">
            <CheckmateBadge size="board" />
          </div>
        </>
      ) : isCheckSquare ? (
        <div
          className="absolute inset-0 pointer-events-none z-10 animate-pulse"
          style={{
            background:
              'radial-gradient(circle at center, rgba(239, 68, 68, 0.88) 0%, rgba(220, 38, 38, 0.55) 35%, rgba(185, 28, 28, 0.22) 65%, transparent 85%)',
            boxShadow: 'inset 0 0 14px 2px rgba(239, 68, 68, 0.65)',
          }}
        />
      ) : null}

      {/* Winning King Crown Badge */}
      {isWinningKing && (
        <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-40 pointer-events-none animate-in zoom-in-75 duration-200">
          <WinnerBadge size="board" />
        </div>
      )}

      {/* Classification Badge on Top-Right */}
      {classificationOnSquare && (
        <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3 z-40 pointer-events-none animate-in zoom-in-75 duration-200">
          <ClassificationBadge classification={classificationOnSquare} size="board" />
        </div>
      )}

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
      {isLastMoveTo && (
        <div className="absolute inset-0 pointer-events-none z-10 animate-tile-flash" />
      )}

      {/* Piece Rendering */}
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
            isCheckmatedKing && piece.type === 'k'
              ? 'animate-king-defeated select-none drop-shadow-md z-20'
              : isLastMovePiece && !isPieceBeingDragged
              ? 'animate-piece-speed-blur select-none z-30'
              : isPieceBeingDragged
              ? 'opacity-25 scale-90 z-20'
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
    </div>
  );
});

export const ChessBoard: React.FC<ChessBoardProps> = React.memo(function ChessBoard({
  chess,
  orientation = 'w',
  boardTheme = 'green',
  pieceTheme = 'neo',
  moveInputMode = 'both',
  onMove,
  onPremove,
  lastMove = null,
  activeClassification = null,
  bestMoveArrow = null,
  premoves = [],
  customArrows = [],
  customSquareHighlights = [],
  onCustomSquareClick,
  onAddCustomArrow,
  onClearCustomArrows,
  disabled = false,
  blindfold = false,
  isFastForward = false,
}) {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Active drag metadata for rendering the floating piece
  const [activeDrag, setActiveDrag] = useState<{
    square: Square;
    type: PieceSymbol;
    color: PieceColor;
  } | null>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const floatingPieceRef = useRef<HTMLDivElement>(null);
  const dragCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const rafIdRef = useRef<number | null>(null);

  // Tracks whether the last move was made via drag-and-drop (to disable redundant re-sliding)
  const wasDraggedRef = useRef(false);

  // Pointer drag origin tracking without causing React re-renders
  const dragOriginRef = useRef<{
    square: Square;
    piece: { type: PieceSymbol; color: PieceColor };
    startX: number;
    startY: number;
    isDragging: boolean;
  } | null>(null);

  // Suppresses click event right after a completed drag-and-drop
  const wasDraggingJustNow = useRef(false);

  useEffect(() => {
    if (wasDraggedRef.current) {
      const timer = setTimeout(() => {
        wasDraggedRef.current = false;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [lastMove]);

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

  // Compute legal moves for selected square
  const activeOriginSquare = activeDrag ? activeDrag.square : selectedSquare;
  const legalMovesForActive = useMemo(() => {
    if (!activeOriginSquare || disabled) return [];
    try {
      return chess.moves({ square: activeOriginSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, activeOriginSquare, disabled]);

  const legalSquaresMap = useMemo(() => {
    const map = new Map<Square, Move>();
    legalMovesForActive.forEach((m) => {
      map.set(m.to as Square, m);
    });
    return map;
  }, [legalMovesForActive]);

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

  // Find Winning King on checkmate
  const winningKingSquare = useMemo<Square | null>(() => {
    if (!chess.isCheckmate()) return null;
    const winnerColor = chess.turn() === 'w' ? 'b' : 'w';
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
  }, [chess]);

  // Execute Move Helper (Optimistic local dispatch)
  const executeMove = useCallback(
    (from: Square, to: Square, wasDrag = false) => {
      wasDraggedRef.current = wasDrag;
      const piece = chess.get(from);
      const isPawnPromotion =
        piece &&
        piece.type === 'p' &&
        ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1'));

      if (isPawnPromotion) {
        setPendingPromotion({ from, to });
        return;
      }

      if (onMove) {
        onMove(from, to);
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
        if (clickedPiece && (clickedPiece.color === chess.turn() || onPremove)) {
          setSelectedSquare(sq);
          return;
        }

        setSelectedSquare(null);
        return;
      }

      const piece = chess.get(sq);
      if (piece) {
        if (piece.color === chess.turn() || onPremove) {
          setSelectedSquare(sq);
        }
      } else {
        setSelectedSquare(null);
      }
    },
    [disabled, selectedSquare, legalSquaresMap, executeMove, chess, onPremove, onCustomSquareClick]
  );

  // Pointer Down (Records initial position; does NOT start drag until threshold is exceeded)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent, sq: Square) => {
      if (disabled || e.button !== 0) return;
      if (moveInputMode === 'click') return;

      const piece = chess.get(sq);
      if (!piece) return;

      if (piece.color !== chess.turn() && !onPremove) return;

      dragOriginRef.current = {
        square: sq,
        piece: { type: piece.type, color: piece.color },
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
      };
    },
    [disabled, moveInputMode, chess, onPremove]
  );

  // Position the floating piece with 60fps GPU acceleration via requestAnimationFrame
  const updateFloatingPos = useCallback(() => {
    if (floatingPieceRef.current) {
      floatingPieceRef.current.style.transform = `translate3d(${dragCoordsRef.current.x}px, ${dragCoordsRef.current.y}px, 0) translate(-50%, -50%)`;
    }
  }, []);

  // Window-level pointer listeners for decoupled drag-and-drop
  useEffect(() => {
    const onGlobalPointerMove = (e: PointerEvent) => {
      if (!dragOriginRef.current) return;

      dragCoordsRef.current = { x: e.clientX, y: e.clientY };

      if (!dragOriginRef.current.isDragging) {
        const dist = Math.hypot(
          e.clientX - dragOriginRef.current.startX,
          e.clientY - dragOriginRef.current.startY
        );
        // 5px movement threshold before initiating drag
        if (dist >= 5) {
          dragOriginRef.current.isDragging = true;
          setActiveDrag({
            square: dragOriginRef.current.square,
            type: dragOriginRef.current.piece.type,
            color: dragOriginRef.current.piece.color,
          });
          setSelectedSquare(dragOriginRef.current.square);
        }
      }

      if (dragOriginRef.current.isDragging) {
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = requestAnimationFrame(updateFloatingPos);
      }
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      if (!dragOriginRef.current) return;

      const wasDragging = dragOriginRef.current.isDragging;
      const originSquare = dragOriginRef.current.square;
      dragOriginRef.current = null;

      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      if (wasDragging) {
        wasDraggingJustNow.current = true;
        setTimeout(() => {
          wasDraggingJustNow.current = false;
        }, 120);

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
              const targetFile = filesLayout[fileIndex];
              const targetRank = ranksLayout[rankIndex];
              const targetSquare = `${targetFile}${targetRank}` as Square;

              if (targetSquare !== originSquare) {
                const legalMove = legalSquaresMap.get(targetSquare);
                if (legalMove) {
                  executeMove(originSquare, targetSquare, true);
                  setSelectedSquare(null);
                  setActiveDrag(null);
                  return;
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
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
      window.removeEventListener('pointercancel', onGlobalPointerUp);
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [filesLayout, ranksLayout, legalSquaresMap, executeMove, updateFloatingPos]);

  // Arrow drawing right-click events
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, sq: Square) => {
      if (e.button === 2) {
        e.preventDefault();
        setArrowDragStart(sq);
      }
    },
    []
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent, sq: Square) => {
      if (e.button === 2 && arrowDragStart) {
        e.preventDefault();
        if (onAddCustomArrow) {
          onAddCustomArrow({ from: arrowDragStart, to: sq, color: '#81b64c' });
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
    return list;
  }, [customArrows, bestMoveArrow]);

  return (
    <div
      ref={boardRef}
      onContextMenu={handleContextMenu}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      className="relative w-full h-full aspect-square rounded-none sm:rounded-xl shadow-2xl overflow-hidden select-none"
    >
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full select-none" style={{ touchAction: 'none' }}>
        {ranksLayout.map((rank, rankIdx) =>
          filesLayout.map((file, fileIdx) => {
            const sq = `${file}${rank}` as Square;
            const isLight = (rankIdx + fileIdx) % 2 === 0;
            const piece = chess.get(sq);

            const isSelected = selectedSquare === sq;
            const isLegalDestination = legalSquaresMap.has(sq);
            const isCapture = isLegalDestination && (piece !== null || chess.get(sq) !== null);

            const isLastMoveFrom = lastMove?.from === sq;
            const isLastMoveTo = lastMove?.to === sq;

            const isCheckSquare = kingInCheckSquare === sq;
            const isCheckmatedKing = winningKingSquare !== null && kingInCheckSquare === sq;
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

            return (
              <BoardSquare
                key={sq}
                sq={sq}
                piece={piece}
                isLight={isLight}
                isSelected={isSelected}
                isLegalDestination={isLegalDestination}
                isCapture={isCapture}
                isLastMoveFrom={isLastMoveFrom}
                isLastMoveTo={isLastMoveTo}
                isCheckSquare={isCheckSquare}
                isCheckmatedKing={isCheckmatedKing}
                isWinningKing={isWinningKing}
                classificationOnSquare={classificationOnSquare}
                customHighlight={customHighlight}
                moveHighlightOverlayColor={moveHighlightOverlayColor}
                showRank={showRank}
                showFile={showFile}
                rank={rank}
                file={file}
                pieceTheme={pieceTheme}
                blindfold={blindfold}
                isFastForward={isFastForward}
                moveDelta={moveDelta}
                wasDraggedLast={wasDraggedRef.current}
                isPieceBeingDragged={isPieceBeingDragged}
                bgSquareColor={bgSquareColor}
                onSquareClick={handleSquareClick}
                onPointerDownSquare={handlePointerDown}
                onMouseDownSquare={handleMouseDown}
                onMouseUpSquare={handleMouseUp}
              />
            );
          })
        )}
      </div>

      {/* Hardware-accelerated floating piece element during active drag */}
      {activeDrag && (
        <div
          ref={floatingPieceRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: `translate3d(${dragCoordsRef.current.x}px, ${dragCoordsRef.current.y}px, 0) translate(-50%, -50%)`,
            willChange: 'transform',
            pointerEvents: 'none',
            zIndex: 99999,
            width: boardRef.current ? boardRef.current.clientWidth / 8 : 56,
            height: boardRef.current ? boardRef.current.clientHeight / 8 : 56,
          }}
          className="flex items-center justify-center scale-110 drop-shadow-2xl select-none"
        >
          <PieceIcon type={activeDrag.type} color={activeDrag.color} theme={pieceTheme} />
        </div>
      )}

      {/* SVG Arrow Annotations Overlay */}
      {arrowsToRender.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          viewBox="0 0 100 100"
        >
          {arrowsToRender.map((arrow, idx) => {
            const start = getSquareCenterPercent(arrow.from);
            const end = getSquareCenterPercent(arrow.to);
            if (!start || !end) return null;

            const arrowColor = arrow.color || '#81b64c';

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
                    if (onMove) {
                      onMove(pendingPromotion.from, pendingPromotion.to, pType);
                    }
                    setPendingPromotion(null);
                  }}
                  className="w-14 h-14 rounded-xl bg-[#322f2b] hover:bg-[#81b64c] transition-all flex items-center justify-center p-2 cursor-pointer shadow"
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
