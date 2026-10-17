'use client';

import { useState, useEffect, useCallback } from 'react';
import { XpSystem, XpProfile, XpAction } from '@/lib/xpSystem';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';

export function useXpSystem() {
  const [profile, setProfile] = useState<XpProfile>(() => XpSystem.getProfile());
  const [recentGain, setRecentGain] = useState<{ amount: number; reason: string } | null>(null);

  useEffect(() => {
    // Initial fetch on mount
    setProfile(XpSystem.getProfile());

    const handleXpEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{
        amount: number;
        reason: string;
        newTotalXp: number;
        leveledUp: boolean;
        newLevel: number;
      }>;

      setProfile(XpSystem.getProfile());

      if (customEvent.detail) {
        setRecentGain({
          amount: customEvent.detail.amount,
          reason: customEvent.detail.reason,
        });

        if (customEvent.detail.leveledUp) {
          try {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
            soundService.playPuzzleSuccess();
          } catch {}
        }

        // Clear gain toast after 3 seconds
        setTimeout(() => {
          setRecentGain(null);
        }, 3200);
      }
    };

    window.addEventListener('chess_xp_awarded', handleXpEvent);
    return () => {
      window.removeEventListener('chess_xp_awarded', handleXpEvent);
    };
  }, []);

  const awardXp = useCallback((amountOrAction: number | XpAction, reason: string = 'Exercise Solved') => {
    return XpSystem.awardXp(amountOrAction, reason);
  }, []);

  return {
    profile,
    recentGain,
    awardXp,
    refreshProfile: () => setProfile(XpSystem.getProfile()),
  };
}
