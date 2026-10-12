'use client';

import React from 'react';
import { MoveRecord, MoveClassification } from '@/types/chess';
import { ChessEvaluator } from '@/lib/chessEngine';
import { X, Award, Flame, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface GameReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  moves: MoveRecord[];
  whitePlayerName: string;
  blackPlayerName: string;
}

export const GameReviewModal: React.FC<GameReviewModalProps> = ({
  isOpen,
  onClose,
  moves,
  whitePlayerName,
  blackPlayerName,
}) => {
  if (!isOpen) return null;

  // Separate moves for White & Black
  const whiteMoves = moves.filter((_, idx) => idx % 2 === 0);
  const blackMoves = moves.filter((_, idx) => idx % 2 === 1);

  const countClassifications = (moveList: MoveRecord[]) => {
    const counts: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      miss: 0,
      book: 0,
    };
    moveList.forEach((m) => {
      if (m.classification) {
        counts[m.classification] = (counts[m.classification] || 0) + 1;
      } else {
        counts.good = (counts.good || 0) + 1;
      }
    });
    return counts;
  };

  const whiteCounts = countClassifications(whiteMoves);
  const blackCounts = countClassifications(blackMoves);

  // Calculate CAPS Accuracies
  const whiteLosses = whiteMoves.map((m) => Math.max(0, m.evalBefore - m.evalAfter));
  const blackLosses = blackMoves.map((m) => Math.max(0, m.evalAfter - m.evalBefore));

  const whiteCaps = ChessEvaluator.calculateCapsAccuracy(whiteLosses);
  const blackCaps = ChessEvaluator.calculateCapsAccuracy(blackLosses);

  const categories: { key: MoveClassification; label: string; icon: string; color: string }[] = [
    { key: 'brilliant', label: 'Brilliant', icon: '!!', color: 'text-cyan-400 bg-cyan-500/10' },
    { key: 'great', label: 'Great', icon: '!', color: 'text-blue-400 bg-blue-500/10' },
    { key: 'best', label: 'Best', icon: '★', color: 'text-emerald-400 bg-emerald-500/10' },
    { key: 'excellent', label: 'Excellent', icon: '✓', color: 'text-emerald-300 bg-emerald-500/5' },
    { key: 'good', label: 'Good', icon: '✓', color: 'text-zinc-400 bg-zinc-500/5' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: '?!', color: 'text-yellow-400 bg-yellow-500/10' },
    { key: 'mistake', label: 'Mistake', icon: '?', color: 'text-amber-500 bg-amber-500/10' },
    { key: 'blunder', label: 'Blunder', icon: '??', color: 'text-rose-500 bg-rose-500/10' },
    { key: 'miss', label: 'Miss', icon: '✕', color: 'text-red-400 bg-red-500/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="w-full max-w-2xl bg-[#1e1c19] border border-[#33302b] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#262421] border-b border-[#33302b] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Award className="w-6 h-6 text-[#81b64c]" />
            <span className="text-lg font-black text-white tracking-wide">
              Chess.com Game Review & Insights
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-[#383530] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* CAPS Accuracy Comparison Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* White Player */}
            <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex flex-col items-center">
              <span className="text-xs font-semibold text-zinc-400 mb-1">
                {whitePlayerName} (White)
              </span>
              <div className="text-4xl font-black text-white font-mono tracking-tight">
                {whiteCaps}%
              </div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 font-bold">
                CAPS Accuracy
              </span>
              <div className="w-full bg-[#161512] h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-[#81b64c] h-full rounded-full transition-all duration-500"
                  style={{ width: `${whiteCaps}%` }}
                />
              </div>
            </div>

            {/* Black Player */}
            <div className="p-4 bg-[#262421] rounded-xl border border-[#383530] flex flex-col items-center">
              <span className="text-xs font-semibold text-zinc-400 mb-1">
                {blackPlayerName} (Black)
              </span>
              <div className="text-4xl font-black text-white font-mono tracking-tight">
                {blackCaps}%
              </div>
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1 font-bold">
                CAPS Accuracy
              </span>
              <div className="w-full bg-[#161512] h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${blackCaps}%` }}
                />
              </div>
            </div>
          </div>

          {/* Coach Danny Summary */}
          <div className="p-4 bg-gradient-to-r from-[#2a2824] to-[#211f1c] rounded-xl border border-[#3a3731] flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#35322c] border border-[#48443c] flex items-center justify-center text-2xl shadow-inner shrink-0">
              🎙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Coach Danny’s Verdict</span>
                <span className="text-[10px] bg-[#81b64c]/20 text-[#81b64c] font-black px-2 py-0.5 rounded-full uppercase">
                  Analysis
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                {whiteCaps > blackCaps
                  ? `White exhibited superior tactical control and punished unforced errors decisively! Black had moments of counterplay but stumbled in critical tactical scrambles.`
                  : `Black played with remarkable precision, neutralizing White’s threats and steadily seizing the initiative! A model defensive and tactical masterclass.`}
              </p>
            </div>
          </div>

          {/* Move Categorization Breakdown Table */}
          <div className="bg-[#262421] rounded-xl border border-[#383530] overflow-hidden">
            <div className="px-4 py-2.5 bg-[#2d2a26] border-b border-[#383530] grid grid-cols-[1fr_80px_80px] text-xs font-bold text-zinc-400">
              <span>Move Quality</span>
              <span className="text-center">{whitePlayerName}</span>
              <span className="text-center">{blackPlayerName}</span>
            </div>

            <div className="divide-y divide-[#33302b]">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className="px-4 py-2 grid grid-cols-[1fr_80px_80px] items-center text-xs font-medium"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${cat.color}`}>
                      {cat.icon}
                    </span>
                    <span className="text-zinc-200">{cat.label}</span>
                  </div>
                  <span className="text-center font-mono font-bold text-zinc-300">
                    {whiteCounts[cat.key]}
                  </span>
                  <span className="text-center font-mono font-bold text-zinc-300">
                    {blackCounts[cat.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-[#262421] border-t border-[#33302b] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white font-bold text-sm transition-colors cursor-pointer shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
