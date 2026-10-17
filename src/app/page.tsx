'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import {
  BoardTheme,
  PieceTheme,
  SoundTheme,
  PieceColor,
  PieceType,
  MoveRecord,
  GamePlayer,
  MembershipTier,
  BotPersonality,
  ChessVariant,
  GameResultDetails,
  GameReviewReport,
  Premove,
  ArrowAnnotation,
} from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { ChessEvaluator } from '@/lib/chessEngine';
import { generateBotMove, calculateBotThinkingDelayMs } from '@/lib/botEngine';
import { soundService } from '@/lib/audioService';

// Core Navigation & Boards
import { SidebarNav, ActiveTab } from '@/components/sidebar/SidebarNav';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { PlayerCard } from '@/components/game/PlayerCard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { NotationRibbon } from '@/components/game/NotationRibbon';
import { MobileBottomBar } from '@/components/game/MobileBottomBar';
import { GameOverModal } from '@/components/game/GameOverModal';
import { DesktopPlayPanel } from '@/components/game/DesktopPlayPanel';
import { ChessHomeDashboard } from '@/components/home/ChessHomeDashboard';

// Analysis & Review
import { CoachCommentaryCard } from '@/components/analysis/CoachCommentaryCard';
import { GameReviewModal } from '@/components/analysis/GameReviewModal';
import { GameSessionStore, generateGameReviewReport } from '@/lib/gameSessionStore';
import dynamic from 'next/dynamic';

// Subsystems (Lazy loaded for lightning-fast initial page load)
import { BotChatBubble } from '@/components/bots/BotChatBubble';
import { BotSelector } from '@/components/bots/BotSelector';

const GameReviewView = dynamic(
  () => import('@/components/analysis/GameReviewView').then((m) => m.GameReviewView),
  { ssr: false }
);
const GameReviewSummaryView = dynamic(
  () => import('@/components/analysis/GameReviewSummaryView').then((m) => m.GameReviewSummaryView),
  { ssr: false }
);
const PuzzleArena = dynamic(
  () => import('@/components/puzzles/PuzzleArena').then((m) => m.PuzzleArena),
  { ssr: false }
);
const LessonArena = dynamic(
  () => import('@/components/lessons/LessonArena').then((m) => m.LessonArena),
  { ssr: false }
);
const OpeningExplorer = dynamic(
  () => import('@/components/openings/OpeningExplorer').then((m) => m.OpeningExplorer),
  { ssr: false }
);
const InsightsDashboard = dynamic(
  () => import('@/components/insights/InsightsDashboard').then((m) => m.InsightsDashboard),
  { ssr: false }
);
const HistoricalGamesViewer = dynamic(
  () => import('@/components/historical/HistoricalGamesViewer').then((m) => m.HistoricalGamesViewer),
  { ssr: false }
);
const VariantsArena = dynamic(
  () => import('@/components/variants/VariantsArena').then((m) => m.VariantsArena),
  { ssr: false }
);
const SoloChessArena = dynamic(
  () => import('@/components/variants/SoloChessArena').then((m) => m.SoloChessArena),
  { ssr: false }
);
const PubApiExplorer = dynamic(
  () => import('@/components/pubapi/PubApiExplorer').then((m) => m.PubApiExplorer),
  { ssr: false }
);
import { useAuth } from '@/context/AuthContext';
import { useShell } from '@/context/ShellContext';
import { useRouter } from 'next/navigation';
import { FirestoreService } from '@/lib/firebase/firestoreService';

