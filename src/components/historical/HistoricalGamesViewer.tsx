'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { HISTORICAL_GAMES, GrandmasterGame } from '@/lib/historicalGames';
import { BoardTheme, PieceTheme, GameSession, MoveRecord } from '@/types/chess';
import { GameSessionStore } from '@/lib/gameSessionStore';
import {
  ChevronFirst,
  ChevronLeft,
  ChevronRight,
  ChevronLast,
  Play,
  Pause,
  Calendar,
  Sparkles,
  Award,
  Trophy,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { soundService } from '@/lib/audioService';
import { useRouter } from 'next/navigation';

interface HistoricalGamesViewerProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

export const HistoricalGamesViewer: React.FC<HistoricalGamesViewerProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const router = useRouter();
  const [selectedEra, setSelectedEra] = useState<'all' | 'romantic' | 'golden' | 'modern'>('all');
  const [selectedGame, setSelectedGame] = useState<GrandmasterGame>(HISTORICAL_GAMES[0]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1500);

  const movesContainerRef = useRef<HTMLDivElement>(null);
  const activeMoveButtonRef = useRef<HTMLButtonElement>(null);

  const filteredGames = useMemo(() => {
    return HISTORICAL_GAMES.filter(
      (g) => selectedEra === 'all' || g.era === selectedEra
    );
  }, [selectedEra]);

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

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-5 sm:gap-6 items-center lg:items-start justify-center p-1 sm:p-4 select-none">
      {/* Board Column */}
      <div className="w-[min(calc(100vw-2rem),calc(100vh-220px),560px)] lg:w-[460px] xl:w-[490px] shrink-0 flex flex-col items-center gap-3">
        <div className="w-full aspect-square">
          <ChessBoard
            chess={currentChess}
            orientation="w"
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            lastMove={lastMove}
            disabled={true}
          />
        </div>

        {/* Playback & Stepper Controls */}
        <div className="w-full bg-[#1f1d1a] px-3 sm:px-4 py-2.5 sm:py-3 rounded-3xl border-2 border-[#35322b] flex items-center justify-between shadow-[0_4px_0_0_#141311]">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleStep(-1)}
              disabled={currentMoveIdx === -1}
              className="p-1.5 sm:p-2 rounded-full border-2 border-[#35322b] bg-[#262420] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:transform-none text-zinc-300 transition-all cursor-pointer"
              title="First Move"
            >
              <ChevronFirst className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handleStep(Math.max(-1, currentMoveIdx - 1))}
              disabled={currentMoveIdx === -1}
              className="p-1.5 sm:p-2 rounded-full border-2 border-[#35322b] bg-[#262420] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:transform-none text-zinc-300 transition-all cursor-pointer"
              title="Previous Move"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2 sm:p-2.5 rounded-full bg-[#81b64c] hover:bg-[#72a342] text-white border-2 border-[#4d7a24] shadow-[0_3px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer mx-0.5 sm:mx-1"
              title={isPlaying ? 'Pause' : 'Auto Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />}
            </button>

            <button
              onClick={() => handleStep(Math.min(parsedMoves.length - 1, currentMoveIdx + 1))}
              disabled={currentMoveIdx === parsedMoves.length - 1}
              className="p-1.5 sm:p-2 rounded-full border-2 border-[#35322b] bg-[#262420] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:transform-none text-zinc-300 transition-all cursor-pointer"
              title="Next Move"
            >
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handleStep(parsedMoves.length - 1)}
              disabled={currentMoveIdx === parsedMoves.length - 1}
              className="p-1.5 sm:p-2 rounded-full border-2 border-[#35322b] bg-[#262420] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-30 disabled:transform-none text-zinc-300 transition-all cursor-pointer"
              title="Final Move"
            >
              <ChevronLast className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Speed toggle */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-[#161512] p-0.5 sm:p-1 rounded-full border-2 border-[#35322b] text-[9px] sm:text-[10px] font-mono">
              {[
                { label: '1s', ms: 1000 },
                { label: '1.5s', ms: 1500 },
                { label: '2s', ms: 2000 },
              ].map((s) => (
                <button
                  key={s.ms}
                  onClick={() => setPlaySpeedMs(s.ms)}
                  className={`px-1.5 sm:px-2 py-0.5 rounded-full font-black cursor-pointer transition-all ${
                    playSpeedMs === s.ms
                      ? 'bg-[#81b64c] text-white border border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] sm:text-xs font-mono font-black text-zinc-400">
              {currentMoveIdx === -1 ? '0' : currentMoveIdx + 1} / {parsedMoves.length}
            </span>
          </div>
        </div>
      </div>

      {/* Game Details & Moves List */}
      <div className="w-full max-w-[min(calc(100vw-2rem),560px)] lg:max-w-none lg:w-[380px] xl:w-[420px] shrink-0 min-w-0 flex flex-col gap-4">
        {/* Era Category Pills */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-[0_4px_0_0_#141311]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 truncate">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Immortal Classics ({HISTORICAL_GAMES.length})</span>
            </span>
            <div className="flex gap-1 shrink-0">
              {(['all', 'romantic', 'golden', 'modern'] as const).map((era) => (
                <button
                  key={era}
                  onClick={() => setSelectedEra(era)}
                  className={`px-2 sm:px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-2 ${
                    selectedEra === era
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white shadow-[0_2px_0_0_#4d7a24]'
                      : 'bg-[#161512] border-[#35322b] text-zinc-400 hover:text-white shadow-[0_2px_0_0_#141311]'
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal scroll selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
            {filteredGames.map((g) => {
              const isSel = selectedGame.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g)}
                  className={`px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex flex-col items-start gap-1 shrink-0 border-2 ${
                    isSel
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white shadow-[0_3px_0_0_#4d7a24]'
                      : 'bg-[#161512] border-[#35322b] text-zinc-300 hover:bg-[#25221d] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px]'
                  }`}
                >
                  <span className="text-xs font-black leading-none">{g.white.name.split(' ')[1] || g.white.name} vs {g.black.name.split(' ')[1] || g.black.name}</span>
                  <span className="text-[10px] opacity-80 font-mono font-bold">{g.year} &bull; {g.eco}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Game Info Card */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-3xl p-4 sm:p-5 flex flex-col gap-3.5 shadow-[0_6px_0_0_#141311]">
          <div className="flex items-center justify-between pb-3 border-b-2 border-[#282622]">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{selectedGame.event} ({selectedGame.year})</span>
            </div>
            <span className="text-xs font-black font-mono text-[#81b64c] bg-[#161512] px-3 py-0.5 rounded-full border-2 border-[#4d7a24] shadow-[0_2px_0_0_#4d7a24]">
              {selectedGame.result}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">⚪ {selectedGame.white.name}</span>
              <span className="text-zinc-400 font-mono font-bold text-[11px]">
                {selectedGame.white.title} ({selectedGame.white.rating})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">⚫ {selectedGame.black.name}</span>
              <span className="text-zinc-400 font-mono font-bold text-[11px]">
                {selectedGame.black.title} ({selectedGame.black.rating})
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#161512] rounded-2xl border-2 border-[#282622] text-xs text-zinc-300 leading-relaxed font-sans shadow-inner">
            <strong className="text-amber-400 block mb-1 font-black flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              {selectedGame.opening} ({selectedGame.eco})
            </strong>
            <p className="font-medium">{selectedGame.description}</p>
          </div>

          {/* Moves List Grid */}
          <div
            ref={movesContainerRef}
            className="h-[180px] overflow-y-auto p-2 bg-[#161512] rounded-2xl border-2 border-[#282622] grid grid-cols-2 gap-1.5 font-mono text-xs shadow-inner"
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
                  className={`px-2.5 py-1.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#81b64c] border-[#4d7a24] text-white font-black shadow-[0_2px_0_0_#4d7a24]'
                      : 'border-transparent text-zinc-300 hover:bg-[#282622] hover:border-[#35322b]'
                  }`}
                >
                  <span className="text-zinc-500 font-sans text-[11px] font-bold">
                    {isWhite ? `${turnNum}.` : ''}
                  </span>
                  <span className="font-black">{m}</span>
                </button>
              );
            })}
          </div>

          {/* Analyze in Game Review button */}
          <button
            onClick={handleAnalyzeInReview}
            className="w-full py-3 rounded-full bg-[#81b64c] hover:bg-[#72a342] text-white border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Analyze in Deep Engine Review</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
      </div>
    </div>
  );
};
