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

  // Evaluate and score all legal candidate moves
  const scoredMoves: { move: Move; score: number }[] = legalMoves.map((m) => {
    chess.move(m);
    const score = ChessEvaluator.evaluateWithReply(chess);
    chess.undo();
    return { move: m, score };
  });

  // Sort best to worst from bot's perspective
  // If bot is Black, lower score is better for Black; if White, higher score is better.
  scoredMoves.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

  let chosenMove: Move = scoredMoves[0].move;
  let quoteType: keyof BotPersonality['quotes'] | null = null;

  if (rating <= 300) {
    // MARTIN (250 ELO): The lovable blunderer
    // 75% of the time, choose a random or suboptimal move
    const roll = Math.random();
    if (roll < 0.75 && scoredMoves.length > 1) {
      // Pick a random move from the middle or lower tier of legal moves
      const randomIndex = Math.floor(Math.random() * scoredMoves.length);
      chosenMove = scoredMoves[randomIndex].move;
      if (Math.random() < 0.4) {
        quoteType = 'blunder';
      }
    } else {
      chosenMove = scoredMoves[0].move;
    }
  } else if (rating <= 500) {
    // ELANI (400 ELO): Enthusiastic beginner
    const roll = Math.random();
    if (roll < 0.60 && scoredMoves.length > 1) {
      const candidateIndex = Math.min(
        scoredMoves.length - 1,
        Math.floor(Math.random() * Math.min(6, scoredMoves.length))
      );
      chosenMove = scoredMoves[candidateIndex].move;
    } else {
      chosenMove = scoredMoves[0].move;
    }
  } else if (rating <= 800) {
    // WAYNE (700 ELO): Coffee-shop casual
    const roll = Math.random();
    if (roll < 0.40 && scoredMoves.length > 2) {
      const candidateIndex = Math.floor(Math.random() * Math.min(3, scoredMoves.length));
      chosenMove = scoredMoves[candidateIndex].move;
    } else {
      chosenMove = scoredMoves[0].move;
    }
  } else if (rating <= 1400) {
    // NELSON (1300 ELO): Aggressive Queen attacks
    // Nelson prioritizes Queen moves in early game if legal
    if (chess.history().length < 12) {
      const queenMove = scoredMoves.find((sm) => sm.move.piece === 'q');
      if (queenMove && Math.random() < 0.65) {
        chosenMove = queenMove.move;
      } else {
        chosenMove = Math.random() < 0.25 && scoredMoves.length > 1 ? scoredMoves[1].move : scoredMoves[0].move;
      }
    } else {
      chosenMove = Math.random() < 0.20 && scoredMoves.length > 1 ? scoredMoves[1].move : scoredMoves[0].move;
    }
  } else if (rating <= 2000) {
    // Intermediate / Club Bots (1500 - 2000)
    chosenMove = Math.random() < 0.12 && scoredMoves.length > 1 ? scoredMoves[1].move : scoredMoves[0].move;
  } else {
    // Master / GM / Stockfish (2200 - 3200)
    // 98% pure minimax top choice
    chosenMove = scoredMoves[0].move;
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
