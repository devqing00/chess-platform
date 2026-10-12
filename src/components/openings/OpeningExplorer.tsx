'use client';

import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OPENINGS_DATABASE } from '@/lib/openingsData';
import { OpeningInfo, BoardTheme, PieceTheme } from '@/types/chess';
import { BookOpen, Search, BarChart3, ChevronRight } from 'lucide-react';

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [selectedOpening, setSelectedOpening] = useState<OpeningInfo>(OPENINGS_DATABASE[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtered openings
  const filteredOpenings = useMemo(() => {
    return OPENINGS_DATABASE.filter(
      (op) =>
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.eco.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Compute chess board position by playing opening moves
  const chessInstance = useMemo(() => {
    const c = new Chess();
    // moves string e.g. "1. e4 e5 2. Nf3 Nc6 3. Bb5"
    const cleaned = selectedOpening.moves.replace(/\d+\./g, '').trim().split(/\s+/);
    for (const move of cleaned) {
      if (!move) continue;
      try {
        c.move(move);
      } catch {
        break;
      }
    }
    return c;
  }, [selectedOpening]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full items-center justify-center p-4 select-none">
      {/* Opening Chessboard */}
      <div className="flex flex-col items-center">
        <ChessBoard
          chess={chessInstance}
          orientation="w"
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          disabled={true}
        />
      </div>

      {/* Opening Tree & Stats Panel */}
      <div className="w-full max-w-lg flex flex-col h-[580px] bg-[#21201d] rounded-xl border border-[#302e2b] overflow-hidden">
        {/* Search Header */}
        <div className="p-3 bg-[#1b1917] border-b border-[#302e2b] flex items-center gap-2">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search opening or ECO code (e.g. Sicilian, C60)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
          />
        </div>

        {/* Selected Opening Overview */}
        <div className="p-4 bg-[#262421] border-b border-[#302e2b] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-wide">
              {selectedOpening.name}
            </h3>
            <span className="text-xs font-mono font-bold bg-[#161512] text-[#81b64c] px-2 py-0.5 rounded border border-[#302e2b]">
              {selectedOpening.eco}
            </span>
          </div>

          <div className="text-xs font-mono text-zinc-300 font-semibold bg-[#161512] p-2 rounded border border-[#302e2b]">
            {selectedOpening.moves}
          </div>

          {/* Win / Draw / Loss Percentage Bar */}
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex justify-between text-[11px] font-semibold text-zinc-400">
              <span className="text-white">White {selectedOpening.whiteWinPct}%</span>
              <span className="text-zinc-400">Draw {selectedOpening.drawPct}%</span>
              <span className="text-zinc-300">Black {selectedOpening.blackWinPct}%</span>
            </div>
            <div className="h-2.5 w-full bg-[#161512] rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${selectedOpening.whiteWinPct}%` }}
                className="bg-white h-full"
                title={`White: ${selectedOpening.whiteWinPct}%`}
              />
              <div
                style={{ width: `${selectedOpening.drawPct}%` }}
                className="bg-zinc-500 h-full"
                title={`Draw: ${selectedOpening.drawPct}%`}
              />
              <div
                style={{ width: `${selectedOpening.blackWinPct}%` }}
                className="bg-zinc-900 h-full"
                title={`Black: ${selectedOpening.blackWinPct}%`}
              />
            </div>
            <span className="text-[10px] text-zinc-500 text-right font-mono">
              Database: {selectedOpening.totalGames.toLocaleString()} Master Games
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed mt-1">
            {selectedOpening.description}
          </p>
        </div>

        {/* Opening Directory List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#2d2a26]">
          {filteredOpenings.map((op) => {
            const isSelected = selectedOpening.eco === op.eco;
            return (
              <button
                key={op.eco}
                onClick={() => setSelectedOpening(op)}
                className={`w-full text-left p-3 flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#2d2a26] border-l-4 border-[#81b64c]'
                    : 'hover:bg-[#262421]'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{op.name}</span>
                  <span className="text-[11px] font-mono text-zinc-400 line-clamp-1">
                    {op.moves}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-[#161512] px-1.5 py-0.5 rounded">
                    {op.eco}
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
