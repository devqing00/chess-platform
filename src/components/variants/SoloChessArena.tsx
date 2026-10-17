'use client';

import React, { useState } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { BoardTheme, PieceTheme } from '@/types/chess';
import { Sparkles, EyeOff, RotateCcw, CheckCircle2, Flame } from 'lucide-react';
import { soundService } from '@/lib/audioService';
import confetti from 'canvas-confetti';

interface SoloChessArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

// Solo chess puzzles: Every move must capture, reduce to 1 piece
const SOLO_LEVELS = [
  {
    level: 1,
    name: 'Knight Leaps & Rook Snipes',
    fen: '8/8/8/3R4/8/5N2/2B5/8 w - - 0 1',
    description: 'Every move must be a capture! Find the order of captures so only 1 piece remains on the board.',
  },
  {
    level: 2,
    name: 'Bishop Crossfire',
    fen: '8/8/2N5/8/4B3/8/2R5/8 w - - 0 1',
    description: 'Calculate the geometric capture chain. Which piece strikes first?',
  },
  {
    level: 3,
    name: 'Grandmaster Reduction',
    fen: '8/8/3Q4/8/2N2R2/8/4B3/8 w - - 0 1',
    description: 'Four pieces on the board. Can you reduce them down to a single piece in 3 consecutive captures?',
  },
];

export const SoloChessArena: React.FC<SoloChessArenaProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [levelIndex, setLevelIndex] = useState(0);
  const [blindfoldMode, setBlindfoldMode] = useState(false);
  const currentLevel = SOLO_LEVELS[levelIndex % SOLO_LEVELS.length];

  const [chess, setChess] = useState(() => new Chess(currentLevel.fen));
  const [isCompleted, setIsCompleted] = useState(false);

  const resetBoard = (lvlIdx = levelIndex) => {
    const lvl = SOLO_LEVELS[lvlIdx % SOLO_LEVELS.length];
    setChess(new Chess(lvl.fen));
    setIsCompleted(false);
  };

  const countPieces = () => {
    const board = chess.board();
    let count = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) count++;
      }
    }
    return count;
  };

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    const piece = chess.get(from);
    const target = chess.get(to);

    // In Solo Chess, moves must be captures!
    // Since chess.js turn validation applies, we can manually update board or execute capture
    if (!target) {
      soundService.playPuzzleFail();
      return;
    }

    try {
      // Put white piece to square and remove from original
      chess.remove(from);
      chess.put(piece!, to);
      soundService.playCapture();

      const newChess = new Chess(chess.fen());
      setChess(newChess);

      // Check remaining piece count
      const remaining = countPieces();
      if (remaining === 1) {
        setIsCompleted(true);
        soundService.playPuzzleSuccess();
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      }
    } catch {
      //
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-5 sm:gap-6 w-full items-center justify-center p-2 sm:p-4 select-none">
      {/* Board */}
      <div className="flex flex-col items-center w-full max-w-[min(calc(100vw-2rem),560px)] xl:max-w-[490px] 2xl:max-w-[530px]">
        <div className="w-[min(100%,calc(100vh-220px),560px)] aspect-square relative shadow-2xl rounded-2xl overflow-hidden border border-[#302d29]">
          <ChessBoard
            chess={chess}
            orientation="w"
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleMove}
            blindfold={blindfoldMode}
          />
        </div>
      </div>

      {/* Solo Chess & Variants Control */}
      <div className="w-full max-w-[min(calc(100vw-2rem),560px)] xl:max-w-md flex flex-col gap-3.5 sm:gap-4">
        {/* Header Mode */}
        <div className="p-4 sm:p-5 bg-[#211f1c] rounded-2xl sm:rounded-3xl border-2 border-[#35322b] flex items-center justify-between shadow-[0_4px_0_0_#141311]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_2px_0_0_#141311]">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h2 className="text-sm sm:text-base font-black text-white">Solo Chess &amp; Blindfold</h2>
          </div>
          <button
            onClick={() => setBlindfoldMode((prev) => !prev)}
            className={`px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              blindfoldMode
                ? 'bg-[#a855f7] hover:bg-[#9333ea] text-white border-2 border-[#7e22ce] shadow-[0_3px_0_0_#581c87] hover:-translate-y-[1px] active:translate-y-[1px]'
                : 'bg-[#262420] hover:bg-[#2e2a25] text-zinc-300 hover:text-white border-2 border-[#35322b] shadow-[0_2px_0_0_#141311]'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Blindfold</span>
          </button>
        </div>

        {/* Level Card */}
        <div className="p-4 sm:p-6 bg-[#211f1c] rounded-2xl sm:rounded-3xl border-2 border-[#35322b] flex flex-col gap-3 shadow-[0_5px_0_0_#141311]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-xs font-mono font-black text-[#81b64c] uppercase tracking-wider bg-[#81b64c]/10 border border-[#81b64c]/30 px-2.5 py-0.5 rounded-full">
              Level {currentLevel.level} of {SOLO_LEVELS.length}
            </span>
            <span className="text-[11px] sm:text-xs font-black text-amber-400 font-mono bg-[#181614] border-2 border-[#35322b] px-2.5 sm:px-3 py-1 rounded-full shadow-[0_2px_0_0_#141311]">
              Remaining: {countPieces()}
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-black text-white">{currentLevel.name}</h3>

          <p className="text-xs text-zinc-300 leading-relaxed font-medium">
            {currentLevel.description}
          </p>

          {isCompleted && (
            <div className="p-3 sm:p-3.5 bg-emerald-500/15 border-2 border-emerald-500/40 rounded-2xl flex items-center gap-2 text-emerald-300 text-xs font-black shadow-[0_3px_0_0_#064e3b]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Challenge Complete! Reduced down to 1 piece!</span>
            </div>
          )}

          {blindfoldMode && (
            <div className="p-3 sm:p-3.5 bg-purple-500/15 border-2 border-purple-500/40 rounded-2xl text-purple-300 text-xs font-medium shadow-[0_3px_0_0_#3b0764]">
              <strong className="font-black text-purple-200">Blindfold active:</strong> Pieces are hidden from the board to train your visualization!
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 pt-3 sm:pt-4 border-t-2 border-[#35322b]">
            <button
              onClick={() => resetBoard()}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#262420] hover:bg-[#2e2a25] text-zinc-300 text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_1px_0_0_#141311]"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart</span>
            </button>

            <button
              onClick={() => {
                const next = (levelIndex + 1) % SOLO_LEVELS.length;
                setLevelIndex(next);
                resetBoard(next);
              }}
              className="ml-auto px-4 sm:px-5 py-2 rounded-full bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black transition-all cursor-pointer border-2 border-[#5c8a32] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24]"
            >
              Next Level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
