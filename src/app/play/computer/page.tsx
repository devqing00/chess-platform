'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { BotSelector } from '@/components/bots/BotSelector';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Bot, Play } from 'lucide-react';

export default function PlayComputerPage() {
  const router = useRouter();
  const { effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]);

  const handleStartGame = (bot: BotPersonality, side?: 'w' | 'b' | 'random') => {
    const resolvedSide: 'w' | 'b' =
      !side || side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side;

    const userPlayer: GamePlayer = {
      id: 'local-user',
      name: effectiveDisplayName || 'You',
      rating: effectiveRating || 1200,
      avatar: effectiveAvatar || '🧑‍💻',
      country: (effectiveCountry || 'US').toUpperCase(),
    };

    const botPlayer: GamePlayer = {
      id: bot.id,
      name: bot.name,
      rating: bot.rating,
      avatar: bot.avatar,
      title: bot.rating >= 2800 ? 'GM' : 'BOT',
      isBot: true,
    };

    const whitePlayer = resolvedSide === 'w' ? userPlayer : botPlayer;
    const blackPlayer = resolvedSide === 'w' ? botPlayer : userPlayer;

    const session = GameSessionStore.createSession(whitePlayer, blackPlayer, 600, 'standard');
    router.push(`/game/${session.id}`);
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl flex flex-col gap-4 sm:gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-[#262421] pb-3.5 sm:pb-4 gap-3">
          <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => router.push('/play')}
              className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white bg-[#211f1c] hover:bg-[#282622] border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Lobby</span>
            </button>
            <span className="text-zinc-600 hidden sm:inline">|</span>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide truncate">Computer Bots</h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 truncate sm:whitespace-normal">
                Challenge adaptive AI personalities ranging from beginner (250 ELO) to Grandmaster (3200 ELO).
              </p>
            </div>
          </div>
        </div>

        {/* Bot Selector Hub */}
        <div className="h-[calc(100vh-190px)] sm:h-[720px] min-h-[480px] bg-[#1a1815] border-2 border-[#2d2a26] rounded-2xl overflow-hidden shadow-2xl">
          <BotSelector
            selectedBot={selectedBot}
            onSelectBot={(b) => setSelectedBot(b)}
            onStartGameWithBot={handleStartGame}
          />
        </div>
      </div>
    </div>
  );
}
