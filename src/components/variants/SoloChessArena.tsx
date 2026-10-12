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
    <div className="flex flex-col lg:flex-row gap-6 h-full items-center justify-center p-4 select-none">
      {/* Board */}
      <div className="flex flex-col items-center">
        <ChessBoard
          chess={chess}
          orientation="w"
          boardTheme={boardTheme}
          pieceTheme={pieceTheme}
          onMove={handleMove}
          blindfold={blindfoldMode}
        />
      </div>

      {/* Solo Chess & Variants Control */}
      <div className="w-full max-w-md flex flex-col gap-4">
        {/* Header Mode */}
        <div className="p-4 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Solo Chess & Blindfold</h2>
          </div>
          <button
            onClick={() => setBlindfoldMode((prev) => !prev)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              blindfoldMode
                ? 'bg-purple-600 text-white shadow'
                : 'bg-[#2b2926] text-zinc-400 hover:text-white'
            }`}
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Blindfold Mode</span>
          </button>
        </div>

        {/* Level Card */}
        <div className="p-5 bg-[#21201d] rounded-xl border border-[#302e2b] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-[#81b64c]">
              Level {currentLevel.level} of {SOLO_LEVELS.length}
            </span>
            <span className="text-xs font-bold text-zinc-400 font-mono">
              Remaining: {countPieces()} Piece(s)
            </span>
          </div>

          <h3 className="text-sm font-bold text-white">{currentLevel.name}</h3>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {currentLevel.description}
          </p>

          {isCompleted && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Challenge Complete! Reduced down to 1 piece!</span>
            </div>
          )}

          {blindfoldMode && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-300 text-xs">
              <strong>Blindfold active:</strong> Pieces are hidden from the board to train your visualization and mental calculation muscles!
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 pt-3 border-t border-[#302e2b]">
            <button
              onClick={() => resetBoard()}
              className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
              className="ml-auto px-4 py-2 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold transition-colors cursor-pointer shadow"
            >
              Next Level
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
