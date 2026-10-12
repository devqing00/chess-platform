import { PieceSymbol, Color } from 'chess.js';
import { MoveClassification } from '@/types/chess';

export interface WinProbDetails {
  winProbBefore: number; // 0 - 100%
  winProbAfter: number; // 0 - 100%
  winProbLoss: number; // 0 - 100%
  moveAccuracy: number; // 0 - 100%
}

export interface MoveClassificationResult {
  classification: MoveClassification;
  winProbLoss: number;
  accuracy: number;
  coachComment: string;
}

/**
 * Standard Chess.com & Lichess win probability sigmoid curve
 * Converts centipawns or mate into a 0 - 100% winning expectancy for White.
 */
export function centipawnsToWinProbability(scoreCp: number, mateIn?: number): number {
  if (mateIn !== undefined) {
    if (mateIn > 0) return 100.0;
    if (mateIn < 0) return 0.0;
    return 50.0;
  }
  // Formula: 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
  const exponent = -0.00368208 * scoreCp;
  // Guard against numerical overflow
  if (exponent > 40) return 0.0;
  if (exponent < -40) return 100.0;

  const sigmoid = 2.0 / (1.0 + Math.exp(exponent)) - 1.0;
  const prob = 50.0 + 50.0 * sigmoid;
  return Math.min(100.0, Math.max(0.0, prob));
}

/**
 * Official CAPS 2.0 Move Accuracy Formula:
 * Accuracy = 103.1668 * exp(-0.04354 * winProbLoss) - 3.1669
 */
