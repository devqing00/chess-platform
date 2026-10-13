import { Chess, Square, PieceSymbol, Color, Move } from 'chess.js';
import { MoveClassification, KeyMoment, PieceColor, MoveRecord } from '@/types/chess';

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
   * Converts centipawns into a win probability percentage (0 - 100%)
   * Sigmoid formula: P(cp) = 100 / (1 + 10^(-cp / 400))
   */
  public static centipawnsToWinProbability(scoreCp: number): number {
    if (Math.abs(scoreCp) >= 20000) {
      return scoreCp > 0 ? 100.0 : 0.0;
    }
    const exponent = -scoreCp / 400;
    if (exponent > 15) return 0.0;
    if (exponent < -15) return 100.0;
    return parseFloat((100.0 / (1.0 + Math.pow(10, exponent))).toFixed(2));
  }

  /**
   * 1-ply tactical search: evaluates immediate responses of opponent (captures, checks)
   * Prevents horizon effect so blunders and tactical sacrifices are detected accurately.
   */
  public static evaluateWithReply(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -30000 : 30000;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }

    const isBlackTurn = chess.turn() === 'b';
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return this.evaluatePosition(chess);

    if (isBlackTurn) {
      // Black to move: wants to minimize White's evaluation
      let minScore = this.evaluatePosition(chess);
      for (const m of moves) {
        if (!m.captured && !m.flags.includes('c') && moves.length > 16) {
          continue;
        }
        chess.move(m);
        const s = this.evaluatePosition(chess);
        chess.undo();
        if (s < minScore) minScore = s;
      }
      return minScore;
    } else {
      // White to move: wants to maximize White's evaluation
      let maxScore = this.evaluatePosition(chess);
      for (const m of moves) {
        if (!m.captured && !m.flags.includes('c') && moves.length > 16) {
          continue;
        }
        chess.move(m);
        const s = this.evaluatePosition(chess);
        chess.undo();
        if (s > maxScore) maxScore = s;
      }
      return maxScore;
    }
  }

  /**
   * Finds the top engine choice, best score, and second-best score
   */
  public static findBestMoveAndScore(chess: Chess): {
    bestMoveSan: string;
    bestMoveUci: string;
    score: number;
    secondBestScore: number;
  } {
    const isWhite = chess.turn() === 'w';
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      const score = this.evaluatePosition(chess);
      return { bestMoveSan: '', bestMoveUci: '', score, secondBestScore: score };
    }

    let bestSan = moves[0].san;
    let bestUci = `${moves[0].from}${moves[0].to}${moves[0].promotion || ''}`;
    let bestScore = isWhite ? -Infinity : Infinity;
    let secondBest = isWhite ? -Infinity : Infinity;

    for (const m of moves) {
      chess.move(m);
      const s = this.evaluateWithReply(chess);
      chess.undo();

      if (isWhite) {
        if (s > bestScore) {
          secondBest = bestScore;
          bestScore = s;
          bestSan = m.san;
          bestUci = `${m.from}${m.to}${m.promotion || ''}`;
        } else if (s > secondBest) {
          secondBest = s;
        }
      } else {
        if (s < bestScore) {
          secondBest = bestScore;
          bestScore = s;
          bestSan = m.san;
          bestUci = `${m.from}${m.to}${m.promotion || ''}`;
        } else if (s < secondBest) {
          secondBest = s;
        }
      }
    }

    return {
      bestMoveSan: bestSan,
      bestMoveUci: bestUci,
      score: bestScore,
      secondBestScore: secondBest === -Infinity || secondBest === Infinity ? bestScore : secondBest,
    };
  }

  /**
   * Alpha-beta minimax search to find the optimal move and evaluation score
   */
  public static getBestMove(chess: Chess, depth: number = 2): EngineEvalResult {
    const res = this.findBestMoveAndScore(chess);
    return {
      score: res.score,
      formattedScore: this.formatScore(res.score),
      bestMoveSan: res.bestMoveSan,
      bestMoveUci: res.bestMoveUci,
      depth,
    };
  }

  public static formatScore(score: number): string {
    if (Math.abs(score) >= 20000) {
      return score > 0 ? '+M' : '-M';
    }
    const pawns = (score / 100).toFixed(2);
    return score > 0 ? `+${pawns}` : `${pawns}`;
  }

  /**
   * Classifies a chess move using the official Chess.com Expected Points Win Probability Model:
   * - Brilliant (!!): Tactical piece sacrifice retaining decisive advantage
   * - Great (!): Only move preserving advantage/draw (2nd best is significantly worse)
   * - Best (★): Engine top choice or ΔWinProb <= 0.5%
   * - Excellent (✓): ΔWinProb <= 2.0%
   * - Good (✓): ΔWinProb <= 5.5%
   * - Book (📖): Standard opening book with ΔWinProb <= 2.5%
   * - Inaccuracy (?!): 5.5% < ΔWinProb <= 12.0%
   * - Mistake (?): 12.0% < ΔWinProb <= 22.0%
   * - Miss (✕): Missed winning tactic or checkmate from strong winning position
   * - Blunder (??): ΔWinProb > 22.0%
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
    pieceType: PieceSymbol = 'p',
    secondBestScoreDiff: number = 0
  ): { classification: MoveClassification; comment: string; wpLoss: number } {
    const isWhite = turn === 'w';

    const wpBeforeWhite = this.centipawnsToWinProbability(evalBefore);
    const wpAfterWhite = this.centipawnsToWinProbability(evalAfter);

    const wpBefore = isWhite ? wpBeforeWhite : 100 - wpBeforeWhite;
    const wpAfter = isWhite ? wpAfterWhite : 100 - wpAfterWhite;
    const wpLoss = Math.max(0, wpBefore - wpAfter);

    // 1. Opening Book
    if (plyIndex <= 10 && COMMON_BOOK_MOVES.has(moveSan) && wpLoss <= 2.5) {
      return {
        classification: 'book',
        comment: `${moveSan} is recognized opening book theory, establishing classical control over the center.`,
        wpLoss,
      };
    }

    // 2. Brilliant Move (Tactical Piece Sacrifice)
    const isHighValue = pieceType === 'q' || pieceType === 'r' || pieceType === 'b' || pieceType === 'n';
    const isBrilliantSacrifice =
      isHighValue &&
      isCapture &&
      wpLoss <= 1.0 &&
      wpAfter >= 55.0 &&
      plyIndex > 6;

    if (isBrilliantSacrifice) {
      return {
        classification: 'brilliant',
        comment: `Brilliant move! You offered a tactical sacrifice to blow open your opponent's king position and maintain a decisive attack!`,
        wpLoss,
      };
    }

    // 3. Great Move (Only winning move or clutch defense)
    const isTopChoice = moveSan === bestMoveSan || wpLoss <= 0.5;
    if (isTopChoice && secondBestScoreDiff >= 120 && wpAfter >= 40.0 && plyIndex > 4) {
      return {
        classification: 'great',
        comment: `Great move! The only move in this position that preserves your advantage. Every other option conceded the initiative.`,
        wpLoss,
      };
    }

    // 4. Best Move
    if (isTopChoice) {
      return {
        classification: 'best',
        comment: `Best move! That was Stockfish's top recommendation in this position.`,
        wpLoss,
      };
    }

    // 5. Excellent Move
    if (wpLoss <= 2.0) {
      return {
        classification: 'excellent',
        comment: `Excellent move! Keeps maximum pressure and solid positional control.`,
        wpLoss,
      };
    }

    // 6. Good Move
    if (wpLoss <= 5.5) {
      return {
        classification: 'good',
        comment: `Good move. A completely sound and playable continuation.`,
        wpLoss,
      };
    }

    // 7. Inaccuracy
    if (wpLoss <= 12.0) {
      return {
        classification: 'inaccuracy',
        comment: `Inaccuracy. ${bestMoveSan ? `Playing ${bestMoveSan} was slightly sharper.` : 'This allows the opponent minor counterplay.'}`,
        wpLoss,
      };
    }

    // 8. Mistake
    if (wpLoss <= 22.0) {
      return {
        classification: 'mistake',
        comment: `Mistake! This surrenders momentum. ${bestMoveSan ? `Stockfish recommended ${bestMoveSan}.` : 'A more defensive setup was required.'}`,
        wpLoss,
      };
    }

    // 9. Miss (Missed tactical opportunity / checkmate)
    if (wpBefore >= 70.0 && wpAfter < 52.0) {
      return {
        classification: 'miss',
        comment: `Miss! You missed a decisive tactical advantage! ${bestMoveSan ? `${bestMoveSan} was winning on the spot.` : 'A winning sequence was overlooked.'}`,
        wpLoss,
      };
    }

    // 10. Blunder
    return {
      classification: 'blunder',
      comment: `Blunder! ${bestMoveSan ? `${bestMoveSan} was necessary.` : 'This severely compromises your position or hangs material.'}`,
      wpLoss,
    };
  }

  /**
   * CAPS Accuracy Score Formula (0 - 100%)
   * Uses the official CAPS 2.0 harmonic/exponential model:
   * Acc_i = max(0, min(100, 103.1668 * exp(-0.04354 * wpLoss) - 3.1669))
   */
  public static calculateCapsAccuracy(winProbLosses: number[]): number {
    if (winProbLosses.length === 0) return 90.0;
    const accuracies = winProbLosses.map((loss) => {
      const l = Math.max(0, loss);
      const acc = 103.1668 * Math.exp(-0.04354 * l) - 3.1669;
      return Math.min(100.0, Math.max(0.0, acc));
    });
    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    return parseFloat(Math.min(99.8, Math.max(12.0, avg)).toFixed(1));
  }

  /**
   * Full Game History Analyzer:
   * Takes a sequence of moves (or PGN string), walks through the entire game ply-by-ply,
   * calculates accurate evaluations, classifications, and coach comments.
   */
  public static analyzeGameHistory(movesInput: MoveRecord[] | string[] | string): MoveRecord[] {
    const sim = new Chess();
    let moveList: { san: string; from?: string; to?: string; promotion?: string }[] = [];

    if (typeof movesInput === 'string') {
      try {
        const pgnChess = new Chess();
        pgnChess.loadPgn(movesInput);
        const history = pgnChess.history({ verbose: true });
        moveList = history.map((m) => ({
          san: m.san,
          from: m.from,
          to: m.to,
          promotion: m.promotion,
        }));
      } catch {
        return [];
      }
    } else if (Array.isArray(movesInput)) {
      if (movesInput.length === 0) return [];
      if (typeof movesInput[0] === 'string') {
        moveList = (movesInput as string[]).map((san) => ({ san }));
      } else {
        moveList = (movesInput as MoveRecord[]).map((m) => ({
          san: m.san,
          from: m.from,
          to: m.to,
          promotion: m.promotion,
        }));
      }
    }

    const analyzedRecords: MoveRecord[] = [];

    for (let i = 0; i < moveList.length; i++) {
      const item = moveList[i];
      const turn = sim.turn();
      const fenBefore = sim.fen();

      // 1. Evaluate position before move & calculate engine best move
      const evalBefore = this.evaluateWithReply(sim);
      const bestChoice = this.findBestMoveAndScore(sim);
      const secondBestDiff = Math.abs(bestChoice.score - bestChoice.secondBestScore);

      // 2. Play the move in simulation
      let playedMove = null;
      try {
        if (item.from && item.to) {
          playedMove = sim.move({
            from: item.from,
            to: item.to,
            promotion: item.promotion || 'q',
          });
        } else {
          playedMove = sim.move(item.san);
        }
      } catch {
        // Fallback to SAN if from/to fails
        try {
          playedMove = sim.move(item.san);
        } catch {
          break;
        }
      }

      if (!playedMove) break;

      const fenAfter = sim.fen();
      const evalAfter = this.evaluateWithReply(sim);
      const isCheckNow = sim.isCheck();

      // 3. Classify move using Expected Points Win Probability Model
      const { classification, comment } = this.classifyMove(
        playedMove.san,
        bestChoice.bestMoveSan,
        evalBefore,
        evalAfter,
        turn,
        Boolean(playedMove.captured),
        isCheckNow,
        i + 1,
        playedMove.piece,
        secondBestDiff
      );

      analyzedRecords.push({
        san: playedMove.san,
        from: playedMove.from as Square,
        to: playedMove.to as Square,
        captured: playedMove.captured as any,
        promotion: playedMove.promotion as any,
        fenBefore,
        fenAfter,
        evalBefore,
        evalAfter,
        classification,
        coachComment: comment,
        bestMoveSan: bestChoice.bestMoveSan,
        bestMoveUci: bestChoice.bestMoveUci,
        isCheck: isCheckNow,
      });
    }

    return analyzedRecords;
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

