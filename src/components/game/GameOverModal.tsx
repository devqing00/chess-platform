'use client';

import React, { useEffect, useRef } from 'react';
import { GameResultDetails, GamePlayer } from '@/types/chess';
import { X, Share2, Zap, Award, RotateCcw, Plus, Flame } from 'lucide-react';
import { useXpSystem } from '@/hooks/useXpSystem';

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GameResultDetails;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
  userColor?: 'w' | 'b';
  botStars?: number;
  undosUsed?: number;
  onReviewGame: () => void;
  onRematch: () => void;
  onNewGame: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  result,
  whitePlayer,
  blackPlayer,
  userColor: propUserColor,
  botStars,
  undosUsed = 0,
  onReviewGame,
  onRematch,
  onNewGame,
}) => {
  if (!isOpen) return null;

  const isUserWhite = React.useMemo(() => {
    if (propUserColor) return propUserColor === 'w';
    // 1. Bot vs Human check
    if (whitePlayer.isBot && !blackPlayer.isBot) return false;
    if (blackPlayer.isBot && !whitePlayer.isBot) return true;
    // 2. Local ID check
    if (whitePlayer.id === 'local-user' || whitePlayer.id === 'user-local' || whitePlayer.id === 'player-you' || whitePlayer.id === 'player-1') return true;
    if (blackPlayer.id === 'local-user' || blackPlayer.id === 'user-local' || blackPlayer.id === 'player-you' || blackPlayer.id === 'player-1') return false;
    // 3. Rating delta truth: if user gained rating, user must be the winner!
    if (result.ratingDelta > 0 && (result.winner === 'w' || result.winner === 'b')) {
      return result.winner === 'w';
    }
    if (result.ratingDelta < 0 && (result.winner === 'w' || result.winner === 'b')) {
      return result.winner === 'b';
    }
    // 4. Fallback name check
    const wName = (whitePlayer.name || '').toLowerCase();
    const bName = (blackPlayer.name || '').toLowerCase();
    if (wName.includes('you') || wName.includes('qing')) return true;
    if (bName.includes('you') || bName.includes('qing')) return false;
    return true;
  }, [propUserColor, whitePlayer, blackPlayer, result]);

  const resolvedUserColor = isUserWhite ? 'w' : 'b';
  const isWin =
    result.winner === resolvedUserColor ||
    (result.ratingDelta > 0 && (result.winner as string) !== 'draw');
  const isDraw = (result.winner as string) === 'draw' || (result.ratingDelta === 0 && (result.winner as string) !== 'w' && (result.winner as string) !== 'b');
  const isLoss = !isWin && !isDraw;

  const { profile: xpProfile, awardXp } = useXpSystem();
  const xpAwardedRef = useRef(false);

  useEffect(() => {
    if (isOpen && !xpAwardedRef.current) {
      xpAwardedRef.current = true;
      const xpAmount = isWin ? 40 : isDraw ? 20 : 15;
      awardXp(xpAmount, isWin ? 'Game Won' : isDraw ? 'Game Drawn' : 'Game Completed');
    }
  }, [isOpen, isWin, isDraw, awardXp]);

  const titleText = isWin ? 'You Won!' : isDraw ? 'Game Drawn' : 'You Lost';
  const subtitleReason = `by ${result.reason ? (result.reason.charAt(0).toUpperCase() + result.reason.slice(1)) : 'Game Concluded'}`;

  const headerBg = isWin ? 'bg-[#81b64c]' : isDraw ? 'bg-zinc-700' : 'bg-[#ca3431]';
  const opponentIsBot = Boolean(isUserWhite ? blackPlayer.isBot : whitePlayer.isBot);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Main Results Card */}
      <div className="w-full max-w-sm max-h-[95vh] overflow-y-auto bg-[#211f1c] text-zinc-100 rounded-3xl shadow-[0_8px_0_0_#141311] flex flex-col animate-in zoom-in-95 duration-200 border-2 border-[#35322b]">
        {/* Dynamic Result Header Banner */}
        <div className={`${headerBg} text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b-2 border-black/20 shadow-sm transition-colors duration-200 shrink-0`}>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/15 transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <h2 className="text-lg sm:text-xl font-black tracking-tight">{titleText}</h2>
            <span className="text-[11px] sm:text-xs text-white/90 font-bold uppercase tracking-wider">{subtitleReason}</span>
          </div>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Check.mate Match', text: `I played a match on Check.mate!` });
              }
            }}
            className="p-1 rounded-full hover:bg-black/15 transition-colors cursor-pointer text-white"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex flex-col items-center">
          {/* Matchup Player Avatars & Lightning Bolt */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 w-full">
            {/* White Player */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#181614] border-2 border-[#35322b] flex items-center justify-center text-2xl sm:text-3xl shadow-[0_3px_0_0_#141311] overflow-hidden shrink-0">
              {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={whitePlayer.avatar} alt={whitePlayer.name} className="w-full h-full object-cover" />
              ) : (
                <span>{whitePlayer.avatar || '🧑‍💻'}</span>
              )}
            </div>

            {/* Lightning bolt indicator */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 text-black border-2 border-amber-600 flex items-center justify-center shadow-[0_2px_0_0_#92400e] shrink-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
            </div>

            {/* Black Player */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#181614] border-2 border-[#35322b] flex items-center justify-center text-2xl sm:text-3xl shadow-[0_3px_0_0_#141311] overflow-hidden shrink-0">
              {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blackPlayer.avatar} alt={blackPlayer.name} className="w-full h-full object-cover" />
              ) : (
                <span>{blackPlayer.avatar || '♟️'}</span>
              )}
            </div>
          </div>

          {/* Match Score & Usernames with YOU indicator */}
          <div className="mt-3.5 sm:mt-4 text-[11px] sm:text-xs font-bold text-zinc-300 font-mono flex items-center justify-center gap-1.5 sm:gap-2">
            <span className="flex items-center gap-1 min-w-0">
              <span className="truncate max-w-[80px] sm:max-w-[100px] text-white font-black">{whitePlayer.name}</span>
              {isUserWhite && (
                <span className="text-[8px] sm:text-[9px] font-black text-[#81b64c] bg-[#81b64c]/15 px-1 sm:px-1.5 py-0.2 rounded-full border border-[#81b64c]/40 shrink-0">
                  YOU
                </span>
              )}
            </span>
            <span className="text-white font-mono font-black px-2 sm:px-2.5 py-0.5 rounded-full bg-[#141311] border-2 border-[#35322b] shadow-[0_2px_0_0_#0a0a08] shrink-0 text-[11px] sm:text-xs">
              {result.winner === 'w' ? '1 - 0' : result.winner === 'b' ? '0 - 1' : '½ - ½'}
            </span>
            <span className="flex items-center gap-1 min-w-0">
              <span className="truncate max-w-[80px] sm:max-w-[100px] text-white font-black">{blackPlayer.name}</span>
              {!isUserWhite && (
                <span className="text-[8px] sm:text-[9px] font-black text-[#81b64c] bg-[#81b64c]/15 px-1 sm:px-1.5 py-0.2 rounded-full border border-[#81b64c]/40 shrink-0">
                  YOU
                </span>
              )}
            </span>
          </div>

          {/* Bot Stars Display (When playing against Bots) */}
          {opponentIsBot && isWin && (
            <div className="mt-3.5 sm:mt-4 p-3.5 sm:p-4 bg-gradient-to-b from-[#2b2416] via-[#201c13] to-[#17140e] rounded-2xl border-2 border-amber-500/40 flex flex-col items-center w-full shadow-[0_4px_16px_rgba(245,158,11,0.15)] relative overflow-hidden">
              {/* Radiant gold top highlight */}
              <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

              {/* Three Golden Stars */}
              <div className="flex items-center justify-center gap-2 mb-1.5">
                {[1, 2, 3].map((star) => {
                  const isEarned = star <= (botStars ?? 1);
                  const isCenter = star === 2;
                  return (
                    <div
                      key={star}
                      className={`transition-all duration-300 ${
                        isCenter ? 'scale-110 -translate-y-0.5' : 'scale-95'
                      }`}
                    >
                      <span
                        className={`inline-block text-2xl sm:text-3xl ${
                          isEarned
                            ? 'text-amber-400 drop-shadow-[0_2px_10px_rgba(251,191,36,0.65)]'
                            : 'text-zinc-700 opacity-40'
                        }`}
                      >
                        ★
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Clean Typography Hierarchy */}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  {botStars === 3
                    ? '3 Stars Earned'
                    : botStars === 2
                    ? '2 Stars Earned'
                    : '1 Star Earned'}
                </span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-amber-100/75 mt-0.5 truncate max-w-full">
                  {botStars === 3
                    ? 'Flawless Victory • 0 Takebacks'
                    : botStars === 2
                    ? 'Great Win • 1 Takeback Used'
                    : `Completed • ${undosUsed} Takebacks Used`}
                </span>
              </div>
            </div>
          )}

          {/* In-App Progression: XP Reward & League Status (Scrapped fake in-app Elo) */}
          <div className="mt-3.5 sm:mt-4 p-3 rounded-2xl bg-[#141311] border-2 border-[#2b2722] flex items-center justify-between w-full shadow-inner">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] uppercase font-black tracking-wider text-zinc-400">XP Earned</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  +{isWin ? 40 : 15} XP
                </span>
              </div>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[10px] uppercase font-black tracking-wider text-amber-400">
                {xpProfile.league.name}
              </span>
              <span className="text-xs font-mono font-bold text-zinc-300">
                Level {xpProfile.level} ({xpProfile.levelProgressPercent}%)
              </span>
            </div>
          </div>

          {/* Big Green Tactile Game Review CTA */}
          <div className="mt-5 sm:mt-6 w-full flex flex-col items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onReviewGame();
              }}
              className="w-full py-3 sm:py-3.5 rounded-full bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black uppercase tracking-wider border-2 border-[#5d8b32] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Game Review</span>
            </button>
          </div>

          {/* Bottom Secondary Action Buttons */}
          <div className="mt-3.5 sm:mt-4 grid grid-cols-2 gap-2 sm:gap-2.5 w-full">
            <button
              onClick={onRematch}
              className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-full bg-[#2a2721] hover:bg-[#343029] text-zinc-200 text-[11px] sm:text-xs font-black uppercase tracking-wider border-2 border-[#3d3a34] shadow-[0_3px_0_0_#1c1a17] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#1c1a17] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>
            <button
              onClick={onNewGame}
              className="py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-full bg-[#2a2721] hover:bg-[#343029] text-zinc-200 text-[11px] sm:text-xs font-black uppercase tracking-wider border-2 border-[#3d3a34] shadow-[0_3px_0_0_#1c1a17] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#1c1a17] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
