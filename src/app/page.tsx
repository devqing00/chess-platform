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
} from '@/types/chess';
import { CHESS_BOTS } from '@/lib/botsData';
import { ChessEvaluator } from '@/lib/chessEngine';
import { soundService } from '@/lib/audioService';

// Components
import { SidebarNav, ActiveTab } from '@/components/sidebar/SidebarNav';
import { ChessBoard } from '@/components/board/ChessBoard';
import { EvalBar } from '@/components/board/EvalBar';
import { PlayerCard } from '@/components/game/PlayerCard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { CoachCommentaryCard } from '@/components/analysis/CoachCommentaryCard';
import { GameReviewModal } from '@/components/analysis/GameReviewModal';
import { BotChatBubble } from '@/components/bots/BotChatBubble';
import { BotSelector } from '@/components/bots/BotSelector';
import { PuzzleArena } from '@/components/puzzles/PuzzleArena';
import { OpeningExplorer } from '@/components/openings/OpeningExplorer';
import { HistoricalGamesViewer } from '@/components/historical/HistoricalGamesViewer';
import { SoloChessArena } from '@/components/variants/SoloChessArena';
import { PubApiExplorer } from '@/components/pubapi/PubApiExplorer';
import { MembershipModal } from '@/components/modals/MembershipModal';
import { SettingsModal } from '@/components/modals/SettingsModal';

