'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BotSelector } from '@/components/bots/BotSelector';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { Sparkles, X } from 'lucide-react';

export default function BotsPage() {
  const router = useRouter();
  const { effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry } = useAuth();
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]);
  const [activeCustomFen, setActiveCustomFen] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const search = new URLSearchParams(window.location.search);
    const fen = search.get('fen');
    if (fen) {
      setActiveCustomFen(decodeURIComponent(fen));
    }
  }, []);

  const handleStartGame = (bot: BotPersonality, side?: 'w' | 'b' | 'random') => {
    const resolvedSide: 'w' | 'b' =
      !side || side === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : side;

    const userPlayer: GamePlayer = {
      id: 'local-user',
      name: effectiveDisplayName,
      rating: effectiveRating || 1200,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
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

    const session = GameSessionStore.createSession(
      whitePlayer,
      blackPlayer,
      600,
      'standard',
      activeCustomFen
    );

    router.push(`/game/${session.id}`);
  };

  return (
    <div className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col items-center justify-start bg-[#161512] text-zinc-100 overflow-y-auto select-none gap-3 sm:gap-4">
      {/* Custom FEN Position Banner if deep-linked from Openings, Puzzles or Review */}
      {activeCustomFen && (
        <div className="w-full max-w-5xl bg-gradient-to-r from-amber-950/40 via-[#1f1d1a] to-amber-950/30 border-2 border-amber-500/40 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 shadow-[0_2px_0_0_#141311]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider truncate">
                Sparring from Transferred Position
              </span>
              <span className="text-[10px] sm:text-[11px] text-zinc-400 font-mono truncate max-w-[200px] sm:max-w-md">
                {activeCustomFen}
              </span>
            </div>
          </div>
          <button
            onClick={() => setActiveCustomFen(undefined)}
            className="p-1.5 rounded-lg bg-[#262420] hover:bg-[#332f28] text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
            title="Reset to standard initial position"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="w-full max-w-5xl flex items-center justify-between">
        <h1 className="text-sm sm:text-lg font-black uppercase tracking-wider text-white">
          Bot Personalities &amp; Sparring Arena
        </h1>
      </div>

      <div className="w-full max-w-5xl flex-1 min-h-[480px] sm:min-h-[560px] flex flex-col pb-16 md:pb-0">
        <BotSelector
          selectedBot={selectedBot}
          onSelectBot={(b) => setSelectedBot(b)}
          onStartGameWithBot={handleStartGame}
        />
      </div>
    </div>
  );
}
