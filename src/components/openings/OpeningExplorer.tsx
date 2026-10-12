'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OPENINGS_DATABASE } from '@/lib/openingsData';
import { OpeningInfo, BoardTheme, PieceTheme, PieceColor, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import {
  BookOpen,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Trophy,
  Sparkles,
  Layers,
  Crown,
} from 'lucide-react';

interface MasterMoveStats {
  uci: string;
  san: string;
  white: number;
  draws: number;
  black: number;
  total: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  averageRating: number;
  eco?: string;
  openingName?: string;
}

interface MasterGameRecord {
  id: string;
  white: { name: string; rating: number; title?: string };
  black: { name: string; rating: number; title?: string };
  year: number;
  event: string;
  result: '1-0' | '1/2-1/2' | '0-1';
}

interface ExplorerData {
  fen: string;
  normalizedFen: string;
  opening?: {
    eco: string;
    name: string;
    variation?: string;
  };
  totalGames: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  averageRating: number;
  moves: MasterMoveStats[];
  topGames: MasterGameRecord[];
  isGatedByTier?: boolean;
  tierLimitReason?: string;
}

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  tier?: MembershipTier;
}

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
  tier = 'diamond',
}) => {
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fenHistory, setFenHistory] = useState<string[]>([
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [activeTab, setActiveTab] = useState<'moves' | 'games' | 'catalog'>('moves');
  const [searchQuery, setSearchQuery] = useState('');
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentFen = fenHistory[historyIndex] || chess.fen();

  // Fetch opening explorer data for current board state
  const fetchExplorerData = useCallback(async (fen: string, ply: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/openings/explorer?fen=${encodeURIComponent(fen)}&tier=${tier}&ply=${ply}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setExplorerData(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch explorer data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tier]);

  useEffect(() => {
    fetchExplorerData(currentFen, historyIndex);
  }, [currentFen, historyIndex, fetchExplorerData]);

  // Execute a move on the board
  const executeMove = useCallback((sanOrUci: string) => {
    try {
      const currentChess = new Chess(fenHistory[historyIndex]);
      const result = currentChess.move(sanOrUci);
      if (!result) return;

      const newFen = currentChess.fen();
      const newFenHistory = [...fenHistory.slice(0, historyIndex + 1), newFen];
      const newMoveHistory = [...moveHistory.slice(0, historyIndex), result.san];

      setChess(currentChess);
      setFenHistory(newFenHistory);
      setMoveHistory(newMoveHistory);
      setHistoryIndex(newFenHistory.length - 1);

      if (result.captured) soundService.playCapture();
      else if (result.flags.includes('k') || result.flags.includes('q')) soundService.playCastle();
      else soundService.playMove();
    } catch (e) {
      console.error('Invalid move in explorer:', e);
    }
  }, [fenHistory, historyIndex, moveHistory]);

  // Board drag & drop handler
  const handleBoardMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const currentChess = new Chess(fenHistory[historyIndex]);
      const move = currentChess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const newFen = currentChess.fen();
      const newFenHistory = [...fenHistory.slice(0, historyIndex + 1), newFen];
      const newMoveHistory = [...moveHistory.slice(0, historyIndex), move.san];

      setChess(currentChess);
      setFenHistory(newFenHistory);
      setMoveHistory(newMoveHistory);
      setHistoryIndex(newFenHistory.length - 1);

      if (move.captured) soundService.playCapture();
      else soundService.playMove();
    } catch {
      // Invalid move ignored
    }
  };

  // Step backward in move tree
  const stepBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  // Step forward in move tree
  const stepForward = () => {
    if (historyIndex < fenHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  // Reset to starting position
  const resetBoard = () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setChess(new Chess(startFen));
    setFenHistory([startFen]);
    setMoveHistory([]);
    setHistoryIndex(0);
    soundService.playMove();
  };

  // Load opening directly from catalog
  const loadOpeningFromCatalog = (opening: OpeningInfo) => {
    const c = new Chess();
    const cleaned = opening.moves.replace(/\d+\./g, '').trim().split(/\s+/);
    const newFens = [c.fen()];
    const newMoves: string[] = [];

    for (const move of cleaned) {
      if (!move) continue;
      try {
        const res = c.move(move);
        if (res) {
          newFens.push(c.fen());
          newMoves.push(res.san);
        }
      } catch {
        break;
      }
    }

    setChess(c);
    setFenHistory(newFens);
    setMoveHistory(newMoves);
    setHistoryIndex(newFens.length - 1);
    setActiveTab('moves');
    soundService.playMove();
  };

  const filteredCatalog = useMemo(() => {
    return OPENINGS_DATABASE.filter(
      (op) =>
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.moves.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full items-center xl:items-start justify-center p-2 sm:p-4 select-none">
      {/* Interactive Chessboard Column */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <ChessBoard
            chess={chess}
            orientation={orientation}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleBoardMove}
            disabled={false}
          />
        </div>

        {/* Board Navigation Controls */}
        <div className="flex items-center gap-2 bg-[#1f1d1a] px-3 py-1.5 rounded-xl border border-[#2d2a26] text-xs">
          <button
            onClick={resetBoard}
            className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Reset to Starting Position"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={stepBack}
            disabled={historyIndex === 0}
            className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Step Back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={stepForward}
            disabled={historyIndex >= fenHistory.length - 1}
            className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Step Forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
            className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 font-semibold"
            title="Flip Board"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="uppercase text-[10px]">{orientation === 'w' ? 'White' : 'Black'}</span>
          </button>
        </div>

        {/* Moves Played Ribbon */}
        {moveHistory.length > 0 && (
          <div className="w-full max-w-[560px] bg-[#1a1815] border border-[#2b2824] rounded-lg p-2 flex flex-wrap gap-1.5 text-xs font-mono">
            {moveHistory.map((m, idx) => (
              <span
                key={idx}
                onClick={() => {
                  setHistoryIndex(idx + 1);
                  setChess(new Chess(fenHistory[idx + 1]));
                }}
                className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  historyIndex === idx + 1
                    ? 'bg-[#81b64c] text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#282521]'
                }`}
              >
                {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                {m}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Opening Tree & Master Statistics Panel */}
      <div className="w-full max-w-xl flex flex-col h-[620px] bg-[#1f1d1a] rounded-2xl border border-[#2d2a26] overflow-hidden shadow-2xl">
        {/* Header: Title, ECO & Tier Indicator */}
        <div className="p-4 bg-[#262420] border-b border-[#2d2a26] flex items-center justify-between">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#81b64c]" />
              <h2 className="text-sm font-black text-white tracking-wide">
                {explorerData?.opening?.name || 'Opening Explorer'}
              </h2>
            </div>
            {explorerData?.opening?.variation && (
              <span className="text-[11px] text-zinc-400 font-medium">
                {explorerData.opening.variation}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-[#161512] text-[#81b64c] px-2.5 py-1 rounded-lg border border-[#36332e]">
              {explorerData?.opening?.eco || 'A00'}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              {tier}
            </span>
          </div>
        </div>

        {/* Aggregate Win / Draw / Loss Bar */}
        {explorerData && explorerData.totalGames > 0 && (
          <div className="px-4 py-3 bg-[#191815] border-b border-[#2d2a26] flex flex-col gap-1.5">
            <div className="flex justify-between text-[11px] font-bold">
              <span className="text-white">White {explorerData.whiteWinPct}%</span>
              <span className="text-zinc-400">Draw {explorerData.drawPct}%</span>
              <span className="text-zinc-400">Black {explorerData.blackWinPct}%</span>
            </div>
            <div className="h-3 w-full bg-[#12110f] rounded-full overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${explorerData.whiteWinPct}%` }}
                className="bg-white h-full transition-all duration-300"
                title={`White wins: ${explorerData.whiteWinPct}%`}
              />
              <div
                style={{ width: `${explorerData.drawPct}%` }}
                className="bg-zinc-500 h-full transition-all duration-300"
                title={`Draws: ${explorerData.drawPct}%`}
              />
              <div
                style={{ width: `${explorerData.blackWinPct}%` }}
                className="bg-zinc-800 h-full transition-all duration-300"
                title={`Black wins: ${explorerData.blackWinPct}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
              <span>{explorerData.totalGames.toLocaleString()} Master Games</span>
              <span>Avg Rating: <strong>{explorerData.averageRating}</strong></span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex bg-[#191815] border-b border-[#2d2a26] px-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('moves')}
            className={`px-4 py-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'moves'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Master Moves ({explorerData?.moves?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={`px-4 py-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'games'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Top Master Games ({explorerData?.topGames?.length || 0})</span>
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'border-[#81b64c] text-white bg-[#22201d]'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Catalog Directory</span>
          </button>
        </div>

        {/* Tab Content 1: Master Continuations Tree */}
        {activeTab === 'moves' && (
          <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
            {explorerData?.moves && explorerData.moves.length > 0 ? (
              explorerData.moves.map((m) => (
                <div
                  key={m.san}
                  onClick={() => executeMove(m.san)}
                  className="p-3 hover:bg-[#262420] transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-white group-hover:text-[#81b64c] transition-colors w-12">
                      {m.san}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-zinc-300">
                        {m.openingName || 'Standard continuation'}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {m.total.toLocaleString()} games • Avg {m.averageRating}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Segmented win rate bar */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="w-24 h-2 bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
                        <div
                          style={{ width: `${m.whiteWinPct}%` }}
                          className="bg-white h-full"
                          title={`White: ${m.whiteWinPct}%`}
                        />
                        <div
                          style={{ width: `${m.drawPct}%` }}
                          className="bg-zinc-500 h-full"
                          title={`Draw: ${m.drawPct}%`}
                        />
                        <div
                          style={{ width: `${m.blackWinPct}%` }}
                          className="bg-zinc-800 h-full"
                          title={`Black: ${m.blackWinPct}%`}
                        />
                      </div>
                      <div className="flex gap-1.5 text-[9px] font-mono text-zinc-400">
                        <span className="text-white">{m.whiteWinPct}%</span>
                        <span>{m.drawPct}%</span>
                        <span className="text-zinc-400">{m.blackWinPct}%</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No further master book continuations recorded for this position.
              </div>
            )}

            {explorerData?.isGatedByTier && (
              <div className="p-3 m-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{explorerData.tierLimitReason}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Top Master Games */}
        {activeTab === 'games' && (
          <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
            {explorerData?.topGames && explorerData.topGames.length > 0 ? (
              explorerData.topGames.map((g) => (
                <div
                  key={g.id}
                  className="p-3 hover:bg-[#262420] transition-colors flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <span>{g.white.name} ({g.white.rating})</span>
                      <span className="text-zinc-500 font-mono text-[10px]">vs</span>
                      <span>{g.black.name} ({g.black.rating})</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-0.5">
                      {g.event} • {g.year}
                    </span>
                  </div>
                  <span
                    className={`font-mono text-xs font-black px-2 py-0.5 rounded ${
                      g.result === '1-0'
                        ? 'bg-white/10 text-white'
                        : g.result === '0-1'
                        ? 'bg-zinc-800 text-zinc-200'
                        : 'bg-zinc-700/40 text-zinc-300'
                    }`}
                  >
                    {g.result}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No master games archived directly for this specific position.
              </div>
            )}
          </div>
        )}

        {/* Tab Content 3: Catalog Search */}
        {activeTab === 'catalog' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-[#191815] border-b border-[#2d2a26] flex items-center gap-2">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search opening name or ECO (e.g. Sicilian, C60, French)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
              {filteredCatalog.map((op) => (
                <button
                  key={op.eco + op.name}
                  onClick={() => loadOpeningFromCatalog(op)}
                  className="w-full text-left p-3 hover:bg-[#262420] transition-colors cursor-pointer flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{op.name}</span>
                    <span className="text-[10px] font-mono text-zinc-400 line-clamp-1">
                      {op.moves}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-[#161512] px-1.5 py-0.5 rounded border border-[#2d2a26]">
                    {op.eco}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
