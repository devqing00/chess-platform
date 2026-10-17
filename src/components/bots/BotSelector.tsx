'use client';

import React, { useState, useEffect } from 'react';
import { BotPersonality } from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { Bot, Swords, Sparkles, Star, Award, CheckCircle, Search, Play } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
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
    const matchesFilter = filter === 'all' || b.category === filter;
    const matchesSearch =
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.rating.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const selectedStars = botStarsMap[selectedBot.id] || 0;

  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch select-none text-zinc-100">
      {/* LEFT: SELECTED BOT HERO SHOWCASE & ONE P1 ANCHOR (5 Cols) */}
      <div className="lg:col-span-5 h-full p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#81b64c] flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>Challenger Spotlight</span>
            </span>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {selectedBot.category.toUpperCase()}
            </span>
          </div>

          {/* Bot Avatar & Bio Card */}
          <div className="p-4 rounded-2xl bg-[#141311] border border-white/5 flex flex-col items-center text-center gap-3">
            <div className="w-20 h-20 rounded-2xl bg-[#262420] border-2 border-white/10 overflow-hidden flex items-center justify-center text-3xl shadow-lg relative">
              {selectedBot.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedBot.avatar} alt={selectedBot.name} className="w-full h-full object-cover" />
              ) : (
                <span>{selectedBot.avatar}</span>
              )}
              {selectedStars > 0 && (
                <span className="absolute top-1 right-1 w-5 h-5 bg-[#81b64c] border-2 border-[#141311] rounded-full flex items-center justify-center text-white text-[10px] font-black">
                  ✓
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-base font-extrabold text-white">{selectedBot.name}</h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-white/10 text-[#81b64c]">
                  {selectedBot.rating} Elo
                </span>
              </div>
              <p className="text-xs text-zinc-400 italic mt-1 font-medium">&ldquo;{selectedBot.quotes.gameStart[0] || selectedBot.bio}&rdquo;</p>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed max-w-sm line-clamp-3">
                {selectedBot.bio}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400">
              <span>Play Style: {selectedBot.playStyle}</span>
            </div>
          </div>

          {/* Color Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Your Color
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPlayAsColor('w')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  playAsColor === 'w'
                    ? 'bg-white/15 border-white text-white'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚪</span>
                <span>White</span>
              </button>
              <button
                onClick={() => setPlayAsColor('random')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  playAsColor === 'random'
                    ? 'bg-white/15 border-[#81b64c] text-[#81b64c]'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>🌓</span>
                <span>Random</span>
              </button>
              <button
                onClick={() => setPlayAsColor('b')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  playAsColor === 'b'
                    ? 'bg-white/15 border-zinc-400 text-white'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                <span>⚫</span>
                <span>Black</span>
              </button>
            </div>
          </div>
        </div>

        {/* P1 PRIMARY ACTION ANCHOR - EXACTLY ONE ON SCREEN */}
        <div className="pt-2">
          <button
            onClick={() => onStartGameWithBot(selectedBot, playAsColor)}
            className="w-full py-4 px-6 rounded-xl bg-[#81b64c] hover:bg-[#92cb56] text-black font-black text-sm tracking-tight shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Challenge {selectedBot.name} (10m Sparring)</span>
          </button>
        </div>
      </div>

      {/* RIGHT: BOT ROSTER & SEARCH (7 Cols) - Internal Scroll, Zero Button Clutter */}
      <div className="lg:col-span-7 h-full p-5 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col gap-3 min-h-0">
        {/* Search & Tier Pills Header */}
        <div className="flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Bot Sparring Roster ({filteredBots.length})
            </span>
            <div className="relative w-44">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search bot..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-[#141311] border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
            {[
              { id: 'all', label: 'All' },
              { id: 'beginner', label: 'Beginner' },
              { id: 'intermediate', label: 'Intermediate' },
              { id: 'advanced', label: 'Advanced' },
              { id: 'master', label: 'Master' },
              { id: 'grandmaster', label: 'Grandmaster' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setFilter(cat.id as typeof filter)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border transition cursor-pointer shrink-0 ${
                  filter === cat.id
                    ? 'bg-[#81b64c] text-black border-[#81b64c]'
                    : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Internal Scrollable Bot Grid - NO duplicate green buttons shouting */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {filteredBots.map((bot) => {
            const isSelected = selectedBot.id === bot.id;
            const stars = botStarsMap[bot.id] || 0;
            const isDefeated = stars > 0;

            return (
              <div
                key={bot.id}
                onClick={() => onSelectBot(bot)}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white/15 border-[#81b64c] shadow-sm'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="w-11 h-11 rounded-xl bg-black/40 overflow-hidden flex items-center justify-center text-xl shrink-0 relative">
                  {bot.avatar.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={bot.avatar} alt={bot.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{bot.avatar}</span>
                  )}
                  {isDefeated && (
                    <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#81b64c] rounded-full flex items-center justify-center text-white text-[8px] font-black">
                      ✓
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{bot.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400 font-bold">
                      {bot.rating}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-zinc-500">
                    {bot.category}
                  </span>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">{bot.playStyle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
