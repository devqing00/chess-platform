'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, use } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import {
  PieceColor,
  PieceType,
  MoveRecord,
  GamePlayer,
  ChessVariant,
  GameResultDetails,
} from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { generateBotMove, calculateBotThinkingDelayMs } from '@/lib/botEngine';
import { ChessEvaluator } from '@/lib/chessEngine';
import { soundService } from '@/lib/audioService';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { FirestoreService } from '@/lib/firebase/firestoreService';
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useRouter } from 'next/navigation';
import { XpSystem, type XpAction } from '@/lib/xpSystem';

// Components
import { ChessBoard } from '@/components/board/ChessBoard';
import { PlayerCard } from '@/components/game/PlayerCard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { MobileBottomBar } from '@/components/game/MobileBottomBar';
import { GameOverModal } from '@/components/game/GameOverModal';
import { MatchVersusIntro } from '@/components/game/MatchVersusIntro';
import { Button } from '@/components/ui/button';

import {
  RotateCcw,
  Flag,
  Handshake,
  ArrowUpDown,
  Award,
  ArrowLeft,
  MessageSquare,
  Send,
  Bot as BotIcon,
  X,
  ListOrdered,
  MoreVertical,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GameRoomPage({ params }: GamePageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const {
    boardTheme,
    pieceTheme,
    moveInputMode,
    soundEnabled,
    setSoundEnabled,
    openSettings,
  } = useShell();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  // Session & Board State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [variant, setVariant] = useState<ChessVariant>('standard');
  const [timeControl, setTimeControl] = useState<number>(600);
  const [incrementSeconds, setIncrementSeconds] = useState<number>(0);

  // Players
  const [whitePlayer, setWhitePlayer] = useState<GamePlayer>({
    id: 'player-1',
    name: 'You',
    rating: 1250,
    avatar: '🧑‍💻',
    country: 'US',
  });
  const [blackPlayer, setBlackPlayer] = useState<GamePlayer>({
    id: 'martin',
    name: 'Martin',
    rating: 250,
    avatar: '👨‍👧',
    isBot: true,
  });

  // Moves & Clocks
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const moveHistoryRef = useRef<MoveRecord[]>([]);
  useEffect(() => {
    moveHistoryRef.current = moveHistory;
  }, [moveHistory]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [resultDetails, setResultDetails] = useState<GameResultDetails | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [hasSeenGameOverModal, setHasSeenGameOverModal] = useState(false);
  const [isResignModalOpen, setIsResignModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showVersusIntro, setShowVersusIntro] = useState(false);
  const versusIntroShownRef = useRef(false);

  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);

  // Bot & Chat States
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; isBot?: boolean }[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [botMessage, setBotMessage] = useState<string>('');
  const [undosUsed, setUndosUsed] = useState<number>(0);
  const [earnedBotStars, setEarnedBotStars] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'moves' | 'chat'>('moves');
  const [hasUnreadChat, setHasUnreadChat] = useState<boolean>(false);

  // 1. Initialize from Session Store
  useEffect(() => {
    let session = GameSessionStore.getSession(gameId);
    if (!session) {
      const defaultWhite: GamePlayer = {
        id: 'player-you',
        name: 'You',
        rating: 1250,
        avatar: '🧑‍💻',
        country: 'US',
      };
      const defaultBlack: GamePlayer = {
        id: 'martin',
        name: 'Martin',
        rating: 250,
        avatar: '👨‍👧',
        isBot: true,
      };
      session = GameSessionStore.createSession(defaultWhite, defaultBlack, 600, 'standard', gameId);
    }

    if (session) {
      setWhitePlayer(session.whitePlayer);
      setBlackPlayer(session.blackPlayer);
      setVariant(session.variant);
      setTimeControl(session.timeControl);
      setIncrementSeconds(session.incrementSeconds || 0);
      setWhiteTime(session.timeControl);
      setBlackTime(session.timeControl);

      // Start White's clock immediately once game is initialized across all modes (Pass & Play, vs Bot, etc.)
      if (session.timeControl > 0 && !session.isGameOver) {
        setIsClockRunning(true);
      }

      if (session.moves && session.moves.length > 0) {
        setMoveHistory(session.moves);
        setCurrentMoveIndex(session.moves.length - 1);
        const lastFen = session.moves[session.moves.length - 1].fenAfter;
        try {
          const restored = new Chess(lastFen);
          setChess(restored);
        } catch {
          //
        }
      }

      if (session.isGameOver && session.gameResult) {
        setGameResult(session.gameResult);
        setResultDetails(session.resultDetails || null);
      }

      // Orientation matches human player
      if (session.blackPlayer.id.includes('you') || !session.blackPlayer.isBot && session.whitePlayer.isBot) {
        setOrientation('b');
      } else {
        setOrientation('w');
      }

      // Trigger Fighting Game Style Intro on new game start
      if (!session.isGameOver && (!session.moves || session.moves.length === 0) && !versusIntroShownRef.current) {
        versusIntroShownRef.current = true;
        setShowVersusIntro(true);
      }

      // Initial bot welcome quote
      const bot = CHESS_BOTS.find((b) => b.id === session!.blackPlayer.id || b.id === session!.whitePlayer.id);
      if (bot && bot.quotes.gameStart?.length) {
        const welcome = bot.quotes.gameStart[Math.floor(Math.random() * bot.quotes.gameStart.length)];
        setBotMessage(welcome);
        setChatMessages([{ sender: bot.name, text: welcome, isBot: true }]);
      }
    }
  }, [gameId]);

  const botPlayer = useMemo(() => {
    return whitePlayer.isBot ? whitePlayer : blackPlayer.isBot ? blackPlayer : null;
  }, [whitePlayer, blackPlayer]);

  const currentBotObj = useMemo(() => {
    if (!botPlayer) return null;
    return CHESS_BOTS.find((b) => b.id === botPlayer.id) || null;
  }, [botPlayer]);

  const userColor: PieceColor = useMemo(() => {
    if (whitePlayer.isBot && !blackPlayer.isBot) return 'b';
    return 'w';
  }, [whitePlayer, blackPlayer]);

  // Material & Capture Counters
  const { whiteCaptures, blackCaptures, materialDiff } = useMemo(() => {
    const STARTING_PIECES: Record<PieceType, number> = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1,
    };
    const PIECE_VALUES: Record<PieceType, number> = {
      p: 1,
      n: 3,
      b: 3,
      r: 5,
      q: 9,
      k: 0,
    };

    const board = chess.board();
    const currentCounts: Record<PieceColor, Record<PieceType, number>> = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    board.forEach((row) => {
      row.forEach((piece) => {
        if (piece) {
          currentCounts[piece.color as PieceColor][piece.type as PieceType]++;
        }
      });
    });

    const wCaps: PieceType[] = [];
    const bCaps: PieceType[] = [];
    let wScore = 0;
    let bScore = 0;

    (['q', 'r', 'b', 'n', 'p'] as PieceType[]).forEach((type) => {
      const bMissing = STARTING_PIECES[type] - currentCounts.b[type];
      for (let i = 0; i < bMissing; i++) wCaps.push(type);

      const wMissing = STARTING_PIECES[type] - currentCounts.w[type];
      for (let i = 0; i < wMissing; i++) bCaps.push(type);

      wScore += currentCounts.w[type] * PIECE_VALUES[type];
      bScore += currentCounts.b[type] * PIECE_VALUES[type];
    });

    return {
      whiteCaptures: wCaps,
      blackCaptures: bCaps,
      materialDiff: wScore - bScore,
    };
  }, [chess]);

  // Trigger Game Over with Firestore Star Persistence
  const triggerGameOver = useCallback(
    (winnerColor: 'w' | 'b' | 'draw', reason: GameResultDetails['reason'], resultString: string) => {
      setIsClockRunning(false);
      setGameResult(resultString);

      const isHumanWinner =
        (winnerColor === 'w' && userColor === 'w') || (winnerColor === 'b' && userColor === 'b');
      const isDraw = winnerColor === 'draw';

      let stars = 0;
      if (botPlayer) {
        if (isHumanWinner) {
          stars = undosUsed === 0 ? 3 : undosUsed <= 2 ? 2 : 1;
        } else if (isDraw) {
          stars = 1;
        }
        setEarnedBotStars(stars);

        try {
          const key = `bot_stars_${botPlayer.id}`;
          const prev = parseInt(localStorage.getItem(key) || '0', 10);
          if (stars > prev) {
            localStorage.setItem(key, stars.toString());
          }
        } catch {}

        if (user?.uid) {
          FirestoreService.saveBotResult(user.uid, botPlayer.id, stars, undosUsed).catch(console.error);
        }
      }

      // Award XP based on match outcome rather than fake in-app Elo
      try {
        const action: XpAction = isHumanWinner
          ? (botPlayer ? 'win_bot_match' : 'win_online_match')
          : isDraw
          ? 'draw_match'
          : 'play_match';
        XpSystem.awardXp(action, isHumanWinner ? 'Match Victory' : isDraw ? 'Match Drawn' : 'Match Completed');
      } catch (e) {
        console.warn('Could not award match XP:', e);
      }

      const details: GameResultDetails = {
        winner: winnerColor,
        reason,
        ratingDelta: 0,
        newRating: (userColor === 'w' ? whitePlayer.rating : blackPlayer.rating),
        league: 'Bronze III',
        trophiesDelta: isHumanWinner ? 25 : 0,
      };

      setResultDetails(details);

      // Play immediate tactile piece impact as the defeated king begins to topple
      if (winnerColor !== 'draw') {
        soundService.playCapture();
      }

      // Allow the on-board king topple / defeat animation to play first briefly before showing modal
      setTimeout(() => {
        setIsGameOverModalOpen(true);
        setHasSeenGameOverModal(true);
        if (isHumanWinner) {
          soundService.playVictory();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
        } else if (winnerColor !== 'draw') {
          soundService.playDefeat();
        }
      }, 1400);

      GameSessionStore.completeGame(gameId, moveHistoryRef.current, resultString, details);

      // Preload / background-calculate deep engine review immediately
      // By the time the user views the victory celebration and clicks "Review Game",
      // the review is already computed and cached, loading in 0ms!
      if (typeof window !== 'undefined' && moveHistoryRef.current.length > 0) {
        const movesSnapshot = moveHistoryRef.current;
        fetch('/api/engine/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameId,
            moves: movesSnapshot.map((m) => m.san),
            whitePlayer,
            blackPlayer,
            strengthTier: 'fast',
            engineMode: 'torch_human',
          }),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.report) {
                data.report.isDeepReview = true;
                data.report.reviewVersion = 'v3.0';
                data.report.gameResult = resultString;
                data.report.resultDetails = details;
                const session = GameSessionStore.getSession(gameId);
                if (session) {
                  session.reviewReport = data.report;
                  session.engineMode = 'torch_human';
                  GameSessionStore.saveSession(session);
                }
              }
            }
          })
          .catch(() => {});
      }
    },
    [botPlayer, userColor, undosUsed, user?.uid, whitePlayer, blackPlayer, gameId]
  );

  // Takeback / Undo Move (0ms instant restore)
  const handleUndoMove = () => {
    if (moveHistory.length === 0 || gameResult) return;

    let movesToKeep: MoveRecord[] = [];
    if (botPlayer) {
      movesToKeep = moveHistory.slice(0, Math.max(0, moveHistory.length - 2));
    } else {
      movesToKeep = moveHistory.slice(0, moveHistory.length - 1);
    }

    setUndosUsed((u) => u + 1);
    setMoveHistory(movesToKeep);
    setCurrentMoveIndex(movesToKeep.length - 1);

    const targetFen =
      movesToKeep.length > 0
        ? movesToKeep[movesToKeep.length - 1].fenAfter
        : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

    const restoredChess = new Chess(targetFen);
    setChess(restoredChess);
    soundService.playMove();

    GameSessionStore.updateSessionMoves(gameId, movesToKeep);

    const takebackQuotes = [
      'Takebacks allowed! Try another move.',
      'No worries, take your time!',
      "A second chance! Let's see what you do now.",
    ];
    const quote = takebackQuotes[Math.floor(Math.random() * takebackQuotes.length)];
    setBotMessage(quote);
    setChatMessages((prev) => [
      ...prev,
      { sender: botPlayer?.name || 'Coach', text: quote, isBot: true },
    ]);
  };

  const handleResign = () => {
    if (gameResult) return;
    setIsResignModalOpen(true);
  };

  // Clock countdown timer
  useEffect(() => {
    if (!isClockRunning || gameResult) return;

    const interval = setInterval(() => {
      const turn = chess.turn();
      if (turn === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            triggerGameOver('b', 'timeout', 'Black won on time! (0-1)');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            triggerGameOver('w', 'timeout', 'White won on time! (1-0)');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isClockRunning, chess, gameResult, triggerGameOver]);

  // Bot Turn execution with ELO-scaled move generator
  const handleBotMove = useCallback((
    currentChessInstance: Chess,
    currentMoves: MoveRecord[],
    botColor: 'w' | 'b' = 'b'
  ) => {
    if (currentChessInstance.isGameOver()) return;
    try {
      const fenBefore = currentChessInstance.fen();

      const botMoveResult = generateBotMove(
        currentChessInstance,
        currentBotObj || CHESS_BOTS[0]
      );

      if (!botMoveResult) return;

      const botMove = currentChessInstance.move({
        from: botMoveResult.from as Square,
        to: botMoveResult.to as Square,
        promotion: (botMoveResult.promotion as PieceSymbol) || 'q',
      });

      if (!botMove) return;

      const fenAfter = currentChessInstance.fen();
      const isCheckNow = currentChessInstance.isCheck();

      if (currentChessInstance.isCheckmate()) {
        triggerGameOver(
          botColor,
          'checkmate',
          `${botPlayer?.name || 'Bot'} wins by Checkmate!`
        );
      } else if (currentChessInstance.isDraw() || currentChessInstance.isStalemate()) {
        triggerGameOver('draw', 'stalemate', 'Game drawn by stalemate! (½-½)');
      } else if (isCheckNow) {
        soundService.playCheck();
      } else if (botMove.flags.includes('k') || botMove.flags.includes('q')) {
        soundService.playCastle();
      } else if (botMove.captured) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }

      const botRecord: MoveRecord = {
        san: botMove.san,
        from: botMove.from as Square,
        to: botMove.to as Square,
        captured: botMove.captured as PieceType | undefined,
        fenBefore,
        fenAfter,
        evalBefore: 0,
        evalAfter: 0,
        coachComment: `${botPlayer?.name || 'Bot'} plays ${botMove.san}.`,
        isCheck: isCheckNow,
      };

      const finalMoves = [...currentMoves, botRecord];
      setMoveHistory(finalMoves);
      setCurrentMoveIndex(finalMoves.length - 1);
      setChess(new Chess(fenAfter));
      GameSessionStore.updateSessionMoves(gameId, finalMoves);

      if (incrementSeconds > 0) {
        if (botColor === 'w') {
          setWhiteTime((t) => t + incrementSeconds);
        } else {
          setBlackTime((t) => t + incrementSeconds);
        }
      }
    } catch {
      //
    }
  }, [currentBotObj, botPlayer?.name, gameId, incrementSeconds, triggerGameOver]);

  // Automated First Move for Bot playing as White
  useEffect(() => {
    if (whitePlayer.isBot && moveHistory.length === 0 && !gameResult) {
      const activeBot = currentBotObj || CHESS_BOTS[0];
      const botDelay = calculateBotThinkingDelayMs(activeBot, 1, false);
      setIsBotThinking(true);
      const timer = setTimeout(() => {
        try {
          handleBotMove(new Chess(), [], 'w');
        } finally {
          setIsBotThinking(false);
        }
      }, botDelay);
      return () => clearTimeout(timer);
    }
  }, [whitePlayer.isBot, moveHistory.length, gameResult, currentBotObj, handleBotMove]);

  // 0ms Optimistic Board Move Handler
  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (gameResult) return;
      if (currentMoveIndex !== moveHistory.length - 1 && moveHistory.length > 0) {
        return;
      }

      try {
        const fenBefore = chess.fen();
        const turnBefore = chess.turn();

        // 1. Instantly apply legal move on client (0ms lag!)
        const move = chess.move({
          from,
          to,
          promotion: promotion || 'q',
        });

        if (!move) return;

        if (!isClockRunning) setIsClockRunning(true);

        const fenAfter = chess.fen();
        const isCheckNow = chess.isCheck();

        // Play appropriate tactile sound instantly
        if (chess.isCheckmate()) {
          triggerGameOver(
            turnBefore === 'w' ? 'w' : 'b',
            'checkmate',
            `${turnBefore === 'w' ? 'White' : 'Black'} wins by Checkmate!`
          );
        } else if (chess.isDraw() || chess.isStalemate()) {
          triggerGameOver('draw', 'stalemate', 'Game drawn by stalemate! (½-½)');
        } else if (isCheckNow) {
          soundService.playCheck();
        } else if (move.flags.includes('k') || move.flags.includes('q')) {
          soundService.playCastle();
        } else if (move.captured) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }

        const newRecord: MoveRecord = {
          san: move.san,
          from,
          to,
          captured: move.captured as PieceType | undefined,
          fenBefore,
          fenAfter,
          evalBefore: 0,
          evalAfter: 0,
          classification: undefined,
          coachComment: `${whitePlayer.name} plays ${move.san}.`,
          isCheck: isCheckNow,
        };

        const nextMoves = [...moveHistory, newRecord];
        setMoveHistory(nextMoves);
        setCurrentMoveIndex(nextMoves.length - 1);
        setChess(new Chess(fenAfter));

        // Sync storage
        GameSessionStore.updateSessionMoves(gameId, nextMoves);

        // Add clock increment
        if (incrementSeconds > 0) {
          if (turnBefore === 'w') {
            setWhiteTime((t) => t + incrementSeconds);
          } else {
            setBlackTime((t) => t + incrementSeconds);
          }
        }

        // Bot response (Scaled to authentic Bot ELO rating with reasoning pause)
        const nextChess = new Chess(fenAfter);
        const nextTurn = nextChess.turn();
        const isBotTurn =
          (nextTurn === 'w' && whitePlayer.isBot) || (nextTurn === 'b' && blackPlayer.isBot);

        if (isBotTurn && !nextChess.isGameOver()) {
          const activeBot = currentBotObj || CHESS_BOTS[0];
          const botDelay = calculateBotThinkingDelayMs(activeBot, nextMoves.length, nextChess.isCheck());
          setIsBotThinking(true);
          setTimeout(() => {
            try {
              handleBotMove(nextChess, nextMoves, nextTurn);
            } finally {
              setIsBotThinking(false);
            }
          }, botDelay);
        }
      } catch {
        // invalid move caught safely
      }
    },
    [
      chess,
      gameResult,
      moveHistory,
      currentMoveIndex,
      whitePlayer.isBot,
      blackPlayer.isBot,
      incrementSeconds,
      isClockRunning,
      whitePlayer.name,
      gameId,
      currentBotObj,
      triggerGameOver,
      handleBotMove,
    ]
  );

  const handleSelectHistoricalMove = (index: number) => {
    if (index < -1 || index >= moveHistory.length) return;
    setCurrentMoveIndex(index);
    if (index === -1) {
      setChess(new Chess('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'));
    } else {
      const targetFen = moveHistory[index].fenAfter;
      setChess(new Chess(targetFen));
    }
  };

  const handleSendChat = (text: string) => {
    if (!text.trim()) return;
    const userMsg = { sender: 'You', text: text.trim() };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    if (currentBotObj?.quotes?.goodMove?.length) {
      setTimeout(() => {
        const pool = currentBotObj.quotes.goodMove;
        const reply = pool[Math.floor(Math.random() * pool.length)];
        setBotMessage(reply);
        setChatMessages((prev) => [
          ...prev,
          { sender: currentBotObj.name, text: reply, isBot: true },
        ]);
        if (activeTab !== 'chat') setHasUnreadChat(true);
      }, 700);
    }
  };

  const topPlayer = orientation === 'w' ? blackPlayer : whitePlayer;
  const topColor: PieceColor = orientation === 'w' ? 'b' : 'w';
  const topTime = orientation === 'w' ? blackTime : whiteTime;
  const topCaptures = orientation === 'w' ? blackCaptures : whiteCaptures;
  const topAdvantage = orientation === 'w' ? -materialDiff : materialDiff;

  const bottomPlayer = orientation === 'w' ? whitePlayer : blackPlayer;
  const bottomColor: PieceColor = orientation === 'w' ? 'w' : 'b';
  const bottomTime = orientation === 'w' ? whiteTime : blackTime;
  const bottomCaptures = orientation === 'w' ? whiteCaptures : blackCaptures;
  const bottomAdvantage = orientation === 'w' ? materialDiff : -materialDiff;

  const lastMoveHighlight = useMemo(() => {
    if (currentMoveIndex < 0 || !moveHistory[currentMoveIndex]) return null;
    const m = moveHistory[currentMoveIndex];
    return { from: m.from, to: m.to };
  }, [currentMoveIndex, moveHistory]);

  return (
    <div className="flex-1 flex flex-col min-h-[100dvh] xl:h-[100dvh] xl:max-h-[100dvh] overflow-y-auto xl:overflow-hidden bg-[#161512] text-zinc-100 select-none justify-start min-w-0 pb-16 xl:pb-0">
      {/* 1. Header with comfortable vertical padding */}
      <header className="min-h-[52px] sm:min-h-[56px] py-2 sm:py-2.5 px-3 sm:px-5 border-b border-[#262421] bg-[#1a1815] flex items-center justify-between shrink-0 select-none z-30">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => router.push('/play')}
            className="py-1.5 px-2.5 sm:px-3 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
            title="Return to Play Lobby"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Lobby</span>
          </button>
          <span className="text-zinc-600 hidden xs:inline">|</span>
          <span className="text-xs sm:text-sm font-bold text-zinc-300 truncate">
            {botPlayer ? (
              <span className="flex items-center gap-1.5">
                <span className="text-zinc-400 font-normal">vs</span>
                <strong className="text-white font-extrabold">{botPlayer.name}</strong>
                <span className="text-[11px] text-zinc-400 font-mono">({botPlayer.rating})</span>
              </span>
            ) : (
              <strong className="text-white font-mono">Live Match</strong>
            )}
          </span>
        </div>

        {/* Right Header Controls: Review Button or Compact More Options Popover */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
          {gameResult ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push(`/game/review/${gameId}`)}
              className="px-2.5 sm:px-3 py-1 gap-1 text-xs font-black shadow-sm"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Review</span>
            </Button>
          ) : (
            <span className="text-[10px] font-mono font-bold text-zinc-400 px-2 py-0.5 rounded-md bg-[#211f1c] border border-[#2d2a25] uppercase tracking-wider">
              Live
            </span>
          )}

          {/* More Options Button */}
          <button
            onClick={() => setIsMoreMenuOpen((prev) => !prev)}
            className="p-1 sm:p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] border border-[#35322b] transition-colors cursor-pointer"
            title="Game Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Lightweight Popover Menu */}
          {isMoreMenuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-[#1f1d1a] border border-[#35322b] rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setOrientation((o) => (o === 'w' ? 'b' : 'w'));
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-200 hover:bg-[#2c2924] flex items-center gap-2 text-left transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
                <span>Flip Board</span>
              </button>

              <button
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  setIsMoreMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-200 hover:bg-[#2c2924] flex items-center gap-2 text-left transition-colors"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                )}
                <span>Sound: {soundEnabled ? 'On' : 'Off'}</span>
              </button>

              {!gameResult && (
                <>
                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      triggerGameOver('draw', 'agreement', 'Draw by mutual agreement');
                    }}
                    disabled={moveHistory.length === 0}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-200 hover:bg-[#2c2924] flex items-center gap-2 text-left transition-colors disabled:opacity-40"
                  >
                    <Handshake className="w-3.5 h-3.5 text-amber-400" />
                    <span>Offer Draw</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      handleResign();
                    }}
                    disabled={moveHistory.length === 0}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 text-left transition-colors disabled:opacity-40"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign Game</span>
                  </button>
                </>
              )}

              <div className="border-t border-[#2e2a25] my-0.5" />

              <button
                onClick={() => {
                  setIsMoreMenuOpen(false);
                  openSettings();
                }}
                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-[#2c2924] flex items-center gap-2 text-left transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Workspace: Top-Aligned Responsive Container (Side-by-side on laptop/desktop md:+) */}
      <main className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-center p-1 sm:p-2 md:p-3 xl:p-4 gap-2 md:gap-4 xl:gap-6 w-full max-w-6xl mx-auto overflow-visible md:overflow-hidden min-h-0">
        
        {/* Center Column: Opponent Bar + Board + User Bar + Mobile Controls */}
        <div className="w-full max-w-full md:w-auto flex flex-col items-center justify-start shrink-0 px-0 sm:px-1 gap-1">
          
          {/* Top Opponent Player Bar */}
          <div
            className="w-[min(calc(100vw-1rem),calc(100dvh-175px),500px)] md:w-[min(calc(100vw-22rem),calc(100dvh-170px),520px)] lg:w-[min(calc(100vw-26rem),calc(100dvh-170px),540px)] px-1 sm:px-0"
          >
            <PlayerCard
              player={topPlayer}
              color={topColor}
              timeRemainingSeconds={topTime}
              isActiveTurn={chess.turn() === topColor}
              isThinking={Boolean(topPlayer.isBot && isBotThinking && chess.turn() === topColor)}
              capturedPieces={topCaptures}
              materialAdvantage={topAdvantage}
            />
          </div>

          {/* Edge-to-Edge Chessboard (Strictly bounded by 100dvh) */}
          <div
            className="shrink-0 aspect-square flex items-center justify-center relative select-none overflow-visible w-[min(calc(100vw-1rem),calc(100dvh-175px),500px)] h-[min(calc(100vw-1rem),calc(100dvh-175px),500px)] md:w-[min(calc(100vw-22rem),calc(100dvh-170px),520px)] md:h-[min(calc(100vw-22rem),calc(100dvh-170px),520px)] lg:w-[min(calc(100vw-26rem),calc(100dvh-170px),540px)] lg:h-[min(calc(100vw-26rem),calc(100dvh-170px),540px)]"
          >
            <ChessBoard
              chess={chess}
              orientation={orientation}
              playerColor={userColor}
              boardTheme={boardTheme}
              pieceTheme={pieceTheme}
              moveInputMode={moveInputMode}
              onMove={handleBoardMove}
              lastMove={lastMoveHighlight}
              activeClassification={null}
              disabled={Boolean(gameResult)}
              defeatedColor={
                resultDetails && currentMoveIndex === moveHistory.length - 1
                  ? resultDetails.winner === 'w'
                    ? 'b'
                    : resultDetails.winner === 'b'
                    ? 'w'
                    : null
                  : null
              }
            />

            {/* Floating Re-Open Result Button when reviewing final board (only after modal has been shown once) */}
            {resultDetails && !isGameOverModalOpen && hasSeenGameOverModal && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 pointer-events-auto">
                <button
                  onClick={() => setIsGameOverModalOpen(true)}
                  className="shadow-2xl border border-white/20 px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white cursor-pointer transition-transform hover:scale-105"
                >
                  <Award className="w-4 h-4" />
                  <span>View Match Result</span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Player Bar (User) */}
          <div
            className="w-[min(calc(100vw-1rem),calc(100dvh-175px),500px)] md:w-[min(calc(100vw-22rem),calc(100dvh-170px),520px)] lg:w-[min(calc(100vw-26rem),calc(100dvh-170px),540px)] px-1 sm:px-0"
          >
            <PlayerCard
              player={bottomPlayer}
              color={bottomColor}
              timeRemainingSeconds={bottomTime}
              isActiveTurn={chess.turn() === bottomColor}
              isThinking={Boolean(bottomPlayer.isBot && isBotThinking && chess.turn() === bottomColor)}
              capturedPieces={bottomCaptures}
              materialAdvantage={bottomAdvantage}
            />
          </div>

          {/* Mobile Bottom Controls Bar (< md screens) */}
          <div
            className="w-full md:hidden px-1 sm:px-0 max-w-[min(calc(100vw-1rem),calc(100dvh-175px),500px)]"
          >
            <MobileBottomBar
              onToggleMoves={() => setActiveTab('moves')}
              onToggleChat={() => {
                setActiveTab((t) => (t === 'chat' ? 'moves' : 'chat'));
                setHasUnreadChat(false);
              }}
              onOpenAnalysis={() => router.push(`/game/review/${gameId}`)}
              onPrevMove={() =>
                currentMoveIndex > 0 && handleSelectHistoricalMove(currentMoveIndex - 1)
              }
              onNextMove={() =>
                currentMoveIndex < moveHistory.length - 1 &&
                handleSelectHistoricalMove(currentMoveIndex + 1)
              }
              canPrev={currentMoveIndex > 0}
              canNext={currentMoveIndex < moveHistory.length - 1}
              isGameOver={Boolean(gameResult)}
              onUndo={botPlayer ? handleUndoMove : undefined}
              canUndo={Boolean(botPlayer) && !gameResult && moveHistory.length > 0}
              onResign={handleResign}
              onOpenMore={() => setIsMoreMenuOpen(true)}
            />
          </div>
        </div>

        {/* 3. Right Side Console (Laptop/Desktop >= md, strictly fits inside single viewport) */}
        <div
          className="hidden md:flex w-[300px] md:w-[320px] lg:w-[360px] xl:w-[400px] flex-col gap-2 shrink-0"
          style={{ height: 'min(calc(100dvh - 100px), 580px)' }}
        >
          {/* Top Console Tabs: Moves vs Bot Chat */}
          <div className="p-1 bg-[#1a1815] rounded-xl border border-[#2d2a25] flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                soundService.playTactilePop();
                setActiveTab('moves');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'moves'
                  ? 'bg-[#282521] text-white shadow-sm border border-[#3a3731]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#201e1a]'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5 text-emerald-400" />
              <span>Moves</span>
              <span className="text-[10px] font-mono font-bold px-1.5 rounded-full bg-black/40 text-zinc-300">
                {moveHistory.length}
              </span>
            </button>

            {botPlayer && (
              <button
                onClick={() => {
                  soundService.playTactilePop();
                  setActiveTab('chat');
                  setHasUnreadChat(false);
                }}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  activeTab === 'chat'
                    ? 'bg-[#282521] text-white shadow-sm border border-[#3a3731]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#201e1a]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="truncate">Chat with {botPlayer.name}</span>
                {hasUnreadChat && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                )}
              </button>
            )}
          </div>

          {/* Console Body: Move List or Bot Chat */}
          <div className="flex-1 min-h-0 bg-[#211f1c] rounded-xl border border-[#35322b] overflow-hidden flex flex-col shadow-sm">
            {activeTab === 'moves' ? (
              <div className="h-full flex flex-col min-h-0">
                <MoveHistory
                  moves={moveHistory}
                  currentMoveIndex={currentMoveIndex}
                  onSelectMove={handleSelectHistoricalMove}
                  showClassifications={Boolean(gameResult)}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col min-h-0 p-2.5 justify-between bg-[#1e1c19]">
                <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2a25] shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#282521] border border-[#3a3731] flex items-center justify-center text-sm">
                      {botPlayer?.avatar || '🤖'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-white">{botPlayer?.name}</h4>
                      <span className="text-[10px] text-emerald-400 font-bold">● Playing</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-zinc-400 bg-black/30 px-2 py-0.5 rounded border border-[#33302b]">
                    Rating {botPlayer?.rating}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto py-2 space-y-1.5 pr-1 min-h-0">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${
                        msg.isBot ? 'items-start text-zinc-300' : 'items-end text-emerald-400'
                      }`}
                    >
                      <span className="text-[9px] text-zinc-500 font-bold px-1">{msg.sender}</span>
                      <span
                        className={`px-2.5 py-1 rounded-xl text-xs max-w-[85%] leading-relaxed ${
                          msg.isBot
                            ? 'bg-[#282521] border border-[#383530] text-zinc-200'
                            : 'bg-emerald-500/20 border border-emerald-500/40 text-white font-medium'
                        }`}
                      >
                        {msg.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-1.5 border-t border-[#2d2a25] space-y-1.5 shrink-0">
                  <div className="flex flex-wrap gap-1">
                    {['Good luck!', 'Nice move!', 'Oops!', 'Rematch?'].map((chip) => (
                      <button
                        key={chip}
                        onClick={() => {
                          soundService.playTactilePop();
                          handleSendChat(chip);
                        }}
                        className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#282521] hover:bg-[#33302a] text-zinc-300 border border-[#383530] transition-colors cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendChat(chatInput)}
                      placeholder={`Message ${botPlayer?.name || 'opponent'}...`}
                      className="flex-1 bg-[#141311] border border-[#35322b] rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => {
                        soundService.playTactilePop();
                        handleSendChat(chatInput);
                      }}
                      className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer shadow-[0_2px_0_0_#065f46] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-[0_1px_0_0_#065f46]"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Desktop Actions Bar: Undo, Flip, Draw, Resign */}
          <div className="p-1.5 bg-[#211f1c] rounded-xl border border-[#35322b] flex items-center justify-between gap-1.5 shrink-0">
            {botPlayer && !gameResult && (
              <button
                onClick={handleUndoMove}
                disabled={moveHistory.length === 0}
                className="flex-1 py-1.5 px-2 rounded-lg bg-[#282521] hover:bg-[#33302a] border border-[#3d3830] text-amber-400 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                title={`Takebacks used: ${undosUsed}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
            )}

            <button
              onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#282521] hover:bg-[#33302a] border border-[#3d3830] text-zinc-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Flip Board"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Flip</span>
            </button>

            <button
              onClick={() => triggerGameOver('draw', 'agreement', 'Draw by mutual agreement')}
              disabled={Boolean(gameResult) || moveHistory.length === 0}
              className="flex-1 py-1.5 px-2 rounded-lg bg-[#282521] hover:bg-[#33302a] border border-[#3d3830] text-zinc-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              title="Offer Draw"
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>

            <button
              onClick={handleResign}
              disabled={Boolean(gameResult) || moveHistory.length === 0}
              className="flex-1 py-1.5 px-2 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
              title="Resign Match"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Resign</span>
            </button>
          </div>
        </div>
      </main>

      {/* Resign Modal */}
      {isResignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#211f1c] border border-[#35322b] rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3.5 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-xl">
              🏳️
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Resign this match?</h3>
              <p className="text-xs text-zinc-400 font-medium mt-1 leading-relaxed">
                Concede victory to <strong className="text-white">{botPlayer?.name || 'opponent'}</strong> immediately.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full pt-1">
              <Button
                variant="secondary"
                onClick={() => setIsResignModalOpen(false)}
                className="uppercase tracking-wider text-xs font-black"
              >
                Keep Playing
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setIsResignModalOpen(false);
                  const opponentColor = userColor === 'w' ? 'b' : 'w';
                  triggerGameOver(
                    opponentColor,
                    'resignation',
                    `${userColor === 'w' ? whitePlayer.name : blackPlayer.name} Resigned (${opponentColor === 'w' ? '1-0' : '0-1'})`
                  );
                }}
                className="uppercase tracking-wider text-xs font-black"
              >
                Yes, Resign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Game Over Modal with Stars */}
      {resultDetails && (
        <GameOverModal
          isOpen={isGameOverModalOpen}
          onClose={() => setIsGameOverModalOpen(false)}
          result={resultDetails}
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
          userColor={userColor}
          botStars={earnedBotStars}
          undosUsed={undosUsed}
          onReviewGame={() => {
            setIsGameOverModalOpen(false);
            router.push(`/game/review/${gameId}`);
          }}
          onRematch={() => {
            setIsGameOverModalOpen(false);
            setChess(new Chess());
            setMoveHistory([]);
            setCurrentMoveIndex(-1);
            setGameResult(null);
            setResultDetails(null);
            setUndosUsed(0);
          }}
          onNewGame={() => router.push('/play')}
        />
      )}

      {/* Cinematic Fighting Game Style Intro Face-off */}
      <MatchVersusIntro
        isOpen={showVersusIntro}
        onComplete={() => setShowVersusIntro(false)}
        whitePlayer={{
          name: whitePlayer.name,
          avatar: whitePlayer.avatar,
          rating: whitePlayer.rating,
          title: whitePlayer.title,
          country: whitePlayer.country,
          isBot: whitePlayer.isBot,
        }}
        blackPlayer={{
          name: blackPlayer.name,
          avatar: blackPlayer.avatar,
          rating: blackPlayer.rating,
          title: blackPlayer.title,
          country: blackPlayer.country,
          isBot: blackPlayer.isBot,
        }}
        gameFormat={botPlayer ? `Bot Battle • Vs ${botPlayer.name}` : `${variant.toUpperCase()} Match`}
      />
    </div>
  );
}
