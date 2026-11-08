import { Chess, Move } from 'chess.js';
import type { BotPersonality } from '@/types/chess';
import { ChessEvaluator } from './chessEngine';
import { StockfishWorkerService } from './engine/stockfishWorkerService';

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
 * - Isabel (1600 ELO): Principled coach, sound pawn structure, patient positional play.
 * - Wendy (1800 ELO): Algorithmic endgame calculations, technical conversions.
 * - Coach Danny (2000 ELO): Balanced educational master moves.
 * - Jonas (2200 ELO): National Master tactical punch, razor-sharp attacking lines.
 * - Hikaru (2820 ELO): Speed demon, fast tactical counterpunches.
 * - Magnus (2882 ELO): Relentless endgame squeeze, positional precision.
 * - Stockfish (3200 ELO): Peak NNUE engine evaluation.
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
    // 75% of the time, pick a random legal move with deliberate tactical blunders
    const roll = Math.random();
    if (roll < 0.75) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      chosenMove = legalMoves[randomIndex];
      if (Math.random() < 0.4) {
        quoteType = 'blunder';
      }
    } else {
      // 25% simple 1-ply piece-value evaluation
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
    // ELANI (400 ELO) & WAYNE (700 ELO): Fast 1-ply position evaluation with human mistake rates
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
      if (Math.random() < 0.3) quoteType = 'blunder';
    } else {
      chosenMove = scored[0].move;
    }
  } else if (rating <= 1400) {
    // NELSON (1300 ELO): Aggressive Early Queen Excursions (Scholar's Mate enthusiast)
    const scored = legalMoves.map((m) => {
      chess.move(m);
      const score = ChessEvaluator.evaluatePosition(chess);
      chess.undo();
      return { move: m, score };
    });
    scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

    if (chess.history().length < 12) {
      // Look for queen moves that don't immediately hang the queen for free
      const safeQueenMoves = scored.filter((sm) => {
        if (sm.move.piece !== 'q') return false;
        chess.move(sm.move);
        const oppResponses = chess.moves({ verbose: true });
        const canCaptureQueen = oppResponses.some((om) => om.to === sm.move.to);
        chess.undo();
        return !canCaptureQueen;
      });

      if (safeQueenMoves.length > 0 && Math.random() < 0.65) {
        chosenMove = safeQueenMoves[0].move;
      } else {
        chosenMove = Math.random() < 0.25 && scored.length > 1 ? scored[1].move : scored[0].move;
      }
    } else {
      chosenMove = Math.random() < 0.20 && scored.length > 1 ? scored[1].move : scored[0].move;
    }
  } else {
    // Advanced, Masters & Grandmasters (Isabel 1600 to Stockfish 3200):
    // Deep candidate search across ALL legal moves (never arbitrary slice)
    const scored = legalMoves.map((m) => {
      chess.move(m);
      let score = ChessEvaluator.evaluatePosition(chess);

      // Positional enhancements
      // 1. Center dominance
      if (['d4', 'e4', 'd5', 'e5'].includes(m.to)) {
        score += isWhite ? 0.25 : -0.25;
      }
      // 2. King safety / Castling
      if (m.flags.includes('k') || m.flags.includes('q')) {
        score += isWhite ? 0.35 : -0.35;
      }
      // 3. Direct check bonus
      if (chess.isCheck()) {
        score += isWhite ? 0.30 : -0.30;
      }
      // 4. Opponent tactical refutation check (2-ply lookahead)
      if (rating >= 1800) {
        const oppMoves = chess.moves({ verbose: true });
        for (const om of oppMoves) {
          chess.move(om);
          if (chess.isCheckmate()) {
            // Hanging mate in 1 is fatal!
            score += isWhite ? -15.0 : 15.0;
            chess.undo();
            break;
          }
          chess.undo();
        }
      }

      chess.undo();
      return { move: m, score };
    });

    scored.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

    if (rating <= 1700) {
      // Isabel (1600): 12% slight positional concession
      chosenMove = Math.random() < 0.12 && scored.length > 1 ? scored[1].move : scored[0].move;
    } else {
      // Wendy 1800, Danny 2000, Jonas 2200, Hikaru 2820, Magnus 2882, Stockfish 3200:
      // Strictly best tactical candidate
      chosenMove = scored[0].move;
    }
  }

  // Quote contextualization
  if (!quoteType) {
    chess.move(chosenMove);
    if (chess.isCheck()) {
      quoteType = 'check';
    } else if (chess.isCheckmate()) {
      quoteType = 'win';
    } else if (Math.random() < 0.2) {
      quoteType = 'goodMove';
    }
    chess.undo();
  }

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
 * High-precision Asynchronous Bot Move Generator.
 * Executes genuine Stockfish 19 Lite NNUE via Web Worker with calibrated UCI Skill Level and Elo,
 * with seamless fallback to positional heuristic evaluator when offline or worker unavailable.
 */
