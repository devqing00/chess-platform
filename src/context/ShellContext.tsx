'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BoardTheme, PieceTheme, SoundTheme, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';

interface ShellContextType {
  boardTheme: BoardTheme;
  setBoardTheme: (theme: BoardTheme) => void;
  pieceTheme: PieceTheme;
  setPieceTheme: (theme: PieceTheme) => void;
  soundTheme: SoundTheme;
  setSoundTheme: (theme: SoundTheme) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  membershipTier: MembershipTier;
  setMembershipTier: (tier: MembershipTier) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isMembershipOpen: boolean;
  openMembership: () => void;
  closeMembership: () => void;
  isChessComSyncOpen: boolean;
  openChessComSync: () => void;
  closeChessComSync: () => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export const ShellProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>('green');
  const [pieceTheme, setPieceThemeState] = useState<PieceTheme>('neo');
  const [soundTheme, setSoundThemeState] = useState<SoundTheme>('classic');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('diamond');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isChessComSyncOpen, setIsChessComSyncOpen] = useState(false);

  // Restore preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedBoard = localStorage.getItem('chess_pref_board_theme') as BoardTheme | null;
      if (savedBoard) setBoardThemeState(savedBoard);

      const savedPiece = localStorage.getItem('chess_pref_piece_theme') as PieceTheme | null;
      if (savedPiece) setPieceThemeState(savedPiece);

      const savedSound = localStorage.getItem('chess_pref_sound_theme') as SoundTheme | null;
      if (savedSound) {
        setSoundThemeState(savedSound);
        soundService.setTheme(savedSound);
      }

      const savedMute = localStorage.getItem('chess_pref_sound_enabled');
      if (savedMute !== null) {
        const en = savedMute === 'true';
        setSoundEnabledState(en);
        soundService.setEnabled(en);
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const setBoardTheme = (t: BoardTheme) => {
    setBoardThemeState(t);
    try {
      localStorage.setItem('chess_pref_board_theme', t);
    } catch {}
  };

  const setPieceTheme = (t: PieceTheme) => {
    setPieceThemeState(t);
    try {
      localStorage.setItem('chess_pref_piece_theme', t);
    } catch {}
  };

  const setSoundTheme = (t: SoundTheme) => {
    setSoundThemeState(t);
    soundService.setTheme(t);
    try {
      localStorage.setItem('chess_pref_sound_theme', t);
    } catch {}
  };

  const setSoundEnabled = (en: boolean) => {
    setSoundEnabledState(en);
    soundService.setEnabled(en);
    try {
      localStorage.setItem('chess_pref_sound_enabled', String(en));
    } catch {}
  };

  return (
    <ShellContext.Provider
      value={{
        boardTheme,
        setBoardTheme,
        pieceTheme,
        setPieceTheme,
        soundTheme,
        setSoundTheme,
        soundEnabled,
        setSoundEnabled,
        membershipTier,
        setMembershipTier,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        isMembershipOpen,
        openMembership: () => setIsMembershipOpen(true),
        closeMembership: () => setIsMembershipOpen(false),
        isChessComSyncOpen,
        openChessComSync: () => setIsChessComSyncOpen(true),
        closeChessComSync: () => setIsChessComSyncOpen(false),
      }}
    >
      {children}
    </ShellContext.Provider>
  );
};

export const useShell = () => {
  const context = useContext(ShellContext);
  if (!context) {
    throw new Error('useShell must be used within a ShellProvider');
  }
  return context;
};
