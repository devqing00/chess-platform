'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { soundService } from '@/lib/audioService';
import { Swords, Zap, Clock, Shield } from 'lucide-react';

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
  gameFormat = 'Standard Chess',
}) => {
  const [stage, setStage] = useState<'entering' | 'impact' | 'ready' | 'exit'>('entering');

  const handleDismiss = useCallback(() => {
    setStage('exit');
    setTimeout(() => {
      onComplete();
    }, 280);
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Initial entrance sound
    try {
      soundService.playVersusImpact();
    } catch {}

    // 2. Stage progression: impact after 150ms
    const impactTimer = setTimeout(() => {
      setStage('impact');
      try {
        soundService.playGameStart();
      } catch {}
    }, 150);

    const readyTimer = setTimeout(() => {
      setStage('ready');
    }, 600);

    // 3. Auto-exit after 2.4s
    const exitTimer = setTimeout(() => {
      handleDismiss();
    }, 2400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(readyTimer);
      clearTimeout(exitTimer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleDismiss]);

  if (!isOpen) return null;

  return (
    <div
      onClick={handleDismiss}
      className={`fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-between p-4 sm:p-8 select-none cursor-pointer overflow-hidden transition-all duration-300 ${
        stage === 'exit' ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background Arena FX */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Split diagonal lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(234,88,12,0.18),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.03)_0%,transparent_50%,rgba(0,0,0,0.5)_100%)]" />
        {/* Subtle grid mesh */}
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Match Header Pill */}
      <div className="relative z-10 flex flex-col items-center gap-1.5 animate-in slide-in-from-top-6 duration-500">
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 shadow-lg backdrop-blur-md">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-black font-mono tracking-wider uppercase text-white">
            {gameFormat}
          </span>
          <span className="text-zinc-500">&bull;</span>
          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE BATTLE
          </span>
        </div>
      </div>

      {/* Center Stage: Left Player (White) vs Right Player (Black) */}
      <div className="relative z-10 w-full max-w-4xl flex-1 flex flex-col md:flex-row items-center justify-center gap-6 sm:gap-10 my-auto">
        {/* Left Fighter: White Player */}
        <div className="flex-1 w-full flex flex-col items-center md:items-end text-center md:text-right animate-in slide-in-from-left-12 duration-500">
          <div className="flex flex-col items-center md:items-end gap-2.5">
            {/* Color Tag */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white text-zinc-950 font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.4)]">
              <span>♔ WHITE</span>
            </div>

            {/* Avatar Frame */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-white/20 to-white/5 border-2 border-white/40 p-1 shadow-[0_10px_35px_rgba(255,255,255,0.18)] overflow-hidden flex items-center justify-center">
                {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={whitePlayer.avatar}
                    alt={whitePlayer.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-5xl sm:text-6xl">{whitePlayer.avatar || '🧑‍💻'}</span>
                )}
              </div>
              {whitePlayer.title && (
                <span className="absolute -bottom-2 -left-2 text-[10px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-md border border-amber-500 shadow">
                  {whitePlayer.title}
                </span>
              )}
            </div>

            {/* Name & Rating */}
            <div className="flex flex-col items-center md:items-end">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate max-w-[240px]">
                {whitePlayer.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-mono font-bold text-amber-400">
                  {whitePlayer.rating || 1200} ELO
                </span>
                {whitePlayer.country && (
                  <span className="text-sm" title={whitePlayer.country}>
                    {whitePlayer.country === 'US'
                      ? '🇺🇸'
                      : whitePlayer.country === 'NG'
                      ? '🇳🇬'
                      : whitePlayer.country === 'DE'
                      ? '🇩🇪'
                      : '🌍'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Explosive 3D VS Emblem */}
        <div className="relative shrink-0 flex items-center justify-center my-2 md:my-0">
          {/* Shockwave Rings */}
          <div className="absolute w-24 h-24 rounded-full bg-amber-500/25 animate-ping pointer-events-none" />
          <div className="absolute w-36 h-36 rounded-full bg-rose-500/15 animate-pulse pointer-events-none" />

          {/* Golden / Fiery VS Emblem */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-rose-500 to-red-600 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_40px_rgba(245,158,11,0.6)] transform transition-transform duration-300 ${
              stage === 'impact' ? 'scale-125 rotate-3' : 'scale-100 rotate-0'
            }`}
          >
            <span className="text-2xl sm:text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-sans">
              VS
            </span>
          </div>
        </div>

        {/* Right Fighter: Black Player */}
        <div className="flex-1 w-full flex flex-col items-center md:items-start text-center md:text-left animate-in slide-in-from-right-12 duration-500">
          <div className="flex flex-col items-center md:items-start gap-2.5">
            {/* Color Tag */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              <span>♚ BLACK</span>
            </div>

            {/* Avatar Frame */}
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-950 border-2 border-amber-500/40 p-1 shadow-[0_10px_35px_rgba(234,88,12,0.25)] overflow-hidden flex items-center justify-center">
                {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blackPlayer.avatar}
                    alt={blackPlayer.name}
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <span className="text-5xl sm:text-6xl">{blackPlayer.avatar || '♟️'}</span>
                )}
              </div>
              {blackPlayer.title && (
                <span className="absolute -bottom-2 -right-2 text-[10px] font-black bg-amber-400 text-black px-2 py-0.5 rounded-md border border-amber-500 shadow">
                  {blackPlayer.title}
                </span>
              )}
            </div>

            {/* Name & Rating */}
            <div className="flex flex-col items-center md:items-start">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight truncate max-w-[240px]">
                {blackPlayer.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm font-mono font-bold text-amber-400">
                  {blackPlayer.rating || 1200} ELO
                </span>
                {blackPlayer.country && (
                  <span className="text-sm" title={blackPlayer.country}>
                    {blackPlayer.country === 'US'
                      ? '🇺🇸'
                      : blackPlayer.country === 'NG'
                      ? '🇳🇬'
                      : blackPlayer.country === 'DE'
                      ? '🇩🇪'
                      : '🌍'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom CTA & Skip Prompt */}
      <div className="relative z-10 flex flex-col items-center gap-1 animate-in slide-in-from-bottom-6 duration-500">
        <div className="flex items-center gap-2 text-sm font-black tracking-widest uppercase text-amber-400 animate-pulse">
          <Zap className="w-4 h-4 fill-amber-400" />
          <span>MATCH STARTING &bull; FIGHT!</span>
          <Zap className="w-4 h-4 fill-amber-400" />
        </div>
        <span className="text-[11px] font-mono text-zinc-500">
          Tap anywhere or press Space to skip intro
        </span>
      </div>
    </div>
  );
};
