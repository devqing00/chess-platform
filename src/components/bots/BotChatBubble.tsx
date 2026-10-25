'use client';

import React from 'react';
import { BotPersonality } from '@/types/chess';
import { MessageSquare } from 'lucide-react';

interface BotChatBubbleProps {
  bot: BotPersonality;
  message: string;
}

export const BotChatBubble: React.FC<BotChatBubbleProps> = ({
  bot,
  message,
}) => {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2.5 p-3 bg-[#262421] rounded-xl border border-[#383530] select-none shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
      <div className="w-8 h-8 rounded-lg bg-[#33302b] flex items-center justify-center text-lg shrink-0 border border-[#403c37]">
        {bot.avatar}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-white">{bot.name}</span>
          <MessageSquare className="w-3 h-3 text-emerald-400" />
        </div>
        <p className="text-xs text-zinc-300 mt-0.5 italic leading-relaxed">
          &ldquo;{message}&rdquo;
        </p>
      </div>
    </div>
  );
};
