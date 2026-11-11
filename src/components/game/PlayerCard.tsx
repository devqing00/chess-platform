'use client';

import React from 'react';
import { GamePlayer, PieceType, PieceColor } from '@/types/chess';
import { CapturedPiecesBar } from './CapturedPiecesBar';
import { Clock } from 'lucide-react';
import { getCountryFlag } from '@/lib/countryUtils';

interface PlayerCardProps {
  player: GamePlayer;
  color: PieceColor;
  timeRemainingSeconds?: number;
  isActiveTurn?: boolean;
  isThinking?: boolean;
  capturedPieces?: PieceType[];
  materialAdvantage?: number; // positive if this player has more material
  accuracy?: number; // Post-match / Game review accuracy %
}

export const PlayerCard: React.FC<PlayerCardProps> = React.memo(function PlayerCard({
  player,
  color,
  timeRemainingSeconds,
  isActiveTurn = false,
  isThinking = false,
  capturedPieces = [],
  materialAdvantage = 0,
  accuracy,
}) {
  const hasTime = timeRemainingSeconds !== undefined;
  const time = timeRemainingSeconds ?? 0;
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const ms = Math.floor((time % 1) * 10);

  const formattedTime =
    time < 20 && time > 0
      ? `${minutes}:${seconds < 10 ? '0' : ''}${seconds}.${ms}`
      : `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const isLowTime = time <= 20 && time > 0;
  const isTimeZero = time === 0 && hasTime;

  return (
    <div className="flex items-center justify-between px-1.5 sm:px-2 py-1 select-none min-h-[32px] max-h-[36px] w-full">
      {/* Player Profile & Captures */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0">
          <div
            className={`w-7 h-7 rounded-md bg-[#24221f] overflow-hidden flex items-center justify-center text-xs transition-all ${
              isThinking ? 'ring-2 ring-emerald-500/70' : ''
            }`}
          >
            {player.avatar && player.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span>{player.avatar || (color === 'w' ? '⚪' : '⚫')}</span>
            )}
          </div>
          {player.title && (
            <span className="absolute -top-1 -right-1 text-[8px] font-black bg-[#ca8a04] text-zinc-950 px-1 rounded-sm uppercase tracking-wider">
              {player.title}
            </span>
          )}
        </div>

        <div className="flex flex-col min-w-0 justify-center">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-bold text-zinc-100 truncate tracking-tight">
              {player.name}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono font-medium">({player.rating})</span>
            {player.country && (
              <span className="text-[11px] shrink-0 select-none" title={player.country}>
                {getCountryFlag(player.country)}
              </span>
            )}
          </div>

          {/* Subtitle Row: Organic Thinking Indicator OR Minimal Captured Pieces */}
          <div className="h-3.5 max-h-[14px] flex items-center gap-1.5 min-w-0 overflow-hidden">
            {isThinking ? (
              <div className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                <span>thinking</span>
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-emerald-400/80 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            ) : (
              <CapturedPiecesBar
                capturedPieces={capturedPieces}
                capturedColor={color === 'w' ? 'b' : 'w'}
                materialAdvantage={materialAdvantage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Accuracy Badge (Review Mode: Clean Typography) OR Tactile Chess Clock (Gameplay Mode) */}
      {accuracy !== undefined ? (
        <div className="flex items-baseline gap-1 font-mono shrink-0 select-none px-1">
          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">acc</span>
          <span className="text-xs sm:text-sm font-black text-emerald-400 tabular-nums">
            {accuracy.toFixed(1)}%
          </span>
        </div>
      ) : hasTime ? (
        <div
          className={`px-2.5 py-1 rounded-md font-mono font-bold text-xs sm:text-sm tracking-tight tabular-nums min-w-[66px] sm:min-w-[72px] flex items-center justify-center gap-1.5 transition-colors select-none ${
            isTimeZero
              ? 'bg-rose-950 text-rose-300 animate-pulse'
              : isLowTime && isActiveTurn
              ? 'bg-rose-600 text-white animate-pulse'
              : isActiveTurn
              ? 'bg-white text-zinc-950 font-black shadow-sm'
              : 'bg-[#1f1d19] text-zinc-300'
          }`}
        >
          <Clock className={`w-3 h-3 ${isActiveTurn ? 'text-zinc-900' : 'text-zinc-400'}`} />
          <span>{formattedTime}</span>
        </div>
      ) : null}
    </div>
  );
});
