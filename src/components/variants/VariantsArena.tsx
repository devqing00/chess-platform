'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chess, Square, PieceSymbol } from 'chess.js';
import { ChessBoard } from '../board/ChessBoard';
import { PieceIcon } from '../board/PieceIcons';
import {
  VariantsEngine,
  VariantGameState,
  CrazyhousePocket,
} from '@/lib/server/variantsEngine';
import {
  ChessVariant,
  BoardTheme,
  PieceTheme,
  PieceType,
} from '@/types/chess';
import { soundService } from '@/lib/audioService';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import {
  Crown,
  Zap,
  Boxes,
  Dices,
  RotateCcw,
  Bot,
  User,
  Sparkles,
  Trophy,
  HelpCircle,
  Play,
  Swords,
  Copy,
  Check,
  Shield,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface VariantsArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

type VariantSubScreen = 'arena' | 'rules' | 'bot_spar' | 'history';

interface VariantMeta {
  id: ChessVariant;
  name: string;
  tag: string;
  description: string;
  winCondition: string;
  proTip: string;
  badgeColor: string;
}

const VARIANT_DETAILS: Record<ChessVariant, VariantMeta> = {
  kingofthehill: {
    id: 'kingofthehill',
    name: 'King of the Hill',
    tag: 'Center Conquest',
    description: 'Rush your King into the center of the board. The first player whose King touches d4, e4, d5, or e5 wins instantly!',
    winCondition: 'Occupy d4, e4, d5, or e5 with your King, or deliver standard checkmate.',
    proTip: 'Clear central files early and use minor pieces to build an impenetrable royal escort staircase.',
    badgeColor: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
  },
  '3check': {
    id: '3check',
    name: '3-Check',
    tag: 'Check Countdown',
    description: 'Every check counts! The first player to deliver 3 checks to the enemy King wins the match immediately.',
    winCondition: 'Deliver 3 checks (+3) to the enemy King, or deliver standard checkmate.',
    proTip: 'Material sacrifices that gain checks are frequently game-winning. Never leave your King uncastled.',
    badgeColor: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
  },
  crazyhouse: {
    id: 'crazyhouse',
    name: 'Crazyhouse',
    tag: 'Pocket Drop Reserves',
    description: 'Captured pieces change to your color and enter your reserve pocket! Drop them onto any empty square on your turn.',
    winCondition: 'Deliver checkmate using standard moves and reserve piece drops.',
    proTip: 'Defensive pawn drops plug dangerous diagonals, while knights dropped directly into enemy lines create lethal forks.',
    badgeColor: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
  },
  chess960: {
    id: 'chess960',
    name: 'Chess960 (Fischer Random)',
    tag: 'Scharnagl Index 0–959',
    description: 'Back rank pieces are randomly arranged using official Scharnagl positions. Pure chess creativity from move 1!',
    winCondition: 'Standard checkmate or resignation. Zero opening book memorization.',
    proTip: 'Scout vulnerable unprotected pawns (especially on a2/b2 or g2/h2) before playing your first pawn move.',
    badgeColor: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
  },
  standard: {
    id: 'standard',
    name: 'Standard Chess',
    tag: 'FIDE Classic',
    description: 'Traditional chess with standard starting position and checkmate victory.',
    winCondition: 'Checkmate, time out, or resignation.',
    proTip: 'Control the center, develop minor pieces, and secure king safety.',
    badgeColor: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  },
  solochess: {
    id: 'solochess',
    name: 'Solo Chess',
    tag: 'Single-Player Tactics',
    description: 'Capture pieces until only one piece remains on the board.',
    winCondition: 'Reduce the board to exactly one piece.',
    proTip: 'Work backward from the final target square.',
    badgeColor: 'text-blue-400 bg-blue-500/15 border-blue-500/30',
  },
};

const POCKET_PIECE_TYPES: (keyof CrazyhousePocket)[] = ['q', 'r', 'b', 'n', 'p'];

export const VariantsArena: React.FC<VariantsArenaProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [activeScreen, setActiveScreen] = useState<VariantSubScreen>('arena');
  const [activeVariant, setActiveVariant] = useState<ChessVariant>('kingofthehill');
  const [gameState, setGameState] = useState<VariantGameState>(() =>
    VariantsEngine.initVariantGame('kingofthehill')
  );
  const [chessInstance, setChessInstance] = useState(() => new Chess(gameState.fen));
  const [vsBot, setVsBot] = useState(true);
  const [botDifficulty, setBotDifficulty] = useState<'casual' | 'club' | 'master'>('club');
  const [selected960Index, setSelected960Index] = useState<number>(518);
  const [activeDropPiece, setActiveDropPiece] = useState<keyof CrazyhousePocket | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState<'w' | 'b'>('w');
  const [copiedFen, setCopiedFen] = useState(false);

  // Synchronize internal chess.js instance whenever FEN changes
  useEffect(() => {
    try {
      setChessInstance(new Chess(gameState.fen));
    } catch {
      // ignore
    }
  }, [gameState.fen]);

  // Reset or switch variant
  const handleSelectVariant = (variant: ChessVariant) => {
    setActiveVariant(variant);
    setActiveDropPiece(null);
    setMoveHistory([]);
    setLastMoveSquares(null);

    const initial = VariantsEngine.initVariantGame(
      variant,
      variant === 'chess960' ? selected960Index : undefined
    );
    setGameState(initial);
    if (initial.chess960Index !== undefined) {
      setSelected960Index(initial.chess960Index);
    }
    soundService.playMove();
  };

  // Roll random 960 position
  const handleRandomize960 = () => {
    const randomIndex = Math.floor(Math.random() * 960);
    setSelected960Index(randomIndex);
    setActiveDropPiece(null);
    setMoveHistory([]);
    setLastMoveSquares(null);
    const initial = VariantsEngine.initVariantGame('chess960', randomIndex);
    setGameState(initial);
    soundService.playMove();
  };

  // Set specific 960 index
  const handleSet960Index = (idx: number) => {
    if (idx < 0 || idx > 959) return;
    setSelected960Index(idx);
    setActiveDropPiece(null);
    setMoveHistory([]);
    setLastMoveSquares(null);
    const initial = VariantsEngine.initVariantGame('chess960', idx);
    setGameState(initial);
    soundService.playMove();
  };

  // Restart current game
  const handleRestartGame = () => {
    setActiveDropPiece(null);
    setMoveHistory([]);
    setLastMoveSquares(null);
    const initial = VariantsEngine.initVariantGame(
      activeVariant,
      activeVariant === 'chess960' ? selected960Index : undefined
    );
    setGameState(initial);
    soundService.playMove();
  };

  // Game over sound & celebration
  const handleGameOver = (state: VariantGameState) => {
    if (state.winner === 'w') {
      soundService.playGameEndWin();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    } else if (state.winner === 'b') {
      soundService.playGameEndLoss();
    } else {
      soundService.playGameEndDraw();
    }
  };

  // Trigger bot reply
  const triggerBotReply = useCallback(
    (currentState: VariantGameState) => {
      if (!vsBot || currentState.isGameOver || currentState.turn !== 'b') return;

      setIsBotThinking(true);
      const thinkDelay = botDifficulty === 'casual' ? 250 : botDifficulty === 'club' ? 450 : 700;

      setTimeout(() => {
        try {
          const botMove = VariantsEngine.generateVariantBotMove(currentState);
          if (!botMove) {
            setIsBotThinking(false);
            return;
          }

          if (botMove.type === 'move' && botMove.from && botMove.to) {
            const res = VariantsEngine.playMove(
              currentState,
              botMove.from,
              botMove.to,
              botMove.promotion
            );
            setGameState(res.nextState);
            setMoveHistory((prev) => [...prev, res.san]);
            setLastMoveSquares({ from: botMove.from, to: botMove.to });

            if (res.nextState.isGameOver) {
              handleGameOver(res.nextState);
            } else if (res.captured) {
              soundService.playCapture();
            } else {
              soundService.playMove();
            }
          } else if (botMove.type === 'drop' && botMove.pieceType && botMove.to) {
            const res = VariantsEngine.playCrazyhouseDrop(
              currentState,
              botMove.pieceType,
              botMove.to
            );
            setGameState(res.nextState);
            setMoveHistory((prev) => [...prev, res.san]);
            setLastMoveSquares(null);

            if (res.nextState.isGameOver) {
              handleGameOver(res.nextState);
            } else {
              soundService.playMove();
            }
          }
        } catch {
          // ignore error
        } finally {
          setIsBotThinking(false);
        }
      }, thinkDelay);
    },
    [vsBot, botDifficulty]
  );

  // Regular board move handler
  const handleBoardMove = (from: Square, to: Square, promotion?: PieceSymbol) => {
    if (gameState.isGameOver || isBotThinking) return;

    try {
      const res = VariantsEngine.playMove(gameState, from, to, promotion);
      setGameState(res.nextState);
      setMoveHistory((prev) => [...prev, res.san]);
      setLastMoveSquares({ from, to });
      setActiveDropPiece(null);

      if (res.nextState.isGameOver) {
        handleGameOver(res.nextState);
        return;
      }

      if (res.captured) {
        soundService.playCapture();
      } else {
        soundService.playMove();
      }

      if (vsBot && res.nextState.turn === 'b') {
        triggerBotReply(res.nextState);
      }
    } catch {
      // Illegal move
    }
  };

  // Crazyhouse Drop square click handler
  const handleDropSquareClick = (sq: Square): boolean => {
    if (!activeDropPiece || gameState.variant !== 'crazyhouse' || gameState.isGameOver) {
      return false;
    }

    try {
      const legalSquares = VariantsEngine.getLegalDropSquares(gameState, activeDropPiece);
      if (!legalSquares.includes(sq)) {
        return false;
      }

      const res = VariantsEngine.playCrazyhouseDrop(gameState, activeDropPiece, sq);
      setGameState(res.nextState);
      setMoveHistory((prev) => [...prev, res.san]);
      setActiveDropPiece(null);
      setLastMoveSquares(null);

      if (res.nextState.isGameOver) {
        handleGameOver(res.nextState);
        return true;
      }

      soundService.playMove();

      if (vsBot && res.nextState.turn === 'b') {
        triggerBotReply(res.nextState);
      }
      return true;
    } catch {
      return false;
    }
  };

  // Dynamic Highlights on board
  const boardHighlights = useMemo(() => {
    const list: { square: Square; color?: string; label?: string; border?: string }[] = [];

    // King of the Hill center hill glow
    if (activeVariant === 'kingofthehill') {
      const hillSquares: Square[] = ['d4', 'e4', 'd5', 'e5'];
      hillSquares.forEach((sq) => {
        list.push({
          square: sq,
          color: 'rgba(234, 179, 8, 0.32)',
          border: 'border-2 border-amber-400/80 rounded-sm shadow-[0_0_12px_rgba(234,179,8,0.45)]',
          label: '👑',
        });
      });
    }

    // Crazyhouse Legal Drop targets
    if (activeVariant === 'crazyhouse' && activeDropPiece) {
      const legalDropSquares = VariantsEngine.getLegalDropSquares(gameState, activeDropPiece);
      legalDropSquares.forEach((sq) => {
        list.push({
          square: sq,
          color: 'rgba(52, 211, 153, 0.35)',
          border: 'border-2 border-emerald-400 rounded-full animate-pulse',
          label: '•',
        });
      });
    }

    return list;
  }, [activeVariant, activeDropPiece, gameState]);

  // Distance of king to hill in KOTH
  const kothKingDistances = useMemo(() => {
    if (activeVariant !== 'kingofthehill') return null;
    const b = chessInstance.board();
    let whiteKingSq: [number, number] | null = null;
    let blackKingSq: [number, number] | null = null;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = b[r][c];
        if (piece && piece.type === 'k') {
          if (piece.color === 'w') whiteKingSq = [r, c];
          else blackKingSq = [r, c];
        }
      }
    }

    const calcMinDist = (pos: [number, number] | null) => {
      if (!pos) return 99;
      const centerRows = [3, 4];
      const centerCols = [3, 4];
      let minD = 99;
      centerRows.forEach((cr) => {
        centerCols.forEach((cc) => {
          const d = Math.max(Math.abs(pos[0] - cr), Math.abs(pos[1] - cc));
          if (d < minD) minD = d;
        });
      });
      return minD;
    };

    return {
      whiteDist: calcMinDist(whiteKingSq),
      blackDist: calcMinDist(blackKingSq),
    };
  }, [activeVariant, chessInstance]);

  const currentVariantMeta = VARIANT_DETAILS[activeVariant] || VARIANT_DETAILS.kingofthehill;

  const handleCopyFen = () => {
    navigator.clipboard.writeText(gameState.fen);
    setCopiedFen(true);
    soundService.playMove();
    setTimeout(() => setCopiedFen(false), 2000);
  };

  return (
    <div className="w-full min-h-full lg:h-full lg:max-h-full overflow-y-auto lg:overflow-hidden flex flex-col min-h-0 bg-[#161512] text-zinc-100 select-none pb-24 md:pb-6">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER / NAVIGATION BAR (Zero-Conflict Responsive Bar)                  */}
      {/* ----------------------------------------------------------------------- */}
      <header className="border-b border-white/5 shrink-0 bg-[#141311] flex flex-col md:flex-row md:items-center md:justify-between px-3 sm:px-6 py-2 md:py-0 md:h-14 gap-2">
        <div className="flex items-center justify-between gap-2.5 sm:gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-rose-400" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white truncate">
                Variants Arena
              </h1>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${currentVariantMeta.badgeColor}`}>
                {currentVariantMeta.name}
              </span>
            </div>
          </div>
        </div>

        {/* 4-Screen Segmented Switcher */}
        <div className="flex items-center bg-[#1c1a17] p-1 rounded-xl border border-white/5 overflow-x-auto scrollbar-none w-full md:w-auto">
          <button
            onClick={() => setActiveScreen('arena')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
              activeScreen === 'arena'
                ? 'bg-[#81b64c] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Arena
          </button>
          <button
            onClick={() => setActiveScreen('rules')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
              activeScreen === 'rules'
                ? 'bg-[#81b64c] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="hidden sm:inline">Rules &amp; Strategy</span>
            <span className="sm:hidden">Rules</span>
          </button>
          <button
            onClick={() => setActiveScreen('bot_spar')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
              activeScreen === 'bot_spar'
                ? 'bg-[#81b64c] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span className="hidden sm:inline">Bot Sparring</span>
            <span className="sm:hidden">Bot Spar</span>
          </button>
          <button
            onClick={() => setActiveScreen('history')}
            className={`flex-1 md:flex-initial px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap text-center ${
              activeScreen === 'history'
                ? 'bg-[#81b64c] text-black shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Moves ({moveHistory.length})
          </button>
        </div>
      </header>

      {/* ----------------------------------------------------------------------- */}
      {/* MAIN VIEWPORT BODY                                                      */}
      {/* ----------------------------------------------------------------------- */}
      <main className="flex-1 min-h-0 p-2 sm:p-4 overflow-hidden">
        {/* SUB-SCREEN 1: LIVE ARENA */}
        {activeScreen === 'arena' && (
          <div className="h-full flex flex-col lg:flex-row items-center justify-center gap-3 sm:gap-6 animate-in fade-in duration-150">
            {/* Left/Center: Viewport-scaling Chessboard & Variant HUD */}
            <div className="flex flex-col items-center justify-center h-full max-h-full min-h-0 w-full lg:w-auto">
              {/* Crazyhouse Black Pocket Tray */}
              {activeVariant === 'crazyhouse' && (
                <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-700 border border-black" />
                    <span className="text-[10px] font-bold uppercase text-zinc-400">Black Pocket</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {POCKET_PIECE_TYPES.map((pt) => {
                      const count = gameState.blackPocket[pt] || 0;
                      return (
                        <div
                          key={`bp-${pt}`}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center relative bg-black/30 border border-white/5 ${
                            count === 0 ? 'opacity-30' : 'opacity-90'
                          }`}
                        >
                          <div className="w-4 h-4">
                            <PieceIcon type={pt as PieceType} color="b" theme={pieceTheme} />
                          </div>
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-zinc-600 text-[9px] font-mono font-bold px-1 rounded-full text-white">
                              {count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3-Check Indicator Bar */}
              {activeVariant === '3check' && (
                <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-cyan-500/20 rounded-xl flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[11px] font-bold text-zinc-300">White Checks:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((num) => (
                        <span
                          key={`wc-${num}`}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${
                            gameState.whiteChecksGiven >= num
                              ? 'bg-cyan-500 border-cyan-400 text-black font-black'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}
                        >
                          {gameState.whiteChecksGiven >= num ? '✓' : num}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-zinc-300">Black Checks:</span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((num) => (
                        <span
                          key={`bc-${num}`}
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black border ${
                            gameState.blackChecksGiven >= num
                              ? 'bg-cyan-500 border-cyan-400 text-black font-black'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                          }`}
                        >
                          {gameState.blackChecksGiven >= num ? '✓' : num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* King of the Hill HUD */}
              {activeVariant === 'kingofthehill' && kothKingDistances && (
                <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-amber-500/20 rounded-xl flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide">
                      Hill: d4, e4, d5, e5
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-zinc-300">
                      W King: <strong className="text-amber-400 font-black">{kothKingDistances.whiteDist}</strong> sq
                    </span>
                    <span className="text-zinc-600">|</span>
                    <span className="text-zinc-300">
                      B King: <strong className="text-amber-400 font-black">{kothKingDistances.blackDist}</strong> sq
                    </span>
                  </div>
                </div>
              )}

              {/* Chess960 Active Seed HUD */}
              {activeVariant === 'chess960' && (
                <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mb-1 bg-[#1a1815] border border-rose-500/20 rounded-xl flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2">
                    <Dices className="w-3.5 h-3.5 text-rose-400" />
                    <span className="text-[11px] font-bold text-zinc-300">
                      Scharnagl Seed: <strong className="text-rose-400">#{selected960Index}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                      {VariantsEngine.generateChess960BackRank(selected960Index).join(' ')}
                    </span>
                    <button
                      onClick={handleRandomize960}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 transition-all cursor-pointer"
                    >
                      Roll
                    </button>
                  </div>
                </div>
              )}

              {/* Viewport-Locked Chessboard Component */}
              <div className="w-[min(100%,calc(100vh-220px),560px)] aspect-square relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shrink-0">
                <ChessBoard
                  chess={chessInstance}
                  orientation={boardOrientation}
                  boardTheme={boardTheme}
                  pieceTheme={pieceTheme}
                  onMove={handleBoardMove}
                  lastMove={lastMoveSquares}
                  customSquareHighlights={boardHighlights}
                  onCustomSquareClick={handleDropSquareClick}
                  disabled={gameState.isGameOver || isBotThinking}
                />
              </div>

              {/* Crazyhouse White Pocket Tray */}
              {activeVariant === 'crazyhouse' && (
                <div className="w-[min(100%,calc(100vh-230px),560px)] px-3 py-1.5 mt-1 bg-[#1a1815] border border-white/5 rounded-xl flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-black shadow" />
                    <span className="text-[10px] font-bold uppercase text-zinc-300">White Pocket</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {POCKET_PIECE_TYPES.map((pt) => {
                      const count = gameState.whitePocket[pt] || 0;
                      const isSelected = activeDropPiece === pt;
                      const canDrop = count > 0 && gameState.turn === 'w' && !gameState.isGameOver;

                      return (
                        <button
                          key={`wp-${pt}`}
                          type="button"
                          disabled={!canDrop}
                          onClick={() => {
                            if (isSelected) {
                              setActiveDropPiece(null);
                            } else {
                              setActiveDropPiece(pt);
                              soundService.playMove();
                            }
                          }}
                          className={`relative flex items-center justify-center w-8 h-8 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#81b64c]/30 border-[#81b64c] shadow-sm -translate-y-0.5'
                              : canDrop
                              ? 'bg-[#22201d] border-white/10 hover:border-[#81b64c] text-white hover:-translate-y-0.5'
                              : 'bg-black/20 border-white/5 opacity-30 cursor-not-allowed'
                          }`}
                        >
                          <div className="w-5 h-5">
                            <PieceIcon type={pt as PieceType} color="w" theme={pieceTheme} />
                          </div>
                          {count > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[#81b64c] text-black text-[9px] font-black rounded-full px-1 border border-black shadow">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {activeDropPiece && (
                      <button
                        onClick={() => setActiveDropPiece(null)}
                        className="px-2 py-1 text-[10px] font-bold text-zinc-300 hover:text-white bg-white/10 rounded-md"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Clean Control HUD (Single surface, 360px max width) */}
            <div className="w-full lg:w-[360px] flex flex-col gap-2.5 shrink-0 max-h-full">
              {/* Variant Selector Segmented Chips */}
              <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Select Game Variant
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['kingofthehill', '3check', 'crazyhouse', 'chess960'] as ChessVariant[]).map((v) => {
                    const isCur = activeVariant === v;
                    const meta = VARIANT_DETAILS[v];
                    return (
                      <button
                        key={v}
                        onClick={() => handleSelectVariant(v)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          isCur
                            ? 'bg-[#81b64c] border-[#81b64c] text-black font-black shadow-sm'
                            : 'bg-[#141311] border-white/5 text-zinc-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {v === 'kingofthehill' && <Crown className="w-3.5 h-3.5 shrink-0" />}
                        {v === '3check' && <Zap className="w-3.5 h-3.5 shrink-0" />}
                        {v === 'crazyhouse' && <Boxes className="w-3.5 h-3.5 shrink-0" />}
                        {v === 'chess960' && <Dices className="w-3.5 h-3.5 shrink-0" />}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate leading-tight">{meta.name}</span>
                          <span className={`text-[9px] truncate ${isCur ? 'text-black/70' : 'text-zinc-500'}`}>
                            {meta.tag}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status & Victory Banner */}
              <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    Match Status
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        gameState.turn === 'w' ? 'bg-white' : 'bg-zinc-500'
                      } ${!gameState.isGameOver ? 'animate-pulse' : ''}`}
                    />
                    <span className="text-xs font-bold text-white">
                      {gameState.isGameOver
                        ? 'Completed'
                        : gameState.turn === 'w'
                        ? "White's Turn"
                        : "Black's Turn"}
                    </span>
                  </div>
                </div>

                {isBotThinking && (
                  <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold flex items-center gap-2">
                    <Bot className="w-4 h-4 animate-spin text-purple-400" />
                    <span>Variant AI is calculating move...</span>
                  </div>
                )}

                {gameState.isGameOver && (
                  <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 flex flex-col gap-1.5 animate-in zoom-in-95">
                    <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>
                        {gameState.winner === 'w'
                          ? 'White Wins!'
                          : gameState.winner === 'b'
                          ? 'Black Wins!'
                          : 'Draw Game'}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300">{gameState.winReason}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      rounded="lg"
                      onClick={handleRestartGame}
                      className="mt-1"
                    >
                      <span>Play Again</span>
                    </Button>
                  </div>
                )}

                {/* Opponent Mode & Flip Board */}
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    variant={vsBot ? 'purple' : 'secondary'}
                    size="xs"
                    rounded="lg"
                    onClick={() => setVsBot((prev) => !prev)}
                    className="flex-1"
                  >
                    {vsBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{vsBot ? 'vs Variant AI' : 'Pass & Play'}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    rounded="lg"
                    onClick={() => setBoardOrientation((prev) => (prev === 'w' ? 'b' : 'w'))}
                  >
                    <span>Flip</span>
                  </Button>
                </div>
              </div>

              {/* Primary Action Button (P1 Anchor) */}
              <Button
                variant="primary"
                size="md"
                rounded="xl"
                fullWidth
                onClick={handleRestartGame}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Match</span>
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 2: RULES & STRATEGY */}
        {activeScreen === 'rules' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0 overflow-y-auto">
              {(['kingofthehill', '3check', 'crazyhouse', 'chess960'] as ChessVariant[]).map((v) => {
                const meta = VARIANT_DETAILS[v];
                const isSelected = activeVariant === v;

                return (
                  <div
                    key={v}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-[#1e1c18] border-[#81b64c]/40'
                        : 'bg-[#1c1a17] border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {v === 'kingofthehill' && <Crown className="w-4 h-4 text-amber-400" />}
                          {v === '3check' && <Zap className="w-4 h-4 text-cyan-400" />}
                          {v === 'crazyhouse' && <Boxes className="w-4 h-4 text-purple-400" />}
                          {v === 'chess960' && <Dices className="w-4 h-4 text-rose-400" />}
                          <h3 className="text-sm font-black text-white">{meta.name}</h3>
                        </div>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                          {meta.tag}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">{meta.description}</p>

                      <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                          Winning Condition
                        </span>
                        <span className="text-xs text-zinc-300">{meta.winCondition}</span>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                          Grandmaster Advice
                        </span>
                        <span className="text-xs text-zinc-400">{meta.proTip}</span>
                      </div>
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'secondary'}
                      size="sm"
                      rounded="xl"
                      fullWidth
                      onClick={() => {
                        handleSelectVariant(v);
                        setActiveScreen('arena');
                      }}
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Resume Match' : `Play ${meta.name} Now`}</span>
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Bottom Global P1 Anchor for Rules */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <HelpCircle className="w-4 h-4 text-[#81b64c]" />
                <span>All variants follow official Chess.com and Lichess tournament regulations.</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                rounded="lg"
                onClick={() => setActiveScreen('arena')}
              >
                <span>Back to Arena</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 3: BOT SPARRING LAB */}
        {activeScreen === 'bot_spar' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
              {/* Bot Difficulty Tier Card */}
              <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-purple-400" />
                      <span>AI Bot Difficulty</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 uppercase font-black">
                      {botDifficulty}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    Configure the engine response speed and tactical calculation horizon.
                  </p>

                  <div className="flex flex-col gap-2 mt-2">
                    {[
                      { id: 'casual', label: 'Casual (800 Elo)', desc: 'Relaxed variant play with frequent blunders' },
                      { id: 'club', label: 'Club Player (1400 Elo)', desc: 'Sharp variant instincts and active king safety' },
                      { id: 'master', label: 'Master AI (2000 Elo)', desc: 'Ruthless tactical calculation and king hunts' },
                    ].map((tier) => (
                      <button
                        key={tier.id}
                        onClick={() => setBotDifficulty(tier.id as any)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          botDifficulty === tier.id
                            ? 'bg-purple-500/20 border-purple-500/40 text-white'
                            : 'bg-[#141311] border-white/5 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-white">{tier.label}</div>
                        <div className="text-[10px] text-zinc-400">{tier.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#141311] border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Bot Active in Arena:</span>
                  <span className={`font-bold ${vsBot ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {vsBot ? 'Enabled' : 'Disabled (Pass & Play)'}
                  </span>
                </div>
              </div>

              {/* Variant Specific Setup (e.g. Chess960 Seed Picker) */}
              <div className="p-4 rounded-2xl bg-[#1c1a17] border border-white/5 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Dices className="w-4 h-4 text-rose-400" />
                      <span>Chess960 Seed Generator</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase font-black">
                      #{selected960Index}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    Dial any of the official 960 starting setups or roll randomly.
                  </p>

                  <div className="p-3 bg-[#141311] rounded-xl border border-white/5 flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Back Rank Setup:</span>
                      <span className="font-mono text-xs font-black text-emerald-400">
                        {VariantsEngine.generateChess960BackRank(selected960Index).join(' ')}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="959"
                      value={selected960Index}
                      onChange={(e) => handleSet960Index(parseInt(e.target.value, 10))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-500">Pos #0</span>
                      <Button
                        variant="secondary"
                        size="xs"
                        rounded="lg"
                        onClick={handleRandomize960}
                      >
                        <Dices className="w-3 h-3" />
                        <span>Random Seed</span>
                      </Button>
                      <span className="text-[10px] text-zinc-500">Pos #959</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  rounded="xl"
                  fullWidth
                  onClick={() => {
                    setVsBot(true);
                    handleRestartGame();
                    setActiveScreen('arena');
                  }}
                >
                  <Swords className="w-4 h-4" />
                  <span>Start AI Sparring Match</span>
                </Button>
              </div>
            </div>

            {/* Bottom Global Action Banner */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-400">
                AI moves are computed in-browser with zero latency or cloud dependencies.
              </span>
              <Button
                variant="primary"
                size="sm"
                rounded="lg"
                onClick={() => setActiveScreen('arena')}
              >
                <span>Return to Match</span>
              </Button>
            </div>
          </div>
        )}

        {/* SUB-SCREEN 4: MOVE TIMELINE & GAME REVIEW */}
        {activeScreen === 'history' && (
          <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto lg:overflow-hidden animate-in fade-in duration-150 max-w-4xl mx-auto w-full">
            {/* Move List Container */}
            <div className="flex-1 min-h-0 bg-[#1c1a17] rounded-2xl border border-white/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Move Notation ({moveHistory.length} Plies)
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  rounded="lg"
                  onClick={handleCopyFen}
                >
                  {copiedFen ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedFen ? 'Copied FEN!' : 'Copy FEN'}</span>
                </Button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-[#141311] rounded-xl border border-white/5">
                {moveHistory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-xs py-8">
                    <span>No moves recorded yet in this match.</span>
                    <span className="text-[10px] mt-1 text-zinc-600">Make your opening move in the Arena!</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-mono">
                    {moveHistory.map((m, i) => (
                      <div
                        key={i}
                        className="p-1.5 rounded-lg bg-white/5 flex items-center justify-between"
                      >
                        <span className="text-zinc-500 text-[10px]">{Math.floor(i / 2) + 1}{i % 2 === 0 ? '.' : '...'}</span>
                        <span className="font-bold text-zinc-200">{m}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-[#1c1a17] rounded-2xl border border-white/5 flex items-center justify-between shrink-0">
              <span className="text-xs text-zinc-400">
                Ready to review tactics or analyze opening moves?
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  rounded="lg"
                  onClick={() => setActiveScreen('arena')}
                >
                  <span>Back to Board</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
