'use client';

import React from 'react';
import { MoveRecord, MoveClassification } from '@/types/chess';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';

interface MoveHistoryProps {
  moves: MoveRecord[];
  currentMoveIndex: number; // -1 means initial starting position
  onSelectMove: (index: number) => void;
  showClassifications?: boolean;
}

const CLASSIFICATION_BADGES: Record<MoveClassification, { label: string; color: string; bg: string }> = {
  brilliant: { label: '!!', color: 'text-cyan-300', bg: 'bg-cyan-500/20' },
  great: { label: '!', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  best: { label: '★', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  excellent: { label: '✓', color: 'text-emerald-300', bg: 'bg-emerald-500/10' },
  good: { label: '✓', color: 'text-zinc-300', bg: 'bg-zinc-500/10' },
  inaccuracy: { label: '?!', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  mistake: { label: '?', color: 'text-amber-500', bg: 'bg-amber-500/20' },
  blunder: { label: '??', color: 'text-rose-500', bg: 'bg-rose-500/20' },
  miss: { label: '✕', color: 'text-red-400', bg: 'bg-red-500/20' },
  book: { label: '📖', color: 'text-amber-300', bg: 'bg-amber-800/20' },
};

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  currentMoveIndex,
  onSelectMove,
  showClassifications = false,
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const activeMoveRef = React.useRef<HTMLButtonElement>(null);

  // Auto-scroll to active move whenever it changes
  React.useEffect(() => {
    if (activeMoveRef.current && scrollContainerRef.current) {
      activeMoveRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  // Pair moves into turns: [ { whiteMove, blackMove, turnNumber } ]
  const turns = [];
  for (let i = 0; i < moves.length; i += 2) {
    turns.push({
      turnNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      whiteIndex: i,
      black: moves[i + 1] || null,
      blackIndex: i + 1,
    });
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1c19] rounded-lg border border-[#302e2b] overflow-hidden select-none">
      {/* Header */}
      <div className="px-3 py-2 bg-[#262421] border-b border-[#33302b] flex items-center justify-between text-xs font-bold text-zinc-300">
        <span>Moves Notation</span>
        <span className="text-[10px] text-zinc-500 uppercase font-semibold">
          {moves.length} Half-Moves
        </span>
      </div>

      {/* Move List */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2 space-y-1 text-xs font-medium font-mono">
        {turns.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 italic text-xs">
            Game moves will appear here...
          </div>
        ) : (
          turns.map((turn) => {
            const isWhiteActive = currentMoveIndex === turn.whiteIndex;
            const isBlackActive = currentMoveIndex === turn.blackIndex;

            const whiteClassKey =
              typeof turn.white.classification === 'string'
                ? turn.white.classification
                : (turn.white.classification as any)?.classification;
            const blackClassKey =
              typeof turn.black?.classification === 'string'
                ? turn.black.classification
                : (turn.black?.classification as any)?.classification;

            const whiteBadge =
              showClassifications && whiteClassKey
                ? CLASSIFICATION_BADGES[whiteClassKey as keyof typeof CLASSIFICATION_BADGES]
                : null;
            const blackBadge =
              showClassifications && blackClassKey
                ? CLASSIFICATION_BADGES[blackClassKey as keyof typeof CLASSIFICATION_BADGES]
                : null;

            return (
              <div
                key={turn.turnNumber}
                className="grid grid-cols-[36px_1fr_1fr] items-center gap-1.5 px-2 py-1 rounded hover:bg-[#272522] transition-colors"
              >
                {/* Turn Number */}
                <span className="text-zinc-500 text-[11px] font-sans font-semibold">
                  {turn.turnNumber}.
                </span>

                {/* White Move */}
                <button
                  ref={isWhiteActive ? activeMoveRef : null}
                  onClick={() => onSelectMove(turn.whiteIndex)}
                  className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                    isWhiteActive
                      ? 'bg-[#81b64c] text-white font-bold'
                      : 'text-zinc-200 hover:bg-[#33302b]'
                  }`}
                >
                  <span>{turn.white.san}</span>
                  {whiteBadge && (
                    <span
                      className={`text-[10px] font-bold px-1 rounded ${whiteBadge.bg} ${whiteBadge.color}`}
                    >
                      {whiteBadge.label}
                    </span>
                  )}
                </button>

                {/* Black Move */}
                {turn.black ? (
                  <button
                    ref={isBlackActive ? activeMoveRef : null}
                    onClick={() => onSelectMove(turn.blackIndex)}
                    className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors ${
                      isBlackActive
                        ? 'bg-[#81b64c] text-white font-bold'
                        : 'text-zinc-200 hover:bg-[#33302b]'
                    }`}
                  >
                    <span>{turn.black.san}</span>
                    {blackBadge && (
                      <span
                        className={`text-[10px] font-bold px-1 rounded ${blackBadge.bg} ${blackBadge.color}`}
                      >
                        {blackBadge.label}
                      </span>
                    )}
                  </button>
                ) : (
                  <div />
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stepper Navigation Bar */}
      <div className="p-2 bg-[#262421] border-t border-[#33302b] flex items-center justify-center gap-2">
        <button
          onClick={() => onSelectMove(-1)}
          disabled={currentMoveIndex === -1}
          className="p-1.5 rounded hover:bg-[#383530] disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
          title="Beginning of Game"
        >
          <ChevronFirst className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.max(-1, currentMoveIndex - 1))}
          disabled={currentMoveIndex === -1}
          className="p-1.5 rounded hover:bg-[#383530] disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
          title="Previous Move"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(Math.min(moves.length - 1, currentMoveIndex + 1))}
          disabled={currentMoveIndex === moves.length - 1}
          className="p-1.5 rounded hover:bg-[#383530] disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
          title="Next Move"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSelectMove(moves.length - 1)}
          disabled={currentMoveIndex === moves.length - 1}
          className="p-1.5 rounded hover:bg-[#383530] disabled:opacity-30 disabled:hover:bg-transparent text-zinc-300 transition-colors cursor-pointer"
          title="Latest Position"
        >
          <ChevronLast className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
