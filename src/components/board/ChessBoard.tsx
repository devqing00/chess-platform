'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  onAddCustomArrow?: (arrow: ArrowAnnotation) => void;
  onClearCustomArrows?: () => void;
  disabled?: boolean;
  blindfold?: boolean;
}

const THEME_COLORS: Record<BoardTheme, { light: string; dark: string; border: string }> = {
  green: { light: '#ebecd0', dark: '#779556', border: '#272522' },
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
  onAddCustomArrow,
  onClearCustomArrows,
  disabled = false,
  blindfold = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

  // Right-click drag arrow drawing state
  const [arrowDragStart, setArrowDragStart] = useState<Square | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const colors = THEME_COLORS[boardTheme] || THEME_COLORS.green;

  // Board squares layout depending on orientation
  const ranksLayout = useMemo(() => {
    return orientation === 'w' ? RANKS : [...RANKS].reverse();
  }, [orientation]);

  const filesLayout = useMemo(() => {
    return orientation === 'w' ? FILES : [...FILES].reverse();
  }, [orientation]);

  // Compute legal moves for selected square
  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || disabled) return [];
    try {
      return chess.moves({ square: selectedSquare, verbose: true });
    } catch {
      return [];
    }
  }, [chess, selectedSquare, disabled]);

  const legalSquaresMap = useMemo(() => {
    const map = new Map<Square, Move>();
    legalMovesForSelected.forEach((m) => {
      map.set(m.to as Square, m);
    });
    return map;
  }, [legalMovesForSelected]);

  // Find King square if currently in check
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

  // Handle left click on a square
  const handleSquareClick = (sq: Square) => {
    if (disabled) return;

    // Check if selecting destination for pending move
    if (selectedSquare) {
      const legalMove = legalSquaresMap.get(sq);
      if (legalMove) {
        // Check for pawn promotion
        const piece = chess.get(selectedSquare);
        if (piece?.type === 'p' && (sq.endsWith('8') || sq.endsWith('1'))) {
          setPendingPromotion({ from: selectedSquare, to: sq });
          return;
        }

        onMove?.(selectedSquare, sq);
        setSelectedSquare(null);
        return;
      }
    }

    // Premove logic when it's not our turn
    const currentTurn = chess.turn();
    const piece = chess.get(sq);

    if (piece && piece.color === currentTurn) {
      setSelectedSquare(sq);
    } else if (piece && piece.color !== currentTurn && onPremove) {
      // selecting piece for premove
      setSelectedSquare(sq);
    } else {
      setSelectedSquare(null);
    }
  };

  const handlePromotionSelect = (promotionPiece: PieceSymbol) => {
    if (pendingPromotion) {
      onMove?.(pendingPromotion.from, pendingPromotion.to, promotionPiece);
      setPendingPromotion(null);
      setSelectedSquare(null);
    }
  };

  // Right-click arrow drag interactions
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleMouseDown = (e: React.MouseEvent, sq: Square) => {
    if (e.button === 2) {
      // Right click down
      e.preventDefault();
      setArrowDragStart(sq);
    } else if (e.button === 0) {
      // Left click clears custom arrows
      onClearCustomArrows?.();
    }
  };

  const handleMouseUp = (e: React.MouseEvent, sq: Square) => {
    if (e.button === 2 && arrowDragStart && arrowDragStart !== sq) {
      e.preventDefault();
      onAddCustomArrow?.({ from: arrowDragStart, to: sq, color: '#81b64c' });
      setArrowDragStart(null);
    } else {
      setArrowDragStart(null);
    }
  };

  // Convert square to pixel percentages (0-100%) for SVG arrow rendering
  const getSquareCenterPercent = (sq: Square) => {
    const file = sq[0];
    const rank = sq[1];
    const colIdx = filesLayout.indexOf(file);
    const rowIdx = ranksLayout.indexOf(rank);
    if (colIdx === -1 || rowIdx === -1) return { x: 0, y: 0 };
    return {
      x: (colIdx + 0.5) * 12.5,
      y: (rowIdx + 0.5) * 12.5,
    };
  };

  // Combined arrows to render
  const arrowsToRender = useMemo(() => {
    const list: ArrowAnnotation[] = [];
    if (bestMoveArrow) {
      list.push({ ...bestMoveArrow, color: '#81b64c' });
    }
    customArrows.forEach((a) => list.push(a));
    return list;
  }, [bestMoveArrow, customArrows]);

  return (
    <div
      ref={boardRef}
      role="grid"
      aria-label="Chessboard"
      tabIndex={0}
      onContextMenu={handleContextMenu}
      className="relative aspect-square w-full max-w-[580px] rounded-lg shadow-2xl overflow-hidden select-none border-4 border-[#272522] focus:outline-none focus:ring-2 focus:ring-[#81b64c]"
    >
      {/* 8x8 Board Grid */}
      <div
        className="w-full h-full"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
          gridTemplateRows: 'repeat(8, minmax(0, 1fr))',
        }}
      >
        {ranksLayout.map((rank, rankIdx) =>
          filesLayout.map((file, fileIdx) => {
            const sq = `${file}${rank}` as Square;
            const isLight = (fileIdx + rankIdx) % 2 === 0;
            const piece = chess.get(sq);

            const isSelected = selectedSquare === sq;
            const isLastMoveFrom = lastMove?.from === sq;
            const isLastMoveTo = lastMove?.to === sq;
            const isCheckSquare = kingInCheckSquare === sq;
            const isLegalDestination = legalSquaresMap.has(sq);
            const isCapture = isLegalDestination && piece !== null;

            // Premove indicator
            const isPremoveFrom = premoves.some((p) => p.from === sq);
            const isPremoveTo = premoves.some((p) => p.to === sq);

            // Classification badge on destination square (from Game Review!)
            const classificationOnSquare =
              activeClassification && activeClassification.square === sq
                ? activeClassification.classification
                : null;

            // Highlight styling
            const isHighlightedSquare =
              classificationOnSquare === 'brilliant'
                ? '!bg-[#1baca6]/40'
                : isLastMoveFrom || isLastMoveTo
                ? '!bg-[#f5f682]/75'
                : isSelected
                ? '!bg-[#f7f769]'
                : isPremoveFrom || isPremoveTo
                ? '!bg-[#06b6d4]/40'
                : '';

            const bgSquareColor = isLight ? colors.light : colors.dark;

            // Labels: rank on leftmost file, file on bottom rank
            const showRank = fileIdx === 0;
            const showFile = rankIdx === 7;

            const pieceAria = piece
              ? `${piece.color === 'w' ? 'White' : 'Black'} ${
                  piece.type === 'p'
                    ? 'pawn'
                    : piece.type === 'n'
                    ? 'knight'
                    : piece.type === 'b'
                    ? 'bishop'
                    : piece.type === 'r'
                    ? 'rook'
                    : piece.type === 'q'
                    ? 'queen'
                    : 'king'
                }`
              : 'Empty square';

            return (
              <div
                key={sq}
                role="gridcell"
                tabIndex={0}
                aria-label={`${sq}: ${pieceAria}`}
                onClick={() => handleSquareClick(sq)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSquareClick(sq);
                  }
                }}
                onMouseDown={(e) => handleMouseDown(e, sq)}
                onMouseUp={(e) => handleMouseUp(e, sq)}
                style={{ backgroundColor: bgSquareColor }}
                className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#81b64c] ${isHighlightedSquare}`}
              >
                {/* King in Check Red Glow & Badge (Image 2) */}
                {isCheckSquare && (
                  <>
                    <div className="absolute inset-0 bg-red-600/75 rounded-full blur-[2px] animate-pulse pointer-events-none" />
                    <div className="absolute top-1 right-1 z-30 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-[11px] font-black shadow-md border border-red-400 pointer-events-none animate-bounce">
                      +
                    </div>
                  </>
                )}

                {/* Move Classification Badge Pinned on Square (Image 1 & 4) */}
                {classificationOnSquare && (
                  <div className="absolute top-1 right-1 z-30 pointer-events-none animate-in zoom-in-75 duration-200">
                    <ClassificationBadge classification={classificationOnSquare} size="md" />
                  </div>
                )}

                {/* Coordinate Labels */}
                {showRank && (
                  <span
                    className={`absolute top-0.5 left-1 text-[11px] font-bold select-none ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {showFile && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[11px] font-bold select-none ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Piece Icon */}
                {piece && !blindfold && (
                  <div className="w-[84%] h-[84%] flex items-center justify-center z-10 transition-transform active:scale-95 pointer-events-none">
                    <PieceIcon type={piece.type} color={piece.color} theme={pieceTheme} />
                  </div>
                )}

                {/* Legal Move Indicators */}
                {isLegalDestination && !isCapture && (
                  <div className="absolute z-20 w-3.5 h-3.5 rounded-full bg-black/25 dark:bg-white/35 pointer-events-none" />
                )}
                {isLegalDestination && isCapture && (
                  <div className="absolute inset-0 z-20 border-[6px] border-black/20 dark:border-white/25 rounded-full pointer-events-none" />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SVG Arrow Annotations Overlay */}
      {arrowsToRender.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-30"
          viewBox="0 0 100 100"
        >
          <defs>
            <marker
              id="arrowhead-green"
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 4 2, 0 4" fill="#81b64c" />
            </marker>
            <marker
              id="arrowhead-cyan"
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 4 2, 0 4" fill="#06b6d4" />
            </marker>
            <marker
              id="arrowhead-red"
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 4 2, 0 4" fill="#ef4444" />
            </marker>
          </defs>
          {arrowsToRender.map((arrow, idx) => {
            const start = getSquareCenterPercent(arrow.from);
            const end = getSquareCenterPercent(arrow.to);
            const markerId =
              arrow.color === '#ef4444'
                ? 'url(#arrowhead-red)'
                : arrow.color === '#06b6d4'
                ? 'url(#arrowhead-cyan)'
                : 'url(#arrowhead-green)';

            return (
              <line
                key={idx}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={arrow.color || '#81b64c'}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.85"
                markerEnd={markerId}
              />
            );
          })}
        </svg>
      )}

      {/* Pawn Promotion Dialog */}
      {pendingPromotion && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#262522] border border-[#3f3d39] rounded-xl p-4 shadow-2xl flex flex-col items-center gap-3">
            <span className="text-sm font-semibold text-zinc-200">Promote Pawn</span>
            <div className="flex gap-2 bg-[#1b1917] p-2 rounded-lg border border-[#33312c]">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((pType) => (
                <button
                  key={pType}
                  onClick={() => handlePromotionSelect(pType)}
                  className="w-14 h-14 p-2 rounded hover:bg-[#383632] transition-colors flex items-center justify-center cursor-pointer"
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
