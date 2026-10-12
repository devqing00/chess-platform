'use client';

import React, { useState, useMemo } from 'react';
import { Chess, Square, PieceSymbol, Move } from 'chess.js';
import { PieceIcon } from './PieceIcons';
import { BoardTheme, PieceTheme, PieceColor } from '@/types/chess';

interface ChessBoardProps {
  chess: Chess;
  orientation?: PieceColor;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
  onMove?: (from: Square, to: Square, promotion?: PieceSymbol) => void;
  lastMove?: { from: Square; to: Square } | null;
  bestMoveArrow?: { from: Square; to: Square } | null;
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
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  chess,
  orientation = 'w',
  boardTheme = 'green',
  pieceTheme = 'neo',
  onMove,
  lastMove = null,
  bestMoveArrow = null,
  disabled = false,
  blindfold = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);

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

  const handleSquareClick = (sq: Square) => {
    if (disabled) return;

    // Check if selecting a destination for pending move
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

    // Select new piece if it belongs to current player
    const piece = chess.get(sq);
    if (piece && piece.color === chess.turn()) {
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

  return (
    <div className="relative aspect-square w-full max-w-[620px] rounded-lg shadow-2xl overflow-hidden select-none border-4 border-[#272522]">
      {/* 8x8 Board Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
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

            // Coordinates labels (Chess.com shows rank on leftmost file, file on bottom rank)
            const showRank = fileIdx === 0;
            const showFile = rankIdx === 7;

            const bgSquareColor = isLight ? colors.light : colors.dark;

            return (
              <div
                key={sq}
                onClick={() => handleSquareClick(sq)}
                style={{ backgroundColor: bgSquareColor }}
                className={`relative w-full h-full flex items-center justify-center cursor-pointer transition-colors ${
                  isSelected ? '!bg-[#f7f769]' : ''
                } ${
                  isLastMoveFrom || isLastMoveTo ? '!bg-[#f5f682]/75' : ''
                }`}
              >
                {/* Check alert radial highlight */}
                {isCheckSquare && (
                  <div className="absolute inset-0 bg-red-600/70 rounded-full blur-[2px] animate-pulse" />
                )}

                {/* Coordinate labels */}
                {showRank && (
                  <span
                    className={`absolute top-1 left-1.5 text-[11px] font-bold select-none ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {rank}
                  </span>
                )}
                {showFile && (
                  <span
                    className={`absolute bottom-1 right-1.5 text-[11px] font-bold select-none ${
                      isLight ? 'text-[#779556]' : 'text-[#ebecd0]'
                    }`}
                  >
                    {file}
                  </span>
                )}

                {/* Piece Icon */}
                {piece && !blindfold && (
                  <div className="w-[84%] h-[84%] flex items-center justify-center z-10 transition-transform active:scale-95 pointer-events-none">
                    <PieceIcon
                      type={piece.type}
                      color={piece.color}
                      theme={pieceTheme}
                    />
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

      {/* Pawn Promotion Modal */}
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
