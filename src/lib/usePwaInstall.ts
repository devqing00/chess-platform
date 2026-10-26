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
  isUpdating: boolean;
  updateAvailable: boolean;
  applyUpdate: () => void;
  checkForUpdates: () => Promise<boolean>;
}

function getInitialPwaEnvironment() {
  if (typeof window === 'undefined') {
    return {
      isInstalled: false,
      platform: 'unknown' as PwaPlatform,
      isIos: false,
      isAndroid: false,
      canInstall: false,
    };
  }

  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isWindowControlsOverlay = window.matchMedia('(display-mode: window-controls-overlay)').matches;
  const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidTwa = document.referrer.startsWith('android-app://');
  const installed = Boolean(isStandaloneMedia || isWindowControlsOverlay || isIosStandalone || isAndroidTwa);

  const ua = window.navigator.userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
  const android = /android/.test(ua);
  const windows = /windows nt/.test(ua);
  const mac = /macintosh|mac os x/.test(ua);
  const platform: PwaPlatform = ios ? 'ios' : android ? 'android' : windows ? 'windows' : mac ? 'mac' : 'desktop';

  return {
    isInstalled: installed,
    platform,
    isIos: ios,
    isAndroid: android,
    canInstall: ios && !installed,
  };
}

export function usePwaInstall(): UsePwaInstallReturn {
  const [initialEnv] = useState(getInitialPwaEnvironment);
  const [canInstall, setCanInstall] = useState<boolean>(initialEnv.canInstall);
  const [isInstalled, setIsInstalled] = useState<boolean>(initialEnv.isInstalled);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [platform] = useState<PwaPlatform>(initialEnv.platform);
  const [isIos] = useState<boolean>(initialEnv.isIos);
  const [isAndroid] = useState<boolean>(initialEnv.isAndroid);

  // Auto-update states
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

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

    checkStandalone();

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

    // Register Service Worker in production / supported environments & manage auto-updates
    let intervalId: NodeJS.Timeout | null = null;
    let refreshing = false;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          registrationRef.current = reg;

          // 1. If an updated worker is already waiting, trigger SKIP_WAITING immediately
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            setUpdateAvailable(true);
          }

          // 2. Listen for new service worker installation lifecycle
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New update is installed! Auto-trigger activation
                  setUpdateAvailable(true);
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });

          // 3. Check for updates periodically (every 10 minutes)
          intervalId = setInterval(() => {
            reg.update().catch(() => {});
          }, 10 * 60 * 1000);

          // 4. Check for update when user re-focuses or un-minimizes the PWA
          const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
              reg.update().catch(() => {});
            }
          };
          document.addEventListener('visibilitychange', onVisibilityChange);
          window.addEventListener('focus', () => reg.update().catch(() => {}));
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });

      // 5. When the new service worker activates and claims clients (controllerchange), auto-reload seamlessly!
      const onControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          setIsUpdating(true);
          // Allow subtle UI indicator to show, then reload with latest application bundle
          setTimeout(() => {
            window.location.reload();
          }, 700);
        }
      };

      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const openInstallModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const applyUpdate = useCallback(() => {
    setIsUpdating(true);
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    if (registrationRef.current) {
      try {
        await registrationRef.current.update();
        return Boolean(registrationRef.current.waiting || registrationRef.current.installing);
      } catch {
        return false;
      }
    }
    return false;
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
    isUpdating,
    updateAvailable,
    applyUpdate,
    checkForUpdates,
  };
}
