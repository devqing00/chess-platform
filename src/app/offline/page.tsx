'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff, Wifi, RefreshCw, Bot, Gamepad2, Microscope, ArrowLeft } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { soundService } from '@/lib/audioService';

export default function OfflinePage() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : false;
  });
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      soundService.playGameStart();
    };

    const handleOffline = () => {
      setIsOnline(false);
      soundService.playPuzzleFail();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    soundService.playTactilePop();
    setIsChecking(true);
    try {
      // Attempt a lightweight fetch to verify real connectivity
      const res = await fetch('/manifest.json', { cache: 'no-store' });
      if (res.ok) {
        setIsOnline(true);
        soundService.playGameStart();
        router.refresh();
        window.location.href = '/';
      } else {
        setIsOnline(false);
        soundService.playPuzzleFail();
      }
    } catch {
      setIsOnline(false);
      soundService.playPuzzleFail();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-full flex-1 flex flex-col items-center justify-center p-6 bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-md flex flex-col items-center text-center">
        {/* Brand Header */}
        <div className="mb-8">
          <BrandLogo size="lg" showText={true} />
        </div>

        {/* Status Card */}
        <div className="w-full bg-[#211f1c] border-2 border-[#35322b] rounded-3xl p-6 sm:p-8 shadow-[0_6px_0_0_#141311] relative overflow-hidden flex flex-col items-center">
          {/* Subtle Ambient Radial Glow */}
          <div
            className={`absolute -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
              isOnline ? 'bg-emerald-500/20' : 'bg-amber-500/15'
            }`}
          />

          {/* Animated Icon Orb */}
          <div
            className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 border-2 transition-all duration-300 shadow-lg ${
              isOnline
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10'
                : 'bg-amber-500/15 border-amber-500/40 text-amber-400 shadow-amber-500/10'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-10 h-10 animate-bounce" />
            ) : (
              <WifiOff className="w-10 h-10 animate-pulse" />
            )}
          </div>

          {/* Heading */}
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
            {isOnline ? 'Connection Restored!' : "You're Playing Offline"}
          </h1>

          {/* Description */}
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed mb-6">
            {isOnline
              ? 'Your internet connection is back. You can return to live matchmaking, tournaments, and cloud reviews.'
              : 'No internet connection detected. Check.mate engines, offline Grandmaster bots, and local pass-and-play remain fully available!'}
          </p>

          {/* Connection Status Pill */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6 border ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            />
            <span>{isOnline ? 'Internet Online' : 'Offline Mode'}</span>
          </div>

          {/* Primary Action Button */}
          {isOnline ? (
            <Button
              variant="primary"
              size="lg"
              rounded="2xl"
              onClick={() => {
                soundService.playGameStart();
                window.location.href = '/';
              }}
              className="w-full gap-2 text-sm font-black shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Return to Online Platform</span>
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              rounded="2xl"
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full gap-2 text-sm font-black border-[#454138] hover:border-emerald-500/50"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isChecking ? 'Checking Connection...' : 'Retry Connection'}</span>
            </Button>
          )}

          {/* Offline Ready Activities */}
          <div className="w-full mt-6 pt-5 border-t border-[#312e28] flex flex-col gap-2.5">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider text-left">
              Play Offline Without WiFi
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  router.push('/bots');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282622] hover:bg-[#322f2a] border border-[#3d3a34] text-zinc-300 hover:text-white transition group cursor-pointer"
              >
                <Bot className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">20+ Bots</span>
              </button>

              <button
                onClick={() => {
                  soundService.playTactilePop();
                  router.push('/play');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282622] hover:bg-[#322f2a] border border-[#3d3a34] text-zinc-300 hover:text-white transition group cursor-pointer"
              >
                <Gamepad2 className="w-5 h-5 text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Pass & Play</span>
              </button>

              <button
                onClick={() => {
                  soundService.playTactilePop();
                  router.push('/analysis');
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#282622] hover:bg-[#322f2a] border border-[#3d3a34] text-zinc-300 hover:text-white transition group cursor-pointer"
              >
                <Microscope className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold">Engine</span>
              </button>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <button
          onClick={() => {
            soundService.playTactilePop();
            router.back();
          }}
          className="mt-6 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Go back to previous screen</span>
        </button>
      </div>
    </div>
  );
}
