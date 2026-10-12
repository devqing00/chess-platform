'use client';

import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '@/types/chess';
import { ClassificationBadge } from '../board/ClassificationBadge';

interface NotationRibbonProps {
  moves: MoveRecord[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
}

export const NotationRibbon: React.FC<NotationRibbonProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to end on new move
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [moves.length]);

  if (moves.length === 0) return null;

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[580px] bg-[#1a1815] border border-[#2d2a26] rounded-lg px-3 py-1.5 flex items-center gap-2 overflow-x-auto select-none no-scrollbar text-xs font-mono font-semibold"
    >
      {moves.map((move, idx) => {
        const isWhite = idx % 2 === 0;
        const turnNum = Math.floor(idx / 2) + 1;
        const isCurrent = currentMoveIndex === idx;

        return (
          <button
            key={idx}
            onClick={() => onSelectMove(idx)}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
              isCurrent
                ? 'bg-[#81b64c] text-white font-bold shadow'
                : 'text-zinc-300 hover:text-white hover:bg-[#2b2824]'
            }`}
          >
            {isWhite && <span className="text-zinc-500 font-sans">{turnNum}.</span>}
            <span>{move.san}</span>
            {move.classification && (
              <ClassificationBadge classification={move.classification} size="sm" />
            )}
          </button>
        );
      })}
    </div>
  );
};
