'use client';

import React from 'react';
import { GameResultDetails, GamePlayer } from '@/types/chess';
import { X, Share2, Zap, Trophy, Award, RotateCcw, Plus } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: GameResultDetails;
  whitePlayer: GamePlayer;
  blackPlayer: GamePlayer;
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
  onReviewGame,
  onRematch,
  onNewGame,
}) => {
  if (!isOpen) return null;

  const isWin = result.winner === 'w';
  const isDraw = result.winner === 'draw';

  const titleText = isWin ? 'You Won!' : isDraw ? 'Game Drawn' : 'You Lost';
  const subtitleReason = `by ${result.reason.charAt(0).toUpperCase() + result.reason.slice(1)}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      {/* Top Left Achievement Toast (Image 3) */}
      <div className="absolute top-6 left-6 flex items-center gap-3 p-3 bg-[#1e293b]/95 border border-blue-500/40 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex flex-col items-center justify-center text-white shadow-md">
          <Zap className="w-5 h-5 fill-current" />
          <span className="text-[8px] font-black font-mono">1</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">
            New Achievement!
          </span>
          <span className="text-sm font-black text-white">Blitz Master 1</span>
        </div>
      </div>

      {/* Main Results Card */}
      <div className="w-full max-w-sm bg-[#ffffff] text-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-zinc-200">
        {/* Green Top Header Banner */}
        <div className="bg-[#81b64c] text-white px-5 py-4 flex items-center justify-between shadow-sm">
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer text-white"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <h2 className="text-xl font-black tracking-tight">{titleText}</h2>
            <span className="text-xs text-white/90 font-medium">{subtitleReason}</span>
          </div>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Chess.com Match', text: `I played a match on Chess.com!` });
              }
            }}
            className="p-1 rounded-full hover:bg-black/10 transition-colors cursor-pointer text-white"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center">
          {/* Matchup Player Avatars & Lightning Bolt */}
          <div className="flex items-center justify-center gap-4 w-full">
            {/* White Player */}
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-3xl shadow-sm overflow-hidden">
              {whitePlayer.avatar && whitePlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={whitePlayer.avatar} alt={whitePlayer.name} className="w-full h-full object-cover" />
              ) : (
                <span>{whitePlayer.avatar || '🧑‍💻'}</span>
              )}
            </div>

            {/* Lightning bolt indicator */}
            <div className="w-8 h-8 rounded-full bg-amber-400 text-black flex items-center justify-center shadow-md">
              <Zap className="w-4 h-4 fill-current" />
            </div>

            {/* Black Player */}
            <div className="w-20 h-20 rounded-2xl bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center text-3xl shadow-sm overflow-hidden">
              {blackPlayer.avatar && blackPlayer.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={blackPlayer.avatar} alt={blackPlayer.name} className="w-full h-full object-cover" />
              ) : (
                <span>{blackPlayer.avatar || '♟️'}</span>
              )}
            </div>
          </div>

          {/* Match Score & Usernames */}
          <div className="mt-3 text-xs font-bold text-zinc-600 font-mono">
            {whitePlayer.name} {result.winner === 'w' ? '1 - 0' : result.winner === 'b' ? '0 - 1' : '½ - ½'} {blackPlayer.name}
          </div>

          {/* Rating Change */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 font-mono tracking-tight">
              {result.newRating}
            </span>
            <span className="text-lg font-black text-[#589025] font-mono">
              +{result.ratingDelta}
            </span>
          </div>

          {/* League & Trophy */}
          <div className="mt-3 flex flex-col items-center">
            <span className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
              {result.league || 'WOOD LEAGUE'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-sm font-black text-zinc-800">
              <Trophy className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>324</span>
              <span className="text-xs text-[#589025] font-bold">+{result.trophiesDelta || 9}</span>
            </div>
          </div>

          {/* Big Green Game Review CTA */}
          <div className="mt-6 w-full flex flex-col items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onReviewGame();
              }}
              className="w-full py-3.5 rounded-xl bg-[#81b64c] hover:bg-[#73a542] text-white text-base font-black tracking-wide shadow-lg shadow-[#81b64c]/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Award className="w-5 h-5" />
              <span>Game Review</span>
            </button>

            <span className="text-xs text-zinc-400 font-medium animate-pulse">
              Checking for mistakes...
            </span>
          </div>

          {/* Bottom Secondary Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 w-full">
            <button
              onClick={onRematch}
              className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rematch</span>
            </button>
            <button
              onClick={onNewGame}
              className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New 5 min</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
