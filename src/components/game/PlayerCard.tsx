'use client';

import React from 'react';
import { GamePlayer, PieceType, PieceColor } from '@/types/chess';
import { PieceIcon } from '../board/PieceIcons';

interface PlayerCardProps {
  player: GamePlayer;
  color: PieceColor;
  timeRemainingSeconds: number;
  isActiveTurn: boolean;
  capturedPieces: PieceType[];
  materialAdvantage: number; // positive if this player has more material
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  color,
  timeRemainingSeconds,
  isActiveTurn,
  capturedPieces,
  materialAdvantage,
}) => {
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = timeRemainingSeconds % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isLowTime = timeRemainingSeconds <= 20 && timeRemainingSeconds > 0;
  const isTimeZero = timeRemainingSeconds === 0;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#21201d] rounded-lg border border-[#302e2b] select-none">
      {/* Player Profile & Captures */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-[#2d2a26] border border-[#403c37] flex items-center justify-center text-xl shadow">
            {player.avatar || (color === 'w' ? '⚪' : '⚫')}
          </div>
          {player.title && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-[#e6912c] text-black px-1 rounded shadow-sm">
              {player.title}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white tracking-tight">
              {player.name}
            </span>
            <span className="text-xs text-zinc-400 font-mono">({player.rating})</span>
          </div>

          {/* Captured Pieces & Material Differential */}
          <div className="flex items-center gap-1 mt-0.5 min-h-[16px]">
            <div className="flex -space-x-1.5 items-center">
              {capturedPieces.slice(0, 8).map((pieceType, idx) => (
                <div key={idx} className="w-3.5 h-3.5">
                  <PieceIcon
                    type={pieceType}
                    color={color === 'w' ? 'b' : 'w'}
                    className="w-full h-full opacity-80"
                  />
                </div>
              ))}
            </div>
            {materialAdvantage > 0 && (
              <span className="text-[10px] font-bold text-zinc-300 ml-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Digital Chess Clock */}
      <div
        className={`px-3 py-1.5 rounded font-mono font-bold text-lg tracking-tight min-w-[72px] text-center border transition-all ${
          isTimeZero
            ? 'bg-red-950/80 text-red-400 border-red-600 animate-pulse'
            : isLowTime && isActiveTurn
            ? 'bg-red-900/60 text-red-300 border-red-500 animate-pulse'
            : isActiveTurn
            ? 'bg-[#ffffff] text-zinc-950 border-white shadow-md font-extrabold'
            : 'bg-[#161512] text-zinc-300 border-[#33312c]'
        }`}
      >
        {formattedTime}
      </div>
    </div>
  );
};
