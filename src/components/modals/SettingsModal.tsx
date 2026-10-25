'use client';

import React, { useState, useRef } from 'react';
import {
  BoardTheme,
  PieceTheme,
  SoundTheme,
  LowTimeRegister,
  SoundPreset,
  AudioSettings,
} from '@/types/chess';
import { soundService } from '@/lib/audioService';
import {
  X,
  Volume2,
  Palette,
  Check,
  Bell,
  Sliders,
  Eye,
  RefreshCw,
  Globe,
  Unlink,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Bot,
  Flame,
  Cpu,
  CheckCircle2,
  Zap,
  Download,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { MENTORS, getMentorById, generateMentorComment } from '@/lib/mentorsData';
import { MentorAvatar } from '@/components/analysis/MentorAvatar';
import { PieceIcon } from '@/components/board/PieceIcons';
import { Button } from '@/components/ui/button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardTheme: BoardTheme;
  onChangeBoardTheme: (theme: BoardTheme) => void;
  pieceTheme: PieceTheme;
  onChangePieceTheme: (theme: PieceTheme) => void;
  soundTheme: SoundTheme;
  onChangeSoundTheme: (theme: SoundTheme) => void;
  soundEnabled: boolean;
  onToggleSound: (enabled: boolean) => void;
  onOpenChessComSync?: () => void;
  onOpenPwaInstall?: () => void;
  isPwaInstalled?: boolean;
}

type TabType = 'accounts' | 'board' | 'audio' | 'mentors' | 'accessibility';

