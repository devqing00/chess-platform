'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BotSelector } from '@/components/bots/BotSelector';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';

export default function BotsPage() {
  const router = useRouter();
  const { effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]);

  const handleStartGame = (bot: BotPersonality) => {
    const whitePlayer: GamePlayer = {
      id: 'local-user',
      name: effectiveDisplayName,
      rating: effectiveRating,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    };

    const blackPlayer: GamePlayer = {
      id: bot.id,
      name: bot.name,
      rating: bot.rating,
      avatar: bot.avatar,
      title: bot.rating >= 2800 ? 'GM' : 'BOT',
      isBot: true,
    };

    const session = GameSessionStore.createSession(
      whitePlayer,
      blackPlayer,
      600,
      'standard'
    );

    router.push(`/game/${session.id}`);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl h-[calc(100vh-100px)] min-h-[600px]">
        <BotSelector
          selectedBot={selectedBot}
          onSelectBot={(b) => setSelectedBot(b)}
          onStartGameWithBot={handleStartGame}
        />
      </div>
    </div>
  );
}
