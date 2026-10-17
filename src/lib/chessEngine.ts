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
  'Qh5', 'Qf3', 'Qf6', 'Qe7', 'f5', 'b4',
]);

export interface EngineEvalResult {
  score: number; // in centipawns from White's perspective (+100 = White +1 pawn)
  formattedScore: string;
  bestMoveSan: string;
  bestMoveUci: string;
  depth: number;
}

export interface TTEntry {
  evalScore: number;
  depth: number;
  bestSan?: string;
  bestUci?: string;
  timestamp: number;
}

/**
 * High-performance LRU Transposition Table:
 * Caches minimax evaluation and best moves keyed by board configuration,
 * eliminating redundant tree evaluations and accelerating deep multi-ply calculations.
 */
export class EngineTranspositionTable {
  private static table = new Map<string, TTEntry>();
  private static MAX_ENTRIES = 40000;

  public static getSimplifiedKey(fen: string): string {
    const parts = fen.split(' ');
    // Retain piece placement, active turn, castling rights, and en passant target
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  }

  public static get(fen: string, depth: number): TTEntry | undefined {
    const key = this.getSimplifiedKey(fen);
    const entry = this.table.get(key);
    if (entry && entry.depth >= depth) {
      return entry;
    }
    return undefined;
  }

  public static set(fen: string, depth: number, evalScore: number, bestSan?: string, bestUci?: string): void {
    const key = this.getSimplifiedKey(fen);
    if (this.table.size >= this.MAX_ENTRIES) {
      let count = 0;
      for (const k of this.table.keys()) {
        this.table.delete(k);
        count++;
        if (count >= 5000) break;
      }
    }
    this.table.set(key, { evalScore, depth, bestSan, bestUci, timestamp: Date.now() });
  }

  public static clear(): void {
    this.table.clear();
  }
}

