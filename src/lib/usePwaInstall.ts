'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type PwaPlatform = 'ios' | 'android' | 'windows' | 'mac' | 'desktop' | 'unknown';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface UsePwaInstallReturn {
  canInstall: boolean;
  isInstalled: boolean;
  isIos: boolean;
  isAndroid: boolean;
  platform: PwaPlatform;
  installApp: () => Promise<'accepted' | 'dismissed' | 'unsupported'>;
  isModalOpen: boolean;
  openInstallModal: () => void;
  closeInstallModal: () => void;
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [canInstall, setCanInstall] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [platform, setPlatform] = useState<PwaPlatform>('unknown');
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isAndroid, setIsAndroid] = useState<boolean>(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check display-mode standalone and device platform
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect standalone display mode across iOS, Android, and Desktop
    const checkStandalone = () => {
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isWindowControlsOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidTwa = document.referrer.startsWith('android-app://');

      const installed = Boolean(isStandaloneMedia || isWindowControlsOverlay || isIosStandalone || isAndroidTwa);
      setIsInstalled(installed);
      return installed;
    };

    const isAlreadyInstalled = checkStandalone();

    // Detect platform
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    const android = /android/.test(ua);
    const windows = /windows nt/.test(ua);
    const mac = /macintosh|mac os x/.test(ua);

    setIsIos(ios);
    setIsAndroid(android);

    if (ios) setPlatform('ios');
    else if (android) setPlatform('android');
    else if (windows) setPlatform('windows');
    else if (mac) setPlatform('mac');
    else setPlatform('desktop');

    // On iOS Safari, beforeinstallprompt is NOT supported, but the app can still be installed
    if (ios && !isAlreadyInstalled) {
      setCanInstall(true);
    }

    // Capture standard Chromium / Edge / Android install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      setIsModalOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker in production / supported environments
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          // If there is an update waiting, trigger it
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const installApp = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (deferredPromptRef.current) {
      const promptEvent = deferredPromptRef.current;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === 'accepted') {
        deferredPromptRef.current = null;
        setCanInstall(false);
        setIsInstalled(true);
        setIsModalOpen(false);
        return 'accepted';
      } else {
        return 'dismissed';
      }
    }

    // If on iOS or no deferredPrompt available, open the visual instruction modal
    setIsModalOpen(true);
    return 'unsupported';
  }, []);

  return {
    canInstall,
    isInstalled,
    isIos,
    isAndroid,
    platform,
    installApp,
    isModalOpen,
    openInstallModal,
    closeInstallModal,
  };
}
