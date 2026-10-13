'use client';

import React from 'react';

interface EvalBarProps {
  score: number; // Centipawns from White's perspective (+100 = 1 pawn advantage)
  orientation?: 'w' | 'b';
  isGameOver?: boolean;
}

export const EvalBar: React.FC<EvalBarProps> = ({
  score,
  orientation = 'w',
  isGameOver = false,
}) => {
  // Convert centipawns to percentage (sigmoid clamp between 3% and 97%)
  // Chess.com standard formula: win_prob = 1 / (1 + 10^(-score / 400))
  const winProb = 1 / (1 + Math.pow(10, -score / 400));
  const whitePercent = Math.min(97, Math.max(3, winProb * 100));
  
  // Height for White's portion of the bar
  const heightPercent = orientation === 'w' ? whitePercent : 100 - whitePercent;

  // Format label
  let label = '0.0';
  if (Math.abs(score) >= 20000) {
    label = score > 0 ? '+M' : '-M';
  } else {
    const val = (Math.abs(score) / 100).toFixed(1);
    label = score === 0 ? '0.0' : score > 0 ? `+${val}` : `-${val}`;
  }

  const isWhiteWinning = score >= 0;

  return (
    <div className="relative flex flex-col w-6 sm:w-7 h-full bg-[#21201d] rounded-sm overflow-hidden select-none border border-[#302e2b] shadow-inner shrink-0">
      {/* Black evaluation section (top if White is on bottom) */}
      <div
        className="w-full bg-[#1b1917] transition-all duration-300 ease-out flex items-start justify-center pt-1.5"
        style={{ height: `${100 - heightPercent}%` }}
      >
        {!isWhiteWinning && (
          <span className="text-[10px] font-bold text-zinc-300 tracking-tighter">
            {label}
          </span>
        )}
      </div>

      {/* White evaluation section (bottom if White is on bottom) */}
      <div
        className="w-full bg-[#ffffff] transition-all duration-300 ease-out flex items-end justify-center pb-1.5 shadow-sm"
        style={{ height: `${heightPercent}%` }}
      >
        {isWhiteWinning && (
          <span className="text-[10px] font-bold text-zinc-900 tracking-tighter">
            {label}
          </span>
        )}
      </div>

      {/* Center 0.0 marker */}
      <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-zinc-500/30 z-10" />
    </div>
  );
};
