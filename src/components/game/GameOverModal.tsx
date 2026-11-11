'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { GameResultDetails, GamePlayer } from '@/types/chess';
import { X, Award, RotateCcw, Plus, Zap, Share2 } from 'lucide-react';
import { useXpSystem } from '@/hooks/useXpSystem';
import { Button } from '@/components/ui/button';
import { getCountryFlag } from '@/lib/countryUtils';

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
  rematchRequestedBy?: 'w' | 'b' | null;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
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
  rematchRequestedBy,
  onAcceptRematch,
  onDeclineRematch,
}) => {
  // 1. ALL HOOKS DECLARED AT THE VERY TOP UNCONDITIONALLY (Fixes React 19 static flag assertion)
  const isUserWhite = useMemo(() => {
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

  // 2. EARLY RETURN STRICTLY AFTER ALL HOOKS
  if (!isOpen) return null;

  const titleText = isWin ? 'You Won!' : isDraw ? 'Game Drawn' : 'You Lost';
  const subtitleReason = `by ${result.reason ? (result.reason.charAt(0).toUpperCase() + result.reason.slice(1)) : 'Game Concluded'}`;

  const headerBg = isWin
    ? 'bg-gradient-to-b from-[#8fd649] via-[#7cb53d] to-[#699c30]'
    : isDraw
    ? 'bg-zinc-700'
    : 'bg-gradient-to-b from-[#e04545] via-[#ca3431] to-[#b32b28]';
  const opponentIsBot = Boolean(isUserWhite ? blackPlayer.isBot : whitePlayer.isBot);

  const whiteScore = result.winner === 'w' ? '1' : result.winner === 'b' ? '0' : '½';
  const blackScore = result.winner === 'b' ? '1' : result.winner === 'w' ? '0' : '½';

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 pt-safe pb-safe select-none animate-in fade-in duration-200">
      {/* Main Results Card */}
      <div className="w-full max-w-sm max-h-[85dvh] sm:max-h-[88vh] my-auto bg-[#181614] text-zinc-100 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] flex flex-col animate-in zoom-in-95 duration-200 border border-white/10 overflow-hidden">
        {/* Dynamic Result Header Banner */}
        <div className={`${headerBg} text-white px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between border-b-2 border-black/20 shadow-sm transition-colors duration-200 shrink-0`}>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/15 transition-colors cursor-pointer text-white"
            title="Close"
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
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col items-center flex-1 overflow-y-auto gap-3">
          {/* Dual-Themed Matchup Bar: White Left | Score Center | Black Right (Compact & Clean) */}
          <div className="w-full flex items-center justify-between gap-2">
            {/* White Player: Gradient White Tile */}
            <div className="flex-1 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-white via-zinc-100 to-zinc-200 shadow-sm flex items-center gap-2 min-w-0">
              {/* White Avatar */}
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={whitePlayer.avatar} alt={whitePlayer.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span className="text-zinc-900">{whitePlayer.avatar || '♔'}</span>
                )}
              </div>

              {/* Name & White Label */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-zinc-950 truncate">
                    {whitePlayer.name}
                  </span>
                  {isUserWhite && (
                    <span className="text-[8px] font-black text-emerald-800 bg-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-600">
                  <span>White</span>
                  {whitePlayer.country && (
                    <span className="text-[11px] shrink-0" title={whitePlayer.country}>
                      {getCountryFlag(whitePlayer.country)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Score Pill in Center */}
            <div className="shrink-0 px-2.5 py-1 rounded-full bg-[#24221f] text-zinc-200 font-mono font-black text-xs shadow-sm">
              {result.winner === 'w' ? '1 - 0' : result.winner === 'b' ? '0 - 1' : '½ - ½'}
            </div>

            {/* Black Player: Gradient Obsidian Tile */}
            <div className="flex-1 p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-[#24221f] via-[#1a1815] to-[#12110f] shadow-sm flex items-center gap-2 min-w-0">
              {/* Black Avatar */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#141311] flex items-center justify-center text-lg shadow-xs">
                  {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={blackPlayer.avatar} alt={blackPlayer.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span>{blackPlayer.avatar || '♚'}</span>
                  )}
                </div>
                {blackPlayer.title && (
                  <span className="absolute -top-1 -right-1 text-[7px] font-black bg-[#ca8a04] text-zinc-950 px-1 rounded-sm uppercase tracking-wider">
                    {blackPlayer.title}
                  </span>
                )}
              </div>

              {/* Name & Black Label */}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-black text-white truncate">
                    {blackPlayer.name}
                  </span>
                  {!isUserWhite && (
                    <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/20 px-1 py-0.2 rounded shrink-0">
                      YOU
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                  <span>Black</span>
                  {blackPlayer.country && (
                    <span className="text-[11px] shrink-0" title={blackPlayer.country}>
                      {getCountryFlag(blackPlayer.country)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bot Stars Display (When playing against Bots) - Clean, borderless warm surface */}
          {opponentIsBot && isWin && (
            <div className="w-full p-3 rounded-2xl bg-[#1f1d19] flex flex-col items-center shadow-sm">
              {/* Three Golden Stars */}
              <div className="flex items-center justify-center gap-2 mb-1">
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
                        className={`inline-block text-2xl ${
                          isEarned
                            ? 'text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]'
                            : 'text-zinc-700 opacity-40'
                        }`}
                      >
                        ★
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Clean Typography */}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black text-amber-300 uppercase tracking-widest">
                  {botStars === 3
                    ? '3 Stars Earned'
                    : botStars === 2
                    ? '2 Stars Earned'
                    : '1 Star Earned'}
                </span>
                <span className="text-[10px] sm:text-[11px] font-medium text-zinc-400 mt-0.5">
                  {botStars === 3
                    ? 'Flawless Victory • 0 Takebacks'
                    : botStars === 2
                    ? 'Great Win • 1 Takeback Used'
                    : `Completed • ${undosUsed} Takebacks Used`}
                </span>
              </div>
            </div>
          )}

          {/* Progression: XP Reward & League Status - Clean modern row */}
          <div className="w-full p-2.5 sm:p-3 rounded-2xl bg-[#1f1d19] flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400">XP Earned</span>
                <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono">
                  +{isWin ? 40 : 15} XP
                </span>
              </div>
            </div>

            <div className="flex flex-col text-right">
              <span className="text-[9px] uppercase font-bold tracking-wider text-amber-400">
                {xpProfile.league.name}
              </span>
              <span className="text-[11px] font-mono font-bold text-zinc-300">
                Level {xpProfile.level} ({xpProfile.levelProgressPercent}%)
              </span>
            </div>
          </div>

          {/* Primary Action: Big Green Tactile Game Review CTA */}
          <div className="w-full flex flex-col items-center gap-2 mt-1">
            <Button
              variant="primary"
              size="lg"
              rounded="full"
              fullWidth
              onClick={() => {
                onClose();
                onReviewGame();
              }}
            >
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Game Review</span>
            </Button>
          </div>

          {/* Secondary Action Buttons with Rematch Handling */}
          {rematchRequestedBy ? (
            rematchRequestedBy === resolvedUserColor ? (
              <div className="flex flex-col gap-2 w-full mt-0.5">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold animate-in fade-in">
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="truncate">Rematch offered • Waiting for opponent...</span>
                  </span>
                  {onDeclineRematch && (
                    <button
                      type="button"
                      onClick={onDeclineRematch}
                      className="ml-2 text-[11px] text-zinc-400 hover:text-white underline cursor-pointer shrink-0"
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="full"
                  fullWidth
                  onClick={onNewGame}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Game</span>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 animate-in zoom-in-95 mt-0.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span className="flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                    Opponent Offered a Rematch!
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Swaps colors</span>
                </div>
                <p className="text-[11px] text-zinc-300">Play again with the same opponent with swapped colors.</p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    rounded="full"
                    onClick={onAcceptRematch || onRematch}
                  >
                    Accept Rematch
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="full"
                    onClick={onDeclineRematch}
                  >
                    Decline
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 gap-2 w-full mt-0.5">
              <Button
                variant="secondary"
                size="sm"
                rounded="full"
                onClick={onRematch}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rematch</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                rounded="full"
                onClick={onNewGame}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Game</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
