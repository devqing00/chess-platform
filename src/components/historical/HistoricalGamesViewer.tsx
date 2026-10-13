'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { HISTORICAL_GAMES, GrandmasterGame } from '@/lib/historicalGames';
import { BoardTheme, PieceTheme } from '@/types/chess';
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

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 items-center lg:items-start justify-center p-2 sm:p-4 select-none">
      {/* Board Column */}
      <div className="w-[min(100%,calc(100vh-220px),480px)] shrink-0 flex flex-col items-center gap-3">
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
        <div className="w-full bg-[#1f1d1a] px-4 py-2.5 rounded-2xl border border-[#2d2a26] flex items-center justify-between shadow-xl">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleStep(-1)}
              disabled={currentMoveIdx === -1}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
              title="First Move"
            >
              <ChevronFirst className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStep(Math.max(-1, currentMoveIdx - 1))}
              disabled={currentMoveIdx === -1}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
              title="Previous Move"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Play/Pause Button */}
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="p-2 rounded-xl bg-[#81b64c] hover:bg-[#72a342] text-white shadow transition-all cursor-pointer mx-1"
              title={isPlaying ? 'Pause' : 'Auto Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            </button>

            <button
              onClick={() => handleStep(Math.min(parsedMoves.length - 1, currentMoveIdx + 1))}
              disabled={currentMoveIdx === parsedMoves.length - 1}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
              title="Next Move"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStep(parsedMoves.length - 1)}
              disabled={currentMoveIdx === parsedMoves.length - 1}
              className="p-1.5 rounded-lg hover:bg-[#2b2824] disabled:opacity-30 text-zinc-300 transition-colors cursor-pointer"
              title="Final Move"
            >
              <ChevronLast className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed toggle */}
            <div className="flex items-center gap-1 bg-[#161512] p-1 rounded-lg border border-[#2b2824] text-[10px] font-mono">
              {[
                { label: '1s', ms: 1000 },
                { label: '1.5s', ms: 1500 },
                { label: '2s', ms: 2000 },
              ].map((s) => (
                <button
                  key={s.ms}
                  onClick={() => setPlaySpeedMs(s.ms)}
                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                    playSpeedMs === s.ms ? 'bg-[#81b64c] text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <span className="text-xs font-mono font-bold text-zinc-400">
              {currentMoveIdx === -1 ? '0' : currentMoveIdx + 1} / {parsedMoves.length}
            </span>
          </div>
        </div>
      </div>

      {/* Game Details & Moves List */}
      <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 min-w-0 flex flex-col gap-3">
        {/* Era Category Pills */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Immortal Classics ({HISTORICAL_GAMES.length})</span>
            </span>
            <div className="flex gap-1">
              {(['all', 'romantic', 'golden', 'modern'] as const).map((era) => (
                <button
                  key={era}
                  onClick={() => setSelectedEra(era)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    selectedEra === era
                      ? 'bg-[#81b64c] text-white shadow'
                      : 'bg-[#161512] text-zinc-400 hover:text-white border border-[#2d2a26]'
                  }`}
                >
                  {era}
                </button>
              ))}
            </div>
          </div>

          {/* Horizontal scroll selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {filteredGames.map((g) => {
              const isSel = selectedGame.id === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex flex-col items-start gap-0.5 shrink-0 ${
                    isSel
                      ? 'bg-[#81b64c] text-white shadow-lg shadow-[#81b64c]/20 ring-1 ring-[#81b64c]'
                      : 'bg-[#161512] text-zinc-300 hover:bg-[#25221d] border border-[#2d2a26]'
                  }`}
                >
                  <span className="text-xs font-bold leading-none">{g.white.name.split(' ')[1] || g.white.name} vs {g.black.name.split(' ')[1] || g.black.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">{g.year} &bull; {g.eco}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Game Info Card */}
        <div className="bg-[#1f1d1a] border border-[#2d2a26] rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#2d2a26]">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>{selectedGame.event} ({selectedGame.year})</span>
            </div>
            <span className="text-xs font-bold font-mono text-[#81b64c] bg-[#161512] px-2.5 py-0.5 rounded-lg border border-[#302e2b]">
              {selectedGame.result}
            </span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">⚪ {selectedGame.white.name}</span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {selectedGame.white.title} ({selectedGame.white.rating})
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-white">⚫ {selectedGame.black.name}</span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {selectedGame.black.title} ({selectedGame.black.rating})
              </span>
            </div>
          </div>

          <div className="p-3 bg-[#161512] rounded-xl border border-[#282622] text-xs text-zinc-300 leading-relaxed font-sans">
            <strong className="text-amber-400 block mb-1 font-bold flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {selectedGame.opening} ({selectedGame.eco})
            </strong>
            {selectedGame.description}
          </div>

          {/* Moves List Grid */}
          <div
            ref={movesContainerRef}
            className="h-[180px] overflow-y-auto p-2 bg-[#161512] rounded-xl border border-[#282622] grid grid-cols-2 gap-1.5 font-mono text-xs"
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
                  className={`px-2 py-1 rounded-lg text-left flex items-center justify-between transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#81b64c] text-white font-bold shadow'
                      : 'text-zinc-300 hover:bg-[#282622]'
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

          {/* Analyze in Game Review button */}
          <button
            onClick={() => router.push('/game/review/demo-game-masterpiece')}
            className="w-full py-2.5 rounded-xl bg-[#282622] hover:bg-[#34312b] border border-[#383530] text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#81b64c]" />
            <span>Analyze in Deep Engine Review</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
