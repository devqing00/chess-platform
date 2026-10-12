import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { MoveClassification, KeyMoment, PieceColor } from '@/types/chess';

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
   0,  0,  0,  0,  0,  0,  0,  0,
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
    0,  0,  0,  5,  5,  0,  0,  0,
];

const QUEEN_PST = [
  -20,-10,-10, -5, -5,-10,-10,-20,
  -10,  0,  0,  0,  0,  0,  0,-10,
  -10,  0,  5,  5,  5,  5,  0,-10,
   -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
  -10,  5,  5,  5,  5,  5,  0,-10,
  -10,  0,  5,  0,  0,  0,  0,-10,
  -20,-10,-10, -5, -5,-10,-10,-20,
];

const KING_MIDGAME_PST = [
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -30,-40,-40,-50,-50,-40,-40,-30,
  -20,-30,-30,-40,-40,-30,-30,-20,
  -10,-20,-20,-20,-20,-20,-20,-10,
   20, 20,  0,  0,  0,  0, 20, 20,
   20, 30, 10,  0,  0, 10, 30, 20,
];

// Recognized Book Opening Move sequences (standard theoretical starts)
const COMMON_BOOK_MOVES: Set<string> = new Set([
  'e4', 'd4', 'c4', 'Nf3', 'g3', 'f4', 'b3', 'Nc3',
  'e5', 'c5', 'e6', 'c6', 'd5', 'Nf6', 'g6', 'd6',
  'd4', 'exd5', 'Qxd5', 'Nc3', 'Qd8', 'Qd6', 'Qd7', 'Qa5',
  'Nf3', 'Nc6', 'Bb5', 'Bc4', 'd3', 'd4', 'c3', 'a6', 'Nf6', 'd6', 'Be7',
  'cxd4', 'Nxd4', 'e6', 'a6', 'Nc6', 'g6', 'Bg7', 'O-O',
]);

export interface EngineEvalResult {
  score: number; // in centipawns from White's perspective (+100 = White +1 pawn)
  formattedScore: string;
  bestMoveSan: string;
  bestMoveUci: string;
  depth: number;
}

export class ChessEvaluator {
  /**
   * Static evaluation of board position from White's perspective in centipawns
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
        const pieceVal = PIECE_VALUES[piece.type];
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
   * Alpha-beta minimax search to find the optimal move and evaluation score
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

    // Sort moves to accelerate alpha-beta pruning (captures first)
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
    if (Math.abs(score) >= 20000) {
      return score > 0 ? '+M' : '-M';
    }
    const pawns = (score / 100).toFixed(2);
    return score > 0 ? `+${pawns}` : `${pawns}`;
  }

  /**
   * Classifies a chess move using Chess.com criteria:
   * - Brilliant (!!): Tactical sacrifices that maintain winning position
   * - Great (!): Only winning move or crucial save
   * - Best (★): Engine top choice
   * - Excellent (✓): Negligible loss
   * - Good (✓): Playable continuation
   * - Book (📖): Standard opening book
   * - Inaccuracy (?!): 0.5 - 1.2 pawn loss
   * - Mistake (?): 1.2 - 2.5 pawn loss
   * - Blunder (??): > 2.5 pawn loss
   * - Miss (✕): Missed winning tactic or checkmate
   */
  public static classifyMove(
    moveSan: string,
    bestMoveSan: string,
    evalBefore: number,
    evalAfter: number,
    turn: Color,
    isCapture: boolean,
    isCheck: boolean,
    plyIndex: number = 10,
    pieceType: PieceSymbol = 'p'
  ): { classification: MoveClassification; comment: string } {
    const isWhite = turn === 'w';
    const evalDelta = isWhite ? evalAfter - evalBefore : evalBefore - evalAfter;

    // Check for Book Move in the opening
    if (plyIndex <= 8 && COMMON_BOOK_MOVES.has(moveSan)) {
      return {
        classification: 'book',
        comment: `${moveSan} is a standard theoretical book move, adhering to classical opening principles.`,
      };
    }

    // Check for Brilliant move (Piece sacrifice that retains advantage)
    const isPieceSacrifice =
      (pieceType === 'q' || pieceType === 'r' || pieceType === 'b' || pieceType === 'n') &&
      ((isWhite && evalAfter >= 150) || (!isWhite && evalAfter <= -150));

    if (moveSan === bestMoveSan || evalDelta >= 0) {
      if (isPieceSacrifice && Math.abs(evalDelta) <= 50) {
        return {
          classification: 'brilliant',
          comment: `Brilliant move! You offered material sacrifice to blow open your opponent's king safety and secure decisive tactical advantage!`,
        };
      }

      if (moveSan === bestMoveSan) {
        return {
          classification: 'best',
          comment: `Best move! That was the engine's highest-depth recommendation in this position.`,
        };
      }

      return {
        classification: 'great',
        comment: `Great move! An inventive and dynamic solution finding sharp initiative.`,
      };
    }

    // Centipawn loss
    const centipawnLoss = Math.max(0, -evalDelta);

    if (centipawnLoss <= 18) {
      return {
        classification: 'excellent',
        comment: `Excellent move! Keeps maximum pressure and solid positional advantage.`,
      };
    } else if (centipawnLoss <= 55) {
      return {
        classification: 'good',
        comment: `Good move. A totally sound and playable choice.`,
      };
    } else if (centipawnLoss <= 130) {
      return {
        classification: 'inaccuracy',
        comment: `Inaccuracy. ${bestMoveSan ? `Playing ${bestMoveSan} was slightly sharper.` : 'This concedes minor counterplay.'}`,
      };
    } else if (centipawnLoss <= 280) {
      return {
        classification: 'mistake',
        comment: `Mistake! This surrenders momentum to your opponent. You should have calculated ${bestMoveSan || 'a more defensive square'}.`,
      };
    } else {
      // Check if player missed mate or huge advantage
      if (Math.abs(evalBefore) >= 400 && Math.sign(evalBefore) !== Math.sign(evalAfter)) {
        return {
          classification: 'miss',
          comment: `Miss! You missed a decisive tactical blow here! ${bestMoveSan} was winning on the spot!`,
        };
      }
      return {
        classification: 'blunder',
        comment: `Blunder! This leaves a critical weakness or hangs material. ${bestMoveSan} was necessary.`,
      };
    }
  }

