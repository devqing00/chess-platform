'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '@/lib/firebase/authService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { UserProfile, SyncedChessComAccount, SyncedLichessAccount } from '@/lib/firebase/types';
import { MembershipTier } from '@/types/chess';
import { XpSystem } from '@/lib/xpSystem';

export type { SyncedChessComAccount, SyncedLichessAccount };

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  syncedChessCom: SyncedChessComAccount | null;
  syncedLichess: SyncedLichessAccount | null;
  effectiveDisplayName: string;
  effectiveRating: number | null;
  isSynced: boolean;
  syncedPlatform: 'chesscom' | 'lichess' | null;
  effectiveAvatar: string;
  effectiveCountry: string;
  tier: MembershipTier;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  saveSyncedChessCom: (profileData: any, statsData?: any) => void;
  clearSyncedChessCom: () => void;
  saveSyncedLichess: (profileData: any, statsData?: any) => void;
  clearSyncedLichess: () => void;
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
  const [syncedLichess, setSyncedLichess] = useState<SyncedLichessAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Initialize synced profiles from localStorage on mount (for instant offline cache)
  useEffect(() => {
    try {
      const storedChessCom = localStorage.getItem('chess_com_profile');
      const storedChessComStats = localStorage.getItem('chess_com_stats');
      if (storedChessCom) {
        const parsedProfile = JSON.parse(storedChessCom);
        const parsedStats = storedChessComStats ? JSON.parse(storedChessComStats) : null;
        setSyncedChessCom({
          ...parsedProfile,
          countryCode: parsedProfile.countryCode || parsedProfile.country?.toLowerCase() || 'us',
          ratings: {
            rapid: parsedStats?.rapid?.rating || 800,
            blitz: parsedStats?.blitz?.rating || 800,
            bullet: parsedStats?.bullet?.rating || 800,
          },
          stats: parsedStats,
        });
      }

      const storedLichess = localStorage.getItem('lichess_profile');
      if (storedLichess) {
        const parsedLichess = JSON.parse(storedLichess);
        setSyncedLichess(parsedLichess);
      }
    } catch (e) {
      console.warn('Failed to parse cached external profiles:', e);
    }
  }, []);

  const saveSyncedChessCom = useCallback(
    (profileData: any, statsData?: any) => {
      try {
        localStorage.setItem('chess_com_profile', JSON.stringify(profileData));
        if (statsData) {
          localStorage.setItem('chess_com_stats', JSON.stringify(statsData));
        }
        const accountData: SyncedChessComAccount = {
          ...profileData,
          countryCode: profileData.countryCode || profileData.country?.toLowerCase() || 'us',
          ratings: {
            rapid: statsData?.rapid?.rating || 800,
            blitz: statsData?.blitz?.rating || 800,
            bullet: statsData?.bullet?.rating || 800,
          },
          stats: statsData,
          lastSyncedAt: new Date().toISOString(),
        };
        setSyncedChessCom(accountData);

        // Sync with user's Firestore document so it stays attached across devices
        if (user && !user.isAnonymous) {
          FirestoreService.saveUserSyncedAccounts(user.uid, {
            chessCom: accountData,
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to save synced Chess.com profile:', e);
      }
    },
    [user]
  );

  const clearSyncedChessCom = useCallback(() => {
    try {
      localStorage.removeItem('chess_com_profile');
      localStorage.removeItem('chess_com_stats');
      localStorage.removeItem('chess_com_imported_games');
      setSyncedChessCom(null);
      if (user && !user.isAnonymous) {
        FirestoreService.saveUserSyncedAccounts(user.uid, {
          chessCom: null,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to clear synced profile:', e);
    }
  }, [user]);

  const saveSyncedLichess = useCallback(
    (profileData: any, statsData?: any) => {
      try {
        const lichessAccount: SyncedLichessAccount = {
          username: profileData.username,
          avatar: profileData.avatar,
          country: profileData.country,
          title: profileData.title,
          ratings: {
            rapid: profileData.perfs?.rapid?.rating || 1500,
            blitz: profileData.perfs?.blitz?.rating || 1500,
            bullet: profileData.perfs?.bullet?.rating || 1500,
            classical: profileData.perfs?.classical?.rating,
            puzzles: profileData.perfs?.puzzle?.rating,
          },
          stats: statsData || profileData.count,
          lastSyncedAt: new Date().toISOString(),
        };
        localStorage.setItem('lichess_profile', JSON.stringify(lichessAccount));
        setSyncedLichess(lichessAccount);

        if (user && !user.isAnonymous) {
          FirestoreService.saveUserSyncedAccounts(user.uid, {
            lichess: lichessAccount,
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Failed to save synced Lichess profile:', e);
      }
    },
    [user]
  );

  const clearSyncedLichess = useCallback(() => {
    try {
      localStorage.removeItem('lichess_profile');
      setSyncedLichess(null);
      if (user && !user.isAnonymous) {
        FirestoreService.saveUserSyncedAccounts(user.uid, {
          lichess: null,
        }).catch(() => {});
      }
    } catch (e) {
      console.warn('Failed to clear synced Lichess profile:', e);
    }
  }, [user]);

  // Sync with Firebase Auth state on mount & auto-hydrate external accounts from Firestore
  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        XpSystem.syncWithFirestore(firebaseUser.uid).catch(() => {});
        const prof = await AuthService.getUserProfile(firebaseUser.uid);
        if (prof) {
          setProfile(prof);

          // Auto-hydrate synced external accounts from Firestore across any device
          if (prof.syncedAccounts?.chessCom) {
            setSyncedChessCom(prof.syncedAccounts.chessCom);
            try {
              localStorage.setItem('chess_com_profile', JSON.stringify(prof.syncedAccounts.chessCom));
              if (prof.syncedAccounts.chessCom.stats) {
                localStorage.setItem('chess_com_stats', JSON.stringify(prof.syncedAccounts.chessCom.stats));
              }
            } catch {}
          }
          if (prof.syncedAccounts?.lichess) {
            setSyncedLichess(prof.syncedAccounts.lichess);
            try {
              localStorage.setItem('lichess_profile', JSON.stringify(prof.syncedAccounts.lichess));
            } catch {}
          }
        } else {
          // Default profile if Firestore is newly provisioning
          setProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Player',
            avatar: firebaseUser.photoURL || '♟️',
            tier: 'diamond',
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
            isAnonymous: firebaseUser.isAnonymous,
            ratings: { rapid: 800, blitz: 800, bullet: 800, daily: 800, puzzles: 800, puzzleRush: 0 },
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

  // Separation of Concerns: In-app Checkmate account values remain independent
  const effectiveDisplayName =
    profile?.displayName ||
    user?.displayName ||
    (user?.isAnonymous ? 'Guest Player' : 'Player');

  // Official Chess Rating: strictly sourced from synced Chess.com or Lichess account
  // In-app progression is measured through the XP & League system, eliminating fake in-app Elo.
  const isSynced = Boolean(syncedChessCom || syncedLichess);
  const syncedPlatform: 'chesscom' | 'lichess' | null = syncedChessCom
    ? 'chesscom'
    : syncedLichess
    ? 'lichess'
    : null;

  const effectiveRating: number | null =
    syncedChessCom?.ratings?.rapid ||
    syncedLichess?.ratings?.rapid ||
    syncedChessCom?.ratings?.blitz ||
    syncedLichess?.ratings?.blitz ||
    null;

  const effectiveAvatar =
    profile?.avatar ||
    user?.photoURL ||
    '♟️';

  const effectiveCountry =
    profile?.country ||
    'us';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        syncedChessCom,
        syncedLichess,
        effectiveDisplayName,
        effectiveRating,
        isSynced,
        syncedPlatform,
        effectiveAvatar,
        effectiveCountry,
        tier,
        loading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
        saveSyncedChessCom,
        clearSyncedChessCom,
        saveSyncedLichess,
        clearSyncedLichess,
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
