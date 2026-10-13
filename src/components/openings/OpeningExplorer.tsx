'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { OPENINGS_DATABASE } from '@/lib/openingsData';
import { OpeningInfo, BoardTheme, PieceTheme, PieceColor, MembershipTier } from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Trophy,
  Sparkles,
  Layers,
  Flame,
  Swords,
  Microscope,
  Compass,
  CheckCircle2,
  ExternalLink,
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
}

interface OpeningExplorerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
  tier?: MembershipTier;
}

type OpeningCategory = 'all' | 'e4' | 'd4' | 'flank' | 'gambit';

export const OpeningExplorer: React.FC<OpeningExplorerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [fenHistory, setFenHistory] = useState<string[]>([
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  ]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [selectedCategory, setSelectedCategory] = useState<OpeningCategory>('all');
  const [activeTab, setActiveTab] = useState<'moves' | 'strategy' | 'games' | 'catalog'>('moves');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOpening, setSelectedOpening] = useState<OpeningInfo | null>(OPENINGS_DATABASE[0]);
  const [explorerData, setExplorerData] = useState<ExplorerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const currentFen = fenHistory[historyIndex] || chess.fen();

  // Fetch opening explorer data for current board state
  const fetchExplorerData = useCallback(async (fen: string, ply: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/openings/explorer?fen=${encodeURIComponent(fen)}&tier=diamond&ply=${ply}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setExplorerData(json.data);
          // If the position matches a known opening in our database, highlight it
          if (json.data.opening?.name) {
            const matched = OPENINGS_DATABASE.find(
              (o) =>
                o.eco === json.data.opening.eco ||
                o.name.toLowerCase().includes(json.data.opening.name.toLowerCase())
            );
            if (matched) {
              setSelectedOpening(matched);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch explorer data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Move Stepping Controls
  const stepToStart = () => {
    setHistoryIndex(0);
    setChess(new Chess(fenHistory[0]));
    soundService.playMove();
  };

  const stepBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  const stepForward = () => {
    if (historyIndex < fenHistory.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setChess(new Chess(fenHistory[newIdx]));
      soundService.playMove();
    }
  };

  const stepToEnd = () => {
    const lastIdx = fenHistory.length - 1;
    setHistoryIndex(lastIdx);
    setChess(new Chess(fenHistory[lastIdx]));
    soundService.playMove();
  };

  // Reset to starting position
  const resetBoard = () => {
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    setChess(new Chess(startFen));
    setFenHistory([startFen]);
    setMoveHistory([]);
    setHistoryIndex(0);
    setSelectedOpening(null);
    soundService.playMove();
  };

  // Load opening directly from catalog
  const loadOpening = (opening: OpeningInfo) => {
    setSelectedOpening(opening);
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
    soundService.playMove();
  };

  // Filtered catalog by category and search
  const filteredCatalog = useMemo(() => {
    return OPENINGS_DATABASE.filter((op) => {
      const matchesSearch =
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.eco.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.moves.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedCategory === 'e4') {
        return op.moves.startsWith('1. e4') && !op.name.toLowerCase().includes('gambit');
      }
      if (selectedCategory === 'd4') {
        return op.moves.startsWith('1. d4') && !op.name.toLowerCase().includes('gambit');
      }
      if (selectedCategory === 'flank') {
        return (
          op.moves.startsWith('1. c4') ||
          op.moves.startsWith('1. Nf3') ||
          op.moves.startsWith('1. f4') ||
          op.moves.startsWith('1. b3')
        );
      }
      if (selectedCategory === 'gambit') {
        return (
          op.name.toLowerCase().includes('gambit') ||
          op.variation?.toLowerCase().includes('gambit')
        );
      }
      return true;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center p-2 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Interactive Chessboard Column */}
      <div className="flex flex-col items-center gap-3 shrink-0 w-full max-w-[480px]">
        <div className="w-[min(100%,calc(100vh-230px),480px)] aspect-square shadow-2xl rounded-2xl overflow-hidden border border-[#302d29]">
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
        <div className="flex items-center justify-between w-full bg-[#1e1c19] px-4 py-2.5 rounded-xl border border-[#2d2a26] text-xs shadow-md">
          <div className="flex items-center gap-1.5">
            <button
              onClick={stepToStart}
              disabled={historyIndex === 0}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="First Move"
            >
              <ChevronsLeft className="w-4 h-4" />
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
              onClick={stepToEnd}
              disabled={historyIndex >= fenHistory.length - 1}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Last Move"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
            <button
              onClick={resetBoard}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Reset Board"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              className="px-2.5 py-1.5 rounded-lg bg-[#272522] hover:bg-[#34312b] text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 font-bold"
              title="Flip Board"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span className="uppercase text-[10px]">{orientation === 'w' ? 'White' : 'Black'}</span>
            </button>
          </div>
        </div>

        {/* Moves Ribbon */}
        {moveHistory.length > 0 && (
          <div className="w-full bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex flex-wrap gap-1.5 text-xs font-mono max-h-24 overflow-y-auto">
            {moveHistory.map((m, idx) => (
              <span
                key={idx}
                onClick={() => {
                  setHistoryIndex(idx + 1);
                  setChess(new Chess(fenHistory[idx + 1]));
                }}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  historyIndex === idx + 1
                    ? 'bg-[#81b64c] text-white font-bold shadow-sm'
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

      {/* Opening Details, Continuations & Repertoire Directory Column */}
      <div className="flex-1 w-full lg:max-w-[560px] xl:max-w-[620px] flex flex-col gap-4">
        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#1b1916] p-1.5 rounded-xl border border-[#2d2a26]">
          {[
            { id: 'all' as OpeningCategory, label: 'All Openings', icon: BookOpen },
            { id: 'e4' as OpeningCategory, label: '1.e4 King’s Pawn', icon: Sparkles },
            { id: 'd4' as OpeningCategory, label: '1.d4 Queen’s Pawn', icon: Trophy },
            { id: 'flank' as OpeningCategory, label: 'Flank & Modern', icon: Compass },
            { id: 'gambit' as OpeningCategory, label: 'Gambits & Traps', icon: Flame },
          ].map((cat) => {
            const CatIcon = cat.icon;
            const isCatActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isCatActive
                    ? 'bg-[#81b64c] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-[#262421]'
                }`}
              >
                <CatIcon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Opening Overview Card */}
        {selectedOpening && (
          <div className="bg-[#1e1c19] border border-[#2d2a26] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#161512] text-[#81b64c] px-2 py-0.5 rounded border border-[#33302b]">
                    {selectedOpening.eco}
                  </span>
                  <h2 className="text-base font-black text-white">{selectedOpening.name}</h2>
                </div>
                {selectedOpening.variation && (
                  <span className="text-xs text-amber-400 font-medium mt-0.5">
                    {selectedOpening.variation}
                  </span>
                )}
                <span className="text-xs font-mono text-zinc-400 mt-1">
                  Line: <strong className="text-zinc-200">{selectedOpening.moves}</strong>
                </span>
              </div>

              <button
                onClick={() => router.push(`/analysis?fen=${encodeURIComponent(currentFen)}`)}
                className="px-3 py-1.5 rounded-lg bg-[#282622] hover:bg-[#34312b] border border-[#3c3933] text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer shadow"
                title="Open this position in Deep Engine Analysis"
              >
                <Microscope className="w-3.5 h-3.5 text-[#81b64c]" />
                <span>Analyze</span>
              </button>
            </div>

            {/* Win Rate Bar */}
            <div className="flex flex-col gap-1 bg-[#161512] p-2.5 rounded-xl border border-[#282522]">
              <div className="flex justify-between text-[11px] font-bold">
                <span className="text-white">White {selectedOpening.whiteWinPct}%</span>
                <span className="text-zinc-400">Draw {selectedOpening.drawPct}%</span>
                <span className="text-zinc-400">Black {selectedOpening.blackWinPct}%</span>
              </div>
              <div className="h-2.5 w-full bg-[#12110f] rounded-full overflow-hidden flex shadow-inner">
                <div
                  style={{ width: `${selectedOpening.whiteWinPct}%` }}
                  className="bg-white h-full"
                />
                <div
                  style={{ width: `${selectedOpening.drawPct}%` }}
                  className="bg-zinc-500 h-full"
                />
                <div
                  style={{ width: `${selectedOpening.blackWinPct}%` }}
                  className="bg-zinc-800 h-full"
                />
              </div>
              <span className="text-[10px] text-zinc-500 font-mono text-right">
                {selectedOpening.totalGames.toLocaleString()} Master Games Tracked
              </span>
            </div>

            {/* Strategic Overview & Ideas */}
            {selectedOpening.description && (
              <p className="text-xs text-zinc-300 leading-relaxed bg-[#24221e] p-3 rounded-xl border border-[#302d28]">
                {selectedOpening.description}
              </p>
            )}

            {selectedOpening.keyIdeas && selectedOpening.keyIdeas.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-wider font-extrabold text-zinc-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#81b64c]" />
                  <span>Key Strategic Plans & Motifs</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedOpening.keyIdeas.map((idea, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[#252320] text-zinc-200 border border-[#36332d] px-2.5 py-1 rounded-lg font-medium"
                    >
                      {idea}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Navigation: Master Moves / Catalog Directory / Master Games */}
        <div className="bg-[#1e1c19] border border-[#2d2a26] rounded-2xl overflow-hidden shadow-xl flex flex-col h-[380px]">
          <div className="flex bg-[#181614] border-b border-[#2d2a26] px-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab('moves')}
              className={`px-4 py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'moves'
                  ? 'border-[#81b64c] text-white bg-[#22201d]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Master Continuations ({explorerData?.moves?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'catalog'
                  ? 'border-[#81b64c] text-white bg-[#22201d]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Opening Catalog ({filteredCatalog.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('games')}
              className={`px-4 py-3 transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
                activeTab === 'games'
                  ? 'border-[#81b64c] text-white bg-[#22201d]'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Master Games ({explorerData?.topGames?.length || 0})</span>
            </button>
          </div>

          {/* Tab 1: Master Moves */}
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
                        <span className="text-[10px] font-mono text-zinc-500">
                          {m.total.toLocaleString()} games • Avg {m.averageRating}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <div className="w-24 h-2 bg-zinc-900 rounded-full overflow-hidden flex shadow-inner">
                          <div
                            style={{ width: `${m.whiteWinPct}%` }}
                            className="bg-white h-full"
                          />
                          <div
                            style={{ width: `${m.drawPct}%` }}
                            className="bg-zinc-500 h-full"
                          />
                          <div
                            style={{ width: `${m.blackWinPct}%` }}
                            className="bg-zinc-800 h-full"
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
                  No further book moves for this position. Select an opening from the Catalog or step back!
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Catalog Directory */}
          {activeTab === 'catalog' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-3 bg-[#191815] border-b border-[#2d2a26] flex items-center gap-2">
                <Search className="w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search openings (e.g. Sicilian, Queen’s Gambit, French)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#282622]">
                {filteredCatalog.map((op) => (
                  <button
                    key={op.eco + op.name}
                    onClick={() => loadOpening(op)}
                    className={`w-full text-left p-3 hover:bg-[#262420] transition-colors cursor-pointer flex items-center justify-between ${
                      selectedOpening?.name === op.name ? 'bg-[#262420]' : ''
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{op.name}</span>
                        {op.variation && (
                          <span className="text-[10px] text-amber-400 truncate">({op.variation})</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 line-clamp-1 mt-0.5">
                        {op.moves}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-[#81b64c] bg-[#161512] px-2 py-0.5 rounded border border-[#2d2a26] shrink-0 ml-2">
                      {op.eco}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Master Games */}
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
                  No top master games indexed directly for this specific position.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
