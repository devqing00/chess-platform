'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PieceIcon } from './PieceIcons';
import { ClassificationBadge } from './ClassificationBadge';
import {
  BoardTheme,
  PieceTheme,
  PieceColor,
  MoveClassification,
  ArrowAnnotation,
  Premove,
} from '@/types/chess';
import { Crown } from 'lucide-react';

interface ChessBoardProps {
  chess: Chess;
  orientation?: PieceColor;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
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

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation = 'w',
  boardTheme = 'green',
  pieceTheme = 'neo',
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
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Drag-and-Drop state
  const [draggedPiece, setDraggedPiece] = useState<{
    square: Square;
    type: string;
    color: string;
    x: number;
    y: number;
  } | null>(null);

  // Right-click drag arrow drawing state
  const [arrowDragStart, setArrowDragStart] = useState<Square | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const colors = THEME_COLORS[boardTheme] || THEME_COLORS.green;

  // Board layout depending on player perspective
  const ranksLayout = useMemo(() => {
    return orientation === 'w' ? RANKS : [...RANKS].reverse();
  }, [orientation]);

  const filesLayout = useMemo(() => {
    return orientation === 'w' ? FILES : [...FILES].reverse();
  }, [orientation]);

  // Compute legal moves for selected/dragged square
  const activeOriginSquare = draggedPiece ? draggedPiece.square : selectedSquare;
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

  // Find Winning King on checkmate (Image 1)
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

  // Execute Move
  const executeMove = useCallback(
    (from: Square, to: Square) => {
      const piece = chess.get(from);
      // Check for pawn promotion
      if (piece?.type === 'p' && (to.endsWith('8') || to.endsWith('1'))) {
        setPendingPromotion({ from, to });
        return;
      }

      if (onMove) {
        onMove(from, to);
      }
      setSelectedSquare(null);
      setDraggedPiece(null);
    },
    [chess, onMove]
  );

  // Handle Square Click
  const handleSquareClick = (sq: Square) => {
    if (disabled) return;

    if (onCustomSquareClick) {
      const handled = onCustomSquareClick(sq);
      if (handled) return;
    }

    if (selectedSquare) {
      if (selectedSquare === sq) {
        // Deselect
        setSelectedSquare(null);
        return;
      }

      const legalMove = legalSquaresMap.get(sq);
      if (legalMove) {
        executeMove(selectedSquare, sq);
        return;
      }
    }

    // Select piece on clicked square
    const piece = chess.get(sq);
    if (piece) {
      if (piece.color === chess.turn()) {
        setSelectedSquare(sq);
      } else if (onPremove) {
        // Opponent piece selected -> prep premove
        setSelectedSquare(sq);
      }
    } else {
      setSelectedSquare(null);
    }
  };

  // Drag and Drop: Pointer Down
  const handlePointerDown = (e: React.PointerEvent, sq: Square) => {
    if (disabled || e.button !== 0) return; // Only primary left-click
    const piece = chess.get(sq);
    if (!piece) return;

    // Set dragged piece
    setDraggedPiece({
      square: sq,
      type: piece.type,
      color: piece.color,
      x: e.clientX,
      y: e.clientY,
    });
    setSelectedSquare(sq);
  };

