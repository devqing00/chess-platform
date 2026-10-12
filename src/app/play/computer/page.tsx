'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { BotSelector } from '@/components/bots/BotSelector';
import { ArrowLeft, Bot, Play } from 'lucide-react';

export default function PlayComputerPage() {
  const router = useRouter();
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]);

  const handleStartGame = (bot: BotPersonality) => {
    const whitePlayer: GamePlayer = {
      id: 'player-you',
      name: 'You',
      rating: 1250,
      avatar: '🧑‍💻',
      country: 'US',
    };

    const blackPlayer: GamePlayer = {
      id: bot.id,
      name: bot.name,
      rating: bot.rating,
      avatar: bot.avatar,
      title: bot.rating >= 2800 ? 'GM' : 'BOT',
      isBot: true,
    };

    const session = GameSessionStore.createSession(whitePlayer, blackPlayer, 600, 'standard');
    router.push(`/game/${session.id}`);
  };

  return (
    <div className="flex-1 p-6 lg:p-10 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#262421] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/play')}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Lobby</span>
            </button>
            <span className="text-zinc-600">|</span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-wide">Computer Bots</h1>
              <p className="text-xs text-zinc-400">
                Challenge adaptive AI personalities ranging from beginner (250 ELO) to Grandmaster (3200 ELO).
              </p>
            </div>
          </div>
        </div>

        {/* Bot Selector Hub */}
        <div className="h-[720px] bg-[#1a1815] border border-[#2d2a26] rounded-2xl overflow-hidden shadow-2xl">
          <BotSelector
            selectedBot={selectedBot}
            onSelectBot={(b) => setSelectedBot(b)}
            onStartGameWithBot={(b) => handleStartGame(b)}
          />
        </div>
      </div>
    </div>
  );
}
