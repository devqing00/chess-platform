'use client';

import React, { useState } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { ChessEvaluator } from '@/lib/chessEngine';
import { BoardTheme, PieceTheme, PieceColor } from '@/types/chess';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Award, RotateCcw, ArrowUpDown } from 'lucide-react';
import { soundService } from '@/lib/audioService';

export default function AnalysisPage() {
  const router = useRouter();
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [boardTheme] = useState<BoardTheme>('green');
  const [pieceTheme] = useState<PieceTheme>('neo');
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [evalScore, setEvalScore] = useState<number>(0);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const handleMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    try {
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      const newEval = ChessEvaluator.evaluatePosition(chess);
      setEvalScore(newEval);
      setLastMove({ from, to });
      soundService.playMove();
      setChess(new Chess(chess.fen()));
    } catch {
      //
    }
  };

  const handleReset = () => {
    setChess(new Chess());
    setEvalScore(0);
    setLastMove(null);
    soundService.playGameStart();
  };

  return (
    <div className="flex-1 p-6 flex flex-col items-center bg-[#161512] text-zinc-100 overflow-y-auto select-none">
      <div className="w-full max-w-5xl flex items-center justify-between mb-4 pb-3 border-b border-[#282522]">
        <button
          onClick={() => router.push('/')}
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Home</span>
        </button>

        <h1 className="text-sm font-black text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-[#81b64c]" />
          <span>Analysis Board & Free Engine Sandbox</span>
        </h1>

        <button
          onClick={() => router.push('/game/review/demo-game-masterpiece')}
          className="px-3 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold cursor-pointer"
        >
          View Full Game Review
        </button>
      </div>

      <div className="flex gap-4 items-center justify-center my-auto">
        <EvalBar score={evalScore} orientation={orientation} />
        <div className="w-[580px]">
          <ChessBoard
            chess={chess}
            orientation={orientation}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleMove}
            lastMove={lastMove}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
          className="px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-300 flex items-center gap-2 cursor-pointer"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>Flip Board</span>
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-xl bg-[#282622] hover:bg-[#34312b] text-xs font-bold text-zinc-300 flex items-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Board</span>
        </button>
      </div>
    </div>
  );
}
