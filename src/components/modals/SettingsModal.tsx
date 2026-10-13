'use client';

import React, { useState } from 'react';
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
  VolumeX,
  Sparkles,
  RefreshCw,
  Globe,
  UserCheck,
  Unlink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
}) => {
  const { syncedChessCom, clearSyncedChessCom } = useAuth();
  const [activeTab, setActiveTab] = useState<'board' | 'audio' | 'accessibility' | 'accounts'>('accounts');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    soundService.getSettings()
  );

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

  const soundThemes: { id: SoundTheme; name: string; desc: string }[] = [
    { id: 'classic', name: 'Chess.com Classic', desc: 'Tactile woody piece contacts & snappy captures.' },
    { id: 'wood', name: 'Heavy Oak', desc: 'Rich acoustic resonant wood impacts.' },
    { id: 'marble', name: 'Smooth Marble', desc: 'Polished stone clicks and crisp clinks.' },
    { id: 'arcade', name: '8-Bit Arcade', desc: 'Retro electronic chip synths and blips.' },
    { id: 'silman', name: 'Silman Minimal', desc: 'Soft ergonomic low-fatigue acoustic taps.' },
  ];

  const updateAudio = (partial: Partial<AudioSettings>) => {
    soundService.updateSettings(partial);
    setAudioSettings(soundService.getSettings());
  };

  const handleApplyPreset = (preset: SoundPreset) => {
    soundService.applyPreset(preset);
    setAudioSettings(soundService.getSettings());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#262421] border-b border-[#33302b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-[#81b64c]" />
            <span className="text-base font-bold text-white">Platform Preferences & Remediation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#383530] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-[#191815] border-b border-[#33302b] px-4 text-xs font-bold">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4 text-[#81b64c]" />
            <span>Connected Accounts</span>
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'audio'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Volume2 className="w-4 h-4 text-[#81b64c]" />
            <span>Audio & Sound</span>
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'board'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Palette className="w-4 h-4 text-[#81b64c]" />
            <span>Board Themes</span>
          </button>
          <button
            onClick={() => setActiveTab('accessibility')}
            className={`px-4 py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'accessibility'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Eye className="w-4 h-4 text-[#81b64c]" />
            <span>Accessibility</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: AUDIO & REMEDIATION */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Audio Presets Bar */}
              <div className="bg-[#161512] p-3.5 rounded-xl border border-[#2d2a26] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Acoustic Gain Presets</span>
                  <span className="text-[11px] text-zinc-400">
                    Switch between tuned volume profiles for different environments.
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {(['casual', 'focus', 'commentary'] as SoundPreset[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleApplyPreset(p)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        audioSettings.preset === p
                          ? 'bg-[#81b64c] text-white shadow'
                          : 'bg-[#23211e] text-zinc-400 hover:text-zinc-200 border border-[#302e2b]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* R1 Remediation: Low-Time Warning Customization */}
              <div className="bg-[#24211d] p-4 rounded-xl border border-[#38342e] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      R1 Remediation: Low-Time Audible Alert Engine
                    </h3>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    Never Miss Time Scramble
                  </span>
                </div>

                <p className="text-xs text-zinc-300 leading-relaxed">
                  Fixes reference platform weakness where low-time alerts fire late or are inaudible under focus.
                </p>

                {/* Register Choices */}
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-2">
                    Acoustic Register Tone:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-[#2b2824] border-[#81b64c] text-white'
                              : 'bg-[#181614] border-[#2c2925] text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-zinc-100">{reg.label}</span>
                            {isSel && <Check className="w-3.5 h-3.5 text-[#81b64c]" />}
                          </div>
                          <span className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
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
                    <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-1.5">
                      <span>Alert Threshold:</span>
                      <strong className="text-[#81b64c]">
                        ≤ {audioSettings.lowTimeThresholdSeconds} Seconds
                      </strong>
                    </div>
                    <div className="flex gap-2">
                      {[5, 10, 15, 20].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => updateAudio({ lowTimeThresholdSeconds: sec })}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer ${
                            audioSettings.lowTimeThresholdSeconds === sec
                              ? 'bg-[#81b64c] text-white'
                              : 'bg-[#181614] text-zinc-400 hover:text-white border border-[#2e2b27]'
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
                      <strong className="text-[#81b64c]">
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
                      className="w-full accent-[#81b64c] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Safeguard Volume Floor Toggle */}
                <div className="pt-2 border-t border-[#332f2a] flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Enforce 50% Volume Floor Override
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Guarantees alert is never muted or quieted below 50% during intense focus.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={audioSettings.neverBelowFloorVolume}
                    onChange={(e) => updateAudio({ neverBelowFloorVolume: e.target.checked })}
                    className="rounded accent-[#81b64c] w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              {/* Sound Theme Selection */}
              <div>
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  Piece Contact SFX Theme
                </h3>
                <div className="space-y-2">
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
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSel
                            ? 'bg-[#2b2926] border-[#81b64c]'
                            : 'bg-[#21201d] border-[#302e2b] hover:border-[#423f39]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{st.name}</span>
                            {isSel && <Check className="w-3.5 h-3.5 text-[#81b64c]" />}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5">{st.desc}</p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            soundService.setTheme(st.id);
                            soundService.playCapture();
                          }}
                          className="px-2.5 py-1 rounded bg-[#161512] hover:bg-[#302e2b] text-[11px] font-bold text-[#81b64c] border border-[#302e2b] cursor-pointer"
                        >
                          Sample
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BOARD THEMES */}
          {activeTab === 'board' && (
            <div>
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                Board Material, Wood & Contrast
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {boardThemes.map((theme) => {
                  const isSel = boardTheme === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => onChangeBoardTheme(theme.id)}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#2b2926] border-[#81b64c] shadow-md shadow-[#81b64c]/10'
                          : 'bg-[#21201d] border-[#302e2b] hover:border-[#423f39]'
                      }`}
                    >
                      <div className="grid grid-cols-2 grid-rows-2 w-12 h-12 rounded border border-black/30 overflow-hidden shadow">
                        <div style={{ backgroundColor: theme.light }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.dark }} />
                        <div style={{ backgroundColor: theme.light }} />
                      </div>
                      <span className="text-xs font-bold text-zinc-200 text-center">
                        {theme.name}
                      </span>
                      {theme.tag && (
                        <span className="text-[9px] font-bold bg-[#81b64c]/15 text-[#81b64c] px-1.5 py-0.5 rounded">
                          {theme.tag}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ACCESSIBILITY (R3) */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4 text-xs">
              <div className="bg-[#1a1815] p-4 rounded-xl border border-[#2d2a26] space-y-3">
                <h4 className="font-bold text-white text-sm">WCAG 2.2 AA Accessibility Features</h4>
                <p className="text-zinc-400 leading-relaxed">
                  Our chess platform exceeds industry competitors by providing full screen reader support, keyboard arrow navigation, and high-contrast themes out of the box.
                </p>

                <div className="space-y-2 pt-2 border-t border-[#2d2a26]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-zinc-200 block">ARIA Grid Semantics</span>
                      <span className="text-[11px] text-zinc-500">
                        Every square outputs full piece & coordinate speech labels for screen readers.
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#81b64c] bg-[#81b64c]/10 px-2 py-0.5 rounded border border-[#81b64c]/20">
                      Active
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#262420]">
                    <div>
                      <span className="font-bold text-zinc-200 block">Keyboard Navigation</span>
                      <span className="text-[11px] text-zinc-500">
                        Use Arrow Keys to traverse squares; press Space or Enter to select and place pieces.
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#81b64c] bg-[#81b64c]/10 px-2 py-0.5 rounded border border-[#81b64c]/20">
                      Enabled
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#262420]">
                    <div>
                      <span className="font-bold text-zinc-200 block">High-Contrast Theme</span>
                      <span className="text-[11px] text-zinc-500">
                        Select 'High Contrast (B&W)' or 'Low-Vision Amber' in the Board Themes tab.
                      </span>
                    </div>
                    <button
                      onClick={() => onChangeBoardTheme('high_contrast')}
                      className="px-2.5 py-1 rounded bg-[#2b2824] hover:bg-[#38342f] text-white text-[11px] font-bold cursor-pointer"
                    >
                      Enable Theme
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accounts' && (
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-[#24221e] border border-[#33302b] rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#81b64c]/20 text-[#81b64c] flex items-center justify-center font-bold text-lg">
                      ♟️
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white flex items-center gap-2">
                        Chess.com Profile Sync
                        {syncedChessCom && (
                          <span className="text-[10px] bg-[#81b64c]/20 text-[#81b64c] px-2 py-0.5 rounded-full font-bold">
                            Connected
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-zinc-400">
                        Sync your Chess.com rating, avatar, game archives, and match history.
                      </span>
                    </div>
                  </div>

                  {onOpenChessComSync && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenChessComSync();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{syncedChessCom ? 'Switch / Re-sync' : 'Connect Account'}</span>
                    </button>
                  )}
                </div>

                {syncedChessCom && (
                  <div className="mt-2 p-3 bg-[#1a1815] rounded-xl border border-[#2b2824] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#272522] border border-[#383530] overflow-hidden flex items-center justify-center text-sm font-bold shrink-0">
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
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          {syncedChessCom.username}
                          <span>{syncedChessCom.countryCode === 'ng' ? '🇳🇬' : '🌐'}</span>
                        </span>
                        <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 mt-0.5">
                          <span>Rapid: <strong className="text-white">{syncedChessCom.ratings?.rapid || 429}</strong></span>
                          <span>Blitz: <strong className="text-white">{syncedChessCom.ratings?.blitz || 370}</strong></span>
                          <span>Bullet: <strong className="text-white">{syncedChessCom.ratings?.bullet || 300}</strong></span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={clearSyncedChessCom}
                      className="p-2 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="Disconnect Account"
                    >
                      <Unlink className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#161512] border-t border-[#33302b] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black transition-colors cursor-pointer shadow-lg shadow-[#81b64c]/20"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
