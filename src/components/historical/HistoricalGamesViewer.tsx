'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { HISTORICAL_GAMES, GrandmasterGame } from '@/lib/historicalGames';
import { BoardTheme, PieceTheme, GameSession, MoveRecord } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { Button } from '@/components/ui/button';
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  Play,
  Pause,
  Calendar,
  Sparkles,
  Trophy,
  ExternalLink,
  BookOpen,
  History,
  Copy,
  Check,
  ArrowRight,
  Flame,
  Award,
  Layers,
  Search,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';
import { useRouter } from 'next/navigation';

interface HistoricalGamesViewerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

type HistoricalSubScreen = 'theater' | 'anthology' | 'story' | 'notation';

export const HistoricalGamesViewer: React.FC<HistoricalGamesViewerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const [activeScreen, setActiveScreen] = useState<HistoricalSubScreen>('theater');
  const [selectedEra, setSelectedEra] = useState<'all' | 'romantic' | 'golden' | 'modern'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<GrandmasterGame>(HISTORICAL_GAMES[0]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1500);
  const [copiedFen, setCopiedFen] = useState(false);

  const movesContainerRef = useRef<HTMLDivElement>(null);
  const activeMoveButtonRef = useRef<HTMLButtonElement>(null);

  const filteredGames = useMemo(() => {
    return HISTORICAL_GAMES.filter((g) => {
      const matchesEra = selectedEra === 'all' || g.era === selectedEra;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        g.white.name.toLowerCase().includes(q) ||
        g.black.name.toLowerCase().includes(q) ||
        g.opening.toLowerCase().includes(q) ||
        g.event.toLowerCase().includes(q) ||
        g.eco.toLowerCase().includes(q);
      return matchesEra && matchesQuery;
    });
  }, [selectedEra, searchQuery]);

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

  const handleStep = useCallback((idx: number) => {
    setCurrentMoveIdx(idx);
    soundService.playMove();
  }, []);

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentMoveIdx((prev) => {
        if (prev >= parsedMoves.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        soundService.playMove();
        return prev + 1;
      });
    }, playSpeedMs);

    return () => clearInterval(interval);
  }, [isPlaying, parsedMoves.length, playSpeedMs]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        handleStep(Math.min(parsedMoves.length - 1, currentMoveIdx + 1));
      } else if (e.key === 'ArrowLeft') {
        handleStep(Math.max(-1, currentMoveIdx - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentMoveIdx, parsedMoves.length, handleStep]);

  // Auto-scroll active move into view
  useEffect(() => {
    if (activeMoveButtonRef.current) {
      activeMoveButtonRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentMoveIdx]);

  const handleSelectGame = (game: GrandmasterGame) => {
    setSelectedGame(game);
    setCurrentMoveIdx(-1);
    setIsPlaying(false);
  };

  const handleAnalyzeInReview = useCallback(() => {
    const c = new Chess();
    const moveRecords: MoveRecord[] = [];

    for (let i = 0; i < parsedMoves.length; i++) {
      const fenBefore = c.fen();
      try {
        const m = c.move(parsedMoves[i]);
        if (!m) break;
        const fenAfter = c.fen();
        moveRecords.push({
          san: m.san,
          from: m.from as Square,
          to: m.to as Square,
          captured: m.captured as any,
          promotion: m.promotion as any,
          fenBefore,
          fenAfter,
          evalBefore: 0,
          evalAfter: 0,
          isCheck: c.inCheck(),
        });
      } catch {
        break;
      }
    }

    const winner = selectedGame.result === '1-0' ? 'w' : selectedGame.result === '0-1' ? 'b' : 'draw';

    const session: GameSession = {
      id: selectedGame.id,
      whitePlayer: {
        id: `gm-w-${selectedGame.id}`,
        name: selectedGame.white.name,
        rating: selectedGame.white.rating,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&q=80',
        title: (selectedGame.white.title as 'GM' | 'IM') || 'GM',
        isBot: false,
      },
      blackPlayer: {
        id: `gm-b-${selectedGame.id}`,
        name: selectedGame.black.name,
        rating: selectedGame.black.rating,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=128&q=80',
        title: (selectedGame.black.title as 'GM' | 'IM') || 'GM',
        isBot: false,
      },
      timeControl: 180,
      variant: 'standard',
      moves: moveRecords,
      fen: c.fen(),
      isGameOver: true,
      gameResult: selectedGame.result === '1-0' ? '1-0' : selectedGame.result === '0-1' ? '0-1' : '1/2-1/2',
      resultDetails: {
        winner,
        reason: 'resignation',
        ratingDelta: 0,
        newRating: selectedGame.white.rating,
        league: 'Grandmaster Immortal Series',
      },
      reviewReport: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    GameSessionStore.saveSession(session);
    router.push(`/game/review/${selectedGame.id}`);
  }, [parsedMoves, selectedGame, router]);

  const handleCopyFen = () => {
    navigator.clipboard.writeText(currentChess.fen());
    setCopiedFen(true);
    soundService.playMove();
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 bg-[#161512] text-zinc-100 select-none">
      {/* ----------------------------------------------------------------------- */}
      {/* TOP HEADER & 4 SUB-SCREEN SWITCHER                                      */}
      {/* ----------------------------------------------------------------------- */}
      <header className="h-14 px-3 sm:px-6 border-b border-white/5 flex items-center justify-between shrink-0 bg-[#141311]">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
              Immortal Masterpieces
            </h1>
            <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/5">
              {selectedGame.white.name.split(' ').pop()} vs {selectedGame.black.name.split(' ').pop()} ({selectedGame.year})
            </span>
          </div>
        </div>

        {/* 4 Segmented Sub-Screen Switcher */}
        <div className="flex items-center bg-[#1c1a17] p-1 rounded-xl border border-white/5 text-xs font-bold">
          <button
            onClick={() => setActiveScreen('theater')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
              activeScreen === 'theater'
                ? 'bg-[#81b64c] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Match Theater
          </button>
          <button
            onClick={() => setActiveScreen('anthology')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
              activeScreen === 'anthology'
                ? 'bg-[#81b64c] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Anthology ({HISTORICAL_GAMES.length})
          </button>
          <button
            onClick={() => setActiveScreen('story')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
              activeScreen === 'story'
                ? 'bg-[#81b64c] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Historical Context
          </button>
          <button
            onClick={() => setActiveScreen('notation')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
              activeScreen === 'notation'
                ? 'bg-[#81b64c] text-black font-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Notation &amp; PGN
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT BODY                                                      */}
      {/* ----------------------------------------------------------------------- */}
      <main className="flex-1 min-h-0 p-2 sm:p-4 overflow-hidden">
        {/* SUB-SCREEN 1: THEATER (Board, Stepper, Game Overview, P1 Launch Review) */}
        {activeScreen === 'theater' && (
          <div className="h-full flex flex-col lg:flex-row items-center justify-center gap-3 sm:gap-6 animate-in fade-in duration-150">
            {/* Left/Center: Viewport-scaling Chessboard & Stepper */}
            <div className="flex flex-col items-center justify-center h-full max-h-full min-h-0 w-full lg:w-auto">
              {/* Opponent Identity Banner */}
              <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-black" />
                  <span className="text-xs font-bold text-white">
                    {selectedGame.black.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    ({selectedGame.black.rating})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                  {selectedGame.black.title}
                </span>
              </div>

              {/* Viewport-scaling Interactive Board */}
              <div className="w-[min(100%,calc(100vh-230px),560px)] aspect-square relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
                <ChessBoard
                  chess={currentChess}
                  orientation="w"
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  lastMove={lastMove}
                  disabled={true}
                />
              </div>

              {/* White Player Banner */}
              <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mt-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-white border border-black shadow" />
                  <span className="text-xs font-bold text-white">
                    {selectedGame.white.name}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-zinc-400">
                    ({selectedGame.white.rating})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-zinc-400">
                  {selectedGame.white.title}
                </span>
              </div>

              {/* Under-Board Stepper Controls */}
              <div className="w-[min(100%,calc(100vh-230px),560px)] mt-2 bg-[#1c1a17] px-3 py-1.5 rounded-xl border border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleStep(-1)}
                    disabled={currentMoveIdx === -1}
                    title="First Position"
                  >
                    <ChevronFirst className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleStep(Math.max(-1, currentMoveIdx - 1))}
                    disabled={currentMoveIdx === -1}
                    title="Previous Move"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={isPlaying ? 'warning' : 'primary'}
                    size="xs"
                    rounded="lg"
                    onClick={() => setIsPlaying((p) => !p)}
                    className="mx-1"
                    title={isPlaying ? 'Pause' : 'Autoplay'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleStep(Math.min(parsedMoves.length - 1, currentMoveIdx + 1))}
                    disabled={currentMoveIdx === parsedMoves.length - 1}
                    title="Next Move"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => handleStep(parsedMoves.length - 1)}
                    disabled={currentMoveIdx === parsedMoves.length - 1}
                    title="Final Move"
                  >
                    <ChevronLast className="w-4 h-4" />
                  </Button>
                </div>

                {/* Ply Counter & Speed Selector */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#141311] p-0.5 rounded-lg border border-white/5 text-[10px] font-mono">
                    {[
                      { label: '1s', ms: 1000 },
                      { label: '1.5s', ms: 1500 },
                      { label: '2s', ms: 2000 },
                    ].map((s) => (
                      <button
                        key={s.ms}
                        onClick={() => setPlaySpeedMs(s.ms)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                          playSpeedMs === s.ms
                            ? 'bg-[#81b64c] text-black font-black'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-mono font-bold text-zinc-300 min-w-[50px] text-right">
                    {currentMoveIdx === -1 ? 'Start' : currentMoveIdx + 1} / {parsedMoves.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Game Dossier & P1 Deep Review Action */}
            <div className="w-full lg:w-[360px] flex flex-col justify-between gap-2.5 shrink-0 max-h-full">
              {/* Game Metadata Card */}
              <div className="p-3.5 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>{selectedGame.event} ({selectedGame.year})</span>
                  </div>
                  <span className="text-xs font-mono font-black text-[#81b64c] bg-[#81b64c]/10 px-2 py-0.5 rounded-md border border-[#81b64c]/20">
                    {selectedGame.result}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{selectedGame.opening} ({selectedGame.eco})</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-3">
                    {selectedGame.description}
                  </p>
                </div>

                {/* Quick Move Preview Strip */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-[#141311] border border-white/5 text-xs">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Current Move:</span>
                  <span className="font-mono font-black text-emerald-400">
                    {currentMoveIdx >= 0 ? parsedMoves[currentMoveIdx] : 'Opening Position'}
                  </span>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setActiveScreen('notation')}
                  >
                    <span>View All</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Quick Switch to Other Masterpieces */}
              <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Immortal Anthology
                  </span>
                  <button
                    onClick={() => setActiveScreen('anthology')}
                    className="text-[10px] font-bold text-[#81b64c] hover:underline"
                  >
                    Browse All {HISTORICAL_GAMES.length} &rarr;
                  </button>
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {HISTORICAL_GAMES.slice(0, 6).map((g) => {
                    const isCur = selectedGame.id === g.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => handleSelectGame(g)}
                        className={`px-2.5 py-1.5 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                          isCur
                            ? 'bg-[#81b64c] border-[#81b64c] text-black font-black'
                            : 'bg-[#141311] border-white/5 text-zinc-300 hover:text-white'
                        }`}
                      >
                        <div className="text-[11px] font-bold leading-tight">
                          {g.white.name.split(' ').pop()} vs {g.black.name.split(' ').pop()}
                        </div>
                        <div className={`text-[9px] ${isCur ? 'text-black/70' : 'text-zinc-500'}`}>
                          {g.year}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PRIMARY ACTION ANCHOR: P1 Game Review */}
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                fullWidth
                onClick={handleAnalyzeInReview}
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze in Deep Engine Review</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 2: ANTHOLOGY (Filter, Search, Grid of Masterpieces) */}
        {activeScreen === 'anthology' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150 max-w-5xl mx-auto w-full">
            {/* Filter & Search Bar */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                {(['all', 'romantic', 'golden', 'modern'] as const).map((era) => (
                  <button
                    key={era}
                    onClick={() => setSelectedEra(era)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      selectedEra === era
                        ? 'bg-[#81b64c] text-black font-black'
                        : 'bg-[#141311] text-zinc-400 hover:text-white'
                    }`}
                  >
                    {era}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search player, ECO, opening..."
                  className="w-full bg-[#141311] border border-white/5 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#81b64c]"
                />
              </div>
            </div>

            {/* Game Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-1">
              {filteredGames.map((g) => {
                const isCur = selectedGame.id === g.id;
                return (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGame(g)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isCur
                        ? 'bg-[#1e1c18] border-[#81b64c]/40 shadow-sm'
                        : 'bg-[#1c1a17] border-white/5 hover:border-white/15'
                    }`}
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-400">{g.event}</span>
                        <span className="font-mono text-[#81b64c] font-black">{g.result}</span>
                      </div>
                      <div className="text-sm font-black text-white">
                        {g.white.name} vs {g.black.name}
                      </div>
                      <div className="text-[11px] font-medium text-amber-400">
                        {g.opening} ({g.eco}) &bull; {g.year}
                      </div>
                      <p className="text-xs text-zinc-300 font-sans line-clamp-2">
                        {g.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{g.era} Era</span>
                      <Button
                        variant={isCur ? 'primary' : 'secondary'}
                        size="xs"
                        rounded="lg"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectGame(g);
                          setActiveScreen('theater');
                        }}
                      >
                        <span>{isCur ? 'Resume' : 'Study'}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-400">
                Viewing {filteredGames.length} of {HISTORICAL_GAMES.length} curated master games.
              </span>
              <Button
                variant="primary"
                size="sm"
                rounded="lg"
                onClick={() => setActiveScreen('theater')}
              >
                <span>Back to Theater</span>
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 3: HISTORICAL CONTEXT & STORY */}
        {activeScreen === 'story' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex-1 min-h-0 bg-[#1c1a17] rounded-2xl border border-white/5 p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex flex-col">
                  <h2 className="text-base sm:text-lg font-black text-white">
                    {selectedGame.white.name} vs {selectedGame.black.name}
                  </h2>
                  <span className="text-xs text-amber-400 font-bold">
                    {selectedGame.event} &bull; {selectedGame.year} &bull; {selectedGame.opening} ({selectedGame.eco})
                  </span>
                </div>
                <span className="text-sm font-mono font-black text-[#81b64c] bg-[#81b64c]/10 px-3 py-1 rounded-xl border border-[#81b64c]/20">
                  {selectedGame.result}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#81b64c]" />
                  <span>The Story &amp; Immortality</span>
                </span>
                <p className="text-sm text-zinc-200 leading-relaxed font-sans">
                  {selectedGame.description}
                </p>
              </div>

              {/* Player Biographies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <div className="p-3.5 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400">White Player</span>
                  <span className="text-sm font-black text-white">{selectedGame.white.name}</span>
                  <span className="text-xs text-zinc-400">
                    {selectedGame.white.title} &bull; Historical Rating {selectedGame.white.rating}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase text-zinc-400">Black Player</span>
                  <span className="text-sm font-black text-white">{selectedGame.black.name}</span>
                  <span className="text-xs text-zinc-400">
                    {selectedGame.black.title} &bull; Historical Rating {selectedGame.black.rating}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <Button
                variant="secondary"
                size="sm"
                rounded="lg"
                onClick={() => setActiveScreen('anthology')}
              >
                <span>Browse Anthology</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                rounded="lg"
                onClick={() => setActiveScreen('theater')}
              >
                <span>Play Move-by-Move in Theater</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 4: NOTATION & PGN EXPORT */}
        {activeScreen === 'notation' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="flex-1 min-h-0 bg-[#1c1a17] rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Move Notation ({parsedMoves.length} Plies)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="lg"
                    onClick={handleCopyFen}
                  >
                    {copiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFen ? 'Copied FEN!' : 'Copy Current FEN'}</span>
                  </Button>
                </div>
              </div>

              {/* Move Notation Grid */}
              <div
                ref={movesContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#141311] rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 font-mono text-xs"
              >
                {parsedMoves.map((m, idx) => {
                  const isCurrent = currentMoveIdx === idx;
                  const turnNum = Math.floor(idx / 2) + 1;
                  const isWhite = idx % 2 === 0;

                  return (
                    <button
                      key={idx}
                      ref={isCurrent ? activeMoveButtonRef : null}
                      onClick={() => handleStep(idx)}
                      className={`px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#81b64c] text-black font-black shadow-sm'
                          : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-zinc-500 font-sans text-[10px]">
                        {isWhite ? `${turnNum}.` : `${turnNum}...`}
                      </span>
                      <span className="font-bold">{m}</span>
                    </button>
                  );
                })}
              </div>

              {/* Raw PGN string */}
              <div className="p-3 bg-[#141311] rounded-xl border border-white/5 flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Official PGN String:</span>
                <p className="font-mono text-xs text-zinc-400 break-all select-all">
                  {selectedGame.pgn}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <Button
                variant="secondary"
                size="sm"
                rounded="lg"
                onClick={handleCopyFen}
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Current FEN</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                rounded="lg"
                onClick={handleAnalyzeInReview}
              >
                <Sparkles className="w-4 h-4" />
                <span>Analyze Full Match in Review</span>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
