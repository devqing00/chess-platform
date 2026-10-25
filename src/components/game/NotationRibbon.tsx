'use client';

import React, { useRef, useEffect } from 'react';
import { MoveRecord } from '@/types/chess';
import { ClassificationBadge } from '../board/ClassificationBadge';

interface NotationRibbonProps {
  moves: MoveRecord[];
  currentMoveIndex: number;
  onSelectMove: (index: number) => void;
  showClassifications?: boolean;
}

export const NotationRibbon: React.FC<NotationRibbonProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  showClassifications = false,
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
      className="w-full max-w-[580px] bg-[#181614] border-2 border-[#35322b] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 overflow-x-auto select-none no-scrollbar text-xs font-mono font-semibold shadow-[0_3px_0_0_#141311]"
    >
      {moves.map((move, idx) => {
        const isWhite = idx % 2 === 0;
        const turnNum = Math.floor(idx / 2) + 1;
        const isCurrent = currentMoveIndex === idx;

        return (
          <button
            key={idx}
            onClick={() => onSelectMove(idx)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 ${
              isCurrent
                ? 'bg-gradient-to-b from-[#8fd649] to-[#699c30] text-white font-black border-t border-white/35 shadow-[0_2px_0_0_#385a16]'
                : 'text-zinc-300 hover:text-white hover:bg-[#262420] border-2 border-transparent font-bold'
            }`}
          >
            {isWhite && <span className="text-zinc-500 font-sans font-bold">{turnNum}.</span>}
            <span>{move.san}</span>
            {showClassifications && move.classification && (
              <ClassificationBadge
                classification={
                  typeof move.classification === 'string'
                    ? move.classification
                    : (move.classification as any)?.classification || 'good'
                }
                size="sm"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
