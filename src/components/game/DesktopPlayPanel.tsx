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
  RotateCcw,
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
  onUndo?: () => void;
  canUndo?: boolean;
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
  onUndo,
  canUndo = false,
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
    <div className="w-full max-w-[400px] h-[680px] bg-[#211f1c] border-2 border-[#35322b] rounded-3xl flex flex-col justify-between shadow-[0_6px_0_0_#141311] select-none text-zinc-100 overflow-hidden relative">
      {/* Top Navigation Tabs */}
      <div>
        <div className="grid grid-cols-3 border-b-2 border-[#35322b] bg-[#1a1815] text-xs font-black p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('play')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border-2 uppercase tracking-wider text-[11px] ${
              activeTab === 'play'
                ? 'border-[#81b64c] text-white bg-[#282522] shadow-[0_2px_0_0_#4d7a24]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 text-[#81b64c]" />
            <span>Play</span>
          </button>
          <button
            onClick={() => setActiveTab('variants')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border-2 uppercase tracking-wider text-[11px] ${
              activeTab === 'variants'
                ? 'border-[#f59e0b] text-white bg-[#282522] shadow-[0_2px_0_0_#92400e]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Variants</span>
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border-2 uppercase tracking-wider text-[11px] ${
              activeTab === 'engine'
                ? 'border-[#3b82f6] text-white bg-[#282522] shadow-[0_2px_0_0_#1e3a8a]'
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
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 block">
                Time Control
              </span>
              <button
                onClick={() => setIsTimeDropdownOpen((p) => !p)}
                className="w-full py-3 px-4 bg-[#282522] hover:bg-[#302d28] border-2 border-[#38342e] rounded-2xl flex items-center justify-between transition cursor-pointer text-sm font-black text-white shadow-[0_3px_0_0_#141311]"
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1c1a17] border-2 border-[#38342e] rounded-2xl p-2 shadow-[0_6px_0_0_#141311] z-30 flex flex-col gap-1.5 max-h-56 overflow-y-auto">
                  {timeOptions.map((opt) => (
                    <button
                      key={opt.sec}
                      onClick={() => {
                        onSelectTimeControl(opt.sec);
                        setIsTimeDropdownOpen(false);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold text-left flex items-center justify-between transition cursor-pointer border-2 ${
                        timeControl === opt.sec
                          ? 'bg-[#81b64c] text-white border-[#5d8b32] shadow-[0_2px_0_0_#4d7a24]'
                          : 'border-transparent text-zinc-300 hover:bg-[#282520] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {timeControl === opt.sec && <span className="text-[10px] font-black">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Big Green Start Game Action Button */}
            <button
              onClick={onStartGame}
              className="w-full py-3.5 bg-[#81b64c] hover:bg-[#72a342] border-2 border-[#5d8b32] text-white text-sm font-black uppercase tracking-wider rounded-full shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{isGameActive ? 'Restart / New Match' : 'Start Game'}</span>
            </button>

            {/* Play Modes Shortcuts */}
            <div className="flex flex-col gap-2 mt-1">
              <button
                onClick={onPlayBot}
                className="w-full py-3 px-4 bg-[#282522] hover:bg-[#302d28] border-2 border-[#38342e] rounded-2xl flex items-center justify-between text-xs font-black text-zinc-200 shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Bot className="w-4 h-4 text-blue-400" />
                  <span>Play Computer (Bots)</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">20+ Personalities</span>
              </button>

              <button
                onClick={onPlayFriend}
                className="w-full py-3 px-4 bg-[#282522] hover:bg-[#302d28] border-2 border-[#38342e] rounded-2xl flex items-center justify-between text-xs font-black text-zinc-200 shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_1px_0_0_#141311] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Handshake className="w-4 h-4 text-emerald-400" />
                  <span>Pass & Play (Local Friend)</span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Shared Screen</span>
              </button>
            </div>

            {/* In-Game Action Controls (When match is live) */}
            {isGameActive && (
              <div className="pt-3 border-t-2 border-[#312e29] flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Game Controls
                </span>
                <div className="flex items-center gap-2">
                  {onUndo && (
                    <button
                      onClick={onUndo}
                      disabled={!canUndo}
                      className="py-2 px-3 rounded-full bg-[#282522] hover:bg-[#33302b] disabled:opacity-30 text-xs font-black text-amber-400 border-2 border-[#3d3830] shadow-[0_2px_0_0_#1c1a17] transition cursor-pointer flex items-center justify-center gap-1"
                      title="Takeback Move"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  )}
                  <button
                    onClick={onDraw}
                    className="flex-1 py-2 rounded-full bg-[#282522] hover:bg-[#33302b] text-xs font-black text-zinc-300 border-2 border-[#3d3830] shadow-[0_2px_0_0_#1c1a17] active:translate-y-[1px] active:shadow-[0_0.5px_0_0_#1c1a17] transition cursor-pointer"
                  >
                    Draw
                  </button>
                  <button
                    onClick={onResign}
                    className="flex-1 py-2 rounded-full bg-rose-600/20 hover:bg-rose-600/30 border-2 border-rose-500/40 text-xs font-black text-rose-300 shadow-[0_2px_0_0_#7f1d1d] active:translate-y-[1px] active:shadow-[0_0.5px_0_0_#7f1d1d] transition cursor-pointer"
                  >
                    Resign
                  </button>
                  {onFlipBoard && (
                    <button
                      onClick={onFlipBoard}
                      className="p-2 rounded-full bg-[#282522] hover:bg-[#33302b] text-zinc-300 border-2 border-[#3d3830] shadow-[0_2px_0_0_#1c1a17] active:translate-y-[1px] transition cursor-pointer"
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
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider mb-1">
              Select Chess Variant
            </span>
            {variantsList.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedVariant(v.id);
                  if (onSelectVariant) onSelectVariant(v.id);
                }}
                className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-1 ${
                  selectedVariant === v.id
                    ? 'bg-[#282522] border-[#81b64c] shadow-[0_3px_0_0_#4d7a24]'
                    : 'bg-[#1e1c18] border-[#332f29] hover:bg-[#25221e] shadow-[0_2px_0_0_#141311]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-white text-xs">{v.name}</span>
                  {selectedVariant === v.id && (
                    <CheckCircle2 className="w-4 h-4 text-[#81b64c]" />
                  )}
                </div>
                <span className="text-[11px] text-zinc-400 font-medium">{v.desc}</span>
              </div>
            ))}

            <button
              onClick={() => {
                if (onSelectVariant) onSelectVariant(selectedVariant);
                onStartGame();
              }}
              className="w-full mt-2 py-3.5 bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black uppercase tracking-wider rounded-full border-2 border-[#5d8b32] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer"
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
                <span className="text-zinc-400">Engine</span>
                <span className="text-[#81b64c] font-bold">Stockfish Grandmaster</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Performance</span>
                <span className="text-white">High Speed In-Browser</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Calculation Speed</span>
                <span className="text-white">Multi-threaded Instant</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Coach Feedback</span>
                <span className="text-emerald-400 font-bold">Full Accuracy Analysis</span>
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
          <span className="w-2 h-2 rounded-full bg-[#81b64c]" />
          <span className="text-[11px] font-bold text-zinc-300">Stockfish 16 Active</span>
        </div>
        <span className="text-[10px] text-zinc-500">Low-Latency WASM</span>
      </div>
    </div>
  );
};
