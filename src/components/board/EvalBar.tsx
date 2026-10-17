'use client';

import React from 'react';

interface EvalBarProps {
  score: number; // Centipawns from White's perspective (+100 = 1 pawn advantage)
  orientation?: 'w' | 'b';
  isGameOver?: boolean;
  mateIn?: number;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  orientation = 'w',
  isGameOver = false,
  mateIn,
}) => {
  // Determine top and bottom colors based on board orientation
  // When orientation === 'w': Top is Black (rank 8), Bottom is White (rank 1)
  // When orientation === 'b': Top is White (rank 1), Bottom is Black (rank 8)
  const isWhiteOnBottom = orientation === 'w';

  // Format label and calculate win probability
  let label = '0.0';
  let effectiveWinProb: number;

  if (mateIn !== undefined && mateIn !== 0) {
    const isWhiteMating = mateIn > 0;
    label = isWhiteMating ? `M${mateIn}` : `-M${Math.abs(mateIn)}`;
    effectiveWinProb = isWhiteMating ? 0.98 : 0.02;
  } else if (Math.abs(score) >= 9000) {
    // Encoded mate (e.g. 10000 or 20000)
    const isWhiteMating = score > 0;
    const mateDistance = Math.max(1, Math.min(10, Math.round((20000 - Math.abs(score)) / 2)));
    label = isWhiteMating ? `M${mateDistance}` : `-M${mateDistance}`;
    effectiveWinProb = isWhiteMating ? 0.98 : 0.02;
  } else {
    // Chess.com standard sigmoid curve
    effectiveWinProb = 1 / (1 + Math.pow(10, -score / 400));
    const val = (Math.abs(score) / 100).toFixed(1);
    label = score === 0 ? '0.0' : score > 0 ? `+${val}` : `-${val}`;
  }

  const whitePercent = Math.min(97, Math.max(3, effectiveWinProb * 100));
  const topHeight = isWhiteOnBottom ? 100 - whitePercent : whitePercent;
  const bottomHeight = isWhiteOnBottom ? whitePercent : 100 - whitePercent;

  // Which side is ahead
  const isWhiteAhead = (mateIn !== undefined && mateIn > 0) || score > 0;
  const isBlackAhead = (mateIn !== undefined && mateIn < 0) || score < 0;

  return (
    <div className="relative flex flex-col w-6 sm:w-7 h-full bg-[#21201d] rounded-xl overflow-hidden select-none border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] shrink-0">
      {/* Top section */}
      <div
        className={`w-full transition-all duration-300 ease-out flex items-start justify-center pt-1.5 ${
          isWhiteOnBottom ? 'bg-[#1b1917]' : 'bg-[#ffffff]'
        }`}
        style={{ height: `${topHeight}%` }}
      >
        {isWhiteOnBottom
          ? isBlackAhead && (
              <span className="text-[10px] font-bold text-zinc-300 tracking-tighter">
                {label}
              </span>
            )
          : isWhiteAhead && (
              <span className="text-[10px] font-bold text-zinc-900 tracking-tighter">
                {label}
              </span>
            )}
      </div>

      {/* Bottom section */}
      <div
        className={`w-full transition-all duration-300 ease-out flex items-end justify-center pb-1.5 shadow-sm ${
          isWhiteOnBottom ? 'bg-[#ffffff]' : 'bg-[#1b1917]'
        }`}
        style={{ height: `${bottomHeight}%` }}
      >
        {isWhiteOnBottom
          ? isWhiteAhead && (
              <span className="text-[10px] font-bold text-zinc-900 tracking-tighter">
                {label}
              </span>
            )
          : isBlackAhead && (
              <span className="text-[10px] font-bold text-zinc-300 tracking-tighter">
                {label}
              </span>
            )}
      </div>

      {/* Center 0.0 marker */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-500/30 z-10" />
    </div>
  );
};
