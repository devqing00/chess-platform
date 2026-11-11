'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BoardTheme,
  PieceTheme,
  SoundTheme,
  MembershipTier,
  AnalysisEngineMode,
  EngineStrengthTier,
  MoveInputMode,
  BoardCoordinatesMode,
  PieceNotationMode,
  PieceAnimationSpeed,
  CastlingMethod,
  AnalysisEngineType,
  AnalysisMaxTime,
} from '@/types/chess';
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
  premoveEnabled: boolean;
  setPremoveEnabled: (enabled: boolean) => void;

  // Tailored Settings Additions
  boardCoordinates: BoardCoordinatesMode;
  setBoardCoordinates: (mode: BoardCoordinatesMode) => void;
  pieceNotation: PieceNotationMode;
  setPieceNotation: (mode: PieceNotationMode) => void;
  pieceAnimations: PieceAnimationSpeed;
  setPieceAnimations: (speed: PieceAnimationSpeed) => void;
  highlightLastMove: boolean;
  setHighlightLastMove: (enabled: boolean) => void;
  showLegalMoves: boolean;
  setShowLegalMoves: (enabled: boolean) => void;
  whiteAlwaysOnBottom: boolean;
  setWhiteAlwaysOnBottom: (enabled: boolean) => void;
  castlingMethod: CastlingMethod;
  setCastlingMethod: (method: CastlingMethod) => void;
  analysisEngineType: AnalysisEngineType;
  setAnalysisEngineType: (type: AnalysisEngineType) => void;
  analysisMaxTime: AnalysisMaxTime;
  setAnalysisMaxTime: (time: AnalysisMaxTime) => void;
  analysisMultiPv: number;
  setAnalysisMultiPv: (lines: number) => void;
  showcaseOpponentTheme: boolean;
  setShowcaseOpponentTheme: (enabled: boolean) => void;
  gameResultAnimations: boolean;
  setGameResultAnimations: (enabled: boolean) => void;

  isSettingsOpen: boolean;
  openSettings: (initialTab?: 'board' | 'play' | 'analysis' | 'alerts' | any) => void;
  closeSettings: () => void;
  settingsInitialTab?: 'board' | 'play' | 'analysis' | 'alerts';
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
  const [premoveEnabled, setPremoveEnabledState] = useState<boolean>(false);

  // Tailored Settings State
  const [boardCoordinates, setBoardCoordinatesState] = useState<BoardCoordinatesMode>('inside');
  const [pieceNotation, setPieceNotationState] = useState<PieceNotationMode>('figurine');
  const [pieceAnimations, setPieceAnimationsState] = useState<PieceAnimationSpeed>('medium');
  const [highlightLastMove, setHighlightLastMoveState] = useState<boolean>(true);
  const [showLegalMoves, setShowLegalMovesState] = useState<boolean>(true);
  const [whiteAlwaysOnBottom, setWhiteAlwaysOnBottomState] = useState<boolean>(false);
  const [castlingMethod, setCastlingMethodState] = useState<CastlingMethod>('normal');
  const [analysisEngineType, setAnalysisEngineTypeState] = useState<AnalysisEngineType>('stockfish_wasm');
  const [analysisMaxTime, setAnalysisMaxTimeState] = useState<AnalysisMaxTime>('3s');
  const [analysisMultiPv, setAnalysisMultiPvState] = useState<number>(1);
  const [showcaseOpponentTheme, setShowcaseOpponentThemeState] = useState<boolean>(true);
  const [gameResultAnimations, setGameResultAnimationsState] = useState<boolean>(true);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'board' | 'play' | 'analysis' | 'alerts'>('board');

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

      const savedPremove = localStorage.getItem('chess_pref_premove_enabled');
      if (savedPremove !== null) {
        setPremoveEnabledState(savedPremove === 'true');
      }

      const savedCoords = localStorage.getItem('chess_pref_board_coords') as BoardCoordinatesMode | null;
      if (savedCoords) setBoardCoordinatesState(savedCoords);

      const savedNotation = localStorage.getItem('chess_pref_piece_notation') as PieceNotationMode | null;
      if (savedNotation) setPieceNotationState(savedNotation);

      const savedAnim = localStorage.getItem('chess_pref_piece_anim') as PieceAnimationSpeed | null;
      if (savedAnim) setPieceAnimationsState(savedAnim);

      const savedHighlight = localStorage.getItem('chess_pref_highlight_last_move');
      if (savedHighlight !== null) setHighlightLastMoveState(savedHighlight === 'true');

      const savedLegal = localStorage.getItem('chess_pref_show_legal_moves');
      if (savedLegal !== null) setShowLegalMovesState(savedLegal === 'true');

      const savedBottom = localStorage.getItem('chess_pref_white_always_bottom');
      if (savedBottom !== null) setWhiteAlwaysOnBottomState(savedBottom === 'true');

      const savedCastling = localStorage.getItem('chess_pref_castling_method') as CastlingMethod | null;
      if (savedCastling) setCastlingMethodState(savedCastling);

      const savedEngType = localStorage.getItem('chess_pref_analysis_engine_type') as AnalysisEngineType | null;
      if (savedEngType) setAnalysisEngineTypeState(savedEngType);

      const savedMaxTime = localStorage.getItem('chess_pref_analysis_max_time') as AnalysisMaxTime | null;
      if (savedMaxTime) setAnalysisMaxTimeState(savedMaxTime);

      const savedPv = localStorage.getItem('chess_pref_analysis_multipv');
      if (savedPv) setAnalysisMultiPvState(Number(savedPv) || 1);

      const savedShowOpp = localStorage.getItem('chess_pref_showcase_opp_theme');
      if (savedShowOpp !== null) setShowcaseOpponentThemeState(savedShowOpp === 'true');

      const savedResAnim = localStorage.getItem('chess_pref_game_result_anims');
      if (savedResAnim !== null) setGameResultAnimationsState(savedResAnim === 'true');
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

  const setPremoveEnabled = (enabled: boolean) => {
    setPremoveEnabledState(enabled);
    try {
      localStorage.setItem('chess_pref_premove_enabled', String(enabled));
    } catch {}
  };

  const setBoardCoordinates = (mode: BoardCoordinatesMode) => {
    setBoardCoordinatesState(mode);
    try {
      localStorage.setItem('chess_pref_board_coords', mode);
    } catch {}
  };

  const setPieceNotation = (mode: PieceNotationMode) => {
    setPieceNotationState(mode);
    try {
      localStorage.setItem('chess_pref_piece_notation', mode);
    } catch {}
  };

  const setPieceAnimations = (speed: PieceAnimationSpeed) => {
    setPieceAnimationsState(speed);
    try {
      localStorage.setItem('chess_pref_piece_anim', speed);
    } catch {}
  };

  const setHighlightLastMove = (enabled: boolean) => {
    setHighlightLastMoveState(enabled);
    try {
      localStorage.setItem('chess_pref_highlight_last_move', String(enabled));
    } catch {}
  };

  const setShowLegalMoves = (enabled: boolean) => {
    setShowLegalMovesState(enabled);
    try {
      localStorage.setItem('chess_pref_show_legal_moves', String(enabled));
    } catch {}
  };

  const setWhiteAlwaysOnBottom = (enabled: boolean) => {
    setWhiteAlwaysOnBottomState(enabled);
    try {
      localStorage.setItem('chess_pref_white_always_bottom', String(enabled));
    } catch {}
  };

  const setCastlingMethod = (method: CastlingMethod) => {
    setCastlingMethodState(method);
    try {
      localStorage.setItem('chess_pref_castling_method', method);
    } catch {}
  };

  const setAnalysisEngineType = (type: AnalysisEngineType) => {
    setAnalysisEngineTypeState(type);
    try {
      localStorage.setItem('chess_pref_analysis_engine_type', type);
    } catch {}
  };

  const setAnalysisMaxTime = (time: AnalysisMaxTime) => {
    setAnalysisMaxTimeState(time);
    try {
      localStorage.setItem('chess_pref_analysis_max_time', time);
    } catch {}
  };

  const setAnalysisMultiPv = (lines: number) => {
    setAnalysisMultiPvState(lines);
    try {
      localStorage.setItem('chess_pref_analysis_multipv', String(lines));
    } catch {}
  };

  const setShowcaseOpponentTheme = (enabled: boolean) => {
    setShowcaseOpponentThemeState(enabled);
    try {
      localStorage.setItem('chess_pref_showcase_opp_theme', String(enabled));
    } catch {}
  };

  const setGameResultAnimations = (enabled: boolean) => {
    setGameResultAnimationsState(enabled);
    try {
      localStorage.setItem('chess_pref_game_result_anims', String(enabled));
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
        premoveEnabled,
        setPremoveEnabled,

        boardCoordinates,
        setBoardCoordinates,
        pieceNotation,
        setPieceNotation,
        pieceAnimations,
        setPieceAnimations,
        highlightLastMove,
        setHighlightLastMove,
        showLegalMoves,
        setShowLegalMoves,
        whiteAlwaysOnBottom,
        setWhiteAlwaysOnBottom,
        castlingMethod,
        setCastlingMethod,
        analysisEngineType,
        setAnalysisEngineType,
        analysisMaxTime,
        setAnalysisMaxTime,
        analysisMultiPv,
        setAnalysisMultiPv,
        showcaseOpponentTheme,
        setShowcaseOpponentTheme,
        gameResultAnimations,
        setGameResultAnimations,

        isSettingsOpen,
        openSettings: (initialTab?: 'board' | 'play' | 'analysis' | 'alerts' | any) => {
          if (typeof initialTab === 'string' && ['board', 'play', 'analysis', 'alerts'].includes(initialTab)) {
            setSettingsInitialTab(initialTab as any);
          }
          setIsSettingsOpen(true);
        },
        closeSettings: () => setIsSettingsOpen(false),
        settingsInitialTab,
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

export const useSafeShell = () => {
  return useContext(ShellContext);
};
