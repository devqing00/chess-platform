'use client';

import React from 'react';
import { BoardTheme, PieceTheme, SoundTheme, AnimationSpeed } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { X, Volume2, Palette, Sparkles, Check } from 'lucide-react';

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
}) => {
  if (!isOpen) return null;

  const boardThemes: { id: BoardTheme; name: string; light: string; dark: string }[] = [
    { id: 'green', name: 'Classic Green', light: '#ebecd0', dark: '#779556' },
    { id: 'wood', name: 'Walnut Wood', light: '#e4c590', dark: '#a36d39' },
    { id: 'glass', name: 'Glass & Ice', light: '#d9e7f4', dark: '#5b82a6' },
    { id: 'neon', name: 'Cyber Neon', light: '#263345', dark: '#151e2b' },
    { id: 'marble', name: 'Minimal Marble', light: '#e5e5e5', dark: '#737373' },
    { id: 'arcade', name: '8-Bit Arcade', light: '#a8b98b', dark: '#547343' },
  ];

  const soundThemes: { id: SoundTheme; name: string; desc: string }[] = [
    { id: 'classic', name: 'Chess.com Classic', desc: 'Tactile woody piece contacts & snappy captures.' },
    { id: 'wood', name: 'Heavy Oak', desc: 'Rich acoustic resonant wood impacts.' },
    { id: 'marble', name: 'Smooth Marble', desc: 'Polished stone clicks and crisp clinks.' },
    { id: 'arcade', name: '8-Bit Arcade', desc: 'Retro electronic chip synths and blips.' },
    { id: 'silman', name: 'Silman Minimal', desc: 'Soft ergonomic low-fatigue acoustic taps.' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-xl bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#262421] border-b border-[#33302b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-[#81b64c]" />
            <span className="text-base font-bold text-white">Board & Audio Settings</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#383530] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Board Theme Selection */}
          <div>
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
              Board Material & Theme
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
                    {/* Mini board swatch preview */}
                    <div className="grid grid-cols-2 grid-rows-2 w-10 h-10 rounded border border-black/20 overflow-hidden shadow">
                      <div style={{ backgroundColor: theme.light }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.dark }} />
                      <div style={{ backgroundColor: theme.light }} />
                    </div>
                    <span className="text-xs font-bold text-zinc-200">{theme.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sound Themes & Audio Control */}
          <div className="pt-4 border-t border-[#302e2b]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#81b64c]" />
                <span>Auditory Feedback Themes</span>
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-zinc-400 font-semibold">Sound FX:</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => onToggleSound(e.target.checked)}
                  className="rounded accent-[#81b64c] cursor-pointer"
                />
              </label>
            </div>

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

        {/* Footer */}
        <div className="px-6 py-3 bg-[#161512] border-t border-[#302e2b] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
