'use client';

import React, { useState, useEffect, useCallback, useMemo, use } from 'react';
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
  Premove,
  ArrowAnnotation,
} from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { ChessEvaluator } from '@/lib/chessEngine';
import { soundService } from '@/lib/audioService';
import { GameSessionStore } from '@/lib/gameSessionStore';
import { useRouter } from 'next/navigation';

// Components
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { PlayerCard } from '@/components/game/PlayerCard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { NotationRibbon } from '@/components/game/NotationRibbon';
import { MobileBottomBar } from '@/components/game/MobileBottomBar';
import { GameOverModal } from '@/components/game/GameOverModal';
import { BotChatBubble } from '@/components/bots/BotChatBubble';
import { CoachCommentaryCard } from '@/components/analysis/CoachCommentaryCard';

import {
  RotateCcw,
  Flag,
  Handshake,
  ArrowUpDown,
  Award,
  Swords,
  Users,
  Compass,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function GameRoomPage({ params }: GamePageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const gameId = resolvedParams.id;

  // Session & Board State
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green');
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>('neo');
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [variant, setVariant] = useState<ChessVariant>('standard');
  const [timeControl, setTimeControl] = useState<number>(600);

  // Players
  const [whitePlayer, setWhitePlayer] = useState<GamePlayer>({
    id: 'player-1',
    name: 'You',
    rating: 1250,
    avatar: '🧑‍💻',
    country: 'US',
  });
  const [blackPlayer, setBlackPlayer] = useState<GamePlayer>({
    id: 'bot-martin',
    name: 'Martin (Bot)',
    rating: 250,
    avatar: '🤖',
    isBot: true,
  });

  // Moves & Clocks
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [resultDetails, setResultDetails] = useState<GameResultDetails | null>(null);
  const [isGameOverModalOpen, setIsGameOverModalOpen] = useState(false);

  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [botMessage, setBotMessage] = useState<string>('');

  // Interactions
  const [premoves, setPremoves] = useState<Premove[]>([]);
  const [customArrows, setCustomArrows] = useState<ArrowAnnotation[]>([]);

  // Load or Initialize Session
  useEffect(() => {
    const session = GameSessionStore.getSession(gameId);
    if (session) {
      setWhitePlayer(session.whitePlayer);
      setBlackPlayer(session.blackPlayer);
      setTimeControl(session.timeControl);
      setVariant(session.variant);
      setWhiteTime(session.timeControl);
      setBlackTime(session.timeControl);
      if (session.moves.length > 0) {
        setMoveHistory(session.moves);
        setCurrentMoveIndex(session.moves.length - 1);
        const lastFen = session.moves[session.moves.length - 1].fenAfter;
        setChess(new Chess(lastFen));
      }
      if (session.isGameOver && session.resultDetails) {
        setGameResult(session.gameResult);
        setResultDetails(session.resultDetails);
        setIsGameOverModalOpen(true);
      }
    }
  }, [gameId]);

  // Trigger Game Over and Save Session
  const triggerGameOver = useCallback(
    (
      winner: 'w' | 'b' | 'draw',
      reason: 'checkmate' | 'resignation' | 'timeout' | 'stalemate' | 'insufficient' | 'agreement',
      statusText: string
    ) => {
      setGameResult(statusText);
      setIsClockRunning(false);

      const isUserWin = winner === 'w';
      const ratingDelta = winner === 'w' ? 10 : winner === 'b' ? -10 : 0;
      const newRating = 1250 + ratingDelta;

      const details: GameResultDetails = {
        winner,
        reason,
        ratingDelta,
        newRating,
        league: 'Silver League',
        trophiesDelta: isUserWin ? 15 : 0,
        achievementToast: isUserWin
          ? {
              title: 'New Achievement!',
              subtitle: 'Blitz Master 1',
              icon: 'zap',
            }
          : undefined,
      };

      setResultDetails(details);
      setIsGameOverModalOpen(true);

      // Persist to store & generate review report
      GameSessionStore.completeGame(gameId, moveHistory, statusText, details);

      if (isUserWin) {
        soundService.playGameEndWin();
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } else if (winner === 'draw') {
        soundService.playGameEndDraw();
      } else {
        soundService.playGameEndLoss();
      }
    },
    [gameId, moveHistory]
  );

  // Clocks ticker
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

  // Board Move
  const handleBoardMove = useCallback(
    (from: Square, to: Square, promotion?: PieceSymbol) => {
      if (gameResult) return;

      try {
        const fenBefore = chess.fen();
        const evalBefore = ChessEvaluator.evaluatePosition(chess);
        const turnBefore = chess.turn();

        const move = chess.move({ from, to, promotion: promotion || 'q' });
        if (!move) return;

        setIsClockRunning(true);
        const fenAfter = chess.fen();
        const evalAfter = ChessEvaluator.evaluatePosition(chess);
        const isCheckNow = chess.isCheck();

        const bestMoveResult = ChessEvaluator.getBestMove(chess, 2);
        const { classification, comment } = ChessEvaluator.classifyMove(
          move.san,
          bestMoveResult.bestMoveSan,
          evalBefore,
          evalAfter,
          turnBefore,
          Boolean(move.captured),
          isCheckNow,
          moveHistory.length + 1
        );

        if (chess.isCheckmate()) {
          triggerGameOver(
            turnBefore,
            'checkmate',
            turnBefore === 'w' ? 'White wins by Checkmate! (1-0)' : 'Black wins by Checkmate! (0-1)'
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
          evalBefore,
          evalAfter,
          classification,
          coachComment: comment,
          bestMoveSan: bestMoveResult.bestMoveSan,
          isCheck: isCheckNow,
        };

        const nextMoves = [...moveHistory, newRecord];
        setMoveHistory(nextMoves);
        setCurrentMoveIndex(nextMoves.length - 1);
        setEvalScore(evalAfter);
        setChess(new Chess(fenAfter));

        // Bot response
        if (blackPlayer.isBot && !chess.isGameOver()) {
          setTimeout(() => {
            handleBotMove(new Chess(fenAfter), nextMoves);
          }, 450);
        }
      } catch {
        //
      }
    },
    [chess, gameResult, moveHistory, blackPlayer.isBot, triggerGameOver]
  );

  // Bot Turn
  const handleBotMove = (currentChessInstance: Chess, currentMoves: MoveRecord[]) => {
    if (currentChessInstance.isGameOver()) return;
    try {
      const fenBefore = currentChessInstance.fen();
      const evalBefore = ChessEvaluator.evaluatePosition(currentChessInstance);
      const engineChoice = ChessEvaluator.getBestMove(currentChessInstance, 2);

      let botMove = null;
      if (engineChoice.bestMoveSan) {
        botMove = currentChessInstance.move(engineChoice.bestMoveSan);
      }
      if (!botMove) {
        const legal = currentChessInstance.moves({ verbose: true });
        if (legal.length > 0) botMove = currentChessInstance.move(legal[0]);
      }
      if (!botMove) return;

      const fenAfter = currentChessInstance.fen();
      const evalAfter = ChessEvaluator.evaluatePosition(currentChessInstance);

      if (currentChessInstance.isCheckmate()) {
        triggerGameOver('b', 'checkmate', 'Black wins by Checkmate! (0-1)');
      } else if (currentChessInstance.isCheck()) {
        soundService.playCheck();
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
        evalBefore,
        evalAfter,
        classification: 'best',
        coachComment: `${blackPlayer.name} plays ${botMove.san}.`,
      };

      const nextMoves = [...currentMoves, botRecord];
      setMoveHistory(nextMoves);
      setCurrentMoveIndex(nextMoves.length - 1);
      setEvalScore(evalAfter);
      setChess(new Chess(fenAfter));
    } catch {
      //
    }
  };

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

  const activeClassificationPin = useMemo(() => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moveHistory.length) return null;
    const m = moveHistory[currentMoveIndex];
    return m.classification ? { square: m.to, classification: m.classification } : null;
  }, [currentMoveIndex, moveHistory]);

  const lastMoveHighlight = useMemo(() => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moveHistory.length) return null;
    const m = moveHistory[currentMoveIndex];
    return { from: m.from, to: m.to };
  }, [currentMoveIndex, moveHistory]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#161512] text-zinc-100 select-none overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-14 px-4 lg:px-6 border-b border-[#262421] bg-[#1a1815] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#282622] transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lobby</span>
          </button>
          <span className="text-zinc-600">|</span>
          <span className="text-xs font-bold text-zinc-300">
            Game ID: <strong className="text-white font-mono">{gameId}</strong>
          </span>
        </div>

        <button
          onClick={() => router.push(`/game/review/${gameId}`)}
          className="px-4 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-black flex items-center gap-1.5 shadow transition-all cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>Game Review</span>
        </button>
      </header>

      {/* Main Playing Area */}
      <div className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
        <div className="flex flex-col xl:flex-row gap-6 w-full max-w-6xl items-center xl:items-start justify-center">
          {/* Board Column */}
          <div className="flex flex-col gap-2 w-full max-w-[600px] items-center">
            <NotationRibbon
              moves={moveHistory}
              currentMoveIndex={currentMoveIndex}
              onSelectMove={handleSelectHistoricalMove}
            />

            <div className="w-full max-w-[580px]">
              <PlayerCard
                player={blackPlayer}
                color="b"
                timeRemainingSeconds={blackTime}
                isActiveTurn={chess.turn() === 'b'}
              />
            </div>

            <div className="flex gap-2 w-full justify-center items-center">
              <EvalBar score={evalScore} orientation={orientation} isGameOver={Boolean(gameResult)} />
              <div className="flex-1 max-w-[580px]">
                <ChessBoard
                  chess={chess}
                  orientation={orientation}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleBoardMove}
                  lastMove={lastMoveHighlight}
                  activeClassification={activeClassificationPin}
                  disabled={Boolean(gameResult)}
                />
              </div>
            </div>

            <div className="w-full max-w-[580px]">
              <PlayerCard
                player={whitePlayer}
                color="w"
                timeRemainingSeconds={whiteTime}
                isActiveTurn={chess.turn() === 'w'}
              />
            </div>

            <MobileBottomBar
              onToggleMoves={() => {}}
              onToggleChat={() => {}}
              onOpenAnalysis={() => router.push(`/game/review/${gameId}`)}
              onPrevMove={() => currentMoveIndex > 0 && handleSelectHistoricalMove(currentMoveIndex - 1)}
              onNextMove={() => currentMoveIndex < moveHistory.length - 1 && handleSelectHistoricalMove(currentMoveIndex + 1)}
              canPrev={currentMoveIndex > 0}
              canNext={currentMoveIndex < moveHistory.length - 1}
            />
          </div>

          {/* Right Move List & Controls */}
          <div className="w-full max-w-[400px] flex flex-col gap-3 h-[700px]">
            <div className="flex-1 min-h-[220px]">
              <MoveHistory
                moves={moveHistory}
                currentMoveIndex={currentMoveIndex}
                onSelectMove={handleSelectHistoricalMove}
              />
            </div>

            <CoachCommentaryCard
              move={currentMoveIndex >= 0 ? moveHistory[currentMoveIndex] : null}
              turnColor={chess.turn()}
            />

            <div className="p-3 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between gap-2">
              <button
                onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>Flip</span>
              </button>
              <button
                onClick={() => triggerGameOver('draw', 'agreement', 'Draw by mutual agreement')}
                disabled={Boolean(gameResult) || moveHistory.length === 0}
                className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] disabled:opacity-40 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Handshake className="w-3.5 h-3.5" />
                <span>Draw</span>
              </button>
              <button
                onClick={() => triggerGameOver('b', 'resignation', 'White resigned')}
                disabled={Boolean(gameResult) || moveHistory.length === 0}
                className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] disabled:opacity-40 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Resign</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal -> Navigates to /game/review/[id] */}
      {resultDetails && (
        <GameOverModal
          isOpen={isGameOverModalOpen}
          onClose={() => setIsGameOverModalOpen(false)}
          result={resultDetails}
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
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
          }}
          onNewGame={() => router.push('/play')}
        />
      )}
    </div>
  );
}
