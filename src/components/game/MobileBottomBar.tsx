'use client';

import React from 'react';
import { ListOrdered, MessageSquare, Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface MobileBottomBarProps {
  onToggleMoves: () => void;
  onToggleChat: () => void;
  onOpenAnalysis: () => void;
  onPrevMove: () => void;
  onNextMove: () => void;
  canPrev: boolean;
  canNext: boolean;
  hasUnreadChat?: boolean;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = ({
  onToggleMoves,
  onToggleChat,
  onOpenAnalysis,
  onPrevMove,
  onNextMove,
  canPrev,
  canNext,
  hasUnreadChat = false,
}) => {
  return (
    <div className="w-full max-w-[580px] bg-[#1a1815] border border-[#2d2a26] rounded-xl px-4 py-2 flex items-center justify-between shadow-lg select-none">
      {/* Left controls: Moves list & Chat */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleMoves}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer"
          title="Toggle Move List"
        >
          <ListOrdered className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleChat}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer relative"
          title="Toggle Bot Chat"
        >
          <MessageSquare className="w-5 h-5" />
          {hasUnreadChat && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
          )}
        </button>
      </div>

      {/* Center prominent green star / analysis action button */}
      <button
        onClick={onOpenAnalysis}
        className="px-6 py-2 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white shadow-md shadow-[#81b64c]/20 transition-all cursor-pointer flex items-center justify-center"
        title="Game Analysis & Review"
      >
        <Star className="w-6 h-6 fill-current text-white" />
      </button>

      {/* Right controls: Prev / Next Move arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevMove}
          disabled={!canPrev}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] disabled:opacity-30 transition-colors cursor-pointer"
          title="Previous Move"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={onNextMove}
          disabled={!canNext}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] disabled:opacity-30 transition-colors cursor-pointer"
          title="Next Move"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
