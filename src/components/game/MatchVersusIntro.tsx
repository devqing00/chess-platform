'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Clock, Zap } from 'lucide-react';
import { getCountryFlag } from '@/lib/countryUtils';

export interface VersusPlayerInfo {
  name: string;
  avatar?: string;
  rating?: number;
  title?: string;
  country?: string;
  isBot?: boolean;
}

interface MatchVersusIntroProps {
  isOpen: boolean;
  onComplete: () => void;
  whitePlayer: VersusPlayerInfo;
  blackPlayer: VersusPlayerInfo;
  userColor?: 'w' | 'b';
  gameFormat?: string;
}

export const MatchVersusIntro: React.FC<MatchVersusIntroProps> = ({
  isOpen,
  onComplete,
  whitePlayer,
  blackPlayer,
  userColor = 'w',
  gameFormat = 'Live Arena',
}) => {
  const [stage, setStage] = useState<'entering' | 'active' | 'exit'>('entering');
  const dismissedRef = useRef(false);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setStage('exit');
    setTimeout(() => {
      onComplete();
    }, 200);
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) {
      setStage('entering');
      dismissedRef.current = false;
      return;
    }

    dismissedRef.current = false;
    // Enter smoothly immediately
    const enterTimer = requestAnimationFrame(() => {
      setStage('active');
    });

    // Auto-dismiss after 1.2s (smoothly fades out by 1.4s total)
    const exitTimer = setTimeout(() => {
      handleDismiss();
    }, 1200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(enterTimer);
      clearTimeout(exitTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  const isExiting = stage === 'exit';
  const isEntered = stage === 'active';

  // Strict diagonal alignment: Player (You) Top-Left, Opponent Bottom-Right across ALL screens
  const isUserBlack = userColor === 'b';
  const topLeftPlayer = isUserBlack ? blackPlayer : whitePlayer;
  const topLeftColor: 'w' | 'b' = isUserBlack ? 'b' : 'w';

  const bottomRightPlayer = isUserBlack ? whitePlayer : blackPlayer;
  const bottomRightColor: 'w' | 'b' = isUserBlack ? 'w' : 'b';

  const renderFighterCard = (
    player: VersusPlayerInfo,
    color: 'w' | 'b',
    isTopLeft: boolean
  ) => {
    const isLight = color === 'w';

    return (
      <div
        className={`${
          isTopLeft ? 'self-start' : 'self-end'
        } w-fit max-w-[85%] sm:max-w-[280px] z-10 p-2 sm:p-2.5 rounded-2xl inline-flex items-center gap-2.5 sm:gap-3 transition-all duration-300 ease-out shadow-[0_12px_32px_rgba(0,0,0,0.5)] ${
          isLight
            ? 'bg-gradient-to-br from-white via-zinc-100 to-zinc-200 text-zinc-900'
            : 'bg-gradient-to-br from-[#24221f] via-[#1a1815] to-[#12110f] text-zinc-100'
        } ${
          isEntered && !isExiting
            ? 'opacity-100 translate-x-0 translate-y-0'
            : isTopLeft
            ? 'opacity-0 -translate-x-6 -translate-y-4'
            : 'opacity-0 translate-x-6 translate-y-4'
        }`}
      >
        {/* Avatar Frame */}
        <div className="relative shrink-0">
          <div
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden flex items-center justify-center text-lg sm:text-xl shadow-xs ${
              isLight ? 'bg-white' : 'bg-[#161512]'
            }`}
          >
            {player.avatar && player.avatar.startsWith('http') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.avatar}
                alt={player.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className={isLight ? 'text-zinc-900' : 'text-zinc-100'}>
                {player.avatar || (isLight ? '♔' : '♚')}
              </span>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex flex-col min-w-0 pr-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className={`text-[9px] font-mono font-bold uppercase tracking-wider ${
                isLight ? 'text-zinc-600' : 'text-zinc-400'
              }`}
            >
              {isLight ? 'White' : 'Black'}
              {isTopLeft ? ' · You' : player.isBot ? ' · Bot' : ''}
              {player.title ? ` · ${player.title}` : ''}
            </span>
            {player.country && (
              <span className="text-xs shrink-0 select-none" title={player.country}>
                {getCountryFlag(player.country)}
              </span>
            )}
          </div>
          <h3
            className={`text-xs sm:text-sm font-extrabold truncate tracking-tight ${
              isLight ? 'text-zinc-950' : 'text-zinc-100'
            }`}
          >
            {player.name}
          </h3>
          <span
            className={`text-[11px] font-mono font-bold tabular-nums ${
              isLight ? 'text-emerald-700' : 'text-emerald-400'
            }`}
          >
            {player.rating || 1200} ELO
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 select-none cursor-pointer overflow-hidden transition-opacity duration-200 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6 sm:gap-8">
        {/* Top Format Indicator (Clean minimal typography, zero stroke box or background) */}
        <div
          className={`transition-all duration-300 ${
            isEntered && !isExiting
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-3'
          }`}
        >
          <span className="text-[11px] font-mono font-bold tracking-[0.22em] uppercase text-zinc-400 select-none">
            {gameFormat}
          </span>
        </div>

        {/* Center Stage: Diagonal Fighter Clash (Top-Left You, Center VS, Bottom-Right Opponent across all screens) */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[460px] flex flex-col justify-between gap-6 sm:gap-8 min-h-[170px] sm:min-h-[190px] my-2 sm:my-3 px-1">
          {/* Top-Left Fighter Card (You - Content Hugging Fit-Width) */}
          {renderFighterCard(topLeftPlayer, topLeftColor, true)}

          {/* Center VS Divider (Vibrant Tactile Emerald Clash Badge) */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none transition-all duration-300 delay-75 ${
              isEntered && !isExiting ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/35 blur-md scale-125" />
              <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-b from-[#10b981] via-[#059669] to-[#047857] flex items-center justify-center shadow-[0_0_24px_rgba(16,185,129,0.5),0_6px_16px_rgba(0,0,0,0.6)]">
                <span className="text-xs sm:text-sm font-black font-mono tracking-widest text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] pl-0.5">
                  VS
                </span>
              </div>
            </div>
          </div>

          {/* Bottom-Right Fighter Card (Opponent - Content Hugging Fit-Width) */}
          {renderFighterCard(bottomRightPlayer, bottomRightColor, false)}
        </div>

        {/* Minimal Bottom Prompt */}
        <div
          className={`transition-all duration-300 delay-100 ${
            isEntered && !isExiting ? 'opacity-60 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span className="text-[10px] font-mono text-zinc-500">
            Click anywhere or press Space to skip
          </span>
        </div>
      </div>
    </div>
  );
};