import {
  RotateCcw,
  RefreshCw,
  Flag,
  Handshake,
  ArrowUpDown,
  Award,
  Swords,
  Users,
  Compass,
  Zap,
  Crown,
  Dices,
  Target,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ChessPlatformPage() {
  const router = useRouter();
  const {
    boardTheme,
    pieceTheme,
    soundTheme,
    soundEnabled,
    membershipTier,
    openSettings,
    openMembership,
    openChessComSync,
  } = useShell();

  // Navigation & User State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const membership = membershipTier;

  // Dedicated Game Review View Mode (Screenshots 1, 2, 3, 4, 5)
  const [isReviewViewActive, setIsReviewViewActive] = useState(false);
  const [reviewStage, setReviewStage] = useState<'summary' | 'stepper'>('summary');

  // Modals
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);
  const [gameResultDetails, setGameResultDetails] = useState<GameResultDetails | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // Game Settings & Modes
  const [gameMode, setGameMode] = useState<'vs_bot' | 'pass_and_play' | 'analysis'>('vs_bot');
  const [variant, setVariant] = useState<ChessVariant>('standard');
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]); // Martin
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [timeControl, setTimeControl] = useState<number>(600); // 10 minutes default (0 = unlimited)

  // Chess Engine & Moves
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [gameResult, setGameResult] = useState<string | null>(null);

  // Variant States (3-Check checks counter)
  const [checksDelivered, setChecksDelivered] = useState<{ w: number; b: number }>({ w: 0, b: 0 });

  // In-Game Interactions: Premoves & Custom Arrows
  const [premoves, setPremoves] = useState<Premove[]>([]);
  const [customArrows, setCustomArrows] = useState<ArrowAnnotation[]>([]);

  // Mobile / Tablet Panel Toggles
  const [showMovesPanel, setShowMovesPanel] = useState<boolean>(true);
  const [showChatPanel, setShowChatPanel] = useState<boolean>(true);

  // Clocks
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  // In-Game Bot Banter & Undos Tracking
  const [botMessage, setBotMessage] = useState<string>('');
  const [undosUsed, setUndosUsed] = useState<number>(0);
  const [isResignModalOpen, setIsResignModalOpen] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string; isBot: boolean }[]>([]);

  const {
    user,
    profile,
    effectiveDisplayName,
    effectiveRating,
    effectiveAvatar,
    effectiveCountry,
    openAuthModal,
  } = useAuth();

  // Players Profile (Synced user profile globally)
  const whitePlayer: GamePlayer = useMemo(
    () => ({
      id: 'player-1',
      name: effectiveDisplayName,
      rating: effectiveRating,
      avatar: effectiveAvatar,
      country: effectiveCountry.toUpperCase(),
    }),
    [effectiveDisplayName, effectiveRating, effectiveAvatar, effectiveCountry]
  );

  const blackPlayer: GamePlayer = useMemo(() => {
    if (gameMode === 'vs_bot') {
      return {
        id: selectedBot.id,
        name: selectedBot.name,
        rating: selectedBot.rating,
        avatar: selectedBot.avatar,
        title: selectedBot.rating >= 2800 ? 'GM' : 'BOT',
        isBot: true,
      };
    }
    return {
      id: 'player-2',
      name: 'Player 2 (Black)',
      rating: 1250,
      avatar: '♟️',
    };
  }, [gameMode, selectedBot]);

  // Material and Captures Calculation
  const { whiteCaptures, blackCaptures, materialDiff } = useMemo(() => {
    const wCaps: PieceType[] = [];
    const bCaps: PieceType[] = [];
    let wScore = 0;
    let bScore = 0;

    const values: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

    moveHistory.forEach((m) => {
      if (m.captured) {
        if (m.fenBefore.includes(' w ')) {
          wCaps.push(m.captured);
          wScore += values[m.captured] || 0;
        } else {
          bCaps.push(m.captured);
          bScore += values[m.captured] || 0;
        }
      }
    });

    return {
      whiteCaptures: wCaps,
      blackCaptures: bCaps,
      materialDiff: wScore - bScore,
    };
  }, [moveHistory]);

  const [reviewOverrideReport, setReviewOverrideReport] = useState<GameReviewReport | null>(null);

  // Active Game Review Report (generates full report or uses Masterpiece demo if no moves)
  const activeReviewReport = useMemo(() => {
    if (reviewOverrideReport) {
      return reviewOverrideReport;
    }
    if (moveHistory.length > 0) {
      return generateGameReviewReport('current-game', whitePlayer, blackPlayer, moveHistory);
    }
    return GameSessionStore.createDemoGameSession().reviewReport!;
  }, [reviewOverrideReport, moveHistory, whitePlayer, blackPlayer]);

  // Seamlessly upgrade client draft review to deep Stockfish 18 NNUE analysis when review mode opens
  useEffect(() => {
    if (!isReviewViewActive || moveHistory.length === 0) return;
    if (reviewOverrideReport?.isDeepReview) return;

    let isMounted = true;
    fetch('/api/engine/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: 'live-' + Date.now(),
        moves: moveHistory.map((m) => m.san),
        whitePlayer,
        blackPlayer,
        depth: 10,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.success && data?.report) {
          data.report.isDeepReview = true;
          setReviewOverrideReport(data.report);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [isReviewViewActive, moveHistory, whitePlayer, blackPlayer, reviewOverrideReport?.isDeepReview]);

  // Handle Game Conclusion with Detailed Results Modal
  const triggerGameOver = useCallback(
    (
      winner: 'w' | 'b' | 'draw',
      reason: 'checkmate' | 'resignation' | 'timeout' | 'stalemate' | 'insufficient' | 'agreement',
      statusText: string
    ) => {
      setGameResult(statusText);
      setIsClockRunning(false);

      const isUserWin = winner === 'w';
      const ratingDelta = winner === 'w' ? 8 : winner === 'b' ? -8 : 0;
      const currentRating = profile?.ratings.blitz || 1250;
      const newRating = currentRating + ratingDelta;

      const details: GameResultDetails = {
        winner,
        reason,
        ratingDelta,
        newRating,
      };

      setGameResultDetails(details);
      setIsGameOverModalOpen(true);

      // Persist bot match stars if player won
      if (gameMode === 'vs_bot' && isUserWin) {
        const earnedStars = undosUsed === 0 ? 3 : undosUsed === 1 ? 2 : 1;
        if (user?.uid) {
          FirestoreService.saveBotResult(user.uid, selectedBot.id, earnedStars, undosUsed);
        }
        try {
          const currentStars = parseInt(localStorage.getItem(`bot_stars_${selectedBot.id}`) || '0', 10);
          localStorage.setItem(`bot_stars_${selectedBot.id}`, String(Math.max(currentStars, earnedStars)));
        } catch {}
      }

      // Persist completed game to Cloud Firestore
      try {
        FirestoreService.saveGame({
          id: `game-${Date.now()}`,
          white: {
            uid: user?.uid || 'player-you',
            name: profile?.displayName || user?.displayName || whitePlayer.name,
            rating: currentRating,
            avatar: profile?.avatar || whitePlayer.avatar,
          },
          black: {
            uid: selectedBot ? `bot-${selectedBot.id}` : 'opponent',
            name: blackPlayer.name,
            rating: blackPlayer.rating,
            avatar: blackPlayer.avatar,
            title: blackPlayer.title,
          },
          timeControl,
          timeClass: timeControl <= 180 ? 'bullet' : timeControl <= 600 ? 'blitz' : 'rapid',
          variant,
          pgn: chess.pgn() || moveHistory.map((m) => m.san).join(' '),
          finalFen: chess.fen(),
          moves: moveHistory,
          result: winner === 'w' ? '1-0' : winner === 'b' ? '0-1' : '1/2-1/2',
          winReason: reason,
          createdAt: new Date().toISOString(),
        });
      } catch {
        // ignore
      }

      // Persist completed game into local GameSessionStore for persistent review & historical analysis
      try {
        GameSessionStore.completeGame(
          `game-${Date.now()}`,
          moveHistory,
          statusText,
          details
        );
      } catch {
        // ignore
      }

      if (isUserWin) {
        soundService.playGameEndWin();
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } else if (winner === 'draw') {
        soundService.playGameEndDraw();
      } else {
        soundService.playGameEndLoss();
      }
    },
    [profile, user, whitePlayer, blackPlayer, selectedBot, timeControl, variant, chess, moveHistory]
  );

  // Clocks countdown ticker
  useEffect(() => {
    if (!isClockRunning || timeControl === 0 || gameResult) return;

    const timer = setInterval(() => {
      if (chess.turn() === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            triggerGameOver('b', 'timeout', 'Black wins on time! (0-1)');
            return 0;
          }
          if (prev === 20) soundService.playLowTime();
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            triggerGameOver('w', 'timeout', 'White wins on time! (1-0)');
            return 0;
          }
          if (prev === 20) soundService.playLowTime();
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockRunning, timeControl, gameResult, chess, triggerGameOver]);

  // Initialize new game (respects active variant)
  const startNewGame = useCallback(() => {
    let startingFen = undefined;
    if (variant === 'chess960') {
      startingFen = ChessEvaluator.generateChess960Fen();
    }

    const newChess = startingFen ? new Chess(startingFen) : new Chess();
    setChess(newChess);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setEvalScore(0);
    setGameResult(null);
    setGameResultDetails(null);
    setIsGameOverModalOpen(false);
    setIsReviewViewActive(false);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsClockRunning(false);
    setChecksDelivered({ w: 0, b: 0 });
    setPremoves([]);
    setCustomArrows([]);
    soundService.playGameStart();

    if (gameMode === 'vs_bot') {
      const startQuotes = selectedBot.quotes.gameStart;
      setBotMessage(startQuotes[Math.floor(Math.random() * startQuotes.length)]);
    } else {
      setBotMessage('');
    }
  }, [timeControl, gameMode, selectedBot, variant]);

  // Execute a move on the board
  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (gameResult) return;

      try {
        const fenBefore = chess.fen();
        const bestChoice = ChessEvaluator.findBestMoveAndScore(chess);
        const evalBefore = bestChoice.score;
        const secondBestDiff = Math.abs(bestChoice.score - bestChoice.secondBestScore);
        const turnBefore = chess.turn();
        const pieceMoved = chess.get(from);

        // Check if move is legal
        const move = chess.move({ from, to, promotion: promotion || 'q' });
        if (!move) return;

        setIsClockRunning(true);

        const fenAfter = chess.fen();
        const evalAfter = ChessEvaluator.evaluateWithReply(chess);
        const isCheckNow = chess.isCheck();

        // 1. King of the Hill Variant Check (King reaches d4, e4, d5, or e5 wins)
        if (variant === 'kingofthehill' && pieceMoved && pieceMoved.type === 'k') {
          if (['d4', 'e4', 'd5', 'e5'].includes(to)) {
            triggerGameOver(
              turnBefore,
              'checkmate',
              `${turnBefore === 'w' ? 'White' : 'Black'} conquered the Hill! (${turnBefore === 'w' ? '1-0' : '0-1'})`
            );
            return;
          }
        }

        // 2. 3-Check Variant Rule
        let updatedChecks = { ...checksDelivered };
        if (variant === '3check' && isCheckNow) {
          const nextCount = updatedChecks[turnBefore] + 1;
          updatedChecks = { ...updatedChecks, [turnBefore]: nextCount };
          setChecksDelivered(updatedChecks);
          if (nextCount >= 3) {
            triggerGameOver(
              turnBefore,
              'checkmate',
              `${turnBefore === 'w' ? 'White' : 'Black'} delivered 3 Checks! (${turnBefore === 'w' ? '1-0' : '0-1'})`
            );
            return;
          }
        }

        // Classify move with Expected Points Win Probability Model
        const { classification, comment, motif } = ChessEvaluator.classifyMove(
          move.san,
          bestChoice.bestMoveSan,
          evalBefore,
          evalAfter,
          turnBefore,
          Boolean(move.captured),
          isCheckNow,
          moveHistory.length + 1,
          pieceMoved ? pieceMoved.type : 'p',
          secondBestDiff,
          fenBefore,
          fenAfter,
          from,
          to
        );

        // Play audio cues & handle checkmate/stalemate
        if (chess.isCheckmate()) {
          triggerGameOver(
            turnBefore,
            'checkmate',
            turnBefore === 'w' ? 'White wins by Checkmate! (1-0)' : 'Black wins by Checkmate! (0-1)'
          );
        } else if (chess.isDraw() || chess.isStalemate()) {
          triggerGameOver('draw', 'stalemate', 'Game drawn by stalemate or insufficient material! (½-½)');
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
          promotion: move.promotion as PieceType | undefined,
          fenBefore,
          fenAfter,
          evalBefore,
          evalAfter,
          classification,
          coachComment: comment,
          bestMoveSan: bestChoice.bestMoveSan,
          bestMoveUci: bestChoice.bestMoveUci,
          isCheck: isCheckNow,
          motif,
        };

        const nextMoves = [...moveHistory, newRecord];
        setMoveHistory(nextMoves);
        setCurrentMoveIndex(nextMoves.length - 1);
        setEvalScore(evalAfter);
        setChess(new Chess(fenAfter));

        // Bot AI response
        if (gameMode === 'vs_bot' && !chess.isGameOver()) {
          if (classification === 'blunder' || classification === 'mistake') {
            const quotes = selectedBot.quotes.blunder;
            setBotMessage(quotes[Math.floor(Math.random() * quotes.length)]);
          } else if (classification === 'brilliant' || classification === 'great') {
            const quotes = selectedBot.quotes.goodMove;
            setBotMessage(quotes[Math.floor(Math.random() * quotes.length)]);
          }

          const botDelay = calculateBotThinkingDelayMs(selectedBot, nextMoves.length, isCheckNow);
          setTimeout(() => {
            handleBotMove(new Chess(fenAfter), nextMoves, updatedChecks);
          }, botDelay);
        }
      } catch {
        // Invalid move
      }
    },
    [chess, gameResult, variant, checksDelivered, moveHistory, gameMode, selectedBot, triggerGameOver]
  );

  // Bot AI Response Move using Authentic ELO Generator
  const handleBotMove = useCallback(
    (
      currentChessInstance: Chess,
      currentMoves: MoveRecord[],
      activeChecks: { w: number; b: number }
    ) => {
      if (currentChessInstance.isGameOver()) return;

      try {
        const fenBefore = currentChessInstance.fen();
        const bestMoveResult = ChessEvaluator.findBestMoveAndScore(currentChessInstance);
        const evalBefore = bestMoveResult.score;

        // Generate authentic move according to bot's rating (Martin blunders, Nelson attacks, etc.)
        const botMoveResult = generateBotMove(currentChessInstance, selectedBot);
        if (!botMoveResult) return;

        const botMove = currentChessInstance.move({
          from: botMoveResult.from as Square,
          to: botMoveResult.to as Square,
          promotion: (botMoveResult.promotion as PieceSymbol) || 'q',
        });

        if (!botMove) return;

        const fenAfter = currentChessInstance.fen();
        const evalAfter = ChessEvaluator.evaluateWithReply(currentChessInstance);
        const isCheckNow = currentChessInstance.isCheck();

        // 1. King of the Hill Variant Check for Bot
        if (variant === 'kingofthehill' && botMove.piece === 'k') {
          if (['d4', 'e4', 'd5', 'e5'].includes(botMove.to)) {
            triggerGameOver(
              'b',
              'checkmate',
              `${selectedBot.name} conquered the Hill! (0-1)`
            );
            return;
          }
        }

        // 2. 3-Check Variant Check for Bot
        if (variant === '3check' && isCheckNow) {
          const nextCount = activeChecks.b + 1;
          const updatedChecks = { ...activeChecks, b: nextCount };
          setChecksDelivered(updatedChecks);
          if (nextCount >= 3) {
            triggerGameOver(
              'b',
              'checkmate',
              `${selectedBot.name} delivered 3 Checks! (0-1)`
            );
            return;
          }
        }

        const { classification, comment, motif } = ChessEvaluator.classifyMove(
          botMove.san,
          bestMoveResult.bestMoveSan,
          evalBefore,
          evalAfter,
          'b',
          Boolean(botMove.captured),
          isCheckNow,
          currentMoves.length + 1,
          botMove.piece,
          Math.abs(bestMoveResult.score - bestMoveResult.secondBestScore),
          fenBefore,
          fenAfter,
          botMove.from as Square,
          botMove.to as Square
        );

        if (currentChessInstance.isCheckmate()) {
          triggerGameOver('b', 'checkmate', 'Black wins by Checkmate! (0-1)');
          const winQuotes = selectedBot.quotes.win;
          setBotMessage(winQuotes[Math.floor(Math.random() * winQuotes.length)]);
        } else if (currentChessInstance.isDraw() || currentChessInstance.isStalemate()) {
          triggerGameOver('draw', 'stalemate', 'Game drawn by stalemate! (½-½)');
        } else if (isCheckNow) {
          soundService.playCheck();
          const checkQuotes = selectedBot.quotes.check;
          setBotMessage(checkQuotes[Math.floor(Math.random() * checkQuotes.length)]);
        } else if (botMove.captured) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }

        if (botMoveResult.quote) {
          setBotMessage(botMoveResult.quote);
          setChatMessages((prev) => [
            ...prev,
            { sender: selectedBot.name, text: botMoveResult.quote!, isBot: true },
          ]);
        }

        const botRecord: MoveRecord = {
          san: botMove.san,
          from: botMove.from as Square,
          to: botMove.to as Square,
          captured: botMove.captured as PieceType | undefined,
          fenBefore,
          fenAfter,
          evalBefore,
          evalAfter,
          classification,
          coachComment: comment || `${selectedBot.name} plays ${botMove.san}.`,
          bestMoveSan: bestMoveResult.bestMoveSan,
          isCheck: isCheckNow,
          motif,
        };

        const updatedHistory = [...currentMoves, botRecord];
        setMoveHistory(updatedHistory);
        setCurrentMoveIndex(updatedHistory.length - 1);
        setEvalScore(evalAfter);
        setChess(new Chess(fenAfter));

        // Check if user has a premove queued
        if (premoves.length > 0) {
          const nextPremove = premoves[0];
          setPremoves((prev) => prev.slice(1));
          setTimeout(() => {
            handleBoardMove(nextPremove.from, nextPremove.to);
          }, 50);
        }
      } catch {
        //
      }
    },
    [selectedBot, variant, premoves, handleBoardMove, triggerGameOver]
  );

  // Undo Move Takeback in Bot Mode
  const handleUndoMove = () => {
    if (gameMode !== 'vs_bot' || Boolean(gameResult) || moveHistory.length === 0) return;
    let movesToKeep: MoveRecord[] = [];
    if (moveHistory.length >= 2) {
      movesToKeep = moveHistory.slice(0, moveHistory.length - 2);
    } else {
      movesToKeep = [];
    }

    setUndosUsed((u) => u + 1);
    setMoveHistory(movesToKeep);
    setCurrentMoveIndex(movesToKeep.length - 1);
    const targetFen = movesToKeep.length > 0 ? movesToKeep[movesToKeep.length - 1].fenAfter : new Chess().fen();
    setChess(new Chess(targetFen));
    setEvalScore(movesToKeep.length > 0 ? movesToKeep[movesToKeep.length - 1].evalAfter : 0);
    soundService.playMove();

    const takebackQuotes = [
      'Takebacks allowed! Try another move.',
      'No worries, take your time!',
      'Second chance! Show me what you got.',
    ];
    const quote = takebackQuotes[Math.floor(Math.random() * takebackQuotes.length)];
    setBotMessage(quote);
    setChatMessages((prev) => [
      ...prev,
      { sender: selectedBot.name, text: quote, isBot: true },
    ]);
  };

  // Replay historical move from move list
  const handleSelectHistoricalMove = (index: number) => {
    setCurrentMoveIndex(index);
    if (index === -1) {
      setChess(new Chess());
      setEvalScore(0);
    } else {
      const record = moveHistory[index];
      if (record) {
        setChess(new Chess(record.fenAfter));
        setEvalScore(record.evalAfter);
      }
    }
  };

  // Premove Registration
  const handlePremove = (from: Square, to: Square) => {
    setPremoves((prev) => [...prev, { from, to }]);
  };

  // Custom Arrows Drawing (right-click desktop feature)
  const handleAddCustomArrow = (arrow: ArrowAnnotation) => {
    setCustomArrows((prev) => [...prev, arrow]);
  };

  const handleClearCustomArrows = () => {
    setCustomArrows([]);
  };

  // Resign & Draw actions
  const handleResign = () => {
    if (gameResult) return;
    const winnerColor = orientation === 'w' ? 'b' : 'w';
    triggerGameOver(
      winnerColor,
      'resignation',
      `${orientation === 'w' ? 'Black' : 'White'} wins by resignation!`
    );
  };

  const handleOfferDraw = () => {
    if (gameResult) return;
    triggerGameOver('draw', 'agreement', 'Game drawn by mutual agreement! (½-½)');
  };

  // Last Move highlight
  const lastMoveHighlight = useMemo(() => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moveHistory.length) return null;
    const m = moveHistory[currentMoveIndex];
    return { from: m.from, to: m.to };
  }, [currentMoveIndex, moveHistory]);

  const activeCommentaryMove = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex] : null;

  // Active classification badge to pin to the board square (Only shown after game ends or in analysis mode)
  const activeClassificationPin = useMemo(() => {
    if (!gameResult && gameMode !== 'analysis') return null;
    if (currentMoveIndex < 0 || currentMoveIndex >= moveHistory.length) return null;
    const m = moveHistory[currentMoveIndex];
    return m.classification ? { square: m.to, classification: m.classification } : null;
  }, [currentMoveIndex, moveHistory, gameResult, gameMode]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#161512] text-zinc-100 font-sans min-w-0">
      {/* If in Dedicated Game Review Mode (Stage 1 Summary & Stage 2 Stepper) */}
      {isReviewViewActive ? (
        reviewStage === 'summary' ? (
          <GameReviewSummaryView
            report={activeReviewReport}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onStartInteractiveReview={() => setReviewStage('stepper')}
            onBackToGame={() => {
              setIsReviewViewActive(false);
              setReviewOverrideReport(null);
            }}
          />
        ) : (
          <GameReviewView
            moves={activeReviewReport.moves}
            whitePlayer={activeReviewReport.whitePlayer}
            blackPlayer={activeReviewReport.blackPlayer}
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onBackToGame={() => {
              setIsReviewViewActive(false);
              setReviewOverrideReport(null);
            }}
            onBackToSummary={() => setReviewStage('summary')}
          />
        )
      ) : (
        <>
          {/* Top Header Bar (Desktop/Tablet >= md; Mobile uses AppShell MobileNavigation) */}
          <header className="hidden md:flex h-14 px-4 lg:px-6 border-b border-[#262421] bg-[#1a1815] items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 shrink-0">
                <span className="text-sm">♟️</span>
                <span>Check·mate Arena</span>
              </span>
              <span className="text-zinc-600">|</span>
              <span className="text-xs font-semibold text-zinc-400 truncate">
                {activeTab === 'home' ? (
                  <span>Dashboard</span>
                ) : (
                  <>
                    <span className="hidden lg:inline">Mode: </span>
                    <strong className="text-white capitalize">{gameMode.replace('_', ' ')}</strong>
                  </>
                )}
              </span>
              {variant !== 'standard' && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                  {variant}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setReviewStage('summary');
                  setIsReviewViewActive(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#272522] hover:bg-[#33302b] text-xs font-bold text-zinc-200 border border-[#3b3833] flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Open Game Review with Coach Danny Rensch"
              >
                <Award className="w-4 h-4 text-[#81b64c]" />
                <span className="hidden sm:inline">Game Review</span>
              </button>

              <button
                onClick={openMembership}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="capitalize">{membership} VIP</span>
              </button>
            </div>
          </header>

          {/* View Switcher based on active tab */}
          <div className={`flex-1 ${activeTab === 'play' ? 'p-0 sm:p-2 lg:p-6 overflow-hidden' : 'p-2 sm:p-4 lg:p-6 overflow-y-auto'} flex flex-col items-center justify-start w-full`}>
            {/* Home Dashboard */}
            {activeTab === 'home' && (
              <ChessHomeDashboard
                onStartGame={(tc) => {
                  if (tc > 0) {
                    setTimeControl(tc);
                    setWhiteTime(tc);
                    setBlackTime(tc);
                  }
                  setActiveTab('play');
                  startNewGame();
                }}
                onOpenBots={(botId) => {
                  if (botId) {
                    const b = CHESS_BOTS.find((x) => x.id === botId);
                    if (b) setSelectedBot(b);
                  }
                  router.push('/bots');
                }}
                onOpenLessons={() => router.push('/lessons')}
                onOpenPuzzles={() => router.push('/puzzles')}
                onOpenReview={(gameId) => {
                  if (gameId) {
                    router.push(`/game/review/${gameId}`);
                  } else {
                    const recents = GameSessionStore.listRecentSessions();
                    const lastSession = recents.find((s) => s.id !== 'demo-game-masterpiece');
                    if (lastSession) {
                      router.push(`/game/review/${lastSession.id}`);
                    } else {
                      setIsReviewViewActive(true);
                      setReviewStage('summary');
                    }
                  }
                }}
                onOpenInsights={() => router.push('/insights')}
                onOpenSyncModal={openChessComSync}
              />
            )}

              {activeTab === 'play' && (
                <div className="flex flex-col lg:flex-row gap-2 lg:gap-6 w-full max-w-6xl items-center justify-start lg:justify-center p-0 sm:p-2 overflow-hidden h-full">
                  {/* Left Column: Top Notation Ribbon + Players + Eval Bar + Board + Mobile Bottom Bar */}
                  <div className="flex flex-col gap-1 items-center shrink-0 w-full lg:w-auto">
                    {/* Top Notation Ribbon (Compact) */}
                    <div className="w-[min(100vw,calc(100dvh-175px),540px)] px-1 sm:px-0">
                      <NotationRibbon
                        moves={moveHistory}
                        currentMoveIndex={currentMoveIndex}
                        onSelectMove={handleSelectHistoricalMove}
                      />
                    </div>

                    {/* Top Player Card (Black by default) */}
                    <div className="w-[min(100vw,calc(100dvh-175px),540px)] px-1 sm:px-0">
                      <PlayerCard
                        player={orientation === 'w' ? blackPlayer : whitePlayer}
                        color={orientation === 'w' ? 'b' : 'w'}
                        timeRemainingSeconds={orientation === 'w' ? blackTime : whiteTime}
                        isActiveTurn={chess.turn() === (orientation === 'w' ? 'b' : 'w')}
                        capturedPieces={orientation === 'w' ? blackCaptures : whiteCaptures}
                        materialAdvantage={orientation === 'w' ? -materialDiff : materialDiff}
                      />
                    </div>

                    {/* Board Area with Eval Bar on Left */}
                    <div className="flex gap-1.5 justify-center items-center">
                      {/* Dynamic Eval Bar - Strictly unmounted during active live gameplay */}
                      {(Boolean(gameResult) || gameMode === 'analysis') && (
                        <div className="h-[min(100vw,calc(100dvh-175px),540px)] flex items-stretch">
                          <EvalBar
                            score={evalScore}
                            orientation={orientation}
                            isGameOver={Boolean(gameResult)}
                          />
                        </div>
                      )}

                      {/* ChessBoard with pinned badges & pre-moves - Strict height bound */}
                      <div className="w-[min(100vw,calc(100dvh-175px),540px)] aspect-square shrink-0">
                        <ChessBoard
                          chess={chess}
                          orientation={orientation}
                          boardTheme={boardTheme}
                          pieceTheme={pieceTheme}
                          onMove={handleBoardMove}
                          onPremove={handlePremove}
                          lastMove={lastMoveHighlight}
                          activeClassification={activeClassificationPin}
                          premoves={premoves}
                          customArrows={customArrows}
                          onAddCustomArrow={handleAddCustomArrow}
                          onClearCustomArrows={handleClearCustomArrows}
                          disabled={Boolean(gameResult)}
                        />
                      </div>
                    </div>

                    {/* Bottom Player Card (White by default) */}
                    <div className="w-[min(100vw,calc(100dvh-175px),540px)] px-1 sm:px-0">
                      <PlayerCard
                        player={orientation === 'w' ? whitePlayer : blackPlayer}
                        color={orientation === 'w' ? 'w' : 'b'}
                        timeRemainingSeconds={orientation === 'w' ? whiteTime : blackTime}
                        isActiveTurn={chess.turn() === (orientation === 'w' ? 'w' : 'b')}
                        capturedPieces={orientation === 'w' ? whiteCaptures : blackCaptures}
                        materialAdvantage={orientation === 'w' ? materialDiff : -materialDiff}
                      />
                    </div>

                    {/* Mobile Bottom Action Bar */}
                    <MobileBottomBar
                      onToggleMoves={() => setShowMovesPanel((p) => !p)}
                      onToggleChat={() => setShowChatPanel((p) => !p)}
                      onOpenAnalysis={() => setIsReviewViewActive(true)}
                      onPrevMove={() => {
                        if (currentMoveIndex > 0) handleSelectHistoricalMove(currentMoveIndex - 1);
                      }}
                      onNextMove={() => {
                        if (currentMoveIndex < moveHistory.length - 1)
                          handleSelectHistoricalMove(currentMoveIndex + 1);
                      }}
                      canPrev={currentMoveIndex > 0}
                      canNext={currentMoveIndex < moveHistory.length - 1}
                      hasUnreadChat={Boolean(botMessage)}
                      isGameOver={Boolean(gameResult)}
                      onUndo={handleUndoMove}
                      canUndo={gameMode === 'vs_bot' && moveHistory.length > 0 && !gameResult}
                      onResign={() => setIsResignModalOpen(true)}
                    />
                  </div>

                  {/* Right Game Controls & Notation Column */}
                  <div className="w-full max-w-[min(100%,560px)] lg:max-w-[380px] flex flex-col gap-2.5 shrink-0 max-h-[calc(100vh-40px)] overflow-hidden">
                    <DesktopPlayPanel
                      timeControl={timeControl}
                      onSelectTimeControl={(sec) => {
                        setTimeControl(sec);
                        setWhiteTime(sec);
                        setBlackTime(sec);
                      }}
                      onStartGame={startNewGame}
                      onPlayBot={() => {
                        setGameMode('vs_bot');
                        setActiveTab('bots');
                      }}
                      onPlayFriend={() => {
                        setGameMode('pass_and_play');
                        startNewGame();
                      }}
                      isGameActive={moveHistory.length > 0 && !gameResult}
                      onResign={() => setIsResignModalOpen(true)}
                      onDraw={handleOfferDraw}
                      onFlipBoard={() => setOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
                      onSelectVariant={(v) => setVariant(v)}
                      onUndo={handleUndoMove}
                      canUndo={gameMode === 'vs_bot' && moveHistory.length > 0 && !gameResult}
                    />

                    {/* Bot Banter & Chat Panel */}
                    {showChatPanel && gameMode === 'vs_bot' && (
                      <div className="bg-[#21201d] rounded-2xl border border-[#302e2b] p-3 flex flex-col gap-2 shadow-lg">
                        <div className="flex items-center justify-between pb-1.5 border-b border-[#2d2a26]">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{selectedBot.avatar}</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white flex items-center gap-1">
                                {selectedBot.name}
                                <span className="text-[10px] text-zinc-400 font-mono">({selectedBot.rating})</span>
                              </span>
                              <span className="text-[9px] text-[#81b64c] font-medium">{selectedBot.playStyle}</span>
                            </div>
                          </div>
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Bot Banter</span>
                        </div>

                        {/* Speech bubble */}
                        <div className="bg-[#1a1815] border border-[#2d2a26] rounded-xl p-2.5 text-xs text-zinc-200 min-h-[44px] flex items-center">
                          {botMessage ? (
                            <p className="italic leading-relaxed text-xs">"{botMessage}"</p>
                          ) : (
                            <span className="text-zinc-500 italic text-[11px]">Make a move or send a message to {selectedBot.name}...</span>
                          )}
                        </div>

                        {/* Quick banter chips */}
                        <div className="flex flex-wrap gap-1">
                          {['Good game!', 'Nice move!', 'Take your time!', 'Oops!'].map((chip) => (
                            <button
                              key={chip}
                              onClick={() => {
                                const replies = selectedBot.quotes.goodMove || ["Thanks! Let's keep playing!"];
                                setBotMessage(replies[Math.floor(Math.random() * replies.length)]);
                              }}
                              className="px-2 py-0.5 rounded-full bg-[#292622] hover:bg-[#33302a] text-[10px] text-zinc-300 transition cursor-pointer"
                            >
                              {chip}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Move History Table */}
                    {showMovesPanel && moveHistory.length > 0 && (
                      <div className="flex-1 min-h-[140px] max-h-[220px] overflow-y-auto">
                        <MoveHistory
                          moves={moveHistory}
                          currentMoveIndex={currentMoveIndex}
                          onSelectMove={handleSelectHistoricalMove}
                        />
                      </div>
                    )}

                    {/* Coach Danny AI Commentary Card - Only displayed after game ends or in analysis mode */}
                    {moveHistory.length > 0 && (Boolean(gameResult) || gameMode === 'analysis') && (
                      <div className="shrink-0 max-h-[160px] overflow-y-auto">
                        <CoachCommentaryCard
                          move={activeCommentaryMove}
                          turnColor={chess.turn()}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'puzzles' && (
                <PuzzleArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
              )}

              {activeTab === 'lessons' && (
                <LessonArena boardTheme={boardTheme} pieceTheme={pieceTheme} tier={membership} />
              )}

              {activeTab === 'openings' && (
                <OpeningExplorer boardTheme={boardTheme} pieceTheme={pieceTheme} />
              )}

              {activeTab === 'analysis' && (
                <div className="flex flex-col items-center gap-4 w-full">
                  <div className="p-3 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between w-full max-w-5xl">
                    <span className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#81b64c]" />
                      Stockfish Deep Analysis & Move Evaluation
                    </span>
                    <button
                      onClick={() => setIsReviewViewActive(true)}
                      className="px-4 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold cursor-pointer"
                    >
                      Open Full Game Review
                    </button>
                  </div>
                  <div className="flex gap-4 items-center justify-center">
                    <EvalBar score={evalScore} orientation={orientation} />
                    <ChessBoard
                      chess={chess}
                      orientation={orientation}
                      boardTheme={boardTheme}
                      pieceTheme={pieceTheme}
                      onMove={handleBoardMove}
                      lastMove={lastMoveHighlight}
                    />
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <InsightsDashboard boardTheme={boardTheme} pieceTheme={pieceTheme} />
              )}

              {activeTab === 'bots' && (
                <div className="w-full max-w-4xl h-[700px]">
                  <BotSelector
                    selectedBot={selectedBot}
                    onSelectBot={(b) => setSelectedBot(b)}
                    onStartGameWithBot={(b) => {
                      setSelectedBot(b);
                      setGameMode('vs_bot');
                      setActiveTab('play');
                      startNewGame();
                    }}
                  />
                </div>
              )}

              {activeTab === 'historical' && (
                <HistoricalGamesViewer boardTheme={boardTheme} pieceTheme={pieceTheme} />
              )}

              {activeTab === 'variants' && (
                <VariantsArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
              )}

              {activeTab === 'players' && <PubApiExplorer />}
            </div>
          </>
        )}

      {/* Game Over Results Modal (Matches Screenshot 3) */}
      {gameResultDetails && (
        <GameOverModal
          isOpen={isGameOverModalOpen}
          onClose={() => setIsGameOverModalOpen(false)}
          result={gameResultDetails}
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
          onReviewGame={() => {
            setIsGameOverModalOpen(false);
            setReviewStage('summary');
            setIsReviewViewActive(true);
          }}
          onRematch={startNewGame}
          onNewGame={startNewGame}
        />
      )}

      {/* Game Review Quick Report Modal */}
      <GameReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        moves={moveHistory}
        whitePlayerName={whitePlayer.name}
        blackPlayerName={blackPlayer.name}
      />

      {/* In-App Resign Confirmation Modal */}
      {isResignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-[#22201d] border border-[#3d3a34] rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-150 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center text-2xl shadow-inner">
              🏳️
            </div>
            <div>
              <h3 className="text-base font-black text-white">Resign this match?</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Resigning will concede the victory to <strong className="text-white">{gameMode === 'vs_bot' ? selectedBot.name : blackPlayer.name}</strong> and conclude the match immediately.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
              <button
                onClick={() => setIsResignModalOpen(false)}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition cursor-pointer"
              >
                Keep Playing
              </button>
              <button
                onClick={() => {
                  setIsResignModalOpen(false);
                  triggerGameOver('b', 'resignation', 'White resigned. (0-1)');
                }}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Yes, Resign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
