'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AuthService } from '@/lib/firebase/authService';
import { UserProfile } from '@/lib/firebase/types';
import { MembershipTier } from '@/types/chess';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  tier: MembershipTier;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
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
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync with Firebase Auth state on mount
  useEffect(() => {
    const unsubscribe = AuthService.onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        tier,
        loading,
        isAuthModalOpen,
        openAuthModal: () => setIsAuthModalOpen(true),
        closeAuthModal: () => setIsAuthModalOpen(false),
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
