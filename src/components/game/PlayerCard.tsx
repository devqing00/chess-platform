'use client';

import React from 'react';
import { GamePlayer, PieceType, PieceColor } from '@/types/chess';
import { PieceIcon } from '../board/PieceIcons';
import { Clock } from 'lucide-react';

interface PlayerCardProps {
  player: GamePlayer;
  color: PieceColor;
  timeRemainingSeconds: number;
  isActiveTurn: boolean;
  capturedPieces?: PieceType[];
  materialAdvantage?: number; // positive if this player has more material
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  color,
  timeRemainingSeconds,
  isActiveTurn,
  capturedPieces = [],
  materialAdvantage = 0,
}) => {
  const minutes = Math.floor(timeRemainingSeconds / 60);
  const seconds = Math.floor(timeRemainingSeconds % 60);
  const ms = Math.floor((timeRemainingSeconds % 1) * 10);

  const formattedTime =
    timeRemainingSeconds < 20 && timeRemainingSeconds > 0
      ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${ms}`
      : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isLowTime = timeRemainingSeconds <= 20 && timeRemainingSeconds > 0;
  const isTimeZero = timeRemainingSeconds === 0;

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#21201d] rounded-xl border border-[#302e2b] select-none shadow-sm">
      {/* Player Profile & Captures */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#2d2a26] border border-[#403c37] overflow-hidden flex items-center justify-center text-xl shadow">
            {player.avatar && player.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span>{player.avatar || (color === 'w' ? '⚪' : '⚫')}</span>
            )}
          </div>
          {player.title && (
            <span className="absolute -top-1.5 -right-1.5 text-[9px] font-black bg-[#e6912c] text-black px-1 rounded shadow-sm">
              {player.title}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-white truncate tracking-tight">
              {player.name}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono">({player.rating})</span>
            {player.country && (
              <span className="text-xs shrink-0" title={player.country}>
                {player.country === 'US'
                  ? '🇺🇸'
                  : player.country === 'DE'
                  ? '🇩🇪'
                  : player.country === 'AR'
                  ? '🇦🇷'
                  : '🌍'}
              </span>
            )}
          </div>

          {/* Captured Pieces & Material Differential (Matches Screenshot 1) */}
          <div className="flex items-center gap-1 mt-0.5 min-h-[16px]">
            <div className="flex -space-x-1.5 items-center">
              {capturedPieces.slice(0, 10).map((pieceType, idx) => (
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
              <span className="text-[10px] font-black text-zinc-300 ml-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Digital Chess Clock (Screenshot 1: White pill when active turn, dark when inactive) */}
      <div
        className={`px-3 py-1.5 rounded-lg font-mono font-black text-base tracking-tight min-w-[76px] flex items-center justify-center gap-1.5 border transition-all ${
          isTimeZero
            ? 'bg-red-950/90 text-red-400 border-red-600 animate-pulse'
            : isLowTime && isActiveTurn
            ? 'bg-red-900/80 text-red-200 border-red-500 animate-pulse shadow-lg shadow-red-500/20'
            : isActiveTurn
            ? 'bg-[#ffffff] text-zinc-950 border-white shadow-md font-black'
            : 'bg-[#141311] text-zinc-300 border-[#2b2926]'
        }`}
      >
        <Clock className={`w-3.5 h-3.5 ${isActiveTurn ? 'text-zinc-900' : 'text-zinc-500'}`} />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
