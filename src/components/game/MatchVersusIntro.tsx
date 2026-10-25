'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Clock, Zap } from 'lucide-react';

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
      className={`fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 select-none cursor-pointer overflow-hidden transition-opacity duration-200 ${
        isExiting ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle Ambient Radial Lighting Behind VS */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-6">
        {/* Top Minimal Format Pill */}
        <div
          className={`transition-all duration-300 ${
            isEntered && !isExiting
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/80 border border-white/10 shadow-lg backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold font-mono tracking-wider uppercase text-zinc-200">
              {gameFormat}
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-[11px] font-bold text-emerald-400">
              MATCH START
            </span>
          </div>
        </div>

        {/* Center Stage: Left Player (White) | VS | Right Player (Black) */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 lg:gap-8">
          {/* Left Fighter: White Player (Animates in from Left) */}
          <div
            className={`w-full sm:w-1/2 flex justify-center sm:justify-end transition-all duration-400 ease-out ${
              isEntered && !isExiting
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 -translate-x-12 sm:-translate-x-24'
            }`}
          >
            <div className="w-full max-w-[280px] sm:max-w-[300px] flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/85 border border-white/15 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {/* Avatar Frame with White Glow */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-800 border-2 border-white/60 p-0.5 shadow-[0_0_15px_rgba(255,255,255,0.25)] overflow-hidden flex items-center justify-center">
                  {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={whitePlayer.avatar}
                      alt={whitePlayer.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{whitePlayer.avatar || '🧑‍💻'}</span>
                  )}
                </div>
                {whitePlayer.title && (
                  <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-amber-400 text-black px-1.5 py-0.2 rounded border border-amber-500 shadow-sm">
                    {whitePlayer.title}
                  </span>
                )}
              </div>

              {/* Player Details */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-white text-zinc-950 font-black text-[10px] tracking-wider uppercase shadow-xs">
                    ♔ WHITE
                  </span>
                  {whitePlayer.country && (
                    <span className="text-xs" title={whitePlayer.country}>
                      {whitePlayer.country === 'US'
                        ? '🇺🇸'
                        : whitePlayer.country === 'NG'
                        ? '🇳🇬'
                        : whitePlayer.country === 'DE'
                        ? '🇩🇪'
                        : whitePlayer.country === 'GB'
                        ? '🇬🇧'
                        : '🌍'}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate leading-tight">
                  {whitePlayer.name}
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {whitePlayer.rating || 1200} ELO
                </span>
              </div>
            </div>
          </div>

          {/* Minimal Central VS Emblem */}
          <div
            className={`shrink-0 z-20 flex items-center justify-center transition-all duration-300 delay-75 ${
              isEntered && !isExiting
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-50'
            }`}
          >
            <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-amber-600 border border-amber-300/70 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.4)]">
              <span className="text-base sm:text-lg font-black italic tracking-tighter text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-sans">
                VS
              </span>
            </div>
          </div>

          {/* Right Fighter: Black Player (Animates in from Right) */}
          <div
            className={`w-full sm:w-1/2 flex justify-center sm:justify-start transition-all duration-400 ease-out ${
              isEntered && !isExiting
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-12 sm:translate-x-24'
            }`}
          >
            <div className="w-full max-w-[280px] sm:max-w-[300px] flex items-center gap-3.5 p-3.5 sm:p-4 rounded-2xl bg-zinc-900/85 border border-zinc-700/60 shadow-[0_12px_36px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              {/* Avatar Frame with Dark Titanium / Warm Rim */}
              <div className="relative shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-950 border-2 border-zinc-600 p-0.5 shadow-[0_0_15px_rgba(0,0,0,0.6)] overflow-hidden flex items-center justify-center">
                  {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={blackPlayer.avatar}
                      alt={blackPlayer.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl">{blackPlayer.avatar || '♟️'}</span>
                  )}
                </div>
                {blackPlayer.title && (
                  <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-amber-400 text-black px-1.5 py-0.2 rounded border border-amber-500 shadow-sm">
                    {blackPlayer.title}
                  </span>
                )}
              </div>

              {/* Player Details */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-600 text-zinc-200 font-black text-[10px] tracking-wider uppercase shadow-xs">
                    ♚ BLACK
                  </span>
                  {blackPlayer.country && (
                    <span className="text-xs" title={blackPlayer.country}>
                      {blackPlayer.country === 'US'
                        ? '🇺🇸'
                        : blackPlayer.country === 'NG'
                        ? '🇳🇬'
                        : blackPlayer.country === 'DE'
                        ? '🇩🇪'
                        : blackPlayer.country === 'GB'
                        ? '🇬🇧'
                        : '🌍'}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate leading-tight">
                  {blackPlayer.name}
                </h3>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                  {blackPlayer.rating || 1200} ELO
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Minimal Bottom Prompt */}
        <div
          className={`transition-all duration-300 delay-100 ${
            isEntered && !isExiting
              ? 'opacity-70 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-emerald-400" />
            <span>Tap anywhere to skip</span>
          </span>
        </div>
      </div>
    </div>
  );
};

