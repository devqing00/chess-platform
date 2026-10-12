'use client';

import React, { useState, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { HISTORICAL_GAMES, GrandmasterGame } from '@/lib/historicalGames';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { ChevronFirst, ChevronLeft, ChevronRight, ChevronLast, Trophy, Calendar } from 'lucide-react';
import { soundService } from '@/lib/audioService';

interface HistoricalGamesViewerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const HistoricalGamesViewer: React.FC<HistoricalGamesViewerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [selectedGame, setSelectedGame] = useState<GrandmasterGame>(HISTORICAL_GAMES[0]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);

  // Parse moves from PGN
  const parsedMoves = useMemo(() => {
    const raw = selectedGame.pgn
      .replace(/\d+\./g, '')
      .replace(/1-0|0-1|1\/2-1\/2/g, '')
      .trim()
      .split(/\s+/);
    return raw.filter(Boolean);
  }, [selectedGame]);

  // Generate board state at currentMoveIdx
  const { currentChess, lastMove } = useMemo(() => {
    const c = new Chess();
    let lastM: { from: Square; to: Square } | null = null;
    for (let i = 0; i <= currentMoveIdx && i < parsedMoves.length; i++) {
      try {
        const m = c.move(parsedMoves[i]);
        if (m) {
          lastM = { from: m.from as Square, to: m.to as Square };
        }
      } catch {
        break;
      }
    }
    return { currentChess: c, lastMove: lastM };
  }, [parsedMoves, currentMoveIdx]);

  const handleStep = (idx: number) => {
    setCurrentMoveIdx(idx);
    soundService.playMove();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-center justify-center p-4 select-none">
      {/* Historical Board */}
      <div className="flex flex-col items-center">
        <ChessBoard
          chess={currentChess}
          orientation="w"
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          lastMove={lastMove}
          disabled={true}
        />

        {/* Stepper Controls */}
        <div className="mt-4 flex items-center gap-3 bg-[#21201d] px-4 py-2 rounded-xl border border-[#302e2b]">
          <button
            onClick={() => handleStep(-1)}
            disabled={currentMoveIdx === -1}
            className="p-1.5 rounded hover:bg-[#33302b] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
          >
            <ChevronFirst className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleStep(Math.max(-1, currentMoveIdx - 1))}
            disabled={currentMoveIdx === -1}
            className="p-1.5 rounded hover:bg-[#33302b] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs font-mono font-bold text-zinc-400 px-2">
            Move {currentMoveIdx === -1 ? 0 : Math.floor(currentMoveIdx / 2) + 1} of{' '}
            {Math.ceil(parsedMoves.length / 2)}
          </span>
          <button
            onClick={() => handleStep(Math.min(parsedMoves.length - 1, currentMoveIdx + 1))}
            disabled={currentMoveIdx === parsedMoves.length - 1}
            className="p-1.5 rounded hover:bg-[#33302b] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleStep(parsedMoves.length - 1)}
            disabled={currentMoveIdx === parsedMoves.length - 1}
            className="p-1.5 rounded hover:bg-[#33302b] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
          >
            <ChevronLast className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Game Details Panel */}
      <div className="w-full max-w-md flex flex-col h-[580px] bg-[#21201d] rounded-xl border border-[#302e2b] overflow-hidden">
        {/* Game Selector Tabs */}
        <div className="p-3 bg-[#1b1917] border-b border-[#302e2b] flex gap-2 overflow-x-auto">
          {HISTORICAL_GAMES.map((g) => {
            const isSel = selectedGame.id === g.id;
            return (
              <button
                key={g.id}
                onClick={() => {
                  setSelectedGame(g);
                  setCurrentMoveIdx(-1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isSel
                    ? 'bg-[#81b64c] text-white shadow'
                    : 'bg-[#272522] text-zinc-400 hover:text-white'
                }`}
              >
                {g.event.split(',')[0]} ({g.year})
              </button>
            );
          })}
        </div>

        {/* Game Header */}
        <div className="p-4 bg-[#262421] border-b border-[#302e2b] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{selectedGame.year} &bull; {selectedGame.event}</span>
            </div>
            <span className="text-xs font-bold font-mono text-[#81b64c] bg-[#161512] px-2 py-0.5 rounded border border-[#302e2b]">
              {selectedGame.result}
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">⚪ {selectedGame.white.name}</span>
              <span className="text-zinc-400 font-mono">({selectedGame.white.rating})</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">⚫ {selectedGame.black.name}</span>
              <span className="text-zinc-400 font-mono">({selectedGame.black.rating})</span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
            {selectedGame.description}
          </p>
        </div>

        {/* Moves Grid */}
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-1.5 font-mono text-xs">
          {parsedMoves.map((m, idx) => {
            const isCurrent = currentMoveIdx === idx;
            const turnNum = Math.floor(idx / 2) + 1;
            const isWhite = idx % 2 === 0;

            return (
              <button
                key={idx}
                onClick={() => handleStep(idx)}
                className={`px-2 py-1.5 rounded text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isCurrent
                    ? 'bg-[#81b64c] text-white font-bold'
                    : 'text-zinc-300 hover:bg-[#2e2b27]'
                }`}
              >
                <span className="text-zinc-500 font-sans text-[11px]">
                  {isWhite ? `${turnNum}.` : ''}
                </span>
                <span className="font-bold">{m}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
