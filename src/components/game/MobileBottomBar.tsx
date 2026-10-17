'use client';

import React from 'react';
import { ListOrdered, MessageSquare, Star, ChevronLeft, ChevronRight, RotateCcw, Flag, MoreHorizontal } from 'lucide-react';

interface MobileBottomBarProps {
  onToggleMoves: () => void;
  onToggleChat: () => void;
  onOpenAnalysis: () => void;
  onPrevMove: () => void;
  onNextMove: () => void;
  canPrev: boolean;
  canNext: boolean;
  hasUnreadChat?: boolean;
  isGameOver?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onResign?: () => void;
  onOpenMore?: () => void;
}

export const MobileBottomBar: React.FC<MobileBottomBarProps> = React.memo(function MobileBottomBar({
  onToggleMoves,
  onToggleChat,
  onOpenAnalysis,
  onPrevMove,
  onNextMove,
  canPrev,
  canNext,
  hasUnreadChat = false,
  isGameOver = false,
  onUndo,
  canUndo = false,
  onResign,
  onOpenMore,
}) {
  return (
    <div className="w-full max-w-[580px] bg-[#1a1815] border border-[#35322b] rounded-xl px-2 py-1 flex items-center justify-between shadow-sm select-none gap-1.5 min-h-[36px] max-h-[40px]">
      {/* Left controls: Moves list, Chat, and More */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleMoves}
          className="p-1.5 rounded-lg border border-[#35322b] bg-[#262420] text-zinc-300 hover:text-white hover:bg-[#2f2c27] transition-colors cursor-pointer"
          title="Toggle Move List"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onToggleChat}
          className="p-1.5 rounded-lg border border-[#35322b] bg-[#262420] text-zinc-300 hover:text-white hover:bg-[#2f2c27] transition-colors cursor-pointer relative"
          title="Toggle Bot Chat"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {hasUnreadChat && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#81b64c] border border-[#1a1815]" />
          )}
        </button>
        {onOpenMore && (
          <button
            onClick={onOpenMore}
            className="p-1.5 rounded-lg border border-[#35322b] bg-[#262420] text-zinc-300 hover:text-white hover:bg-[#2f2c27] transition-colors cursor-pointer"
            title="More Game Options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Center Action: Undo Move during bot game, OR Game Review when Game Over */}
      <div className="flex items-center gap-1.5">
        {onUndo && !isGameOver && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="px-2.5 py-1 rounded-lg bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 disabled:opacity-30 text-amber-300 border border-[#f59e0b]/40 text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1"
            title="Undo Move (Takeback)"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Undo</span>
          </button>
        )}

        {isGameOver && (
          <button
            onClick={onOpenAnalysis}
            className="px-3 py-1 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm"
            title="Game Analysis & Review"
          >
            <Star className="w-3.5 h-3.5 fill-current text-white" />
            <span>Review</span>
          </button>
        )}
      </div>

      {/* Right controls: Prev / Next Move navigation */}
      <div className="flex items-center gap-1">
        <button
          onClick={onPrevMove}
          disabled={!canPrev}
          className="p-1.5 rounded-lg border border-[#35322b] bg-[#262420] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Previous Move (←)"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onNextMove}
          disabled={!canNext}
          className="p-1.5 rounded-lg border border-[#35322b] bg-[#262420] text-zinc-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
          title="Next Move (→)"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
});