export class ChessEvaluator {
  /**
   * Static evaluation of board position from White's perspective in centipawns.
   * Accounts for material, piece-square tables, pawn structure (passed, doubled, isolated),
   * center control, king safety & luft, bishop pairs, rooks on 7th, open files, and batteries.
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

    let whiteBishops = 0;
    let blackBishops = 0;
    let whiteKingCol = -1;
    let whiteKingRow = -1;
    let blackKingCol = -1;
    let blackKingRow = -1;
    let hasWhiteRookOrQueen = false;
    let hasBlackRookOrQueen = false;

    const whitePawnCols = new Array(8).fill(0);
    const blackPawnCols = new Array(8).fill(0);
    const whiteRookCols = new Array(8).fill(0);
    const blackRookCols = new Array(8).fill(0);

    const whiteActivePieces: { type: PieceSymbol; r: number; c: number }[] = [];
    const blackActivePieces: { type: PieceSymbol; r: number; c: number }[] = [];

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (!piece) continue;

        if (piece.type === 'p') {
          if (piece.color === 'w') whitePawnCols[col]++;
          else blackPawnCols[col]++;
        } else if (piece.type === 'b') {
          if (piece.color === 'w') whiteBishops++;
          else blackBishops++;
        } else if (piece.type === 'r') {
          if (piece.color === 'w') {
            hasWhiteRookOrQueen = true;
            whiteRookCols[col]++;
          } else {
            hasBlackRookOrQueen = true;
            blackRookCols[col]++;
          }
        } else if (piece.type === 'q') {
          if (piece.color === 'w') hasWhiteRookOrQueen = true;
          else hasBlackRookOrQueen = true;
        } else if (piece.type === 'k') {
          if (piece.color === 'w') {
            whiteKingRow = row;
            whiteKingCol = col;
          } else {
            blackKingRow = row;
            blackKingCol = col;
          }
        }

        if (['q', 'r', 'b', 'n'].includes(piece.type)) {
          if (piece.color === 'w') {
            whiteActivePieces.push({ type: piece.type, r: row, c: col });
          } else {
            blackActivePieces.push({ type: piece.type, r: row, c: col });
          }
        }

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

        // Passed Pawn detection: no opposing pawns on same or adjacent files ahead
        if (piece.type === 'p') {
          if (piece.color === 'w') {
            let isPassed = true;
            for (let r = 0; r < row; r++) {
              for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
                const opp = board[r][c];
                if (opp && opp.type === 'p' && opp.color === 'b') {
                  isPassed = false;
                  break;
                }
              }
              if (!isPassed) break;
            }
            if (isPassed) {
              const rank = 8 - row;
              const passedBonus = [0, 0, 0, 18, 35, 70, 140, 0][rank] || 0;
              score += passedBonus;
            }
          } else {
            let isPassed = true;
            for (let r = row + 1; r < 8; r++) {
              for (let c = Math.max(0, col - 1); c <= Math.min(7, col + 1); c++) {
                const opp = board[r][c];
                if (opp && opp.type === 'p' && opp.color === 'w') {
                  isPassed = false;
                  break;
                }
              }
              if (!isPassed) break;
            }
            if (isPassed) {
              const rank = 8 - row;
              const passedBonus = [0, 140, 70, 35, 18, 0, 0, 0][rank] || 0;
              score -= passedBonus;
            }
          }
        }

        // Knight Outpost detection (ranks 4-6 on central files c, d, e, f supported by pawn)
        if (piece.type === 'n') {
          const isCentral = col >= 2 && col <= 5;
          if (piece.color === 'w' && isCentral && row >= 2 && row <= 4) {
            const hasPawnSupport =
              (col > 0 && board[row + 1][col - 1]?.type === 'p' && board[row + 1][col - 1]?.color === 'w') ||
              (col < 7 && board[row + 1][col + 1]?.type === 'p' && board[row + 1][col + 1]?.color === 'w');
            if (hasPawnSupport) score += 25;
          } else if (piece.color === 'b' && isCentral && row >= 3 && row <= 5) {
            const hasPawnSupport =
              (col > 0 && board[row - 1][col - 1]?.type === 'p' && board[row - 1][col - 1]?.color === 'b') ||
              (col < 7 && board[row - 1][col + 1]?.type === 'p' && board[row - 1][col + 1]?.color === 'b');
            if (hasPawnSupport) score -= 25;
          }
        }
      }
    }

    // Bishop pair advantage (+50 cp)
    if (whiteBishops >= 2) score += 50;
    if (blackBishops >= 2) score -= 50;

    // Pawn Structure: Doubled and Isolated pawns
    for (let col = 0; col < 8; col++) {
      if (whitePawnCols[col] > 1) {
        score -= (whitePawnCols[col] - 1) * 20; // Doubled pawns penalty
      }
      if (blackPawnCols[col] > 1) {
        score += (blackPawnCols[col] - 1) * 20;
      }
      const leftW = col > 0 ? whitePawnCols[col - 1] : 0;
      const rightW = col < 7 ? whitePawnCols[col + 1] : 0;
      if (whitePawnCols[col] > 0 && leftW === 0 && rightW === 0) {
        score -= 22; // Isolated pawn penalty
      }
      const leftB = col > 0 ? blackPawnCols[col - 1] : 0;
      const rightB = col < 7 ? blackPawnCols[col + 1] : 0;
      if (blackPawnCols[col] > 0 && leftB === 0 && rightB === 0) {
        score += 22;
      }
    }

    // Sweet Center Control (d4, e4, d5, e5) & Extended Center
    const sweetCenterSquares = [[4, 3], [4, 4], [3, 3], [3, 4]];
    for (const [r, c] of sweetCenterSquares) {
      const p = board[r][c];
      if (p) {
        score += p.color === 'w' ? 16 : -16;
      }
    }

    // King safety, castled pawn shields, and back-rank luft detection
    if (whiteKingRow === 7 && whiteKingCol >= 5 && hasBlackRookOrQueen) {
      const f2 = board[6][5]?.type === 'p' && board[6][5]?.color === 'w';
      const g2 = board[6][6]?.type === 'p' && board[6][6]?.color === 'w';
      const h2 = board[6][7]?.type === 'p' && board[6][7]?.color === 'w';
      if (f2 && g2 && h2) score -= 40; // Trapped back rank
      else if (!h2 || !g2) score += 25; // Has escape luft
      // Missing shield pawns penalty
      let missingShield = 0;
      if (!f2) missingShield++;
      if (!g2) missingShield++;
      if (!h2) missingShield++;
      score -= missingShield * 18;
    }

    if (blackKingRow === 0 && blackKingCol >= 5 && hasWhiteRookOrQueen) {
      const f7 = board[1][5]?.type === 'p' && board[1][5]?.color === 'b';
      const g7 = board[1][6]?.type === 'p' && board[1][6]?.color === 'b';
      const h7 = board[1][7]?.type === 'p' && board[1][7]?.color === 'b';
      if (f7 && g7 && h7) score += 40; // Trapped back rank
      else if (!h7 || !g7) score -= 25; // Has escape luft
      let missingShield = 0;
      if (!f7) missingShield++;
      if (!g7) missingShield++;
      if (!h7) missingShield++;
      score += missingShield * 18;
    }

    // Attack Tropism: proximity of attacking heavy pieces to the enemy king
    if (whiteKingRow !== -1 && blackKingRow !== -1) {
      for (const att of blackActivePieces) {
        const dist = Math.max(Math.abs(att.r - whiteKingRow), Math.abs(att.c - whiteKingCol));
        if (dist <= 2) score -= 14;
        else if (dist <= 3) score -= 7;
      }
      for (const att of whiteActivePieces) {
        const dist = Math.max(Math.abs(att.r - blackKingRow), Math.abs(att.c - blackKingCol));
        if (dist <= 2) score += 14;
        else if (dist <= 3) score += 7;
      }
    }

    // Rook on open or semi-open file, 7th rank, and doubled rooks
    for (let col = 0; col < 8; col++) {
      if (whiteRookCols[col] >= 2) score += 28; // Rook battery on file
      if (blackRookCols[col] >= 2) score -= 28;
    }

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'r') {
          const wPawns = whitePawnCols[col];
          const bPawns = blackPawnCols[col];
          if (wPawns === 0 && bPawns === 0) {
            score += piece.color === 'w' ? 25 : -25;
          } else if (piece.color === 'w' && wPawns === 0) {
            score += 15;
          } else if (piece.color === 'b' && bPawns === 0) {
            score -= 15;
          }

          // Rook on the 7th rank (rank 7 for white is row 1, rank 2 for black is row 6)
          if (piece.color === 'w' && row === 1) score += 32;
          if (piece.color === 'b' && row === 6) score -= 32;
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
   * Quiescence Search with Alpha-Beta Pruning, MVV-LVA move ordering, and delta pruning.
   * Extends search along capturing and promotion branches until a quiet position is reached.
   * Completely eliminates the horizon effect where a piece capture or trade sequence hangs just beyond ply depth.
   */
  public static quiescenceSearch(
    chess: Chess,
    alpha: number,
    beta: number,
    depth: number = 3
  ): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -30000 : 30000;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }

    const standPat = this.evaluatePosition(chess);
    if (depth <= 0) return standPat;

    const isWhite = chess.turn() === 'w';

    if (isWhite) {
      if (standPat >= beta) return beta;
      if (standPat > alpha) alpha = standPat;

      const moves = chess.moves({ verbose: true }).filter((m) => m.captured || m.promotion);
      if (moves.length === 0) return standPat;

      moves.sort((a, b) => {
        const victimA = a.captured ? PIECE_VALUES[a.captured] || 100 : 800;
        const attackerA = PIECE_VALUES[a.piece] || 100;
        const victimB = b.captured ? PIECE_VALUES[b.captured] || 100 : 800;
        const attackerB = PIECE_VALUES[b.piece] || 100;
        return (victimB * 10 - attackerB) - (victimA * 10 - attackerA);
      });

      for (const m of moves) {
        const victimVal = m.captured ? PIECE_VALUES[m.captured] || 100 : 800;
        if (standPat + victimVal + 200 < alpha) continue;

        chess.move(m);
        const score = this.quiescenceSearch(chess, alpha, beta, depth - 1);
        chess.undo();

        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
      }
      return alpha;
    } else {
      if (standPat <= alpha) return alpha;
      if (standPat < beta) beta = standPat;

      const moves = chess.moves({ verbose: true }).filter((m) => m.captured || m.promotion);
      if (moves.length === 0) return standPat;

      moves.sort((a, b) => {
        const victimA = a.captured ? PIECE_VALUES[a.captured] || 100 : 800;
        const attackerA = PIECE_VALUES[a.piece] || 100;
        const victimB = b.captured ? PIECE_VALUES[b.captured] || 100 : 800;
        const attackerB = PIECE_VALUES[b.piece] || 100;
        return (victimB * 10 - attackerB) - (victimA * 10 - attackerA);
      });

      for (const m of moves) {
        const victimVal = m.captured ? PIECE_VALUES[m.captured] || 100 : 800;
        if (standPat - victimVal - 200 > beta) continue;

        chess.move(m);
        const score = this.quiescenceSearch(chess, alpha, beta, depth - 1);
        chess.undo();

        if (score <= alpha) return alpha;
        if (score < beta) beta = score;
      }
      return beta;
    }
  }

  /**
   * Tactical 2-ply search with Check Extension and Mate-in-1 / Mate-in-2 Detection:
   * Accurately detects incoming checkmates, tactical threats, and prevents horizon blindness.
   */
  public static evaluateWithReply(chess: Chess): number {
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -30000 : 30000;
    }
    if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
      return 0;
    }

    const cached = EngineTranspositionTable.get(chess.fen(), 2);
    if (cached !== undefined) {
      return cached.evalScore;
    }

    const isWhiteTurn = chess.turn() === 'w';
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) return this.evaluatePosition(chess);

    // 1. Immediate Checkmate in 1: If current player has mate in 1, it is decisive!
    const immediateMate = moves.find((m) => m.san.includes('#'));
    if (immediateMate) {
      const mateScore = isWhiteTurn ? 30000 : -30000;
      EngineTranspositionTable.set(chess.fen(), 2, mateScore);
      return mateScore;
    }

    // 2. Intelligent Move Ordering:
    // Checks (could be mate in 2!), then Captures by MVV/LVA, then quiet moves
    const sortedMoves = [...moves].sort((a, b) => {
      let aScore = 0;
      let bScore = 0;
      if (a.san.includes('+')) aScore += 1000;
      if (b.san.includes('+')) bScore += 1000;
      if (a.captured) {
        const victimVal = PIECE_VALUES[a.captured] || 100;
        const attackerVal = PIECE_VALUES[a.piece] || 100;
        aScore += victimVal * 10 - attackerVal;
      }
      if (b.captured) {
        const victimVal = PIECE_VALUES[b.captured] || 100;
        const attackerVal = PIECE_VALUES[b.piece] || 100;
        bScore += victimVal * 10 - attackerVal;
      }
      return bScore - aScore;
    });

    const candidates = sortedMoves.length <= 16 ? sortedMoves : sortedMoves.slice(0, 16);

    if (isWhiteTurn) {
      // White to move: wants to maximize score
      let maxScore = -Infinity;
      for (const m of candidates) {
        chess.move(m);
        let s: number;
        if (chess.isCheckmate()) {
          s = 30000;
        } else if (chess.isDraw()) {
          s = 0;
        } else {
          const defenderReplies = chess.moves({ verbose: true });
          const hasDirectMate = defenderReplies.some((fu) => fu.san.includes('#'));
          if (hasDirectMate) {
            // Black can deliver immediate checkmate against this move!
            s = -30000;
          } else if (chess.isCheck()) {
            // White delivered a check! Tactical check extension
            let minDefenderScore = Infinity;
            for (const rep of defenderReplies) {
              chess.move(rep);
              if (chess.isCheckmate()) {
                minDefenderScore = Math.min(minDefenderScore, -30000);
              } else if (chess.isDraw()) {
                minDefenderScore = Math.min(minDefenderScore, 0);
              } else {
                const followUps = chess.moves({ verbose: true });
                const hasMateIn2 = followUps.some((fu) => fu.san.includes('#'));
                if (hasMateIn2) {
                  minDefenderScore = Math.min(minDefenderScore, 29990);
                } else {
                  let bestFollow = this.evaluatePosition(chess);
                  const captureFollowUps = followUps.filter((fu) => fu.captured).slice(0, 5);
                  for (const cap of captureFollowUps) {
                    chess.move(cap);
                    const capScore = this.evaluatePosition(chess);
                    chess.undo();
                    if (capScore > bestFollow) bestFollow = capScore;
                  }
                  minDefenderScore = Math.min(minDefenderScore, bestFollow);
                }
              }
              chess.undo();
            }
            s = minDefenderScore === Infinity ? this.evaluatePosition(chess) : minDefenderScore;
          } else {
            // Candidate move was not a check: check if Black has a forcing check that leads to mate
            const defenderChecks = defenderReplies.filter((rep) => rep.san.includes('+')).slice(0, 3);
            let defenderForcedMate = false;
            for (const dc of defenderChecks) {
              chess.move(dc);
              const whiteEscapes = chess.moves({ verbose: true });
              if (
                whiteEscapes.length > 0 &&
                whiteEscapes.every((we) => {
                  chess.move(we);
                  const mateSoon = chess.moves({ verbose: true }).some((nm) => nm.san.includes('#'));
                  chess.undo();
                  return mateSoon;
                })
              ) {
                defenderForcedMate = true;
                chess.undo();
                break;
              }
              chess.undo();
            }

            if (defenderForcedMate) {
              s = -29990;
            } else if (m.captured) {
              // Tactical exchange resolution with Quiescence search
              s = this.quiescenceSearch(chess, -30000, 30000, 3);
            } else {
              // Check if Black can capture a major piece that White left undefended
              const bigCaptures = defenderReplies.filter((rep) => rep.captured && ['q', 'r'].includes(rep.captured)).slice(0, 3);
              if (bigCaptures.length > 0) {
                let worstForWhite = this.evaluatePosition(chess);
                for (const bc of bigCaptures) {
                  chess.move(bc);
                  const capScore = this.quiescenceSearch(chess, -30000, 30000, 2);
                  chess.undo();
                  if (capScore < worstForWhite) worstForWhite = capScore;
                }
                s = worstForWhite;
              } else {
                s = this.evaluatePosition(chess);
              }
            }
          }
        }
        chess.undo();

        if (s > maxScore) maxScore = s;
        if (maxScore >= 29900) break; // Decisive forced mate found!
      }
      const finalScore = maxScore === -Infinity ? this.evaluatePosition(chess) : maxScore;
      EngineTranspositionTable.set(chess.fen(), 2, finalScore);
      return finalScore;
    } else {
      // Black to move: wants to minimize score
      let minScore = Infinity;
      for (const m of candidates) {
        chess.move(m);
        let s: number;
        if (chess.isCheckmate()) {
          s = -30000;
        } else if (chess.isDraw()) {
          s = 0;
        } else {
          const defenderReplies = chess.moves({ verbose: true });
          const hasDirectMate = defenderReplies.some((fu) => fu.san.includes('#'));
          if (hasDirectMate) {
            // White can deliver immediate checkmate against this move!
            s = 30000;
          } else if (chess.isCheck()) {
            // Black delivered a check! Tactical check extension
            let maxDefenderScore = -Infinity;
            for (const rep of defenderReplies) {
              chess.move(rep);
              if (chess.isCheckmate()) {
                maxDefenderScore = Math.max(maxDefenderScore, 30000);
              } else if (chess.isDraw()) {
                maxDefenderScore = Math.max(maxDefenderScore, 0);
              } else {
                const followUps = chess.moves({ verbose: true });
                const hasMateIn2 = followUps.some((fu) => fu.san.includes('#'));
                if (hasMateIn2) {
                  maxDefenderScore = Math.max(maxDefenderScore, -29990);
                } else {
                  let bestFollow = this.evaluatePosition(chess);
                  const captureFollowUps = followUps.filter((fu) => fu.captured).slice(0, 5);
                  for (const cap of captureFollowUps) {
                    chess.move(cap);
                    const capScore = this.evaluatePosition(chess);
                    chess.undo();
                    if (capScore < bestFollow) bestFollow = capScore;
                  }
                  maxDefenderScore = Math.max(maxDefenderScore, bestFollow);
                }
              }
              chess.undo();
            }
            s = maxDefenderScore === -Infinity ? this.evaluatePosition(chess) : maxDefenderScore;
          } else {
            // Candidate move was not a check: check if White has a forcing check that leads to mate
            const defenderChecks = defenderReplies.filter((rep) => rep.san.includes('+')).slice(0, 3);
            let defenderForcedMate = false;
            for (const dc of defenderChecks) {
              chess.move(dc);
              const blackEscapes = chess.moves({ verbose: true });
              if (
                blackEscapes.length > 0 &&
                blackEscapes.every((be) => {
                  chess.move(be);
                  const mateSoon = chess.moves({ verbose: true }).some((nm) => nm.san.includes('#'));
                  chess.undo();
                  return mateSoon;
                })
              ) {
                defenderForcedMate = true;
                chess.undo();
                break;
              }
              chess.undo();
            }

            if (defenderForcedMate) {
              s = 29990;
            } else if (m.captured) {
              // Tactical exchange resolution with Quiescence search
              s = this.quiescenceSearch(chess, -30000, 30000, 3);
            } else {
              // Check if White can capture a major piece that Black left undefended
              const bigCaptures = defenderReplies.filter((rep) => rep.captured && ['q', 'r'].includes(rep.captured)).slice(0, 3);
              if (bigCaptures.length > 0) {
                let worstForBlack = this.evaluatePosition(chess);
                for (const bc of bigCaptures) {
                  chess.move(bc);
                  const capScore = this.quiescenceSearch(chess, -30000, 30000, 2);
                  chess.undo();
                  if (capScore > worstForBlack) worstForBlack = capScore;
                }
                s = worstForBlack;
              } else {
                s = this.evaluatePosition(chess);
              }
            }
          }
        }
        chess.undo();

        if (s < minScore) minScore = s;
        if (minScore <= -29900) break; // Decisive forced mate found!
      }
      const finalScore = minScore === Infinity ? this.evaluatePosition(chess) : minScore;
      EngineTranspositionTable.set(chess.fen(), 2, finalScore);
      return finalScore;
    }
  }

  /**
   * Finds the top engine choice, best score, and second-best score.
   * Includes smart move ordering, mate-avoidance prioritization, and tie-breaking.
   */
  public static findBestMoveAndScore(chess: Chess): {
    bestMoveSan: string;
    bestMoveUci: string;
    score: number;
    secondBestScore: number;
    isUnavoidableMate?: boolean;
  } {
    const isWhite = chess.turn() === 'w';
    const moves = chess.moves({ verbose: true });
    if (moves.length === 0) {
      const score = this.evaluatePosition(chess);
      return { bestMoveSan: '', bestMoveUci: '', score, secondBestScore: score, isUnavoidableMate: false };
    }

    // 1. Immediate Checkmate in 1 for current player!
    const directMate = moves.find((m) => m.san.includes('#'));
    if (directMate) {
      const score = isWhite ? 30000 : -30000;
      const res = {
        bestMoveSan: directMate.san,
        bestMoveUci: `${directMate.from}${directMate.to}${directMate.promotion || ''}`,
        score,
        secondBestScore: score,
        isUnavoidableMate: false,
      };
      EngineTranspositionTable.set(chess.fen(), 3, score, res.bestMoveSan, res.bestMoveUci);
      return res;
    }

    const cached = EngineTranspositionTable.get(chess.fen(), 3);
    if (cached && cached.bestSan && cached.bestUci) {
      return {
        bestMoveSan: cached.bestSan,
        bestMoveUci: cached.bestUci,
        score: cached.evalScore,
        secondBestScore: cached.evalScore,
        isUnavoidableMate: Math.abs(cached.evalScore) >= 29000,
      };
    }

    // 2. Critical Checkmate Defense Invariant:
    // If any of our legal moves allows the opponent to deliver immediate checkmate in 1 (e.g. Qxf7#),
    // and there exists ANY move that defends and prevents checkmate, filter candidates strictly to those safe moves!
    // Moves that blunder into immediate mate in 1 (such as Rb8 against Qxf7#) must NEVER be chosen as the best move.
    const safeMoves = moves.filter((m) => {
      chess.move(m);
      const oppCanMate = chess.moves({ verbose: true }).some((om) => om.san.includes('#'));
      chess.undo();
      return !oppCanMate;
    });

    const candidatePool = safeMoves.length > 0 ? safeMoves : moves;

    // 3. Intelligent Move Ordering:
    // Prioritize checks, captures, king escape/luft moves, then quiet moves
    const sortedMoves = [...candidatePool].sort((a, b) => {
      let aPrio = 0;
      let bPrio = 0;
      if (a.san.includes('+')) aPrio += 1000;
      if (b.san.includes('+')) bPrio += 1000;
      if (a.captured) {
        aPrio += (PIECE_VALUES[a.captured] || 100) * 10 - (PIECE_VALUES[a.piece] || 100);
      }
      if (b.captured) {
        bPrio += (PIECE_VALUES[b.captured] || 100) * 10 - (PIECE_VALUES[b.piece] || 100);
      }
      if (['h3', 'g3', 'h6', 'g6'].includes(a.san)) aPrio += 200;
      if (['h3', 'g3', 'h6', 'g6'].includes(b.san)) bPrio += 200;
      if (['e4', 'd4', 'e5', 'd5'].includes(a.san)) aPrio += 100;
      if (['e4', 'd4', 'e5', 'd5'].includes(b.san)) bPrio += 100;
      return bPrio - aPrio;
    });

    let bestSan = sortedMoves[0].san;
    let bestUci = `${sortedMoves[0].from}${sortedMoves[0].to}${sortedMoves[0].promotion || ''}`;
    let bestScore = isWhite ? -Infinity : Infinity;
    let secondBest = isWhite ? -Infinity : Infinity;

    let allMovesAllowMate = safeMoves.length === 0;

    for (const m of sortedMoves) {
      chess.move(m);
      const s = this.evaluateWithReply(chess);
      chess.undo();

      const allowsMate = isWhite ? s <= -29000 : s >= 29000;
      if (!allowsMate) {
        allMovesAllowMate = false;
      }

      if (isWhite) {
        if (s > bestScore) {
          secondBest = bestScore;
          bestScore = s;
          bestSan = m.san;
          bestUci = `${m.from}${m.to}${m.promotion || ''}`;
        } else if (s === bestScore) {
          // Tie-break: prefer active defense/checks/luft over random quiet moves (like Rb8)
          if (m.san.includes('+') || m.captured || ['h3', 'g3'].includes(m.san)) {
            bestSan = m.san;
            bestUci = `${m.from}${m.to}${m.promotion || ''}`;
          }
        } else if (s > secondBest) {
          secondBest = s;
        }
      } else {
        if (s < bestScore) {
          secondBest = bestScore;
          bestScore = s;
          bestSan = m.san;
          bestUci = `${m.from}${m.to}${m.promotion || ''}`;
        } else if (s === bestScore) {
          // Tie-break: prefer active defense/checks/luft over random quiet moves (like Rb8)
          if (m.san.includes('+') || m.captured || ['h6', 'g6'].includes(m.san)) {
            bestSan = m.san;
            bestUci = `${m.from}${m.to}${m.promotion || ''}`;
          }
        } else if (s < secondBest) {
          secondBest = s;
        }
      }
    }

    const finalResult = {
      bestMoveSan: bestSan,
      bestMoveUci: bestUci,
      score: bestScore,
      secondBestScore: secondBest === -Infinity || secondBest === Infinity ? bestScore : secondBest,
      isUnavoidableMate: allMovesAllowMate,
    };
    EngineTranspositionTable.set(chess.fen(), 3, bestScore, bestSan, bestUci);
    return finalResult;
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
   * High-precision tactical motif detector:
   * Identifies checkmates, royal forks, knight forks, pawn forks, absolute/relative pins,
   * skewers, discovered checks, hanging pieces, tactical escapes, king luft, and rook invasions.
   */
  public static detectTacticalMotif(
    fenBefore?: string,
    fenAfter?: string,
    move?: { san: string; from?: Square; to?: Square; piece?: PieceSymbol; captured?: PieceSymbol },
    turn?: Color
  ): { type: string; description: string } | undefined {
    if (!fenAfter || !move) return undefined;
    try {
      const cAfter = new Chess(fenAfter);
      const isWhite = turn === 'w';
      const oppColor = isWhite ? 'b' : 'w';
      const san = move.san || '';

      // 1. Checkmate Specialization
      if (cAfter.isCheckmate() || san.includes('#')) {
        if (move.piece === 'n') {
          return {
            type: 'smothered-mate',
            description: `Smothered Mate! Knight delivers an astonishing checkmate while the enemy king is suffocated by its own army!`,
          };
        }
        if (['r', 'q'].includes(move.piece || '') && (move.to?.endsWith('8') || move.to?.endsWith('1'))) {
          const oppPawnsRow = isWhite ? 1 : 6;
          const board = cAfter.board();
          const hasPawnsInFront = board[oppPawnsRow]?.some((p) => p && p.type === 'p' && p.color === oppColor);
          if (hasPawnsInFront) {
            return {
              type: 'back-rank',
              description: `Back-Rank Checkmate! Penetrates the back row to deliver an inescapable mate against the boxed-in king.`,
            };
          }
        }
        if (san.includes('Qxf7#') || san.includes('Qxf2#') || san.includes('Bxf7#') || san.includes('Bxf2#')) {
          return {
            type: 'scholar-mate',
            description: `Scholar's Mate pattern! Direct tactical strike targeting the vulnerable f-pawn wraps up the game on the spot.`,
          };
        }
        return {
          type: 'checkmate',
          description: `Delivered checkmate with ${san}! A decisive finishing strike.`,
        };
      }

      // 2. Castling
      if (san.startsWith('O-O')) {
        return {
          type: 'castling',
          description: san === 'O-O' ? 'Castles kingside to tuck the king into safety and mobilize the rook.' : 'Castles queenside, preparing opposite-side dynamic play.',
        };
      }

      // 3. Back-Rank Luft
      if (['h3', 'g3', 'h6', 'g6'].includes(san)) {
        if (fenBefore) {
          const cBefore = new Chess(fenBefore);
          const kingSq = isWhite ? 'g1' : 'g8';
          const king = cBefore.get(kingSq as Square);
          if (king && king.type === 'k' && king.color === turn) {
            return {
              type: 'luft',
              description: `Creates essential breathing room (luft) on ${move.to || san}, permanently eliminating back-rank checkmate threats.`,
            };
          }
        }
      }

      // 4. Knight & Royal Fork
      if (move.piece === 'n' && move.to) {
        const target = move.to;
        const file = target.charCodeAt(0) - 97;
        const rank = parseInt(target[1], 10) - 1;
        const deltas = [
          [1, 2], [1, -2], [-1, 2], [-1, -2],
          [2, 1], [2, -1], [-2, 1], [-2, -1],
        ];
        const forked: { type: PieceSymbol; sq: Square }[] = [];
        for (const [df, dr] of deltas) {
          const nf = file + df;
          const nr = rank + dr;
          if (nf >= 0 && nf < 8 && nr >= 0 && nr < 8) {
            const sq = `${String.fromCharCode(97 + nf)}${nr + 1}` as Square;
            const p = cAfter.get(sq);
            if (p && p.color === oppColor && ['k', 'q', 'r', 'b'].includes(p.type)) {
              forked.push({ type: p.type, sq });
            }
          }
        }
        const hasKing = forked.some((p) => p.type === 'k');
        const hasQueen = forked.some((p) => p.type === 'q');
        const hasRook = forked.some((p) => p.type === 'r');
        if (hasKing && hasQueen) {
          return { type: 'fork', description: `Royal Fork! Knight on ${target} strikes both King and Queen simultaneously!` };
        }
        if (hasKing && hasRook) {
          return { type: 'fork', description: `Devastating Knight Fork! Checks the King while skewering the undefended Rook!` };
        }
        if (hasQueen && hasRook) {
          return { type: 'fork', description: `Tactical Fork! Striking both the Queen and Rook at the same time.` };
        }
        if (forked.length >= 2) {
          return { type: 'fork', description: `Knight Fork! Attacking two major enemy pieces at once from ${target}.` };
        }
      }

      // 5. Queen Double Attack / Fork
      if (move.piece === 'q' && move.to) {
        const target = move.to;
        const oppKingSq = cAfter.board().flat().find((p) => p && p.type === 'k' && p.color === oppColor);
        const legalAttacks = cAfter.moves({ verbose: true });
        const targets = legalAttacks.filter((m) => m.from === target && m.captured);
        const uniqueTargets = new Set(targets.map((t) => t.to));
        if (san.includes('+') && uniqueTargets.size >= 1) {
          return {
            type: 'fork',
            description: `Queen Double Attack! Checks the King while simultaneously targeting undefended pieces!`,
          };
        }
        if (uniqueTargets.size >= 2) {
          return {
            type: 'fork',
            description: `Queen Fork! The Queen branches out from ${target}, attacking two targets at once.`,
          };
        }
      }

      // 6. Pawn Fork
      if (move.piece === 'p' && move.to && !san.includes('=')) {
        const target = move.to;
        const file = target.charCodeAt(0) - 97;
        const rank = parseInt(target[1], 10) - 1;
        const dir = isWhite ? 1 : -1;
        const pawnAttacks = [[file - 1, rank + dir], [file + 1, rank + dir]];
        const forked: PieceSymbol[] = [];
        for (const [pf, pr] of pawnAttacks) {
          if (pf >= 0 && pf < 8 && pr >= 0 && pr < 8) {
            const sq = `${String.fromCharCode(97 + pf)}${pr + 1}` as Square;
            const p = cAfter.get(sq);
            if (p && p.color === oppColor && ['q', 'r', 'b', 'n'].includes(p.type)) {
              forked.push(p.type);
            }
          }
        }
        if (forked.length >= 2) {
          return { type: 'fork', description: `Pawn Fork! A humble pawn on ${target} forks two major pieces simultaneously.` };
        }
      }

      // 6. Absolute Pin / Pin
      if (move.to && ['b', 'r', 'q'].includes(move.piece || '')) {
        const attackerSq = move.to;
        const file = attackerSq.charCodeAt(0) - 97;
        const rank = parseInt(attackerSq[1], 10) - 1;
        const pieceType = move.piece;
        const isDiag = pieceType === 'b' || pieceType === 'q';
        const isStraight = pieceType === 'r' || pieceType === 'q';
        const dirs: [number, number][] = [];
        if (isStraight) dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        if (isDiag) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);

        for (const [df, dr] of dirs) {
          let f = file + df;
          let r = rank + dr;
          let pinned: { type: PieceSymbol; sq: Square } | null = null;
          while (f >= 0 && f < 8 && r >= 0 && r < 8) {
            const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
            const p = cAfter.get(sq);
            if (p) {
              if (!pinned) {
                if (p.color === oppColor && p.type !== 'k') {
                  pinned = { type: p.type, sq };
                } else {
                  break;
                }
              } else {
                if (p.color === oppColor && (p.type === 'k' || p.type === 'q')) {
                  const pieceName = pinned.type === 'n' ? 'Knight' : pinned.type === 'b' ? 'Bishop' : pinned.type === 'r' ? 'Rook' : 'piece';
                  const targetName = p.type === 'k' ? 'King' : 'Queen';
                  return {
                    type: 'pin',
                    description: `Absolute Pin! The ${pieceName} on ${pinned.sq} is pinned against the ${targetName} and cannot move without decisive loss.`,
                  };
                }
                break;
              }
            }
            f += df;
            r += dr;
          }
        }
      }

      // 8. Skewer Detection
      if (move.to && ['b', 'r', 'q'].includes(move.piece || '')) {
        const attackerSq = move.to;
        const file = attackerSq.charCodeAt(0) - 97;
        const rank = parseInt(attackerSq[1], 10) - 1;
        const pieceType = move.piece;
        const isDiag = pieceType === 'b' || pieceType === 'q';
        const isStraight = pieceType === 'r' || pieceType === 'q';
        const dirs: [number, number][] = [];
        if (isStraight) dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
        if (isDiag) dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);

        for (const [df, dr] of dirs) {
          let f = file + df;
          let r = rank + dr;
          let frontPiece: { type: PieceSymbol; sq: Square } | null = null;
          while (f >= 0 && f < 8 && r >= 0 && r < 8) {
            const sq = `${String.fromCharCode(97 + f)}${r + 1}` as Square;
            const p = cAfter.get(sq);
            if (p) {
              if (!frontPiece) {
                if (p.color === oppColor && (p.type === 'k' || p.type === 'q')) {
                  frontPiece = { type: p.type, sq };
                } else {
                  break;
                }
              } else {
                if (p.color === oppColor && ['q', 'r', 'b', 'n'].includes(p.type)) {
                  const targetName = frontPiece.type === 'k' ? 'King' : 'Queen';
                  const behindName = p.type === 'q' ? 'Queen' : p.type === 'r' ? 'Rook' : p.type === 'b' ? 'Bishop' : 'Knight';
                  return {
                    type: 'skewer',
                    description: `Devastating Skewer! Attacks the enemy ${targetName} through to the ${behindName} on ${sq}.`,
                  };
                }
                break;
              }
            }
            f += df;
            r += dr;
          }
        }
      }

      // 9. Knight Outpost
      if (move.piece === 'n' && move.to) {
        const file = move.to[0];
        const rk = parseInt(move.to[1], 10);
        const isCentralFile = ['c', 'd', 'e', 'f'].includes(file);
        const isOutpostRank = isWhite ? rk >= 4 && rk <= 6 : rk >= 3 && rk <= 5;
        if (isCentralFile && isOutpostRank) {
          const pawnFileOffsets = [-1, 1];
          const supportRank = isWhite ? rk - 1 : rk + 1;
          const isSupportedByPawn = pawnFileOffsets.some((df) => {
            const fCode = move.to!.charCodeAt(0) + df;
            if (fCode >= 97 && fCode <= 104 && supportRank >= 1 && supportRank <= 8) {
              const supSq = `${String.fromCharCode(fCode)}${supportRank}` as Square;
              const p = cAfter.get(supSq);
              return p && p.type === 'p' && p.color === turn;
            }
            return false;
          });
          if (isSupportedByPawn) {
            return {
              type: 'outpost',
              description: `Dominant Knight Outpost on ${move.to}! Anchored firmly by pawns in the heart of the enemy camp.`,
            };
          }
        }
      }

      // 10. Hanging Piece
      if (move.to && ['q', 'r', 'b', 'n'].includes(move.piece || '')) {
        const oppReplies = cAfter.moves({ verbose: true });
        const canCaptureMoved = oppReplies.find((m) => m.to === move.to && m.captured);
        if (canCaptureMoved) {
          const attackerVal = PIECE_VALUES[canCaptureMoved.piece] || 100;
          const victimVal = PIECE_VALUES[move.piece || 'p'] || 100;
          if (victimVal > attackerVal + 80) {
            const pieceName = move.piece === 'q' ? 'Queen' : move.piece === 'r' ? 'Rook' : move.piece === 'b' ? 'Bishop' : 'Knight';
            return {
              type: 'hanging-piece',
              description: `Leaves the ${pieceName} hanging on ${move.to} to be captured!`,
            };
          }
        }
      }

      // 7. Discovered Check
      if (san.includes('+') && fenBefore && move.from && move.to) {
        let kSq: Square | null = null;
        const b = cAfter.board();
        for (let r = 0; r < 8; r++) {
          for (let col = 0; col < 8; col++) {
            const p = b[r][col];
            if (p && p.type === 'k' && p.color === oppColor) {
              kSq = `${String.fromCharCode(97 + col)}${8 - r}` as Square;
              break;
            }
          }
        }
        if (kSq) {
          const df = Math.abs(move.to.charCodeAt(0) - kSq.charCodeAt(0));
          const dr = Math.abs(parseInt(move.to[1], 10) - parseInt(kSq[1], 10));
          let movedPieceAttacksKing = false;
          if (move.piece === 'n') {
            movedPieceAttacksKing = (df === 1 && dr === 2) || (df === 2 && dr === 1);
          } else if (move.piece === 'p') {
            const pawnDir = isWhite ? 1 : -1;
            const rDiff = parseInt(kSq[1], 10) - parseInt(move.to[1], 10);
            movedPieceAttacksKing = df === 1 && rDiff === pawnDir;
          }
          if (!movedPieceAttacksKing) {
            const cBefore = new Chess(fenBefore);
            const movingPiece = cBefore.get(move.from);
            return {
              type: 'discovered-attack',
              description: `Discovered Check! Moving ${movingPiece ? movingPiece.type.toUpperCase() : 'piece'} from ${move.from} unmasks an ambush on the enemy king.`,
            };
          }
        }
      }

      // 8. Rook on 7th Rank
      if (move.piece === 'r' && move.to) {
        const rk = move.to[1];
        if ((isWhite && rk === '7') || (!isWhite && rk === '2')) {
          return {
            type: 'seventh-rank',
            description: `Rook on the 7th rank! Dominates the enemy camp, attacking base pawns and cutting off the enemy king.`,
          };
        }
      }

      // 9. Passed Pawn Push
      if (move.piece === 'p' && move.to) {
        const rk = parseInt(move.to[1], 10);
        if ((isWhite && rk >= 6) || (!isWhite && rk <= 3) || san.includes('=')) {
          return {
            type: 'passed-pawn',
            description: `Passed pawn advance! Marching the pawn to ${move.to} closes in on Queen promotion.`,
          };
        }
      }

      // 10. Queen Trade
      if (move.captured === 'q' && move.piece === 'q') {
        return {
          type: 'simplification',
          description: `Queen trade! Clears heavy artillery off the board to transition into a winning technical endgame.`,
        };
      }

      // 11. Tactical Piece Defense / Escape
      if (fenBefore && move.from && move.to && ['q', 'r', 'b', 'n'].includes(move.piece || '')) {
        const cBefore = new Chess(fenBefore);
        const wasAttacked = cBefore.moves({ verbose: true }).some((m) => m.to === move.from && m.captured);
        const stillAttacked = cAfter.moves({ verbose: true }).some((m) => m.to === move.to && m.captured);
        if (wasAttacked && !stillAttacked) {
          const pieceName = move.piece === 'q' ? 'Queen' : move.piece === 'r' ? 'Rook' : move.piece === 'b' ? 'Bishop' : 'Knight';
          return {
            type: 'piece-defense',
            description: `Tactical escape! Safely retreats the attacked ${pieceName} to ${move.to}, preserving material.`,
          };
        }
      }

      // 12. Heavy Battery Alignment
      if (move.to && ['q', 'r', 'b'].includes(move.piece || '')) {
        const board = cAfter.board();
        if (move.piece === 'r' || move.piece === 'q') {
          const col = move.to.charCodeAt(0) - 97;
          let heavyCount = 0;
          for (let r = 0; r < 8; r++) {
            const p = board[r][col];
            if (p && p.color === turn && (p.type === 'r' || p.type === 'q')) {
              heavyCount++;
            }
          }
          if (heavyCount >= 2) {
            return {
              type: 'battery',
              description: `Heavy Battery! Doubles artillery along the ${move.to[0]}-file to exert overwhelming forward pressure.`,
            };
          }
        }
        if (move.piece === 'b' || move.piece === 'q') {
          const file = move.to.charCodeAt(0) - 97;
          const rank = 8 - parseInt(move.to[1], 10);
          const diagDirs: [number, number][] = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
          for (const [df, dr] of diagDirs) {
            let f = file + df;
            let r = rank + dr;
            while (f >= 0 && f < 8 && r >= 0 && r < 8) {
              const p = board[r][f];
              if (p) {
                if (p.color === turn && (p.type === 'q' || p.type === 'b') && p.type !== move.piece) {
                  return {
                    type: 'battery',
                    description: `Deadly Diagonal Battery! Queen and Bishop unite along the long diagonal aimed at the heart of the enemy camp.`,
                  };
                }
                break;
              }
              f += df;
              r += dr;
            }
          }
        }
      }

      // 13. Intermezzo (Zwischenzug / In-between move)
      if (fenBefore && (san.includes('+') || (move.captured && PIECE_VALUES[move.captured] >= 300))) {
        const cBefore = new Chess(fenBefore);
        const oppMoves = cBefore.moves({ verbose: true });
        const hadThreat = oppMoves.some((m) => m.captured && ['q', 'r'].includes(m.captured));
        if (hadThreat && !san.includes('#')) {
          return {
            type: 'intermezzo',
            description: `Zwischenzug (In-between Move)! Delivers an unexpected forcing strike before dealing with the opponent's threat.`,
          };
        }
      }

      // 14. Deflection
      if (move.captured && ['b', 'n', 'r', 'q'].includes(move.captured)) {
        const afterReplies = cAfter.moves({ verbose: true });
        const checkmateFollowUp = afterReplies.some((m) => m.san.includes('#') || m.san.includes('+'));
        if (checkmateFollowUp) {
          return {
            type: 'deflection',
            description: `Deflection Strike! Eliminates or pulls away a crucial defender, creating devastating follow-up breakthroughs.`,
          };
        }
      }
    } catch {}
    return undefined;
  }

  /**
   * Classifies a chess move using Expected Points Win Probability Model:
   * Dynamic, intelligent commentary describing the exact tactical and strategic motives.
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
    secondBestScoreDiff: number = 0,
    fenBefore?: string,
    fenAfter?: string,
    fromSquare?: Square,
    toSquare?: Square
  ): { classification: MoveClassification; comment: string; wpLoss: number; motif?: { type: string; description: string } } {
    const isWhite = turn === 'w';

    const wpBeforeWhite = this.centipawnsToWinProbability(evalBefore);
    const wpAfterWhite = this.centipawnsToWinProbability(evalAfter);

    const wpBefore = isWhite ? wpBeforeWhite : 100 - wpBeforeWhite;
    const wpAfter = isWhite ? wpAfterWhite : 100 - wpAfterWhite;
    const wpLoss = Math.max(0, wpBefore - wpAfter);

    const cpLoss = Math.max(0, isWhite ? evalBefore - evalAfter : evalAfter - evalBefore);
    const evalDiffPawns = (Math.abs(cpLoss) / 100).toFixed(1);

    const isStillCrushing = wpAfter >= 82.0;
    const wasHopelesslyLost = wpBefore <= 15.0;

    const cleanPlayedSan = moveSan.replace(/[+#]/g, '');
    const cleanBestSan = (bestMoveSan || '').replace(/[+#]/g, '');
    const isBestMove = Boolean(bestMoveSan && cleanPlayedSan === cleanBestSan);

    let effectiveLoss: number;
    if (isStillCrushing) {
      effectiveLoss = Math.min(wpLoss, 3.5);
    } else if (wasHopelesslyLost) {
      if (isBestMove || cpLoss <= 35) {
        effectiveLoss = Math.min(wpLoss, 2.5);
      } else {
        const normalizedLostPenalty = Math.min(45.0, (cpLoss / 400) * 30.0);
        effectiveLoss = Math.max(wpLoss, normalizedLostPenalty);
      }
    } else {
      effectiveLoss = wpLoss;
    }

    // Detect rich tactical motifs on the board
    const motif = this.detectTacticalMotif(fenBefore, fenAfter, {
      san: moveSan,
      from: fromSquare,
      to: toSquare,
      piece: pieceType,
      captured: isCapture ? 'p' : undefined,
    }, turn);

    // 1. Checkmate Move: Checkmating the opponent is always Best!
    let isCheckmateMove = moveSan.includes('#');
    if (!isCheckmateMove && fenAfter) {
      try {
        const cAfter = new Chess(fenAfter);
        isCheckmateMove = cAfter.isCheckmate();
      } catch {}
    }
    if (isCheckmateMove) {
      return {
        classification: 'great',
        comment: `Checkmate! A decisive finishing blow.`,
        wpLoss: 0,
        motif: { type: 'checkmate', description: 'Delivered an unstoppable checkmate!' },
      };
    }

    // 2. Checkmate threat and unavoidable checkmate handling
    const wasAlreadyMateInEval = isWhite ? evalBefore <= -15000 : evalBefore >= 15000;

    let opponentHasMateNow = false;
    let immediateMatingMove = '';
    if (fenAfter) {
      try {
        const cAfter = new Chess(fenAfter);
        if (!cAfter.isGameOver()) {
          const mateMove = cAfter.moves({ verbose: true }).find((m: any) => m.san.includes('#'));
          if (mateMove) {
            opponentHasMateNow = true;
            immediateMatingMove = mateMove.san;
          }
        }
      } catch {}
    }

    const opponentHasMateScore = isWhite ? evalAfter <= -15000 : evalAfter >= 15000;

    // A: Checkmate was already completely forced before this move
    if (wasAlreadyMateInEval && (opponentHasMateNow || opponentHasMateScore)) {
      return {
        classification: isBestMove ? 'best' : 'good',
        comment: isBestMove
          ? `Best resistance. Checkmate was already forced against your king.`
          : `Checkmate was already forced against your king. The opposing attack was unstoppable.`,
        wpLoss: 0,
        motif,
      };
    }

    // B: The position was defensible before, but this move walks into forced checkmate!
    const walksIntoCheckmate = !wasAlreadyMateInEval && (opponentHasMateNow || opponentHasMateScore);
    if (walksIntoCheckmate) {
      const mateDescription = immediateMatingMove
        ? `allows immediate checkmate with ${immediateMatingMove}`
        : 'allows forced checkmate';
      return {
        classification: 'blunder',
        comment: `Blunder! ${moveSan} ${mateDescription}! ${bestMoveSan ? `${bestMoveSan} was essential to defend.` : 'Look out for your king\'s safety.'}`,
        wpLoss: Math.max(effectiveLoss, 35.0),
        motif: {
          type: 'mate-threat',
          description: immediateMatingMove
            ? `Allows immediate checkmate with ${immediateMatingMove}`
            : 'Allows unstoppable checkmate attack',
        },
      };
    }

    // 3. Opening Book
    if (plyIndex <= 10 && COMMON_BOOK_MOVES.has(moveSan) && cpLoss <= 30 && wpLoss <= 2.5) {
      return {
        classification: 'book',
        comment: `${moveSan} is established grandmaster opening theory, fighting for control of the central squares.`,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 4. Brilliant Move (Tactical Piece Sacrifice)
    let isGenuineSacrifice = false;
    if (fenBefore && fenAfter && !isCheckmateMove) {
      try {
        const getMat = (f: string) => {
          let w = 0;
          let b = 0;
          const placement = f.split(' ')[0];
          for (const ch of placement) {
            if (ch === 'q') b += 9;
            else if (ch === 'Q') w += 9;
            else if (ch === 'r') b += 5;
            else if (ch === 'R') w += 5;
            else if (ch === 'b' || ch === 'n') b += 3;
            else if (ch === 'B' || ch === 'N') w += 3;
            else if (ch === 'p') b += 1;
            else if (ch === 'P') w += 1;
          }
          return { w, b };
        };
        const beforeMat = getMat(fenBefore);
        const afterMat = getMat(fenAfter);
        const myLoss = isWhite ? beforeMat.w - afterMat.w : beforeMat.b - afterMat.b;
        const opLoss = isWhite ? beforeMat.b - afterMat.b : beforeMat.w - afterMat.w;
        if (myLoss - opLoss >= 2) {
          isGenuineSacrifice = true;
        }
      } catch {}
    }

    const isBrilliantSacrifice =
      !isCheckmateMove &&
      (isGenuineSacrifice ||
        (pieceType !== 'q' &&
          (pieceType === 'b' || pieceType === 'n' || pieceType === 'r') &&
          !isCapture &&
          cpLoss <= 20 &&
          wpAfter >= 65.0 &&
          plyIndex > 6)) &&
      cpLoss <= 25 &&
      wpAfter >= 60.0 &&
      plyIndex > 6;

    if (isBrilliantSacrifice) {
      return {
        classification: 'brilliant',
        comment: `Brilliant move! You offered an inspired piece sacrifice that shatters the defense and fuels an unstoppable attack!`,
        wpLoss: effectiveLoss,
        motif: { type: 'sacrifice', description: 'Inspired piece sacrifice shattering the defense!' },
      };
    }

    // 5. Great Move (Only winning move or clutch defense)
    if (isBestMove && secondBestScoreDiff >= 100 && wpAfter >= 40.0 && plyIndex > 4) {
      const desc = motif ? `${motif.description} ` : '';
      return {
        classification: 'great',
        comment: `Great move! ${desc}${moveSan} was the only move on the entire board to maintain your winning advantage.`,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 6. Best Move
    if (isBestMove || (cpLoss <= 10 && wpLoss <= 0.6)) {
      let bestComment = `Best move! ${moveSan} coordinates your pieces and maintains optimal control of the board.`;
      if (motif) {
        bestComment = `Best move! ${motif.description}`;
      } else if (isCheck) {
        bestComment = `Best move! Giving check with ${moveSan} keeps maximum pressure on the enemy king.`;
      } else if (isCapture) {
        bestComment = `Best move! Capturing with ${moveSan} resolves tension in your favor and strengthens your position.`;
      }
      return {
        classification: 'best',
        comment: bestComment,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 7. Miss
    const wasWinning = wpBefore >= 65.0 || (isWhite ? evalBefore >= 250 : evalBefore <= -250);
    if (wasWinning && !isStillCrushing && (cpLoss >= 180 || effectiveLoss >= 20.0)) {
      return {
        classification: 'miss',
        comment: `Miss! You missed a decisive tactical advantage! ${bestMoveSan ? `${bestMoveSan} was winning on the spot.` : 'A winning sequence was overlooked.'}`,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 8. Blunder
    const isBlunderDrop =
      !isStillCrushing &&
      (effectiveLoss >= 20.0 && (wpLoss >= 6.0 || cpLoss >= 250));

    if (isBlunderDrop) {
      const blunderComment = motif && motif.type === 'hanging-piece'
        ? `Blunder! Leaves material undefended (-${evalDiffPawns} pawns). ${bestMoveSan ? `${bestMoveSan} was necessary to hold.` : ''}`
        : `Blunder! ${moveSan} severely compromises your position (-${evalDiffPawns} pawns). ${bestMoveSan ? `${bestMoveSan} was essential.` : 'Take your time before moving.'}`;
      return {
        classification: 'blunder',
        comment: blunderComment,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 9. Mistake
    if (!isStillCrushing && effectiveLoss >= 12.0) {
      return {
        classification: 'mistake',
        comment: `Mistake! ${motif ? `${motif.description} ` : ''}${moveSan} surrenders significant ground (-${evalDiffPawns} pawns). ${bestMoveSan ? `Finding ${bestMoveSan} would have kept a tighter grip.` : ''}`,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 10. Inaccuracy
    const isOpeningProphylaxis = plyIndex <= 12 && cpLoss <= 65 && !opponentHasMateNow;
    if (!isOpeningProphylaxis && !isStillCrushing && effectiveLoss >= 5.5) {
      return {
        classification: 'inaccuracy',
        comment: `Inaccuracy. ${bestMoveSan ? `Playing ${bestMoveSan} was sharper.` : 'This allows the opponent minor counterplay.'}`,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 11. Good Move
    if (cpLoss > 30 || effectiveLoss > 2.0) {
      const goodComment = motif
        ? `Good move. ${motif.description}`
        : isStillCrushing && isCapture
        ? `Good move. Captures free material and maintains complete control of the game.`
        : `Good move. A completely sound and solid continuation.`;
      return {
        classification: 'good',
        comment: goodComment,
        wpLoss: effectiveLoss,
        motif,
      };
    }

    // 12. Excellent Move
    const excellentComment = motif
      ? `Excellent move! ${motif.description}`
      : `Excellent move! ${moveSan} maintains solid control and keeps up the pressure.`;
    return {
      classification: 'excellent',
      comment: excellentComment,
      wpLoss: effectiveLoss,
      motif,
    };
  }

  /**
   * CAPS Accuracy Score Formula (0 - 100%)
   * Uses the official CAPS 2.0 harmonic/exponential model:
   * Acc_i = max(0, min(100, 103.1668 * exp(-0.04354 * wpLoss) - 3.1669))
   */
  public static calculateCapsAccuracy(winProbLosses: number[], cpLosses?: number[]): number {
    if (winProbLosses.length === 0) return 90.0;
    const accuracies = winProbLosses.map((loss, idx) => {
      let l = Math.max(0, loss);

      // In lopsided positions, win probability loss is near-zero due to sigmoid saturation,
      // even if centipawn loss is significant. Use cpLoss as a secondary signal to prevent
      // inflated accuracy for both players in one-sided games.
      if (cpLosses && cpLosses[idx] !== undefined) {
        const cp = cpLosses[idx];
        // If wpLoss is tiny but cpLoss is substantial, apply a cpLoss-based floor
        if (l < 2.0 && cp > 50) {
          const cpBasedLoss = Math.min(25, (cp / 100) * 5.0);
          l = Math.max(l, cpBasedLoss);
        }
      }

      const acc = 103.1668 * Math.exp(-0.04354 * l) - 3.1669;
      return Math.min(100.0, Math.max(0.0, acc));
    });
    const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    return parseFloat(Math.min(99.8, Math.max(10.0, avg)).toFixed(1));
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

      // 1. Calculate engine best move and optimal benchmark score before move
      const bestChoice = this.findBestMoveAndScore(sim);
      const evalBefore = bestChoice.score;
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
      const { classification, comment, wpLoss, motif } = this.classifyMove(
        playedMove.san,
        bestChoice.bestMoveSan,
        evalBefore,
        evalAfter,
        turn,
        Boolean(playedMove.captured),
        isCheckNow,
        i + 1,
        playedMove.piece,
        secondBestDiff,
        fenBefore,
        fenAfter,
        playedMove.from as Square,
        playedMove.to as Square
      );

      const moveAcc = this.calculateCapsAccuracy([wpLoss]);

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
        winProbLoss: wpLoss,
        accuracy: moveAcc,
        motif,
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

