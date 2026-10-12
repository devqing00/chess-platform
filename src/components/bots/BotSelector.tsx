'use client';

import React, { useState } from 'react';
import { BotPersonality } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { Bot, Swords, Sparkles, Star } from 'lucide-react';

interface BotSelectorProps {
  selectedBot: BotPersonality;
  onSelectBot: (bot: BotPersonality) => void;
  onStartGameWithBot: (bot: BotPersonality) => void;
}

export const BotSelector: React.FC<BotSelectorProps> = ({
  selectedBot,
  onSelectBot,
  onStartGameWithBot,
}) => {
  const [filter, setFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced' | 'master' | 'grandmaster'>('all');

  const filteredBots = CHESS_BOTS.filter((b) => {
    if (filter === 'all') return true;
    return b.category === filter;
  });

  return (
    <div className="flex flex-col h-full bg-[#1b1917] rounded-xl border border-[#2d2a26] overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 bg-[#161512] border-b border-[#2d2a26] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bot className="w-5 h-5 text-[#81b64c]" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Computer Personalities & Grandmasters
            </h2>
          </div>
          <span className="text-xs text-zinc-400 font-mono font-semibold">
            {CHESS_BOTS.length} Bots Available
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Bots' },
            { id: 'beginner', label: 'Beginner (250-700)' },
            { id: 'intermediate', label: 'Intermediate (1300-1600)' },
            { id: 'advanced', label: 'Advanced (1800)' },
            { id: 'master', label: 'Master (2000-2200)' },
            { id: 'grandmaster', label: 'Grandmaster (2800+)' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilter(cat.id as typeof filter)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                filter === cat.id
                  ? 'bg-[#81b64c] text-white'
                  : 'bg-[#272522] text-zinc-400 hover:text-white hover:bg-[#33302b]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bot Grid */}
      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredBots.map((bot) => {
          const isSelected = selectedBot.id === bot.id;
          return (
            <div
              key={bot.id}
              onClick={() => onSelectBot(bot)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#2a2824] border-[#81b64c] shadow-lg shadow-[#81b64c]/10'
                  : 'bg-[#21201d] border-[#302e2b] hover:border-[#423f39] hover:bg-[#262421]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#2d2a26] border border-[#3f3b35] flex items-center justify-center text-2xl shadow-inner shrink-0">
                  {bot.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">{bot.name}</span>
                    <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-[#161512] text-[#81b64c] border border-[#302e2b]">
                      {bot.rating}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                    {bot.category}
                  </span>
                  <p className="text-xs text-zinc-300 mt-1 line-clamp-2 leading-relaxed">
                    {bot.bio}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#302e2b] flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 italic line-clamp-1">
                  Style: {bot.playStyle}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartGameWithBot(bot);
                  }}
                  className="px-3 py-1 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow"
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
