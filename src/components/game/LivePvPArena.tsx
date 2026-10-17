'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import { useRouter } from 'next/navigation';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GameSyncService } from '@/lib/firebase/gameSyncService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { LiveSyncGame } from '@/lib/firebase/types';
import { useAuth } from '@/context/AuthContext';
import { soundService } from '@/lib/audioService';
import { MoveRecord } from '@/types/chess';
import {
  Clock,
  Flag,
  Handshake,
  Share2,
  Copy,
  Check,
  RotateCcw,
  Award,
  AlertTriangle,
  Wifi,
  WifiOff,
  User,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LivePvPArenaProps {
  gameId: string;
}

export const LivePvPArena: React.FC<LivePvPArenaProps> = ({ gameId }) => {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [game, setGame] = useState<LiveSyncGame | null>(null);
  const [chess] = useState<Chess>(() => new Chess());
  const [copiedLink, setCopiedLink] = useState(false);
  const [localWhiteTime, setLocalWhiteTime] = useState(600);
  const [localBlackTime, setLocalBlackTime] = useState(600);
  const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(null);

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimestampRef = useRef<number>(Date.now());
  const lastTurnRef = useRef<'w' | 'b'>('w');

  // Determine current player color ('w' or 'b' or 'spectator')
  const myUid = user?.uid;
  const isWhite = game?.whitePlayer.uid === myUid;
  const isBlack = game?.blackPlayer?.uid === myUid;
  const playerColor: 'w' | 'b' = isWhite ? 'w' : isBlack ? 'b' : 'w';
  const isSpectator = !isWhite && !isBlack;
  const isMyTurn = !isSpectator && game?.status === 'active' && game?.turn === playerColor;

  // 1. Join / Subscribe to live Firestore game
  useEffect(() => {
    if (!user) return;

    // Auto-join room as black or spectator if not already populated
    GameSyncService.createOrJoinGame(
      gameId,
      profile || {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Player',
        avatar: '♟️',
        tier: 'free',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: user.isAnonymous,
        ratings: { rapid: 1200, blitz: 1200, bullet: 1200, daily: 1200, puzzles: 1500, puzzleRush: 0 },
        stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0 },
      }
    ).catch(console.error);

    const unsubscribe = GameSyncService.subscribeToGame(gameId, (liveGame) => {
      setGame(liveGame);

      // Synchronize chess.js internal FEN state if different
      if (liveGame.fen && liveGame.fen !== chess.fen()) {
        try {
          chess.load(liveGame.fen);
          if (liveGame.lastMove) {
            setLastMoveSquares({
              from: liveGame.lastMove.from,
              to: liveGame.lastMove.to,
            });
            if (chess.inCheck()) {
              soundService.playCheck();
            } else {
              soundService.playMove();
            }
          }
        } catch (e) {
          console.warn('Failed to load FEN from live sync:', e);
        }
      }

      setLocalWhiteTime(liveGame.whiteTime);
      setLocalBlackTime(liveGame.blackTime);
      lastSyncTimestampRef.current = Date.now();
      lastTurnRef.current = liveGame.turn;
    });

    return () => {
      unsubscribe();
    };
  }, [gameId, user, profile, chess]);

  // 2. High-precision 100ms Clock Engine
  useEffect(() => {
    if (!game || game.status !== 'active') {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
      return;
    }

    clockIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastSyncTimestampRef.current) / 1000;
      lastSyncTimestampRef.current = now;

      if (game.turn === 'w') {
        setLocalWhiteTime((prev) => {
          const next = Math.max(0, prev - deltaSec);
          if (next === 0 && isWhite) {
            // Flag fallen for White!
            GameSyncService.finishGame(gameId, 'b', 'White flagged (out of time)');
          }
          return next;
        });
      } else {
        setLocalBlackTime((prev) => {
          const next = Math.max(0, prev - deltaSec);
          if (next === 0 && isBlack) {
            // Flag fallen for Black!
            GameSyncService.finishGame(gameId, 'w', 'Black flagged (out of time)');
          }
          return next;
        });
      }

      // Check disconnect grace timer
      if (game.disconnectTimeoutAt) {
        const remaining = Math.max(0, Math.ceil((game.disconnectTimeoutAt - now) / 1000));
        setDisconnectCountdown(remaining);
      } else {
        setDisconnectCountdown(null);
      }
    }, 100);

    return () => {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [game, isWhite, isBlack, gameId]);

  // 3. Tab Visibility & Disconnect Watchdog
  useEffect(() => {
    if (isSpectator || !game || game.status !== 'active') return;

    const handleVisibilityChange = () => {
      const isOnline = !document.hidden;
      GameSyncService.setPlayerConnection(gameId, playerColor, isOnline, 60);
    };

    const handleBeforeUnload = () => {
      GameSyncService.setPlayerConnection(gameId, playerColor, false, 60);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId, playerColor, isSpectator, game?.status]);

  // 4. Handle Player Move
  const handleMove = useCallback(
    async (from: Square, to: Square, promotion?: string) => {
      if (!isMyTurn || !game) return;

      try {
        const moveResult = chess.move({
          from,
          to,
          promotion: (promotion as any) || 'q',
        });

        if (!moveResult) return;

        const isCapture = moveResult.captured !== undefined;
        const isCheck = chess.inCheck();
        if (isCheck) {
          soundService.playCheck();
        } else if (isCapture) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }

        setLastMoveSquares({ from, to });

        // Calculate time with optional increment
        const increment = game.incrementSec || 0;
        const updatedWhiteTime = playerColor === 'w' ? localWhiteTime + increment : localWhiteTime;
        const updatedBlackTime = playerColor === 'b' ? localBlackTime + increment : localBlackTime;
        const nextTurn = chess.turn();

        // Broadcast to Firestore
        await GameSyncService.broadcastMove(
          gameId,
          from,
          to,
          moveResult.san,
          chess.fen(),
          nextTurn,
          updatedWhiteTime,
          updatedBlackTime
        );

        // Check authoritative terminal states
        if (chess.isCheckmate()) {
          const winner = playerColor;
          const reason = `Checkmate! ${playerColor === 'w' ? 'White' : 'Black'} wins.`;
          soundService.playGameEndWin();
          await GameSyncService.finishGame(gameId, winner, reason);
          saveFinishedGameRecord(winner, reason);
        } else if (chess.isDraw()) {
          let reason = 'Draw';
          if (chess.isStalemate()) reason = 'Stalemate';
          if (chess.isThreefoldRepetition()) reason = 'Draw by 3-fold repetition';
          if (chess.isInsufficientMaterial()) reason = 'Draw by insufficient material';
          soundService.playGameEndDraw();
          await GameSyncService.finishGame(gameId, 'draw', reason);
          saveFinishedGameRecord('draw', reason);
        }
      } catch (err) {
        console.warn('Illegal move attempted:', err);
      }
    },
    [isMyTurn, game, chess, playerColor, localWhiteTime, localBlackTime, gameId]
  );

  // Helper to persist finished game record
  const saveFinishedGameRecord = async (winner: 'w' | 'b' | 'draw', reason: string) => {
    if (!game) return;
    try {
      const verboseMoves = chess.history({ verbose: true });
      const structuredMoves: MoveRecord[] = verboseMoves.map((m) => ({
        san: m.san,
        from: m.from as Square,
        to: m.to as Square,
        captured: m.captured as any,
        promotion: m.promotion as any,
        fenBefore: m.before,
        fenAfter: m.after,
        evalBefore: 0,
        evalAfter: 0,
      }));

      const tc = game.timeControlSec || 600;
      const timeClass = tc <= 180 ? 'bullet' : tc <= 600 ? 'blitz' : 'rapid';

      await FirestoreService.saveGame({
        id: game.id,
        white: {
          uid: game.whitePlayer.uid,
          name: game.whitePlayer.name,
          rating: game.whitePlayer.rating,
          avatar: game.whitePlayer.avatar,
        },
        black: {
          uid: game.blackPlayer?.uid || 'guest-black',
          name: game.blackPlayer?.name || 'Black Player',
          rating: game.blackPlayer?.rating || 1200,
          avatar: game.blackPlayer?.avatar,
        },
        pgn: chess.pgn(),
        finalFen: chess.fen(),
        timeControl: tc,
        timeClass,
        variant: 'standard',
        result: winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '1/2-1/2',
        winReason: reason,
        moves: structuredMoves,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to save finished game to Firestore:', e);
    }
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/play/live/${gameId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (totalSec: number) => {
    const minutes = Math.floor(totalSec / 60);
    const seconds = Math.floor(totalSec % 60);
    const ms = Math.floor((totalSec % 1) * 10);
    if (totalSec < 20) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const opponent = isWhite ? game?.blackPlayer : game?.whitePlayer;
  const opponentTime = isWhite ? localBlackTime : localWhiteTime;
  const myTime = isWhite ? localWhiteTime : localBlackTime;
  const opponentDisconnected = game?.disconnectedPlayer && game.disconnectedPlayer !== playerColor;

  return (
    <div className="flex-1 w-full flex flex-col xl:flex-row items-center xl:items-start justify-center p-3 sm:p-6 lg:p-8 bg-[#161512] text-zinc-100 gap-6 select-none overflow-y-auto">
      {/* Board Column */}
      <div className="flex flex-col items-center gap-3 w-full max-w-[min(calc(100vw-2rem),560px)] xl:max-w-[560px]">
        {/* Opponent Card & Clock */}
        <div className="w-full flex items-center justify-between p-3 bg-[#1e1c18] border border-[#2e2b26] rounded-2xl shadow">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-xl bg-zinc-800 border border-[#3b3833] overflow-hidden flex items-center justify-center text-lg">
              {opponent?.avatar && opponent.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opponent.avatar} alt="Opponent" className="w-full h-full object-cover" />
              ) : (
                <span>{opponent?.avatar || '♟️'}</span>
              )}
              {opponentDisconnected ? (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              ) : (
                <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  {opponent?.name || 'Waiting for opponent...'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">({opponent?.rating || 1200})</span>
              </div>
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                {opponentDisconnected ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Disconnected ({disconnectCountdown}s)
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Online
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Opponent Digital Clock */}
          <div
            className={`px-4 py-2 rounded-xl font-mono text-xl font-black border transition-colors ${
              game?.turn !== playerColor && game?.status === 'active'
                ? opponentTime < 30
                  ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-[#292621] border-amber-500/50 text-white shadow-lg shadow-amber-500/10'
                : 'bg-[#181714] border-zinc-800 text-zinc-400'
            }`}
          >
            {formatTime(opponentTime)}
          </div>
        </div>

        {/* Disconnect Forfeit Banner */}
        {opponentDisconnected && disconnectCountdown !== null && (
          <div className="w-full p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-xs text-rose-300 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>
                Opponent lost connection. Forfeits in <b>{disconnectCountdown}s</b>.
              </span>
            </div>
            {disconnectCountdown === 0 && (
              <button
                onClick={() => GameSyncService.claimAbandonmentWin(gameId, playerColor)}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg transition"
              >
                Claim Win
              </button>
            )}
          </div>
        )}

        {/* Interactive Chess Board */}
        <div className="w-full aspect-square relative shadow-2xl rounded-2xl overflow-hidden border border-[#2b2823]">
          <ChessBoard
            chess={chess}
            orientation={playerColor}
            onMove={handleMove}
            disabled={!isMyTurn}
            lastMove={lastMoveSquares}
          />

          {/* Waiting For Opponent Overlay */}
          {game?.status === 'waiting' && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center gap-4 z-20">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
                <Share2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Share Challenge Link</h3>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Send this link to a friend or open in another tab to play 1v1 live.
                </p>
              </div>
              <button
                onClick={copyShareLink}
                className="px-5 py-2.5 bg-[#81b64c] hover:bg-[#92c855] text-black font-black text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Game Link'}</span>
              </button>
            </div>
          )}

          {/* Game Over Banner Overlay */}
          {game?.status === 'completed' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-4 z-20 animate-fade-in">
              <div className="p-4 rounded-2xl bg-[#81b64c]/20 border border-[#81b64c]/40 text-[#81b64c]">
                <Award className="w-10 h-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-white">
                  {game.winner === 'draw'
                    ? 'Game Drawn'
                    : game.winner === playerColor
                    ? '🏆 You Won!'
                    : 'Defeat'}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">{game.winReason}</p>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => router.push(`/game/review/${gameId}`)}
                  className="px-5 py-2.5 bg-[#81b64c] hover:bg-[#92c855] text-black font-black text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Review Game (Accuracy)</span>
                </button>
                <button
                  onClick={() => router.push('/play')}
                  className="px-4 py-2.5 bg-[#2d2a26] hover:bg-[#383530] text-zinc-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Back to Lobby
                </button>
              </div>
            </div>
          )}
        </div>

        {/* You (Bottom Player Card) */}
        <div className="w-full flex items-center justify-between p-3 bg-[#1e1c18] border border-[#2e2b26] rounded-2xl shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-[#3b3833] overflow-hidden flex items-center justify-center text-lg">
              {profile?.avatar && profile.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="You" className="w-full h-full object-cover" />
              ) : (
                <span>{profile?.avatar || '♟️'}</span>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">
                  {profile?.displayName || user?.displayName || 'You'}
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  ({profile?.ratings.blitz || 1200})
                </span>
              </div>
              <span className="text-[11px] text-zinc-400">
                Playing as {playerColor === 'w' ? 'White ⚪' : 'Black ⚫'}
              </span>
            </div>
          </div>

          {/* Your Digital Clock */}
          <div
            className={`px-4 py-2 rounded-xl font-mono text-xl font-black border transition-colors ${
              isMyTurn
                ? myTime < 30
                  ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-[#292621] border-[#81b64c] text-white shadow-lg shadow-[#81b64c]/20'
                : 'bg-[#181714] border-zinc-800 text-zinc-400'
            }`}
          >
            {formatTime(myTime)}
          </div>
        </div>
      </div>

      {/* Live Controls & Match Info Sidebar */}
      <div className="w-full max-w-[min(calc(100vw-2rem),560px)] xl:max-w-none xl:w-80 flex flex-col gap-4">
        {/* Match Info Panel */}
        <div className="p-5 bg-[#1b1916] border border-[#2d2a26] rounded-2xl flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#2d2a26] pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Live 1v1 PvP
              </span>
            </div>
            <span className="text-xs font-bold text-zinc-400">
              {Math.floor((game?.timeControlSec || 600) / 60)} min
              {game?.incrementSec ? ` + ${game.incrementSec}s` : ''}
            </span>
          </div>

          {/* Pending Draw Offer Alert */}
          {game?.drawOfferFrom && game.drawOfferFrom !== playerColor && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex flex-col gap-2">
              <span className="text-xs font-bold text-amber-300">
                Opponent offered a draw. Accept?
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => GameSyncService.respondToDrawOffer(gameId, true)}
                  className="flex-1 py-1.5 bg-amber-500 text-black font-black text-xs rounded-lg hover:bg-amber-400 transition"
                >
                  Accept
                </button>
                <button
                  onClick={() => GameSyncService.respondToDrawOffer(gameId, false)}
                  className="flex-1 py-1.5 bg-[#2d2a26] text-zinc-300 font-bold text-xs rounded-lg hover:bg-[#383530] transition"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => GameSyncService.offerDraw(gameId, playerColor)}
              disabled={game?.status !== 'active' || !!game.drawOfferFrom}
              className="py-2.5 px-3 bg-[#262420] hover:bg-[#302d28] disabled:opacity-40 text-zinc-300 font-bold text-xs rounded-xl border border-[#3b3832] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Handshake className="w-4 h-4 text-amber-400" />
              <span>Offer Draw</span>
            </button>

            <button
              onClick={() =>
                GameSyncService.resignGame(
                  gameId,
                  playerColor,
                  profile?.displayName || 'Player'
                )
              }
              disabled={game?.status !== 'active'}
              className="py-2.5 px-3 bg-rose-950/20 hover:bg-rose-950/40 disabled:opacity-40 text-rose-300 font-bold text-xs rounded-xl border border-rose-900/40 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Flag className="w-4 h-4 text-rose-400" />
              <span>Resign</span>
            </button>
          </div>

          {/* Share Game Link Button */}
          <button
            onClick={copyShareLink}
            className="w-full py-2.5 bg-[#262420] hover:bg-[#302d28] text-zinc-300 font-bold text-xs rounded-xl border border-[#3b3832] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Game Link'}</span>
          </button>
        </div>

        {/* Move History Log */}
        <div className="p-4 bg-[#1b1916] border border-[#2d2a26] rounded-2xl flex flex-col gap-2 max-h-60 overflow-y-auto">
          <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">
            Move History
          </span>
          <div className="flex flex-wrap gap-1 text-xs font-mono">
            {chess.history().map((m, idx) => (
              <span
                key={idx}
                className={`px-1.5 py-0.5 rounded ${
                  idx % 2 === 0 ? 'bg-[#262421] text-zinc-200' : 'text-zinc-400'
                }`}
              >
                {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
