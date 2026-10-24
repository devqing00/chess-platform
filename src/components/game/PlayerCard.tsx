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
  isThinking?: boolean;
  capturedPieces?: PieceType[];
  materialAdvantage?: number; // positive if this player has more material
}

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(function PlayerCard({
  player,
  color,
  timeRemainingSeconds,
  isActiveTurn,
  isThinking = false,
  capturedPieces = [],
  materialAdvantage = 0,
}) {
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
    <div className="flex items-center justify-between px-2 sm:px-3 py-1 sm:py-1.5 bg-[#211f1c] rounded-xl border border-[#35322b] select-none shadow-sm min-h-[38px] max-h-[42px] w-full">
      {/* Player Profile & Captures */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#282522] border border-[#38342e] shadow-sm overflow-hidden flex items-center justify-center text-sm">
            {player.avatar && player.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span>{player.avatar || (color === 'w' ? '⚪' : '⚫')}</span>
            )}
          </div>
          {player.title && (
            <span className="absolute -top-1 -right-1 text-[8px] font-black bg-[#f59e0b] border border-amber-600 text-black px-1 rounded-full">
              {player.title}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[11px] sm:text-xs font-black text-white truncate tracking-tight">
              {player.name}
            </span>
            <span className="text-[10px] text-zinc-400 font-mono font-bold">({player.rating})</span>
            {isThinking && (
              <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 rounded flex items-center gap-1 animate-pulse shrink-0">
                <span className="w-1 h-1 rounded-full bg-amber-400 animate-ping" />
                Thinking...
              </span>
            )}
            {player.country && (
              <span className="text-[10px] shrink-0" title={player.country}>
                {player.country === 'US'
                  ? '🇺🇸'
                  : player.country === 'DE'
                  ? '🇩🇪'
                  : player.country === 'AR'
                  ? '🇦🇷'
                  : player.country === 'NG'
                  ? '🇳🇬'
                  : '🌍'}
              </span>
            )}
          </div>

          {/* Captured Pieces & Material Differential */}
          <div className="flex items-center gap-1 min-h-[14px]">
            <div className="flex -space-x-1.5 items-center">
              {capturedPieces.slice(0, 10).map((pieceType, idx) => (
                <div key={idx} className="w-3 h-3">
                  <PieceIcon
                    type={pieceType}
                    color={color === 'w' ? 'b' : 'w'}
                    className="w-full h-full opacity-80"
                  />
                </div>
              ))}
            </div>
            {materialAdvantage > 0 && (
              <span className="text-[9px] font-black text-zinc-300 ml-1">
                +{materialAdvantage}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tactile Capsule Chess Clock */}
      <div
        className={`px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg font-mono font-black text-xs sm:text-sm tracking-tight min-w-[70px] sm:min-w-[76px] flex items-center justify-center gap-1 border transition-all ${
          isTimeZero
            ? 'bg-rose-950/90 text-rose-300 border-rose-600 shadow-sm animate-pulse'
            : isLowTime && isActiveTurn
            ? 'bg-rose-500 text-white border-rose-600 shadow-sm animate-pulse'
            : isActiveTurn
            ? 'bg-white text-zinc-950 border-zinc-300 shadow-sm'
            : 'bg-[#141311] text-zinc-300 border-[#35322b]'
        }`}
      >
        <Clock className={`w-3 h-3 ${isActiveTurn ? 'text-zinc-900' : 'text-zinc-500'}`} />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
});
