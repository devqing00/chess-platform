'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BoardTheme, PieceTheme, SoundTheme, MembershipTier, AnalysisEngineMode, EngineStrengthTier, MoveInputMode } from '@/types/chess';
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
  analysisEngine: AnalysisEngineMode;
  setAnalysisEngine: (engine: AnalysisEngineMode) => void;
  engineStrength: EngineStrengthTier;
  setEngineStrength: (strength: EngineStrengthTier) => void;
  moveInputMode: MoveInputMode;
  setMoveInputMode: (mode: MoveInputMode) => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  isMembershipOpen: boolean;
  openMembership: () => void;
  closeMembership: () => void;
  isChessComSyncOpen: boolean;
  openChessComSync: () => void;
  closeChessComSync: () => void;
  activeMentorId: string;
  setActiveMentorId: (id: string) => void;
}

const ShellContext = createContext<ShellContextType | undefined>(undefined);

export const ShellProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [boardTheme, setBoardThemeState] = useState<BoardTheme>('green');
  const [pieceTheme, setPieceThemeState] = useState<PieceTheme>('neo');
  const [soundTheme, setSoundThemeState] = useState<SoundTheme>('classic');
  const [soundEnabled, setSoundEnabledState] = useState<boolean>(true);
  const [membershipTier, setMembershipTier] = useState<MembershipTier>('diamond');
  const [activeMentorId, setActiveMentorIdState] = useState<string>('coach-danny');
  const [analysisEngine, setAnalysisEngineState] = useState<AnalysisEngineMode>('torch_human');
  const [engineStrength, setEngineStrengthState] = useState<EngineStrengthTier>('fast');
  const [moveInputMode, setMoveInputModeState] = useState<MoveInputMode>('both');

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

      const savedMentor = localStorage.getItem('chess_active_mentor');
      if (savedMentor) {
        setActiveMentorIdState(savedMentor);
      }

      const savedEngine = localStorage.getItem('chess_pref_analysis_engine') as AnalysisEngineMode | null;
      if (savedEngine === 'torch_human' || savedEngine === 'stockfish') {
        setAnalysisEngineState(savedEngine);
      }

      const savedStrength = localStorage.getItem('chess_pref_engine_strength') as EngineStrengthTier | null;
      if (savedStrength === 'fast' || savedStrength === 'standard' || savedStrength === 'deep' || savedStrength === 'maximum') {
        setEngineStrengthState(savedStrength);
      }

      const savedMoveInput = localStorage.getItem('chess_pref_move_input_mode') as MoveInputMode | null;
      if (savedMoveInput === 'both' || savedMoveInput === 'drag' || savedMoveInput === 'click') {
        setMoveInputModeState(savedMoveInput);
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

  const setActiveMentorId = (id: string) => {
    setActiveMentorIdState(id);
    try {
      localStorage.setItem('chess_active_mentor', id);
    } catch {}
  };

  const setAnalysisEngine = (engine: AnalysisEngineMode) => {
    setAnalysisEngineState(engine);
    try {
      localStorage.setItem('chess_pref_analysis_engine', engine);
    } catch {}
  };

  const setEngineStrength = (strength: EngineStrengthTier) => {
    setEngineStrengthState(strength);
    try {
      localStorage.setItem('chess_pref_engine_strength', strength);
    } catch {}
  };

  const setMoveInputMode = (mode: MoveInputMode) => {
    setMoveInputModeState(mode);
    try {
      localStorage.setItem('chess_pref_move_input_mode', mode);
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
        analysisEngine,
        setAnalysisEngine,
        engineStrength,
        setEngineStrength,
        moveInputMode,
        setMoveInputMode,
        isSettingsOpen,
        openSettings: () => setIsSettingsOpen(true),
        closeSettings: () => setIsSettingsOpen(false),
        isMembershipOpen,
        openMembership: () => setIsMembershipOpen(true),
        closeMembership: () => setIsMembershipOpen(false),
        isChessComSyncOpen,
        openChessComSync: () => setIsChessComSyncOpen(true),
        closeChessComSync: () => setIsChessComSyncOpen(false),
        activeMentorId,
        setActiveMentorId,
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
