'use client';

import React from 'react';
import { MoveRecord, MoveClassification } from '@/types/chess';
import { Sparkles, AlertTriangle, CheckCircle, Flame, Lightbulb } from 'lucide-react';
import { useShell } from '@/context/ShellContext';
import { getMentorById, generateMentorComment, getTakeawayForMove } from '@/lib/mentorsData';
import { explainChessMove } from '@/lib/chessMoveExplainer';

interface CoachCommentaryCardProps {
  move: MoveRecord | null;
  turnColor: 'w' | 'b';
  isUserWhite?: boolean;
}

export const CoachCommentaryCard: React.FC<CoachCommentaryCardProps> = ({
  move,
  turnColor,
  isUserWhite = true,
}) => {
  const { activeMentorId } = useShell();
  const mentor = getMentorById(activeMentorId);

  if (!move) {
    return (
      <div className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-start gap-3 select-none">
        <div className={`w-10 h-10 rounded-full ${mentor.avatarBg} border border-white/20 flex items-center justify-center text-xl shadow-md shrink-0`}>
          {mentor.avatarEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">{mentor.name}</span>
            <span className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black px-1.5 py-0.2 rounded-full uppercase">
              {mentor.title}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            "{mentor.tagline}" Make your move! I will evaluate your tactics and guide your strategy move by move.
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
    case 'excellent':
      icon = <CheckCircle className="w-4 h-4 text-lime-400" />;
      badgeText = 'Excellent Move ✓';
      badgeColor = 'bg-lime-500/20 text-lime-300 border-lime-500/40';
      break;
    case 'good':
      icon = <CheckCircle className="w-4 h-4 text-zinc-400" />;
      badgeText = 'Good Move ✓';
      badgeColor = 'bg-zinc-600/30 text-zinc-300 border-zinc-500/40';
      break;
    case 'book':
      icon = <span className="text-sm">📖</span>;
      badgeText = 'Book Move';
      badgeColor = 'bg-amber-600/25 text-amber-300 border-amber-600/40';
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

  const moveTurn = move.fenBefore ? (move.fenBefore.split(' ')[1] as 'w' | 'b') : turnColor;
  const isUserMove = moveTurn === (isUserWhite ? 'w' : 'b');

  const dynamicComment = generateMentorComment(
    mentor.id,
    classification,
    move.san,
    move.bestMoveSan,
    move.evalAfter,
    undefined,
    isUserMove,
    move.motif,
    move.fenBefore,
    move.refutations
  );

  const takeawayText =
    move.takeaway ||
    move.structuredCommentary?.takeaway ||
    (isUserMove ? getTakeawayForMove(move.motif?.type, classification) : undefined);

  return (
    <div className="p-3.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-start gap-3 select-none">
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full ${mentor.avatarBg} border border-white/20 flex items-center justify-center text-xl shadow-md`}>
          {mentor.avatarEmoji}
        </div>
        <div className="absolute -bottom-1 -right-1">
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-white">{mentor.name}</span>
            <span className="text-[10px] bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-black px-1.5 py-0.2 rounded-full uppercase">
              {mentor.title}
            </span>
            {move.motif && (
              <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                ⚡ {move.motif.type.replace('-', ' ')}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor} shrink-0`}>
            {badgeText}
          </span>
        </div>

        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed font-sans">
          {dynamicComment || move.coachComment || 'Solid play on the board. Always watch out for your opponent’s tactical counter-strikes!'}
        </p>

        {move.refutations && (move.refutations.accepted || move.refutations.declined) && (
          <div className="mt-2.5 p-2 rounded-lg bg-[#181715] border border-[#2e2b26] space-y-1.5 text-[11px]">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400">
              <span>🎯 Concrete Continuations</span>
            </div>
            {move.refutations.accepted && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  If Accepted
                </span>
                <div className="flex-1 text-zinc-300 font-mono">
                  <span className="text-zinc-200 font-bold">{move.refutations.accepted.lineSan}</span>
                  {move.refutations.accepted.material && (
                    <span className="text-zinc-400 font-sans ml-1.5">({move.refutations.accepted.material})</span>
                  )}
                </div>
              </div>
            )}
            {move.refutations.declined && (
              <div className="flex items-start gap-1.5">
                <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  If Declined
                </span>
                <div className="flex-1 text-zinc-300 font-mono">
                  <span className="text-zinc-200 font-bold">{move.refutations.declined.lineSan}</span>
                  {move.refutations.declined.material && (
                    <span className="text-zinc-400 font-sans ml-1.5">({move.refutations.declined.material})</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {takeawayText && (
          <div className="mt-2.5 p-2.5 rounded-lg bg-[#181a17] border border-amber-500/25 flex items-start gap-2 text-[11px]">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
                💡 Key Takeaway
              </span>
              <p className="text-zinc-300 leading-snug font-sans">
                {takeawayText}
              </p>
            </div>
          </div>
        )}

        {move.bestMoveSan && move.bestMoveSan !== move.san && (
          <div className="mt-2 text-[11px] text-zinc-400 bg-[#161512] px-2.5 py-1.5 rounded-lg border border-[#2d2a26] flex items-center justify-between gap-2">
            <span className="shrink-0 text-zinc-400 font-medium">Better move was:</span>
            <span className="text-emerald-400 font-bold text-right font-sans">
              {explainChessMove(move.bestMoveSan, move.fenBefore)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
