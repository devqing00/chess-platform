'use client';

import React, { useState, useEffect } from 'react';
import { BotPersonality } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { Bot, Swords, Sparkles, Star, Award, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { FirestoreService } from '@/lib/firebase/firestoreService';

interface BotSelectorProps {
  selectedBot: BotPersonality;
  onSelectBot: (bot: BotPersonality) => void;
  onStartGameWithBot: (bot: BotPersonality, side?: 'w' | 'b' | 'random') => void;
}

export const BotSelector: React.FC<BotSelectorProps> = ({
  selectedBot,
  onSelectBot,
  onStartGameWithBot,
}) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'>('all');
  const [playAsColor, setPlayAsColor] = useState<'w' | 'random' | 'b'>('w');
  const [botStarsMap, setBotStarsMap] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {};
    const map: Record<string, number> = {};
    CHESS_BOTS.forEach((b) => {
      try {
        const val = localStorage.getItem(`bot_stars_${b.id}`);
        if (val) map[b.id] = parseInt(val, 10);
      } catch {}
    });
    return map;
  });

  // Fetch bot stars progress from Firestore if authenticated
  useEffect(() => {
    if (!user?.uid) return;
    FirestoreService.getUserBotsProgress(user.uid).then((records) => {
      if (records && Object.keys(records).length > 0) {
        setBotStarsMap((prev) => {
          const merged = { ...prev };
          Object.entries(records).forEach(([botId, data]) => {
            merged[botId] = Math.max(merged[botId] || 0, data.stars || 0);
            try {
              localStorage.setItem(`bot_stars_${botId}`, String(merged[botId]));
            } catch {}
          });
          return merged;
        });
      }
    });
  }, [user?.uid]);

  const filteredBots = CHESS_BOTS.filter((b) => {
    if (filter === 'all') return true;
    return b.category === filter;
  });

  return (
    <div className="flex flex-col h-full bg-[#1b1917] rounded-2xl border-2 border-[#35322b] shadow-[0_4px_0_0_#141311] overflow-hidden select-none">
      {/* Header */}
      <div className="p-3 sm:p-4 bg-[#161512] border-b-2 border-[#2d2a26] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#81b64c]/15 border-2 border-[#81b64c]/40 flex items-center justify-center text-[#81b64c] shadow-[0_2px_0_0_#4d7a24] shrink-0">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-xs sm:text-base font-black uppercase tracking-wider text-white truncate">
              Computer Personalities &amp; Grandmasters
            </h2>
          </div>
          <span className="text-[10px] sm:text-xs text-zinc-400 font-mono font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border-2 border-[#35322c] bg-[#1a1815] shrink-0">
            {CHESS_BOTS.length} Bots
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none flex-nowrap sm:flex-wrap">
          {[
            { id: 'all', label: 'All Bots' },
            { id: 'beginner', label: 'Beginner' },
            { id: 'intermediate', label: 'Intermediate' },
            { id: 'advanced', label: 'Advanced' },
            { id: 'master', label: 'Master' },
            { id: 'grandmaster', label: 'Grandmaster' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as typeof filter)}
              className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1 rounded-full border-2 transition-all cursor-pointer shrink-0 ${
                filter === cat.id
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                  : 'bg-[#272522] text-zinc-400 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:text-white hover:border-[#444037]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Play As Color Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t-2 border-[#262420]">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-zinc-400">Play As:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
            <button
              onClick={() => setPlayAsColor('w')}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 shrink-0 ${
                playAsColor === 'w'
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                  : 'bg-[#24221f] text-zinc-400 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:text-white'
              }`}
            >
              <span>♔</span>
              <span>White</span>
            </button>
            <button
              onClick={() => setPlayAsColor('random')}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 shrink-0 ${
                playAsColor === 'random'
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                  : 'bg-[#24221f] text-zinc-400 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:text-white'
              }`}
            >
              <span>☯</span>
              <span>Random</span>
            </button>
            <button
              onClick={() => setPlayAsColor('b')}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 shrink-0 ${
                playAsColor === 'b'
                  ? 'bg-[#81b64c] text-white border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                  : 'bg-[#24221f] text-zinc-400 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:text-white'
              }`}
            >
              <span>♚</span>
              <span>Black</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bot Grid */}
      <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
        {filteredBots.map((bot) => {
          const isSelected = selectedBot.id === bot.id;
          const stars = botStarsMap[bot.id] || 0;
          const isDefeated = stars > 0;

          return (
            <div
              key={bot.id}
              onClick={() => onSelectBot(bot)}
              className={`p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#2a2824] border-[#81b64c] shadow-[0_4px_0_0_#4d7a24] -translate-y-0.5'
                  : 'bg-[#21201d] border-[#35322b] shadow-[0_3px_0_0_#141311] hover:border-[#423f39] hover:-translate-y-0.5'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-[#2d2a26] border-2 border-[#3f3b35] shadow-[0_2px_0_0_#141311] flex items-center justify-center text-xl sm:text-2xl shrink-0 relative">
                  {bot.avatar}
                  {isDefeated && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#81b64c] border-2 border-[#1b1917] rounded-full flex items-center justify-center text-white text-[9px] font-black shadow">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white truncate">{bot.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isDefeated && (
                        <div className="flex items-center gap-0.5" title={`${stars} Star Victory`}>
                          {[1, 2, 3].map((s) => (
                            <span
                              key={s}
                              className={`text-xs ${
                                s <= stars ? 'text-amber-400' : 'text-zinc-600'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="text-xs font-mono font-black px-2 py-0.5 rounded-full bg-[#161512] text-[#81b64c] border-2 border-[#302e2b]">
                        {bot.rating}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-black text-zinc-400 tracking-wider">
                    {bot.category}
                  </span>
                  <p className="text-xs text-zinc-300 mt-0.5 sm:mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed font-medium">
                    {bot.bio}
                  </p>
                </div>
              </div>

              <div className="mt-2.5 sm:mt-3 pt-2.5 border-t-2 border-[#302e2b] flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-zinc-400 italic line-clamp-1 font-medium">
                    {bot.playStyle}
                  </span>
                  {isDefeated && (
                    <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[9px] font-black uppercase text-emerald-400">
                      <CheckCircle className="w-2.5 h-2.5" />
                      {stars === 3 ? 'Mastered' : `${stars}★`}
                    </span>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartGameWithBot(bot, playAsColor);
                  }}
                  className="px-3.5 sm:px-4 py-1.5 rounded-full bg-[#81b64c] hover:bg-[#8cc653] text-white text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24] active:translate-y-[1px] active:shadow-none shrink-0"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Challenge</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
