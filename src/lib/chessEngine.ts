import { Chess, Square, PieceSymbol, Color } from 'chess.js';
import { MoveClassification } from '@/types/chess';

// Piece values in centipawns
const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional piece-square tables for White (mirrored for Black)
const PAWN_PST = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50,
];

const BISHOP_PST = [
  -20,-10,-10,-10,-10,-10,-10,-20,
  -10,  0,  5,  0,  0,  5,  0,-10,
  -10, 10, 10, 10, 10, 10, 10,-10,
  -10,  0, 10, 10, 10, 10,  0,-10,
  -10,  5,  5, 10, 10,  5,  5,-10,
  -10,  0,  5, 10, 10,  5,  0,-10,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -20,-10,-10,-10,-10,-10,-10,-20,
];

const ROOK_PST = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_MIDGAME_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20
];

export interface EngineEvalResult {
  score: number; // in centipawns from White's perspective (+100 = White +1 pawn)
  formattedScore: string; // e.g. "+1.4", "-0.8", "M2"
  bestMoveSan: string;
  bestMoveUci: string;
  depth: number;
}

export class ChessEvaluator {
  /**
   * Evaluates the board static position from White's perspective in centipawns
   */
  public static evaluatePosition(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -30000 : 30000;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }

    let score = 0;
    const board = chess.board();

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        const squareIndex = piece.color === 'w' ? row * 8 + col : (7 - row) * 8 + col;
        let pieceVal = PIECE_VALUES[piece.type];
        let pstVal = 0;

        switch (piece.type) {
          case 'p': pstVal = PAWN_PST[squareIndex]; break;
          case 'n': pstVal = KNIGHT_PST[squareIndex]; break;
          case 'b': pstVal = BISHOP_PST[squareIndex]; break;
          case 'r': pstVal = ROOK_PST[squareIndex]; break;
          case 'q': pstVal = QUEEN_PST[squareIndex]; break;
          case 'k': pstVal = KING_MIDGAME_PST[squareIndex]; break;
        }

        const totalPieceScore = pieceVal + pstVal;
        if (piece.color === 'w') {
          score += totalPieceScore;
        } else {
          score -= totalPieceScore;
        }
      }
    }

    return score;
  }

  /**
   * Performs an Alpha-Beta search to find the best move and score for current turn
   */
  public static getBestMove(chess: Chess, depth: number = 3): EngineEvalResult {
    const isMaximizing = chess.turn() === 'w';
    let bestMoveSan = '';
    let bestMoveUci = '';
    let bestScore = isMaximizing ? -Infinity : Infinity;

    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      const score = this.evaluatePosition(chess);
      return {
        score,
        formattedScore: this.formatScore(score),
        bestMoveSan: '',
        bestMoveUci: '',
        depth: 0,
      };
    }

    // Sort moves to optimize alpha-beta pruning (captures first)
    moves.sort((a, b) => {
      const aScore = a.captured ? PIECE_VALUES[a.captured] * 10 - PIECE_VALUES[a.piece] : 0;
      const bScore = b.captured ? PIECE_VALUES[b.captured] * 10 - PIECE_VALUES[b.piece] : 0;
      return bScore - aScore;
    });

    for (const move of moves) {
      chess.move(move);
      const score = this.alphaBeta(chess, depth - 1, -Infinity, Infinity, !isMaximizing);
      chess.undo();

      if (isMaximizing) {
        if (score > bestScore) {
          bestScore = score;
          bestMoveSan = move.san;
          bestMoveUci = `${move.from}${move.to}${move.promotion || ''}`;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMoveSan = move.san;
          bestMoveUci = `${move.from}${move.to}${move.promotion || ''}`;
        }
      }
    }

    return {
      score: bestScore,
      formattedScore: this.formatScore(bestScore),
      bestMoveSan,
      bestMoveUci,
      depth,
    };
  }

  private static alphaBeta(chess: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    if (depth === 0 || chess.isGameOver()) {
      return this.evaluatePosition(chess);
    }

    const moves = chess.moves({ verbose: true });
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.alphaBeta(chess, depth - 1, alpha, beta, false);
        chess.undo();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        chess.move(move);
        const evaluation = this.alphaBeta(chess, depth - 1, alpha, beta, true);
        chess.undo();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  public static formatScore(score: number): string {
    if (Math.abs(score) > 20000) {
      return score > 0 ? '+M' : '-M';
    }
    const pawns = (score / 100).toFixed(1);
    return score > 0 ? `+${pawns}` : `${pawns}`;
  }

  /**
   * Evaluates move quality and returns Chess.com move classification & Coach comment
   */
  public static classifyMove(
    moveSan: string,
    bestMoveSan: string,
    evalBefore: number,
    evalAfter: number,
    turn: Color,
    isCapture: boolean,
    isCheck: boolean
  ): { classification: MoveClassification; comment: string } {
    const isWhite = turn === 'w';
    // Difference from player's perspective (positive means player improved position)
    const diff = isWhite ? (evalAfter - evalBefore) : (evalBefore - evalAfter);

    if (moveSan === bestMoveSan) {
      // Check for Brilliant move (sacrifice or tactical shot that leads to huge win)
      if (isCapture && Math.abs(evalAfter) > 200 && diff >= 0) {
        return {
          classification: 'brilliant',
          comment: 'Brilliant move! You found a sharp tactical sacrifice that dismantles your opponent’s position!',
        };
      }
      return {
        classification: 'best',
        comment: 'Best move! That was the engine’s top choice in this position.',
      };
    }

    // Centipawn loss (always positive)
    const centipawnLoss = Math.max(0, -diff);

    if (centipawnLoss <= 15) {
      return {
        classification: 'excellent',
        comment: 'Excellent move! Maintains great pressure and solid positional control.',
      };
    } else if (centipawnLoss <= 45) {
      return {
        classification: 'good',
        comment: 'Good move. A solid and playable continuation.',
      };
    } else if (centipawnLoss <= 120) {
      return {
        classification: 'inaccuracy',
        comment: `Inaccuracy. ${bestMoveSan ? `Playing ${bestMoveSan} was slightly better.` : 'This allows opponent counterplay.'}`,
      };
    } else if (centipawnLoss <= 280) {
      return {
        classification: 'mistake',
        comment: `Mistake! This concedes a tangible advantage to your opponent. You should have played ${bestMoveSan || 'more defensively'}.`,
      };
    } else {
      if (Math.abs(evalBefore) > 400 && Math.sign(evalBefore) !== Math.sign(evalAfter)) {
        return {
          classification: 'miss',
          comment: `Miss! You missed a game-winning opportunity here. ${bestMoveSan} was decisive!`,
        };
      }
      return {
        classification: 'blunder',
        comment: `Blunder! This gives away significant material or positional compensation. ${bestMoveSan} was crucial.`,
      };
    }
  }

  /**
   * Computes CAPS (Chess Accuracy Percentage System) based on average centipawn loss
   */
  public static calculateCapsAccuracy(centipawnLosses: number[]): number {
    if (centipawnLosses.length === 0) return 90.0;
    const avgLoss = centipawnLosses.reduce((a, b) => a + b, 0) / centipawnLosses.length;
    // Accuracy sigmoid formula matching Chess.com CAPS
    const accuracy = 100 * Math.exp(-0.0035 * avgLoss);
    return Math.min(99.9, Math.max(10.0, parseFloat(accuracy.toFixed(1))));
  }
}
