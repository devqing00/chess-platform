'use client';

import React, { useState } from 'react';
import {
  Plus,
  Grid3X3,
  Clock,
  Swords,
  Handshake,
  ChevronDown,
  Sparkles,
  Bot,
  Zap,
  RotateCw,
  Award,
  Cpu,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { ChessVariant } from '@/types/chess';

interface DesktopPlayPanelProps {
  timeControl: number;
  onSelectTimeControl: (sec: number) => void;
  onStartGame: () => void;
  onPlayBot: () => void;
  onPlayFriend: () => void;
  onSelectVariant?: (variant: ChessVariant) => void;
  onFlipBoard?: () => void;
  isGameActive: boolean;
  onResign?: () => void;
  onDraw?: () => void;
}

export const DesktopPlayPanel: React.FC<DesktopPlayPanelProps> = ({
  timeControl,
  onSelectTimeControl,
  onStartGame,
  onPlayBot,
  onPlayFriend,
  onSelectVariant,
  onFlipBoard,
  isGameActive,
  onResign,
  onDraw,
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'variants' | 'engine'>('play');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');

  const timeOptions = [
    { sec: 60, label: '1 min (Bullet)' },
    { sec: 180, label: '3 min (Blitz)' },
    { sec: 300, label: '5 min (Blitz)' },
    { sec: 600, label: '10 min (Rapid)' },
    { sec: 900, label: '15|10 (Rapid)' },
    { sec: 1800, label: '30 min (Classical)' },
    { sec: 0, label: 'Unlimited (Casual)' },
  ];

  const currentOption = timeOptions.find((t) => t.sec === timeControl) || timeOptions[3];

  const variantsList: { id: ChessVariant; name: string; desc: string }[] = [
    { id: 'standard', name: 'Standard Chess', desc: 'Classic FIDE rules, 8x8 board' },
    { id: 'chess960', name: 'Chess960 (Fischer Random)', desc: 'Randomized back-rank pieces' },
    { id: '3check', name: '3-Check Chess', desc: 'Deliver 3 checks to win instantly' },
    { id: 'kingofthehill', name: 'King of the Hill', desc: 'First King to reach the 4 center squares wins' },
  ];

  return (
    <div className="w-full max-w-[400px] h-[680px] bg-[#21201d] border border-[#2e2b26] rounded-2xl flex flex-col justify-between shadow-2xl select-none text-zinc-100 overflow-hidden relative">
      {/* Top Navigation Tabs */}
      <div>
        <div className="grid grid-cols-3 border-b border-[#2e2b26] bg-[#1a1815] text-xs font-bold">
          <button
            onClick={() => setActiveTab('play')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'play'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#81b64c]" />
            <span>Play</span>
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'variants'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Variants</span>
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'engine'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 text-blue-400" />
            <span>Engine</span>
          </button>
        </div>

        {/* Tab 1: Play & Time Controls */}
        {activeTab === 'play' && (
          <div className="p-4 sm:p-5 flex flex-col gap-3">
            {/* Time Control Dropdown Pill */}
            <div className="relative">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1 block">
                Time Control
              </span>
              <button
                onClick={() => setIsTimeDropdownOpen((p) => !p)}
                className="w-full py-3 px-4 bg-[#262420] hover:bg-[#2d2a25] border border-[#38342e] rounded-xl flex items-center justify-between transition cursor-pointer text-sm font-bold text-white shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#81b64c]" />
                  <span>{currentOption.label}</span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-zinc-400 transition-transform ${
                    isTimeDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isTimeDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#1a1815] border border-[#3b3730] rounded-xl p-1.5 shadow-2xl z-30 flex flex-col gap-1 max-h-56 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt.sec}
                      onClick={() => {
                        onSelectTimeControl(opt.sec);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold text-left flex items-center justify-between transition cursor-pointer ${
                        timeControl === opt.sec
                          ? 'bg-[#81b64c] text-white'
                          : 'text-zinc-300 hover:bg-[#282520] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {timeControl === opt.sec && <span className="text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Big Green Start Game Action Button */}
            <button
              onClick={onStartGame}
              className="w-full py-4 bg-[#81b64c] hover:bg-[#73a542] active:bg-[#68973b] text-white text-base font-black tracking-wide rounded-xl shadow-lg shadow-[#81b64c]/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isGameActive ? 'Restart / New Match' : 'Start Game'}</span>
            </button>

            {/* Play Modes Shortcuts */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={onPlayBot}
                className="w-full py-2.5 px-4 bg-[#2b2824] hover:bg-[#34302c] border border-[#3a3630] rounded-xl flex items-center justify-between text-xs font-extrabold text-zinc-200 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span>Play Computer (Bots)</span>
                </div>
                <span className="text-[10px] text-zinc-400">20+ Personalities</span>
              </button>

              <button
                onClick={onPlayFriend}
                className="w-full py-2.5 px-4 bg-[#2b2824] hover:bg-[#34302c] border border-[#3a3630] rounded-xl flex items-center justify-between text-xs font-extrabold text-zinc-200 transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Handshake className="w-4 h-4 text-emerald-400" />
                  <span>Pass & Play (Local Friend)</span>
                </div>
                <span className="text-[10px] text-zinc-400">Shared Screen</span>
              </button>
            </div>

            {/* In-Game Action Controls (When match is live) */}
            {isGameActive && (
              <div className="pt-3 border-t border-[#312e29] flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Game Controls
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onDraw}
                    className="flex-1 py-2 rounded-lg bg-[#2b2824] hover:bg-[#35312c] text-xs font-bold text-zinc-300 transition cursor-pointer"
                  >
                    Offer Draw
                  </button>
                  <button
                    onClick={onResign}
                    className="flex-1 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-xs font-bold text-red-300 transition cursor-pointer"
                  >
                    Resign
                  </button>
                  {onFlipBoard && (
                    <button
                      onClick={onFlipBoard}
                      className="p-2 rounded-lg bg-[#2b2824] hover:bg-[#35312c] text-zinc-300 transition cursor-pointer"
                      title="Flip Board"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Chess Variants */}
        {activeTab === 'variants' && (
          <div className="p-4 flex flex-col gap-2.5 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Select Chess Variant
            </span>
            {variantsList.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedVariant(v.id);
                  if (onSelectVariant) onSelectVariant(v.id);
                }}
                className={`p-3 rounded-xl border transition cursor-pointer flex flex-col gap-1 ${
                  selectedVariant === v.id
                    ? 'bg-[#2b2824] border-[#81b64c] shadow-md'
                    : 'bg-[#1e1c18] border-[#332f29] hover:bg-[#25221e]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-xs">{v.name}</span>
                  {selectedVariant === v.id && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#81b64c]" />
                  )}
                </div>
                <span className="text-[11px] text-zinc-400">{v.desc}</span>
              </div>
            ))}

            <button
              onClick={() => {
                if (onSelectVariant) onSelectVariant(selectedVariant);
                onStartGame();
              }}
              className="w-full mt-2 py-3 bg-[#81b64c] hover:bg-[#73a542] text-white font-black rounded-xl transition shadow cursor-pointer"
            >
              Play {variantsList.find((v) => v.id === selectedVariant)?.name}
            </button>
          </div>
        )}

        {/* Tab 3: Local Engine & AI Status */}
        {activeTab === 'engine' && (
          <div className="p-4 flex flex-col gap-3 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Engine Status & Settings
            </span>
            <div className="p-3 bg-[#1e1c18] border border-[#332f29] rounded-xl flex flex-col gap-2 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Engine Core</span>
                <span className="text-[#81b64c] font-bold">Stockfish 16 (NNUE)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Architecture</span>
                <span className="text-white">WebAssembly SIMD</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Search Threads</span>
                <span className="text-white">Web Worker Pool</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Evaluation Accuracy</span>
                <span className="text-emerald-400 font-bold">CAPS Metric Enabled</span>
              </div>
            </div>

            <div className="p-3 bg-[#24221f] border border-[#38342e] rounded-xl flex items-center gap-3">
              <Award className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex flex-col text-zinc-300">
                <span className="font-bold text-white text-xs">Diamond Coach Active</span>
                <span className="text-[10px] text-zinc-400">
                  Real-time natural language move classifications and suggestions.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Engine & Network Status Bar */}
      <div className="p-3 bg-[#181614] border-t border-[#2a2723] flex items-center justify-between text-xs text-zinc-400 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          <span className="text-[11px] font-bold text-zinc-300">Stockfish 16 Active</span>
        </div>
        <span className="text-[10px] text-zinc-500">Low-Latency WASM</span>
      </div>
    </div>
  );
};
