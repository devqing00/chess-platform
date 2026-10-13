'use client';

import React, { useState } from 'react';
import {
  Plus,
  Grid3X3,
  Users,
  Clock,
  Swords,
  Handshake,
  Trophy,
  ChevronDown,
  MessageSquare,
  Globe,
  Bell,
  X,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ChessVariant } from '@/types/chess';

interface DesktopPlayPanelProps {
  timeControl: number;
  onSelectTimeControl: (sec: number) => void;
  onStartGame: () => void;
  onPlayBot: () => void;
  onPlayFriend: () => void;
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
  isGameActive,
  onResign,
  onDraw,
}) => {
  const [activeTab, setActiveTab] = useState<'new_game' | 'games' | 'players'>('new_game');
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const timeOptions = [
    { sec: 60, label: '1 min (Bullet)' },
    { sec: 180, label: '3 min (Blitz)' },
    { sec: 300, label: '5 min (Blitz)' },
    { sec: 600, label: '10 min (Rapid)' },
    { sec: 900, label: '15|10 (Rapid)' },
    { sec: 1800, label: '30 min (Classical)' },
    { sec: 0, label: 'Unlimited (Daily)' },
  ];

  const currentOption = timeOptions.find((t) => t.sec === timeControl) || timeOptions[3];

  return (
    <div className="w-full max-w-[400px] h-[680px] bg-[#21201d] border border-[#2e2b26] rounded-2xl flex flex-col justify-between shadow-2xl select-none text-zinc-100 overflow-hidden relative">
      {/* Top Navigation Tabs (Image 5 Parity) */}
      <div>
        <div className="grid grid-cols-3 border-b border-[#2e2b26] bg-[#1a1815] text-xs font-bold">
          <button
            onClick={() => setActiveTab('new_game')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'new_game'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>New Game</span>
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'games'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            <span>Games</span>
          </button>
          <button
            onClick={() => setActiveTab('players')}
            className={`py-3 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
              activeTab === 'players'
                ? 'border-[#81b64c] text-white bg-[#21201d]'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Players</span>
          </button>
        </div>

        {/* Tab 1: New Game Mode Selector */}
        {activeTab === 'new_game' && (
          <div className="p-4 sm:p-5 flex flex-col gap-3">
            {/* Time Control Dropdown Pill */}
            <div className="relative">
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
              <span>Start Game</span>
            </button>

            {/* Secondary Action Options (Image 5 Parity) */}
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={onPlayBot}
                className="w-full py-3 px-4 bg-[#2b2824] hover:bg-[#34302c] border border-[#3a3630] rounded-xl flex items-center justify-center gap-2.5 text-xs font-extrabold text-zinc-200 transition cursor-pointer"
              >
                <Swords className="w-4 h-4 text-amber-400" />
                <span>Custom Challenge</span>
              </button>

              <button
                onClick={onPlayFriend}
                className="w-full py-3 px-4 bg-[#2b2824] hover:bg-[#34302c] border border-[#3a3630] rounded-xl flex items-center justify-center gap-2.5 text-xs font-extrabold text-zinc-200 transition cursor-pointer"
              >
                <Handshake className="w-4 h-4 text-amber-400" />
                <span>Play a Friend</span>
              </button>

              <button
                onClick={() => setShowNotificationModal(true)}
                className="w-full py-3 px-4 bg-[#2b2824] hover:bg-[#34302c] border border-[#3a3630] rounded-xl flex items-center justify-center gap-2.5 text-xs font-extrabold text-zinc-200 transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Tournaments & Alerts</span>
              </button>
            </div>

            {/* In-Game Controls (Resign / Draw / Restart) */}
            {isGameActive && (
              <div className="pt-3 border-t border-[#312e29] flex items-center justify-between gap-2">
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
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Live Games Overview */}
        {activeTab === 'games' && (
          <div className="p-4 flex flex-col gap-2.5 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Top Live Grandmaster Broadcasts
            </span>
            {[
              { w: 'Magnus Carlsen', b: 'Hikaru Nakamura', rating: '2830 vs 2875', time: '3+2 Blitz' },
              { w: 'Gukesh D', b: 'Ding Liren', rating: '2794 vs 2728', time: '10+0 Rapid' },
              { w: 'Alireza Firouzja', b: 'Fabiano Caruana', rating: '2805 vs 2805', time: 'Bullet 1+0' },
            ].map((g, idx) => (
              <div
                key={idx}
                className="p-3 bg-[#1e1c18] border border-[#332f29] rounded-xl flex items-center justify-between hover:bg-[#282520] transition cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-white">
                    {g.w} vs {g.b}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">{g.rating}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#2e2b26] text-[10px] font-bold text-[#81b64c]">
                  {g.time}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Online Players Pool */}
        {activeTab === 'players' && (
          <div className="p-4 flex flex-col gap-2.5 text-xs">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              Ready in Matchmaking Pool
            </span>
            {[
              { name: 'Checkacabra', r: 1250, country: '🇯🇵', status: 'In Queue' },
              { name: 'Aman_22_03', r: 1420, country: '🇮🇳', status: 'Open' },
              { name: 'Croissantszz', r: 1640, country: '🇦🇷', status: 'Playing' },
              { name: 'Agathadelima', r: 1625, country: '🇩🇪', status: 'Open' },
            ].map((p, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#1e1c18] border border-[#332f29] rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{p.country}</span>
                  <span className="font-bold text-white">{p.name}</span>
                  <span className="font-mono text-[10px] text-zinc-400">({p.r})</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    p.status === 'Open'
                      ? 'bg-[#81b64c]/20 text-[#81b64c]'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Live Player Stats Bar (Image 5 Parity) */}
      <div className="p-3 bg-[#181614] border-t border-[#2a2723] flex items-center justify-between text-xs text-zinc-400 font-mono">
        <button
          onClick={() => setShowNotificationModal(true)}
          className="p-1.5 rounded-lg hover:text-white hover:bg-[#25221e] transition cursor-pointer"
          title="Game Chat & Alerts"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-[11px] font-bold tracking-tight">
          <span className="text-zinc-200">
            <strong className="text-[#81b64c]">149,114</strong> PLAYING
          </span>
          <span className="text-zinc-500">•</span>
          <span className="text-zinc-400">
            <strong>24,916,525</strong> GAMES TODAY
          </span>
        </div>
      </div>

      {/* Enable Notifications Modal Overlay (Image 4 Parity) */}
      {showNotificationModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-[#24221f] border border-[#3b3730] rounded-2xl p-5 shadow-2xl flex flex-col items-center text-center gap-3 relative">
            <button
              onClick={() => setShowNotificationModal(false)}
              className="absolute top-3 right-3 p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-black text-white mt-1">Enable Notifications</h3>

            {/* Notification Preview Card */}
            <div className="w-full p-2.5 bg-[#1b1916] border border-[#332f2a] rounded-xl flex items-center justify-between text-left text-xs">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-400 text-sm">
                  🌍
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-white text-[11px]">Your Move!</span>
                  <span className="text-[10px] text-zinc-400">Opponent played c4</span>
                </div>
              </div>
              <span className="text-[9px] text-zinc-500 font-mono">Just now</span>
            </div>

            {/* Bullet List */}
            <div className="text-xs text-zinc-300 flex flex-col items-start gap-1 w-full pl-2">
              <span className="text-[11px] font-bold text-zinc-400 mb-1">
                Allow and get notified when:
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#81b64c]" />
                <span>It&apos;s your turn to move</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#81b64c]" />
                <span>You receive a message</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#81b64c]" />
                <span>You get challenged by a friend</span>
              </div>
            </div>

            {/* Confirmation CTA */}
            <button
              onClick={() => {
                if (typeof Notification !== 'undefined') {
                  Notification.requestPermission();
                }
                setShowNotificationModal(false);
              }}
              className="w-full py-2.5 bg-[#81b64c] hover:bg-[#73a542] text-white font-black text-xs rounded-xl transition shadow cursor-pointer mt-1"
            >
              Yes, Remind Me!
            </button>

            <button
              onClick={() => setShowNotificationModal(false)}
              className="text-[11px] text-zinc-400 hover:text-white transition cursor-pointer"
            >
              No, thanks
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
