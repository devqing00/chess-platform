'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BotSelector } from '@/components/bots/BotSelector';
import { CHESS_BOTS } from '@/lib/botsData';
import { BotPersonality, GamePlayer } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { useAuth } from '@/context/AuthContext';
import { Bot, Sparkles, X } from 'lucide-react';

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
    <div className="w-full h-full max-h-full overflow-hidden p-3 sm:p-5 flex flex-col bg-[#161512] text-zinc-100 select-none">
      <div className="w-full max-w-6xl mx-auto h-full flex flex-col min-h-0 gap-3">
        {/* Custom FEN Position Banner if deep-linked */}
        {activeCustomFen && (
          <div className="w-full bg-[#1c1a17] border border-amber-500/30 rounded-xl p-2.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-amber-300 truncate">
                Sparring from Transferred Position: <span className="font-mono text-zinc-400 text-[11px]">{activeCustomFen}</span>
              </span>
            </div>
            <button
              onClick={() => setActiveCustomFen(undefined)}
              className="p-1 rounded bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition cursor-pointer shrink-0"
              title="Reset position"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Minimalist Top HUD Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                Computer Personalities Arena
              </h1>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-medium">
                Spar against simulated Grandmasters, adaptive coaches &amp; fun bots
              </p>
            </div>
          </div>
        </div>

        {/* Main Viewport Screen */}
        <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
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
