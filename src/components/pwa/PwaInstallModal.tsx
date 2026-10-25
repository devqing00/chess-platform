'use client';

import React from 'react';
import {
  X,
  Download,
  Share2,
  PlusSquare,
  CheckCircle2,
  Sparkles,
  Laptop,
  Smartphone,
  ShieldCheck,
  Zap,
  WifiOff,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Button } from '@/components/ui/button';
import { soundService } from '@/lib/audioService';
import { usePwaInstall } from '@/lib/usePwaInstall';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaState: ReturnType<typeof usePwaInstall>;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({
  isOpen,
  onClose,
  pwaState,
}) => {
  if (!isOpen) return null;

  const { isInstalled, isIos, isAndroid, platform, installApp } = pwaState;

  const handleInstallClick = async () => {
    soundService.playTactilePop();
    const result = await installApp();
    if (result === 'accepted') {
      soundService.playGameStart();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 pt-safe pb-safe bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      {/* Modal Card */}
      <div className="w-full max-w-lg bg-[#211f1c] border-2 border-[#38342c] rounded-3xl shadow-[0_12px_32px_rgba(0,0,0,0.8),0_6px_0_0_#141311] overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh] relative my-auto animate-in zoom-in-95 duration-200">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d2a24] relative z-10 shrink-0 bg-[#262420]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#282622] border-2 border-[#3d3a34] flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
              <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight flex items-center gap-2 flex-wrap">
                <span>Install Check.mate</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 uppercase font-mono font-bold">
                  PWA App
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Official installable web application for all devices
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundService.playTactilePop();
              onClose();
            }}
            className="w-8 h-8 rounded-xl bg-[#2a2723] hover:bg-[#34302a] border border-[#3e3a33] text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1 overflow-y-auto relative z-10">
          {/* App Preview Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-[#292621] to-[#1c1b18] border border-[#38352e] flex items-center gap-3 sm:gap-4 shrink-0">
            <BrandLogo size="md" showText={false} />
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Check.mate</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[11px] text-zinc-400 truncate">Grandmaster Chess & Tactical Platform</span>
              <span className="text-[10px] text-emerald-400 font-mono mt-0.5">
                v1.0 • Verified Progressive Web App
              </span>
            </div>
          </div>

          {/* If already installed */}
          {isInstalled ? (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3.5 text-emerald-300">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-white mb-0.5">App is Installed & Running Standalone!</p>
                <p className="text-emerald-300/80">
                  You are running Check.mate in full-screen standalone mode. Offline assets, Grandmaster bots, and sound caches are active.
                </p>
              </div>
            </div>
          ) : isIos ? (
            /* iOS Safari Step-by-Step Instructions */
            <div className="flex flex-col gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                <p className="font-bold mb-0.5">iOS Safari Installation:</p>
                <p className="text-amber-300/80 leading-relaxed">
                  Apple Safari requires adding to home screen through the Share menu to unlock native fullscreen & offline access:
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#282622] border border-[#3a3730]">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>Tap the Share Button</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-400" />
                    </p>
                    <p className="text-zinc-400 mt-0.5">
                      Located in Safari&apos;s bottom toolbar (on iPhone) or top bar (on iPad).
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#282622] border border-[#3a3730]">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <span>Tap &quot;Add to Home Screen&quot;</span>
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-400" />
                    </p>
                    <p className="text-zinc-400 mt-0.5">
                      Scroll down in the action sheet and select &quot;Add to Home Screen&quot;.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#282622] border border-[#3a3730]">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-white">Tap &quot;Add&quot; in Top-Right</p>
                    <p className="text-zinc-400 mt-0.5">
                      Check.mate will appear with an authentic app icon on your home screen.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Android / Desktop Chrome / Edge */
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-[#282622] border border-[#3a3730] flex items-center gap-2.5">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Zero Browser Latency</p>
                    <p className="text-[10px] text-zinc-400">Dedicated standalone window</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#282622] border border-[#3a3730] flex items-center gap-2.5">
                  <WifiOff className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Offline Ready</p>
                    <p className="text-[10px] text-zinc-400">Bots & Pass-and-Play</p>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#262420] border border-[#38342c] text-xs text-zinc-400 leading-relaxed">
                Installing Check.mate provides a native app experience on {platform === 'windows' ? 'Windows' : platform === 'mac' ? 'macOS' : isAndroid ? 'Android' : 'your computer'}, complete with desktop shortcuts, full-screen board view, and rapid premove response.
              </div>
            </div>
          )}

          {/* Benefits Feature List */}
          <div className="flex flex-col gap-2 pt-2 border-t border-[#2e2b25]">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Installed App Advantages
            </span>
            <ul className="text-xs text-zinc-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Runs full-screen without address bar clutter</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Hardware-accelerated 120 FPS piece animations</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Immediate keyboard and tactile piece response</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-5 border-t border-[#2d2a24] bg-[#1a1916] flex items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          <Button
            variant="subtle"
            size="md"
            rounded="xl"
            onClick={() => {
              soundService.playTactilePop();
              onClose();
            }}
            className="text-xs sm:text-sm shrink-0"
          >
            {isInstalled ? 'Close' : 'Maybe Later'}
          </Button>

          {!isInstalled && !isIos && (
            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={handleInstallClick}
              className="gap-2 font-black px-4 sm:px-6 shadow-lg shadow-emerald-950/40 text-xs sm:text-sm"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Install Check.mate</span>
            </Button>
          )}

          {isIos && !isInstalled && (
            <Button
              variant="primary"
              size="md"
              rounded="xl"
              onClick={() => {
                soundService.playTactilePop();
                onClose();
              }}
              className="gap-2 font-black px-5 sm:px-6 text-xs sm:text-sm"
            >
              <span>Got It</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
