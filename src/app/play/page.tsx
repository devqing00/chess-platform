'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { ChessVariant, GamePlayer } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import {
  Zap,
  Flame,
  Clock,
  Swords,
  Bot,
  Crown,
  Users,
  Award,
  Play,
  ArrowRight,
} from 'lucide-react';

export default function PlayLobbyPage() {
  const router = useRouter();
  const [selectedTimeControl, setSelectedTimeControl] = useState<number>(600);
  const [selectedVariant, setSelectedVariant] = useState<ChessVariant>('standard');
  const [selectedMode, setSelectedMode] = useState<'bot' | 'pass_and_play'>('bot');
  const [selectedBotId, setSelectedBotId] = useState<string>('martin');

  const timeControls = [
    { sec: 60, label: '1 min', sub: 'Bullet', icon: Zap },
    { sec: 180, label: '3 min', sub: 'Blitz', icon: Flame },
    { sec: 300, label: '5 min', sub: 'Blitz', icon: Flame },
    { sec: 600, label: '10 min', sub: 'Rapid', icon: Clock },
    { sec: 1800, label: '30 min', sub: 'Classical', icon: Clock },
  ];

  const variants = [
    { id: 'standard' as ChessVariant, name: 'Standard', desc: 'Classical rules' },
    { id: 'chess960' as ChessVariant, name: 'Chess960', desc: 'Fischer Random' },
    { id: '3check' as ChessVariant, name: '3-Check', desc: 'Deliver 3 checks' },
    { id: 'kingofthehill' as ChessVariant, name: 'King of the Hill', desc: 'Occupy the center' },
  ];

  const handleStartGame = () => {
    const whitePlayer: GamePlayer = {
      id: 'player-you',
      name: 'You',
      rating: 1250,
      avatar: '🧑‍💻',
      country: 'US',
    };

    const chosenBot = CHESS_BOTS.find((b) => b.id === selectedBotId) || CHESS_BOTS[0];
    const blackPlayer: GamePlayer =
      selectedMode === 'bot'
        ? {
            id: chosenBot.id,
            name: chosenBot.name,
            rating: chosenBot.rating,
            avatar: chosenBot.avatar,
            title: chosenBot.rating >= 2800 ? 'GM' : 'BOT',
            isBot: true,
          }
        : {
            id: 'player-2',
            name: 'Player 2 (Black)',
            rating: 1250,
            avatar: '♟️',
          };

    const session = GameSessionStore.createSession(
      whitePlayer,
      blackPlayer,
      selectedTimeControl,
      selectedVariant
    );

    router.push(`/game/${session.id}`);
  };

  const recentGames = GameSessionStore.listRecentSessions();

  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262421] pb-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide">Play Chess</h1>
            <p className="text-xs text-zinc-400 mt-1">
              Select time control, play against grandmaster bots, or review historical games.
            </p>
          </div>

          {/* Quick link to Masterpiece Game Review Demo */}
          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-300" />
            <span>Open Demo Game Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Time Control Grid */}
        <div className="flex flex-col gap-3">
          <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-[#81b64c]" />
            <span>Choose Time Control</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {timeControls.map((tc) => {
              const Icon = tc.icon;
              const isSelected = selectedTimeControl === tc.sec;
              return (
                <button
                  key={tc.sec}
                  onClick={() => setSelectedTimeControl(tc.sec)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'bg-[#81b64c] border-[#81b64c] text-white shadow-lg shadow-[#81b64c]/20'
                      : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-300 hover:border-zinc-500 hover:bg-[#262420]'
                  }`}
                >
                  <Icon className="w-5 h-5 mb-1" />
                  <span className="text-base font-black font-mono">{tc.label}</span>
                  <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">
                    {tc.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opponent Mode */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>Opponent Mode</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSelectedMode('bot')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  selectedMode === 'bot'
                    ? 'bg-[#282622] border-[#81b64c] text-white'
                    : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
                }`}
              >
                <Bot className="w-6 h-6 text-[#81b64c]" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white">vs Computer</span>
                  <span className="text-[10px] text-zinc-400">Play rated bots</span>
                </div>
              </button>

              <button
                onClick={() => setSelectedMode('pass_and_play')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  selectedMode === 'pass_and_play'
                    ? 'bg-[#282622] border-[#81b64c] text-white'
                    : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
                }`}
              >
                <Users className="w-6 h-6 text-amber-400" />
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black text-white">Pass & Play</span>
                  <span className="text-[10px] text-zinc-400">Two players</span>
                </div>
              </button>
            </div>
          </div>

          {/* Variant Selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-black text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Chess Variant</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {variants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedVariant === v.id
                      ? 'bg-[#282622] border-[#81b64c] text-white'
                      : 'bg-[#1f1d1a] border-[#2e2b26] text-zinc-400 hover:bg-[#262420]'
                  }`}
                >
                  <span className="text-xs font-black block text-white">{v.name}</span>
                  <span className="text-[10px] text-zinc-500">{v.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Play Button */}
        <button
          onClick={handleStartGame}
          className="w-full py-4 rounded-2xl bg-[#81b64c] hover:bg-[#73a542] text-white text-base font-black tracking-wide shadow-2xl shadow-[#81b64c]/25 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5 fill-current" />
          <span>Start Game</span>
        </button>

        {/* Recent Games List with Game Review Funnel */}
        <div className="flex flex-col gap-3 pt-4 border-t border-[#262421]">
          <h2 className="text-sm font-black text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-[#81b64c]" />
            <span>Recent Games & Game Reviews</span>
          </h2>
          <div className="divide-y divide-[#282522] bg-[#1a1815] border border-[#2d2a26] rounded-2xl overflow-hidden">
            {recentGames.map((game) => (
              <div
                key={game.id}
                className="p-4 flex items-center justify-between hover:bg-[#201e1a] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#262421] border border-[#383530] flex items-center justify-center text-lg">
                    {game.whitePlayer.avatar}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">
                      {game.whitePlayer.name} ({game.whitePlayer.rating}) vs{' '}
                      {game.blackPlayer.name} ({game.blackPlayer.rating})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {game.gameResult || 'In Progress'} • {game.moves.length} moves •{' '}
                      {game.variant}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/game/${game.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-[#282622] hover:bg-[#33302b] text-xs font-bold text-zinc-200 border border-[#3b3833] transition-colors cursor-pointer"
                  >
                    Open Game
                  </button>
                  <button
                    onClick={() => router.push(`/game/review/${game.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-xs font-bold text-white transition-colors cursor-pointer flex items-center gap-1 shadow"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Review</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