export async function generateBotMoveAsync(
  chess: Chess,
  bot: BotPersonality
): Promise<BotMoveResult | null> {
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  if (legalMoves.length === 1) {
    return {
      san: legalMoves[0].san,
      from: legalMoves[0].from,
      to: legalMoves[0].to,
      promotion: legalMoves[0].promotion,
    };
  }

  const rating = bot.rating;

  // Nelson special persona: Prioritize Queen attacks in the first 12 moves
  if (rating === 1300 && chess.history().length < 12) {
    const fallbackNelson = generateBotMove(chess, bot);
    if (fallbackNelson && fallbackNelson.san.startsWith('Q')) {
      return fallbackNelson;
    }
  }

  // Martin 250: Lovable blunderer runs fast local blunder heuristic
  if (rating <= 300) {
    return generateBotMove(chess, bot);
  }

  // Check if Stockfish Web Worker is available client-side
  if (StockfishWorkerService.isSupported()) {
    try {
      let targetDepth = 10;
      let skillLevel = 10;
      let elo: number | undefined = undefined;

      if (rating <= 500) {
        targetDepth = 2;
        skillLevel = 1;
      } else if (rating <= 800) {
        targetDepth = 3;
        skillLevel = 3;
      } else if (rating <= 1400) {
        targetDepth = 6;
        skillLevel = 6;
        elo = 1300;
      } else if (rating <= 1700) {
        targetDepth = 8;
        skillLevel = 9;
        elo = 1600;
      } else if (rating <= 1950) {
        targetDepth = 10;
        skillLevel = 12;
        elo = 1800;
      } else if (rating <= 2100) {
        targetDepth = 12;
        skillLevel = 14;
        elo = 2000;
      } else if (rating <= 2400) {
        targetDepth = 13;
        skillLevel = 16;
        elo = 2200;
      } else if (rating <= 2850) {
        // Hikaru
        targetDepth = 15;
        skillLevel = 19;
        elo = 2820;
      } else if (rating <= 3000) {
        // Magnus
        targetDepth = 16;
        skillLevel = 20;
        elo = 2882;
      } else {
        // Stockfish 3200
        targetDepth = 18;
        skillLevel = 20;
      }

      const workerRes = await StockfishWorkerService.getBotMove(chess.fen(), {
        depth: targetDepth,
        skillLevel,
        elo,
      });

      if (workerRes) {
        // Find matching legal move to get SAN
        const matched = legalMoves.find(
          (m) =>
            m.from === workerRes.from &&
            m.to === workerRes.to &&
            (!workerRes.promotion || m.promotion === workerRes.promotion)
        );

        if (matched) {
          let quoteType: keyof BotPersonality['quotes'] | null = null;
          chess.move(matched);
          if (chess.isCheck()) quoteType = 'check';
          else if (chess.isCheckmate()) quoteType = 'win';
          else if (Math.random() < 0.25) quoteType = 'goodMove';
          chess.undo();

          let quote: string | undefined;
          if (quoteType && bot.quotes[quoteType] && bot.quotes[quoteType]!.length > 0) {
            const list = bot.quotes[quoteType]!;
            quote = list[Math.floor(Math.random() * list.length)];
          }

          return {
            san: matched.san,
            from: matched.from,
            to: matched.to,
            promotion: matched.promotion,
            quote,
          };
        }
      }
    } catch (err) {
      console.warn('[botEngine] StockfishWorker move calculation fell back to heuristic:', err);
    }
  }

  // Graceful fallback to heuristic evaluator
  return generateBotMove(chess, bot);
}

/**
 * Calculates humanized, realistic thinking latency for bot moves:
 * - Imitates genuine human calculation, scanning the board, and pondering responses.
 * - Opening moves: 900ms - 1500ms (natural, confident opening play without instant machine reflexes).
 * - Recaptures & forced moves: 1000ms - 1600ms.
 * - Beginner bots: 1200ms - 2200ms (thoughtful pauses).
 * - Intermediate bots: 1600ms - 2800ms (calculating pawn structures and tactics).
 * - Master & GM bots: 2200ms - 3800ms (deep positional reasoning and tactical validation).
 */
export function calculateBotThinkingDelayMs(
  bot: BotPersonality,
  moveNumber: number = 1,
  isCheckOrCapture: boolean = false
): number {
  const rating = bot.rating;

  // Opening moves: natural opening speed (not instant)
  if (moveNumber <= 4) {
    return Math.floor(Math.random() * 600) + 900; // 900ms - 1500ms
  }

  // Recaptures or answers to checks: calculated but forcing
  if (isCheckOrCapture) {
    return Math.floor(Math.random() * 600) + 1000; // 1000ms - 1600ms
  }

  if (rating <= 500) {
    // Beginner: casual scanning and thought process
    return Math.floor(Math.random() * 1000) + 1200; // 1200ms - 2200ms
  } else if (rating <= 1500) {
    // Intermediate: deliberate tactical consideration
    return Math.floor(Math.random() * 1200) + 1600; // 1600ms - 2800ms
  } else {
    // Master / GM / Stockfish: deep simulated calculation
    return Math.floor(Math.random() * 1600) + 2200; // 2200ms - 3800ms
  }
}
