'use client';

import React from 'react';
import { MoveRecord, MoveClassification } from '@/types/chess';
import { Sparkles, AlertTriangle, CheckCircle, Flame } from 'lucide-react';

interface CoachCommentaryCardProps {
  move: MoveRecord | null;
  turnColor: 'w' | 'b';
}

export const CoachCommentaryCard: React.FC<CoachCommentaryCardProps> = ({
  move,
  turnColor,
}) => {
  if (!move) {
    return (
      <div className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-start gap-3 select-none">
        <div className="w-10 h-10 rounded-full bg-[#2d2a26] border border-[#3f3b35] flex items-center justify-center text-xl shadow">
          🎙️
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Coach Danny</span>
            <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase">
              Diamond AI
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Make your move! I will evaluate your tactical decisions, spot missed tactics, and guide your strategy move by move.
          </p>
        </div>
      </div>
    );
  }

  const classification = move.classification || 'good';

  let icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
  let badgeText = 'Good Move';
  let badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

  switch (classification) {
    case 'brilliant':
      icon = <Flame className="w-4 h-4 text-cyan-300 animate-bounce" />;
      badgeText = 'Brilliant Move !!';
      badgeColor = 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50 shadow-sm shadow-cyan-500/30';
      break;
    case 'great':
      icon = <Sparkles className="w-4 h-4 text-blue-400" />;
      badgeText = 'Great Move !';
      badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-400/40';
      break;
    case 'best':
      icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
      badgeText = 'Best Move ★';
      badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      break;
    case 'inaccuracy':
      icon = <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      badgeText = 'Inaccuracy ?!';
      badgeColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      break;
    case 'mistake':
      icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
      badgeText = 'Mistake ?';
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      break;
    case 'blunder':
      icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;
      badgeText = 'Blunder ??';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      break;
    case 'miss':
      icon = <AlertTriangle className="w-4 h-4 text-red-500" />;
      badgeText = 'Missed Win ✕';
      badgeColor = 'bg-red-500/20 text-red-300 border-red-500/40';
      break;
  }

  return (
    <div className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-start gap-3 select-none">
      <div className="relative">
        <div className="w-10 h-10 rounded-full bg-[#2d2a26] border border-[#3f3b35] flex items-center justify-center text-xl shadow">
          🎙️
        </div>
        <div className="absolute -bottom-1 -right-1">
          {icon}
        </div>
      </div>

      <div className="flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Coach Danny</span>
            <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase">
              Diamond AI
            </span>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
            {badgeText}
          </span>
        </div>

        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-sans">
          {move.coachComment || 'Solid play on the board. Always watch out for your opponent’s tactical counter-strikes!'}
        </p>

        {move.bestMoveSan && move.bestMoveSan !== move.san && (
          <div className="mt-2 text-[11px] text-zinc-400 bg-[#161512] px-2 py-1 rounded border border-[#2d2a26] flex items-center justify-between">
            <span>Engine recommendation:</span>
            <span className="text-[#81b64c] font-mono font-bold">{move.bestMoveSan}</span>
          </div>
        )}
      </div>
    </div>
  );
};
