'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square } from 'chess.js';
import { useRouter } from 'next/navigation';
import { ChessBoard } from '@/components/board/ChessBoard';
import { GameSyncService } from '@/lib/firebase/gameSyncService';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { LiveSyncGame, UserProfile } from '@/lib/firebase/types';
import { useAuth } from '@/context/AuthContext';
import { soundService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { GamePlayer, GameResultDetails } from '@/types/chess';
import { GameOverModal } from '@/components/game/GameOverModal';
import { MatchVersusIntro } from '@/components/game/MatchVersusIntro';
import {
  getPersistentGuestUid,
  getEffectiveUserProfile,
  isBrowserChallengeHost,
} from '@/lib/firebase/guestAuth';
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
  Bot,
  Search,
  ArrowUpDown,
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

  // Board flipping & move scroll refs
  const [userFlippedBoard, setUserFlippedBoard] = useState(false);
  const movesEndRef = useRef<HTMLDivElement | null>(null);

  // Result modal & Versus Intro states
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [showVersusIntro, setShowVersusIntro] = useState(false);
  const versusIntroShownRef = useRef(false);
  const prevGameStatusRef = useRef<LiveSyncGame['status'] | null>(null);

  // Leave confirmation modal state
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [pendingNavigationUrl, setPendingNavigationUrl] = useState<string | null>(null);

  // Authoritative identity matching
  const effectiveUid = user?.uid || getPersistentGuestUid();
  const isCreatorOfChallenge = isBrowserChallengeHost(gameId);
  const isHost =
    isCreatorOfChallenge ||
    (Boolean(effectiveUid) && game?.hostUid === effectiveUid) ||
    (Boolean(effectiveUid) && game?.whitePlayer?.uid === effectiveUid);

  const searchParamsColor =
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('color') as 'w' | 'b' | null)
      : null;
  const isExplicitBlackJoin =
    typeof window !== 'undefined' && window.location.search.includes('as=black');

  const isWhite = Boolean(game?.whitePlayer?.uid) && game?.whitePlayer?.uid === effectiveUid;
  const isBlack = Boolean(game?.blackPlayer?.uid) && game?.blackPlayer?.uid === effectiveUid;

  const playerColor: 'w' | 'b' =
    searchParamsColor ||
    (isWhite
      ? 'w'
      : isBlack
      ? 'b'
      : isExplicitBlackJoin
      ? 'b'
      : isHost
      ? game?.hostColorChoice === 'b'
        ? 'b'
        : 'w'
      : 'b');

  const isSpectator =
    !isWhite && !isBlack && game?.status === 'active' && !searchParamsColor && !isExplicitBlackJoin && !isHost;
  const isMyTurn = !isSpectator && game?.status === 'active' && game?.turn === playerColor;

  // Visual orientation: playerColor by default, or inverted if flipped
  const effectiveOrientation: 'w' | 'b' = userFlippedBoard
    ? playerColor === 'w'
      ? 'b'
      : 'w'
    : playerColor;

  const activeProfile: UserProfile = useMemo(() => {
    return getEffectiveUserProfile(user, profile);
  }, [profile, user]);

  // Elapsed search timer when waiting for an opponent to join
  const [searchElapsedSec, setSearchElapsedSec] = useState(0);
  useEffect(() => {
    if (game?.status !== 'waiting' && (!game || game.status !== 'active' || game.blackPlayer)) {
      return;
    }
    const timer = setInterval(() => {
      setSearchElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [game?.status, game?.blackPlayer]);

  // Determine what color guest would play if this is a pending challenge
  const guestAssignedColor: 'w' | 'b' = useMemo(() => {
    if (!game) return 'b';
    if (game.hostColorChoice === 'w') return 'b';
    if (game.hostColorChoice === 'b') return 'w';
    return 'b'; // default preview for random
  }, [game]);

  // 1. Join / Subscribe to live Firestore game
  useEffect(() => {
    // Join room immediately with active profile (works for logged in users and guests alike)
    GameSyncService.createOrJoinGame(gameId, activeProfile).catch(console.error);

    const unsubscribe = GameSyncService.subscribeToGame(gameId, (liveGame) => {
      setGame(liveGame);

      // Synchronize chess.js internal FEN state if different
      if (liveGame.fen && liveGame.fen !== chess.fen()) {
        try {
          chess.load(liveGame.fen);
          if (!liveGame.moves || liveGame.moves.length === 0) {
            setLastMoveSquares(null);
          } else if (liveGame.lastMove) {
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
  }, [gameId, activeProfile, chess]);

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

  // Intercept browser back-button & page exit during active gameplay
  useEffect(() => {
    if (!game || game.status !== 'active') return;

    window.history.pushState({ inLiveGame: true }, '');

    const handlePopState = () => {
      window.history.pushState({ inLiveGame: true }, '');
      setPendingNavigationUrl('/play');
      setShowLeaveConfirmation(true);
    };

    const handleBeforeUnloadPrompt = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Match in progress! Leaving will count as a forfeit or abort.';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnloadPrompt);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnloadPrompt);
    };
  }, [game?.status]);

  // Game status transition audio & modal trigger watchdog
  useEffect(() => {
    if (!game) return;

    if (prevGameStatusRef.current !== game.status) {
      if (game.status === 'completed') {
        // Keep modal closed briefly so the player sees the defeated king topple on the board!
        setIsGameOverModalOpen(false);
        if (game.winner !== 'draw') {
          soundService.playCapture();
        }

        const timer = setTimeout(() => {
          setIsGameOverModalOpen(true);
          if (game.winner === 'draw') {
            soundService.playGameEndDraw();
          } else if (game.winner === playerColor) {
            soundService.playGameEndWin();
          } else {
            soundService.playGameEndLoss();
          }
        }, 1100);
      } else if (game.status === 'active' && prevGameStatusRef.current !== 'active') {
        if (prevGameStatusRef.current === 'completed') {
          // Rematch initiated! Reset board state and re-open versus intro
          setIsGameOverModalOpen(false);
          setLastMoveSquares(null);
          versusIntroShownRef.current = false;
        }
        if (!versusIntroShownRef.current && game.whitePlayer && game.blackPlayer) {
          versusIntroShownRef.current = true;
          setShowVersusIntro(true);
        }
      }
      prevGameStatusRef.current = game.status;
    }
  }, [game?.status, game?.winner, game?.whitePlayer, game?.blackPlayer, playerColor]);

  // Auto-scroll move notation to latest move
  useEffect(() => {
    movesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chess.history().length]);

  const handleConfirmLeave = async () => {
    if (!game || game.status !== 'active') {
      setShowLeaveConfirmation(false);
      if (pendingNavigationUrl) {
        router.push(pendingNavigationUrl);
        setPendingNavigationUrl(null);
      } else {
        router.push('/play');
      }
      return;
    }

    if (game.moves.length < 2) {
      await GameSyncService.abortGame(gameId, 'Game aborted by player departure.');
    } else {
      await GameSyncService.resignGame(gameId, playerColor, user?.displayName || 'Player');
    }

    setShowLeaveConfirmation(false);

    // CRITICAL: Only redirect away if the user actually requested external navigation (e.g. back button).
    // If the player clicked in-game Resign, pendingNavigationUrl is null: DO NOT redirect them!
    // Keep them on screen so they see their GameOverModal with defeat stats, review accuracy, and rematch options.
    if (pendingNavigationUrl) {
      router.push(pendingNavigationUrl);
      setPendingNavigationUrl(null);
    }
  };

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
    if (isAcceptingChallenge) return;
    setIsAcceptingChallenge(true);
    try {
      await GameSyncService.acceptFriendChallenge(gameId, activeProfile);
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
  const handleAbortOrResign = () => {
    if (!game || game.status !== 'active') return;
    setPendingNavigationUrl(null);
    setShowLeaveConfirmation(true);
  };

  const copyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/play/live/${gameId}?as=black`;
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

  const isWaitingForOpponent = !game || game.status === 'waiting' || (game.status === 'active' && !game.blackPlayer);
  const opponent = isWhite ? game?.blackPlayer : game?.whitePlayer;
  const opponentTime = isWhite ? localBlackTime : localWhiteTime;
  const myTime = isWhite ? localWhiteTime : localBlackTime;
  const opponentDisconnected = game?.disconnectedPlayer && game.disconnectedPlayer !== playerColor;

  // Normalized Reason & Result Details for GameOverModal
  const mappedReason = useMemo((): GameResultDetails['reason'] => {
    if (!game?.winReason) return 'concluded';
    const r = game.winReason.toLowerCase();
    if (r.includes('resign')) return 'resignation';
    if (r.includes('checkmate')) return 'checkmate';
    if (r.includes('time') || r.includes('flag')) return 'timeout';
    if (r.includes('stalemate')) return 'stalemate';
    if (r.includes('insufficient')) return 'insufficient';
    if (r.includes('agreement') || r.includes('agreed') || r.includes('draw')) return 'agreement';
    if (r.includes('repetition')) return 'repetition';
    if (r.includes('50')) return '50move';
    if (r.includes('abort') || r.includes('disconnect') || r.includes('departure')) return 'abandonment';
    return 'concluded';
  }, [game?.winReason]);

  const resultDetails = useMemo((): GameResultDetails | null => {
    if (!game || game.status !== 'completed' || !game.winner) return null;
    const isWinner = game.winner === playerColor;
    const isDraw = game.winner === 'draw';
    const ratingDelta = isDraw ? 0 : isWinner ? 12 : -12;
    const currentRating = activeProfile.ratings.blitz || 1200;
    return {
      winner: game.winner,
      reason: mappedReason,
      ratingDelta,
      newRating: Math.max(100, currentRating + ratingDelta),
    };
  }, [game?.status, game?.winner, playerColor, mappedReason, activeProfile.ratings.blitz]);

  const handlePlayBotFallback = () => {
    const humanPlayer: GamePlayer = {
      id: activeProfile.uid,
      name: activeProfile.displayName,
      rating: activeProfile.ratings.blitz || 1200,
      avatar: activeProfile.avatar || '♟️',
      country: activeProfile.country || 'US',
    };
    const botPlayer: GamePlayer = {
      id: 'martin',
      name: 'Martin',
      rating: 600,
      avatar: 'https://images.chesscomfiles.com/uploads/v1/user/103233214.622b7a0c.160x160o.2a2ea1a5dca8.png',
      title: 'BOT',
      isBot: true,
    };
    const session = GameSessionStore.createSession(
      humanPlayer,
      botPlayer,
      game?.timeControlSec || 600,
      (game?.variant as any) || 'standard',
      undefined,
      game?.incrementSec || 0
    );
    router.push(`/game/${session.id}`);
  };

  const topPlayerInfo = userFlippedBoard
    ? {
        name: profile?.displayName || user?.displayName || 'You',
        rating: profile?.ratings.blitz || 1200,
        avatar: profile?.avatar || '♟️',
        colorLabel: playerColor === 'w' ? 'White ⚪' : 'Black ⚫',
        time: myTime,
        isTurn: isMyTurn,
        isWarning: myTime < 30,
        isSearching: false,
        isDisconnected: false,
      }
    : {
        name: isWaitingForOpponent
          ? 'Searching for Opponent...'
          : opponent?.name || (game?.status === 'pending_challenge' ? 'Waiting for Friend...' : 'Opponent'),
        rating: isWaitingForOpponent ? activeProfile.ratings.blitz || 1200 : opponent?.rating || 1200,
        avatar: opponent?.avatar || '♟️',
        colorLabel: playerColor === 'w' ? 'Black ⚫' : 'White ⚪',
        time: opponentTime,
        isTurn: game?.turn !== playerColor && game?.status === 'active',
        isWarning: opponentTime < 30,
        isSearching: isWaitingForOpponent,
        isDisconnected: Boolean(opponentDisconnected),
      };

  const bottomPlayerInfo = userFlippedBoard
    ? {
        name: isWaitingForOpponent
          ? 'Searching for Opponent...'
          : opponent?.name || (game?.status === 'pending_challenge' ? 'Waiting for Friend...' : 'Opponent'),
        rating: isWaitingForOpponent ? activeProfile.ratings.blitz || 1200 : opponent?.rating || 1200,
        avatar: opponent?.avatar || '♟️',
        colorLabel: playerColor === 'w' ? 'Black ⚫' : 'White ⚪',
        time: opponentTime,
        isTurn: game?.turn !== playerColor && game?.status === 'active',
        isWarning: opponentTime < 30,
        isSearching: isWaitingForOpponent,
        isDisconnected: Boolean(opponentDisconnected),
      }
    : {
        name: profile?.displayName || user?.displayName || 'You',
        rating: profile?.ratings.blitz || 1200,
        avatar: profile?.avatar || '♟️',
        colorLabel: playerColor === 'w' ? 'White ⚪' : 'Black ⚫',
        time: myTime,
        isTurn: isMyTurn,
        isWarning: myTime < 30,
        isSearching: false,
        isDisconnected: false,
      };

  return (
    <div className="w-full h-full max-w-6xl mx-auto flex flex-col xl:flex-row items-center xl:items-start justify-center p-2 sm:p-4 xl:p-6 gap-4 xl:gap-6 select-none overflow-y-auto xl:overflow-hidden pb-24 xl:pb-6">
      {/* ========================================================================= */}
      {/* 1. CHESSBOARD & PLAYER HUD COLUMN                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col items-center justify-start min-h-0 w-full max-w-[min(calc(100vw-2rem),calc(100dvh-180px),520px)] xl:w-[min(calc(100vw-24rem),calc(100dvh-180px),520px)] shrink-0">
        {/* Top Player Card & Clock */}
        <div className="w-full px-3 py-1.5 mb-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-zinc-800/90 border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden">
              {topPlayerInfo.isSearching ? (
                <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Search className="w-4 h-4 animate-pulse" />
                </div>
              ) : topPlayerInfo.avatar && topPlayerInfo.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={topPlayerInfo.avatar} alt={topPlayerInfo.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span>{topPlayerInfo.avatar || '♟️'}</span>
              )}
              {topPlayerInfo.isSearching ? (
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              ) : topPlayerInfo.isDisconnected ? (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
              ) : (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {topPlayerInfo.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({topPlayerInfo.rating})
                </span>
              </div>
              <span className="text-[10px]">
                {topPlayerInfo.isSearching ? (
                  <span className="text-amber-400/90 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                    Waiting for player...
                  </span>
                ) : topPlayerInfo.isDisconnected ? (
                  <span className="text-rose-400 font-bold">Disconnected ({disconnectCountdown}s)</span>
                ) : (
                  <span className="text-zinc-400">{topPlayerInfo.colorLabel}</span>
                )}
              </span>
            </div>
          </div>

          {/* Top Digital Clock */}
          <div className="flex items-center gap-2 shrink-0">
            {game?.status === 'active' && firstMoveCountdown !== null && topPlayerInfo.isTurn && (
              <span className="text-[10px] font-mono text-amber-400/90 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 hidden sm:inline-block">
                Move 1: {firstMoveCountdown}s
              </span>
            )}
            <div
              className={`px-3 py-1 rounded-lg font-mono text-base sm:text-lg font-black border transition-all ${
                topPlayerInfo.isSearching
                  ? 'bg-[#181714] border-white/5 text-zinc-500'
                  : topPlayerInfo.isTurn
                  ? topPlayerInfo.isWarning
                    ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                    : 'bg-[#292621] border-amber-500/50 text-white shadow-sm'
                  : 'bg-[#181714] border-white/5 text-zinc-400'
              }`}
            >
              {formatTime(topPlayerInfo.time)}
            </div>
          </div>
        </div>

        {/* Viewport-scaling Chessboard */}
        <div className="w-full aspect-square relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
          <ChessBoard
            chess={chess}
            orientation={effectiveOrientation}
            onMove={handleMove}
            disabled={!isMyTurn}
            lastMove={lastMoveSquares}
            defeatedColor={
              game?.status === 'completed'
                ? game.winner === 'w'
                  ? 'b'
                  : game.winner === 'b'
                  ? 'w'
                  : null
                : null
            }
          />

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY: WAITING FOR OPPONENT / MATCHMAKING RADAR HUD              */}
          {/* ----------------------------------------------------------------- */}
          {isWaitingForOpponent && game?.status !== 'pending_challenge' && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-5 text-center gap-3.5 z-20 animate-in fade-in">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-16 h-16 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg relative z-10">
                  <Swords className="w-7 h-7 text-emerald-400 animate-pulse" />
                </div>
              </div>

              <div className="flex flex-col gap-1 max-w-xs">
                <h3 className="text-base sm:text-lg font-black text-white">Searching for Opponent</h3>
                <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-emerald-400 font-bold">
                  <span>Elapsed: {Math.floor(searchElapsedSec / 60)}:{(searchElapsedSec % 60).toString().padStart(2, '0')}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-400 leading-snug mt-0.5">
                  Looking for an opponent in the matchmaking pool. Share your link with a friend or switch to a bot match!
                </p>
                <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center gap-2 text-xs font-mono text-zinc-300 mt-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{Math.floor((game?.timeControlSec || 600) / 60)} min {game?.incrementSec ? `+${game.incrementSec}s` : ''}</span>
                  <span>&bull;</span>
                  <span>{game?.variant || 'Standard'}</span>
                </div>
              </div>

              {/* Direct friend link sharing ONLY for the host */}
              {isHost && (
                <div className="flex flex-col gap-2 w-full max-w-xs mt-1">
                  <Button
                    variant="primary"
                    size="md"
                    rounded="xl"
                    fullWidth
                    onClick={copyShareLink}
                  >
                    {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    <span>{copiedLink ? 'Challenge Link Copied!' : 'Copy Link for Friend'}</span>
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2 w-full max-w-xs">
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    className="flex-1"
                    onClick={handlePlayBotFallback}
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Play Bot</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    className="flex-1"
                    onClick={() => router.push('/play')}
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cancel</span>
                  </Button>
                </div>
              </div>
          )}

          {/* ----------------------------------------------------------------- */}
          {/* OVERLAY A: PENDING CHALLENGE (HOST WAITING ROOM)                   */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'pending_challenge' && isHost && (
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center gap-4 z-20 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center animate-pulse">
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

              <div className="flex flex-col gap-2 w-full max-w-xs">
                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  fullWidth
                  onClick={copyShareLink}
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Challenge Link Copied!' : 'Copy Challenge Link'}</span>
                </Button>
                <div className="flex items-center gap-2 w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    className="flex-1"
                    onClick={handlePlayBotFallback}
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Play Bot</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    rounded="xl"
                    className="flex-1"
                    onClick={() => router.push('/play')}
                  >
                    <X className="w-3.5 h-3.5 text-rose-400" />
                    <span>Cancel</span>
                  </Button>
                </div>
              </div>
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
          {/* FLOATING INSPECT/REOPEN RESULT BUTTON WHEN MODAL IS CLOSED       */}
          {/* ----------------------------------------------------------------- */}
          {game?.status === 'completed' && !isGameOverModalOpen && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 pointer-events-auto">
              <Button
                variant="primary"
                size="sm"
                rounded="xl"
                onClick={() => setIsGameOverModalOpen(true)}
                className="shadow-2xl border border-white/20 px-4 py-1.5 font-black text-xs flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white cursor-pointer"
              >
                <Award className="w-4 h-4" />
                <span>View Match Result</span>
              </Button>
            </div>
          )}
        </div>

        {/* Bottom Player Card & Clock */}
        <div className="w-full px-3 py-1.5 mt-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-sm shrink-0 overflow-hidden">
              {bottomPlayerInfo.isSearching ? (
                <div className="w-full h-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <Search className="w-4 h-4 animate-pulse" />
                </div>
              ) : bottomPlayerInfo.avatar && bottomPlayerInfo.avatar.startsWith('http') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={bottomPlayerInfo.avatar} alt={bottomPlayerInfo.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                <span>{bottomPlayerInfo.avatar || '♟️'}</span>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  {bottomPlayerInfo.name}
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  ({bottomPlayerInfo.rating})
                </span>
              </div>
              <span className="text-[10px] text-zinc-400">
                Playing as {bottomPlayerInfo.colorLabel}
              </span>
            </div>
          </div>

          {/* Bottom Digital Clock */}
          <div className="flex items-center gap-2 shrink-0">
            {game?.status === 'active' && firstMoveCountdown !== null && bottomPlayerInfo.isTurn && (
              <span className="text-[10px] font-mono text-amber-400/90 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 hidden sm:inline-block">
                Move 1: {firstMoveCountdown}s
              </span>
            )}
            <div
              className={`px-3 py-1 rounded-lg font-mono text-base sm:text-lg font-black border transition-all ${
                bottomPlayerInfo.isSearching
                  ? 'bg-[#181714] border-white/5 text-zinc-500'
                  : bottomPlayerInfo.isTurn
                  ? bottomPlayerInfo.isWarning
                    ? 'bg-rose-950/40 border-rose-600 text-rose-300 animate-pulse'
                    : 'bg-[#292621] border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-[#181714] border-white/5 text-zinc-400'
              }`}
            >
              {formatTime(bottomPlayerInfo.time)}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MATCH ACTIONS & NOTATION COLUMN                                        */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[min(calc(100vw-2rem),calc(100dvh-180px),520px)] lg:max-w-none lg:w-80 xl:w-88 flex flex-col gap-3 shrink-0">
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

          {/* If waiting for opponent, show an interactive matchmaking status card */}
          {isWaitingForOpponent && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  {isHost ? 'Matchmaking Queue' : 'Connecting to Room'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  {Math.floor(searchElapsedSec / 60)}:{(searchElapsedSec % 60).toString().padStart(2, '0')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                {isHost
                  ? 'Waiting for an opponent to join. You can share your link or jump into a bot match.'
                  : 'Connected to live room. Waiting for host and match to start...'}
              </p>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={handlePlayBotFallback}
                  className="flex-1"
                >
                  <Bot className="w-3 h-3 text-amber-400" />
                  <span>Play Bot</span>
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={() => router.push('/play')}
                  className="flex-1"
                >
                  <X className="w-3 h-3 text-rose-400" />
                  <span>Cancel</span>
                </Button>
              </div>
            </div>
          )}

          {/* Pending Draw Offer Alert (Received) */}
          {game?.drawOfferFrom && game.drawOfferFrom !== playerColor && game?.status === 'active' && (
            <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl flex flex-col gap-1.5 animate-in fade-in">
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

          {/* Pending Draw Offer (Sent by You) */}
          {game?.drawOfferFrom === playerColor && game?.status === 'active' && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between animate-in fade-in">
              <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Draw offer sent...
              </span>
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                onClick={() => GameSyncService.respondToDrawOffer(gameId, false)}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Incoming Rematch Offer Alert */}
          {game?.rematchRequestedBy && game.rematchRequestedBy !== playerColor && game?.status === 'completed' && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl flex flex-col gap-2 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  Rematch Offered!
                </span>
                <span className="text-[10px] font-mono text-emerald-300 font-bold">Swap Colors</span>
              </div>
              <p className="text-[11px] text-zinc-300">Opponent wants to play again. Accept rematch?</p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="xs"
                  rounded="lg"
                  onClick={() => GameSyncService.acceptRematch(gameId, true)}
                  className="flex-1"
                >
                  Accept Rematch
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={() => GameSyncService.declineRematch(gameId)}
                  className="flex-1"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {/* Pending Rematch Offer (Sent by You) */}
          {game?.rematchRequestedBy === playerColor && game?.status === 'completed' && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-center justify-between animate-in fade-in">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Rematch offer sent...
              </span>
              <Button
                variant="secondary"
                size="xs"
                rounded="lg"
                onClick={() => GameSyncService.declineRematch(gameId)}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Completed Match Action Hub (Rematch / Review) */}
          {game?.status === 'completed' && !game?.rematchRequestedBy && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="sm"
                rounded="xl"
                onClick={() => GameSyncService.requestRematch(gameId, playerColor)}
                className="flex items-center justify-center gap-1.5 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rematch</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                onClick={() => router.push(`/game/review/${gameId}`)}
                className="flex items-center justify-center gap-1.5 font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Review</span>
              </Button>
            </div>
          )}

          {/* In-Game Actions: Draw, Abort (before move 2) / Resign, Flip Board */}
          {game?.status === 'active' && (
            <div className="flex flex-col gap-2">
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
                      <span>{firstMoveCountdown !== null ? `Abort (${firstMoveCountdown}s)` : 'Abort'}</span>
                    </>
                  ) : (
                    <>
                      <Flag className="w-3.5 h-3.5" />
                      <span>Resign</span>
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="secondary"
                size="sm"
                rounded="xl"
                fullWidth
                onClick={() => setUserFlippedBoard((prev) => !prev)}
                className="text-xs text-zinc-300"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{userFlippedBoard ? 'Reset Board View' : 'Flip Board View'}</span>
              </Button>
            </div>
          )}

          {/* Share Game Link ONLY for Host when waiting for opponent to join */}
          {isHost && isWaitingForOpponent && game?.status === 'waiting' && (
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
          )}
        </div>

        {/* Real-time Move Notation */}
        <div className="p-3 bg-[#1c1a17] border border-white/5 rounded-2xl flex flex-col gap-2 flex-1 min-h-[140px] max-h-56 overflow-hidden shadow-xl">
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
            <div ref={movesEndRef} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEAVE / EXIT / RESIGN CONFIRMATION MODAL                                  */}
      {/* ========================================================================= */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c1a17] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-white">
                {game && game.moves.length < 2 ? 'Abort Match?' : 'Resign Match?'}
              </h3>
              <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                {game && game.moves.length < 2
                  ? 'The match is on Move 1. Leaving or aborting now ends the game with NO loss of rating points.'
                  : 'The game is currently active. Leaving now counts as a formal resignation and will affect your rating.'}
              </p>
            </div>

            <div className="flex gap-2 mt-1">
              <Button
                variant="secondary"
                size="md"
                rounded="xl"
                fullWidth
                onClick={() => {
                  setShowLeaveConfirmation(false);
                  setPendingNavigationUrl(null);
                }}
              >
                <span>Stay in Game</span>
              </Button>

              <Button
                variant={game && game.moves.length < 2 ? 'primary' : 'destructive'}
                size="md"
                rounded="xl"
                fullWidth
                onClick={handleConfirmLeave}
              >
                <span>{game && game.moves.length < 2 ? 'Abort Match' : 'Resign Match'}</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FIGHTING GAME STYLE MATCH INTRO SPLASH                                */}
      {/* ========================================================================= */}
      {game?.whitePlayer && game?.blackPlayer && (
        <MatchVersusIntro
          isOpen={showVersusIntro}
          onComplete={() => setShowVersusIntro(false)}
          whitePlayer={{
            name: game.whitePlayer.name || 'White',
            avatar: game.whitePlayer.avatar,
            rating: game.whitePlayer.rating,
            title: game.whitePlayer.title,
            country: game.whitePlayer.country,
          }}
          blackPlayer={{
            name: game.blackPlayer.name || 'Black',
            avatar: game.blackPlayer.avatar,
            rating: game.blackPlayer.rating,
            title: game.blackPlayer.title,
            country: game.blackPlayer.country,
          }}
          gameFormat={`${Math.floor((game.timeControlSec || 600) / 60)}m ${game.incrementSec ? `+${game.incrementSec}s` : ''} • Live Arena`}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. HIGH-ELEVATION GAME OVER MODAL (z-[100] OUTSIDE BOARD PIECES)          */}
      {/* ========================================================================= */}
      {resultDetails && (
        <GameOverModal
          isOpen={isGameOverModalOpen && game?.status === 'completed'}
          onClose={() => setIsGameOverModalOpen(false)}
          result={resultDetails}
          whitePlayer={{
            id: game?.whitePlayer?.uid || 'w',
            name: game?.whitePlayer?.name || 'White',
            rating: game?.whitePlayer?.rating || 1200,
            avatar: game?.whitePlayer?.avatar || '♟️',
            country: game?.whitePlayer?.country || 'US',
          }}
          blackPlayer={{
            id: game?.blackPlayer?.uid || 'b',
            name: game?.blackPlayer?.name || 'Black',
            rating: game?.blackPlayer?.rating || 1200,
            avatar: game?.blackPlayer?.avatar || '♟️',
            country: game?.blackPlayer?.country || 'US',
          }}
          userColor={playerColor}
          onReviewGame={() => router.push(`/game/review/${gameId}`)}
          onRematch={() => {
            if (game?.rematchRequestedBy && game.rematchRequestedBy !== playerColor) {
              GameSyncService.acceptRematch(gameId, true);
            } else {
              GameSyncService.requestRematch(gameId, playerColor);
            }
          }}
          onNewGame={() => router.push('/play')}
        />
      )}
    </div>
  );
};