interface TabSnapshot {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  soundTheme: SoundTheme;
  soundEnabled: boolean;
  activeMentorId: string;
  lowTimeRegister: LowTimeRegister;
  lowTimeThresholdSeconds: number;
  premoveEnabled: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  boardTheme,
  onChangeBoardTheme,
  pieceTheme,
  onChangePieceTheme,
  soundTheme,
  onChangeSoundTheme,
  soundEnabled,
  onToggleSound,
  onOpenChessComSync,
  onOpenPwaInstall,
  isPwaInstalled,
}) => {
  const { syncedChessCom, clearSyncedChessCom } = useAuth();
  const { activeMentorId, setActiveMentorId, analysisEngine, setAnalysisEngine, moveInputMode, setMoveInputMode, premoveEnabled, setPremoveEnabled } = useShell();

  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    soundService.getSettings()
  );
  const [previewingMentorQuote, setPreviewingMentorQuote] = useState<string | null>(null);
  const [commentaryDepth, setCommentaryDepth] = useState<'concise' | 'balanced' | 'deep'>(() => {
    try {
      return (localStorage.getItem('chess_mentor_depth') as any) || 'balanced';
    } catch {
      return 'balanced';
    }
  });

  // Tab switch confirmation state
  const [pendingTabSwitch, setPendingTabSwitch] = useState<TabType | null>(null);
  const [tabChangesList, setTabChangesList] = useState<string[]>([]);

  // Action confirmation modal state
  const [actionConfirm, setActionConfirm] = useState<{
    type: 'disconnect' | 'reset_settings' | 'clear_history';
    title: string;
    message: string;
    confirmText: string;
    isDanger?: boolean;
  } | null>(null);

  // Snapshot of values when entering the active tab
  const tabSnapshotRef = useRef<TabSnapshot>({
    boardTheme,
    pieceTheme,
    soundTheme,
    soundEnabled,
    activeMentorId,
    lowTimeRegister: audioSettings.lowTimeRegister,
    lowTimeThresholdSeconds: audioSettings.lowTimeThresholdSeconds,
    premoveEnabled,
  });

  if (!isOpen) return null;

  const boardThemes: { id: BoardTheme; name: string; light: string; dark: string; tag?: string }[] = [
    { id: 'green', name: 'Classic Green', light: '#ebecd0', dark: '#779556' },
    { id: 'wood', name: 'Walnut Wood', light: '#e4c590', dark: '#a36d39' },
    { id: 'glass', name: 'Glass & Ice', light: '#d9e7f4', dark: '#5b82a6' },
    { id: 'neon', name: 'Cyber Neon', light: '#263345', dark: '#151e2b' },
    { id: 'marble', name: 'Minimal Marble', light: '#e5e5e5', dark: '#737373' },
    { id: 'arcade', name: '8-Bit Arcade', light: '#a8b98b', dark: '#547343' },
    {
      id: 'high_contrast',
      name: 'High Contrast (B&W)',
      light: '#ffffff',
      dark: '#111827',
      tag: 'WCAG 2.2 AA',
    },
    {
      id: 'low_vision_amber',
      name: 'Low-Vision Amber',
      light: '#fef3c7',
      dark: '#b45309',
      tag: 'Accessibility',
    },
  ];

  const pieceThemes: { id: PieceTheme; name: string; desc: string }[] = [
    { id: 'neo', name: 'Neo Vector', desc: 'Sleek, modern vectorized competition pieces' },
    { id: '8bit', name: '8-Bit Arcade', desc: 'Charming pixelated retro sprites with crisp contours' },
    { id: 'staunton', name: 'Tournament Wood', desc: 'Warm polished golden boxwood and dark walnut' },
    { id: 'vinyl', name: 'Modern Vinyl', desc: 'Matte ivory porcelain and sleek obsidian vinyl' },
    { id: 'glass', name: 'Crystal Glass', desc: 'Luminous frosted ice and smoked obsidian glass' },
    { id: 'alpha', name: 'Alpha Minimal', desc: 'Crisp high-legibility minimalist outlines' },
  ];

  const soundThemes: { id: SoundTheme; name: string; desc: string }[] = [
    { id: 'classic', name: 'Check.mate Classic', desc: 'Tactile woody piece contacts & snappy captures.' },
    { id: 'duolingo', name: 'Duolingo Playful', desc: 'Bouncy pop sounds, sparkling chimes & celebratory fanfare.' },
    { id: 'wood', name: 'Heavy Oak', desc: 'Rich acoustic resonant wood impacts.' },
    { id: 'marble', name: 'Smooth Marble', desc: 'Polished stone clicks and crisp clinks.' },
    { id: 'arcade', name: '8-Bit Arcade', desc: 'Retro electronic chip synths and blips.' },
    { id: 'silman', name: 'Silman Minimal', desc: 'Soft ergonomic low-fatigue acoustic taps.' },
  ];

  // Helper to evaluate what changed in current tab compared to snapshot
  const computeCurrentTabChanges = (tab: TabType): string[] => {
    const snap = tabSnapshotRef.current;
    const diffs: string[] = [];

    if (tab === 'board') {
      if (boardTheme !== snap.boardTheme) {
        const tName = boardThemes.find((b) => b.id === boardTheme)?.name || boardTheme;
        diffs.push(`Board Material changed to ${tName}`);
      }
      if (pieceTheme !== snap.pieceTheme) {
        const pName = pieceThemes.find((p) => p.id === pieceTheme)?.name || pieceTheme;
        diffs.push(`Piece Set changed to ${pName}`);
      }
      if (premoveEnabled !== snap.premoveEnabled) {
        diffs.push(`Premoves ${premoveEnabled ? 'Enabled' : 'Disabled'}`);
      }
    } else if (tab === 'audio') {
      if (soundTheme !== snap.soundTheme) {
        const sName = soundThemes.find((s) => s.id === soundTheme)?.name || soundTheme;
        diffs.push(`Sound SFX Theme changed to ${sName}`);
      }
      if (soundEnabled !== snap.soundEnabled) {
        diffs.push(`Sound ${soundEnabled ? 'Enabled' : 'Muted'}`);
      }
      if (audioSettings.lowTimeRegister !== snap.lowTimeRegister) {
        diffs.push(`Low-Time Alert Tone changed to ${audioSettings.lowTimeRegister}`);
      }
      if (audioSettings.lowTimeThresholdSeconds !== snap.lowTimeThresholdSeconds) {
        diffs.push(`Alert Threshold set to ≤ ${audioSettings.lowTimeThresholdSeconds}s`);
      }
    } else if (tab === 'mentors') {
      if (activeMentorId !== snap.activeMentorId) {
        const m = getMentorById(activeMentorId);
        diffs.push(`AI Mentor changed to ${m.name}`);
      }
    }

    return diffs;
  };

  const updateSnapshot = () => {
    tabSnapshotRef.current = {
      boardTheme,
      pieceTheme,
      soundTheme,
      soundEnabled,
      activeMentorId,
      lowTimeRegister: audioSettings.lowTimeRegister,
      lowTimeThresholdSeconds: audioSettings.lowTimeThresholdSeconds,
      premoveEnabled,
    };
  };

  // Tab click handler with change confirmation
  const handleRequestTabSwitch = (newTab: TabType) => {
    if (newTab === activeTab) return;

    const changes = computeCurrentTabChanges(activeTab);
    if (changes.length > 0) {
      setTabChangesList(changes);
      setPendingTabSwitch(newTab);
    } else {
      setActiveTab(newTab);
      updateSnapshot();
    }
  };

  const handleConfirmTabSwitch = () => {
    if (pendingTabSwitch) {
      updateSnapshot();
      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
      setTabChangesList([]);
    }
  };

  const handleRevertTabSwitch = () => {
    if (pendingTabSwitch) {
      const snap = tabSnapshotRef.current;
      if (activeTab === 'board') {
        onChangeBoardTheme(snap.boardTheme);
        onChangePieceTheme(snap.pieceTheme);
        setPremoveEnabled(snap.premoveEnabled);
      } else if (activeTab === 'audio') {
        onChangeSoundTheme(snap.soundTheme);
        onToggleSound(snap.soundEnabled);
        soundService.updateSettings({
          lowTimeRegister: snap.lowTimeRegister,
          lowTimeThresholdSeconds: snap.lowTimeThresholdSeconds,
        });
        setAudioSettings(soundService.getSettings());
      } else if (activeTab === 'mentors') {
        setActiveMentorId(snap.activeMentorId);
      }

      setActiveTab(pendingTabSwitch);
      setPendingTabSwitch(null);
      setTabChangesList([]);
      updateSnapshot();
    }
  };

  const updateAudio = (partial: Partial<AudioSettings>) => {
    soundService.updateSettings(partial);
    setAudioSettings(soundService.getSettings());
  };

  const handleApplyPreset = (preset: SoundPreset) => {
    soundService.applyPreset(preset);
    setAudioSettings(soundService.getSettings());
  };

  const handleExecuteConfirmedAction = () => {
    if (!actionConfirm) return;
    if (actionConfirm.type === 'disconnect') {
      clearSyncedChessCom();
    } else if (actionConfirm.type === 'reset_settings') {
      onChangeBoardTheme('green');
      onChangePieceTheme('neo');
      onChangeSoundTheme('classic');
      onToggleSound(true);
      setActiveMentorId('coach-danny');
      setPremoveEnabled(false);
      soundService.applyPreset('casual');
      setAudioSettings(soundService.getSettings());
      updateSnapshot();
    } else if (actionConfirm.type === 'clear_history') {
      try {
        localStorage.removeItem('chess_match_sessions');
        localStorage.removeItem('chess_recent_game');
      } catch {}
    }
    setActionConfirm(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#1e1c19] border-2 border-[#35322b] rounded-3xl shadow-[0_12px_0_0_#141311] overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh] relative my-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#262421] border-b-2 border-[#35322b] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-950" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-black text-white block truncate">Platform Preferences</span>
              <span className="text-[10px] sm:text-[11px] text-emerald-400 font-black flex items-center gap-1">
                <Check className="w-3.5 h-3.5 stroke-[3]" /> Live auto-saved preferences
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="icon-sm"
            rounded="full"
            onClick={() => {
              updateSnapshot();
              onClose();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#191815] border-b-2 border-[#35322b] px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-black overflow-x-auto no-scrollbar scroll-smooth gap-1.5 sm:gap-2 shrink-0">
          {[
            { id: 'accounts' as const, label: 'Accounts', icon: Globe },
            { id: 'board' as const, label: 'Board & Pieces', icon: Palette },
            { id: 'audio' as const, label: 'Audio', icon: Volume2 },
            { id: 'mentors' as const, label: 'AI Mentors', icon: Bot },
            { id: 'accessibility' as const, label: 'Accessibility', icon: Eye },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleRequestTabSwitch(tab.id)}
                className={`tactile-btn px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap select-none ${
                  isActive
                    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#22201d]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* TAB 1: BOARD & PIECES */}
          {activeTab === 'board' && (
            <div className="space-y-6">
              {/* Board Themes */}
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
                  Board Material & Palette
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {boardThemes.map((theme) => {
                    const isSel = boardTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        onClick={() => onChangeBoardTheme(theme.id)}
                        className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2926] border-emerald-500 shadow-[0_4px_0_0_#065f46]'
                            : 'bg-[#21201d] border-[#35322b] hover:border-[#4d483f] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px]'
                        }`}
                      >
                        <div className="grid grid-cols-2 grid-rows-2 w-12 h-12 rounded-xl border-2 border-black/40 overflow-hidden shadow">
                          <div style={{ backgroundColor: theme.light }} />
                          <div style={{ backgroundColor: theme.dark }} />
                          <div style={{ backgroundColor: theme.dark }} />
                          <div style={{ backgroundColor: theme.light }} />
                        </div>
                        <span className="text-xs font-black text-zinc-200 text-center">
                          {theme.name}
                        </span>
                        {theme.tag && (
                          <span className="text-[9px] font-black bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 px-2 py-0.5 rounded-full uppercase">
                            {theme.tag}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Piece Sets */}
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
                  Piece Set Design
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pieceThemes.map((pt) => {
                    const isSel = pieceTheme === pt.id;
                    return (
                      <button
                        key={pt.id}
                        onClick={() => onChangePieceTheme(pt.id)}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2926] border-emerald-600/80 shadow-[0_4px_0_0_#385a16]'
                            : 'bg-[#21201d] border-[#35322b] hover:border-[#4d483f] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-[#161512] border-2 border-[#35322b] flex items-center justify-center text-xl shrink-0 shadow-inner">
                            <PieceIcon type="n" color="w" theme={pt.id} />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{pt.name}</span>
                              {isSel && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                            </div>
                            <span className="text-[11px] text-zinc-400 font-medium block mt-0.5">{pt.desc}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Move Input Interaction Style */}
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
                  Piece Movement Input Method
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    {
                      id: 'both' as const,
                      name: 'Smart Both',
                      badge: 'Recommended',
                      desc: 'Click to select and place, or drag and drop seamlessly',
                      icon: '✨',
                    },
                    {
                      id: 'drag' as const,
                      name: 'Drag & Drop Only',
                      badge: 'Tactile',
                      desc: 'Pieces only move when dragged to destination',
                      icon: '🤏',
                    },
                    {
                      id: 'click' as const,
                      name: 'Click to Move Only',
                      badge: 'Precision',
                      desc: 'Click piece to select, click square to move',
                      icon: '👆',
                    },
                  ].map((mode) => {
                    const isSel = moveInputMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setMoveInputMode(mode.id)}
                        className={`p-3.5 rounded-2xl border-2 flex flex-col justify-between text-left transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2926] border-emerald-500 shadow-[0_4px_0_0_#065f46]'
                            : 'bg-[#21201d] border-[#35322b] hover:border-[#4d483f] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-base">{mode.icon}</span>
                            {mode.badge && (
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  isSel
                                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                    : 'bg-black/30 border-[#35322b] text-zinc-400'
                                }`}
                              >
                                {mode.badge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-white">{mode.name}</span>
                            {isSel && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                          </div>
                          <span className="text-[11px] text-zinc-400 font-medium block mt-1 leading-snug">
                            {mode.desc}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Premoves (Fast Competitive Speedplay) */}
              <div className="bg-[#24211d] p-5 rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
                        premoveEnabled
                          ? 'bg-gradient-to-b from-rose-500/25 to-rose-600/10 border-rose-500/40 text-rose-400'
                          : 'bg-[#181614] border-[#35322b] text-zinc-500'
                      }`}
                    >
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-white">Enable Premoves</h3>
                        <span
                          className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${
                            premoveEnabled
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {premoveEnabled ? 'Active' : 'Disabled (Default)'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-medium mt-0.5 max-w-md leading-relaxed">
                        Queue your move before your opponent finishes theirs. If legal when their turn ends, your premove executes in 0.0s without burning clock time.
                      </p>
                    </div>
                  </div>

                  {/* Tactile Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={premoveEnabled}
                    onClick={() => {
                      soundService.playTactilePop();
                      setPremoveEnabled(!premoveEnabled);
                    }}
                    className={`tactile-btn shrink-0 relative inline-flex h-7 w-13 items-center rounded-full transition-colors cursor-pointer border-2 ${
                      premoveEnabled
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/60 shadow-[0_2px_0_0_#065f46]'
                        : 'bg-[#181614] border-[#38352e] shadow-[0_2px_0_0_#141311]'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                        premoveEnabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 pt-2 border-t border-white/5">
                  <span>💡</span>
                  <span>Right-click anywhere on the board or press Escape to cancel a queued premove.</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & SOUND */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Audio Presets Bar */}
              <div className="bg-[#1f1d1a] p-4 rounded-2xl border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-black text-white block">Acoustic Gain Presets</span>
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Switch between tuned volume profiles for different environments.
                  </span>
                </div>
                <div className="flex gap-2">
                  {(['casual', 'focus', 'commentary'] as SoundPreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleApplyPreset(p)}
                      className={`tactile-btn px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        audioSettings.preset === p
                          ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                          : 'bg-[#23211e] border-2 border-[#35322b] text-zinc-400 hover:text-zinc-200 shadow-[0_2px_0_0_#141311]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Low-Time Warning Alert Engine */}
              <div className="bg-[#24211d] p-5 rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <Bell className="w-4 h-4 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-black text-white">
                      Low-Time Audible Alert Engine
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-black text-amber-300 bg-amber-400/20 px-3 py-0.5 rounded-full border border-amber-400/40">
                    Never Miss Time Scramble
                  </span>
                </div>

                {/* Tone Choices */}
                <div>
                  <label className="text-xs font-black text-zinc-400 uppercase tracking-wider block mb-2">
                    Acoustic Register Tone:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'tick', label: 'High Tick', desc: 'Mechanical high register' },
                      { id: 'shrill', label: 'Piercing Shrill', desc: 'Dual 1.2/2.4kHz harmonic' },
                      { id: 'beep', label: 'Digital Beep', desc: 'Electronic timer pulse' },
                      { id: 'voice', label: 'Voice Countdown', desc: 'Spoken speech seconds' },
                    ].map((reg) => {
                      const isSel = audioSettings.lowTimeRegister === reg.id;
                      return (
                        <button
                          key={reg.id}
                          onClick={() => {
                            updateAudio({ lowTimeRegister: reg.id as LowTimeRegister });
                            soundService.playLowTime(3);
                          }}
                          className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#2b2824] border-emerald-600/80 text-white shadow-[0_3px_0_0_#385a16]'
                              : 'bg-[#181614] border-[#35322b] text-zinc-400 hover:text-zinc-200 shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-zinc-100">{reg.label}</span>
                            {isSel && <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />}
                          </div>
                          <span className="text-[10px] text-zinc-400 font-medium line-clamp-1 mt-0.5">
                            {reg.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Threshold & Volume Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-black text-zinc-300 mb-2">
                      <span>Alert Threshold:</span>
                      <strong className="text-emerald-400 font-mono">
                        ≤ {audioSettings.lowTimeThresholdSeconds} Seconds
                      </strong>
                    </div>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => updateAudio({ lowTimeThresholdSeconds: sec })}
                          className={`tactile-btn flex-1 py-1.5 rounded-full text-xs font-black font-mono transition-all cursor-pointer ${
                            audioSettings.lowTimeThresholdSeconds === sec
                              ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                              : 'bg-[#181614] border-2 border-[#35322b] text-zinc-400 hover:text-white shadow-[0_2px_0_0_#141311]'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                      <span>Alert Volume:</span>
                      <strong className="text-emerald-400">
                        {Math.round(audioSettings.lowTimeVolume * 100)}%
                      </strong>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.05"
                      value={audioSettings.lowTimeVolume}
                      onChange={(e) => updateAudio({ lowTimeVolume: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Piece Contact SFX Theme */}
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-3">
                  Piece Contact SFX Theme
                </h3>
                <div className="space-y-2.5">
                  {soundThemes.map((st) => {
                    const isSel = soundTheme === st.id;
                    return (
                      <div
                        key={st.id}
                        onClick={() => {
                          onChangeSoundTheme(st.id);
                          soundService.setTheme(st.id);
                          soundService.playMove();
                        }}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2926] border-emerald-600/80 shadow-[0_3px_0_0_#385a16]'
                            : 'bg-[#21201d] border-[#35322b] hover:border-[#4d483f] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">{st.name}</span>
                            {isSel && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 font-medium mt-0.5">{st.desc}</p>
                        </div>

                        <Button
                          variant="secondary"
                          size="xs"
                          rounded="full"
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.setTheme(st.id);
                            soundService.playCapture();
                          }}
                        >
                          Sample
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI MENTORS */}
          {activeTab === 'mentors' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-1">
                  Active AI Mentor & Analysis Voice
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Select your personal chess coach. The chosen mentor dynamically guides you move-by-move in live matches and delivers personalized Game Reviews with their authentic tactical philosophy.
                </p>
              </div>

              {/* Mentor Roster */}
              <div className="grid grid-cols-1 gap-3">
                {MENTORS.map((m) => {
                  const isSel = activeMentorId === m.id;
                  const isPreviewing = previewingMentorQuote === m.id;

                  return (
                    <div
                      key={m.id}
                      onClick={() => setActiveMentorId(m.id)}
                      className={`p-4 rounded-3xl border-2 flex flex-col gap-3 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#272420] border-emerald-600/80 shadow-[0_4px_0_0_#385a16]'
                          : 'bg-[#1e1c19] border-[#35322b] hover:border-[#4d483f] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px]'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                          <div className="rounded-2xl border-2 border-[#35322b] overflow-hidden shadow-[0_2px_0_0_#141311]">
                            <MentorAvatar mentorId={m.id} size={56} />
                          </div>
                          {isSel && (
                            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white text-zinc-950 flex items-center justify-center shadow">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-white">{m.name}</span>
                              <span
                                className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full text-white border border-black/30 shadow-sm"
                                style={{ backgroundColor: m.accentColor }}
                              >
                                {m.title}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                soundService.playCheck();
                                setPreviewingMentorQuote(isPreviewing ? null : m.id);
                              }}
                              className="px-3 py-1 rounded-full bg-[#161512] hover:bg-[#25221d] text-[11px] font-black text-amber-400 border-2 border-amber-500/40 shadow-[0_2px_0_0_#78350f] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center gap-1.5 shrink-0 transition-all"
                            >
                              <span>🎙️</span>
                              <span>{isPreviewing ? 'Hide Sample' : 'Sample Advice'}</span>
                            </button>
                          </div>

                          <span className="text-xs text-amber-300 font-bold block mt-1 italic">
                            "{m.tagline}"
                          </span>
                          <p className="text-[11px] text-zinc-400 font-medium mt-1 line-clamp-2 leading-relaxed">
                            {m.bio}
                          </p>

                          {isSel && (
                            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                              <span>Active Coach in Live Games & Review</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Interactive Sample Advice Bubble */}
                      {isPreviewing && (
                        <div className="p-3.5 rounded-2xl bg-[#141311] border-2 border-amber-500/40 text-xs text-amber-200 shadow-[0_3px_0_0_#78350f] animate-in fade-in zoom-in-95 duration-150 flex items-start gap-2.5">
                          <span className="text-base shrink-0">💡</span>
                          <div className="flex-1">
                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider block mb-0.5">
                              {m.name}'s Commentary Sample:
                            </span>
                            <span className="italic leading-relaxed text-zinc-200 font-medium">
                              "{generateMentorComment(m.id, 'brilliant', 'Bxf7+', 'Bxf7+', 450)}"
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Commentary Depth Configuration */}
              <div className="pt-4 border-t-2 border-[#282622] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-zinc-200 block">Commentary Detail Level</span>
                    <span className="text-[11px] text-zinc-400 font-medium">Controls how in-depth your AI mentor analyzes candidate moves.</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: 'concise', label: 'Concise', desc: 'Punchy tactical alerts' },
                    { id: 'balanced', label: 'Balanced', desc: 'Standard coach guidance' },
                    { id: 'deep', label: 'Master Deep', desc: 'Candidate lines & concepts' },
                  ].map((lvl) => {
                    const isSelected = commentaryDepth === lvl.id;
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => {
                          setCommentaryDepth(lvl.id as any);
                          try {
                            localStorage.setItem('chess_mentor_depth', lvl.id);
                          } catch {}
                        }}
                        className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#282622] border-emerald-600/80 text-white shadow-[0_3px_0_0_#385a16]'
                            : 'bg-[#1b1916] border-[#35322b] text-zinc-400 hover:text-white shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                        }`}
                      >
                        <span className={`text-xs font-black block ${isSelected ? 'text-emerald-400' : ''}`}>
                          {lvl.label}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium mt-0.5 block leading-tight">
                          {lvl.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACCESSIBILITY */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#1f1d1a] p-5 rounded-3xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] space-y-4">
                <h4 className="font-black text-white text-sm">WCAG 2.2 AA Accessibility Features</h4>
                <p className="text-zinc-400 font-medium leading-relaxed">
                  Our chess platform provides full screen reader support, keyboard arrow navigation, and high-contrast themes out of the box.
                </p>

                <div className="space-y-3 pt-3 border-t-2 border-[#282622]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-black text-zinc-200 block">ARIA Grid Semantics</span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Every square outputs full piece & coordinate speech labels for screen readers.
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-500/40">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-[#262420]">
                    <div>
                      <span className="font-black text-zinc-200 block">Keyboard Navigation</span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Use Arrow Keys to traverse squares; press Space or Enter to select and place pieces.
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-500/40">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t-2 border-[#262420]">
                    <div>
                      <span className="font-black text-zinc-200 block">High-Contrast Theme</span>
                      <span className="text-[11px] text-zinc-500 font-medium">
                        Select 'High Contrast (B&W)' or 'Low-Vision Amber' in the Board Themes tab.
                      </span>
                    </div>
                    <button
                      onClick={() => onChangeBoardTheme('high_contrast')}
                      className="px-3.5 py-1.5 rounded-full bg-[#262420] hover:bg-[#322f29] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none text-white text-xs font-black cursor-pointer transition-all"
                    >
                      Enable Theme
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CONNECTED ACCOUNTS & DATA */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              {/* Progressive Web App (PWA) Card */}
              <div className="bg-[#24221e] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_4px_0_0_#141311] flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-lg shadow-inner">
                      <Download className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        Installable Web App (PWA)
                        <span
                          className={`text-[10px] ${
                            isPwaInstalled
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                          } border px-2.5 py-0.5 rounded-full font-black uppercase`}
                        >
                          {isPwaInstalled ? 'Installed' : 'Ready to Install'}
                        </span>
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {isPwaInstalled
                          ? 'Running in full-screen standalone mode with offline engine and sound caches active.'
                          : 'Install on iOS, Android, Mac, or Windows for full-screen gameplay and 0ms latency.'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onOpenPwaInstall}
                    className="px-4 py-2 rounded-xl bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30] text-zinc-950 font-black text-xs border-t border-white/35 border-x-emerald-600/30 border-b-emerald-950/40 shadow-[0_3px_0_0_#385a16] hover:brightness-105 active:translate-y-[2px] active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isPwaInstalled ? 'App Status' : 'Install App'}</span>
                  </button>
                </div>
              </div>

              {/* Check.mate Profile Sync Card */}
              <div className="bg-[#24221e] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_4px_0_0_#141311] flex flex-col gap-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-lg shadow-inner">
                      ♟️
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        Chess.com Profile Sync
                        {syncedChessCom && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-0.5 rounded-full font-black uppercase">
                            Connected
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        Sync your verified Chess.com ELO ratings, avatar, game archives, and match history.
                      </span>
                    </div>
                  </div>

                  {onOpenChessComSync && (
                    <Button
                      variant="primary"
                      size="sm"
                      rounded="full"
                      onClick={() => {
                        updateSnapshot();
                        onClose();
                        onOpenChessComSync();
                      }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{syncedChessCom ? 'Switch / Re-sync' : 'Connect Account'}</span>
                    </Button>
                  )}
                </div>

                {syncedChessCom && (
                  <div className="mt-1 p-3.5 bg-[#1a1815] rounded-2xl border-2 border-[#2b2824] flex items-center justify-between shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#272522] border-2 border-[#383530] overflow-hidden flex items-center justify-center text-sm font-black shrink-0 shadow">
                        {syncedChessCom.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={syncedChessCom.avatar}
                            alt={syncedChessCom.username}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>♟️</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white flex items-center gap-1.5">
                          {syncedChessCom.username}
                          <span>{syncedChessCom.countryCode === 'ng' ? '🇳🇬' : '🌐'}</span>
                        </span>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 font-bold mt-0.5">
                          <span>Rapid: <strong className="text-white">{syncedChessCom.ratings?.rapid || 429}</strong></span>
                          <span>Blitz: <strong className="text-white">{syncedChessCom.ratings?.blitz || 370}</strong></span>
                          <span>Bullet: <strong className="text-white">{syncedChessCom.ratings?.bullet || 300}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Unlink button with Confirmation */}
                    <button
                      onClick={() =>
                        setActionConfirm({
                          type: 'disconnect',
                          title: 'Disconnect Chess.com Account?',
                          message: `Are you sure you want to disconnect ${syncedChessCom.username}? Your synced stats, archives, and verified ratings will be removed from this session.`,
                          confirmText: 'Disconnect Account',
                          isDanger: true,
                        })
                      }
                      className="px-3 py-1.5 rounded-full text-zinc-400 hover:text-rose-400 bg-[#241f1f] border-2 border-rose-900/30 hover:border-rose-700/50 shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
                      title="Disconnect Account"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Game Review & Analysis Engine Card */}
              <div className="bg-[#24221e] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_4px_0_0_#141311] flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center font-black text-lg shadow-inner">
                      🔥
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white flex items-center gap-2">
                        Game Review Analysis Engine
                        <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-black uppercase">
                          {analysisEngine === 'torch_human' ? 'Human Style (Recommended)' : 'Stockfish (Tactical)'}
                        </span>
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        Select which engine evaluates your games, classifications, and coach recommendations.
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                  <button
                    onClick={() => setAnalysisEngine('torch_human')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      analysisEngine === 'torch_human'
                        ? 'bg-amber-500/15 border-amber-500 shadow-[0_3px_0_0_#78350f]'
                        : 'bg-[#1b1916] border-[#35322b] hover:border-[#4d483f] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" />
                        Human Style (Recommended)
                      </span>
                      {analysisEngine === 'torch_human' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                      Balanced grandmaster insights focused on practical moves, strategic plans, and intuitive play.
                    </p>
                  </button>

                  <button
                    onClick={() => setAnalysisEngine('stockfish')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col gap-1.5 ${
                      analysisEngine === 'stockfish'
                        ? 'bg-emerald-500/15 border-emerald-500 shadow-[0_3px_0_0_#385a16]'
                        : 'bg-[#1b1916] border-[#35322b] hover:border-[#4d483f] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                        Stockfish (Deep Tactical)
                      </span>
                      {analysisEngine === 'stockfish' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                      Direct, deep calculation finding the strongest tactical solutions and precise defenses.
                    </p>
                  </button>
                </div>
              </div>

              {/* Maintenance & Dangerous Actions */}
              <div className="bg-[#1b1916] border-2 border-[#2c2a26] rounded-3xl p-5 shadow-[0_4px_0_0_#141311] space-y-3">
                <span className="text-xs font-black text-zinc-300 block uppercase tracking-wider">
                  Platform Data & Reset Actions
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() =>
                      setActionConfirm({
                        type: 'reset_settings',
                        title: 'Reset All Preferences to Defaults?',
                        message: 'This will revert all board materials, piece sets, audio themes, volume profiles, and mentors back to their initial factory settings.',
                        confirmText: 'Reset All Settings',
                        isDanger: false,
                      })
                    }
                    className="p-3.5 rounded-2xl bg-[#23211e] hover:bg-[#2c2925] border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] text-left transition-all cursor-pointer flex items-center gap-3"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-zinc-200 block">Reset Preferences</span>
                      <span className="text-[10px] text-zinc-500 font-medium">Restore default themes & audio</span>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      setActionConfirm({
                        type: 'clear_history',
                        title: 'Clear Local Match Archives?',
                        message: 'This will purge locally cached games and offline review reports stored in your browser.',
                        confirmText: 'Clear Local Archives',
                        isDanger: true,
                      })
                    }
                    className="p-3.5 rounded-2xl bg-[#23211e] hover:bg-[#2c2925] border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] text-left transition-all cursor-pointer flex items-center gap-3"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <div>
                      <span className="text-xs font-black text-zinc-200 block">Clear Local Archives</span>
                      <span className="text-[10px] text-zinc-500 font-medium">Remove browser game history</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#161512] border-t-2 border-[#35322b] flex items-center justify-between shrink-0">
          <span className="text-[10px] sm:text-[11px] text-zinc-500 font-mono font-bold">
            Check.mate v2.0
          </span>
          <Button
            variant="primary"
            size="md"
            rounded="full"
            onClick={() => {
              soundService.playTactilePop();
              updateSnapshot();
              onClose();
            }}
          >
            Done
          </Button>
        </div>

        {/* 1. Tab Switch Confirmation Dialog */}
        {pendingTabSwitch && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#22201d] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_8px_0_0_#141311] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Save Changes to {activeTab.toUpperCase()}?</h3>
                  <span className="text-xs text-zinc-400 font-medium">
                    You modified preferences in this tab:
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#171614] rounded-2xl border-2 border-[#2b2926] space-y-1.5 shadow-inner">
                {tabChangesList.map((ch, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-bold text-zinc-200">
                    <span className="text-emerald-400 font-bold">-</span>
                    <span>{ch}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="full"
                  onClick={handleRevertTabSwitch}
                >
                  Revert Changes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  rounded="full"
                  onClick={handleConfirmTabSwitch}
                >
                  Confirm & Switch
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Action Confirmation Modal (Disconnect, Reset, Clear) */}
        {actionConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-[#22201d] border-2 border-[#35322b] rounded-3xl p-5 shadow-[0_8px_0_0_#141311] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border-2 ${
                    actionConfirm.isDanger ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{actionConfirm.title}</h3>
                  <span className="text-xs text-zinc-400 block mt-0.5 leading-relaxed font-medium">
                    {actionConfirm.message}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t-2 border-[#282622]">
                <button
                  onClick={() => setActionConfirm(null)}
                  className="px-4 py-2 rounded-full bg-[#262420] hover:bg-[#322f29] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] text-zinc-300 text-xs font-black transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteConfirmedAction}
                  className={`px-5 py-2 rounded-full text-white text-xs font-black border-2 transition-all cursor-pointer ${
                    actionConfirm.isDanger
                      ? 'bg-rose-600 hover:bg-rose-500 border-rose-800 shadow-[0_3px_0_0_#881337] hover:-translate-y-[1px]'
                      : 'bg-amber-600 hover:bg-amber-500 border-amber-800 shadow-[0_3px_0_0_#78350f] hover:-translate-y-[1px]'
                  }`}
                >
                  {actionConfirm.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
