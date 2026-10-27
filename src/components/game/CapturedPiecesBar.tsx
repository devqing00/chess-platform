'use client';

import React from 'react';
import { PieceType, PieceColor } from '@/types/chess';
import { PieceIcon } from '@/components/board/PieceIcons';

interface CapturedPiecesBarProps {
  capturedPieces: PieceType[];
  capturedColor: PieceColor; // color of the pieces that were captured
  materialAdvantage?: number;
  className?: string;
}

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const PIECE_ORDER: PieceType[] = ['p', 'n', 'b', 'r', 'q'];

export const CapturedPiecesBar: React.FC<CapturedPiecesBarProps> = React.memo(
  function CapturedPiecesBar({
    capturedPieces = [],
    capturedColor,
    materialAdvantage = 0,
    className = '',
  }) {
    if (!capturedPieces.length && materialAdvantage <= 0) {
      return <div className="h-3.5" />; // Keep height stable so layout never shifts
    }

    // Group counts
    const counts: Partial<Record<PieceType, number>> = {};
    capturedPieces.forEach((t) => {
      counts[t] = (counts[t] || 0) + 1;
    });

    return (
      <div
        className={`h-3.5 max-h-[14px] flex items-center gap-1 overflow-hidden select-none leading-none ${className}`}
        title="Captured pieces & material lead"
      >
        <div className="flex items-center gap-0.5 min-w-0">
          {PIECE_ORDER.map((type) => {
            const count = counts[type];
            if (!count) return null;
            return (
              <span
                key={type}
                className="inline-flex items-center font-mono text-[11px] text-zinc-300 font-bold"
              >
                <span>{PIECE_SYMBOLS[capturedColor][type]}</span>
                {count > 1 && (
                  <sup className="text-[8px] font-black text-zinc-400 ml-0.5">
                    {count}
                  </sup>
                )}
              </span>
            );
          })}
        </div>

        {materialAdvantage > 0 && (
          <span className="text-[9px] font-black text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1 rounded-sm ml-0.5 leading-tight">
            +{materialAdvantage}
          </span>
        )}
      </div>
    );
  }
);

export function calculateCapturesAndAdvantage(chess: any) {
  const STARTING_COUNTS: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
    b: { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 },
  };
  const PIECE_VALUES: Record<PieceType, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9, k: 0,
  };

  const currentCounts: Record<PieceColor, Record<PieceType, number>> = {
    w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
  };

  try {
    const board = chess.board();
    board.forEach((row: any[]) => {
      row.forEach((piece: any) => {
        if (piece) {
          currentCounts[piece.color as PieceColor][piece.type as PieceType]++;
        }
      });
    });
  } catch {
    // fallback if chess is not ready
  }

  const whiteCaptured: PieceType[] = [];
  const blackCaptured: PieceType[] = [];

  let whiteMaterial = 0;
  let blackMaterial = 0;

  PIECE_ORDER.forEach((type) => {
    const wDiff = Math.max(0, STARTING_COUNTS.b[type] - currentCounts.b[type]);
    for (let i = 0; i < wDiff; i++) whiteCaptured.push(type);

    const bDiff = Math.max(0, STARTING_COUNTS.w[type] - currentCounts.w[type]);
    for (let i = 0; i < bDiff; i++) blackCaptured.push(type);

    whiteMaterial += currentCounts.w[type] * PIECE_VALUES[type];
    blackMaterial += currentCounts.b[type] * PIECE_VALUES[type];
  });

  return {
    whiteCaptured,
    blackCaptured,
    whiteAdvantage: Math.max(0, whiteMaterial - blackMaterial),
    blackAdvantage: Math.max(0, blackMaterial - whiteMaterial),
  };
}

