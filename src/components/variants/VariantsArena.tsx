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
  PieceColor,
  PieceType,
} from '@/types/chess';
import { soundService } from '@/lib/audioService';
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
  AlertTriangle,
  Play,
  HelpCircle,
} from 'lucide-react';

interface VariantsArenaProps {
  boardTheme: BoardTheme;
  pieceTheme: PieceTheme;
}

const VARIANT_DETAILS: Record<
  ChessVariant,
  { name: string; icon: React.ReactNode; tag: string; description: string; rule: string }
> = {
  standard: {
    name: 'Standard Chess',
    icon: <Play className="w-4 h-4 text-emerald-400" />,
    tag: 'FIDE Classic',
    description: 'Traditional chess with standard starting position and checkmate victory.',
    rule: 'Deliver checkmate, win on time, or force opponent resignation.',
  },
  kingofthehill: {
    name: 'King of the Hill',
    icon: <Crown className="w-4 h-4 text-amber-400" />,
    tag: 'Conquer the Center',
    description: 'Rush your King into the center of the board. The first player whose King reaches d4, e4, d5, or e5 wins instantly!',
    rule: 'Land your King on d4, e4, d5, or e5, or deliver standard checkmate.',
  },
  '3check': {
    name: '3-Check',
    icon: <Zap className="w-4 h-4 text-cyan-400" />,
    tag: 'Check Countdown',
    description: 'Every check counts! The first player to deliver 3 checks to the enemy King wins the match immediately.',
    rule: 'Give 3 checks to the enemy King (+3) or deliver standard checkmate.',
  },
  crazyhouse: {
    name: 'Crazyhouse',
    icon: <Boxes className="w-4 h-4 text-purple-400" />,
    tag: 'Pocket Drops',
    description: 'Captured pieces change to your color and enter your reserve pocket! Drop them onto any empty square on your turn.',
    rule: 'Captured pieces enter your pocket. Click reserve pieces to drop. Promoted pawns revert to pawns on capture.',
  },
  chess960: {
    name: 'Chess960 (Fischer Random)',
    icon: <Dices className="w-4 h-4 text-rose-400" />,
    tag: 'Scharnagl Index 0–959',
    description: 'Pieces on the back rank are randomly shuffled using the official 960 Scharnagl positions. Zero opening memorization!',
    rule: 'Bishops on opposite colors, King always between two Rooks. Castling rules preserved.',
  },
  solochess: {
    name: 'Solo Chess',
    icon: <Sparkles className="w-4 h-4 text-blue-400" />,
    tag: 'Single-Player Tactics',
    description: 'Capture pieces until only one piece remains on the board.',
    rule: 'Every move must be a capture. Pieces can capture a maximum of 2 times.',
  },
};

const POCKET_PIECE_TYPES: (keyof CrazyhousePocket)[] = ['q', 'r', 'b', 'n', 'p'];