  // Compute hovered square during drag
  const hoveredDropSquare = useMemo<Square | null>(() => {
    if (!draggedPiece || !boardRef.current) return null;
    const rect = boardRef.current.getBoundingClientRect();
    const x = draggedPiece.x - rect.left;
    const y = draggedPiece.y - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      const squareWidth = rect.width / 8;
      const squareHeight = rect.height / 8;
      const fileIndex = Math.floor(x / squareWidth);
      const rankIndex = Math.floor(y / squareHeight);
      if (fileIndex >= 0 && fileIndex < 8 && rankIndex >= 0 && rankIndex < 8) {
        return `${filesLayout[fileIndex]}${ranksLayout[rankIndex]}` as Square;
      }
    }
    return null;
  }, [draggedPiece, filesLayout, ranksLayout]);

  // Window-level pointer listeners for drag-and-drop to never lose piece on fast movements
  useEffect(() => {
    if (!draggedPiece) return;

    const onGlobalPointerMove = (e: PointerEvent) => {
      setDraggedPiece((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
    };

    const onGlobalPointerUp = (e: PointerEvent) => {
      if (!boardRef.current) {
        setDraggedPiece(null);
        return;
      }

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

          if (targetSquare !== draggedPiece.square) {
            const legalMove = legalSquaresMap.get(targetSquare);
            if (legalMove) {
              executeMove(draggedPiece.square, targetSquare);
              setDraggedPiece(null);
              return;
            }
          }
        }
      }

      setDraggedPiece(null);
    };

    window.addEventListener('pointermove', onGlobalPointerMove);
    window.addEventListener('pointerup', onGlobalPointerUp);

    return () => {
      window.removeEventListener('pointermove', onGlobalPointerMove);
      window.removeEventListener('pointerup', onGlobalPointerUp);
    };
  }, [draggedPiece, filesLayout, ranksLayout, legalSquaresMap, executeMove]);

  // Drag and Drop: Board Pointer Move (backup)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggedPiece) return;
    setDraggedPiece((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
  };

  // Right-Click Arrow Drawing (Screenshot 5)
  const handleMouseDown = (e: React.MouseEvent, sq: Square) => {
    if (e.button === 2) {
      e.preventDefault();
      setArrowDragStart(sq);
    }
  };

  const handleMouseUp = (e: React.MouseEvent, sq: Square) => {
    if (e.button === 2) {
      e.preventDefault();
      if (arrowDragStart) {
        if (arrowDragStart === sq) {
          if (onClearCustomArrows) onClearCustomArrows();
        } else {
          if (onAddCustomArrow) {
            onAddCustomArrow({ from: arrowDragStart, to: sq, color: '#f59e0b' });
          }
        }
        setArrowDragStart(null);
      }
    }
  };

  // Arrow Coordinates Calculator
  const getSquareCenterPercent = (sq: Square) => {
    const file = sq[0];
    const rank = sq[1];
    const fileIdx = filesLayout.indexOf(file);
    const rankIdx = ranksLayout.indexOf(rank);
    return {
      x: (fileIdx + 0.5) * 12.5,
      y: (rankIdx + 0.5) * 12.5,
    };
  };

  const arrowsToRender = useMemo(() => {
    const list: ArrowAnnotation[] = [...customArrows];
    if (bestMoveArrow) {
      list.push({ from: bestMoveArrow.from, to: bestMoveArrow.to, color: '#81b64c' });
    }
    return list;
  }, [customArrows, bestMoveArrow]);

  return (
    <div
      ref={boardRef}
      onContextMenu={(e) => e.preventDefault()}
      onPointerMove={handlePointerMove}
      className="relative w-full aspect-square select-none rounded-xl overflow-hidden shadow-2xl border-4 border-[#272522] touch-none"
    >
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {ranksLayout.map((rank, rankIdx) =>
          filesLayout.map((file, fileIdx) => {
            const sq = `${file}${rank}` as Square;
            const isLight = (fileIdx + rankIdx) % 2 === 0;
            const piece = chess.get(sq);

            // Square highlights
            const isSelected = selectedSquare === sq;
            const isLastMoveFrom = lastMove?.from === sq;
            const isLastMoveTo = lastMove?.to === sq;
            const isCheckSquare = kingInCheckSquare === sq;
            const isWinningKing = winningKingSquare === sq;
            const isLegalDestination = legalSquaresMap.has(sq);
            const isCapture = isLegalDestination && (Boolean(piece) || sq === chess.fen().split(' ')[3]);

            // Classification badge on destination square (from Game Review!)
            const classificationOnSquare =
              activeClassification && activeClassification.square === sq
                ? activeClassification.classification
                : null;

            // Highlight color blending (Chess.com palette)
            let squareHighlightStyle = '';
            if (classificationOnSquare === 'brilliant') {
              squareHighlightStyle = '!bg-[#1baca6]/50';
            } else if (classificationOnSquare === 'great') {
              squareHighlightStyle = '!bg-[#5c8bb0]/50';
            } else if (classificationOnSquare === 'best') {
              squareHighlightStyle = '!bg-[#81b64c]/50';
            } else if (classificationOnSquare === 'blunder') {
              squareHighlightStyle = '!bg-[#ef4444]/50';
            } else if (isSelected) {
              squareHighlightStyle = '!bg-[#f7f769]/85 shadow-inner';
            } else if (isLastMoveFrom || isLastMoveTo) {
              squareHighlightStyle = '!bg-[#baca44]/65';
            }

            const bgSquareColor = isLight ? colors.light : colors.dark;

            // Coordinate labels (Matches Screenshot 1 & 3)
            const showRank = fileIdx === 0;
            const showFile = rankIdx === 7;

            const customHighlight = customSquareHighlights.find((h) => h.square === sq);
            const isPieceBeingDragged = draggedPiece && draggedPiece.square === sq;
            const isHoveredLegalDrop = hoveredDropSquare === sq && isLegalDestination;

            return (
              <div
                key={sq}
                role="gridcell"
                tabIndex={0}
                onClick={() => handleSquareClick(sq)}
                onPointerDown={(e) => handlePointerDown(e, sq)}
                onMouseDown={(e) => handleMouseDown(e, sq)}
                onMouseUp={(e) => handleMouseUp(e, sq)}
                style={{ backgroundColor: bgSquareColor }}
                className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors focus:outline-none ${squareHighlightStyle} ${
                  isHoveredLegalDrop ? 'ring-4 ring-[#81b64c] ring-inset !bg-[#81b64c]/30' : ''
                }`}
              >
                {/* Custom Highlights (Variants / Blunder Heatmap) */}
                {customHighlight && (
                  <div
                    className={`absolute inset-0 pointer-events-none z-10 ${customHighlight.border || ''}`}
                    style={{ backgroundColor: customHighlight.color }}
                  >
                    {customHighlight.label && (
                      <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white/90 drop-shadow">
                        {customHighlight.label}
                      </div>
                    )}
                  </div>
                )}

                {/* King in Check Red Glow & Badge (Image 1 & 2) */}
                {isCheckSquare && (
                  <>
                    <div className="absolute inset-0 bg-red-600/70 rounded-full blur-[3px] animate-pulse pointer-events-none" />
                    <div className="absolute top-1 right-1 z-30 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[10px] font-black shadow-lg border border-red-300 pointer-events-none animate-bounce">
                      +
                    </div>
                  </>
                )}

                {/* Winning King Crown Badge (Screenshot 1) */}
                {isWinningKing && (
                  <div className="absolute top-1 right-1 z-30 w-6 h-6 rounded-full bg-[#81b64c] text-white flex items-center justify-center shadow-lg border border-white pointer-events-none animate-bounce">
                    <Crown className="w-3.5 h-3.5 text-white fill-current" />
                  </div>
                )}

                {/* Classification Badge Pinned to Square (Screenshot 1, 3, 4) */}
                {classificationOnSquare && (
                  <div className="absolute top-0.5 right-0.5 z-30 pointer-events-none animate-in zoom-in-75 duration-200">
                    <ClassificationBadge classification={classificationOnSquare} size="md" />
                  </div>
                )}

                {/* Coordinate Labels: Rank top-left, File bottom-right */}
                {showRank && (
                  <span
                    className={`absolute top-0.5 left-1 text-[11px] font-black leading-none select-none ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {showFile && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[11px] font-black leading-none select-none ${
                      isLight ? 'text-[#769656]' : 'text-[#eeeed2]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Piece Rendering */}
                {piece && !blindfold && (
                  <div
                    className={`w-[86%] h-[86%] flex items-center justify-center z-10 transition-transform ${
                      isPieceBeingDragged ? 'opacity-30 scale-95' : 'hover:scale-105 active:scale-95'
                    }`}
                  >
                    <PieceIcon type={piece.type} color={piece.color} theme={pieceTheme} />
                  </div>
                )}

                {/* Legal Move Indicators (Quiet moves vs Captures) */}
                {isLegalDestination && !isCapture && (
                  <div className="absolute z-20 w-4 h-4 rounded-full bg-black/20 dark:bg-white/30 pointer-events-none shadow-sm" />
                )}
                {isLegalDestination && isCapture && (
                  <div className="absolute inset-0 z-20 border-[6px] border-black/20 dark:border-white/30 rounded-full pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Dragged Piece Following Cursor */}
      {draggedPiece && (
        <div
          style={{
            position: 'fixed',
            left: draggedPiece.x,
            top: draggedPiece.y,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 9999,
            width: boardRef.current ? boardRef.current.clientWidth / 8 : 64,
            height: boardRef.current ? boardRef.current.clientHeight / 8 : 64,
          }}
          className="flex items-center justify-center scale-110 drop-shadow-2xl animate-in zoom-in-95 duration-75"
        >
          <PieceIcon type={draggedPiece.type as any} color={draggedPiece.color as any} theme={pieceTheme} />
        </div>
      )}

      {/* SVG Arrow Annotations Overlay (Screenshot 5) */}
      {arrowsToRender.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          viewBox="0 0 100 100"
        >
          <defs>
            <marker
              id="arrowhead-orange"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#f59e0b" opacity="0.9" />
            </marker>
            <marker
              id="arrowhead-green"
              markerWidth="6"
              markerHeight="6"
              refX="3"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 6 3, 0 6" fill="#81b64c" opacity="0.9" />
            </marker>
          </defs>
          {arrowsToRender.map((arrow, idx) => {
            const start = getSquareCenterPercent(arrow.from);
            const end = getSquareCenterPercent(arrow.to);
            const isOrange = arrow.color === '#f59e0b';

            return (
              <line
                key={idx}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={arrow.color || '#f59e0b'}
                strokeWidth="3.2"
                strokeLinecap="round"
                opacity="0.85"
                markerEnd={isOrange ? 'url(#arrowhead-orange)' : 'url(#arrowhead-green)'}
              />
            );
          })}
        </svg>
      )}

      {/* Pawn Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-40 flex items-center justify-center animate-in fade-in">
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
};
