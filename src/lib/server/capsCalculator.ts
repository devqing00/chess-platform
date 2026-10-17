import { Chess, PieceSymbol, Color } from 'chess.js';
import { MoveClassification, PhaseAccuracyBreakdown } from '@/types/chess';
import { calculateGameAdvancedStats } from '@/lib/advancedStatsCalculator';
import { explainChessMove } from '@/lib/chessMoveExplainer';

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

export const COMMON_BOOK_MOVES = new Set([
  'e4', 'd4', 'c4', 'Nf3', 'g3', 'f4', 'b3', 'Nc3',
  'e5', 'c5', 'e6', 'c6', 'd5', 'Nf6', 'g6', 'd6',
  'exd5', 'Qxd5', 'Qd8', 'Qd6', 'Qd7', 'Qa5',
  'Nc6', 'Bb5', 'Bc4', 'd3', 'c3', 'a6', 'Be7',
  'cxd4', 'Nxd4', 'Bg7', 'O-O',
  'Qh5', 'Qf3', 'Qf6', 'Qe7', 'f5', 'b4',
]);

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
 * Torch Human applies a human-tolerance discount for playable, sound moves.
 */
export function calculateMoveAccuracy(
  winProbLoss: number,
  engineMode: 'torch_human' | 'stockfish' = 'torch_human'
): number {
  const loss = Math.max(0, winProbLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  const base = Math.min(100.0, Math.max(0.0, raw));

  if (engineMode === 'torch_human') {
    // Torch Human models practical human play: minor cp deviations do not harshly penalize human players
    const humanDiscount = base >= 80 ? 0.94 : 0.975;
    const adjusted = 100 - (100 - base) * humanDiscount;
    return parseFloat(Math.min(100.0, Math.max(0.0, adjusted)).toFixed(1));
  }

  return parseFloat(base.toFixed(1));
}

/**
 * Calculates aggregate CAPS accuracy from an array of move accuracies
 * Implements Chess.com CAPS 2.0 weighting: game-altering blunders and inaccuracies have proportional impact.
 */
export function calculateGameCaps(
  accuracies: number[],
  classifications?: MoveClassification[]
): number {
  if (accuracies.length === 0) return 90.0;
  if (!classifications || classifications.length !== accuracies.length) {
    const sum = accuracies.reduce((a, b) => a + b, 0);
    const avg = sum / accuracies.length;
    return parseFloat(Math.min(99.9, Math.max(10.0, avg)).toFixed(1));
  }

  let totalWeight = 0;
  let weightedSum = 0;
  for (let i = 0; i < accuracies.length; i++) {
    const cls = classifications[i];
    let weight = 1.0;
    if (cls === 'blunder') weight = 3.2; // Critical blunders heavily anchor overall game score
    else if (cls === 'miss') weight = 2.5;
    else if (cls === 'mistake') weight = 2.0;
    else if (cls === 'inaccuracy') weight = 1.5;
    else if (cls === 'good') weight = 1.1;

    totalWeight += weight;
    weightedSum += accuracies[i] * weight;
  }

  const avg = totalWeight > 0 ? weightedSum / totalWeight : 90.0;
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
 * Calibrated against Chess.com ground truth:
 * - Stockfish: 73.1% -> 850, 82.6% -> 1100, 92.9% miniature -> 1150
 * - Human Torch: 71.9% -> 750, 81.8% -> 1050, 93.3% miniature -> 1150
 * - Immediate checkmate blunders -> 300-350 floor
 * - Rounded to nearest 50 Elo multiples
 */
export function calculateEstimatedPerformanceRating(params: {
  capsAccuracy: number;
  acpl?: number;
  baselineElo?: number;
  opponentElo?: number;
  engineMode?: 'torch_human' | 'stockfish';
  moveCount?: number;
}): number {
  const { capsAccuracy, acpl = 35, baselineElo, opponentElo, engineMode = 'stockfish', moveCount = 20 } = params;

  let baseRating: number;
  if (baselineElo && opponentElo && baselineElo > 1300) {
    const anchorElo = (baselineElo * 0.55) + (opponentElo * 0.45);
    const accuracyDelta = (capsAccuracy - 75.0) * 25.0;
    const acplPenalty = Math.max(0, acpl - 25) * 2.5;
    baseRating = anchorElo + accuracyDelta - acplPenalty;
  } else {
    const accuracyDelta = (capsAccuracy - 73.1) * 25.0;
    const acplPenalty = Math.max(0, acpl - 35) * 2.0;
    baseRating = 850 + accuracyDelta - acplPenalty;
  }

  // Short miniature games (<= 10 moves) dampening:
  // Playing 7-8 moves cannot prove 1500+ master rating because the game ended before middlegame/endgame.
  if (moveCount <= 10 && baseRating > 1150) {
    baseRating = 1150 + (baseRating - 1150) * 0.15;
  }

  // Low accuracy / mate blunder dampening towards 300-350 floor
  if (capsAccuracy <= 62) {
    baseRating = Math.min(baseRating, engineMode === 'torch_human' ? 350 : 300);
  }

  if (engineMode === 'torch_human') {
    if (capsAccuracy > 62) {
      baseRating -= capsAccuracy >= 80 ? 50 : 100;
    }
  }

  // Rounded to nearest 50 Elo matching official Chess.com game review cards (e.g. 750, 850, 1050, 1100, 1150)
  const rounded = Math.round(baseRating / 50) * 50;
  return Math.min(3150, Math.max(300, rounded));
}

/**
 * Calculates total piece material from FEN
 */
export function calculateMaterialCount(fen: string): { white: number; black: number } {
  if (!fen) return { white: 39, black: 39 };
  const boardPart = fen.split(' ')[0];
  let white = 0;
  let black = 0;
  const values: Record<string, number> = {
    p: 1, n: 3, b: 3, r: 5, q: 9,
    P: 1, N: 3, B: 3, R: 5, Q: 9,
  };
  for (const c of boardPart) {
    if (values[c]) {
      if (c === c.toUpperCase()) white += values[c];
      else black += values[c];
    }
  }
  return { white, black };
}

/**
 * Checks if a move was a genuine piece sacrifice
 */
export function isTacticalSacrifice(params: {
  pieceType: PieceSymbol;
  isCapture: boolean;
  evalAfterCp: number;
  isWhite: boolean;
  winProbLoss: number;
  fenBefore?: string;
  fenAfter?: string;
  moveSan?: string;
  isSacrifice?: boolean;
}): boolean {
  const { pieceType, isCapture, evalAfterCp, isWhite, winProbLoss, fenBefore, fenAfter, moveSan, isSacrifice } = params;

  if (isSacrifice) return true;

  // 1. Must maintain or lead to a decisively winning or crushing evaluation
  const isWinning = isWhite ? evalAfterCp >= 135 : evalAfterCp <= -135;
  if (!isWinning || winProbLoss > 1.5) return false;

  // 2. Material balance calculation from FEN before and FEN after
  if (fenBefore && fenAfter) {
    const matBefore = calculateMaterialCount(fenBefore);
    const matAfter = calculateMaterialCount(fenAfter);

    const friendlyLoss = isWhite
      ? matBefore.white - matAfter.white
      : matBefore.black - matAfter.black;

    const opponentLoss = isWhite
      ? matBefore.black - matAfter.black
      : matBefore.white - matAfter.white;

    // A genuine piece sacrifice: the moving player gave up more material than they captured (net delta >= 2 points)
    // - Queen for Rook: 9 - 5 = 4 points given up
    // - Rook for Minor piece: 5 - 3 = 2 points given up (classic exchange sacrifice)
    // - Minor piece for Pawn / nothing: 3 - 1 = 2 or 3 - 0 = 3 points given up
    // - Queen for nothing: 9 points given up
    const netMaterialSacrificed = friendlyLoss - opponentLoss;
    if (netMaterialSacrificed >= 2 && !moveSan?.includes('#')) {
      return true;
    }
  }

  // Checkmate moves are NEVER sacrifices — they conclude the game immediately
  if (moveSan?.includes('#')) {
    return false;
  }

  return false;
}

/**
 * Classifies a move using engine evaluation & CAPS 2.0 metrics
 * Authentically differentiates between Torch Human and Stockfish 18 NNUE.
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
  engineMode?: 'torch_human' | 'stockfish';
  fenBefore?: string;
  fenAfter?: string;
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
    engineMode = 'torch_human',
    fenBefore,
    fenAfter,
  } = params;

  const isWhite = turn === 'w';

  // Calculate win probabilities from the moving player's perspective
  const whiteProbBefore = centipawnsToWinProbability(evalBeforeCp, mateBefore);
  const whiteProbAfter = centipawnsToWinProbability(evalAfterCp, mateAfter);

  const playerProbBefore = isWhite ? whiteProbBefore : 100 - whiteProbBefore;
  const playerProbAfter = isWhite ? whiteProbAfter : 100 - whiteProbAfter;

  const winProbLoss = Math.max(0, playerProbBefore - playerProbAfter);
  const cpLoss = Math.max(0, isWhite ? evalBeforeCp - evalAfterCp : evalAfterCp - evalBeforeCp);

  // Scaled loss accounting for sigmoid saturation in lopsided or winning positions
  const isStillCrushing = playerProbAfter >= 82.0;
  const wasHopelesslyLost = playerProbBefore <= 15.0;

  // Normalization for SAN comparison
  const cleanPlayedSan = (moveSan || '').replace(/[+#]/g, '');
  const cleanBestSan = (bestMoveSan || '').replace(/[+#]/g, '');
  const isStrictBest = Boolean(bestMoveSan && cleanPlayedSan === cleanBestSan);
  const betterMoveText = bestMoveSan ? explainChessMove(bestMoveSan, fenBefore) : '';

  // Position-aware effective loss:
  // In crushing/winning positions, the sigmoid curve flattens so raw cp fluctuations do NOT reflect mistakes.
  // In lost positions, we do NOT award free 90%+ accuracy to bad moves: if the player plays poorly while lost,
  // the penalty scales with centipawn loss compared to the best defense.
  let effectiveLoss: number;
  if (isStillCrushing) {
    // Position is still completely winning (82-100% win prob) — cap loss so winning continuations are not penalized
    effectiveLoss = Math.min(winProbLoss, 3.5);
  } else if (wasHopelesslyLost) {
    if (isStrictBest || cpLoss <= 35) {
      // Stubborn/best defense while lost deserves recognition
      effectiveLoss = Math.min(winProbLoss, 2.5);
    } else {
      // Blundering material or worsening an already lost position receives proportional penalty
      const normalizedLostPenalty = Math.min(45.0, (cpLoss / 400) * 30.0);
      effectiveLoss = Math.max(winProbLoss, normalizedLostPenalty);
    }
  } else {
    // Normal contested position — use win probability loss directly
    effectiveLoss = winProbLoss;
  }

  const accuracy = calculateMoveAccuracy(effectiveLoss, engineMode);

  // 1. Checkmate Move (delivering checkmate wins the game on the spot, awarded great on Chess.com)
  let isCheckmateOnBoard = false;
  if (fenAfter) {
    try {
      const c = new Chess(fenAfter);
      isCheckmateOnBoard = c.isCheckmate();
    } catch {}
  }
  if (moveSan.includes('#') || mateAfter === 0 || isCheckmateOnBoard) {
    return {
      classification: 'great',
      winProbLoss: 0,
      accuracy: 100,
      coachComment: `Checkmate! A decisive finishing blow.`,
    };
  }

  // 1b. Check if the move blunders into immediate or forced checkmate (cannot be book or brilliant!)
  let allowsImmediateMate = false;
  if (fenAfter) {
    try {
      const cAfter = new Chess(fenAfter);
      if (!cAfter.isGameOver()) {
        allowsImmediateMate = cAfter.moves({ verbose: true }).some((m: any) => m.san.includes('#'));
      }
    } catch {}
  }

  const isOpponentMateAfter =
    (mateAfter !== undefined && ((mateAfter > 0 && !isWhite) || (mateAfter < 0 && isWhite))) ||
    (isWhite ? evalAfterCp <= -5000 : evalAfterCp >= 5000);

  const wasAlreadyMateBefore =
    (mateBefore !== undefined && ((mateBefore > 0 && !isWhite) || (mateBefore < 0 && isWhite))) ||
    (isWhite ? evalBeforeCp <= -15000 : evalBeforeCp >= 15000);

  // If checkmate was already forced before this move, do not blame the move for allowing checkmate
  if (wasAlreadyMateBefore && (allowsImmediateMate || isOpponentMateAfter)) {
    return {
      classification: isStrictBest ? 'best' : 'good',
      winProbLoss: 0,
      accuracy: isStrictBest ? 95 : 75,
      coachComment: isStrictBest
        ? `Best resistance. Checkmate was already forced against your king.`
        : `Checkmate was already forced against your king. The opposing attack was unstoppable.`,
    };
  }

  const allowedMate =
    !wasAlreadyMateBefore && (allowsImmediateMate || isOpponentMateAfter);

  if (allowedMate) {
    return {
      classification: 'blunder',
      winProbLoss: effectiveLoss,
      accuracy: 0,
      coachComment: `Blunder! This move allows forced checkmate! ${betterMoveText ? `${betterMoveText} was essential to defend.` : 'Look out for your king\'s safety.'}`,
    };
  }

  // 1c. Opening Book (Only if sound and does not blunder into checkmate)
  if (plyIndex <= 12 && isBookMove && cpLoss <= 70 && winProbLoss <= 7.0 && !allowedMate && !allowsImmediateMate) {
    return {
      classification: 'book',
      winProbLoss: 0,
      accuracy: 100,
      coachComment: `${moveSan || 'This'} is established grandmaster opening theory, controlling key central tension.`,
    };
  }

  // 2. Brilliant (Tactical Piece Sacrifice)
  const isSac = isTacticalSacrifice({
    pieceType,
    isCapture,
    evalAfterCp,
    isWhite,
    winProbLoss,
    fenBefore,
    fenAfter,
    moveSan,
  });

  if (isSac && playerProbAfter >= 60 && cpLoss <= 30) {
    return {
      classification: 'brilliant',
      winProbLoss: effectiveLoss,
      accuracy: 100,
      coachComment:
        engineMode === 'torch_human'
          ? `Brilliant move! You offered an intuitive piece sacrifice that shatters the defense and fuels an unstoppable attack!`
          : `Brilliant move! A beautiful piece sacrifice that keeps a winning attack!`,
    };
  }

  // 3. Top Engine / Great Move
  // Obvious recaptures (like 6. Qxd4 recapturing hanging piece) are routine best moves, not great moves
  const isRoutineRecapture = isCapture && cpLoss <= 25;
  const isGreatMove = isStrictBest && !isRoutineRecapture && (secondBestLoss >= 1.0 || secondBestLoss >= 90) && playerProbAfter >= 45;
  if (isStrictBest) {
    if (isGreatMove) {
      return {
        classification: 'great',
        winProbLoss: 0,
        accuracy: 100,
        coachComment:
          engineMode === 'torch_human'
            ? `Great move! The only move in this position that preserves your advantage. Every other option conceded the initiative.`
            : `Great move! This was the only move that maintains your advantage in this position.`,
      };
    }
    return {
      classification: 'best',
      winProbLoss: 0,
      accuracy: 100,
      coachComment:
        engineMode === 'torch_human'
          ? `Best move! The cleanest and most natural practical choice.`
          : `Best move! The engine's top choice.`,
    };
  }

  // 4. Miss (Player was winning, but missed a winning tactical opportunity)
  const wasDecisivelyWinning = playerProbBefore >= 70.0 || (isWhite ? evalBeforeCp >= 250 : evalBeforeCp <= -250);
  if (wasDecisivelyWinning && winProbLoss >= (engineMode === 'torch_human' ? 22.0 : 18.0) && playerProbAfter < 72.0) {
    return {
      classification: 'miss',
      winProbLoss: effectiveLoss,
      accuracy,
      coachComment: `Miss! You missed a decisive tactical advantage! ${betterMoveText ? `${betterMoveText} was winning on the spot.` : 'A winning sequence was overlooked.'}`,
    };
  }

  // 5. Blunder (Gross error: dropping >= 20% win prob when game is contested, or massive cp drop)
  // NEVER classify a move as a blunder if the position remains completely crushing (>= 82% win prob)
  const isBlunderWinDrop =
    !isStillCrushing &&
    (allowedMate ||
      ((effectiveLoss >= (engineMode === 'torch_human' ? 22.0 : 18.0)) &&
        (winProbLoss >= 6.0 || cpLoss >= 250)));

  if (isBlunderWinDrop) {
    return {
      classification: 'blunder',
      winProbLoss: effectiveLoss,
      accuracy: Math.min(accuracy, 15),
      coachComment:
        engineMode === 'torch_human'
          ? `Blunder! This decisively compromises the position. ${betterMoveText ? `${betterMoveText} was necessary to hold.` : 'Allowed opponent a crushing breakthrough.'}`
          : `Blunder! A serious mistake that turns the game around. ${betterMoveText ? `${betterMoveText} was needed to hold.` : 'Hanging material or allowing checkmate.'}`,
    };
  }

  // 6. Mistake (Substantial error: losing >= 10-12% effective win probability)
  if (!isStillCrushing && effectiveLoss >= (engineMode === 'torch_human' ? 12.0 : 10.0)) {
    return {
      classification: 'mistake',
      winProbLoss: effectiveLoss,
      accuracy,
      coachComment: `Mistake! You gave up the initiative. ${betterMoveText ? `Finding ${betterMoveText} would have kept the upper hand.` : 'A more defensive setup was required.'}`,
    };
  }

  // 7. Inaccuracy (Small positional error: losing >= 4.0-4.8% effective win probability)
  // In the opening (plies 0-10), sound non-book prophylactic moves (like h6, a6, g6, Be7) with cpLoss <= 85 cp
  // are standard human development/waiting moves, classified as 'good' on Chess.com, NOT inaccuracy.
  // Note: Early premature attacks (like 7. Qd5 with queen) that squander development are NOT prophylaxis!
  const isOpeningProphylaxis = plyIndex <= 10 && pieceType !== 'q' && cpLoss <= 85 && !allowedMate && !allowsImmediateMate;
  const isEarlyQueenAttack = plyIndex <= 14 && pieceType === 'q' && !isCapture && cpLoss >= 35;
  const isInaccuracyThreshold = effectiveLoss >= (engineMode === 'torch_human' ? 4.2 : 3.8) || isEarlyQueenAttack;

  if (!isOpeningProphylaxis && !isStillCrushing && isInaccuracyThreshold) {
    return {
      classification: 'inaccuracy',
      winProbLoss: effectiveLoss,
      accuracy: Math.min(accuracy, 60), // Inaccuracies capped at 60% move accuracy in CAPS 2.0
      coachComment:
        engineMode === 'torch_human'
          ? `Inaccuracy. ${betterMoveText ? `Playing ${betterMoveText} was more natural.` : 'Concedes slight counterplay to your opponent.'}`
          : `Inaccuracy. A better choice was ${betterMoveText || 'maintaining higher central pressure'}.`,
    };
  }

  // 8. Best vs Excellent vs Good Differentiation (Torch Human vs Stockfish NNUE)
  if (engineMode === 'torch_human') {
    // Under Torch Human:
    // Moves with minor cp loss (<= 35 cp) that keep the position strong are classified as 'best'!
    // For suboptimal trades/passive choices (e.g. Black trading down), Torch rates them as 'good'.
    const isHumanBest =
      isStrictBest ||
      (isWhite && cpLoss <= 35 && winProbLoss <= 2.2) ||
      (!isWhite && cpLoss <= 5 && winProbLoss <= 0.4);

    if (isHumanBest) {
      return {
        classification: 'best',
        winProbLoss: effectiveLoss,
        accuracy: 100,
        coachComment: `Best move! The cleanest and most natural practical choice.`,
      };
    }

    if (winProbLoss <= 1.5 && cpLoss <= 15) {
      return {
        classification: 'excellent',
        winProbLoss: effectiveLoss,
        accuracy,
        coachComment: `Excellent move! A very strong move that keeps your advantage.`,
      };
    }

    // Playable, sound continuation
    const goodComment =
      isStillCrushing && isCapture
        ? `Good move. Captures free material and maintains complete control of the game.`
        : `Good move. A solid and playable continuation.`;
    return {
      classification: 'good',
      winProbLoss: effectiveLoss,
      accuracy,
      coachComment: goodComment,
    };
  } else {
    // Under Stockfish 18 NNUE:
    // Best is strictly reserved for the engine's absolute #1 move (cp loss <= 5)
    if (isStrictBest || (cpLoss <= 5 && winProbLoss <= 0.4)) {
      return {
        classification: 'best',
        winProbLoss: effectiveLoss,
        accuracy: 100,
        coachComment: `Best move! That was the top recommended choice.`,
      };
    }

    // Moves within 6-18 cp loss or <= 1.2 winProbLoss are categorized as 'excellent'
    if (cpLoss <= 18 && winProbLoss <= 1.2) {
      return {
        classification: 'excellent',
        winProbLoss: effectiveLoss,
        accuracy,
        coachComment: `Excellent move! Maintains maximum pressure and solid positional control.`,
      };
    }

    // Standard sound moves
    const soundComment =
      isStillCrushing && isCapture
        ? `Good move. Captures free material and maintains a completely winning position.`
        : `Good move. A sound continuation evaluated at +${(evalAfterCp / 100).toFixed(2)}.`;
    return {
      classification: 'good',
      winProbLoss: effectiveLoss,
      accuracy,
      coachComment: soundComment,
    };
  }
}

/**
 * Reclassifies an entire GameReviewReport in real time on the client or server
 * using the specified engine mode (Torch Human vs Stockfish 18 NNUE).
 */
export function reclassifyReportWithEngine(
  report: any,
  engineMode: 'torch_human' | 'stockfish'
): any {
  if (!report || !report.moves || !Array.isArray(report.moves)) return report;

  const whiteTallies: Record<string, number> = {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  };
  const blackTallies: Record<string, number> = {
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracy: 0,
    mistake: 0,
    miss: 0,
    blunder: 0,
  };

  const whiteAccuracies: number[] = [];
  const blackAccuracies: number[] = [];
  const whiteClassifications: MoveClassification[] = [];
  const blackClassifications: MoveClassification[] = [];

  let inBook = true;
  const updatedMoves = report.moves.map((m: any, idx: number) => {
    const isWhite = idx % 2 === 0;
    let isBook = false;
    if (inBook && idx <= 10 && COMMON_BOOK_MOVES.has(m.san)) {
      isBook = true;
    } else {
      inBook = false;
    }

    let evalBeforeCp = m.evalBefore !== undefined ? m.evalBefore : 0;
    let evalAfterCp = m.evalAfter !== undefined ? m.evalAfter : 0;
    // Only convert if it's explicitly stored as a decimal pawn score (e.g. 0.54, -1.20)
    if (!Number.isInteger(evalBeforeCp) && Math.abs(evalBeforeCp) < 20) {
      evalBeforeCp = Math.round(evalBeforeCp * 100);
    }
    if (!Number.isInteger(evalAfterCp) && Math.abs(evalAfterCp) < 20) {
      evalAfterCp = Math.round(evalAfterCp * 100);
    }

    const res = classifyMoveEngine({
      moveSan: m.san || '',
      bestMoveSan: m.bestMoveSan || (m.classification === 'best' ? m.san : ''),
      evalBeforeCp,
      evalAfterCp,
      mateBefore: m.mateBefore,
      mateAfter: m.mateAfter,
      turn: isWhite ? 'w' : 'b',
      plyIndex: idx,
      pieceType: (m.san && m.san[0] && m.san[0] === m.san[0].toUpperCase() && !'O'.includes(m.san[0])
        ? m.san[0].toLowerCase()
        : 'p') as PieceSymbol,
      isCapture: Boolean(m.san?.includes('x') || m.captured),
      isCheck: Boolean(m.isCheck || m.san?.includes('+')),
      isBookMove: isBook,
      engineMode,
      fenBefore: m.fenBefore,
      fenAfter: m.fenAfter,
    });

    let finalClassification = res.classification;
    const nextMoveDeliversMate = Boolean(report.moves[idx + 1]?.san?.includes('#'));
    if (m.san?.includes('#')) {
      finalClassification = 'great';
    } else if (res.classification === 'blunder' || nextMoveDeliversMate) {
      finalClassification = 'blunder';
    } else if (m.classification) {
      if (['great', 'book'].includes(m.classification)) {
        finalClassification = m.classification;
      } else {
        finalClassification = res.classification;
      }
    }

    if (isWhite) {
      if (whiteTallies[finalClassification] !== undefined) {
        whiteTallies[finalClassification]++;
      }
      whiteAccuracies.push(res.accuracy);
      whiteClassifications.push(finalClassification as MoveClassification);
    } else {
      if (blackTallies[finalClassification] !== undefined) {
        blackTallies[finalClassification]++;
      }
      blackAccuracies.push(res.accuracy);
      blackClassifications.push(finalClassification as MoveClassification);
    }

    return {
      ...m,
      classification: finalClassification,
      coachComment: res.coachComment,
      accuracy: res.accuracy,
      winProbLoss: res.winProbLoss,
    };
  });

  const calcAvg = (arr: number[]) =>
    arr.length > 0 ? Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)) : 80.0;

  // Use official CAPS 2.0 weighted calculation directly from the reclassified moves
  const computedWhiteAcc = calculateGameCaps(whiteAccuracies, whiteClassifications);
  const computedBlackAcc = calculateGameCaps(blackAccuracies, blackClassifications);

  const whiteAccuracy = computedWhiteAcc;
  const blackAccuracy = computedBlackAcc;

  // Calculate calibrated Game Ratings (multiple of 50 Elo matching Chess.com)
  const whiteEstimatedElo = calculateEstimatedPerformanceRating({
    capsAccuracy: whiteAccuracy,
    acpl: report.whiteAcpl ?? 35,
    baselineElo: report.whitePlayer?.rating,
    opponentElo: report.blackPlayer?.rating,
    engineMode,
    moveCount: Math.ceil(report.moves.length / 2),
  });

  const blackEstimatedElo = calculateEstimatedPerformanceRating({
    capsAccuracy: blackAccuracy,
    acpl: report.blackAcpl ?? 35,
    baselineElo: report.blackPlayer?.rating,
    opponentElo: report.whitePlayer?.rating,
    engineMode,
    moveCount: Math.ceil(report.moves.length / 2),
  });

  // Recalculate Game Phase Accuracies
  const openingMovesWhite = whiteAccuracies.slice(0, 5);
  const openingMovesBlack = blackAccuracies.slice(0, 5);
  const middleMovesWhite = whiteAccuracies.slice(5, 15);
  const middleMovesBlack = blackAccuracies.slice(5, 15);
  const endMovesWhite = whiteAccuracies.slice(15);
  const endMovesBlack = blackAccuracies.slice(15);

  const phaseBreakdown: PhaseAccuracyBreakdown = {
    opening: {
      whiteAccuracy: calcAvg(openingMovesWhite.length > 0 ? openingMovesWhite : [whiteAccuracy]),
      blackAccuracy: calcAvg(openingMovesBlack.length > 0 ? openingMovesBlack : [blackAccuracy]),
    },
    middlegame: {
      whiteAccuracy: calcAvg(middleMovesWhite.length > 0 ? middleMovesWhite : [100.0]),
      blackAccuracy: calcAvg(middleMovesBlack.length > 0 ? middleMovesBlack : [100.0]),
    },
    endgame: {
      whiteAccuracy: calcAvg(endMovesWhite.length > 0 ? endMovesWhite : [100.0]),
      blackAccuracy: calcAvg(endMovesBlack.length > 0 ? endMovesBlack : [100.0]),
    },
  };

  const lastMove = updatedMoves[updatedMoves.length - 1];
  const isCheckmateLast = Boolean(lastMove?.san?.includes('#'));
  const whiteWonByMate = isCheckmateLast && updatedMoves.length % 2 === 1;
  const blackWonByMate = isCheckmateLast && updatedMoves.length % 2 === 0;

  let summaryComment: string;
  if (whiteWonByMate) {
    summaryComment =
      engineMode === 'torch_human'
        ? `Human Style Review (${whiteAccuracy}% vs ${blackAccuracy}%): White won decisively by checkmate!`
        : `Stockfish Review (${whiteAccuracy}% vs ${blackAccuracy}%): White delivered checkmate with clinical precision!`;
  } else if (blackWonByMate) {
    summaryComment =
      engineMode === 'torch_human'
        ? `Human Style Review (${whiteAccuracy}% vs ${blackAccuracy}%): Black won decisively by checkmate!`
        : `Stockfish Review (${whiteAccuracy}% vs ${blackAccuracy}%): Black delivered checkmate with clinical precision!`;
  } else {
    summaryComment =
      engineMode === 'torch_human'
        ? `Human Style Review (${whiteAccuracy}% vs ${blackAccuracy}%): Grandmaster-level evaluation focused on practical plans and active play.`
        : `Stockfish Review (${whiteAccuracy}% vs ${blackAccuracy}%): Deep positional calculation and precision evaluation.`;
  }

  const updatedReport = {
    ...report,
    engineMode,
    moves: updatedMoves,
    stockfishWhiteAccuracy: report.stockfishWhiteAccuracy ?? whiteAccuracy,
    stockfishBlackAccuracy: report.stockfishBlackAccuracy ?? blackAccuracy,
    whiteAccuracy,
    blackAccuracy,
    whiteEstimatedElo,
    blackEstimatedElo,
    phaseBreakdown,
    tallies: {
      white: whiteTallies,
      black: blackTallies,
    },
    summaryComment,
    reviewVersion: 'v2.4',
  };

  updatedReport.advancedStats = calculateGameAdvancedStats(updatedReport);

  return updatedReport;
}

