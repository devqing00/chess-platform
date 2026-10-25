'use client';

import { useEffect } from 'react';
import { soundService } from '@/lib/audioService';

/**
 * TactileFeedbackProvider
 * Inspired by the Qing Portfolio Jelly/Tactile system.
 * Listens for pointerdown on any interactive button or tactile trigger
 * and provides instant satisfying haptic audio feedback.
 */
export function TactileFeedbackProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        "button, [role='button'], .tactile-btn, [data-tactile='true']"
      );

      if (!target) return;
      const el = target as HTMLElement;

      if (
        el.hasAttribute('disabled') ||
        el.getAttribute('aria-disabled') === 'true' ||
        el.classList.contains('no-tactile')
      ) {
        return;
      }

      soundService.playTactilePop();
    };

    document.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown as EventListener);
    };
  }, []);

  return <>{children}</>;
}
