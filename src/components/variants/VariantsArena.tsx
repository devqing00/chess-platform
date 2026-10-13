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
    <div className="flex flex-col xl:flex-row gap-6 w-full items-center xl:items-start justify-center p-2 sm:p-4 select-none">
      {/* Interactive Chessboard & Reserved Trays */}
      <div className="flex flex-col items-center gap-3">
        {/* Crazyhouse Black Pocket Tray (Opponent Reserve) */}
        {activeVariant === 'crazyhouse' && (
          <div className="w-full max-w-[580px] bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" />
              <span className="text-xs font-bold text-zinc-300">Black Pocket</span>
            </div>
            <div className="flex items-center gap-2">
              {POCKET_PIECE_TYPES.map((pt) => {
                const count = gameState.blackPocket[pt] || 0;
                return (
                  <div
                    key={pt}
                    className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                      count > 0
                        ? 'bg-[#282522] border-zinc-600 text-white'
                        : 'bg-black/30 border-zinc-800 opacity-30 text-zinc-600'
                    }`}
                  >
                    <div className="w-6 h-6">
                      <PieceIcon type={pt as PieceType} color="b" theme={pieceTheme} />
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-zinc-700 text-white text-[10px] font-black rounded-full px-1.5 border border-zinc-500 shadow">
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
          <div className="w-full max-w-[580px] bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-black uppercase text-zinc-200">3-Check Tracker</span>
            </div>
            <div className="flex items-center gap-6">
              {/* White Checks */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-300">White:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((num) => (
                    <span
                      key={num}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black border transition-all ${
                        gameState.whiteChecksGiven >= num
                          ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                      }`}
                    >
                      {gameState.whiteChecksGiven >= num ? '+' : ''}
                    </span>
                  ))}
                </div>
              </div>
              {/* Black Checks */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-zinc-300">Black:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((num) => (
                    <span
                      key={num}
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black border transition-all ${
                        gameState.blackChecksGiven >= num
                          ? 'bg-cyan-500 border-cyan-300 text-black shadow-[0_0_8px_rgba(6,182,212,0.8)]'
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
          <div className="w-full max-w-[580px] bg-[#1a1815] border border-amber-900/40 rounded-xl p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
              <span className="text-xs font-black uppercase text-amber-300">
                Center Hill: d4, e4, d5, e5
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <span className="text-zinc-200">
                White King: <span className="text-amber-400 font-black">{kothKingDistances.whiteDist}</span> sq away
              </span>
              <span className="text-zinc-400">|</span>
              <span className="text-zinc-200">
                Black King: <span className="text-amber-400 font-black">{kothKingDistances.blackDist}</span> sq away
              </span>
            </div>
          </div>
        )}

        {/* Main Chessboard Component */}
        <div className="relative">
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
          <div className="w-full max-w-[580px] bg-[#1a1815] border border-[#2b2824] rounded-xl p-2.5 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow" />
              <span className="text-xs font-bold text-zinc-300">White Pocket (Drops)</span>
            </div>
            <div className="flex items-center gap-2">
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
                    className={`relative flex items-center justify-center w-10 h-10 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-500/30 border-emerald-400 scale-105 shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : canDrop
                        ? 'bg-[#282522] border-zinc-600 hover:border-emerald-400 hover:bg-[#34302c] text-white'
                        : 'bg-black/30 border-zinc-800 opacity-30 cursor-not-allowed text-zinc-600'
                    }`}
                  >
                    <div className="w-7 h-7">
                      <PieceIcon type={pt as PieceType} color="w" theme={pieceTheme} />
                    </div>
                    {count > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-[#81b64c] text-black text-[10px] font-black rounded-full px-1.5 border border-white shadow">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
              {activeDropPiece && (
                <button
                  onClick={() => setActiveDropPiece(null)}
                  className="px-2 py-1 text-[10px] font-bold text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded transition"
                >
                  Cancel Drop
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel, Single-Surface Filter Chips & Game Status */}
      <div className="flex flex-col gap-4 w-full max-w-[420px]">
        {/* Single-Surface Filter Chips (Satisfies Remediation R2) */}
        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-3 flex flex-col gap-2.5 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-[#2b2824]">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Select Chess Variant
            </span>
            <span className="text-[11px] font-bold text-[#81b64c]">Official Rules</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['kingofthehill', '3check', 'crazyhouse', 'chess960'] as ChessVariant[]).map(
              (variant) => {
                const meta = VARIANT_DETAILS[variant];
                const isActive = activeVariant === variant;
                return (
                  <button
                    key={variant}
                    onClick={() => handleSelectVariant(variant)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#282522] border-[#81b64c] shadow-[0_0_12px_rgba(129,182,76,0.25)] text-white'
                        : 'bg-[#151412] border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-black/40">{meta.icon}</div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold truncate">{meta.name}</span>
                      <span className="text-[10px] text-zinc-500 truncate">{meta.tag}</span>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* Active Variant Rule Card */}
        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentVariantMeta.icon}
              <h3 className="text-sm font-black text-white">{currentVariantMeta.name}</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-[#81b64c]/20 text-[#81b64c] border border-[#81b64c]/40">
              {currentVariantMeta.tag}
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">{currentVariantMeta.description}</p>

          <div className="p-2.5 bg-black/30 rounded-xl border border-zinc-800 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-zinc-400">
              <span className="font-bold text-zinc-300">Win Condition: </span>
              {currentVariantMeta.rule}
            </div>
          </div>

          {/* Chess960 Specific Controls */}
          {activeVariant === 'chess960' && (
            <div className="p-3 bg-[#24211d] rounded-xl border border-zinc-700/60 flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">
                  Scharnagl SP: <span className="text-rose-400 font-black">#{selected960Index}</span>
                </span>
                <button
                  onClick={handleRandomize960}
                  className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-lg border border-rose-500/40 transition flex items-center gap-1 cursor-pointer"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Roll (0-959)</span>
                </button>
              </div>

              {/* Back Rank Display */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-black/40 rounded-lg border border-zinc-800">
                <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">
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
          <div className="pt-2 border-t border-[#2b2824] flex items-center justify-between gap-2">
            <button
              onClick={() => setVsBot((prev) => !prev)}
              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                vsBot
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300'
              }`}
            >
              {vsBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              <span>{vsBot ? 'vs AI Bot' : 'Pass & Play'}</span>
            </button>

            <button
              onClick={handleRestartGame}
              className="py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Game</span>
            </button>
          </div>
        </div>

        {/* Turn, Move Count & Victory Status Modal */}
        <div className="bg-[#1a1815] border border-[#2b2824] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Live Status
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
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
            <div className="p-2.5 bg-purple-950/40 border border-purple-800/50 rounded-xl flex items-center gap-2 text-xs text-purple-300 font-bold animate-pulse">
              <Bot className="w-4 h-4 animate-spin" />
              <span>Variant Bot is calculating move...</span>
            </div>
          )}

          {/* Game Over Banner */}
          {gameState.isGameOver && (
            <div className="p-4 bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border border-amber-500/50 rounded-xl flex flex-col gap-2 shadow-2xl animate-in zoom-in-95">
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
                className="mt-2 py-2 w-full bg-[#81b64c] hover:bg-[#92c855] text-black font-black text-xs rounded-lg transition shadow cursor-pointer"
              >
                Play Again
              </button>
            </div>
          )}

          {/* Move Log History */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-zinc-400">Move Log:</span>
            <div className="p-2 bg-black/30 rounded-xl border border-zinc-800 h-28 overflow-y-auto text-xs font-mono text-zinc-300 flex flex-wrap gap-x-2 gap-y-1">
              {moveHistory.length === 0 ? (
                <span className="text-zinc-600 italic">No moves played yet.</span>
              ) : (
                moveHistory.map((m, i) => (
                  <span key={i} className="inline-flex items-center gap-1">
                    {i % 2 === 0 && (
                      <span className="text-zinc-500 font-sans">{Math.floor(i / 2) + 1}.</span>
                    )}
                    <span
                      className={`px-1 py-0.5 rounded font-bold ${
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
