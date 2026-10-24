'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { useRouter } from 'next/navigation';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GameSyncService } from '@/lib/firebase/gameSyncService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { LiveSyncGame } from '@/lib/firebase/types';
import { useAuth } from '@/context/AuthContext';
import { soundService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';
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
  ShieldAlert,
  ShieldCheck,
  X,
  Play,
  Swords,
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
  const [firstMoveCountdown, setFirstMoveCountdown] = useState<number | null>(null);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [isAcceptingChallenge, setIsAcceptingChallenge] = useState(false);

  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimestampRef = useRef<number>(Date.now());

  // Determine current player color ('w' or 'b' or 'spectator')
  const myUid = user?.uid;
  const isHost = game?.hostUid ? game.hostUid === myUid : game?.whitePlayer.uid === myUid;
  const isWhite = game?.whitePlayer.uid === myUid;
  const isBlack = game?.blackPlayer?.uid === myUid;
  const playerColor: 'w' | 'b' = isWhite ? 'w' : isBlack ? 'b' : 'w';
  const isSpectator = !isWhite && !isBlack && game?.status === 'active';
  const isMyTurn = !isSpectator && game?.status === 'active' && game?.turn === playerColor;

  // Determine what color guest would play if this is a pending challenge
  const guestAssignedColor: 'w' | 'b' = useMemo(() => {
    if (!game) return 'b';
    if (game.hostColorChoice === 'w') return 'b';
    if (game.hostColorChoice === 'b') return 'w';
    return 'b'; // default preview for random
  }, [game]);

  // 1. Join / Subscribe to live Firestore game
  useEffect(() => {
    if (!user) return;

    // Join room if standard live room
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
    });

    return () => {
      unsubscribe();
    };
  }, [gameId, user, profile, chess]);

  // 2. High-precision Clock Engine & First-Move Auto-Abort Watchdog
  useEffect(() => {
    if (!game || game.status !== 'active') {
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
      return;
    }

    clockIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const deltaSec = (now - lastSyncTimestampRef.current) / 1000;
      lastSyncTimestampRef.current = now;

      // Clock countdown based on whose turn it is
      // WHITE'S CLOCK TICKS IMMEDIATELY AS SOON AS MATCH IS ACTIVE!
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

      // FIRST-MOVE AUTO-ABORT WATCHDOG (30s rule)
      if (game.moves.length === 0) {
        // White must make move 1 within 30 seconds
        const deadline = game.firstMoveDeadline || (game.startedAt ? game.startedAt + 30000 : now + 30000);
        const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
        setFirstMoveCountdown(remaining);

        if (remaining === 0 && isWhite) {
          GameSyncService.abortGame(gameId, 'Game auto-aborted — White failed to make move 1 in time.');
        }
      } else if (game.moves.length === 1) {
        // Black must make move 1 within 30 seconds
        const whiteMoveTime = game.moves[0].timestamp || now;
        const deadline = whiteMoveTime + 30000;
        const remaining = Math.max(0, Math.ceil((deadline - now) / 1000));
        setFirstMoveCountdown(remaining);

        if (remaining === 0 && isBlack) {
          GameSyncService.abortGame(gameId, 'Game auto-aborted — Black failed to make move 1 in time.');
        }
      } else {
        setFirstMoveCountdown(null);
      }

      // Disconnect grace timer check
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
        } else if (chess.isDraw()) {
          let reason = 'Draw';
          if (chess.isStalemate()) reason = 'Stalemate';
          if (chess.isThreefoldRepetition()) reason = 'Draw by 3-fold repetition';
          if (chess.isInsufficientMaterial()) reason = 'Draw by insufficient material';
          soundService.playGameEndDraw();
          await GameSyncService.finishGame(gameId, 'draw', reason);
        }
      } catch (err) {
        console.warn('Illegal move attempted:', err);
      }
    },
    [isMyTurn, game, chess, playerColor, localWhiteTime, localBlackTime, gameId]
  );

  // 5. Handle Challenge Acceptance
  const handleAcceptChallenge = async () => {
    if (!user || isAcceptingChallenge) return;
    setIsAcceptingChallenge(true);
    try {
      const guestProfile = profile || {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Challenger',
        avatar: '♟️',
        tier: 'free' as const,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isAnonymous: user.isAnonymous,
        ratings: { rapid: 1200, blitz: 1200, bullet: 1200, daily: 1200, puzzles: 1500, puzzleRush: 0 },
        stats: { gamesPlayed: 0, wins: 0, losses: 0, draws: 0, winStreak: 0 },
      };

      await GameSyncService.acceptFriendChallenge(gameId, guestProfile);
      soundService.playGameStart();
    } catch (err) {
      console.error('Failed to accept challenge:', err);
    } finally {
      setIsAcceptingChallenge(false);
    }
  };

  // 6. Handle Challenge Decline
  const handleDeclineChallenge = async () => {
    await GameSyncService.declineFriendChallenge(gameId);
    router.push('/play');
  };

  // 7. Handle Early Abort vs Resign
  const handleAbortOrResign = async () => {
    if (!game) return;
    const movesCount = game.moves.length;

    if (movesCount < 2) {
      // Game Abort without rating penalty
      const who = playerColor === 'w' ? 'White' : 'Black';
      await GameSyncService.abortGame(gameId, `Match aborted by ${who} before move 2.`);
    } else {
      // Resignation
      await GameSyncService.resignGame(gameId, playerColor, user?.displayName || 'Player');
    }
  };

  const copyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/play/live/${gameId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    soundService.playMove();
    setTimeout(() => setCopiedLink(false), 2500);
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
    <div className="w-full h-full max-h-full overflow-hidden flex flex-col xl:flex-row items-center justify-center p-3 sm:p-5 lg:p-6 bg-[#161512] text-zinc-100 gap-4 sm:gap-6 select-none">
      {/* ========================================================================= */}
      {/* 1. CHESSBOARD & PLAYER HUD COLUMN                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-center h-full max-h-full min-h-0 w-full xl:w-auto">
        {/* Opponent Card & Clock */}
        <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-sm shrink-0">
              {opponent?.avatar && opponent.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={opponent.avatar} alt="Opponent" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span>{opponent?.avatar || '♟️'}</span>
              )}
              {opponentDisconnected ? (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              ) : (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {opponent?.name || (game?.status === 'pending_challenge' ? 'Waiting for Friend...' : 'Searching...')}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">({opponent?.rating || 1200})</span>
              </div>
              <span className="text-[10px] text-zinc-400">
                {opponentDisconnected ? (
                  <span className="text-rose-400 font-bold">Disconnected ({disconnectCountdown}s)</span>
                ) : (
                  <span>Online</span>
                )}
              </span>
            </div>
          </div>

          {/* Opponent Digital Clock */}
          <div
            className={`px-3 py-1 rounded-lg font-mono text-base sm:text-lg font-black border transition-all ${
              game?.turn !== playerColor && game?.status === 'active'
                ? opponentTime < 30
                  ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-[#292621] border-amber-500/50 text-white shadow-sm'
                : 'bg-[#181714] border-white/5 text-zinc-400'
            }`}
          >
            {formatTime(opponentTime)}
          </div>
        </div>

        {/* First-Move Auto-Abort Notice Banner */}
        {game?.status === 'active' && firstMoveCountdown !== null && (
          <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1 mb-1 bg-amber-500/15 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300 shrink-0 animate-pulse">
            <div className="flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold">
                Move 1 required in: <strong>{firstMoveCountdown}s</strong> (auto-aborts if missed)
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-zinc-400">No rating loss</span>
          </div>
        )}

        {/* Viewport-scaling Chessboard */}
        <div className="w-[min(100%,calc(100vh-230px),560px)] aspect-square relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
          <ChessBoard
            chess={chess}
            orientation={playerColor}
            onMove={handleMove}
            disabled={!isMyTurn}
            lastMove={lastMoveSquares}
          />

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY A: PENDING CHALLENGE (HOST WAITING ROOM)                   */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'pending_challenge' && isHost && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-4 z-20 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-[#81b64c]/20 border border-[#81b64c]/40 text-[#81b64c] flex items-center justify-center animate-pulse">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 max-w-sm">
                <h3 className="text-base font-black text-white">Friend Challenge Ready</h3>
                <p className="text-xs text-zinc-400 leading-snug">
                  Send this link to your friend. As soon as they open the link and accept, the match will begin and White&apos;s clock will start immediately!
                </p>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2 text-xs font-mono text-zinc-300 mt-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{Math.floor((game.timeControlSec || 600) / 60)} min</span>
                  <span>&bull;</span>
                  <span>{game.variant || 'Standard'}</span>
                </div>
              </div>
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                onClick={copyShareLink}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Challenge Link Copied!' : 'Copy Challenge Link'}</span>
              </Button>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY B: PENDING CHALLENGE (GUEST APPROVAL CARD)                 */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'pending_challenge' && !isHost && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-4 z-20 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <Swords className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 max-w-xs">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  Live Challenge Request
                </span>
                <h3 className="text-lg font-black text-white">
                  {game.hostName || 'A Player'} challenged you!
                </h3>
                <p className="text-xs text-zinc-400 leading-snug">
                  Rating: <strong className="text-white">{game.hostRating || 1200}</strong> &bull; Format:{' '}
                  <strong className="text-white">{Math.floor((game.timeControlSec || 600) / 60)} min</strong>{' '}
                  ({game.variant || 'Standard'}).
                </p>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-300 mt-1">
                  You will play as: <strong className="text-white">{guestAssignedColor === 'w' ? 'White ⚪' : 'Black ⚫'}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full max-w-xs mt-2">
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  fullWidth
                  onClick={handleAcceptChallenge}
                  disabled={isAcceptingChallenge}
                >
                  <Play className="w-4 h-4" />
                  <span>{isAcceptingChallenge ? 'Starting...' : 'Accept & Play'}</span>
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  rounded="xl"
                  onClick={handleDeclineChallenge}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY C: MATCH ABORTED MODAL                                    */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'aborted' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3 z-20 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white">Match Aborted</h3>
              <p className="text-xs text-zinc-300 max-w-xs">{game.winReason}</p>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
                ✓ No rating points were affected
              </span>
              <Button
                variant="primary"
                size="sm"
                rounded="xl"
                onClick={() => router.push('/play')}
                className="mt-2"
              >
                <span>Return to Play Hub</span>
              </Button>
            </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY D: GAME OVER (VICTORY / DEFEAT)                            */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'completed' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-3 z-20 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-[#81b64c]/20 border border-[#81b64c]/40 text-[#81b64c] flex items-center justify-center">
                <Award className="w-6 h-6" />
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

              <div className="flex gap-2 mt-2">
                <Button
                  variant="primary"
                  size="sm"
                  rounded="xl"
                  onClick={() => router.push(`/game/review/${gameId}`)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Review Accuracy</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  rounded="xl"
                  onClick={() => router.push('/play')}
                >
                  <span>Play Again</span>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* You (Bottom Player Card & Clock) */}
        <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mt-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-sm shrink-0">
              {profile?.avatar && profile.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar} alt="You" className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span>{profile?.avatar || '♟️'}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {profile?.displayName || user?.displayName || 'You'}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({profile?.ratings.blitz || 1200})
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Playing as {playerColor === 'w' ? 'White ⚪' : 'Black ⚫'}
              </span>
            </div>
          </div>

          {/* Your Digital Clock */}
          <div
            className={`px-3 py-1 rounded-lg font-mono text-base sm:text-lg font-black border transition-all ${
              isMyTurn
                ? myTime < 30
                  ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-[#292621] border-[#81b64c] text-white shadow-sm'
                : 'bg-[#181714] border-white/5 text-zinc-400'
            }`}
          >
            {formatTime(myTime)}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MATCH ACTIONS & NOTATION COLUMN                                        */}
      {/* ========================================================================= */}
      <div className="w-full xl:w-80 flex flex-col gap-3 shrink-0 max-h-full">
        {/* Match Action Hub */}
        <div className="p-4 bg-[#1c1a17] border border-white/5 rounded-2xl flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider">
                Live Match Hub
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-zinc-400">
              {Math.floor((game?.timeControlSec || 600) / 60)}m {game?.incrementSec ? `+${game.incrementSec}s` : ''}
            </span>
          </div>

          {/* Pending Draw Offer Alert */}
          {game?.drawOfferFrom && game.drawOfferFrom !== playerColor && (
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex flex-col gap-1.5">
              <span className="text-xs font-bold text-amber-300">
                Opponent offered a draw. Accept?
              </span>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="xs"
                  rounded="lg"
                  onClick={() => GameSyncService.respondToDrawOffer(gameId, true)}
                  className="flex-1"
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={() => GameSyncService.respondToDrawOffer(gameId, false)}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* In-Game Actions: Draw, Abort (before move 2) / Resign */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              size="sm"
              rounded="xl"
              onClick={() => GameSyncService.offerDraw(gameId, playerColor)}
              disabled={game?.status !== 'active' || !!game.drawOfferFrom}
            >
              <Handshake className="w-3.5 h-3.5 text-amber-400" />
              <span>Draw</span>
            </Button>

            <Button
              variant="destructive"
              size="sm"
              rounded="xl"
              onClick={handleAbortOrResign}
              disabled={game?.status !== 'active'}
            >
              {game && game.moves.length < 2 ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Abort</span>
                </>
              ) : (
                <>
                  <Flag className="w-3.5 h-3.5" />
                  <span>Resign</span>
                </>
              )}
            </Button>
          </div>

          {/* Share Game Link */}
          <Button
            variant="secondary"
            size="sm"
            rounded="xl"
            fullWidth
            onClick={copyShareLink}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Game Link'}</span>
          </Button>
        </div>

        {/* Real-time Move Notation */}
        <div className="p-3 bg-[#1c1a17] border border-white/5 rounded-2xl flex flex-col gap-2 flex-1 min-h-[140px] max-h-56 overflow-hidden">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">
            Move Notation ({chess.history().length} Plies)
          </span>
          <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#141311] rounded-xl border border-white/5 flex flex-wrap gap-1 text-xs font-mono">
            {chess.history().length === 0 ? (
              <span className="text-zinc-600 italic text-[11px]">Match starting...</span>
            ) : (
              chess.history().map((m, idx) => (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded ${
                    idx % 2 === 0 ? 'bg-white/5 text-zinc-200' : 'text-zinc-400'
                  }`}
                >
                  {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ''}
                  {m}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