export const VariantsArena: React.FC<VariantsArenaProps> = ({
  boardTheme,
  pieceTheme,
}) => {
  const [activeVariant, setActiveVariant] = useState<ChessVariant>('kingofthehill');
  const [gameState, setGameState] = useState<VariantGameState>(() =>
    VariantsEngine.initVariantGame('kingofthehill')
  );
  const [chessInstance, setChessInstance] = useState(() => new Chess(gameState.fen));
  const [vsBot, setVsBot] = useState(true);
  const [selected960Index, setSelected960Index] = useState<number>(518);
  const [activeDropPiece, setActiveDropPiece] = useState<keyof CrazyhousePocket | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: Square; to: Square } | null>(
    null
  );
  const [isBotThinking, setIsBotThinking] = useState(false);

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

  // Trigger bot reply
  const triggerBotReply = useCallback(
    (currentState: VariantGameState) => {
      if (!vsBot || currentState.isGameOver || currentState.turn !== 'b') return;

      setIsBotThinking(true);
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
        } catch (e) {
          // ignore error
        } finally {
          setIsBotThinking(false);
        }
      }, 400);
    },
    [vsBot]
  );

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

      // If playing vs Bot and it's Black's turn, trigger bot
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

    // 1. King of the Hill center hill glow
    if (activeVariant === 'kingofthehill') {
      const hillSquares: Square[] = ['d4', 'e4', 'd5', 'e5'];
      hillSquares.forEach((sq) => {
        list.push({
          square: sq,
          color: 'rgba(234, 179, 8, 0.35)',
          border: 'border-2 border-amber-400/80 rounded-sm shadow-[0_0_12px_rgba(234,179,8,0.5)]',
          label: '👑',
        });
      });
    }

    // 2. Crazyhouse Legal Drop targets
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
        if (piece?.type === 'k') {
          if (piece.color === 'w') whiteKingSq = [r, c];
          if (piece.color === 'b') blackKingSq = [r, c];
        }
      }
    }

    const hillCoords: [number, number][] = [
      [3, 3], [3, 4], [4, 3], [4, 4],
    ];

    const getDist = (king: [number, number] | null) => {
      if (!king) return 99;
      return Math.min(
        ...hillCoords.map(
          ([hr, hc]) => Math.max(Math.abs(king[0] - hr), Math.abs(king[1] - hc)) // Chebyshev king distance
        )
      );
    };

    return {
      whiteDist: getDist(whiteKingSq),
      blackDist: getDist(blackKingSq),
    };
  }, [activeVariant, chessInstance]);

  const currentVariantMeta = VARIANT_DETAILS[activeVariant];

  return (
    <div className="flex flex-col lg:flex-row gap-5 sm:gap-6 w-full items-center lg:items-start justify-center p-2 sm:p-4 select-none">
      {/* Interactive Chessboard & Reserved Trays */}
      <div className="flex flex-col items-center gap-3 sm:gap-3.5 w-full max-w-[min(calc(100vw-2rem),560px)] lg:max-w-[460px] xl:max-w-[490px] 2xl:max-w-[530px]">
        {/* Crazyhouse Black Pocket Tray (Opponent Reserve) */}
        {activeVariant === 'crazyhouse' && (
          <div className="w-full bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-[0_4px_0_0_#141311]">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-zinc-400 border border-black/40 shadow-inner shrink-0" />
              <span className="text-[10px] sm:text-xs font-black text-zinc-300 uppercase tracking-wider truncate">Black Pocket</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {POCKET_PIECE_TYPES.map((pt) => {
                const count = gameState.blackPocket[pt] || 0;
                return (
                  <div
                    key={pt}
                    className={`relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border-2 transition-all ${
                      count > 0
                        ? 'bg-[#282622] border-[#35322b] text-white shadow-[0_2px_0_0_#141311]'
                        : 'bg-black/30 border-zinc-800 opacity-30 text-zinc-600'
                    }`}
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6">
                      <PieceIcon type={pt as PieceType} color="b" theme={pieceTheme} />
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-zinc-700 text-white text-[9px] sm:text-[10px] font-black rounded-full px-1 border border-zinc-500 shadow">
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
          <div className="w-full bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-[0_4px_0_0_#141311]">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-0">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse shrink-0" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-cyan-300 truncate">3-Check Tracker</span>
            </div>
            <div className="flex items-center gap-3 sm:gap-6 shrink-0">
              {/* White Checks */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-300">W:</span>
                <div className="flex items-center gap-1 sm:gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <span
                      key={num}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black border-2 transition-all ${
                        gameState.whiteChecksGiven >= num
                          ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_2px_0_0_#0e7490]'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {gameState.whiteChecksGiven >= num ? '+' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {/* Black Checks */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-300">B:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map((num) => (
                    <span
                      key={num}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black border-2 transition-all ${
                        gameState.blackChecksGiven >= num
                          ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_2px_0_0_#0e7490]'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {gameState.blackChecksGiven >= num ? '+' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* King of the Hill Indicator Bar */}
        {activeVariant === 'kingofthehill' && kothKingDistances && (
          <div className="w-full bg-[#1f1d1a] border-2 border-amber-600/40 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-[0_4px_0_0_#78350f]">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-0">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 animate-bounce shrink-0" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300 truncate">
                Center: d4, e4, d5, e5
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-mono font-bold shrink-0">
              <span className="text-zinc-200">
                W: <span className="text-amber-400 font-black">{kothKingDistances.whiteDist}</span> sq
              </span>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-200">
                B: <span className="text-amber-400 font-black">{kothKingDistances.blackDist}</span> sq
              </span>
            </div>
          </div>
        )}

        {/* Main Chessboard Component */}
        <div className="w-[min(100%,calc(100vh-270px),560px)] aspect-square relative shadow-2xl rounded-2xl overflow-hidden border border-[#302d29]">
          <ChessBoard
            chess={chessInstance}
            orientation="w"
            boardTheme={boardTheme}
            pieceTheme={pieceTheme}
            onMove={handleBoardMove}
            lastMove={lastMoveSquares}
            customSquareHighlights={boardHighlights}
            onCustomSquareClick={handleDropSquareClick}
            disabled={gameState.isGameOver || isBotThinking}
          />
        </div>

        {/* Crazyhouse White Pocket Tray (Player Reserve) */}
        {activeVariant === 'crazyhouse' && (
          <div className="w-full bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-[0_4px_0_0_#141311]">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 min-w-0">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border border-black/40 shadow shrink-0" />
              <span className="text-[10px] sm:text-xs font-black text-zinc-300 uppercase tracking-wider truncate">White Pocket</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {POCKET_PIECE_TYPES.map((pt) => {
                const count = gameState.whitePocket[pt] || 0;
                const isSelected = activeDropPiece === pt;
                const canDrop = count > 0 && gameState.turn === 'w' && !gameState.isGameOver;

                return (
                  <button
                    key={pt}
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
                    className={`relative flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#81b64c]/30 border-[#81b64c] shadow-[0_3px_0_0_#4d7a24] -translate-y-1'
                        : canDrop
                        ? 'bg-[#282622] border-[#35322b] hover:border-[#81b64c] hover:bg-[#34302c] text-white shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                        : 'bg-black/30 border-zinc-800 opacity-30 cursor-not-allowed text-zinc-600'
                    }`}
                  >
                    <div className="w-5 h-5 sm:w-7 sm:h-7">
                      <PieceIcon type={pt as PieceType} color="w" theme={pieceTheme} />
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#81b64c] text-white text-[9px] sm:text-[10px] font-black rounded-full px-1 border border-white shadow">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {activeDropPiece && (
                <button
                  onClick={() => setActiveDropPiece(null)}
                  className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-black text-zinc-300 hover:text-white bg-[#262420] border-2 border-[#35322b] rounded-full shadow-[0_2px_0_0_#141311] transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel, Single-Surface Filter Chips & Game Status */}
      <div className="flex flex-col gap-3.5 sm:gap-4 w-full max-w-[min(calc(100vw-2rem),560px)] lg:max-w-[420px] xl:max-w-[440px]">
        {/* Single-Surface Filter Chips */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-[0_6px_0_0_#141311]">
          <div className="flex items-center justify-between pb-2.5 border-b-2 border-[#282622]">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Select Chess Variant
            </span>
            <span className="text-[11px] font-black text-[#81b64c] uppercase">Official Rules</span>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
            {(['kingofthehill', '3check', 'crazyhouse', 'chess960'] as ChessVariant[]).map(
              (variant) => {
                const meta = VARIANT_DETAILS[variant];
                const isActive = activeVariant === variant;
                return (
                  <button
                    key={variant}
                    onClick={() => handleSelectVariant(variant)}
                    className={`flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#81b64c] border-[#4d7a24] text-white shadow-[0_4px_0_0_#4d7a24]'
                        : 'bg-[#161512] border-[#35322b] text-zinc-300 hover:text-white hover:bg-[#25221d] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
                    }`}
                  >
                    <div className="p-1.5 rounded-xl bg-black/40 shrink-0">{meta.icon}</div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black truncate">{meta.name}</span>
                      <span className={`text-[10px] font-bold truncate ${isActive ? 'text-white/80' : 'text-zinc-500'}`}>{meta.tag}</span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Active Variant Rule Card */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_6px_0_0_#141311] flex flex-col gap-3 sm:gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {currentVariantMeta.icon}
              <h3 className="text-sm font-black text-white">{currentVariantMeta.name}</h3>
            </div>
            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#81b64c]/20 text-[#81b64c] border-2 border-[#81b64c]/40">
              {currentVariantMeta.tag}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed font-medium">{currentVariantMeta.description}</p>

          <div className="p-2.5 sm:p-3 bg-[#161512] rounded-xl sm:rounded-2xl border-2 border-[#282622] flex items-start gap-2.5 shadow-inner">
            <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-400 font-medium">
              <span className="font-black text-zinc-200">Win Condition: </span>
              {currentVariantMeta.rule}
            </div>
          </div>

          {/* Chess960 Specific Controls */}
          {activeVariant === 'chess960' && (
            <div className="p-3 sm:p-3.5 bg-[#24211d] rounded-xl sm:rounded-2xl border-2 border-[#35322b] shadow-[0_3px_0_0_#141311] flex flex-col gap-2.5 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-zinc-200">
                  Scharnagl SP: <span className="text-rose-400 font-black">#{selected960Index}</span>
                </span>
                <button
                  onClick={handleRandomize960}
                  className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-full border-2 border-rose-700 shadow-[0_2px_0_0_#881337] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll (0-959)</span>
                </button>
              </div>

              {/* Back Rank Display */}
              <div className="flex items-center justify-between px-3 py-2 bg-black/40 rounded-xl border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">
                  Back Rank:
                </span>
                <span className="font-mono text-xs font-black tracking-widest text-emerald-400">
                  {VariantsEngine.generateChess960BackRank(selected960Index).join(' ')}
                </span>
              </div>

              {/* Slider for quick browsing */}
              <input
                type="range"
                min="0"
                max="959"
                value={selected960Index}
                onChange={(e) => handleSet960Index(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          )}

          {/* Play Mode & Action Buttons */}
          <div className="pt-3 border-t-2 border-[#282622] flex items-center justify-between gap-2 sm:gap-2.5">
            <button
              onClick={() => setVsBot((prev) => !prev)}
              className={`flex-1 py-2 sm:py-2.5 px-2.5 sm:px-3 rounded-full border-2 text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                vsBot
                  ? 'bg-purple-600 text-white border-purple-800 shadow-[0_3px_0_0_#581c87] hover:-translate-y-[1px]'
                  : 'bg-[#262420] border-[#35322b] text-zinc-300 shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px]'
              }`}
            >
              {vsBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              <span>{vsBot ? 'vs AI Bot' : 'Pass & Play'}</span>
            </button>

            <button
              onClick={handleRestartGame}
              className="py-2 sm:py-2.5 px-3 sm:px-4 bg-[#262420] hover:bg-[#322f29] text-zinc-100 border-2 border-[#35322b] shadow-[0_2px_0_0_#141311] hover:-translate-y-[1px] active:translate-y-[1px] active:shadow-none text-[11px] sm:text-xs font-black rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
          </div>
        </div>

        {/* Turn, Move Count & Victory Status Modal */}
        <div className="bg-[#1f1d1a] border-2 border-[#35322b] rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_6px_0_0_#141311] flex flex-col gap-3 sm:gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Live Status
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full border-2 border-black/40 ${
                  gameState.turn === 'w' ? 'bg-white shadow' : 'bg-zinc-500'
                } animate-pulse`}
              />
              <span className="text-xs font-black text-white">
                {gameState.turn === 'w' ? "White's Turn" : "Black's Turn"}
              </span>
            </div>
          </div>

          {/* Bot Thinking indicator */}
          {isBotThinking && (
            <div className="p-3 bg-purple-950/40 border-2 border-purple-800/50 shadow-[0_3px_0_0_#581c87] rounded-2xl flex items-center gap-2 text-xs text-purple-300 font-black animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              <span>Variant Bot is calculating move...</span>
            </div>
          )}

          {/* Game Over Banner */}
          {gameState.isGameOver && (
            <div className="p-4 bg-gradient-to-r from-amber-950/80 to-emerald-950/80 border-2 border-amber-500/60 rounded-2xl flex flex-col gap-2.5 shadow-[0_6px_0_0_#78350f] animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-amber-300 font-black text-sm">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>
                  {gameState.winner === 'w'
                    ? 'White Won!'
                    : gameState.winner === 'b'
                    ? 'Black Won!'
                    : 'Draw!'}
                </span>
              </div>
              <p className="text-xs text-zinc-200 font-medium">{gameState.winReason}</p>
              <button
                onClick={handleRestartGame}
                className="mt-2 py-2.5 w-full bg-[#81b64c] hover:bg-[#72a342] text-white font-black text-xs rounded-full border-2 border-[#4d7a24] shadow-[0_4px_0_0_#4d7a24] hover:-translate-y-[2px] active:translate-y-[2px] active:shadow-[0_1px_0_0_#4d7a24] transition-all cursor-pointer"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Move Log History */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-wider">Move Log:</span>
            <div className="p-3 bg-[#151412] rounded-2xl border-2 border-[#282622] h-28 overflow-y-auto text-xs font-mono text-zinc-300 flex flex-wrap gap-x-2 gap-y-1 shadow-inner">
              {moveHistory.length === 0 ? (
                <span className="text-zinc-600 italic">No moves played yet.</span>
              ) : (
                moveHistory.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i % 2 === 0 && (
                      <span className="text-zinc-500 font-sans">{Math.floor(i / 2) + 1}.</span>
                    )}
                    <span
                      className={`px-1.5 py-0.5 rounded font-black ${
                        i % 2 === 0 ? 'text-zinc-200' : 'text-zinc-400'
                      }`}
                    >
                      {m}
                    </span>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