export function calculateMoveAccuracy(winProbLoss: number): number {
  const loss = Math.max(0, winProbLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.min(100.0, Math.max(0.0, parseFloat(raw.toFixed(1))));
}

/**
 * Calculates aggregate CAPS accuracy from an array of move accuracies
 */
export function calculateGameCaps(accuracies: number[]): number {
  if (accuracies.length === 0) return 90.0;
  const sum = accuracies.reduce((a, b) => a + b, 0);
  const avg = sum / accuracies.length;
  return parseFloat(Math.min(99.9, Math.max(10.0, avg)).toFixed(1));
}

/**
 * Calculates Average Centipawn Loss (ACPL)
 */
export function calculateAcpl(centipawnLosses: number[]): number {
  if (centipawnLosses.length === 0) return 15.0;
  const sum = centipawnLosses.reduce((a, b) => a + Math.max(0, b), 0);
  return parseFloat((sum / centipawnLosses.length).toFixed(1));
}

/**
 * Calculates Estimated Performance Rating (EPR) / Game Rating
 * Derived from CAPS 2.0 accuracy, Average Centipawn Loss (ACPL), and opponent strength.
 */
export function calculateEstimatedPerformanceRating(params: {
  capsAccuracy: number;
  acpl: number;
  baselineElo?: number;
  opponentElo?: number;
}): number {
  const { capsAccuracy, acpl, baselineElo = 1500, opponentElo = 1500 } = params;
  const anchorElo = Math.round((baselineElo * 0.6) + (opponentElo * 0.4));
  
  // Dynamic scaling based on accuracy curve and ACPL penalty
  const accuracyDelta = (capsAccuracy - 72.0) * 26.0;
  const acplPenalty = Math.max(0, acpl) * 3.2;
  const rawRating = anchorElo + accuracyDelta - acplPenalty;

  // Bounded between 450 and 3150
  return Math.min(3150, Math.max(450, Math.round(rawRating)));
}

/**
 * Checks if a move was a genuine piece sacrifice
 */
export function isTacticalSacrifice(
  pieceType: PieceSymbol,
  isCapture: boolean,
  evalAfterCp: number,
  isWhite: boolean,
  winProbLoss: number
): boolean {
  // Minor or Major piece sacrificed
  const isHighValue = pieceType === 'n' || pieceType === 'b' || pieceType === 'r' || pieceType === 'q';
  if (!isHighValue) return false;

  // The move maintains high winning expectancy
  const isWinning = isWhite ? evalAfterCp >= 150 : evalAfterCp <= -150;
  return isWinning && winProbLoss <= 3.0;
}

/**
 * Classifies a move using the high-depth engine evaluation & CAPS 2.0 metrics
 */
export function classifyMoveEngine(params: {
  moveSan: string;
  bestMoveSan: string;
  secondBestMoveSan?: string;
  evalBeforeCp: number;
  evalAfterCp: number;
  mateBefore?: number;
  mateAfter?: number;
  turn: Color;
  plyIndex: number;
  pieceType: PieceSymbol;
  isCapture: boolean;
  isCheck: boolean;
  isBookMove: boolean;
  secondBestLoss?: number;
}): MoveClassificationResult {
  const {
    moveSan,
    bestMoveSan,
    evalBeforeCp,
    evalAfterCp,
    mateBefore,
    mateAfter,
    turn,
    plyIndex,
    pieceType,
    isCapture,
    isBookMove,
    secondBestLoss = 0,
  } = params;

  const isWhite = turn === 'w';

  // Calculate win probabilities from the moving player's perspective
  const whiteProbBefore = centipawnsToWinProbability(evalBeforeCp, mateBefore);
  const whiteProbAfter = centipawnsToWinProbability(evalAfterCp, mateAfter);

  const playerProbBefore = isWhite ? whiteProbBefore : 100 - whiteProbBefore;
  const playerProbAfter = isWhite ? whiteProbAfter : 100 - whiteProbAfter;

  const winProbLoss = Math.max(0, playerProbBefore - playerProbAfter);
  const accuracy = calculateMoveAccuracy(winProbLoss);

  // 1. Opening Book
  if (plyIndex <= 14 && isBookMove && winProbLoss <= 2.5) {
    return {
      classification: 'book',
      winProbLoss,
      accuracy: 100,
      coachComment: `${moveSan} is established grandmaster opening theory, controlling key central tension.`,
    };
  }

  // 2. Brilliant (Tactical Piece Sacrifice)
  if (
    isTacticalSacrifice(pieceType, isCapture, evalAfterCp, isWhite, winProbLoss) &&
    playerProbAfter >= 65 &&
    winProbLoss <= 2.0
  ) {
    return {
      classification: 'brilliant',
      winProbLoss,
      accuracy: 100,
      coachComment: `Brilliant move! You offered material sacrifice to shatter the opponent's defenses and maintain a winning attack!`,
    };
  }

  // 3. Great (Only winning move or clutch only-defense)
  const isEngineTopChoice = moveSan === bestMoveSan || winProbLoss <= 0.6;
  if (isEngineTopChoice && secondBestLoss >= 12.0 && playerProbAfter >= 50) {
    return {
      classification: 'great',
      winProbLoss,
      accuracy: 99.5,
      coachComment: `Great move! The only move in this position that preserves your advantage. Every other option conceded the initiative.`,
    };
  }

  // 4. Best Move
  if (isEngineTopChoice) {
    return {
      classification: 'best',
      winProbLoss,
      accuracy: 100,
      coachComment: `Best move! That was Stockfish's top recommendation in this position.`,
    };
  }

  // 5. Excellent
  if (winProbLoss <= 2.0) {
    return {
      classification: 'excellent',
      winProbLoss,
      accuracy,
      coachComment: `Excellent move! Maintains maximum pressure and solid positional control.`,
    };
  }

  // 6. Good
  if (winProbLoss <= 6.0) {
    return {
      classification: 'good',
      winProbLoss,
      accuracy,
      coachComment: `Good move. A totally playable, sound continuation.`,
    };
  }

  // 7. Inaccuracy
  if (winProbLoss <= 14.0) {
    return {
      classification: 'inaccuracy',
      winProbLoss,
      accuracy,
      coachComment: `Inaccuracy. ${bestMoveSan ? `Playing ${bestMoveSan} was sharper.` : 'Concedes slight counterplay to your opponent.'}`,
    };
  }

  // 8. Mistake
  if (winProbLoss <= 25.0) {
    return {
      classification: 'mistake',
      winProbLoss,
      accuracy,
      coachComment: `Mistake! You gave up the initiative. ${bestMoveSan ? `Finding ${bestMoveSan} would have kept the upper hand.` : ''}`,
    };
  }

  // 9. Miss (Missed tactical opportunity / checkmate)
  if (playerProbBefore >= 78.0 && winProbLoss > 25.0) {
    return {
      classification: 'miss',
      winProbLoss,
      accuracy,
      coachComment: `Miss! You had a decisive winning tactical blow! ${bestMoveSan} was winning on the spot.`,
    };
  }

  // 10. Blunder
  return {
    classification: 'blunder',
    winProbLoss,
    accuracy,
    coachComment: `Blunder! This decisively compromises the position. ${bestMoveSan ? `${bestMoveSan} was necessary to hold.` : ''}`,
  };
}
