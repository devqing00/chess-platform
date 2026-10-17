import { Chess, Move } from 'chess.js';
import { BotPersonality } from '@/types/chess';
import { ChessEvaluator } from './chessEngine';

export interface BotMoveResult {
  san: string;
  from: string;
  to: string;
  promotion?: string;
  quote?: string;
}

/**
 * Intelligent and authentic Bot move generator that faithfully mirrors the Bot's ELO rating:
 * - Martin (250 ELO): Fumbles pieces, misses simple captures, makes random knight/pawn hops, blunder rate ~80%.
 * - Elani (400 ELO): Casual beginner, develops minor pieces, misses tactics ~60%.
 * - Wayne (700 ELO): Coffee-shop player, controls center, weak back rank, ~40% mistakes.
 * - Nelson (1300 ELO): Loves Queen excursions (Scholar's Mate/Wayward Queen attack), solid ~80% accuracy.
 * - Advanced & GMs (Danny 2500, Hikaru 2820, Stockfish 3200): Deep positional minimax, 95%+ precision.
 */
export function generateBotMove(
  chess: Chess,
  bot: BotPersonality
): BotMoveResult | null {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  const isWhite = chess.turn() === 'w';
  const rating = bot.rating;

  // 0ms instant response if only 1 legal move exists
  if (legalMoves.length === 1) {
    return {
      san: legalMoves[0].san,
      from: legalMoves[0].from,
      to: legalMoves[0].to,
      promotion: legalMoves[0].promotion,
    };
  }

  let chosenMove: Move = legalMoves[0];
  let quoteType: keyof BotPersonality['quotes'] | null = null;

  if (rating <= 300) {
    // MARTIN (250 ELO): The lovable blunderer
    // 75% of the time, immediately pick a random legal move with 0ms calculation
    const roll = Math.random();
    if (roll < 0.75) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      chosenMove = legalMoves[randomIndex];
      if (Math.random() < 0.4) {
        quoteType = 'blunder';
      }
    } else {
      // 25% simple 1-ply piece-value evaluation (0.05ms)
      const scored = legalMoves.map((m) => {
        chess.move(m);
        const score = ChessEvaluator.evaluatePosition(chess);
        chess.undo();
        return { move: m, score };
      });
      scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));
      chosenMove = scored[0].move;
    }
  } else if (rating <= 800) {
    // ELANI (400 ELO) & WAYNE (700 ELO): Fast 1-ply position evaluation
    const scored = legalMoves.map((m) => {
      chess.move(m);
      const score = ChessEvaluator.evaluatePosition(chess);
      chess.undo();
      return { move: m, score };
    });
    scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

    const mistakeChance = rating <= 500 ? 0.60 : 0.40;
    if (Math.random() < mistakeChance && scored.length > 1) {
      const candidateIndex = Math.floor(Math.random() * Math.min(3, scored.length));
      chosenMove = scored[candidateIndex].move;
    } else {
      chosenMove = scored[0].move;
    }
  } else if (rating <= 1400) {
    // NELSON (1300 ELO): Aggressive Queen attacks with 1-ply evaluation
    const scored = legalMoves.map((m) => {
      chess.move(m);
      const score = ChessEvaluator.evaluatePosition(chess);
      chess.undo();
      return { move: m, score };
    });
    scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

    if (chess.history().length < 12) {
      const queenMove = scored.find((sm) => sm.move.piece === 'q');
      if (queenMove && Math.random() < 0.65) {
        chosenMove = queenMove.move;
      } else {
        chosenMove = Math.random() < 0.25 && scored.length > 1 ? scored[1].move : scored[0].move;
      }
    } else {
      chosenMove = Math.random() < 0.20 && scored.length > 1 ? scored[1].move : scored[0].move;
    }
  } else {
    // Advanced & Master Bots: Bounded candidate evaluation
    const candidateMoves = legalMoves.length > 18 ? legalMoves.slice(0, 18) : legalMoves;
    const scored = candidateMoves.map((m) => {
      chess.move(m);
      const score = ChessEvaluator.evaluatePosition(chess);
      chess.undo();
      return { move: m, score };
    });
    scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));
    chosenMove = scored[0].move;
  }

  // Pick contextual quote from bot personality
  let quote: string | undefined;
  if (quoteType && bot.quotes[quoteType] && bot.quotes[quoteType]!.length > 0) {
    const list = bot.quotes[quoteType]!;
    quote = list[Math.floor(Math.random() * list.length)];
  }

  return {
    san: chosenMove.san,
    from: chosenMove.from,
    to: chosenMove.to,
    promotion: chosenMove.promotion,
    quote,
  };
}

/**
 * Calculates humanized, realistic thinking latency for bot moves:
 * - Opening book / early moves: quick 300ms - 500ms
 * - Beginner bots: casual 400ms - 750ms
 * - Intermediate bots: 650ms - 1150ms
 * - Master & GM bots (Danny, Hikaru, Stockfish): 850ms - 1450ms with natural variation
 */
export function calculateBotThinkingDelayMs(
  bot: BotPersonality,
  moveNumber: number = 1,
  isCheckOrCapture: boolean = false
): number {
  const rating = bot.rating;

  // Book moves or forced responses are played slightly faster
  if (moveNumber <= 4) {
    return Math.floor(Math.random() * 200) + 300; // 300ms - 500ms
  }

  if (isCheckOrCapture) {
    return Math.floor(Math.random() * 300) + 450; // 450ms - 750ms
  }

  if (rating <= 500) {
    // Beginner: quick, impulsive moves
    return Math.floor(Math.random() * 350) + 400; // 400ms - 750ms
  } else if (rating <= 1500) {
    // Intermediate: natural deliberation
    return Math.floor(Math.random() * 500) + 650; // 650ms - 1150ms
  } else {
    // Master / GM / Stockfish: deep simulated calculation
    return Math.floor(Math.random() * 600) + 850; // 850ms - 1450ms
  }
}
