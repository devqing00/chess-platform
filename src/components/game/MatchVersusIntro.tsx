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
  gameFormat?: string;
}

export const MatchVersusIntro: React.FC<MatchVersusIntroProps> = ({
  isOpen,
  onComplete,
  whitePlayer,
  blackPlayer,
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

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 select-none cursor-pointer overflow-hidden transition-opacity duration-200 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative z-10 w-full max-w-2xl flex flex-col items-center gap-6 sm:gap-8">
        {/* Top Format Indicator (Clean typography, zero AI-slop dot) */}
        <div
          className={`transition-all duration-300 ${
            isEntered && !isExiting
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-3'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1c1a17] border border-white/10 shadow-sm">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-zinc-300">
              {gameFormat}
            </span>
          </div>
        </div>

        {/* Center Stage: Unified Fighter Cards (Gradient White for White vs Gradient Dark for Black) */}
        <div className="w-full flex flex-row items-center justify-center gap-2.5 sm:gap-4 md:gap-6">
          {/* White Fighter Card (Gradient White Background with Crisp Black & Emerald Accents) */}
          <div
            className={`flex-1 max-w-[240px] sm:max-w-[270px] p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br from-white via-zinc-100 to-zinc-200 border border-white/90 shadow-[0_12px_28px_rgba(0,0,0,0.35)] flex items-center gap-2.5 sm:gap-3.5 transition-all duration-300 ease-out ${
              isEntered && !isExiting
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-6'
            }`}
          >
            {/* Avatar Frame (Clean Light Base) */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-white border border-zinc-200 overflow-hidden flex items-center justify-center text-lg sm:text-xl shadow-xs">
                {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={whitePlayer.avatar}
                    alt={whitePlayer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-zinc-900">{whitePlayer.avatar || '🧑‍💻'}</span>
                )}
              </div>
              {whitePlayer.title && (
                <span className="absolute -top-1 -right-1 text-[8px] font-black bg-[#ca8a04] text-zinc-950 px-1 rounded-sm uppercase tracking-wider shadow-xs">
                  {whitePlayer.title}
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-900/10 text-zinc-800 border border-zinc-300/80">
                  White ⚪
                </span>
                {whitePlayer.country && (
                  <span className="text-xs shrink-0 select-none" title={whitePlayer.country}>
                    {getCountryFlag(whitePlayer.country)}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-zinc-950 truncate tracking-tight">
                {whitePlayer.name}
              </h3>
              <span className="text-[11px] font-mono font-bold text-emerald-700 tabular-nums">
                {whitePlayer.rating || 1200} ELO
              </span>
            </div>
          </div>

          {/* Clean VS Divider */}
          <div
            className={`shrink-0 flex items-center justify-center transition-all duration-300 delay-75 ${
              isEntered && !isExiting ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-b from-[#2a2723] to-[#161512] border border-white/20 flex items-center justify-center shadow-lg">
              <span className="text-[11px] font-black font-mono tracking-wider text-amber-400">
                VS
              </span>
            </div>
          </div>

          {/* Black Fighter Card (Gradient Obsidian Background with Crisp Light & Emerald Accents) */}
          <div
            className={`flex-1 max-w-[240px] sm:max-w-[270px] p-2.5 sm:p-3.5 rounded-2xl bg-gradient-to-br from-[#24221f] via-[#1a1815] to-[#12110f] border border-white/10 shadow-[0_12px_28px_rgba(0,0,0,0.5)] flex items-center gap-2.5 sm:gap-3.5 transition-all duration-300 ease-out ${
              isEntered && !isExiting
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-6'
            }`}
          >
            {/* Avatar Frame (Obsidian Base) */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl bg-[#161512] border border-white/10 overflow-hidden flex items-center justify-center text-lg sm:text-xl shadow-xs">
                {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blackPlayer.avatar}
                    alt={blackPlayer.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{blackPlayer.avatar || '♟️'}</span>
                )}
              </div>
              {blackPlayer.title && (
                <span className="absolute -top-1 -right-1 text-[8px] font-black bg-[#ca8a04] text-zinc-950 px-1 rounded-sm uppercase tracking-wider shadow-xs">
                  {blackPlayer.title}
                </span>
              )}
            </div>

            {/* Details */}
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/10">
                  Black ⚫
                </span>
                {blackPlayer.country && (
                  <span className="text-xs shrink-0 select-none" title={blackPlayer.country}>
                    {getCountryFlag(blackPlayer.country)}
                  </span>
                )}
              </div>
              <h3 className="text-xs sm:text-sm font-extrabold text-zinc-100 truncate tracking-tight">
                {blackPlayer.name}
              </h3>
              <span className="text-[11px] font-mono font-bold text-emerald-400 tabular-nums">
                {blackPlayer.rating || 1200} ELO
              </span>
            </div>
          </div>
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