  /**
   * CAPS Accuracy Score Formula (0 - 100%)
   */
  public static calculateCapsAccuracy(centipawnLosses: number[]): number {
    if (centipawnLosses.length === 0) return 92.5;
    const avgLoss = centipawnLosses.reduce((a, b) => a + b, 0) / centipawnLosses.length;
    // Sigmoid model matching Chess.com CAPS
    const accuracy = 100 * Math.exp(-0.0038 * avgLoss);
    return Math.min(99.8, Math.max(12.0, parseFloat(accuracy.toFixed(1))));
  }

  /**
   * Generates a random Chess960 (Fischer Random) starting position FEN
   * Validated against all Fischer Random constraints (opposite bishops, king between rooks).
   */
  public static generateChess960Fen(): string {
    const pieces: (PieceSymbol | null)[] = new Array(8).fill(null);

    // 1. Place dark-square bishop (indices 1, 3, 5, 7)
    const darkSquares = [1, 3, 5, 7];
    const b1 = darkSquares[Math.floor(Math.random() * darkSquares.length)];
    pieces[b1] = 'b';

    // 2. Place light-square bishop (indices 0, 2, 4, 6)
    const lightSquares = [0, 2, 4, 6];
    const b2 = lightSquares[Math.floor(Math.random() * lightSquares.length)];
    pieces[b2] = 'b';

    // 3. Place Queen on random empty square
    const emptyAfterB = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => pieces[i] === null);
    const qIndex = emptyAfterB[Math.floor(Math.random() * emptyAfterB.length)];
    pieces[qIndex] = 'q';

    // 4. Place 2 Knights on random empty squares
    const emptyAfterQ = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => pieces[i] === null);
    const n1 = emptyAfterQ.splice(Math.floor(Math.random() * emptyAfterQ.length), 1)[0];
    const n2 = emptyAfterQ.splice(Math.floor(Math.random() * emptyAfterQ.length), 1)[0];
    pieces[n1] = 'n';
    pieces[n2] = 'n';

    // 5. Remaining 3 squares must be Rook, King, Rook (in that order)
    const remaining = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) => pieces[i] === null);
    pieces[remaining[0]] = 'r';
    pieces[remaining[1]] = 'k';
    pieces[remaining[2]] = 'r';

    const rankStr = pieces.join('');
    return `${rankStr.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${rankStr.toUpperCase()} w KQkq - 0 1`;
  }
}

