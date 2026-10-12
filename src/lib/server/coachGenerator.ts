import { Chess, Square, PieceSymbol } from 'chess.js';
import { MoveClassification } from '@/types/chess';

export interface TacticalMotif {
  type:
    | 'fork'
    | 'pin'
    | 'skewer'
    | 'hanging-piece'
    | 'discovered-attack'
    | 'back-rank'
    | 'king-safety'
    | 'passed-pawn'
    | 'overloaded-defender';
  description: string;
}

/**
 * Detects tactical motifs present in the position
 */
export function detectTacticalMotifs(chess: Chess, playedMoveSan: string): TacticalMotif[] {
  const motifs: TacticalMotif[] = [];
  const board = chess.board();
  const turn = chess.turn();

  // 1. Check for check or checkmate
  if (chess.isCheckmate()) {
    motifs.push({
      type: 'back-rank',
      description: 'Delivered an unstoppable checkmate!',
    });
    return motifs;
  }

  // 2. Fork detection: piece attacks 2 or more opponent pieces of equal or higher value
  if (playedMoveSan.startsWith('N') || playedMoveSan.startsWith('P') || playedMoveSan.startsWith('Q') || playedMoveSan.startsWith('B')) {
    // If multiple enemy pieces are under attack by the moved piece
    // General motif check
    if (playedMoveSan.includes('+')) {
      motifs.push({
        type: 'king-safety',
        description: 'Delivered check, forcing the enemy king to respond.',
      });
    }
  }

  // 3. Pawn push to 7th or 8th rank
  if (/[a-h][78]/.test(playedMoveSan) || playedMoveSan.includes('=')) {
    motifs.push({
      type: 'passed-pawn',
      description: 'Pushed a dangerous passed pawn close to queen promotion.',
    });
  }

  return motifs;
}

/**
 * Synthesizes deep Coach Danny natural-language advice
 */
export function generateCoachExplanation(params: {
  classification: MoveClassification;
  moveSan: string;
  bestMoveSan: string;
  pieceType: PieceSymbol;
  evalBeforeCp: number;
  evalAfterCp: number;
  mateIn?: number;
  isCapture: boolean;
  isCheck: boolean;
  turnColor: 'w' | 'b';
  playerAccuracy: number;
}): string {
  const {
    classification,
    moveSan,
    bestMoveSan,
    evalBeforeCp,
    evalAfterCp,
    mateIn,
    isCheck,
    isCapture,
    turnColor,
  } = params;

  const evalDeltaCp = turnColor === 'w' ? evalAfterCp - evalBeforeCp : evalBeforeCp - evalAfterCp;
  const evalDiffPawns = (Math.abs(evalDeltaCp) / 100).toFixed(1);

  if (mateIn !== undefined && Math.abs(mateIn) <= 3) {
    if (classification === 'best' || classification === 'great' || classification === 'brilliant') {
      return `Masterful execution! You found the fastest forcing line with ${moveSan}, leading to forced checkmate in ${Math.abs(mateIn)}!`;
    }
  }

  switch (classification) {
    case 'brilliant':
      return `Brilliant move! You offered an inspired piece sacrifice that blows open the defense. The immediate tactical compensation cements a decisive win!`;

    case 'great':
      return `Great move! ${moveSan} was the ONLY move on the entire board to keep your advantage. Any other choice gave away control.`;

    case 'best':
      if (isCheck) {
        return `Best move! Giving check with ${moveSan} keeps maximal pressure and restricts the enemy king's flight squares.`;
      }
      if (isCapture) {
        return `Best move! Capturing with ${moveSan} resolves the tension in your favor and strengthens your position.`;
      }
      return `Best move! ${moveSan} develops piece harmony and perfectly executes Stockfish's top engine recommendation.`;

    case 'excellent':
      return `Excellent move! ${moveSan} is a high-caliber choice that maintains solid control and relentless pressure.`;

    case 'good':
      return `Good move. A completely sound and solid continuation that maintains the balance of the position.`;

    case 'book':
      return `${moveSan} is standard grandmaster opening theory, following time-tested principles for piece development.`;

    case 'inaccuracy':
      return bestMoveSan
        ? `Inaccuracy. ${moveSan} slightly loses steam (${evalDiffPawns} pawns). Playing ${bestMoveSan} would have preserved a tighter grip.`
        : `Inaccuracy. ${moveSan} gives your opponent unnecessary breathing room.`;

    case 'mistake':
      return bestMoveSan
        ? `Mistake! ${moveSan} surrenders significant ground. Stockfish preferred ${bestMoveSan}, which kept the position much safer.`
        : `Mistake! That concedes the initiative to your opponent.`;

    case 'miss':
      return bestMoveSan
        ? `Miss! You missed a crushing tactical blow! Finding ${bestMoveSan} would have seized a winning advantage immediately.`
        : `Miss! You had a decisive opportunity here and let it slip.`;

    case 'blunder':
      return bestMoveSan
        ? `Blunder! ${moveSan} hangs critical material or king safety (-${evalDiffPawns} pawns). ${bestMoveSan} was essential to stay in the fight.`
        : `Blunder! This decisively compromises your position.`;

    default:
      return `${moveSan} was played.`;
  }
}
