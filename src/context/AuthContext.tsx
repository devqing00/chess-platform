'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '@/lib/firebase/authService';
import { UserProfile } from '@/lib/firebase/types';
import { MembershipTier } from '@/types/chess';
import { XpSystem } from '@/lib/xpSystem';

export interface SyncedChessComAccount {
  username: string;
  avatar?: string;
  country?: string;
  countryCode?: string;
  name?: string;
  status?: string;
  ratings?: {
    rapid: number;
    blitz: number;
    bullet: number;
  };
  stats?: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  syncedChessCom: SyncedChessComAccount | null;
  effectiveDisplayName: string;
  effectiveRating: number;
  effectiveAvatar: string;
  effectiveCountry: string;
  tier: MembershipTier;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  saveSyncedChessCom: (profileData: any, statsData?: any) => void;
  clearSyncedChessCom: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [syncedChessCom, setSyncedChessCom] = useState<SyncedChessComAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Initialize synced Chess.com profile from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chess_com_profile');
      const storedStats = localStorage.getItem('chess_com_stats');
      if (stored) {
        const parsedProfile = JSON.parse(stored);
        const parsedStats = storedStats ? JSON.parse(storedStats) : null;
        setSyncedChessCom({
          ...parsedProfile,
          countryCode: parsedProfile.countryCode || parsedProfile.country?.toLowerCase() || 'us',
          ratings: {
            rapid: parsedStats?.rapid?.rating || 1200,
            blitz: parsedStats?.blitz?.rating || 1200,
            bullet: parsedStats?.bullet?.rating || 1200,
          },
          stats: parsedStats,
        });
      } else {
        setSyncedChessCom(null);
      }
    } catch (e) {
      console.warn('Failed to parse stored Chess.com profile:', e);
      setSyncedChessCom(null);
    }
  }, []);

  const saveSyncedChessCom = useCallback((profileData: any, statsData?: any) => {
    try {
      localStorage.setItem('chess_com_profile', JSON.stringify(profileData));
      if (statsData) {
        localStorage.setItem('chess_com_stats', JSON.stringify(statsData));
      }
      setSyncedChessCom({
        ...profileData,
        countryCode: profileData.countryCode || profileData.country?.toLowerCase() || 'ng',
        ratings: {
          rapid: statsData?.rapid?.rating || 429,
          blitz: statsData?.blitz?.rating || 370,
          bullet: statsData?.bullet?.rating || 300,
        },
        stats: statsData,
      });
    } catch (e) {
      console.warn('Failed to save synced Chess.com profile:', e);
    }
  }, []);

  const clearSyncedChessCom = useCallback(() => {
    try {
      localStorage.removeItem('chess_com_profile');
      localStorage.removeItem('chess_com_stats');
      localStorage.removeItem('chess_com_imported_games');
      setSyncedChessCom(null);
    } catch (e) {
      console.warn('Failed to clear synced profile:', e);
    }
  }, []);

  // Sync with Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        XpSystem.syncWithFirestore(firebaseUser.uid).catch(() => {});
        const prof = await AuthService.getUserProfile(firebaseUser.uid);
        if (prof) {
          setProfile(prof);
        } else {
          // Fallback profile if Firestore is still provisioning
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Player',
            avatar: firebaseUser.photoURL || '♟️',
            tier: 'diamond',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isAnonymous: firebaseUser.isAnonymous,
            ratings: { rapid: 1200, blitz: 1200, bullet: 1200, daily: 1200, puzzles: 1200, puzzleRush: 0 },
            stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0 },
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    await AuthService.loginWithEmail(email, pass);
    setIsAuthModalOpen(false);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    await AuthService.registerWithEmail(email, pass, name);
    setIsAuthModalOpen(false);
  };

  const loginWithGoogle = async () => {
    await AuthService.loginWithGoogle();
    setIsAuthModalOpen(false);
  };

  const loginAsGuest = async () => {
    await AuthService.loginAnonymously();
    setIsAuthModalOpen(false);
  };

  const logout = async () => {
    await AuthService.logout();
    setProfile(null);
  };

  const tier: MembershipTier = profile?.tier || 'diamond';

  // Compute effective global values
  const effectiveDisplayName =
    syncedChessCom?.username ||
    profile?.displayName ||
    user?.displayName ||
    'Guest';

  const effectiveRating =
    syncedChessCom?.ratings?.rapid ||
    profile?.ratings?.rapid ||
    1200;

  const effectiveAvatar =
    syncedChessCom?.avatar ||
    profile?.avatar ||
    user?.photoURL ||
    '♟️';

  const effectiveCountry =
    syncedChessCom?.countryCode ||
    'us';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        syncedChessCom,
        effectiveDisplayName,
        effectiveRating,
        effectiveAvatar,
        effectiveCountry,
        tier,
        loading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        saveSyncedChessCom,
        clearSyncedChessCom,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