import {
  RotateCcw,
  Flag,
  Handshake,
  ArrowUpDown,
  Award,
  Swords,
  Users,
  Compass,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ChessPlatformPage() {
  // Navigation & User State
  const [activeTab, setActiveTab] = useState<ActiveTab>('play');
  const [membership, setMembership] = useState<MembershipTier>('diamond'); // Diamond unlocks full AI coach & review
  const [boardTheme, setBoardTheme] = useState<BoardTheme>('green');
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>('neo');
  const [soundTheme, setSoundTheme] = useState<SoundTheme>('classic');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modals
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isMembershipModalOpen, setIsMembershipModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Game Settings & Players
  const [gameMode, setGameMode] = useState<'vs_bot' | 'pass_and_play' | 'analysis'>('vs_bot');
  const [selectedBot, setSelectedBot] = useState<BotPersonality>(CHESS_BOTS[0]); // Martin
  const [orientation, setOrientation] = useState<PieceColor>('w');
  const [timeControl, setTimeControl] = useState<number>(600); // 10 minutes default (0 = unlimited)

  // Chess Engine & Moves
  const [chess, setChess] = useState<Chess>(() => new Chess());
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1);
  const [evalScore, setEvalScore] = useState<number>(0);
  const [gameResult, setGameResult] = useState<string | null>(null);

  // Clocks
  const [whiteTime, setWhiteTime] = useState<number>(600);
  const [blackTime, setBlackTime] = useState<number>(600);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);

  // In-Game Bot Banter
  const [botMessage, setBotMessage] = useState<string>('');

  // Players Profile
  const whitePlayer: GamePlayer = useMemo(
    () => ({
      id: 'player-1',
      name: 'You',
      rating: 1250,
      avatar: '🧑‍💻',
      country: 'US',
    }),
    []
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
        // captured piece belongs to opponent
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

  // Clocks countdown ticker
  useEffect(() => {
    if (!isClockRunning || timeControl === 0 || gameResult) return;

    const timer = setInterval(() => {
      if (chess.turn() === 'w') {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            setGameResult('Black wins on time! (0-1)');
            soundService.playCheckmate();
            setIsClockRunning(false);
            return 0;
          }
          if (prev === 20) soundService.playLowTime();
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            setGameResult('White wins on time! (1-0)');
            soundService.playCheckmate();
            setIsClockRunning(false);
            return 0;
          }
          if (prev === 20) soundService.playLowTime();
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isClockRunning, timeControl, gameResult, chess]);

  // Initialize new game
  const startNewGame = useCallback(() => {
    const newChess = new Chess();
    setChess(newChess);
    setMoveHistory([]);
    setCurrentMoveIndex(-1);
    setEvalScore(0);
    setGameResult(null);
    setWhiteTime(timeControl);
    setBlackTime(timeControl);
    setIsClockRunning(false);
    soundService.playGameStart();

    if (gameMode === 'vs_bot') {
      const startQuotes = selectedBot.quotes.gameStart;
      setBotMessage(startQuotes[Math.floor(Math.random() * startQuotes.length)]);
    } else {
      setBotMessage('');
    }
  }, [timeControl, gameMode, selectedBot]);

  // Execute a move on the board
  const handleBoardMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (gameResult) return;

    try {
      const fenBefore = chess.fen();
      const evalBefore = ChessEvaluator.evaluatePosition(chess);
      const turnBefore = chess.turn();

      // Check if move is legal
      const move = chess.move({ from, to, promotion: promotion || 'q' });
      if (!move) return;

      setIsClockRunning(true);

      const fenAfter = chess.fen();
      const evalAfter = ChessEvaluator.evaluatePosition(chess);

      // Best move according to engine
      const bestMoveResult = ChessEvaluator.getBestMove(chess, 2);
      const { classification, comment } = ChessEvaluator.classifyMove(
        move.san,
        bestMoveResult.bestMoveSan,
        evalBefore,
        evalAfter,
        turnBefore,
        Boolean(move.captured),
        chess.isCheck()
      );

      // Play audio cues
      if (chess.isCheckmate()) {
        soundService.playCheckmate();
        setGameResult(turnBefore === 'w' ? 'White wins by Checkmate! (1-0)' : 'Black wins by Checkmate! (0-1)');
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      } else if (chess.isDraw() || chess.isStalemate()) {
        soundService.playMove();
        setGameResult('Game drawn by stalemate or insufficient material! (½-½)');
      } else if (chess.isCheck()) {
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
        bestMoveSan: bestMoveResult.bestMoveSan,
      };

      const nextMoves = [...moveHistory, newRecord];
      setMoveHistory(nextMoves);
      setCurrentMoveIndex(nextMoves.length - 1);
      setEvalScore(evalAfter);
      setChess(new Chess(fenAfter));

      // Bot dialogue banter & response
      if (gameMode === 'vs_bot' && !chess.isGameOver()) {
        // Trigger bot comment
        if (classification === 'blunder' || classification === 'mistake') {
          const quotes = selectedBot.quotes.blunder;
          setBotMessage(quotes[Math.floor(Math.random() * quotes.length)]);
        } else if (classification === 'brilliant' || classification === 'great') {
          const quotes = selectedBot.quotes.goodMove;
          setBotMessage(quotes[Math.floor(Math.random() * quotes.length)]);
        }

        // Schedule Bot Turn with human-like delay
        setTimeout(() => {
          handleBotMove(new Chess(fenAfter), nextMoves);
        }, 500);
      }
    } catch {
      // Invalid move
    }
  };

  // Bot AI Response Move
  const handleBotMove = (currentChessInstance: Chess, currentMoves: MoveRecord[]) => {
    if (currentChessInstance.isGameOver()) return;

    try {
      const fenBefore = currentChessInstance.fen();
      const evalBefore = ChessEvaluator.evaluatePosition(currentChessInstance);
      const turnBefore = currentChessInstance.turn();

      // Search depth based on bot rating
      const depth = selectedBot.rating >= 2200 ? 3 : selectedBot.rating >= 1300 ? 2 : 1;
      const engineChoice = ChessEvaluator.getBestMove(currentChessInstance, depth);

      let botMove = null;
      if (engineChoice.bestMoveSan) {
        botMove = currentChessInstance.move(engineChoice.bestMoveSan);
      }

      // Fallback to random legal move if search returned null (e.g. beginner bots)
      if (!botMove) {
        const legal = currentChessInstance.moves({ verbose: true });
        if (legal.length > 0) {
          botMove = currentChessInstance.move(legal[Math.floor(Math.random() * legal.length)]);
        }
      }

      if (!botMove) return;

      const fenAfter = currentChessInstance.fen();
      const evalAfter = ChessEvaluator.evaluatePosition(currentChessInstance);

      if (currentChessInstance.isCheckmate()) {
        soundService.playCheckmate();
        setGameResult('Black wins by Checkmate! (0-1)');
        const winQuotes = selectedBot.quotes.win;
        setBotMessage(winQuotes[Math.floor(Math.random() * winQuotes.length)]);
      } else if (currentChessInstance.isCheck()) {
        soundService.playCheck();
        const checkQuotes = selectedBot.quotes.check;
        setBotMessage(checkQuotes[Math.floor(Math.random() * checkQuotes.length)]);
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
        coachComment: `${selectedBot.name} plays ${botMove.san}.`,
      };

      const updatedHistory = [...currentMoves, botRecord];
      setMoveHistory(updatedHistory);
      setCurrentMoveIndex(updatedHistory.length - 1);
      setEvalScore(evalAfter);
      setChess(new Chess(fenAfter));
    } catch {
      //
    }
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

  // Resign & Draw actions
  const handleResign = () => {
    if (gameResult) return;
    const winner = orientation === 'w' ? 'Black' : 'White';
    setGameResult(`${winner} wins by resignation!`);
    soundService.playCheckmate();
  };

  const handleOfferDraw = () => {
    if (gameResult) return;
    setGameResult('Game drawn by mutual agreement! (½-½)');
  };

  // Last Move highlight
  const lastMoveHighlight = useMemo(() => {
    if (currentMoveIndex < 0 || currentMoveIndex >= moveHistory.length) return null;
    const m = moveHistory[currentMoveIndex];
    return { from: m.from, to: m.to };
  }, [currentMoveIndex, moveHistory]);

  const activeCommentaryMove = currentMoveIndex >= 0 ? moveHistory[currentMoveIndex] : null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#161512] text-zinc-100 font-sans">
      {/* Iconic Left Navigation Sidebar */}
      <SidebarNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'analysis') {
            setGameMode('analysis');
          }
        }}
        membership={membership}
        onOpenMembershipModal={() => setIsMembershipModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
      />

      {/* Main Center Area */}
      <main className="flex-1 h-full overflow-y-auto bg-[#161512] flex flex-col">
        {/* Top Quick Bar (Online status, VIP badge, Game Modes) */}
        <header className="h-14 px-6 border-b border-[#262421] bg-[#1a1815] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#81b64c] animate-pulse" />
              142,890 Players Online
            </span>
            <span className="text-zinc-600">|</span>
            <span className="text-xs font-semibold text-zinc-400 capitalize">
              Mode: <strong className="text-white">{gameMode.replace('_', ' ')}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-[#272522] hover:bg-[#33302b] text-xs font-bold text-zinc-200 border border-[#3b3833] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Award className="w-4 h-4 text-[#81b64c]" />
              <span>Game Review</span>
            </button>

            <button
              onClick={() => setIsMembershipModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="capitalize">{membership} VIP</span>
            </button>
          </div>
        </header>

        {/* View Switcher based on active tab */}
        <div className="flex-1 p-4 lg:p-6 flex items-center justify-center">
          {activeTab === 'play' && (
            <div className="flex flex-col xl:flex-row gap-6 w-full max-w-6xl items-center xl:items-start justify-center">
              {/* Eval Bar + Chess Board + Players Column */}
              <div className="flex flex-col gap-2 w-full max-w-[620px]">
                {/* Top Player Card (Black by default) */}
                <PlayerCard
                  player={orientation === 'w' ? blackPlayer : whitePlayer}
                  color={orientation === 'w' ? 'b' : 'w'}
                  timeRemainingSeconds={orientation === 'w' ? blackTime : whiteTime}
                  isActiveTurn={chess.turn() === (orientation === 'w' ? 'b' : 'w')}
                  capturedPieces={orientation === 'w' ? blackCaptures : whiteCaptures}
                  materialAdvantage={orientation === 'w' ? -materialDiff : materialDiff}
                />

                {/* Board Area with Eval Bar on Left */}
                <div className="flex gap-2 w-full justify-center items-center">
                  {/* Dynamic Eval Bar */}
                  <EvalBar
                    score={evalScore}
                    orientation={orientation}
                    isGameOver={Boolean(gameResult)}
                  />

                  {/* ChessBoard */}
                  <div className="flex-1 max-w-[580px]">
                    <ChessBoard
                      chess={chess}
                      orientation={orientation}
                      boardTheme={boardTheme}
                      pieceTheme={pieceTheme}
                      onMove={handleBoardMove}
                      lastMove={lastMoveHighlight}
                      disabled={Boolean(gameResult)}
                    />
                  </div>
                </div>

                {/* Bottom Player Card (White by default) */}
                <PlayerCard
                  player={orientation === 'w' ? whitePlayer : blackPlayer}
                  color={orientation === 'w' ? 'w' : 'b'}
                  timeRemainingSeconds={orientation === 'w' ? whiteTime : blackTime}
                  isActiveTurn={chess.turn() === (orientation === 'w' ? 'w' : 'b')}
                  capturedPieces={orientation === 'w' ? whiteCaptures : blackCaptures}
                  materialAdvantage={orientation === 'w' ? materialDiff : -materialDiff}
                />
              </div>

              {/* Right Game Controls & Notation Column */}
              <div className="w-full max-w-[420px] flex flex-col gap-3 h-[680px]">
                {/* Mode Selector & Time Controls */}
                <div className="p-3 bg-[#21201d] rounded-xl border border-[#302e2b] flex flex-col gap-2.5">
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => {
                        setGameMode('vs_bot');
                        startNewGame();
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        gameMode === 'vs_bot'
                          ? 'bg-[#81b64c] text-white shadow'
                          : 'bg-[#2b2926] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>vs Bot</span>
                    </button>
                    <button
                      onClick={() => {
                        setGameMode('pass_and_play');
                        startNewGame();
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        gameMode === 'pass_and_play'
                          ? 'bg-[#81b64c] text-white shadow'
                          : 'bg-[#2b2926] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Pass & Play</span>
                    </button>
                    <button
                      onClick={() => {
                        setGameMode('analysis');
                        startNewGame();
                      }}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        gameMode === 'analysis'
                          ? 'bg-[#81b64c] text-white shadow'
                          : 'bg-[#2b2926] text-zinc-400 hover:text-white'
                      }`}
                    >
                      <Compass className="w-3.5 h-3.5" />
                      <span>Analysis</span>
                    </button>
                  </div>

                  {/* Time Control Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#302e2b] text-xs">
                    <span className="text-zinc-400 font-semibold">Time:</span>
                    <div className="flex gap-1 font-mono font-bold">
                      {[
                        { sec: 60, label: '1 min' },
                        { sec: 180, label: '3 min' },
                        { sec: 600, label: '10 min' },
                        { sec: 0, label: 'No Limit' },
                      ].map((tc) => (
                        <button
                          key={tc.sec}
                          onClick={() => {
                            setTimeControl(tc.sec);
                            setWhiteTime(tc.sec);
                            setBlackTime(tc.sec);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                            timeControl === tc.sec
                              ? 'bg-zinc-200 text-black font-extrabold'
                              : 'bg-[#161512] text-zinc-400 hover:text-white'
                          }`}
                        >
                          {tc.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bot Banter Bubble */}
                {gameMode === 'vs_bot' && botMessage && (
                  <BotChatBubble bot={selectedBot} message={botMessage} />
                )}

                {/* Game Result Banner */}
                {gameResult && (
                  <div className="p-3 bg-gradient-to-r from-emerald-600/30 to-emerald-900/30 border border-emerald-500/50 rounded-xl flex items-center justify-between text-xs font-bold text-white shadow animate-in fade-in">
                    <span>{gameResult}</span>
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-[#81b64c] text-black text-xs font-black cursor-pointer hover:bg-[#72a342]"
                    >
                      Review
                    </button>
                  </div>
                )}

                {/* Move History Table */}
                <div className="flex-1 min-h-[160px]">
                  <MoveHistory
                    moves={moveHistory}
                    currentMoveIndex={currentMoveIndex}
                    onSelectMove={handleSelectHistoricalMove}
                  />
                </div>

                {/* Coach Danny AI Commentary Card */}
                <CoachCommentaryCard
                  move={activeCommentaryMove}
                  turnColor={chess.turn()}
                />

                {/* Bottom Action Controls */}
                <div className="p-2.5 bg-[#21201d] rounded-xl border border-[#302e2b] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                    className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Flip Board"
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>Flip</span>
                  </button>

                  <button
                    onClick={handleOfferDraw}
                    disabled={Boolean(gameResult) || moveHistory.length === 0}
                    className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] disabled:opacity-40 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Handshake className="w-3.5 h-3.5" />
                    <span>Draw</span>
                  </button>

                  <button
                    onClick={handleResign}
                    disabled={Boolean(gameResult) || moveHistory.length === 0}
                    className="p-2 rounded-lg bg-[#2b2926] hover:bg-[#383530] disabled:opacity-40 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>Resign</span>
                  </button>

                  <button
                    onClick={startNewGame}
                    className="ml-auto px-4 py-2 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Game</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'puzzles' && (
            <PuzzleArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
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
                  onClick={() => setIsReviewModalOpen(true)}
                  className="px-4 py-1.5 rounded-lg bg-[#81b64c] hover:bg-[#72a342] text-white text-xs font-bold cursor-pointer"
                >
                  Generate Full Game Review Report
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
            <SoloChessArena boardTheme={boardTheme} pieceTheme={pieceTheme} />
          )}

          {activeTab === 'pubapi' && <PubApiExplorer />}
        </div>
      </main>

      {/* Game Review Report Modal */}
      <GameReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        moves={moveHistory}
        whitePlayerName={whitePlayer.name}
        blackPlayerName={blackPlayer.name}
      />

      {/* Membership Upgrade Modal */}
      <MembershipModal
        isOpen={isMembershipModalOpen}
        onClose={() => setIsMembershipModalOpen(false)}
        currentTier={membership}
        onSelectTier={(tier) => setMembership(tier)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        boardTheme={boardTheme}
        onChangeBoardTheme={(t) => setBoardTheme(t)}
        pieceTheme={pieceTheme}
        onChangePieceTheme={(t) => setPieceTheme(t)}
        soundTheme={soundTheme}
        onChangeSoundTheme={(t) => setSoundTheme(t)}
        soundEnabled={soundEnabled}
        onToggleSound={(en) => {
          setSoundEnabled(en);
          soundService.setEnabled(en);
        }}
      />
    </div>
  );
}
